import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import { readFileSync } from 'fs';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { RedisService } from '../../redis/redis.service';
import {
  FirebaseAuthTokens,
  FirebaseCreateUserInput,
  FirebaseCreatedUser,
  VerifiedFirebaseToken,
} from './firebase-auth.types';

interface MockUserRecord {
  uid: string;
  email: string;
  passwordHash: string;
  displayName?: string;
}

@Injectable()
export class FirebaseAuthService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAuthService.name);
  private mode: 'mock' | 'firebase' = 'mock';
  private apiKey = '';
  private mockReady = false;
  private app: App | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  onModuleInit(): void {
    this.mode =
      (this.config.get<'mock' | 'firebase'>('firebase.mode') as
        | 'mock'
        | 'firebase') ?? 'mock';
    this.apiKey = this.config.get<string>('firebase.apiKey') ?? '';

    if (this.mode === 'firebase') {
      this.initFirebaseAdmin();
    } else {
      this.mockReady = true;
      this.logger.warn(
        'FIREBASE_AUTH_MODE=mock — using local mock auth. Switch to firebase when credentials are ready.',
      );
    }
  }

  getMode(): 'mock' | 'firebase' {
    return this.mode;
  }

  async createUser(
    input: FirebaseCreateUserInput,
  ): Promise<FirebaseCreatedUser> {
    if (this.mode === 'mock') {
      return this.mockCreateUser(input);
    }

    try {
      const user = await getAuth(this.app!).createUser({
        email: input.email.toLowerCase(),
        password: input.password,
        displayName: input.displayName,
        emailVerified: false,
      });
      return { uid: user.uid, email: user.email ?? input.email };
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'auth/email-already-exists') {
        throw new ConflictException('Email already registered');
      }
      this.logger.error(
        `Firebase createUser failed: ${(error as Error).message}`,
      );
      throw new BadRequestException('Unable to create authentication user');
    }
  }

  async signInWithPassword(
    email: string,
    password: string,
  ): Promise<FirebaseAuthTokens> {
    if (this.mode === 'mock') {
      return this.mockSignIn(email, password);
    }

    if (!this.apiKey) {
      throw new BadRequestException(
        'FIREBASE_API_KEY is required for email/password sign-in',
      );
    }

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase(),
          password,
          returnSecureToken: true,
        }),
      },
    );

    const payload = (await response.json()) as {
      idToken?: string;
      refreshToken?: string;
      expiresIn?: string;
      localId?: string;
      email?: string;
    };

    if (!response.ok || !payload.idToken || !payload.localId) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      idToken: payload.idToken,
      refreshToken: payload.refreshToken ?? '',
      expiresIn: parseInt(payload.expiresIn ?? '3600', 10),
      localId: payload.localId,
      email: payload.email ?? email.toLowerCase(),
    };
  }

  async verifyIdToken(idToken: string): Promise<VerifiedFirebaseToken> {
    if (this.mode === 'mock') {
      return this.mockVerifyIdToken(idToken);
    }

    try {
      const decoded = await getAuth(this.app!).verifyIdToken(idToken);
      if (!decoded.email) {
        throw new UnauthorizedException('Invalid authentication token');
      }
      return {
        uid: decoded.uid,
        email: decoded.email,
        emailVerified: decoded.email_verified,
      };
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired authentication token',
      );
    }
  }

  async generatePasswordResetLink(email: string): Promise<string> {
    if (this.mode === 'mock') {
      const token = randomUUID();
      const ttl = this.config.get<number>('mail.passwordResetTtl') ?? 3600;
      await this.redis.set(`mock:reset:${token}`, email.toLowerCase(), ttl);
      const base =
        this.config.get<string>('mail.frontendResetUrl') ??
        'http://localhost:3000/reset-password';
      return `${base}?token=${token}`;
    }

    return getAuth(this.app!).generatePasswordResetLink(email.toLowerCase());
  }

  async resetPasswordWithToken(
    token: string,
    newPassword: string,
  ): Promise<void> {
    if (this.mode === 'mock') {
      const email = await this.redis.get(`mock:reset:${token}`);
      if (!email) {
        throw new BadRequestException('Invalid or expired reset token');
      }
      const user = await this.redis.getJson<MockUserRecord>(
        `mock:user:email:${email}`,
      );
      if (!user) {
        throw new BadRequestException('Invalid or expired reset token');
      }
      user.passwordHash = this.hashPassword(newPassword);
      await this.redis.setJson(`mock:user:email:${email}`, user);
      await this.redis.setJson(`mock:user:uid:${user.uid}`, user);
      await this.redis.del(`mock:reset:${token}`);
      return;
    }

    throw new BadRequestException(
      'Password reset with token is handled by Firebase client SDK in firebase mode. Use the link from generatePasswordResetLink.',
    );
  }

  async revokeRefreshTokens(uid: string): Promise<void> {
    if (this.mode === 'mock') {
      await this.redis.del(`mock:session:${uid}`);
      return;
    }
    await getAuth(this.app!).revokeRefreshTokens(uid);
  }

  isReady(): boolean {
    return this.mode === 'firebase' || this.mockReady;
  }

  private initFirebaseAdmin(): void {
    if (getApps().length > 0) {
      this.app = getApps()[0]!;
      return;
    }

    const projectId = this.config.get<string>('firebase.projectId');
    const clientEmail = this.config.get<string>('firebase.clientEmail');
    const privateKey = this.config.get<string>('firebase.privateKey');
    const serviceAccountPath = this.config.get<string>(
      'firebase.serviceAccountPath',
    );

    try {
      if (serviceAccountPath) {
        const serviceAccount = JSON.parse(
          readFileSync(serviceAccountPath, 'utf8'),
        ) as {
          projectId?: string;
          project_id?: string;
          clientEmail?: string;
          client_email?: string;
          privateKey?: string;
          private_key?: string;
        };
        this.app = initializeApp({
          credential: cert({
            projectId: serviceAccount.projectId ?? serviceAccount.project_id,
            clientEmail:
              serviceAccount.clientEmail ?? serviceAccount.client_email,
            privateKey: serviceAccount.privateKey ?? serviceAccount.private_key,
          }),
        });
      } else if (projectId && clientEmail && privateKey) {
        this.app = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      } else {
        this.logger.error(
          'FIREBASE_AUTH_MODE=firebase but credentials are missing. Falling back to mock.',
        );
        this.mode = 'mock';
        this.mockReady = true;
        return;
      }
      this.logger.log('Firebase Admin initialized');
    } catch (error) {
      this.logger.error(
        `Firebase Admin init failed: ${(error as Error).message}. Falling back to mock.`,
      );
      this.mode = 'mock';
      this.mockReady = true;
    }
  }

  private async mockCreateUser(
    input: FirebaseCreateUserInput,
  ): Promise<FirebaseCreatedUser> {
    const email = input.email.toLowerCase();
    const existing = await this.redis.get(`mock:user:email:${email}`);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const uid = `mock_${randomUUID().replace(/-/g, '')}`;
    const record: MockUserRecord = {
      uid,
      email,
      passwordHash: this.hashPassword(input.password),
      displayName: input.displayName,
    };

    await this.redis.setJson(`mock:user:email:${email}`, record);
    await this.redis.setJson(`mock:user:uid:${uid}`, record);
    return { uid, email };
  }

  private async mockSignIn(
    email: string,
    password: string,
  ): Promise<FirebaseAuthTokens> {
    const record = await this.redis.getJson<MockUserRecord>(
      `mock:user:email:${email.toLowerCase()}`,
    );
    if (!record || !this.passwordsMatch(password, record.passwordHash)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const expiresIn =
      this.config.get<number>('redis.sessionTtlSeconds') ?? 3600;
    const idToken = this.mockIssueToken(record.uid, record.email, expiresIn);

    return {
      idToken,
      refreshToken: `mock_refresh_${record.uid}`,
      expiresIn,
      localId: record.uid,
      email: record.email,
    };
  }

  private async mockVerifyIdToken(
    idToken: string,
  ): Promise<VerifiedFirebaseToken> {
    if (!idToken.startsWith('mock.')) {
      throw new UnauthorizedException(
        'Invalid or expired authentication token',
      );
    }

    try {
      const [, payloadB64] = idToken.split('.');
      const payload = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString('utf8'),
      ) as { uid: string; email: string; exp: number };

      if (!payload.exp || payload.exp * 1000 < Date.now()) {
        throw new UnauthorizedException(
          'Invalid or expired authentication token',
        );
      }

      const user = await this.redis.getJson<MockUserRecord>(
        `mock:user:uid:${payload.uid}`,
      );
      if (!user) {
        throw new UnauthorizedException(
          'Invalid or expired authentication token',
        );
      }

      return { uid: payload.uid, email: payload.email };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException(
        'Invalid or expired authentication token',
      );
    }
  }

  private mockIssueToken(uid: string, email: string, expiresIn: number): string {
    const header = Buffer.from(
      JSON.stringify({ alg: 'none', typ: 'JWT' }),
    ).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        uid,
        email,
        exp: Math.floor(Date.now() / 1000) + expiresIn,
      }),
    ).toString('base64url');
    return `mock.${payload}.${header}`;
  }

  private hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }

  private passwordsMatch(password: string, hash: string): boolean {
    const left = Buffer.from(this.hashPassword(password));
    const right = Buffer.from(hash);
    if (left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  }
}
