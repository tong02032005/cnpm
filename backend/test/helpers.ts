// Tiện ích cho integration test: dựng app NestJS thật nối với một database TEST riêng.
// Database test bị XÓA SẠCH mỗi lần chạy – không bao giờ trỏ vào database đang dùng.
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { seed } from '../src/seed.js';
import { configureApp } from '../src/setup.js';

const TEST_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://brewlite:brewlite@localhost:5432/brewlite_test';
if (!/test/i.test(new URL(TEST_URL).pathname)) {
  throw new Error(`TEST_DATABASE_URL phải trỏ tới database có chữ "test" (hiện là ${TEST_URL})`);
}
process.env.DATABASE_URL = TEST_URL;

/** Xóa sạch schema rồi chạy lại toàn bộ migration SQL (giống `prisma migrate deploy`). */
async function resetDatabase() {
  const client = new pg.Client({ connectionString: TEST_URL });
  await client.connect();
  await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
  const dir = join(import.meta.dirname, '../prisma/migrations');
  for (const m of readdirSync(dir).filter((d) => /^\d+_/.test(d)).sort()) {
    await client.query(readFileSync(join(dir, m, 'migration.sql'), 'utf8'));
  }
  await client.end();
}

export async function createApp() {
  await resetDatabase();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = configureApp(moduleRef.createNestApplication());
  await app.listen(0);
  const prisma = app.get(PrismaService);
  await seed(prisma);
  return { app, prisma, http: () => request(app.getHttpServer()) };
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function register(app: INestApplication, email: string, password = 'secret123') {
  const res = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ fullName: 'Khách test', email, password })
    .expect(201);
  return res.body.accessToken as string;
}

export async function login(app: INestApplication, email: string, password: string) {
  const res = await request(app.getHttpServer()).post('/auth/login').send({ email, password }).expect(200);
  return res.body.accessToken as string;
}
