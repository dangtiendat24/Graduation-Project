import { DataSource, DataSourceOptions } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';

dotenv.config();

// DATABASE_URL (Neon, production) ghi đè host/port/user/pass riêng lẻ (local docker)
export const getTypeOrmConfig = (config: ConfigService): DataSourceOptions => {
  const databaseUrl = config.get<string>('DATABASE_URL');

  const connection: Partial<DataSourceOptions> = databaseUrl
    ? { url: databaseUrl, ssl: { rejectUnauthorized: false } }
    : {
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'smart_user'),
        password: config.get<string>('DB_PASSWORD', 'smart_password'),
        database: config.get<string>('DB_NAME', 'smart_recruitment'),
      };

  return {
    type: 'postgres',
    ...connection,
    entities: [__dirname + '/../**/*.entity.{ts,js}'],
    migrations: [__dirname + '/../database/migrations/*.{ts,js}'],
    synchronize: process.env.TYPEORM_SYNC === 'true',
    logging: config.get<string>('NODE_ENV') === 'development',
  } as DataSourceOptions;
};

// DataSource dùng cho TypeORM CLI (migration:generate, migration:run)
const cliConnection: Partial<DataSourceOptions> = process.env.DATABASE_URL
  ? { url: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'smart_user',
      password: process.env.DB_PASSWORD || 'smart_password',
      database: process.env.DB_NAME || 'smart_recruitment',
    };

export default new DataSource({
  type: 'postgres',
  ...cliConnection,
  entities: [__dirname + '/../**/*.entity.{ts,js}'],
  migrations: [__dirname + '/../database/migrations/*.{ts,js}'],
  synchronize: false,
} as DataSourceOptions);
