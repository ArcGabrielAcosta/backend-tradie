import { Controller } from '@nestjs/common';
import { ProfessionalsService } from '../services/professionals.service';

@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}
}
