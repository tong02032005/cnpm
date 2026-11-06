// Tự hủy đơn quá hạn thanh toán: đơn PENDING / PAYMENT_FAILED quá `expires_at` → CANCELLED,
// trả chỗ nguyên liệu và lượt mã khuyến mãi. Không dùng job nền: hàm được gọi khi có request
// (xem menu, tạo đơn, xem đơn, thanh toán). Thanh toán còn tự chặn đơn quá hạn nên không lọt kẽ hở.
// ponytail: dọn theo request; app có nhiều instance hoặc cần hủy đúng giờ thì chuyển sang @nestjs/schedule chạy mỗi phút.
import { Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { OrderStatus } from '../generated/prisma/enums.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { releaseStock, type StockUse } from '../stocks/stock.js';
import { assertTransition } from './order-state.js';

/** Thời gian khách có để thanh toán, tính từ lúc tạo đơn (thanh toán lỗi không được cộng thêm giờ). */
export const ORDER_TTL_MINUTES = 15;
export const orderExpiresAt = (from = new Date()) => new Date(from.getTime() + ORDER_TTL_MINUTES * 60_000);

/** Trạng thái còn chờ thanh toán – chỉ những đơn này mới bị tự hủy. */
export const AWAITING_PAYMENT: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED];

export const isExpired = (order: { status: OrderStatus; expires_at: Date }, now = new Date()) =>
  AWAITING_PAYMENT.includes(order.status) && order.expires_at < now;

const logger = new Logger('OrderExpiry');

/** Hủy mọi đơn đã quá hạn. Trả về số đơn đã hủy. */
export async function expireOverdueOrders(prisma: PrismaService, now = new Date()): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const due = await tx.orders.findMany({
      where: { status: { in: AWAITING_PAYMENT }, expires_at: { lt: now } },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    if (!due.length) return 0;

    // Khóa các đơn này; đơn đang được thanh toán (đang giữ khóa) thì bỏ qua, lần dọn sau xử lý
    const locked = await tx.$queryRaw<{ id: number }[]>`
      SELECT id FROM orders WHERE id IN (${Prisma.join(due.map((d) => d.id))}) ORDER BY id FOR UPDATE SKIP LOCKED`;
    const orders = await tx.orders.findMany({ where: { id: { in: locked.map((l) => l.id) } } });
    // Đọc lại sau khi khóa: đơn có thể vừa được thanh toán xong trước khi ta lấy được khóa
    const expired = orders.filter((o) => isExpired(o, now));
    if (!expired.length) return 0;

    // Cộng dồn nguyên liệu của mọi đơn rồi trả một lượt theo thứ tự stock_id (cùng thứ tự với lúc giữ chỗ → không deadlock)
    const release = new Map<number, number>();
    for (const o of expired) {
      assertTransition(o.status, OrderStatus.CANCELLED);
      for (const u of o.stock_usage as unknown as StockUse[]) {
        release.set(u.stock_id, (release.get(u.stock_id) ?? 0) + u.quantity);
      }
    }
    await releaseStock(
      tx,
      [...release].sort(([a], [b]) => a - b).map(([stock_id, quantity]) => ({ stock_id, quantity })),
    );

    for (const o of expired) {
      if (o.promotion_id) {
        await tx.promotions.update({ where: { id: o.promotion_id }, data: { used_count: { decrement: 1 } } });
      }
    }
    await tx.orders.updateMany({ where: { id: { in: expired.map((o) => o.id) } }, data: { status: OrderStatus.CANCELLED } });
    logger.log(`Đã tự hủy ${expired.length} đơn quá hạn thanh toán: ${expired.map((o) => o.id).join(', ')}`);
    return expired.length;
  });
}

/** Gọi trước khi xử lý request. Dọn lỗi (ví dụ DB bận) không được làm hỏng request chính. */
export async function sweepExpiredOrders(prisma: PrismaService) {
  try {
    await expireOverdueOrders(prisma);
  } catch (err) {
    logger.warn(`Không dọn được đơn quá hạn: ${(err as Error).message}`);
  }
}
