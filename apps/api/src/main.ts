import './config';
import { readFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AppModule, configureApp } from './app.module';

// HTTPS khi có SSL_KEY + SSL_CERT (local); production để Render lo HTTPS.
const { SSL_KEY, SSL_CERT } = process.env;
const httpsOptions = SSL_KEY && SSL_CERT ? { key: readFileSync(SSL_KEY), cert: readFileSync(SSL_CERT) } : undefined;

async function bootstrap() {
  const app = configureApp(await NestFactory.create(AppModule, { httpsOptions }));
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}

bootstrap();
