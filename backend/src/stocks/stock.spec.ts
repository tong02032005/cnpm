import { cupsLeft, stockUsage, type RecipeRow } from './stock.js';

// UNIT-T03 – tính lượng nguyên liệu theo công thức
const recipes: RecipeRow[] = [
  // Latte (id 4): size M 18 g cà phê (stock 1) + 150 ml sữa (stock 3); size L 23 g + 195 ml
  { product_id: 4, topping_id: null, size: 'M', stock_id: 1, quantity: 18 },
  { product_id: 4, topping_id: null, size: 'M', stock_id: 3, quantity: 150 },
  { product_id: 4, topping_id: null, size: 'L', stock_id: 1, quantity: 23 },
  { product_id: 4, topping_id: null, size: 'L', stock_id: 3, quantity: 195 },
  // Bạc xỉu (id 3) size M cũng dùng sữa tươi
  { product_id: 3, topping_id: null, size: 'M', stock_id: 3, quantity: 60 },
  // Topping trân châu (id 1): 30 g (stock 8)
  { product_id: null, topping_id: 1, size: null, stock_id: 8, quantity: 30 },
];

describe('stockUsage', () => {
  it('nhân công thức đúng size với số ly, cộng topping theo số ly', () => {
    expect(stockUsage([{ product_id: 4, size: 'M', quantity: 2, toppingIds: [1] }], recipes)).toEqual([
      { stock_id: 1, quantity: 36 },
      { stock_id: 3, quantity: 300 },
      { stock_id: 8, quantity: 60 },
    ]);
  });

  it('cộng dồn nguyên liệu dùng chung giữa các món, sắp theo stock_id', () => {
    const usage = stockUsage(
      [
        { product_id: 3, size: 'M', quantity: 1, toppingIds: [] },
        { product_id: 4, size: 'L', quantity: 1, toppingIds: [] },
      ],
      recipes,
    );
    expect(usage).toEqual([
      { stock_id: 1, quantity: 23 },
      { stock_id: 3, quantity: 255 },
    ]);
  });

  it('món chưa có công thức → không cần nguyên liệu', () => {
    expect(stockUsage([{ product_id: 99, size: 'S', quantity: 3, toppingIds: [] }], recipes)).toEqual([]);
  });
});

describe('cupsLeft', () => {
  const recipe = [
    { stock_id: 1, quantity: 18 },
    { stock_id: 3, quantity: 150 },
  ];
  it('lấy theo nguyên liệu ít nhất', () => {
    expect(cupsLeft(recipe, new Map([[1, 100], [3, 1000]]))).toBe(5); // cà phê đủ 5 ly, sữa đủ 6 ly
  });
  it('hết một nguyên liệu → 0; chưa có công thức → null', () => {
    expect(cupsLeft(recipe, new Map([[1, 17], [3, 1000]]))).toBe(0);
    expect(cupsLeft([], new Map())).toBeNull();
  });
});
