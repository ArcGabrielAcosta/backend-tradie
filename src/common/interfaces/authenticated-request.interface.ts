import { UserRole } from '../../users/enums/user-role.enum';
import { UserStatus } from '../../users/enums/user-status.enum';

export interface AuthenticatedUser {
  id: string;
  firebaseUid: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  fullName: string | null;
}

export interface SessionCachePayload {
  userId: string;
  firebaseUid: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  fullName: string | null;
}
