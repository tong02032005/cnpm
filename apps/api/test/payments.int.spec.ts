import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Payment } from '../src/payments/payment.entity';
import { Promotion } from '../src/promotions/promotion.entity';
import { LoyaltyTransaction } from '../src/users/user.entity';
import { bearer, createApp, login, register } from './helpers';

describe('Payments', () => {
  let app: INestApplication;
  let ds: DataSource;
  let http: Awaited<ReturnType<typeof createApp>>['http'];
  let token: string;

  // 55.000 + 2 × 49.000 = 153.000 → 15 điểm
  const newOrder = async () =>
    (
      await http()
        .post('/orders')
        .set(bearer(token))
        .send({
          items: [
            { productId: 3, size: 'M', qty: 1, toppingIds: [1] },
            { productId: 6, size: 'L', qty: 2 },
          ],
        })
        .expect(201)
    ).body.id as number;

  const pay = (key: string | null, body: object) => {
    const req = http().post('/payments').set(bearer(token));
    return (key ? req.set('Idempotency-Key', key) : req).send(body);
  };

  beforeAll(async () => {
    ({ app, ds, http } = await createApp());
    token = await register(app, 'thanhtoan@test.vn');
  });
  afterAll(() => app.close());

  it('thiếu Idempotency-Key → 400', async () => {
    await pay(null, { orderId: await newOrder(), method: 'WALLET' }).expect(400);
  });

  it('thanh toán thành công: đơn PAID, cộng điểm', async () => {
    const orderId = await newOrder();
    const res = await pay('key-success', { orderId, method: 'CARD' }).expect(201);
    expect(res.body).toMatchObject({ orderId, amount: 153000, paymentStatus: 'SUCCEEDED', orderStatus: 'PAID' });

    const order = await http().get(`/orders/${orderId}`).set(bearer(token)).expect(200);
    expect(order.body.status).toBe('PAID');
  });

  it('INT-T03: gửi 2 lần (và 5 lần song song) cùng Idempotency-Key chỉ tạo 1 giao dịch', async () => {
    const orderId = await newOrder();
    const first = await pay('key-repeat', { orderId, method: 'WALLET' }).expect(201);
    const second = await pay('key-repeat', { orderId, method: 'WALLET' }).expect(201);
    expect(second.body).toEqual(first.body);

    const parallelOrder = await newOrder();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => pay('key-parallel', { orderId: parallelOrder, method: 'WALLET' })),
    );
    expect(results.map((r) => r.status)).toEqual([201, 201, 201, 201, 201]);
    expect(new Set(results.map((r) => r.body.paymentId)).size).toBe(1);

    expect(await ds.manager.countBy(Payment, { orderId })).toBe(1);
    expect(await ds.manager.countBy(Payment, { orderId: parallelOrder })).toBe(1);
  });

  it('key mới cho đơn đã PAID → 409, không trừ tiền lần hai', async () => {
    const orderId = await newOrder();
    await pay('key-a', { orderId, method: 'WALLET' }).expect(201);
    await pay('key-b', { orderId, method: 'WALLET' }).expect(409);
    expect(await ds.manager.countBy(Payment, { orderId })).toBe(1);
  });

  it('dùng lại key cho đơn khác → 409', async () => {
    const orderId = await newOrder();
    await pay('key-success', { orderId, method: 'WALLET' }).expect(409);
  });

  it('thanh toán lỗi → PAYMENT_FAILED, thử lại bằng key mới → PAID', async () => {
    const orderId = await newOrder();
    const failed = await pay('key-fail', { orderId, method: 'CARD', simulateFailure: true }).expect(201);
    expect(failed.body).toMatchObject({ paymentStatus: 'FAILED', orderStatus: 'PAYMENT_FAILED' });

    const retry = await pay('key-retry', { orderId, method: 'WALLET' }).expect(201);
    expect(retry.body.orderStatus).toBe('PAID');
  });

  it('INT-T05: đơn PAID cộng điểm đúng một lần', async () => {
    const before = (await http().get('/users/me').set(bearer(token))).body.loyaltyPoints;
    const orderId = await newOrder();
    await pay('key-loyalty', { orderId, method: 'WALLET' }).expect(201);
    await pay('key-loyalty', { orderId, method: 'WALLET' }).expect(201);

    const after = (await http().get('/users/me').set(bearer(token))).body.loyaltyPoints;
    expect(after - before).toBe(15);
    expect(await ds.manager.countBy(LoyaltyTransaction, { orderId })).toBe(1);
  });

  it('STAFF không được tự đánh dấu đơn PAID khi chưa thanh toán', async () => {
    const orderId = await newOrder();
    const staff = await login(app, 'staff@brewlite.local', 'staff123');
    for (const status of ['PAID', 'PAYMENT_FAILED', 'PENDING']) {
      await http().patch(`/orders/${orderId}/status`).set(bearer(staff)).send({ status }).expect(403);
    }
  });

  it('hủy đơn đã PAID: hoàn tiền, thu hồi điểm thưởng và trả lượt dùng mã', async () => {
    const pointsBefore = (await http().get('/users/me').set(bearer(token))).body.loyaltyPoints;
    const order = await http()
      .post('/orders')
      .set(bearer(token))
      .send({ items: [{ productId: 3, size: 'L', qty: 2 }], promoCode: 'WELCOME10' })
      .expect(201);
    await pay('key-cancel-paid', { orderId: order.body.id, method: 'WALLET' }).expect(201);
    const used = (await ds.manager.findOneByOrFail(Promotion, { code: 'WELCOME10' })).usedCount;

    await http().patch(`/orders/${order.body.id}/status`).set(bearer(token)).send({ status: 'CANCELLED' }).expect(200);

    expect((await http().get('/users/me').set(bearer(token))).body.loyaltyPoints).toBe(pointsBefore);
    expect((await ds.manager.findOneByOrFail(Promotion, { code: 'WELCOME10' })).usedCount).toBe(used - 1);
    expect((await ds.manager.findOneByOrFail(Payment, { orderId: order.body.id })).status).toBe('REFUNDED');
  });

  it('mã khuyến mãi không vượt usageLimit dù nhiều đơn đã tạo trước khi thanh toán', async () => {
    await ds.manager.update(Promotion, { code: 'WELCOME10' }, { usedCount: 0, usageLimit: 1 });
    const body = { items: [{ productId: 3, size: 'L', qty: 2 }], promoCode: 'WELCOME10' };
    const a = (await http().post('/orders').set(bearer(token)).send(body).expect(201)).body.id;
    const b = (await http().post('/orders').set(bearer(token)).send(body).expect(201)).body.id;

    await pay('key-promo-a', { orderId: a, method: 'WALLET' }).expect(201);
    await pay('key-promo-b', { orderId: b, method: 'WALLET' }).expect(409);
    expect((await ds.manager.findOneByOrFail(Promotion, { code: 'WELCOME10' })).usedCount).toBe(1);
    expect(await ds.manager.countBy(Payment, { orderId: b })).toBe(0);
  });

  it('STAFF đưa đơn đã thanh toán qua PREPARING → READY → COMPLETED', async () => {
    const orderId = await newOrder();
    await pay('key-staff', { orderId, method: 'WALLET' }).expect(201);
    const staff = await login(app, 'staff@brewlite.local', 'staff123');
    for (const status of ['PREPARING', 'READY', 'COMPLETED']) {
      await http().patch(`/orders/${orderId}/status`).set(bearer(staff)).send({ status }).expect(200);
    }
    const history = await http().get('/orders/me').set(bearer(token)).expect(200);
    expect(history.body.find((o: { id: number }) => o.id === orderId).status).toBe('COMPLETED');
  });
});
