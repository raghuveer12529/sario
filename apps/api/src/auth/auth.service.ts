import {
  Injectable,
  // OTP_DISABLED: BadRequestException,
  UnauthorizedException,
  ForbiddenException,
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
import { REFRESH_TOKEN_TTL_DAYS } from "@sario/shared";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";
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
  ) {}

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

  async updateMe(userId: string, data: any) {
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
    let user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, phone: true, name: true, isVerified: true, passwordHash: true },
    });

    if (!user) {
      const hash = await bcrypt.hash(password, 12);
      user = await this.prisma.user.create({
        data: { email, passwordHash: hash, isVerified: true },
        select: { id: true, email: true, phone: true, name: true, isVerified: true, passwordHash: true },
      });
    } else {
      if (!user.passwordHash) throw new UnauthorizedException("Invalid credentials.");
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) throw new UnauthorizedException("Invalid credentials.");
    }

    const tokens = await this.issueTokens(user.id, user.email!, "CUSTOMER");
    const { passwordHash: _pw, ...safeUser } = user;
    return { ...tokens, user: safeUser };
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

    const tokens = await this.issueTokens(user.id, user.email!, "VENDOR");
    const { passwordHash: _pw, ...safeUser } = user;
    return { ...tokens, user: safeUser, vendor };
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
      select: { id: true, phone: true, name: true, isVerified: true },
    });
    const tokens = await this.issueTokens(user.id, user.email ?? user.phone ?? "", "CUSTOMER");
    return { ...tokens, user };
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
