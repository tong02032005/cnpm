import type { INestApplication } from '@nestjs/common';
import { createApp } from './helpers.js';

// API-T01, API-T02 – Task 2: menu và chi tiết sản phẩm
describe('Products API', () => {
  let app: INestApplication;
  let http: Awaited<ReturnType<typeof createApp>>['http'];

  beforeAll(async () => ({ app, http } = await createApp()));
  afterAll(() => app.close());

  it('GET /health → db up', async () => {
    expect((await http().get('/health').expect(200)).body).toEqual({ status: 'ok', db: 'up' });
  });

  it('GET /products → 200, 8 món có id, tên, giá, ảnh; phản hồi < 500ms', async () => {
    const start = Date.now();
    const res = await http().get('/products').expect(200);
    expect(Date.now() - start).toBeLessThan(500);
    expect(res.body).toHaveLength(8);
    expect(res.body[0]).toMatchObject({ id: 1, name: 'Cà phê đen', price: 20000, imageUrl: '/products/ca-phe-den.svg' });
  });

  it('GET /products/:id → chi tiết kèm size S/M/L và topping', async () => {
    const res = await http().get('/products/4').expect(200);
    expect(res.body).toMatchObject({ name: 'Latte', price: 35000 });
    expect(res.body.sizes).toEqual([
      { size: 'S', extra: 0 },
      { size: 'M', extra: 5000 },
      { size: 'L', extra: 10000 },
    ]);
    expect(res.body.toppings.map((t: { name: string }) => t.name)).toEqual(['Trân châu', 'Pudding', 'Kem cheese']);
  });

  it('GET /products/999 → 404, /products/abc → 400', async () => {
    await http().get('/products/999').expect(404);
    await http().get('/products/abc').expect(400);
  });
});
