import type { INestApplication } from '@nestjs/common';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { bearer, createApp, register } from './helpers.js';

// INT-T02, INT-T04 – Task 6 (tạo đơn) và Task 10c (tồn kho khi đặt đồng thời)
describe('Orders API', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: Awaited<ReturnType<typeof createApp>>['http'];
  let token: string;

  beforeAll(async () => {
    ({ app, prisma, http } = await createApp());
    token = await register(app, 'order@test.vn');
  });
  afterAll(() => app.close());

  const order = (body: object, t = token) => http().post('/orders').set(bearer(t)).send(body);

  it('tạo đơn PENDING, backend tự tính giá (Latte M + trân châu ×2 = 94.000đ), trừ kho', async () => {
    const res = await order({ items: [{ productId: 4, size: 'M', quantity: 2, toppingIds: [1] }] }).expect(201);
    expect(res.body).toMatchObject({ id: expect.any(Number), status: 'PENDING', subtotal: 94000, discount: 0, total: 94000 });
    expect(res.body.items[0]).toMatchObject({ product_name: 'Latte', unit_price: 47000, line_total: 94000 });
    expect((await prisma.products.findUniqueOrThrow({ where: { id: 4 } })).stock).toBe(98);
  });

  it('dữ liệu sai → 400: giỏ rỗng, số lượng ≤ 0, size lạ, sản phẩm không tồn tại, gửi kèm giá', async () => {
    await order({ items: [] }).expect(400);
    await order({ items: [{ productId: 1, size: 'S', quantity: 0 }] }).expect(400);
    await order({ items: [{ productId: 1, size: 'XL', quantity: 1 }] }).expect(400);
    await order({ items: [{ productId: 999, size: 'S', quantity: 1 }] }).expect(400);
    await order({ items: [{ productId: 1, size: 'S', quantity: 1, price: 1 }] }).expect(400);
    await order({ items: [{ productId: 1, size: 'S', quantity: 1, toppingIds: [99] }] }).expect(400);
  });

  it('mã khuyến mãi hợp lệ giảm giá; mã sai / chưa đủ đơn tối thiểu → 400', async () => {
    const res = await order({ items: [{ productId: 4, size: 'L', quantity: 2 }], promoCode: 'welcome10' }).expect(201);
    expect(res.body).toMatchObject({ subtotal: 90000, discount: 9000, total: 81000 });
    await order({ items: [{ productId: 1, size: 'S', quantity: 1 }], promoCode: 'KHONGCO' }).expect(400);
    await order({ items: [{ productId: 1, size: 'S', quantity: 1 }], promoCode: 'WELCOME10' }).expect(400);
  });

  it('INT-T04: 20 khách đặt cùng lúc khi chỉ còn 5 ly → đúng 5 đơn thành công, không bán vượt kho', async () => {
    await prisma.products.update({ where: { id: 6 }, data: { stock: 5 } });
    const tokens = await Promise.all(Array.from({ length: 20 }, (_, i) => register(app, `race${i}@test.vn`)));
    const results = await Promise.all(tokens.map((t) => order({ items: [{ productId: 6, size: 'S', quantity: 1 }] }, t)));

    expect(results.filter((r) => r.status === 201)).toHaveLength(5);
    expect(results.filter((r) => r.status === 409)).toHaveLength(15);
    expect((await prisma.products.findUniqueOrThrow({ where: { id: 6 } })).stock).toBe(0);
    expect(await prisma.orders.count({ where: { items: { some: { product_id: 6 } } } })).toBe(5);
  });

  it('GET /orders/me chỉ trả đơn của mình; xem đơn người khác → 404', async () => {
    const other = await register(app, 'other@test.vn');
    const mine = await http().get('/orders/me').set(bearer(token)).expect(200);
    expect(mine.body).toHaveLength(2);
    await http().get(`/orders/${mine.body[0].id}`).set(bearer(other)).expect(404);
    expect((await http().get('/orders/me').set(bearer(other)).expect(200)).body).toEqual([]);
  });
});
