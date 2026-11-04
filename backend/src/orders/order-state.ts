import { ConflictException } from '@nestjs/common';
import { OrderStatus as S } from '../generated/prisma/enums.js';

/**
 * Order State Machine (Task 10a). Mọi lần đổi trạng thái đơn đều phải qua assertTransition.
 *   PENDING → PAID → PREPARING → READY → COMPLETED
 *   PENDING → PAYMENT_FAILED → (thanh toán lại) PAID
 *   PENDING / PAYMENT_FAILED / PAID → CANCELLED (trạng thái kết thúc)
 */
export const TRANSITIONS: Record<S, readonly S[]> = {
  PENDING: [S.PAID, S.PAYMENT_FAILED, S.CANCELLED],
  PAYMENT_FAILED: [S.PAID, S.CANCELLED],
  PAID: [S.PREPARING, S.CANCELLED],
  PREPARING: [S.READY],
  READY: [S.COMPLETED],
  COMPLETED: [],
  CANCELLED: [],
};

export const canTransition = (from: S, to: S) => TRANSITIONS[from].includes(to);

export function assertTransition(from: S, to: S): void {
  if (!canTransition(from, to)) {
    throw new ConflictException(`Không thể chuyển đơn từ ${from} sang ${to}`);
  }
}
