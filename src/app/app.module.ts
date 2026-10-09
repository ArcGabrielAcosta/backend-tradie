import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { NestLensModule } from 'nestlens';
import { AuthModule } from '../auth/auth.module';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CategoriesModule } from '../categories/categories.module';
import { AppConfigModule } from '../config/config.module';
import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../redis/redis.module';
import { RedisService } from '../redis/redis.service';
import { UsersModule } from '../users/users.module';
import { WelcomePage } from '../welcome/welcome.page';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    AppConfigModule,
    RedisModule,
    DatabaseModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService, RedisService],
      useFactory: (config: ConfigService, redis: RedisService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.get<number>('throttle.ttl') ?? 60000,
            limit: config.get<number>('throttle.limit') ?? 100,
          },
        ],
        storage: new ThrottlerStorageRedisService(redis.getClient()),
      }),
    }),
    NestLensModule.forRoot({
      enabled: process.env.NESTLENS_ENABLED !== 'false',
      path: process.env.NESTLENS_PATH ?? '/nestlens',
      authorization: {
        allowedEnvironments: ['development', 'local', 'test', 'dev'],
      },
      watchers: {
        request: {
          ignorePaths: [
            process.env.SWAGGER_PATH ? `/${process.env.SWAGGER_PATH}` : '/docs',
            process.env.NESTLENS_PATH ?? '/nestlens',
          ],
        },
      },
    }),
    UsersModule,
    AuthModule,
    CategoriesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    WelcomePage,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: FirebaseAuthGuard,
    },
  ],
})
export class AppModule {}
