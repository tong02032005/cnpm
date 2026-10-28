import { ConflictException } from '@nestjs/common';
import { OrderStatus as S } from './order.entity';

// Order State Machine (A1 mục 9.1). Mọi cặp không có trong bảng đều bị chặn.
export const TRANSITIONS: Record<S, S[]> = {
  [S.PENDING]: [S.PAID, S.PAYMENT_FAILED, S.CANCELLED],
  [S.PAYMENT_FAILED]: [S.PENDING, S.CANCELLED],
  [S.PAID]: [S.PREPARING, S.CANCELLED],
  [S.PREPARING]: [S.READY],
  [S.READY]: [S.COMPLETED],
  [S.COMPLETED]: [],
  [S.CANCELLED]: [],
};

export function canTransition(from: S, to: S): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: S, to: S): void {
  if (!canTransition(from, to)) {
    throw new ConflictException(`Không thể chuyển đơn từ ${from} sang ${to}`);
  }
}
