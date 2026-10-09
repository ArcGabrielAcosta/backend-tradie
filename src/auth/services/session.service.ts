import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuthenticatedUser,
  SessionCachePayload,
} from '../../common/interfaces/authenticated-request.interface';
import { RedisService } from '../../redis/redis.service';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class SessionService {
  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  private sessionKey(firebaseUid: string): string {
    return `session:firebase:${firebaseUid}`;
  }

  private attemptsKey(email: string): string {
    return `login:attempts:${email.toLowerCase()}`;
  }

  private lockKey(email: string): string {
    return `login:lock:${email.toLowerCase()}`;
  }

  async cacheUserSession(user: User, ttlSeconds?: number): Promise<void> {
    if (!user.firebaseUid) return;
    const ttl =
      ttlSeconds ??
      this.config.get<number>('redis.sessionTtlSeconds') ??
      3600;
    const payload: SessionCachePayload = {
      userId: String(user.id),
      firebaseUid: user.firebaseUid,
      email: user.email,
      role: user.role,
      status: user.status,
      fullName: user.fullName,
    };
    await this.redis.setJson(this.sessionKey(user.firebaseUid), payload, ttl);
  }

  async getCachedSession(
    firebaseUid: string,
  ): Promise<AuthenticatedUser | null> {
    const payload = await this.redis.getJson<SessionCachePayload>(
      this.sessionKey(firebaseUid),
    );
    if (!payload) return null;
    return {
      id: payload.userId,
      firebaseUid: payload.firebaseUid,
      email: payload.email,
      role: payload.role,
      status: payload.status,
      fullName: payload.fullName,
    };
  }

  async invalidateSession(firebaseUid: string): Promise<void> {
    await this.redis.del(this.sessionKey(firebaseUid));
  }

  async isLoginLocked(email: string): Promise<boolean> {
    const ttl = await this.redis.ttl(this.lockKey(email));
    return ttl > 0;
  }

  async registerFailedLogin(email: string): Promise<{
    attempts: number;
    locked: boolean;
    lockMinutes: number;
  }> {
    const maxAttempts =
      this.config.get<number>('security.loginMaxAttempts') ?? 5;
    const lockMinutes =
      this.config.get<number>('security.loginLockMinutes') ?? 15;
    const attempts = await this.redis.incr(this.attemptsKey(email));
    if (attempts === 1) {
      await this.redis.expire(this.attemptsKey(email), lockMinutes * 60);
    }

    if (attempts >= maxAttempts) {
      await this.redis.set(this.lockKey(email), '1', lockMinutes * 60);
      await this.redis.del(this.attemptsKey(email));
      return { attempts, locked: true, lockMinutes };
    }

    return { attempts, locked: false, lockMinutes };
  }

  async clearLoginAttempts(email: string): Promise<void> {
    await this.redis.del(this.attemptsKey(email), this.lockKey(email));
  }
}
