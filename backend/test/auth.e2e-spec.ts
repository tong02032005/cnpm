import type { INestApplication } from '@nestjs/common';
import { bearer, createApp } from './helpers.js';

// INT-T01 – Task 7: đăng ký / đăng nhập JWT
describe('Auth API', () => {
  let app: INestApplication;
  let http: Awaited<ReturnType<typeof createApp>>['http'];

  beforeAll(async () => ({ app, http } = await createApp()));
  afterAll(() => app.close());

  const user = { fullName: 'Tòng', email: 'tong@test.vn', password: 'secret123' };

  it('đăng ký → 201 + JWT, không trả mật khẩu; email trùng → 409', async () => {
    const res = await http().post('/auth/register').send(user).expect(201);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user).toEqual({ id: expect.any(Number), fullName: 'Tòng', email: 'tong@test.vn', role: 'CUSTOMER', loyaltyPoints: 0 });
    expect(JSON.stringify(res.body)).not.toContain('password');
    await http().post('/auth/register').send({ ...user, email: 'TONG@test.vn' }).expect(409);
  });

  it('validate đầu vào: email sai, mật khẩu ngắn, trường lạ → 400', async () => {
    await http().post('/auth/register').send({ ...user, email: 'khong-phai-email' }).expect(400);
    await http().post('/auth/register').send({ ...user, email: 'a@test.vn', password: '123' }).expect(400);
    await http().post('/auth/register').send({ ...user, email: 'b@test.vn', role: 'STAFF' }).expect(400);
  });

  it('đăng nhập đúng → JWT dùng được cho /auth/me; sai mật khẩu → 401', async () => {
    const res = await http().post('/auth/login').send({ email: user.email, password: user.password }).expect(200);
    const me = await http().get('/auth/me').set(bearer(res.body.accessToken)).expect(200);
    expect(me.body.email).toBe('tong@test.vn');
    await http().post('/auth/login').send({ email: user.email, password: 'sai-mat-khau' }).expect(401);
  });

  it('route cần đăng nhập: không có token hoặc token giả → 401', async () => {
    await http().get('/auth/me').expect(401);
    await http().get('/auth/me').set(bearer('token.gia.mao')).expect(401);
    await http().post('/orders').send({ items: [] }).expect(401);
  });
});
