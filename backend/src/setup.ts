import { INestApplication, ValidationPipe } from '@nestjs/common';

/** Cấu hình chung cho app thật (main.ts) và app trong test. */
export function configureApp(app: INestApplication) {
  // Cho phép frontend gọi API (nhiều địa chỉ cách nhau bằng dấu phẩy)
  app.enableCors({ origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(',') });
  // Validate mọi body bằng class-validator; trường lạ bị từ chối (400)
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  return app;
}
