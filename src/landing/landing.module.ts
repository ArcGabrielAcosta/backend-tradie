import { Module } from '@nestjs/common';
import { LandingController } from './controllers/landing.controller';
import { LandingService } from './services/landing.service';

@Module({
  controllers: [LandingController],
  providers: [LandingService],
  exports: [LandingService],
})
export class LandingModule {}
