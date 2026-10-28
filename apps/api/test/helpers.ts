import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule, configureApp } from '../src/app.module';
import { seed } from '../src/seed';

export async function createApp() {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = configureApp(moduleRef.createNestApplication());
  await app.listen(0);
  const ds = app.get(DataSource);
  await ds.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await ds.runMigrations();
  await seed(ds);
  return { app, ds, http: () => request(app.getHttpServer()) };
}

export async function register(app: INestApplication, email: string) {
  const res = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, password: 'secret123' })
    .expect(201);
  return res.body.accessToken as string;
}

export async function login(app: INestApplication, email: string, password: string) {
  const res = await request(app.getHttpServer()).post('/auth/login').send({ email, password }).expect(200);
  return res.body.accessToken as string;
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
