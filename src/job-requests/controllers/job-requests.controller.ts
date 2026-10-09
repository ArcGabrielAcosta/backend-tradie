import { Controller } from '@nestjs/common';
import { JobRequestsService } from '../services/job-requests.service';

@Controller('job-requests')
export class JobRequestsController {
  constructor(private readonly jobRequestsService: JobRequestsService) {}
}
