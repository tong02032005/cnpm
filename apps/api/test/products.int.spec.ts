import { INestApplication } from '@nestjs/common';
import { createApp } from './helpers';

describe('Products & health', () => {
  let app: INestApplication;
  let http: Awaited<ReturnType<typeof createApp>>['http'];

  beforeAll(async () => ({ app, http } = await createApp()));
  afterAll(() => app.close());

  it('API-T01: GET /products trả menu từ seed, mỗi món có 3 size', async () => {
    const res = await http().get('/products').expect(200);
    expect(res.body).toHaveLength(8);
    expect(res.body[0]).toMatchObject({ id: expect.any(Number), name: expect.any(String), basePrice: 35000 });
    expect(res.body[0].sizes.map((s: { size: string }) => s.size)).toEqual(['S', 'M', 'L']);
  });

  it('GET /products/:id trả chi tiết kèm topping', async () => {
    const res = await http().get('/products/3').expect(200);
    expect(res.body.name).toBe('Cappuccino');
    expect(res.body.toppings).toHaveLength(3);
  });

  it('API-T02: sản phẩm không tồn tại → 404, id sai định dạng → 400', async () => {
    await http().get('/products/9999').expect(404);
    await http().get('/products/abc').expect(400);
  });

  it('GET /health kiểm tra kết nối DB', async () => {
    const res = await http().get('/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'up' });
  });
});
