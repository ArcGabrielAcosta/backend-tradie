import { Controller } from '@nestjs/common';
import { LandingService } from '../services/landing.service';

@Controller('landing')
export class LandingController {
  constructor(private readonly landingService: LandingService) {}
}
