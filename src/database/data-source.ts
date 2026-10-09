import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * TypeORM CLI data source (migrations only).
 * App runtime uses DatabaseModule / TypeOrmModule.forRootAsync.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: parseInt(process.env.POSTGRES_PORT ?? '5433', 10),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  ssl: false,
  synchronize: false,
  logging: process.env.TYPEORM_LOGGING === 'true',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*{.ts,.js}'],
  migrationsTableName: 'typeorm_migrations',
});
