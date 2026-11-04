import { loyaltyPoints, promotionDiscount, unitPrice, type PromotionRule } from './pricing.js';

// UNIT-T01 – tính giá, khuyến mãi, điểm thưởng
const promo = (over: Partial<PromotionRule> = {}): PromotionRule => ({
  type: 'PERCENT',
  value: 10,
  min_order: 50000,
  usage_limit: 100,
  used_count: 0,
  starts_at: new Date('2026-01-01'),
  ends_at: new Date('2027-12-31'),
  is_active: true,
  ...over,
});
const NOW = new Date('2026-11-04');

describe('unitPrice', () => {
  it('giá gốc + phụ thu size + topping', () => {
    expect(unitPrice(35000, 'S', [])).toBe(35000);
    expect(unitPrice(35000, 'M', [7000])).toBe(47000);
    expect(unitPrice(30000, 'L', [7000, 10000])).toBe(57000);
  });
});

describe('promotionDiscount', () => {
  it('giảm theo phần trăm, làm tròn xuống', () => {
    expect(promotionDiscount(promo(), 99999, NOW)).toEqual({ discount: 9999 });
  });
  it('giảm số tiền cố định nhưng không vượt tạm tính', () => {
    expect(promotionDiscount(promo({ type: 'FIXED', value: 80000, min_order: 0 }), 60000, NOW)).toEqual({ discount: 60000 });
  });
  it('từ chối mã hết hạn, chưa tới ngày, bị tắt, hết lượt, chưa đủ đơn tối thiểu', () => {
    expect(promotionDiscount(promo({ ends_at: new Date('2026-01-31') }), 100000, NOW)).toHaveProperty('error');
    expect(promotionDiscount(promo({ starts_at: new Date('2026-12-01') }), 100000, NOW)).toHaveProperty('error');
    expect(promotionDiscount(promo({ is_active: false }), 100000, NOW)).toHaveProperty('error');
    expect(promotionDiscount(promo({ usage_limit: 5, used_count: 5 }), 100000, NOW)).toHaveProperty('error');
    expect(promotionDiscount(promo(), 49999, NOW)).toHaveProperty('error');
  });
});

describe('loyaltyPoints', () => {
  it('1 điểm cho mỗi 10.000đ', () => {
    expect(loyaltyPoints(9999)).toBe(0);
    expect(loyaltyPoints(99000)).toBe(9);
  });
});
