import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './setup.js';

// Đọc backend/.env khi chạy local; trong Docker biến môi trường được truyền sẵn.
try {
  process.loadEnvFile();
} catch {
  // không có file .env
}

async function bootstrap() {
  const app = configureApp(await NestFactory.create(AppModule));
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`BrewLite API đang chạy: http://localhost:${port}`);
}
await bootstrap();
