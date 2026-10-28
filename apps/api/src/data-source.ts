import 'reflect-metadata';
import './config';
import { join } from 'node:path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { entities } from './entities';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities,
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  // Pool đủ lớn cho test đặt hàng đồng thời
  extra: { max: 20 },
};

export default new DataSource(dataSourceOptions);
