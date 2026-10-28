import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(private readonly ds: DataSource) {}

  // version = commit SHA của image; smoke test sau deploy dùng nó để biết bản mới đã chạy.
  @Get()
  async check() {
    try {
      await this.ds.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException({ status: 'error', db: 'down' });
    }
    return { status: 'ok', db: 'up', version: process.env.GIT_SHA ?? 'dev' };
  }
}
