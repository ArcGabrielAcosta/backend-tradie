export interface FirebaseCreateUserInput {
  email: string;
  password: string;
  displayName?: string;
}

export interface FirebaseCreatedUser {
  uid: string;
  email: string;
}

export interface FirebaseAuthTokens {
  idToken: string;
  refreshToken: string;
  expiresIn: number;
  localId: string;
  email: string;
}

export interface VerifiedFirebaseToken {
  uid: string;
  email: string;
  emailVerified?: boolean;
}
