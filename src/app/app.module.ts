import { Module } from '@nestjs/common';
import { NestLensModule } from 'nestlens';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WelcomePage } from '../welcome/welcome.page';
import { ConfigAppModule } from '../config/config.module';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { CategoriesModule } from '../categories/categories.module';
import { ProfessionalsModule } from '../professionals/professionals.module';
import { SearchModule } from '../search/search.module';
import { GeoModule } from '../geo/geo.module';
import { JobRequestsModule } from '../job-requests/job-requests.module';
import { QuotesModule } from '../quotes/quotes.module';
import { ChatModule } from '../chat/chat.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RatingsModule } from '../ratings/ratings.module';
import { HistoryModule } from '../history/history.module';
import { AdminModule } from '../admin/admin.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { LandingModule } from '../landing/landing.module';

@Module({
  imports: [
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
    ConfigAppModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProfessionalsModule,
    SearchModule,
    GeoModule,
    JobRequestsModule,
    QuotesModule,
    ChatModule,
    NotificationsModule,
    RatingsModule,
    HistoryModule,
    AdminModule,
    DashboardModule,
    SubscriptionsModule,
    LandingModule,
  ],
  controllers: [AppController],
  providers: [AppService, WelcomePage],
})
export class AppModule {}
