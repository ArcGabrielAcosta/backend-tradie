import { Controller } from '@nestjs/common';
import { RatingsService } from '../services/ratings.service';

@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}
}
