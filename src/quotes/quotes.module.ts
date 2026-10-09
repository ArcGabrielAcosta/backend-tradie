import { Module } from '@nestjs/common';
import { QuotesController } from './controllers/quotes.controller';
import { QuotesService } from './services/quotes.service';

@Module({
  controllers: [QuotesController],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}
