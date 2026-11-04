import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * Kết nối PostgreSQL qua Prisma 7 (driver adapter `pg`, không cần tải engine nhị phân).
 * DATABASE_URL lấy từ backend/.env (chạy local) hoặc biến môi trường (Docker).
 * Kết nối mở ở truy vấn đầu tiên, nên GET / vẫn chạy khi DB chưa bật.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
