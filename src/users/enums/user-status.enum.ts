/**
 * Values persist in PostgreSQL enum `user_status`.
 */
export enum UserStatus {
  ACTIVO = 'activo',
  SUSPENDIDO = 'suspendido',
  BLOQUEADO = 'bloqueado',
}

export function toApiStatus(status: UserStatus): string {
  switch (status) {
    case UserStatus.ACTIVO:
      return 'active';
    case UserStatus.SUSPENDIDO:
      return 'suspended';
    case UserStatus.BLOQUEADO:
      return 'blocked';
  }
}
