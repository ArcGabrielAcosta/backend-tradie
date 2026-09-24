import { Module } from '@nestjs/common';
import { NestLensModule } from 'nestlens';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WelcomePage } from './welcome/welcome.page';

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
  ],
  controllers: [AppController],
  providers: [AppService, WelcomePage],
})
export class AppModule {}
