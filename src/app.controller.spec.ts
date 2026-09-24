import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WelcomePage } from './welcome/welcome.page';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, WelcomePage],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return the Tradie welcome HTML page', () => {
      const html = appController.getWelcome();

      expect(html).toContain('Bienvenido al backend de Tradie');
      expect(html).toContain('Swagger');
      expect(html).toContain('NestLens');
      expect(html).toContain('Online');
    });
  });
});
