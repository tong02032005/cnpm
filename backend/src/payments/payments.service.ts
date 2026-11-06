import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.guard.js';
import { isUniqueViolation } from '../common/prisma-errors.js';
import type { payments } from '../generated/prisma/client.js';
import { OrderStatus } from '../generated/prisma/enums.js';
import { assertTransition } from '../orders/order-state.js';
import { lockOrder } from '../orders/orders.service.js';
import { isExpired, sweepExpiredOrders } from '../orders/order-expiry.js';
import { loyaltyPoints } from '../orders/pricing.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MockPaymentGateway } from './mock-gateway.js';
import { CreatePaymentDto } from './payments.dto.js';

/**
 * Thanh toán idempotent (Task 8 + 10b).
 * Mỗi lần bấm "Thanh toán" frontend gửi header Idempotency-Key; gửi lại cùng key (mất mạng, bấm 2 lần…)
 * chỉ trả lại kết quả cũ, không trừ tiền lần nữa. Cột idempotency_key là UNIQUE trong DB.
 */
@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: MockPaymentGateway,
  ) {}

  async pay(user: AuthUser, idempotencyKey: string | undefined, dto: CreatePaymentDto) {
    const key = idempotencyKey?.trim();
    if (!key || key.length > 100) throw new BadRequestException('Thiếu header Idempotency-Key');

    const previous = await this.prisma.payments.findUnique({ where: { idempotency_key: key } });
    if (previous) return this.replay(previous, user, dto);
    await sweepExpiredOrders(this.prisma);

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Khóa đơn: hai request thanh toán cùng một đơn (dù khác key) chạy lần lượt, không trừ tiền 2 lần
        await lockOrder(tx, dto.orderId);
        const order = await tx.orders.findUnique({ where: { id: dto.orderId } });
        if (!order || order.user_id !== user.sub) throw new NotFoundException(`Không tìm thấy đơn ${dto.orderId}`);

        // Request cùng key chạy song song và đã giữ khóa trước → trả kết quả của nó
        const winner = await tx.payments.findUnique({ where: { idempotency_key: key } });
        if (winner) return this.result(winner, order.status);

        // Hết hạn thanh toán: chặn ngay cả khi chưa kịp dọn (không gọi cổng thanh toán, không trừ tiền)
        const swept = order.status === OrderStatus.CANCELLED && order.expires_at < new Date(); // đã bị tự hủy
        if (isExpired(order) || swept) {
          throw new ConflictException(`Đơn #${order.id} đã hết hạn thanh toán. Vui lòng đặt lại đơn mới.`);
        }

        assertTransition(order.status, OrderStatus.PAID); // chỉ đơn PENDING / PAYMENT_FAILED mới được trả tiền

        const { success } = await this.gateway.charge({
          amount: order.total,
          method: dto.method,
          simulateFailure: dto.simulateFailure,
        });
        const payment = await tx.payments.create({
          data: {
            order_id: order.id,
            idempotency_key: key,
            method: dto.method,
            status: success ? 'SUCCEEDED' : 'FAILED',
            amount: order.total,
          },
        });

        if (success) {
          await tx.orders.update({ where: { id: order.id }, data: { status: OrderStatus.PAID } });
          const points = loyaltyPoints(order.total); // Task 10d: cộng điểm khi đơn PAID
          if (points > 0) {
            await tx.loyalty_transactions.create({ data: { user_id: order.user_id, order_id: order.id, points } });
            await tx.users.update({ where: { id: order.user_id }, data: { loyalty_points: { increment: points } } });
          }
          return this.result(payment, OrderStatus.PAID);
        }
        // Thanh toán lỗi: đơn PAYMENT_FAILED, frontend giữ nguyên giỏ để khách thử lại
        if (order.status !== OrderStatus.PAYMENT_FAILED) {
          await tx.orders.update({ where: { id: order.id }, data: { status: OrderStatus.PAYMENT_FAILED } });
        }
        return this.result(payment, OrderStatus.PAYMENT_FAILED);
      });
    } catch (err) {
      // Hai request cùng key chèn cùng lúc: request ghi sau vi phạm UNIQUE → đọc lại kết quả của request trước
      if (isUniqueViolation(err)) {
        const winner = await this.prisma.payments.findUnique({ where: { idempotency_key: key } });
        if (winner) return this.replay(winner, user, dto);
      }
      throw err;
    }
  }

  private async replay(payment: payments, user: AuthUser, dto: CreatePaymentDto) {
    const order = await this.prisma.orders.findUnique({ where: { id: payment.order_id } });
    if (!order || order.user_id !== user.sub || payment.order_id !== dto.orderId) {
      throw new ConflictException('Idempotency-Key đã được dùng cho một yêu cầu khác');
    }
    return this.result(payment, order.status);
  }

  private result(payment: payments, orderStatus: OrderStatus) {
    return {
      paymentId: payment.id,
      orderId: payment.order_id,
      amount: payment.amount,
      method: payment.method,
      paymentStatus: payment.status,
      orderStatus,
    };
  }
}
