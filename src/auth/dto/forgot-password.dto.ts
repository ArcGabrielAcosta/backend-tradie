import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'laura@example.com' })
  @IsEmail()
  @MaxLength(150)
  email!: string;
}
