export interface JwtPayload {
  sub: string;
  phone: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: {
    id: string;
    phone: string;
    name: string | null;
    isVerified: boolean;
  };
}
