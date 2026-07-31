import { Test, type TestingModule } from "@nestjs/testing";
import { BadRequestException, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { VerificationTokenType } from "@sario/db";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { NotificationService } from "../notification/notification.service.js";
// OTP_DISABLED
// import { OtpPurpose } from "@sario/db";
import { AuthService } from "./auth.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";
// OTP_DISABLED
// import { Msg91Service } from "../msg91/msg91.service.js";
import * as cryptoUtil from "../common/crypto.util.js";
import * as bcrypt from "bcrypt";

jest.mock("../common/crypto.util.js");
jest.mock("bcrypt");
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

const mockCrypto = cryptoUtil as jest.Mocked<typeof cryptoUtil>;

const mockPrisma = {
  otpRecord: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  user: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  vendor: {
    findUnique: jest.fn(),
  },
  verificationToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
};

const mockRedis = {
  incr: jest.fn(),
  expire: jest.fn(),
  del: jest.fn(),
};

const mockNotifications = {
  sendTransactionalEmail: jest.fn(),
};

// OTP_DISABLED
// const mockMsg91 = { sendOtp: jest.fn() };

const mockJwt = {
  sign: jest.fn().mockReturnValue("signed-access-token"),
};

const mockConfig = {
  get: jest.fn(),
  getOrThrow: jest.fn(),
};

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        // OTP_DISABLED: { provide: Msg91Service, useValue: mockMsg91 },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: NotificationService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // OTP_DISABLED — remove comment block to re-enable
  /*
  // ─── requestOtp ───────────────────────────────────────────────────────────

  describe("requestOtp", () => {
    const phone = "9876543210";

    it("issues OTP and returns expiresIn on first request", async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);
      mockCrypto.generateOtp.mockReturnValue("123456");
      mockCrypto.hashOtp.mockResolvedValue("hashed-otp");
      mockPrisma.otpRecord.create.mockResolvedValue({});
      mockMsg91.sendOtp.mockResolvedValue({ success: true });

      const result = await service.requestOtp(phone, OtpPurpose.LOGIN);

      expect(result.expiresIn).toBe(300);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const createArg = mockPrisma.otpRecord.create.mock.calls[0]?.[0] as
        | { data: { phone: string; hashedOtp: string } }
        | undefined;
      expect(createArg?.data.phone).toBe(phone);
      expect(createArg?.data.hashedOtp).toBe("hashed-otp");
      expect(mockMsg91.sendOtp).toHaveBeenCalledWith(phone, "123456");
    });

    it("sets TTL on Redis key only on first request", async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);
      mockCrypto.generateOtp.mockReturnValue("111111");
      mockCrypto.hashOtp.mockResolvedValue("h");
      mockPrisma.otpRecord.create.mockResolvedValue({});
      mockMsg91.sendOtp.mockResolvedValue({ success: true });

      await service.requestOtp(phone, OtpPurpose.LOGIN);
      expect(mockRedis.expire).toHaveBeenCalledWith(`otp:rate:${phone}`, 3600);
    });

    it("does NOT set TTL on subsequent requests in the same window", async () => {
      mockRedis.incr.mockResolvedValue(2);
      mockCrypto.generateOtp.mockReturnValue("111111");
      mockCrypto.hashOtp.mockResolvedValue("h");
      mockPrisma.otpRecord.create.mockResolvedValue({});
      mockMsg91.sendOtp.mockResolvedValue({ success: true });

      await service.requestOtp(phone, OtpPurpose.LOGIN);
      expect(mockRedis.expire).not.toHaveBeenCalled();
    });

    it("throws 429 after 3 OTPs per hour", async () => {
      mockRedis.incr.mockResolvedValue(4);

      await expect(service.requestOtp(phone, OtpPurpose.LOGIN)).rejects.toThrow(
        HttpException,
      );
      expect(mockPrisma.otpRecord.create).not.toHaveBeenCalled();
    });

    it("throws InternalServerErrorException when MSG91 fails", async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);
      mockCrypto.generateOtp.mockReturnValue("123456");
      mockCrypto.hashOtp.mockResolvedValue("h");
      mockPrisma.otpRecord.create.mockResolvedValue({});
      mockMsg91.sendOtp.mockResolvedValue({ success: false });

      await expect(service.requestOtp(phone, OtpPurpose.LOGIN)).rejects.toThrow(
        "Failed to send OTP",
      );
    });
  });

  // ─── verifyOtp ────────────────────────────────────────────────────────────

  describe("verifyOtp", () => {
    const phone = "9876543210";
    const otp = "654321";
    const fakeRecord = {
      id: "rec_1",
      hashedOtp: "hashed",
      attempts: 0,
    };
    const fakeUser = { id: "usr_1", phone, name: null, isVerified: true };

    beforeEach(() => {
      mockCrypto.generateRefreshToken.mockReturnValue("raw-refresh");
      mockCrypto.hashRefreshToken.mockReturnValue("hashed-refresh");
      mockPrisma.refreshToken.create.mockResolvedValue({});
      mockPrisma.user.upsert.mockResolvedValue(fakeUser);
    });

    it("returns tokens and user on valid OTP", async () => {
      mockPrisma.otpRecord.findFirst.mockResolvedValue(fakeRecord);
      mockPrisma.otpRecord.update.mockResolvedValue({});
      mockCrypto.verifyOtp.mockResolvedValue(true);

      const result = await service.verifyOtp(phone, otp, OtpPurpose.LOGIN);

      expect(result.accessToken).toBe("signed-access-token");
      expect(result.refreshToken).toBe("raw-refresh");
      expect(result.user.phone).toBe(phone);
    });

    it("throws BadRequestException when no active OTP exists", async () => {
      mockPrisma.otpRecord.findFirst.mockResolvedValue(null);

      await expect(service.verifyOtp(phone, otp, OtpPurpose.LOGIN)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("throws BadRequestException when max attempts exceeded", async () => {
      mockPrisma.otpRecord.findFirst.mockResolvedValue({ ...fakeRecord, attempts: 5 });

      await expect(service.verifyOtp(phone, otp, OtpPurpose.LOGIN)).rejects.toThrow(
        "Too many incorrect attempts",
      );
    });

    it("throws BadRequestException on wrong OTP and increments attempts", async () => {
      mockPrisma.otpRecord.findFirst.mockResolvedValue(fakeRecord);
      mockPrisma.otpRecord.update.mockResolvedValue({});
      mockCrypto.verifyOtp.mockResolvedValue(false);

      await expect(service.verifyOtp(phone, otp, OtpPurpose.LOGIN)).rejects.toThrow(
        "Incorrect OTP",
      );
      expect(mockPrisma.otpRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { attempts: { increment: 1 } } }),
      );
    });

    it("marks OTP as used after successful verification", async () => {
      mockPrisma.otpRecord.findFirst.mockResolvedValue(fakeRecord);
      mockPrisma.otpRecord.update.mockResolvedValue({});
      mockCrypto.verifyOtp.mockResolvedValue(true);

      await service.verifyOtp(phone, otp, OtpPurpose.LOGIN);

      expect(mockPrisma.otpRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { usedAt: expect.any(Date) as Date } }),
      );
    });
  });
  */

  // ─── refresh ──────────────────────────────────────────────────────────────

  describe("refresh", () => {
    const rawToken = "raw-token";
    const fakeStored = {
      id: "rt_1",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 86400000),
      user: { id: "usr_1", email: "buyer@example.com", phone: "9876543210", deletedAt: null },
    };

    beforeEach(() => {
      mockCrypto.hashRefreshToken.mockReturnValue("hashed-token");
      mockCrypto.generateRefreshToken.mockReturnValue("new-raw-token");
      mockPrisma.refreshToken.create.mockResolvedValue({});
      mockPrisma.refreshToken.update.mockResolvedValue({});
      mockPrisma.vendor.findUnique.mockResolvedValue(null);
    });

    it("rotates and returns new tokens on valid refresh token", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(fakeStored);

      const result = await service.refresh(rawToken);

      expect(result.accessToken).toBe("signed-access-token");
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { revokedAt: expect.any(Date) as Date } }),
      );
    });

    it("throws UnauthorizedException for unknown token", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh(rawToken)).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException for already-revoked token", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        ...fakeStored,
        revokedAt: new Date(),
      });

      await expect(service.refresh(rawToken)).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException for expired token", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        ...fakeStored,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.refresh(rawToken)).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException when user is deleted", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        ...fakeStored,
        user: { ...fakeStored.user, deletedAt: new Date() },
      });

      await expect(service.refresh(rawToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── logout ───────────────────────────────────────────────────────────────

  describe("logout", () => {
    it("revokes the matching refresh token", async () => {
      mockCrypto.hashRefreshToken.mockReturnValue("hashed");
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.logout("usr_1", "raw-token");

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: "usr_1", hashedToken: "hashed", revokedAt: null },
        data: { revokedAt: expect.any(Date) as Date },
      });
    });
  });

  // ─── login ────────────────────────────────────────────────────────────────

  describe("login", () => {
    const email = "buyer@example.com";
    const password = "secret123";
    const fakeUser = {
      id: "usr_1",
      email,
      phone: null,
      name: null,
      isVerified: true,
      passwordHash: "hashed-pw",
    };

    beforeEach(() => {
      mockCrypto.generateRefreshToken.mockReturnValue("raw-refresh");
      mockCrypto.hashRefreshToken.mockReturnValue("hashed-refresh");
      mockPrisma.refreshToken.create.mockResolvedValue({});
    });

    it("rejects an unknown email instead of auto-registering", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(email, password)).rejects.toThrow(UnauthorizedException);

      // login must never create a user — registration is a separate flow.
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(mockPrisma.user.upsert).not.toHaveBeenCalled();
    });

    it("returns tokens when credentials are correct", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(fakeUser);
      mockBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.login(email, password);

      expect(result.accessToken).toBe("signed-access-token");
    });

    it("throws UnauthorizedException when password is wrong", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(fakeUser);
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.login(email, password)).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException when user has no passwordHash", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...fakeUser, passwordHash: null });
      await expect(service.login(email, password)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── vendorLogin ──────────────────────────────────────────────────────────

  describe("vendorLogin", () => {
    const email = "seller@example.com";
    const password = "secret123";
    const fakeUser = {
      id: "usr_2",
      email,
      phone: null,
      name: null,
      isVerified: true,
      passwordHash: "hashed-pw",
    };
    const fakeVendor = { id: "ven_1", businessName: "Silk House", status: "APPROVED" };

    beforeEach(() => {
      mockCrypto.generateRefreshToken.mockReturnValue("raw-refresh");
      mockCrypto.hashRefreshToken.mockReturnValue("hashed-refresh");
      mockPrisma.refreshToken.create.mockResolvedValue({});
    });

    it("returns tokens and vendor on valid credentials", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(fakeUser);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockPrisma.vendor.findUnique.mockResolvedValue(fakeVendor);

      const result = await service.vendorLogin(email, password);

      expect(result.accessToken).toBe("signed-access-token");
      expect(result.vendor.businessName).toBe("Silk House");
    });

    it("throws UnauthorizedException when user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.vendorLogin(email, password)).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException when password wrong", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(fakeUser);
      mockBcrypt.compare.mockResolvedValue(false as never);
      await expect(service.vendorLogin(email, password)).rejects.toThrow(UnauthorizedException);
    });

    it("throws ForbiddenException when user has no vendor record", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(fakeUser);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockPrisma.vendor.findUnique.mockResolvedValue(null);
      await expect(service.vendorLogin(email, password)).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── requestPasswordReset ─────────────────────────────────────────────────

  describe("requestPasswordReset", () => {
    beforeEach(() => {
      mockConfig.get.mockReturnValue("http://localhost:3000");
      mockCrypto.generateRefreshToken.mockReturnValue("raw-reset");
      mockCrypto.hashRefreshToken.mockReturnValue("hashed-reset");
      mockPrisma.verificationToken.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.verificationToken.create.mockResolvedValue({});
    });

    it("creates a token and emails a link for an account with a password", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "usr_1", passwordHash: "h" });

      await service.requestPasswordReset("buyer@example.com");

      expect(mockPrisma.verificationToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tokenHash: "hashed-reset", type: VerificationTokenType.PASSWORD_RESET }),
        }),
      );
      expect(mockNotifications.sendTransactionalEmail).toHaveBeenCalledTimes(1);
    });

    it("is a silent no-op for an unknown email (no enumeration, no email)", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await service.requestPasswordReset("nobody@example.com");

      expect(mockPrisma.verificationToken.create).not.toHaveBeenCalled();
      expect(mockNotifications.sendTransactionalEmail).not.toHaveBeenCalled();
    });

    it("is a no-op for a phone-only account with no password", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "usr_1", passwordHash: null });

      await service.requestPasswordReset("phoneonly@example.com");

      expect(mockPrisma.verificationToken.create).not.toHaveBeenCalled();
      expect(mockNotifications.sendTransactionalEmail).not.toHaveBeenCalled();
    });
  });

  // ─── resetPassword ────────────────────────────────────────────────────────

  describe("resetPassword", () => {
    const validRecord = {
      id: "vt_1",
      userId: "usr_1",
      type: VerificationTokenType.PASSWORD_RESET,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60000),
    };

    beforeEach(() => {
      mockCrypto.hashRefreshToken.mockReturnValue("hashed-reset");
      mockBcrypt.hash.mockResolvedValue("new-hash" as never);
      mockPrisma.verificationToken.update.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });
      mockRedis.del.mockResolvedValue(1);
    });

    it("updates the password and revokes all sessions on a valid token", async () => {
      mockPrisma.verificationToken.findUnique.mockResolvedValue(validRecord);

      await service.resetPassword("raw-reset", "NewPass9x");

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "usr_1" }, data: { passwordHash: "new-hash" } }),
      );
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "usr_1", revokedAt: null } }),
      );
      expect(mockPrisma.verificationToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { usedAt: expect.any(Date) as Date } }),
      );
    });

    it("rejects an unknown token", async () => {
      mockPrisma.verificationToken.findUnique.mockResolvedValue(null);
      await expect(service.resetPassword("bad", "NewPass9x")).rejects.toThrow(BadRequestException);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("rejects an already-used token", async () => {
      mockPrisma.verificationToken.findUnique.mockResolvedValue({ ...validRecord, usedAt: new Date() });
      await expect(service.resetPassword("raw-reset", "NewPass9x")).rejects.toThrow(BadRequestException);
    });

    it("rejects an expired token", async () => {
      mockPrisma.verificationToken.findUnique.mockResolvedValue({ ...validRecord, expiresAt: new Date(Date.now() - 1000) });
      await expect(service.resetPassword("raw-reset", "NewPass9x")).rejects.toThrow(BadRequestException);
    });

    it("rejects a token of the wrong type (e.g. an email-verification token)", async () => {
      mockPrisma.verificationToken.findUnique.mockResolvedValue({ ...validRecord, type: VerificationTokenType.EMAIL_VERIFICATION });
      await expect(service.resetPassword("raw-reset", "NewPass9x")).rejects.toThrow(BadRequestException);
    });
  });

  // ─── verifyEmail ──────────────────────────────────────────────────────────

  describe("verifyEmail", () => {
    const validRecord = {
      id: "vt_2",
      userId: "usr_1",
      type: VerificationTokenType.EMAIL_VERIFICATION,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60000),
    };

    beforeEach(() => {
      mockCrypto.hashRefreshToken.mockReturnValue("hashed-verify");
      mockPrisma.verificationToken.update.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});
    });

    it("marks the user verified and consumes the token", async () => {
      mockPrisma.verificationToken.findUnique.mockResolvedValue(validRecord);

      const result = await service.verifyEmail("raw-verify");

      expect(result).toEqual({ verified: true });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({ where: { id: "usr_1" }, data: { isVerified: true } });
      expect(mockPrisma.verificationToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { usedAt: expect.any(Date) as Date } }),
      );
    });

    it("rejects an invalid token without verifying the user", async () => {
      mockPrisma.verificationToken.findUnique.mockResolvedValue(null);
      await expect(service.verifyEmail("bad")).rejects.toThrow(BadRequestException);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });
});
