import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../../redis/redis.service';
import { AdminCategoriesQueryDto } from '../dto/admin-categories-query.dto';
import { CategoryResponseDto } from '../dto/category-response.dto';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { Category } from '../entities/category.entity';

const PUBLIC_CACHE_KEY = 'cache:categories:active';
const PUBLIC_CACHE_TTL = 300;

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    private readonly redis: RedisService,
  ) {}

  async listPublic(): Promise<{ data: CategoryResponseDto[] }> {
    const cached =
      await this.redis.getJson<CategoryResponseDto[]>(PUBLIC_CACHE_KEY);
    if (cached) {
      return { data: cached };
    }

    const rows = await this.categoriesRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
    const data = rows.map(CategoryResponseDto.fromEntity);
    await this.redis.setJson(PUBLIC_CACHE_KEY, data, PUBLIC_CACHE_TTL);
    return { data };
  }

  async listAdmin(query: AdminCategoriesQueryDto): Promise<{
    data: CategoryResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const includeInactive = query.includeInactive ?? true;

    const qb = this.categoriesRepository.createQueryBuilder('c');
    if (!includeInactive) {
      qb.where('c.isActive = :active', { active: true });
    }
    qb.orderBy('c.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map(CategoryResponseDto.fromEntity),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async create(dto: CreateCategoryDto): Promise<{ data: CategoryResponseDto }> {
    const exists = await this.categoriesRepository.findOne({
      where: { name: dto.name },
    });
    if (exists) {
      throw new ConflictException('Category name already exists');
    }

    const category = await this.categoriesRepository.save(
      this.categoriesRepository.create({
        name: dto.name,
        description: dto.description ?? null,
        isActive: dto.isActive ?? true,
      }),
    );
    await this.invalidatePublicCache();
    return { data: CategoryResponseDto.fromEntity(category) };
  }

  async update(
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<{ data: CategoryResponseDto }> {
    const category = await this.categoriesRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (dto.name && dto.name !== category.name) {
      const exists = await this.categoriesRepository.findOne({
        where: { name: dto.name },
      });
      if (exists) {
        throw new ConflictException('Category name already exists');
      }
      category.name = dto.name;
    }

    if (dto.description !== undefined) {
      category.description = dto.description;
    }
    if (dto.isActive !== undefined) {
      category.isActive = dto.isActive;
    }

    const saved = await this.categoriesRepository.save(category);
    await this.invalidatePublicCache();
    return { data: CategoryResponseDto.fromEntity(saved) };
  }

  private async invalidatePublicCache(): Promise<void> {
    await this.redis.del(PUBLIC_CACHE_KEY);
  }
}
