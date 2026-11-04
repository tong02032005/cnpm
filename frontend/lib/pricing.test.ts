// Unit test logic giá (Task 4.3, 5.3). Chạy: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculatePrice, cartTotal, formatVnd } from './pricing.ts';

test('giá gốc + phụ thu size + topping', () => {
  assert.equal(calculatePrice(35000, 0, []), 35000);
  assert.equal(calculatePrice(35000, 5000, [7000]), 47000);
  assert.equal(calculatePrice(30000, 10000, [7000, 10000]), 57000);
});

test('nhân theo số lượng; số lượng < 1 tính là 1', () => {
  assert.equal(calculatePrice(20000, 10000, [8000], 3), 114000);
  assert.equal(calculatePrice(20000, 0, [], 0), 20000);
});

test('tổng giỏ hàng', () => {
  assert.equal(cartTotal([{ unitPrice: 47000, quantity: 2 }, { unitPrice: 20000, quantity: 1 }]), 114000);
  assert.equal(cartTotal([]), 0);
});

test('định dạng tiền Việt Nam', () => {
  assert.equal(formatVnd(35000), '35.000đ');
});
