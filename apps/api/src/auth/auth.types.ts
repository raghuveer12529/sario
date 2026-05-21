export type JwtRole = "CUSTOMER" | "VENDOR" | "SUPER_ADMIN" | "SUPPORT";

export interface JwtPayload {
  sub: string;
  email: string;
  role: JwtRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: {
    id: string;
    email: string;
    phone?: string | null;
    name: string | null;
    isVerified: boolean;
  };
}
