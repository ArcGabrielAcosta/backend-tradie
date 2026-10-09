import { Controller, Get, Header } from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: 'Welcome page / health check' })
  @ApiProduces('text/html')
  @ApiResponse({
    status: 200,
    description: 'Welcome HTML page with system status and tool links',
  })
  getWelcome(): string {
    return this.appService.getWelcomePage();
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({ status: 200, description: 'Service is up' })
  getHealth() {
    return { data: { status: 'ok' } };
  }
}
