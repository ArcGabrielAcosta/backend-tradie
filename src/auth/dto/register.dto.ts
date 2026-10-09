import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'laura@example.com' })
  @IsEmail()
  @MaxLength(150)
  email!: string;

  @ApiProperty({
    example: 'SecurePass1',
    description:
      'Min 8 chars, at least 1 uppercase, 1 lowercase and 1 number',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'password must contain at least 1 uppercase, 1 lowercase and 1 number',
  })
  password!: string;

  @ApiProperty({ example: 'Laura Gómez' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  fullName!: string;

  @ApiProperty({
    example: 'client',
    enum: ['client', 'professional', 'cliente', 'profesional'],
    description: 'Admin cannot be self-registered',
  })
  @IsString()
  @IsIn(['client', 'professional', 'cliente', 'profesional'])
  role!: string;

  @ApiPropertyOptional({ example: '+5491112345678' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
