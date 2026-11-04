// Task 4.3: tính giá theo size và topping để khách xem trước.
// Khi tạo đơn, backend tự tính lại (backend/src/orders/pricing.ts) – không tin giá từ trình duyệt.

/** Giá 1 ly = giá gốc + phụ thu size + tổng topping; nhân số lượng (tối thiểu 1). */
export function calculatePrice(basePrice: number, sizeExtra: number, toppingPrices: readonly number[], quantity = 1): number {
  const unit = basePrice + sizeExtra + toppingPrices.reduce((sum, p) => sum + p, 0);
  return unit * Math.max(1, Math.floor(quantity));
}

/** Tổng tiền giỏ hàng. */
export const cartTotal = (lines: readonly { unitPrice: number; quantity: number }[]) =>
  lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

/** 35000 → "35.000đ" */
export const formatVnd = (n: number) => `${n.toLocaleString('vi-VN')}đ`;
