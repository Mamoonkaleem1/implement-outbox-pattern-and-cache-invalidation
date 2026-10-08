export class TokenPairDto {
  accessToken: string;
  refreshToken: string;
}

export class AuthResponseDataDto {
  user: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string;
    isEmailVerified: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  tokens: TokenPairDto;
}

export class AuthResponseDto {
  success: boolean;
  message: string;
  data: AuthResponseDataDto;
}
