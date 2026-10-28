import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { AuthUser } from '../auth/auth.guard';
import { Payment, PaymentStatus } from '../payments/payment.entity';
import { Product, Topping } from '../products/product.entity';
import { Promotion } from '../promotions/promotion.entity';
import { findPromotion } from '../promotions/promotions.controller';
import { LoyaltyTransaction, Role, User } from '../users/user.entity';
import { CreateOrderDto } from './orders.dto';
import { assertTransition } from './order-state';
import { Order, OrderItem, OrderItemTopping, OrderStatus } from './order.entity';
import { promotionDiscount, unitPrice } from './pricing';

// ponytail: cao điểm hơn ~50 đơn cùng món cùng lúc thì nên chuyển sang UPDATE ... WHERE stock >= qty.
const MAX_STOCK_RETRIES = 50;

const MANUAL_STAFF = [OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.COMPLETED, OrderStatus.CANCELLED];
const MANUAL_CUSTOMER = [OrderStatus.CANCELLED];

@Injectable()
export class OrdersService {
  constructor(private readonly ds: DataSource) {}

  // Tạo đơn PENDING. Tính giá, áp khuyến mãi và trừ tồn kho trong cùng một transaction.
  create(userId: number, dto: CreateOrderDto): Promise<Order> {
    return this.ds.transaction(async (m) => {
      const toppingIds = [...new Set(dto.items.flatMap((i) => i.toppingIds ?? []))];
      const toppings = new Map(
        (await m.findBy(Topping, { id: In(toppingIds), isActive: true })).map((t) => [t.id, t]),
      );
      if (toppings.size !== toppingIds.length) throw new BadRequestException('Topping không hợp lệ');

      // Trừ tồn kho theo thứ tự productId để hai đơn đặt cùng lúc không deadlock nhau.
      const lines = [...dto.items].sort((a, b) => a.productId - b.productId);
      const items: OrderItem[] = [];
      let subtotal = 0;

      for (const line of lines) {
        const product = await m.findOne(Product, {
          where: { id: line.productId, isActive: true },
          relations: { sizes: true },
        });
        if (!product) throw new BadRequestException(`Sản phẩm ${line.productId} không tồn tại`);
        const size = product.sizes.find((s) => s.size === line.size);
        if (!size) throw new BadRequestException(`${product.name} không có size ${line.size}`);

        await this.reserveStock(m, product.id, line.qty);

        const tops = (line.toppingIds ?? []).map((id) => toppings.get(id)!);
        const price = unitPrice(product.basePrice, size.priceDelta, tops.map((t) => t.price));
        subtotal += price * line.qty;
        items.push(
          m.create(OrderItem, {
            productId: product.id,
            size: line.size,
            qty: line.qty,
            unitPrice: price,
            lineTotal: price * line.qty,
            toppings: tops.map((t) => m.create(OrderItemTopping, { toppingId: t.id, price: t.price })),
          }),
        );
      }

      let discount = 0;
      let promotionId: number | null = null;
      if (dto.promoCode) {
        const promo = await findPromotion(m, dto.promoCode);
        discount = promotionDiscount(promo, subtotal);
        promotionId = promo.id;
      }

      return m.save(
        m.create(Order, { userId, subtotal, discount, total: subtotal - discount, promotionId, items }),
      );
    });
  }

  // Optimistic locking: chỉ trừ khi version chưa đổi kể từ lúc đọc; đổi rồi thì đọc lại và thử lại.
  // Mỗi lần thua là do một đơn khác vừa trừ thành công, nên vòng lặp luôn tiến tới.
  private async reserveStock(m: EntityManager, productId: number, qty: number) {
    for (let attempt = 0; attempt < MAX_STOCK_RETRIES; attempt++) {
      const product = await m.findOneByOrFail(Product, { id: productId });
      if (product.stock < qty) {
        throw new ConflictException(`${product.name} chỉ còn ${product.stock} ly`);
      }
      const result = await m
        .createQueryBuilder()
        .update(Product)
        .set({ stock: () => 'stock - :qty', version: () => 'version + 1' })
        .where('id = :id AND version = :version', { id: productId, version: product.version })
        .setParameter('qty', qty)
        .execute();
      if (result.affected === 1) return;
    }
    throw new ConflictException('Sản phẩm đang được đặt nhiều, vui lòng thử lại');
  }

  findMine(userId: number) {
    return this.ds.manager.find(Order, {
      where: { userId },
      relations: { items: { product: true } },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
  }

  async findOne(id: number, user: AuthUser) {
    const order = await this.ds.manager.findOne(Order, {
      where: { id },
      relations: { items: { product: true, toppings: { topping: true } }, payments: true },
    });
    if (!order || (order.userId !== user.sub && user.role !== Role.STAFF)) {
      throw new NotFoundException(`Không tìm thấy đơn ${id}`);
    }
    return order;
  }

  // STAFF chuyển trạng thái pha chế; khách chỉ được hủy đơn của mình.
  // PAID / PAYMENT_FAILED / PENDING chỉ do PaymentsService đặt, không ai sửa tay được.
  updateStatus(id: number, user: AuthUser, to: OrderStatus) {
    return this.ds.transaction(async (m) => {
      const order = await m.findOne(Order, { where: { id }, relations: { items: true } });
      if (!order || (order.userId !== user.sub && user.role !== Role.STAFF)) {
        throw new NotFoundException(`Không tìm thấy đơn ${id}`);
      }
      const allowed = user.role === Role.STAFF ? MANUAL_STAFF : MANUAL_CUSTOMER;
      if (!allowed.includes(to)) throw new ForbiddenException(`Không được tự chuyển đơn sang ${to}`);
      assertTransition(order.status, to);

      // Điều kiện status cũ chặn hai yêu cầu cập nhật cùng lúc.
      const result = await m.update(Order, { id, status: order.status }, { status: to });
      if (result.affected !== 1) throw new ConflictException('Đơn vừa được cập nhật, vui lòng tải lại');

      if (to === OrderStatus.CANCELLED) {
        await this.releaseStock(m, order.items);
        if (order.status === OrderStatus.PAID) await this.refund(m, order);
      }
      return { id, status: to };
    });
  }

  private async releaseStock(m: EntityManager, items: OrderItem[]) {
    const qtyByProduct = new Map<number, number>();
    for (const i of items) qtyByProduct.set(i.productId, (qtyByProduct.get(i.productId) ?? 0) + i.qty);
    // Cùng thứ tự productId như lúc tạo đơn để không deadlock.
    for (const [productId, qty] of [...qtyByProduct].sort(([a], [b]) => a - b)) {
      await m
        .createQueryBuilder()
        .update(Product)
        .set({ stock: () => 'stock + :qty', version: () => 'version + 1' })
        .where('id = :id', { id: productId })
        .setParameter('qty', qty)
        .execute();
    }
  }

  // Hủy đơn đã thanh toán: hoàn tiền (mô phỏng), thu hồi điểm thưởng và trả lại lượt dùng mã.
  private async refund(m: EntityManager, order: Order) {
    await m.update(
      Payment,
      { orderId: order.id, status: PaymentStatus.SUCCEEDED },
      { status: PaymentStatus.REFUNDED },
    );
    const loyalty = await m.findOneBy(LoyaltyTransaction, { orderId: order.id });
    if (loyalty) {
      await m.delete(LoyaltyTransaction, { id: loyalty.id });
      await m.decrement(User, { id: order.userId }, 'loyaltyPoints', loyalty.points);
    }
    if (order.promotionId) await m.decrement(Promotion, { id: order.promotionId }, 'usedCount', 1);
  }
}
