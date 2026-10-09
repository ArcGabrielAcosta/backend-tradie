import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Category } from '../entities/category.entity';

export class CategoryResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: 'Plomería' })
  name!: string;

  @ApiPropertyOptional({ example: 'Instalaciones y reparaciones de agua' })
  description!: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  static fromEntity(category: Category): CategoryResponseDto {
    const dto = new CategoryResponseDto();
    dto.id = String(category.id);
    dto.name = category.name;
    dto.description = category.description;
    dto.isActive = category.isActive;
    return dto;
  }
}
