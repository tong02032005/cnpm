import { BadRequestException } from '@nestjs/common';
import { Promotion, PromotionType } from '../promotions/promotion.entity';

// Tiền tính bằng số nguyên VND. Backend luôn tự tính, không tin giá từ client.

export function unitPrice(basePrice: number, sizeDelta: number, toppingPrices: number[]): number {
  return basePrice + sizeDelta + toppingPrices.reduce((sum, p) => sum + p, 0);
}

export function promotionDiscount(promo: Promotion, subtotal: number, now = new Date()): number {
  const expired = now < promo.startsAt || now > promo.endsAt;
  if (!promo.isActive || expired || promo.usedCount >= promo.usageLimit) {
    throw new BadRequestException('Mã khuyến mãi không hợp lệ hoặc đã hết hạn');
  }
  if (subtotal < promo.minOrder) {
    throw new BadRequestException(`Mã chỉ áp dụng cho đơn từ ${promo.minOrder}đ`);
  }
  const discount =
    promo.type === PromotionType.PERCENT ? Math.floor((subtotal * promo.value) / 100) : promo.value;
  return Math.min(discount, subtotal);
}

// 1 điểm cho mỗi 10.000đ
export function loyaltyPoints(total: number): number {
  return Math.floor(total / 10_000);
}
