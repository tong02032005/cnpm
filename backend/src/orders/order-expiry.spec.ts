import { OrderStatus as S } from '../generated/prisma/enums.js';
import { isExpired, orderExpiresAt, ORDER_TTL_MINUTES } from './order-expiry.js';

// UNIT-T04 – hạn thanh toán của đơn
describe('order expiry', () => {
  const now = new Date('2026-11-06T10:00:00Z');
  const past = new Date('2026-11-06T09:59:59Z');
  const future = new Date('2026-11-06T10:00:01Z');

  it('hạn thanh toán = lúc tạo + 15 phút', () => {
    expect(ORDER_TTL_MINUTES).toBe(15);
    expect(orderExpiresAt(now).toISOString()).toBe('2026-11-06T10:15:00.000Z');
  });

  it('chỉ đơn còn chờ thanh toán (PENDING / PAYMENT_FAILED) và đã quá hạn mới bị coi là hết hạn', () => {
    expect(isExpired({ status: S.PENDING, expires_at: past }, now)).toBe(true);
    expect(isExpired({ status: S.PAYMENT_FAILED, expires_at: past }, now)).toBe(true);
    expect(isExpired({ status: S.PENDING, expires_at: future }, now)).toBe(false);
    for (const status of [S.PAID, S.PREPARING, S.READY, S.COMPLETED, S.CANCELLED]) {
      expect(isExpired({ status, expires_at: past }, now)).toBe(false);
    }
  });
});
