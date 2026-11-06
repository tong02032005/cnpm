import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.guard.js';
import { OrderStatus } from '../generated/prisma/enums.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { assertTransition } from './order-state.js';
import { orderExpiresAt, sweepExpiredOrders } from './order-expiry.js';
import { CreateOrderDto } from './orders.dto.js';
import { promotionDiscount, unitPrice } from './pricing.js';
import { consumeStock, releaseStock, reserveStock, stockUsage, type StockUse } from '../stocks/stock.js';

type Tx = Prisma.TransactionClient;

/** Nhân viên chuyển trạng thái pha chế; PAID / PAYMENT_FAILED chỉ do PaymentsService đặt. */
const STAFF_CAN_SET: OrderStatus[] = [
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
];
const CUSTOMER_CAN_SET: OrderStatus[] = [OrderStatus.CANCELLED];

const ORDER_INCLUDE = { items: { orderBy: { id: 'asc' } }, payments: { orderBy: { id: 'asc' } } } as const;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tạo đơn PENDING (Task 6). Trong MỘT transaction:
   * tự tính lại giá → kiểm tra/giữ lượt mã khuyến mãi → giữ chỗ nguyên liệu theo công thức (Task 10c) → lưu đơn.
   * Lỗi ở bất kỳ bước nào thì rollback toàn bộ, không giữ nguyên liệu nào.
   */
  async create(userId: number, dto: CreateOrderDto) {
    await sweepExpiredOrders(this.prisma); // trả nguyên liệu của đơn quá hạn trước khi giữ chỗ cho đơn mới
    return this.prisma.$transaction(
      async (tx) => {
        const productIds = [...new Set(dto.items.map((i) => i.productId))];
        const products = new Map(
          (await tx.products.findMany({ where: { id: { in: productIds }, is_available: true } })).map((p) => [p.id, p]),
        );
        const missing = productIds.filter((id) => !products.has(id));
        if (missing.length) throw new BadRequestException(`Sản phẩm không tồn tại hoặc đã ngừng bán: ${missing.join(', ')}`);

        const toppingIds = [...new Set(dto.items.flatMap((i) => i.toppingIds ?? []))];
        const toppings = new Map((await tx.toppings.findMany({ where: { id: { in: toppingIds } } })).map((t) => [t.id, t]));
        if (toppings.size !== toppingIds.length) throw new BadRequestException('Topping không hợp lệ');

        // Giá do backend tính, không lấy từ client
        const lines = dto.items.map((item) => {
          const product = products.get(item.productId)!;
          const chosen = [...new Set(item.toppingIds ?? [])].map((id) => toppings.get(id)!);
          const price = unitPrice(product.price, item.size, chosen.map((t) => t.price));
          return {
            product_id: product.id,
            product_name: product.name,
            size: item.size,
            quantity: item.quantity,
            unit_price: price,
            line_total: price * item.quantity,
            toppings: chosen.map((t) => ({ id: t.id, name: t.name, price: t.price })),
          };
        });
        const subtotal = lines.reduce((sum, l) => sum + l.line_total, 0);

        const { discount, promotionId } = await this.applyPromotion(tx, dto.promoCode, subtotal);
        const createdAt = new Date();

        // Giữ chỗ nguyên liệu (chưa trừ kho thật – trừ khi đơn COMPLETED)
        const recipes = await tx.recipes.findMany({
          where: { OR: [{ product_id: { in: productIds } }, { topping_id: { in: toppingIds } }] },
        });
        const usage = stockUsage(
          lines.map((l) => ({ ...l, toppingIds: l.toppings.map((t) => t.id) })),
          recipes,
        );
        await reserveStock(tx, usage);

        return tx.orders.create({
          data: {
            user_id: userId,
            status: OrderStatus.PENDING,
            subtotal,
            discount,
            total: subtotal - discount,
            promotion_id: promotionId,
            stock_usage: usage as unknown as Prisma.InputJsonValue,
            created_at: createdAt,
            expires_at: orderExpiresAt(createdAt),
            items: { create: lines },
          },
          include: ORDER_INCLUDE,
        });
      },
      { maxWait: 10_000, timeout: 20_000 },
    );
  }

  async findMine(userId: number) {
    await sweepExpiredOrders(this.prisma);
    return this.prisma.orders.findMany({
      where: { user_id: userId },
      include: { items: { orderBy: { id: 'asc' } } },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number, user: AuthUser) {
    await sweepExpiredOrders(this.prisma);
    const order = await this.prisma.orders.findUnique({ where: { id }, include: ORDER_INCLUDE });
    // Đơn của người khác: trả 404 thay vì 403 để không lộ đơn nào tồn tại
    if (!order || (order.user_id !== user.sub && user.role !== 'STAFF')) {
      throw new NotFoundException(`Không tìm thấy đơn ${id}`);
    }
    return order;
  }

  /** PATCH /orders/:id/status – STAFF chuyển pha chế; khách chỉ được hủy đơn của mình. */
  updateStatus(id: number, user: AuthUser, to: OrderStatus) {
    return this.prisma.$transaction(async (tx) => {
      await lockOrder(tx, id);
      const order = await tx.orders.findUnique({ where: { id } });
      if (!order || (order.user_id !== user.sub && user.role !== 'STAFF')) {
        throw new NotFoundException(`Không tìm thấy đơn ${id}`);
      }
      const allowed = user.role === 'STAFF' ? STAFF_CAN_SET : CUSTOMER_CAN_SET;
      if (!allowed.includes(to)) throw new ForbiddenException(`Bạn không được chuyển đơn sang ${to}`);
      assertTransition(order.status, to);

      // Lượng nguyên liệu đã giữ lúc tạo đơn (không tính lại theo công thức hiện tại – công thức có thể đã sửa)
      const usage = order.stock_usage as unknown as StockUse[];
      // COMPLETED chỉ đạt được một lần (state machine + khóa đơn) nên kho chỉ bị trừ một lần
      if (to === OrderStatus.COMPLETED) await consumeStock(tx, usage);

      if (to === OrderStatus.CANCELLED) {
        await releaseStock(tx, usage);
        // Trả lượt mã khuyến mãi
        if (order.promotion_id) {
          await tx.promotions.update({ where: { id: order.promotion_id }, data: { used_count: { decrement: 1 } } });
        }
        // Đơn đã trả tiền: hoàn tiền (mô phỏng) + thu hồi điểm thưởng
        if (order.status === OrderStatus.PAID) {
          await tx.payments.updateMany({ where: { order_id: id, status: 'SUCCEEDED' }, data: { status: 'REFUNDED' } });
          const earned = await tx.loyalty_transactions.aggregate({ where: { order_id: id }, _sum: { points: true } });
          const points = earned._sum.points ?? 0;
          if (points > 0) {
            await tx.loyalty_transactions.create({ data: { user_id: order.user_id, order_id: id, points: -points } });
            await tx.users.update({ where: { id: order.user_id }, data: { loyalty_points: { decrement: points } } });
          }
        }
      }

      return tx.orders.update({ where: { id }, data: { status: to }, include: ORDER_INCLUDE });
    });
  }

  /** Kiểm tra mã và giữ 1 lượt dùng ngay trong transaction tạo đơn (không vượt usage_limit khi đặt đồng thời). */
  private async applyPromotion(tx: Tx, code: string | undefined, subtotal: number) {
    if (!code?.trim()) return { discount: 0, promotionId: null };
    const promo = await tx.promotions.findUnique({ where: { code: code.trim().toUpperCase() } });
    if (!promo) throw new BadRequestException('Mã khuyến mãi không tồn tại');
    const result = promotionDiscount(promo, subtotal);
    if ('error' in result) throw new BadRequestException(result.error);

    // Điều kiện nằm trong câu UPDATE nên hai đơn cùng lúc không thể cùng lấy lượt cuối
    const reserved =
      promo.usage_limit === null
        ? await tx.promotions.updateMany({ where: { id: promo.id }, data: { used_count: { increment: 1 } } })
        : await tx.promotions.updateMany({
            where: { id: promo.id, used_count: { lt: promo.usage_limit } },
            data: { used_count: { increment: 1 } },
          });
    if (reserved.count !== 1) throw new BadRequestException('Mã khuyến mãi đã hết lượt dùng');
    return { discount: result.discount, promotionId: promo.id };
  }
}

/** Khóa dòng đơn tới hết transaction: thanh toán/hủy cùng một đơn sẽ xếp hàng lần lượt. */
export async function lockOrder(tx: Tx, orderId: number) {
  await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
}
