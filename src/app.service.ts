import { Injectable } from '@nestjs/common';
import { SystemStatus, WelcomePage } from './welcome/welcome.page';

@Injectable()
export class AppService {
  constructor(private readonly welcomePage: WelcomePage) {}

  getSystemStatus(): SystemStatus {
    return {
      status: 'online',
      environment: process.env.NODE_ENV ?? 'development',
      port: process.env.PORT ?? 3001,
      uptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
      swaggerPath: process.env.SWAGGER_PATH ?? 'docs',
      nestlensPath: process.env.NESTLENS_PATH ?? '/nestlens',
    };
  }

  getWelcomePage(): string {
    return this.welcomePage.render(this.getSystemStatus());
  }
}
