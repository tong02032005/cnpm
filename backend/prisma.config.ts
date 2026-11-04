// Cấu hình Prisma 7: đọc DATABASE_URL từ backend/.env (nếu có) hoặc biến môi trường.
import { defineConfig } from 'prisma/config';

try {
  process.loadEnvFile();
} catch {
  // không có .env (Docker/CI) → dùng biến môi trường sẵn có
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx src/seed.ts' },
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
