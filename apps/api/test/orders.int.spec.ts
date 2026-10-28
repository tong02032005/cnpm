import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Product } from '../src/products/product.entity';
import { bearer, createApp, login, register } from './helpers';

const cappuccinoM = { productId: 3, size: 'M', qty: 1, toppingIds: [1] }; // 45k + 5k + 5k = 55k

describe('Auth & Orders', () => {
  let app: INestApplication;
  let ds: DataSource;
  let http: Awaited<ReturnType<typeof createApp>>['http'];
  let token: string;

  beforeAll(async () => {
    ({ app, ds, http } = await createApp());
    token = await register(app, 'khach@test.vn');
  });
  afterAll(() => app.close());

  describe('INT-T01: đăng ký / đăng nhập', () => {
    it('trùng email → 409, sai mật khẩu → 401, dữ liệu sai → 400', async () => {
      await http().post('/auth/register').send({ email: 'KHACH@test.vn', password: 'secret123' }).expect(409);
      await http().post('/auth/login').send({ email: 'khach@test.vn', password: 'wrongpass' }).expect(401);
      await http().post('/auth/register').send({ email: 'not-an-email', password: '1' }).expect(400);
    });

    it('route đặt đơn cần JWT hợp lệ', async () => {
      await http().post('/orders').send({ items: [cappuccinoM] }).expect(401);
      await http().post('/orders').set(bearer('abc')).send({ items: [cappuccinoM] }).expect(401);
      const me = await http().get('/users/me').set(bearer(token)).expect(200);
      expect(me.body).toMatchObject({ email: 'khach@test.vn', role: 'CUSTOMER', loyaltyPoints: 0 });
    });
  });

  describe('INT-T02: POST /orders', () => {
    it('tạo đơn PENDING, backend tự tính giá và áp mã khuyến mãi', async () => {
      const res = await http()
        .post('/orders')
        .set(bearer(token))
        .send({ items: [cappuccinoM, { productId: 6, size: 'L', qty: 2 }], promoCode: 'welcome10' })
        .expect(201);
      // 55.000 + 2 × 49.000 = 153.000, giảm 10%
      expect(res.body).toMatchObject({ status: 'PENDING', subtotal: 153000, discount: 15300, total: 137700 });
    });

    it('giỏ trống, size sai, topping sai, field lạ → 400', async () => {
      await http().post('/orders').set(bearer(token)).send({ items: [] }).expect(400);
      await http()
        .post('/orders')
        .set(bearer(token))
        .send({ items: [{ ...cappuccinoM, size: 'XL' }] })
        .expect(400);
      await http()
        .post('/orders')
        .set(bearer(token))
        .send({ items: [{ ...cappuccinoM, toppingIds: [99] }] })
        .expect(400);
      await http()
        .post('/orders')
        .set(bearer(token))
        .send({ items: [{ ...cappuccinoM, unitPrice: 1 }] })
        .expect(400);
    });

    it('mã khuyến mãi không tồn tại hoặc chưa đủ đơn tối thiểu → 400', async () => {
      await http().post('/orders').set(bearer(token)).send({ items: [cappuccinoM], promoCode: 'NOPE' }).expect(400);
      const small = { productId: 1, size: 'S', qty: 1 }; // 35.000 < 50.000
      await http().post('/orders').set(bearer(token)).send({ items: [small], promoCode: 'WELCOME10' }).expect(400);
    });

    it('hết hàng → 409 và không trừ tồn kho', async () => {
      await ds.manager.update(Product, { id: 2 }, { stock: 1 });
      await http()
        .post('/orders')
        .set(bearer(token))
        .send({ items: [{ productId: 2, size: 'S', qty: 2 }] })
        .expect(409);
      expect((await ds.manager.findOneByOrFail(Product, { id: 2 })).stock).toBe(1);
    });
  });

  it('INT-T04: 20 khách đặt đồng thời khi còn 5 ly → không bán quá tồn kho', async () => {
    await ds.manager.update(Product, { id: 4 }, { stock: 5 });
    const tokens = await Promise.all(Array.from({ length: 20 }, (_, i) => register(app, `dongthoi${i}@test.vn`)));

    const results = await Promise.all(
      tokens.map((t) =>
        http()
          .post('/orders')
          .set(bearer(t))
          .send({ items: [{ productId: 4, size: 'S', qty: 1 }] }),
      ),
    );
    const created = results.filter((r) => r.status === 201).length;

    expect(results.every((r) => r.status === 201 || r.status === 409)).toBe(true);
    expect(created).toBe(5);
    expect((await ds.manager.findOneByOrFail(Product, { id: 4 })).stock).toBe(0);
  });

  describe('PATCH /orders/:id/status', () => {
    it('khách hủy đơn của mình thì hoàn tồn kho; không được tự chuyển sang PREPARING', async () => {
      const before = (await ds.manager.findOneByOrFail(Product, { id: 5 })).stock;
      const order = await http()
        .post('/orders')
        .set(bearer(token))
        .send({ items: [{ productId: 5, size: 'S', qty: 3 }] })
        .expect(201);

      await http()
        .patch(`/orders/${order.body.id}/status`)
        .set(bearer(token))
        .send({ status: 'PREPARING' })
        .expect(403);
      await http()
        .patch(`/orders/${order.body.id}/status`)
        .set(bearer(token))
        .send({ status: 'CANCELLED' })
        .expect(200);

      expect((await ds.manager.findOneByOrFail(Product, { id: 5 })).stock).toBe(before);
      await http()
        .patch(`/orders/${order.body.id}/status`)
        .set(bearer(token))
        .send({ status: 'CANCELLED' })
        .expect(409);
    });

    it('khách khác không xem được đơn; STAFF xem được nhưng không được nhảy cóc trạng thái', async () => {
      const order = await http().post('/orders').set(bearer(token)).send({ items: [cappuccinoM] }).expect(201);
      const other = await register(app, 'nguoikhac@test.vn');
      await http().get(`/orders/${order.body.id}`).set(bearer(other)).expect(404);

      const staff = await login(app, 'staff@brewlite.local', 'staff123');
      await http().get(`/orders/${order.body.id}`).set(bearer(staff)).expect(200);
      await http()
        .patch(`/orders/${order.body.id}/status`)
        .set(bearer(staff))
        .send({ status: 'READY' })
        .expect(409);
    });
  });
});
