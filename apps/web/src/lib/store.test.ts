import { describe, expect, it } from 'vitest';
import { addLine, cartCount, cartTotal, type CartLine } from './store';

const capM = { productId: 3, name: 'Cappuccino', size: 'M' as const, toppingIds: [1], toppingNames: ['Trân châu'], unitPrice: 55_000, qty: 1 };

describe('cart', () => {
  it('gộp cùng món/size/topping, tách khi khác topping', () => {
    let lines: CartLine[] = [];
    lines = addLine(lines, capM);
    lines = addLine(lines, { ...capM, qty: 2 });
    lines = addLine(lines, { ...capM, toppingIds: [], toppingNames: [], unitPrice: 50_000 });
    expect(lines).toHaveLength(2);
    expect(lines[0].qty).toBe(3);
  });

  it('tính tổng tiền và số ly', () => {
    const lines = addLine(addLine([], capM), { ...capM, productId: 6, name: 'Trà đào', size: 'L', toppingIds: [], unitPrice: 49_000, qty: 2 });
    expect(cartTotal(lines)).toBe(153_000);
    expect(cartCount(lines)).toBe(3);
  });
});
