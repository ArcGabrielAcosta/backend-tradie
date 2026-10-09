import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminCategoriesController } from './controllers/admin-categories.controller';
import { CategoriesController } from './controllers/categories.controller';
import { Category } from './entities/category.entity';
import { CategoriesService } from './services/categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([Category])],
  controllers: [CategoriesController, AdminCategoriesController],
  providers: [CategoriesService, RolesGuard],
  exports: [CategoriesService, TypeOrmModule],
})
export class CategoriesModule {}
