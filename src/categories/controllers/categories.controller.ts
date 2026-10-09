import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CategoryResponseDto } from '../dto/category-response.dto';
import { CategoriesService } from '../services/categories.service';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List active trade categories (public)' })
  @ApiResponse({ status: 200, type: CategoryResponseDto, isArray: true })
  async listActive() {
    return this.categoriesService.listPublic();
  }
}
