import { BadRequestException } from '@nestjs/common';
import { Promotion, PromotionType } from '../promotions/promotion.entity';
import { loyaltyPoints, promotionDiscount, unitPrice } from './pricing';

// UNIT-T01 – tính giá size/topping/khuyến mãi
const promo = (patch: Partial<Promotion> = {}): Promotion =>
  Object.assign(new Promotion(), {
    code: 'TEST',
    type: PromotionType.PERCENT,
    value: 10,
    minOrder: 50_000,
    startsAt: new Date('2026-01-01'),
    endsAt: new Date('2026-12-31'),
    usageLimit: 10,
    usedCount: 0,
    isActive: true,
    ...patch,
  });
const now = new Date('2026-06-01');

describe('pricing', () => {
  it('giá 1 ly = giá gốc + chênh lệch size + topping', () => {
    expect(unitPrice(45_000, 5_000, [5_000, 10_000])).toBe(65_000);
    expect(unitPrice(35_000, 0, [])).toBe(35_000);
  });

  it('giảm theo phần trăm làm tròn xuống, giảm cố định không vượt tổng tiền', () => {
    expect(promotionDiscount(promo(), 123_456, now)).toBe(12_345);
    expect(promotionDiscount(promo({ type: PromotionType.FIXED, value: 80_000, minOrder: 0 }), 60_000, now)).toBe(
      60_000,
    );
  });

  it.each([
    ['chưa đủ đơn tối thiểu', promo(), 49_999],
    ['hết hạn', promo({ endsAt: new Date('2026-05-01') }), 100_000],
    ['chưa bắt đầu', promo({ startsAt: new Date('2026-07-01') }), 100_000],
    ['hết lượt dùng', promo({ usedCount: 10 }), 100_000],
    ['đã tắt', promo({ isActive: false }), 100_000],
  ])('từ chối mã khi %s', (_label, p, subtotal) => {
    expect(() => promotionDiscount(p, subtotal, now)).toThrow(BadRequestException);
  });

  it('1 điểm thưởng cho mỗi 10.000đ', () => {
    expect(loyaltyPoints(9_999)).toBe(0);
    expect(loyaltyPoints(137_700)).toBe(13);
  });
});
