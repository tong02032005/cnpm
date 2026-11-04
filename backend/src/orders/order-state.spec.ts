import { ConflictException } from '@nestjs/common';
import { OrderStatus as S } from '../generated/prisma/enums.js';
import { assertTransition, canTransition } from './order-state.js';

// UNIT-T02 – Task 10 tiêu chí (a): chặn chuyển trạng thái sai
describe('Order state machine', () => {
  it('cho phép luồng chính PENDING → PAID → PREPARING → READY → COMPLETED', () => {
    const flow = [S.PENDING, S.PAID, S.PREPARING, S.READY, S.COMPLETED];
    for (let i = 0; i < flow.length - 1; i++) expect(() => assertTransition(flow[i], flow[i + 1])).not.toThrow();
  });

  it('thanh toán lỗi được thử lại; hủy được từ PENDING / PAYMENT_FAILED / PAID', () => {
    expect(canTransition(S.PENDING, S.PAYMENT_FAILED)).toBe(true);
    expect(canTransition(S.PAYMENT_FAILED, S.PAID)).toBe(true);
    for (const from of [S.PENDING, S.PAYMENT_FAILED, S.PAID]) expect(canTransition(from, S.CANCELLED)).toBe(true);
  });

  it.each([
    [S.PENDING, S.PREPARING],
    [S.PENDING, S.COMPLETED],
    [S.PAID, S.PENDING],
    [S.PAID, S.PAID],
    [S.PREPARING, S.CANCELLED],
    [S.READY, S.PAID],
    [S.COMPLETED, S.CANCELLED],
    [S.CANCELLED, S.PENDING],
  ])('chặn %s → %s và ném ConflictException', (from, to) => {
    expect(() => assertTransition(from, to)).toThrow(ConflictException);
  });

  it('COMPLETED và CANCELLED là trạng thái kết thúc', () => {
    for (const to of Object.values(S)) {
      expect(canTransition(S.COMPLETED, to)).toBe(false);
      expect(canTransition(S.CANCELLED, to)).toBe(false);
    }
  });
});
