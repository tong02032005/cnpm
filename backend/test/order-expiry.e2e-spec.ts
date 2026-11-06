import type { INestApplication } from '@nestjs/common';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { bearer, createApp, register } from './helpers.js';

// INT-T06 – tự hủy đơn quá hạn thanh toán 15 phút
describe('Order expiry', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: Awaited<ReturnType<typeof createApp>>['http'];
  let token: string;

  beforeAll(async () => {
    ({ app, prisma, http } = await createApp());
    token = await register(app, 'expiry@test.vn');
  });
  afterAll(() => app.close());

  // Latte L ×2 = 90.000đ (đủ đơn tối thiểu cho WELCOME10)
  const newOrder = async (body: object = {}) =>
    (await http().post('/orders').set(bearer(token)).send({ items: [{ productId: 4, size: 'L', quantity: 2 }], ...body }).expect(201))
      .body as { id: number; created_at: string; expires_at: string };
  const expire = (id: number) => prisma.orders.update({ where: { id }, data: { expires_at: new Date(Date.now() - 1000) } });
  const coffee = async () => (await prisma.stocks.findUniqueOrThrow({ where: { name: 'Cà phê hạt' } })).reserved;
  const welcome = async () => (await prisma.promotions.findUniqueOrThrow({ where: { code: 'WELCOME10' } })).used_count;
  const status = async (id: number) => (await prisma.orders.findUniqueOrThrow({ where: { id } })).status;
  const pay = (id: number, key: string, simulateFailure = false) =>
    http().post('/payments').set(bearer(token)).set('Idempotency-Key', key).send({ orderId: id, method: 'WALLET', simulateFailure });

  it('đơn mới có hạn thanh toán 15 phút sau lúc tạo', async () => {
    const o = await newOrder();
    expect(new Date(o.expires_at).getTime() - new Date(o.created_at).getTime()).toBe(15 * 60_000);
  });

  it('quá hạn: tự CANCELLED, trả chỗ nguyên liệu và lượt mã khuyến mãi', async () => {
    const [reserved, used] = [await coffee(), await welcome()];
    const o = await newOrder({ promoCode: 'WELCOME10' });
    expect(await coffee()).toBe(reserved + 46); // Latte L: 23 g × 2
    expect(await welcome()).toBe(used + 1);

    await expire(o.id);
    await http().get('/products').expect(200); // bất kỳ request nào cũng kích hoạt dọn đơn quá hạn
    expect(await status(o.id)).toBe('CANCELLED');
    expect(await coffee()).toBe(reserved);
    expect(await welcome()).toBe(used);
  });

  it('đơn PAYMENT_FAILED cũng hết hạn theo hạn cũ (thanh toán lỗi không được cộng thêm giờ)', async () => {
    const o = await newOrder();
    const before = (await prisma.orders.findUniqueOrThrow({ where: { id: o.id } })).expires_at;
    await pay(o.id, 'k-exp-fail', true).expect(201);
    expect(await status(o.id)).toBe('PAYMENT_FAILED');
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: o.id } })).expires_at).toEqual(before);

    await expire(o.id);
    await http().get(`/orders/${o.id}`).set(bearer(token)).expect(200);
    expect(await status(o.id)).toBe('CANCELLED');
  });

  it('thanh toán đơn đã quá hạn → 409, không tạo giao dịch nào', async () => {
    const o = await newOrder();
    await expire(o.id);
    const res = await pay(o.id, 'k-exp-pay').expect(409);
    expect(res.body.message).toContain('hết hạn thanh toán');
    expect(await prisma.payments.count({ where: { order_id: o.id } })).toBe(0);
    expect(await status(o.id)).toBe('CANCELLED');
  });

  it('không đụng tới đơn còn hạn và đơn đã thanh toán', async () => {
    const waiting = await newOrder();
    const paid = await newOrder();
    await pay(paid.id, 'k-exp-paid').expect(201);
    await expire(paid.id); // đã PAID thì hạn không còn ý nghĩa
    await http().get('/products').expect(200);
    expect(await status(waiting.id)).toBe('PENDING');
    expect(await status(paid.id)).toBe('PAID');
  });
});
