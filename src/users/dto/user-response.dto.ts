import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../entities/user.entity';
import { toApiRole } from '../enums/user-role.enum';
import { toApiStatus } from '../enums/user-status.enum';

export class UserResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: 'laura@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: 'Laura Gómez' })
  fullName!: string | null;

  @ApiPropertyOptional({ example: '+5491112345678' })
  phone!: string | null;

  @ApiProperty({
    example: 'client',
    description: 'API role alias (client | professional | admin)',
  })
  role!: string;

  @ApiProperty({
    example: 'active',
    description: 'API status alias (active | suspended | blocked)',
  })
  status!: string;

  @ApiProperty({ example: '2026-09-01T18:00:00.000Z' })
  createdAt!: string;

  static fromEntity(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = String(user.id);
    dto.email = user.email;
    dto.fullName = user.fullName;
    dto.phone = user.phone;
    dto.role = toApiRole(user.role);
    dto.status = toApiStatus(user.status);
    dto.createdAt = user.createdAt.toISOString();
    return dto;
  }
}
