import { Test, type TestingModule } from "@nestjs/testing";
import { BadRequestException, TooManyRequestsException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { OtpPurpose } from "@sario/db";
import { AuthService } from "./auth.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";
import { Msg91Service } from "../msg91/msg91.service.js";
import * as cryptoUtil from "../common/crypto.util.js";

jest.mock("../common/crypto.util.js");

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
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

const mockRedis = {
  incr: jest.fn(),
  expire: jest.fn(),
};

const mockMsg91 = {
  sendOtp: jest.fn(),
};

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
        { provide: Msg91Service, useValue: mockMsg91 },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

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
      expect(mockPrisma.otpRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ phone, hashedOtp: "hashed-otp" }) }),
      );
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

    it("throws TooManyRequestsException after 3 OTPs per hour", async () => {
      mockRedis.incr.mockResolvedValue(4);

      await expect(service.requestOtp(phone, OtpPurpose.LOGIN)).rejects.toThrow(
        TooManyRequestsException,
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

  // ─── refresh ──────────────────────────────────────────────────────────────

  describe("refresh", () => {
    const rawToken = "raw-token";
    const fakeStored = {
      id: "rt_1",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 86400000),
      user: { id: "usr_1", phone: "9876543210", deletedAt: null },
    };

    beforeEach(() => {
      mockCrypto.hashRefreshToken.mockReturnValue("hashed-token");
      mockCrypto.generateRefreshToken.mockReturnValue("new-raw-token");
      mockPrisma.refreshToken.create.mockResolvedValue({});
      mockPrisma.refreshToken.update.mockResolvedValue({});
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
});
