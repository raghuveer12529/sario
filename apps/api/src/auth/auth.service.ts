import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
  TooManyRequestsException,
  InternalServerErrorException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { OtpPurpose } from "@sario/db";
import { OTP_TTL_SECONDS, OTP_MAX_ATTEMPTS_PER_HOUR, REFRESH_TOKEN_TTL_DAYS } from "@sario/shared";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";
import { Msg91Service } from "../msg91/msg91.service.js";
import {
  generateOtp,
  hashOtp,
  verifyOtp,
  generateRefreshToken,
  hashRefreshToken,
} from "../common/crypto.util.js";
import type { AuthResponse, AuthTokens, JwtPayload } from "./auth.types.js";

const OTP_MAX_VERIFY_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly msg91: Msg91Service,
  ) {}

  async requestOtp(phone: string, purpose: OtpPurpose): Promise<{ expiresIn: number }> {
    await this.enforceOtpRateLimit(phone);

    const otp = generateOtp();
    const hashedOtp = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

    await this.prisma.otpRecord.create({
      data: { phone, hashedOtp, purpose, expiresAt },
    });

    const result = await this.msg91.sendOtp(phone, otp);
    if (!result.success) {
      this.logger.error(`OTP delivery failed for ${phone}`);
      throw new InternalServerErrorException("Failed to send OTP. Please try again.");
    }

    return { expiresIn: OTP_TTL_SECONDS };
  }

  async verifyOtp(phone: string, otp: string, purpose: OtpPurpose): Promise<AuthResponse> {
    const record = await this.prisma.otpRecord.findFirst({
      where: {
        phone,
        purpose,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      throw new BadRequestException("OTP not found or expired. Request a new one.");
    }

    if (record.attempts >= OTP_MAX_VERIFY_ATTEMPTS) {
      throw new BadRequestException("Too many incorrect attempts. Request a new OTP.");
    }

    await this.prisma.otpRecord.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });

    const isValid = await verifyOtp(otp, record.hashedOtp);
    if (!isValid) {
      const remaining = OTP_MAX_VERIFY_ATTEMPTS - (record.attempts + 1);
      throw new BadRequestException(
        `Incorrect OTP. ${remaining > 0 ? `${remaining} attempts remaining.` : "No attempts remaining."}`,
      );
    }

    await this.prisma.otpRecord.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    const user = await this.prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone, isVerified: true },
      select: { id: true, phone: true, name: true, isVerified: true },
    });

    const tokens = await this.issueTokens(user.id, user.phone);
    return { ...tokens, user };
  }

  async refresh(rawRefreshToken: string): Promise<AuthTokens> {
    const hashed = hashRefreshToken(rawRefreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { hashedToken: hashed },
      include: { user: { select: { id: true, phone: true, deletedAt: true } } },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid or expired refresh token.");
    }

    if (stored.user.deletedAt) {
      throw new UnauthorizedException("Account not found.");
    }

    // Rotate: revoke old, issue new
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(stored.user.id, stored.user.phone);
  }

  async logout(userId: string, rawRefreshToken: string): Promise<void> {
    const hashed = hashRefreshToken(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { userId, hashedToken: hashed, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(userId: string, phone: string): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, phone };
    const accessToken = this.jwt.sign(payload);

    const raw = generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

    await this.prisma.refreshToken.create({
      data: { userId, hashedToken: hashRefreshToken(raw), expiresAt },
    });

    return { accessToken, refreshToken: raw };
  }

  private async enforceOtpRateLimit(phone: string): Promise<void> {
    const key = `otp:rate:${phone}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, 3600);
    }
    if (count > OTP_MAX_ATTEMPTS_PER_HOUR) {
      throw new TooManyRequestsException(
        `Too many OTP requests. Try again in an hour.`,
      );
    }
  }
}
