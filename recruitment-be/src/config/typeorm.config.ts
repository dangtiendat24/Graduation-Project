import { DataSource, DataSourceOptions } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';

dotenv.config();

export const getTypeOrmConfig = (config: ConfigService): DataSourceOptions => ({
  type: 'postgres',
  host: config.get<string>('DB_HOST', 'localhost'),
  port: config.get<number>('DB_PORT', 5432),
  username: config.get<string>('DB_USER', 'smart_user'),
  password: config.get<string>('DB_PASSWORD', 'smart_password'),
  database: config.get<string>('DB_NAME', 'smart_recruitment'),
  entities: [__dirname + '/../**/*.entity.{ts,js}'],
  migrations: [__dirname + '/../database/migrations/*.{ts,js}'],
  synchronize: config.get<string>('NODE_ENV') !== 'production',
  logging: config.get<string>('NODE_ENV') === 'development',
});

// DataSource dùng cho TypeORM CLI (migration:generate, migration:run)
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'smart_user',
  password: process.env.DB_PASSWORD || 'smart_password',
  database: process.env.DB_NAME || 'smart_recruitment',
  entities: [__dirname + '/../**/*.entity.{ts,js}'],
  migrations: [__dirname + '/../database/migrations/*.{ts,js}'],
  synchronize: false,
});
