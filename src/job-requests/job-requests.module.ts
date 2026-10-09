import { Module } from '@nestjs/common';
import { JobRequestsController } from './controllers/job-requests.controller';
import { JobRequestsService } from './services/job-requests.service';

@Module({
  controllers: [JobRequestsController],
  providers: [JobRequestsService],
  exports: [JobRequestsService],
})
export class JobRequestsModule {}
