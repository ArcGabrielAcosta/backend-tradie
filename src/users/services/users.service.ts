import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';

export interface CreateLocalUserInput {
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  firebaseUid: string;
  status?: UserStatus;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  async findByFirebaseUid(firebaseUid: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { firebaseUid } });
  }

  async requireByFirebaseUid(firebaseUid: string): Promise<User> {
    const user = await this.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async createLocalUser(input: CreateLocalUserInput): Promise<User> {
    const email = input.email.toLowerCase();
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const user = this.usersRepository.create({
      email,
      fullName: input.fullName,
      phone: input.phone ?? null,
      role: input.role,
      firebaseUid: input.firebaseUid,
      passwordHash: null,
      status: input.status ?? UserStatus.ACTIVO,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    return this.usersRepository.save(user);
  }

  async updateFirebaseUid(userId: string, firebaseUid: string): Promise<User> {
    await this.usersRepository.update(
      { id: userId },
      { firebaseUid },
    );
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async setLoginFailure(
    user: User,
    attempts: number,
    lockedUntil: Date | null,
  ): Promise<void> {
    await this.usersRepository.update(
      { id: user.id },
      {
        failedLoginAttempts: attempts,
        lockedUntil,
        status:
          lockedUntil && lockedUntil > new Date()
            ? UserStatus.BLOQUEADO
            : user.status === UserStatus.BLOQUEADO && !lockedUntil
              ? UserStatus.ACTIVO
              : user.status,
      },
    );
  }

  async resetLoginFailures(user: User): Promise<void> {
    await this.usersRepository.update(
      { id: user.id },
      {
        failedLoginAttempts: 0,
        lockedUntil: null,
        status:
          user.status === UserStatus.BLOQUEADO
            ? UserStatus.ACTIVO
            : user.status,
      },
    );
  }

  isLocked(user: User): boolean {
    return Boolean(user.lockedUntil && user.lockedUntil.getTime() > Date.now());
  }
}
