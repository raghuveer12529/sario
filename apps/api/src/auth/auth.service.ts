import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  Logger,
  // OTP_DISABLED: InternalServerErrorException,
  // OTP_DISABLED: HttpException,
  // OTP_DISABLED: HttpStatus,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
// OTP_DISABLED
// import { OtpPurpose } from "@sario/db";
// OTP_DISABLED
// import { OTP_TTL_SECONDS, OTP_MAX_ATTEMPTS_PER_HOUR, REFRESH_TOKEN_TTL_DAYS } from "@sario/shared";
import { VerificationTokenType } from "@sario/db";
import { REFRESH_TOKEN_TTL_DAYS } from "@sario/shared";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";
import { NotificationService } from "../notification/notification.service.js";
// OTP_DISABLED
// import { Msg91Service } from "../msg91/msg91.service.js";
import {
  // OTP_DISABLED
  // generateOtp,
  // hashOtp,
  // verifyOtp,
  generateRefreshToken,
  hashRefreshToken,
} from "../common/crypto.util.js";
import type { AuthResponse, AuthTokens, JwtPayload } from "./auth.types.js";

// OTP_DISABLED
// const OTP_MAX_VERIFY_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // OTP_DISABLED: private readonly msg91: Msg91Service, removed from constructor
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationService,
  ) {}

  /** Reset/verification links point at the web app. */
  private webUrl(): string {
    return this.config.get<string>("WEB_APP_URL") ?? "http://localhost:3000";
  }

  private readonly RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
  private readonly VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  // OTP_DISABLED — remove this block comment to re-enable OTP flow
  /*
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

    const tokens = await this.issueTokens(user.id, user.email ?? user.phone ?? "", "CUSTOMER");
    return { ...tokens, user };
  }
  */

  async refresh(rawRefreshToken: string): Promise<AuthTokens> {
    const hashed = hashRefreshToken(rawRefreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { hashedToken: hashed },
      include: {
        user: { select: { id: true, email: true, phone: true, deletedAt: true } },
      },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid or expired refresh token.");
    }

    if (stored.user.deletedAt) {
      throw new UnauthorizedException("Account not found.");
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const vendor = await this.prisma.vendor.findUnique({ where: { userId: stored.user.id } });
    const role: "CUSTOMER" | "VENDOR" = vendor ? "VENDOR" : "CUSTOMER";

    return this.issueTokens(stored.user.id, stored.user.email ?? stored.user.phone ?? "", role);
  }

  async logout(userId: string, rawRefreshToken: string): Promise<void> {
    const hashed = hashRefreshToken(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { userId, hashedToken: hashed, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { id: true, phone: true, name: true, avatarUrl: true, isVerified: true },
    });
    if (!user) throw new UnauthorizedException("User not found.");
    return user;
  }

  async updateMe(
    userId: string,
    data: { name?: string; email?: string; avatarUrl?: string },
  ) {
    if (data.email) {
      const clash = await this.prisma.user.findUnique({
        where: { email: data.email },
        select: { id: true },
      });
      if (clash && clash.id !== userId) {
        throw new ConflictException("That email is already in use.");
      }
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.email ? { email: data.email } : {}),
        ...(data.avatarUrl ? { avatarUrl: data.avatarUrl } : {}),
      },
      select: { id: true, phone: true, name: true, email: true, avatarUrl: true, isVerified: true },
    });
    await this.redis.del(`jwt:user:${userId}`).catch(() => {});
    return user;
  }

  async deleteMe(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });
    await this.redis.del(`jwt:user:${userId}`).catch(() => {});
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, phone: true, name: true, isVerified: true, passwordHash: true },
    });

    // Do not reveal whether the email exists — same error either way. Never auto-register.
    if (!user || !user.passwordHash) throw new UnauthorizedException("Invalid credentials.");
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException("Invalid credentials.");

    const tokens = await this.issueTokens(user.id, email, "CUSTOMER");
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return { ...tokens, user: { ...safeUser, email } };
  }

  async register(email: string, password: string): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });
    if (existing?.passwordHash) {
      throw new ConflictException("An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // A phone-only account (e.g. legacy/dev) may already hold this email — attach the
    // password. That account already proved ownership via phone OTP, so keep it verified.
    // A brand-new email account starts unverified until it confirms via the emailed link.
    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: { passwordHash, isVerified: true },
          select: { id: true, email: true, phone: true, name: true, isVerified: true },
        })
      : await this.prisma.user.create({
          data: { email, passwordHash, isVerified: false },
          select: { id: true, email: true, phone: true, name: true, isVerified: true },
        });

    if (!user.isVerified) {
      await this.sendEmailVerification(user.id, email);
    }

    const tokens = await this.issueTokens(user.id, email, "CUSTOMER");
    return { ...tokens, user: { ...user, email } };
  }

  // ─── Email verification ──────────────────────────────────────────────────────

  /** Issue a fresh verification token (invalidating older unused ones) and email the link. */
  async sendEmailVerification(userId: string, email: string): Promise<void> {
    const rawToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(rawToken);

    await this.prisma.$transaction([
      this.prisma.verificationToken.updateMany({
        where: { userId, type: VerificationTokenType.EMAIL_VERIFICATION, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.verificationToken.create({
        data: {
          userId,
          tokenHash,
          type: VerificationTokenType.EMAIL_VERIFICATION,
          expiresAt: new Date(Date.now() + this.VERIFY_TTL_MS),
        },
      }),
    ]);

    const link = `${this.webUrl()}/auth/verify-email?token=${rawToken}`;
    await this.notifications.sendTransactionalEmail(
      email,
      "Verify your Sario email address",
      `Welcome to Sario! Please confirm your email by opening this link within 24 hours:\n\n${link}\n\nIf you didn't create an account, you can ignore this email.`,
    );
  }

  async verifyEmail(rawToken: string): Promise<{ verified: true }> {
    const record = await this.consumeToken(rawToken, VerificationTokenType.EMAIL_VERIFICATION);
    await this.prisma.user.update({ where: { id: record.userId }, data: { isVerified: true } });
    return { verified: true };
  }

  /** Resend verification for the currently authenticated user. No-op if already verified. */
  async resendEmailVerification(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, isVerified: true },
    });
    if (!user?.email || user.isVerified) return;
    await this.sendEmailVerification(userId, user.email);
  }

  // ─── Password reset ────────────────────────────────────────────────────────

  /** Always resolves without revealing whether the email exists (anti-enumeration). */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });
    // Only accounts that actually have a password can reset one.
    if (!user || !user.passwordHash) return;

    const rawToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(rawToken);

    await this.prisma.$transaction([
      this.prisma.verificationToken.updateMany({
        where: { userId: user.id, type: VerificationTokenType.PASSWORD_RESET, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.verificationToken.create({
        data: {
          userId: user.id,
          tokenHash,
          type: VerificationTokenType.PASSWORD_RESET,
          expiresAt: new Date(Date.now() + this.RESET_TTL_MS),
        },
      }),
    ]);

    const link = `${this.webUrl()}/auth/reset-password?token=${rawToken}`;
    await this.notifications.sendTransactionalEmail(
      email,
      "Reset your Sario password",
      `We received a request to reset your password. Open this link within 1 hour to choose a new one:\n\n${link}\n\nIf you didn't request this, you can safely ignore this email — your password won't change.`,
    );
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const record = await this.consumeToken(rawToken, VerificationTokenType.PASSWORD_RESET);
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      // Revoke every existing session — a reset implies the old credentials are compromised.
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    await this.redis.del(`jwt:user:${record.userId}`).catch(() => undefined);
  }

  /** Validate a raw token, mark it used, and return the record. Throws on invalid/expired/used. */
  private async consumeToken(rawToken: string, type: VerificationTokenType) {
    const tokenHash = hashRefreshToken(rawToken);
    const record = await this.prisma.verificationToken.findUnique({ where: { tokenHash } });
    if (!record || record.type !== type || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException("This link is invalid or has expired. Please request a new one.");
    }
    await this.prisma.verificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    return record;
  }

  async vendorLogin(
    email: string,
    password: string,
  ): Promise<AuthResponse & { vendor: { id: string; businessName: string; status: string } }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, phone: true, name: true, isVerified: true, passwordHash: true },
    });

    if (!user || !user.passwordHash) throw new UnauthorizedException("Invalid credentials.");
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException("Invalid credentials.");

    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: user.id },
      select: { id: true, businessName: true, status: true },
    });
    if (!vendor) throw new ForbiddenException("No vendor account found.");

    const tokens = await this.issueTokens(user.id, email, "VENDOR");
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return { ...tokens, user: { ...safeUser, email }, vendor };
  }

  async adminLogin(email: string, password: string): Promise<{ accessToken: string; admin: { id: string; name: string; email: string; role: string } }> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { email, deletedAt: null },
    });
    if (!admin) throw new UnauthorizedException("Invalid credentials.");

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) throw new UnauthorizedException("Invalid credentials.");

    await this.prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });

    const payload: JwtPayload = { sub: admin.id, email: admin.email, role: admin.role as "SUPER_ADMIN" | "SUPPORT" };
    const accessToken = this.jwt.sign(payload);
    return { accessToken, admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } };
  }

  async deleteAdmin(adminId: string): Promise<void> {
    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: { deletedAt: new Date() },
    });
    await this.redis.del(`jwt:admin:${adminId}`).catch(() => {});
  }

  async devLogin(phone: string): Promise<AuthResponse> {
    if (this.config.get("NODE_ENV") === "production") {
      throw new ForbiddenException("Dev login is not available in production.");
    }
    const user = await this.prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone, isVerified: true },
      select: { id: true, phone: true, email: true, name: true, isVerified: true },
    });
    const tokens = await this.issueTokens(user.id, user.email ?? user.phone ?? "", "CUSTOMER");
    return { ...tokens, user: { ...user, email: user.email ?? "" } };
  }

  private async issueTokens(userId: string, email: string, role: "CUSTOMER" | "VENDOR"): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email, role };
    const accessToken = this.jwt.sign(payload);

    const raw = generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

    await this.prisma.refreshToken.create({
      data: { userId, hashedToken: hashRefreshToken(raw), expiresAt },
    });

    return { accessToken, refreshToken: raw };
  }

  // OTP_DISABLED — remove this block comment to re-enable OTP flow
  /*
  private async enforceOtpRateLimit(phone: string): Promise<void> {
    const key = `otp:rate:${phone}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, 3600);
    }
    if (count > OTP_MAX_ATTEMPTS_PER_HOUR) {
      throw new HttpException(
        `Too many OTP requests. Try again in an hour.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
  */
}
