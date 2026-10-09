import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';

@Entity({ name: 'usuario' })
export class User {
  @PrimaryGeneratedColumn({ name: 'id_usuario', type: 'bigint' })
  id!: string;

  @Index({ unique: true })
  @Column({
    name: 'firebase_uid',
    type: 'varchar',
    length: 128,
    unique: true,
    nullable: true,
  })
  firebaseUid!: string | null;

  @Index({ unique: true })
  @Column({ name: 'email', type: 'varchar', length: 150, unique: true })
  email!: string;

  @Column({
    name: 'nombre_completo',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  fullName!: string | null;

  @Column({ name: 'telefono', type: 'varchar', length: 30, nullable: true })
  phone!: string | null;

  /**
   * Nullable when Firebase Auth owns the credential.
   * Kept for optional local/dev fallbacks; never returned in API responses.
   */
  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  passwordHash!: string | null;

  @Column({
    name: 'rol',
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role',
  })
  role!: UserRole;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: UserStatus,
    enumName: 'user_status',
    default: UserStatus.ACTIVO,
  })
  status!: UserStatus;

  @Column({
    name: 'intentos_login_fallidos',
    type: 'int',
    default: 0,
  })
  failedLoginAttempts!: number;

  @Column({
    name: 'bloqueado_hasta',
    type: 'timestamptz',
    nullable: true,
  })
  lockedUntil!: Date | null;

  @CreateDateColumn({ name: 'fecha_alta', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamptz' })
  updatedAt!: Date;
}
