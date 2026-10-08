export interface AuthenticatedUser {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
