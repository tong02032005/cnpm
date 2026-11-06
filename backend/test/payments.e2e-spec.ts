import type { INestApplication } from '@nestjs/common';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { bearer, createApp, login, register } from './helpers.js';

// INT-T03, INT-T05 – Task 8 (thanh toán), Task 10a/b/d (state machine, idempotency, điểm thưởng)
describe('Payments API', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: Awaited<ReturnType<typeof createApp>>['http'];
  let token: string;
  let staff: string;

  beforeAll(async () => {
    ({ app, prisma, http } = await createApp());
    token = await register(app, 'pay@test.vn');
    staff = await login(app, 'staff@brewlite.local', 'staff123');
  });
  afterAll(() => app.close());

  // Latte S ×2 = 70.000đ → 7 điểm
  const newOrder = async () =>
    (await http().post('/orders').set(bearer(token)).send({ items: [{ productId: 4, size: 'S', quantity: 2 }] }).expect(201)).body
      .id as number;
  const pay = (key: string | null, body: object) => {
    const req = http().post('/payments').set(bearer(token));
    return (key ? req.set('Idempotency-Key', key) : req).send(body);
  };
  const status = async (id: number) => (await prisma.orders.findUniqueOrThrow({ where: { id } })).status;
  const points = async () => (await http().get('/auth/me').set(bearer(token))).body.loyaltyPoints as number;
  const coffee = async () => {
    const s = await prisma.stocks.findUniqueOrThrow({ where: { name: 'Cà phê hạt' } });
    return { quantity: s.quantity, reserved: s.reserved };
  };
  const setStatus = (t: string, id: number, s: string) => http().patch(`/orders/${id}/status`).set(bearer(t)).send({ status: s });

  it('thiếu Idempotency-Key → 400; phương thức lạ (tiền mặt) → 400', async () => {
    const orderId = await newOrder();
    await pay(null, { orderId, method: 'WALLET' }).expect(400);
    await pay('k-cash', { orderId, method: 'CASH' }).expect(400);
  });

  it('INT-T03 (b): cùng Idempotency-Key gửi 2 lần và gửi song song 5 lần → chỉ 1 giao dịch, cộng điểm 1 lần', async () => {
    const before = await points();
    const orderId = await newOrder();
    const first = await pay('k-dup', { orderId, method: 'CARD' }).expect(201);
    expect(first.body).toMatchObject({ orderId, amount: 70000, paymentStatus: 'SUCCEEDED', orderStatus: 'PAID' });
    const again = await pay('k-dup', { orderId, method: 'CARD' }).expect(201);
    expect(again.body.paymentId).toBe(first.body.paymentId);

    const orderId2 = await newOrder();
    const parallel = await Promise.all(Array.from({ length: 5 }, () => pay('k-par', { orderId: orderId2, method: 'WALLET' })));
    expect(new Set(parallel.map((r) => r.body.paymentId)).size).toBe(1);

    expect(await prisma.payments.count({ where: { order_id: { in: [orderId, orderId2] } } })).toBe(2);
    expect(await points()).toBe(before + 14);
  });

  it('đơn đã PAID: thanh toán lại bằng key khác → 409; dùng lại key cho đơn khác → 409', async () => {
    const orderId = await newOrder();
    await pay('k-a', { orderId, method: 'WALLET' }).expect(201);
    await pay('k-b', { orderId, method: 'WALLET' }).expect(409);
    await pay('k-a', { orderId: await newOrder(), method: 'WALLET' }).expect(409);
  });

  it('thanh toán lỗi → PAYMENT_FAILED, không cộng điểm; thử lại bằng key mới → PAID', async () => {
    const before = await points();
    const orderId = await newOrder();
    const failed = await pay('k-fail', { orderId, method: 'CARD', simulateFailure: true }).expect(201);
    expect(failed.body).toMatchObject({ paymentStatus: 'FAILED', orderStatus: 'PAYMENT_FAILED' });
    expect(await points()).toBe(before);
    await pay('k-retry', { orderId, method: 'CARD' }).expect(201);
    expect(await status(orderId)).toBe('PAID');
  });

  it('Task 10a: STAFF đưa đơn PAID → PREPARING → READY → COMPLETED; chuyển sai → 409', async () => {
    const orderId = await newOrder();
    await setStatus(staff, orderId, 'PREPARING').expect(409); // chưa thanh toán
    await pay('k-staff', { orderId, method: 'WALLET' }).expect(201);
    for (const s of ['PREPARING', 'READY', 'COMPLETED']) await setStatus(staff, orderId, s).expect(200);
    await setStatus(staff, orderId, 'CANCELLED').expect(409); // COMPLETED là trạng thái kết thúc
  });

  it('đơn COMPLETED mới trừ nguyên liệu thật khỏi kho, và chỉ trừ một lần', async () => {
    const before = await coffee();
    const orderId = await newOrder(); // Latte S ×2: 2 × 14 g cà phê
    expect(await coffee()).toEqual({ quantity: before.quantity, reserved: before.reserved + 28 });
    await pay('k-consume', { orderId, method: 'CARD' }).expect(201);
    for (const s of ['PREPARING', 'READY']) await setStatus(staff, orderId, s).expect(200);
    expect((await coffee()).quantity).toBe(before.quantity); // đang pha: vẫn chỉ giữ chỗ

    await setStatus(staff, orderId, 'COMPLETED').expect(200);
    expect(await coffee()).toEqual({ quantity: before.quantity - 28, reserved: before.reserved });
    await setStatus(staff, orderId, 'COMPLETED').expect(409); // không hoàn thành lần 2
    expect((await coffee()).quantity).toBe(before.quantity - 28);
  });

  it('phân quyền: khách không tự chuyển PREPARING, STAFF không tự đánh dấu PAID → 403', async () => {
    const orderId = await newOrder();
    await setStatus(token, orderId, 'PREPARING').expect(403);
    await setStatus(staff, orderId, 'PAID').expect(403);
  });

  it('hủy đơn đã PAID: hoàn tiền, trả chỗ nguyên liệu, thu hồi điểm, trả lượt mã khuyến mãi', async () => {
    const before = await points();
    const stock = await coffee();
    const res = await http()
      .post('/orders')
      .set(bearer(token))
      .send({ items: [{ productId: 4, size: 'L', quantity: 2 }], promoCode: 'WELCOME10' })
      .expect(201);
    const used = (await prisma.promotions.findUniqueOrThrow({ where: { code: 'WELCOME10' } })).used_count;
    await pay('k-cancel', { orderId: res.body.id, method: 'WALLET' }).expect(201);
    expect(await points()).toBe(before + 8); // 81.000đ → 8 điểm

    await setStatus(token, res.body.id, 'CANCELLED').expect(200);
    expect(await points()).toBe(before);
    expect(await coffee()).toEqual(stock); // kho thật không đổi, phần giữ chỗ được trả lại
    expect((await prisma.promotions.findUniqueOrThrow({ where: { code: 'WELCOME10' } })).used_count).toBe(used - 1);
    expect((await prisma.payments.findFirstOrThrow({ where: { order_id: res.body.id } })).status).toBe('REFUNDED');
  });
});
