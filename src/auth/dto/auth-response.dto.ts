import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class AuthTokensResponseDto {
  @ApiProperty({
    description: 'Firebase ID token (send as Bearer on protected routes)',
  })
  idToken!: string;

  @ApiProperty({
    description: 'Firebase refresh token (when provided by Identity Toolkit)',
  })
  refreshToken!: string;

  @ApiProperty({ example: 3600 })
  expiresIn!: number;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}

export class MessageResponseDto {
  @ApiProperty()
  message!: string;
}
