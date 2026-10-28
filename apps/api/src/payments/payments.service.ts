import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { AuthUser } from '../auth/auth.guard';
import { assertTransition } from '../orders/order-state';
import { Order, OrderStatus } from '../orders/order.entity';
import { loyaltyPoints } from '../orders/pricing';
import { Promotion } from '../promotions/promotion.entity';
import { LoyaltyTransaction, User } from '../users/user.entity';
import { Payment, PaymentMethod, PaymentStatus } from './payment.entity';

export interface PayDto {
  orderId: number;
  method: PaymentMethod;
  simulateFailure?: boolean;
}

// Cổng thanh toán mô phỏng (Ví/Thẻ). simulateFailure dùng cho demo và test nhánh lỗi.
@Injectable()
export class MockPaymentGateway {
  charge(_amount: number, _method: PaymentMethod, simulateFailure = false): boolean {
    return !simulateFailure;
  }
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly ds: DataSource,
    private readonly gateway: MockPaymentGateway,
  ) {}

  async pay(user: AuthUser, idempotencyKey: string | undefined, dto: PayDto) {
    const key = idempotencyKey?.trim();
    if (!key || key.length > 100) throw new BadRequestException('Thiếu header Idempotency-Key hợp lệ');

    // Đã xử lý key này rồi: trả lại đúng kết quả cũ, không gọi cổng thanh toán lần nữa.
    const previous = await this.ds.manager.findOneBy(Payment, { idempotencyKey: key });
    if (previous) return this.replay(previous, user, dto);

    try {
      return await this.ds.transaction(async (m) => {
        // Khóa dòng đơn: hai key khác nhau cho cùng một đơn cũng không trả tiền hai lần.
        const order = await m.findOne(Order, {
          where: { id: dto.orderId, userId: user.sub },
          lock: { mode: 'pessimistic_write' },
        });
        if (!order) throw new NotFoundException(`Không tìm thấy đơn ${dto.orderId}`);

        // Request cùng key chạy song song và đã giữ khóa trước: trả kết quả của nó.
        const winner = await m.findOneBy(Payment, { idempotencyKey: key });
        if (winner) return this.replay(winner, user, dto);

        if (order.status === OrderStatus.PAYMENT_FAILED) {
          assertTransition(order.status, OrderStatus.PENDING); // thử thanh toán lại
          order.status = OrderStatus.PENDING;
        }
        assertTransition(order.status, OrderStatus.PAID);

        // Giữ lượt dùng mã trước khi trừ tiền; điều kiện trong UPDATE chặn vượt usageLimit kể cả khi đặt đồng thời.
        if (order.promotionId) {
          const reserved = await m
            .createQueryBuilder()
            .update(Promotion)
            .set({ usedCount: () => '"usedCount" + 1' })
            .where('id = :id AND "isActive" AND "usedCount" < "usageLimit" AND now() <= "endsAt"', {
              id: order.promotionId,
            })
            .execute();
          if (reserved.affected !== 1) {
            throw new ConflictException('Mã khuyến mãi đã hết lượt hoặc hết hạn, vui lòng đặt lại đơn');
          }
        }

        // ponytail: gọi cổng thanh toán trong transaction chỉ ổn với mock; cổng thật cần tách ra (outbox).
        const ok = this.gateway.charge(order.total, dto.method, dto.simulateFailure);
        const payment = await m.save(
          m.create(Payment, {
            orderId: order.id,
            idempotencyKey: key,
            amount: order.total,
            method: dto.method,
            status: ok ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED,
          }),
        );

        order.status = ok ? OrderStatus.PAID : OrderStatus.PAYMENT_FAILED;
        await m.update(Order, { id: order.id }, { status: order.status });

        if (ok) {
          const points = loyaltyPoints(order.total);
          if (points > 0) {
            await m.insert(LoyaltyTransaction, { userId: order.userId, orderId: order.id, points });
            await m.increment(User, { id: order.userId }, 'loyaltyPoints', points);
          }
        } else if (order.promotionId) {
          await m.decrement(Promotion, { id: order.promotionId }, 'usedCount', 1); // trả lại lượt vừa giữ
        }
        return this.toResult(payment, order.status);
      });
    } catch (err) {
      // Hai request cùng key chạy song song: request ghi sau vi phạm unique, đọc lại kết quả của request trước.
      if (err instanceof QueryFailedError && (err.driverError as { code?: string }).code === '23505') {
        const winner = await this.ds.manager.findOneBy(Payment, { idempotencyKey: key });
        if (winner) return this.replay(winner, user, dto);
      }
      throw err;
    }
  }

  private async replay(payment: Payment, user: AuthUser, dto: PayDto) {
    const order = await this.ds.manager.findOneBy(Order, { id: payment.orderId });
    if (!order || order.userId !== user.sub || payment.orderId !== dto.orderId) {
      throw new ConflictException('Idempotency-Key đã được dùng cho yêu cầu khác');
    }
    const status = payment.status === PaymentStatus.FAILED ? OrderStatus.PAYMENT_FAILED : OrderStatus.PAID;
    return this.toResult(payment, status);
  }

  private toResult(payment: Payment, orderStatus: OrderStatus) {
    return {
      paymentId: payment.id,
      orderId: payment.orderId,
      amount: payment.amount,
      method: payment.method,
      paymentStatus: payment.status,
      orderStatus,
    };
  }
}
