import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuthTokensResponseDto,
  MessageResponseDto,
} from '../dto/auth-response.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { FirebaseAuthService } from '../firebase/firebase-auth.service';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import { UserRole, parseUserRole } from '../../users/enums/user-role.enum';
import { UserStatus } from '../../users/enums/user-status.enum';
import { UsersService } from '../../users/services/users.service';
import { SessionService } from './session.service';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly firebaseAuth: FirebaseAuthService,
    private readonly sessionService: SessionService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.config.get<string>('nodeEnv') === 'development') {
      await this.ensureDevAdmin();
    }
  }

  async register(dto: RegisterDto): Promise<{ data: UserResponseDto }> {
    const role = parseUserRole(dto.role);
    if (!role || role === UserRole.ADMIN) {
      throw new BadRequestException('Invalid role for registration');
    }

    const firebaseUser = await this.firebaseAuth.createUser({
      email: dto.email,
      password: dto.password,
      displayName: dto.fullName,
    });

    try {
      const user = await this.usersService.createLocalUser({
        email: dto.email,
        fullName: dto.fullName,
        phone: dto.phone,
        role,
        firebaseUid: firebaseUser.uid,
        status: UserStatus.ACTIVO,
      });
      return { data: UserResponseDto.fromEntity(user) };
    } catch (error) {
      // Best-effort compensation if local persistence fails after Firebase create
      try {
        await this.firebaseAuth.revokeRefreshTokens(firebaseUser.uid);
      } catch {
        /* ignore */
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<{ data: AuthTokensResponseDto }> {
    const email = dto.email.toLowerCase();

    if (await this.sessionService.isLoginLocked(email)) {
      throw new ForbiddenException({
        message: 'Account temporarily locked. Try again later.',
        code: 'ACCOUNT_LOCKED',
      });
    }

    const localUser = await this.usersService.findByEmail(email);

    try {
      const tokens = await this.firebaseAuth.signInWithPassword(
        email,
        dto.password,
      );

      if (!localUser) {
        throw new UnauthorizedException('Invalid credentials');
      }

      if (localUser.status === UserStatus.SUSPENDIDO) {
        throw new ForbiddenException({
          message: 'Account suspended',
          code: 'ACCOUNT_SUSPENDED',
        });
      }

      if (
        this.usersService.isLocked(localUser) ||
        localUser.status === UserStatus.BLOQUEADO
      ) {
        throw new ForbiddenException({
          message: 'Account locked',
          code: 'ACCOUNT_LOCKED',
        });
      }

      if (!localUser.firebaseUid) {
        await this.usersService.updateFirebaseUid(
          localUser.id,
          tokens.localId,
        );
        localUser.firebaseUid = tokens.localId;
      }

      await this.sessionService.clearLoginAttempts(email);
      await this.usersService.resetLoginFailures(localUser);
      await this.sessionService.cacheUserSession(localUser, tokens.expiresIn);

      return {
        data: {
          idToken: tokens.idToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          user: UserResponseDto.fromEntity(localUser),
        },
      };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        (error instanceof BadRequestException &&
          !(error instanceof UnauthorizedException))
      ) {
        throw error;
      }

      if (error instanceof UnauthorizedException || localUser) {
        const result = await this.sessionService.registerFailedLogin(email);
        if (localUser) {
          const lockedUntil = result.locked
            ? new Date(Date.now() + result.lockMinutes * 60_000)
            : null;
          await this.usersService.setLoginFailure(
            localUser,
            result.attempts,
            lockedUntil,
          );
        }
        if (result.locked) {
          throw new ForbiddenException({
            message: `Account temporarily locked. Try again in ${result.lockMinutes} minutes.`,
            code: 'ACCOUNT_LOCKED',
          });
        }
      }

      throw new UnauthorizedException('Invalid credentials');
    }
  }

  async logout(firebaseUid: string): Promise<void> {
    await this.sessionService.invalidateSession(firebaseUid);
    await this.firebaseAuth.revokeRefreshTokens(firebaseUid);
  }

  async forgotPassword(
    dto: ForgotPasswordDto,
  ): Promise<{ data: MessageResponseDto }> {
    const email = dto.email.toLowerCase();
    const user = await this.usersService.findByEmail(email);

    if (user) {
      try {
        const link = await this.firebaseAuth.generatePasswordResetLink(email);
        // Never reveal whether the account exists; log link only in non-production.
        if (this.config.get<string>('nodeEnv') !== 'production') {
          this.logger.log(`Password reset link for ${email}: ${link}`);
        }
      } catch (error) {
        this.logger.warn(
          `Password reset generation failed: ${(error as Error).message}`,
        );
      }
    }

    return {
      data: {
        message: 'If an account exists, a reset link has been sent.',
      },
    };
  }

  async resetPassword(
    dto: ResetPasswordDto,
  ): Promise<{ data: MessageResponseDto }> {
    await this.firebaseAuth.resetPasswordWithToken(dto.token, dto.password);
    return {
      data: { message: 'Password updated successfully' },
    };
  }

  async me(userId: string): Promise<{ data: UserResponseDto }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return { data: UserResponseDto.fromEntity(user) };
  }

  private async ensureDevAdmin(): Promise<void> {
    const email = (
      this.config.get<string>('seed.adminEmail') ?? 'admin@tradie.dev'
    ).toLowerCase();
    const password =
      this.config.get<string>('seed.adminPassword') ?? 'Admin123!';
    const fullName =
      this.config.get<string>('seed.adminName') ?? 'Tradie Admin';

    const existing = await this.usersService.findByEmail(email);
    if (existing) return;

    try {
      const firebaseUser = await this.firebaseAuth.createUser({
        email,
        password,
        displayName: fullName,
      });
      await this.usersService.createLocalUser({
        email,
        fullName,
        role: UserRole.ADMIN,
        firebaseUid: firebaseUser.uid,
        status: UserStatus.ACTIVO,
      });
      this.logger.warn(`Dev admin ready: ${email}`);
    } catch (error) {
      this.logger.warn(
        `Dev admin seed skipped: ${(error as Error).message}`,
      );
    }
  }
}
