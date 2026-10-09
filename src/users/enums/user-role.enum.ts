/**
 * Values persist in PostgreSQL enum `user_role`.
 * API aliases: client → cliente, professional → profesional.
 */
export enum UserRole {
  CLIENTE = 'cliente',
  PROFESIONAL = 'profesional',
  ADMIN = 'admin',
}

export enum RegisterableUserRole {
  CLIENTE = UserRole.CLIENTE,
  PROFESIONAL = UserRole.PROFESIONAL,
}

const API_ROLE_ALIASES: Record<string, UserRole> = {
  client: UserRole.CLIENTE,
  cliente: UserRole.CLIENTE,
  professional: UserRole.PROFESIONAL,
  profesional: UserRole.PROFESIONAL,
  admin: UserRole.ADMIN,
};

export function parseUserRole(value: string): UserRole | undefined {
  return API_ROLE_ALIASES[value.toLowerCase()];
}

export function toApiRole(role: UserRole): string {
  switch (role) {
    case UserRole.CLIENTE:
      return 'client';
    case UserRole.PROFESIONAL:
      return 'professional';
    case UserRole.ADMIN:
      return 'admin';
  }
}
