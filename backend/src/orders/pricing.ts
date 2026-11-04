// Tính giá – hàm thuần, có unit test (pricing.spec.ts). Tiền là số nguyên VND.
// Backend luôn tự tính lại giá khi tạo đơn, không tin giá do client gửi lên (Task 6).

export const SIZES = { S: 0, M: 5000, L: 10000 } as const;
export type Size = keyof typeof SIZES;

/** Giá 1 ly = giá gốc + phụ thu size + tổng topping. */
export function unitPrice(basePrice: number, size: Size, toppingPrices: number[]): number {
  return basePrice + SIZES[size] + toppingPrices.reduce((sum, p) => sum + p, 0);
}

export interface PromotionRule {
  type: 'PERCENT' | 'FIXED';
  value: number;
  min_order: number;
  usage_limit: number | null;
  used_count: number;
  starts_at: Date;
  ends_at: Date;
  is_active: boolean;
}

/**
 * Số tiền giảm cho đơn có tạm tính `subtotal`, hoặc lý do mã không dùng được (Task 10d).
 * Giảm không bao giờ vượt quá tạm tính.
 */
export function promotionDiscount(
  promo: PromotionRule,
  subtotal: number,
  now = new Date(),
): { discount: number } | { error: string } {
  if (!promo.is_active || now < promo.starts_at || now > promo.ends_at) {
    return { error: 'Mã khuyến mãi đã hết hạn' };
  }
  if (promo.usage_limit !== null && promo.used_count >= promo.usage_limit) {
    return { error: 'Mã khuyến mãi đã hết lượt dùng' };
  }
  if (subtotal < promo.min_order) {
    return { error: `Đơn tối thiểu ${promo.min_order.toLocaleString('vi-VN')}đ để dùng mã này` };
  }
  const raw = promo.type === 'PERCENT' ? Math.floor((subtotal * promo.value) / 100) : promo.value;
  return { discount: Math.min(raw, subtotal) };
}

/** Điểm thưởng: 1 điểm cho mỗi 10.000đ thanh toán (Task 10d). */
export const loyaltyPoints = (total: number) => Math.floor(total / 10000);
