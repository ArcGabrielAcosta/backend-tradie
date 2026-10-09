import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../../categories/entities/category.entity';

const BASE_CATEGORIES: Array<{ name: string; description: string }> = [
  { name: 'Plomería', description: 'Instalaciones y reparaciones de agua' },
  { name: 'Electricidad', description: 'Instalaciones eléctricas y fallas' },
  { name: 'Gas', description: 'Instalaciones y revisiones de gas' },
  { name: 'Albañilería', description: 'Obras y reparaciones de mampostería' },
  { name: 'Pintura', description: 'Pintura interior y exterior' },
  { name: 'Carpintería', description: 'Muebles y trabajos en madera' },
  { name: 'Climatización', description: 'Aire acondicionado y calefacción' },
  { name: 'Jardinería', description: 'Mantenimiento de espacios verdes' },
];

@Injectable()
export class DatabaseSeedService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseSeedService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const item of BASE_CATEGORIES) {
      const exists = await this.categoriesRepository.findOne({
        where: { name: item.name },
      });
      if (!exists) {
        await this.categoriesRepository.save(
          this.categoriesRepository.create({
            name: item.name,
            description: item.description,
            isActive: true,
          }),
        );
      }
    }
    this.logger.log('Category seed verified');
  }
}
