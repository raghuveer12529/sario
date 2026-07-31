# Email+Password Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace OTP login with email+password across all portals, fix JWT role differentiation, and remove the duplicate vendor portal.

**Architecture:** Three portals (web/vendor/admin) each have a dedicated login endpoint on the NestJS API. The JWT payload carries an explicit `role` field (`CUSTOMER | VENDOR | SUPER_ADMIN | SUPPORT`) stamped at token issuance time. OTP code is commented out (not deleted) with `// OTP_DISABLED` markers.

**Tech Stack:** NestJS 10 + Fastify, Prisma 5 + PostgreSQL, bcrypt, Next.js 14 App Router, TypeScript strict.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `packages/db/prisma/schema.prisma` | Modify | Make `phone` nullable, add `passwordHash` to User |
| `apps/api/src/auth/auth.types.ts` | Modify | New `JwtPayload` with role union |
| `apps/api/src/auth/dto/login.dto.ts` | Create | `LoginDto` shared by customer + vendor login |
| `apps/api/src/auth/auth.service.ts` | Modify | Add `login()`, `vendorLogin()`, update `adminLogin()`, `issueTokens()`, `refresh()`; comment OTP |
| `apps/api/src/auth/auth.service.spec.ts` | Modify | Tests for new methods; comment OTP tests |
| `apps/api/src/auth/auth.controller.ts` | Modify | Wire new endpoints; comment OTP endpoints |
| `apps/api/src/auth/strategies/jwt.strategy.ts` | Modify | Branch on new role values |
| `apps/web/src/app/api/auth/login/route.ts` | Modify | Proxy to `POST /auth/login` instead of OTP verify |
| `apps/web/src/app/(storefront)/auth/page.tsx` | Modify | Replace OTP form with email+password |
| `apps/web/src/contexts/auth-context.tsx` | Modify | `phone` optional, `email` required on User type |
| `apps/web/src/app/vendor/` | Delete | Retire duplicate vendor portal |
| `apps/vendor/src/app/login/page.tsx` | Modify | Replace OTP with email+password |
| `apps/vendor/src/app/(dashboard)/layout.tsx` | Modify | Add role guard |
| `apps/admin/src/app/(dashboard)/layout.tsx` | Modify | Add missing auth guard; decode role for badge |

---

## Task 1: Schema — make phone nullable, add passwordHash

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Edit schema**

In `packages/db/prisma/schema.prisma`, change the `User` model:

```prisma
model User {
  id           String    @id @default(cuid())
  phone        String?   @unique   // was: String @unique
  email        String?   @unique
  name         String?
  avatarUrl    String?
  passwordHash String?             // NEW
  isVerified   Boolean   @default(false)
  trustScore   Int       @default(50)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?

  addresses     Address[]
  cart          Cart?
  orders        Order[]
  reviews       Review[]
  refreshTokens RefreshToken[]
  vendor        Vendor?

  @@index([phone])
  @@index([email])
  @@index([deletedAt])
}
```

- [ ] **Step 2: Run migration**

```bash
cd /path/to/repo
pnpm db:migrate
# When prompted for migration name, enter: add_password_hash_to_user
```

Expected: `Your database is now in sync with your schema.`

- [ ] **Step 3: Regenerate client**

```bash
pnpm db:generate
```

Expected: `Generated Prisma Client`

- [ ] **Step 4: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/db/prisma/migrations/
git commit -m "feat(db): make User.phone nullable, add passwordHash field"
```

---

## Task 2: JWT types — update JwtPayload

**Files:**
- Modify: `apps/api/src/auth/auth.types.ts`

- [ ] **Step 1: Replace the file content**

```ts
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
```

- [ ] **Step 2: Verify typecheck passes**

```bash
pnpm --filter @sario/api typecheck
```

Expected: no errors (there will be errors in auth.service.ts — those get fixed in Tasks 4-7).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/auth/auth.types.ts
git commit -m "feat(auth): update JwtPayload with explicit role union type"
```

---

## Task 3: Create LoginDto

**Files:**
- Create: `apps/api/src/auth/dto/login.dto.ts`

- [ ] **Step 1: Create the file**

```ts
import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "buyer@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "MyP@ssword1" })
  @IsString()
  @MinLength(6)
  password!: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/auth/dto/login.dto.ts
git commit -m "feat(auth): add LoginDto for email+password endpoints"
```

---

## Task 4: AuthService — add `login()` for customers

**Files:**
- Modify: `apps/api/src/auth/auth.service.ts`
- Modify: `apps/api/src/auth/auth.service.spec.ts`

- [ ] **Step 1: Add failing tests**

In `apps/api/src/auth/auth.service.spec.ts`, add the following to the mock setup and add a new describe block. First extend the mocks at the top of the file:

```ts
// Add to the existing import block:
import * as bcrypt from "bcrypt";
jest.mock("bcrypt");
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
```

Add `findUnique` and `create` to the `user` mock object:

```ts
const mockPrisma = {
  otpRecord: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  user: {
    upsert: jest.fn(),
    findUnique: jest.fn(),   // ADD
    create: jest.fn(),       // ADD
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};
```

Add the describe block (after the existing `logout` describe block):

```ts
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

  it("auto-registers and returns tokens when email is new", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockBcrypt.hash.mockResolvedValue("hashed-pw" as never);
    mockPrisma.user.create.mockResolvedValue(fakeUser);

    const result = await service.login(email, password);

    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email, isVerified: true }) as object }),
    );
    expect(result.accessToken).toBe("signed-access-token");
    expect(result.user.email).toBe(email);
    expect((result.user as { passwordHash?: unknown }).passwordHash).toBeUndefined();
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm --filter @sario/api test -- --testPathPattern=auth.service
```

Expected: FAIL — `service.login is not a function`

- [ ] **Step 3: Update `issueTokens` signature and implement `login()`**

In `apps/api/src/auth/auth.service.ts`, replace the `issueTokens` private method:

```ts
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
```

Add the `login()` method (place it before `adminLogin`):

```ts
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
```

- [ ] **Step 4: Fix `verifyOtp` call to `issueTokens`** (it still uses the old signature)

In `verifyOtp`, replace:
```ts
const tokens = await this.issueTokens(user.id, user.phone);
```
with:
```ts
const tokens = await this.issueTokens(user.id, user.email ?? user.phone, "CUSTOMER");
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
pnpm --filter @sario/api test -- --testPathPattern=auth.service
```

Expected: all previous tests pass + new `login` tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/auth/auth.service.ts apps/api/src/auth/auth.service.spec.ts
git commit -m "feat(auth): add email+password login for customers with auto-register"
```

---

## Task 5: AuthService — add `vendorLogin()`

**Files:**
- Modify: `apps/api/src/auth/auth.service.ts`
- Modify: `apps/api/src/auth/auth.service.spec.ts`

- [ ] **Step 1: Add failing tests**

Add `vendor.findUnique` to mockPrisma:

```ts
const mockPrisma = {
  // ...existing mocks...
  vendor: {
    findUnique: jest.fn(),   // ADD
  },
};
```

Add describe block after the `login` describe:

```ts
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm --filter @sario/api test -- --testPathPattern=auth.service
```

Expected: FAIL — `service.vendorLogin is not a function`

- [ ] **Step 3: Implement `vendorLogin()`**

Add to `apps/api/src/auth/auth.service.ts` (after `login()`):

```ts
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm --filter @sario/api test -- --testPathPattern=auth.service
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/auth.service.ts apps/api/src/auth/auth.service.spec.ts
git commit -m "feat(auth): add vendorLogin — requires existing user + vendor record"
```

---

## Task 6: AuthService — update `adminLogin()` and `refresh()`

**Files:**
- Modify: `apps/api/src/auth/auth.service.ts`

- [ ] **Step 1: Update `adminLogin()` to embed real role**

Replace the existing `adminLogin` method:

```ts
async adminLogin(
  email: string,
  password: string,
): Promise<{ accessToken: string; admin: { id: string; name: string; email: string; role: string } }> {
  const admin = await this.prisma.adminUser.findUnique({
    where: { email, deletedAt: null },
  });
  if (!admin) throw new UnauthorizedException("Invalid credentials.");

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) throw new UnauthorizedException("Invalid credentials.");

  await this.prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });

  const payload: JwtPayload = { sub: admin.id, email: admin.email, role: admin.role };
  const accessToken = this.jwt.sign(payload);
  return { accessToken, admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } };
}
```

- [ ] **Step 2: Update `refresh()` to select email and determine role**

Replace the existing `refresh` method:

```ts
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
```

- [ ] **Step 3: Run tests**

```bash
pnpm --filter @sario/api test -- --testPathPattern=auth.service
```

Expected: all tests pass (refresh tests use `user.phone` in mock — update the `fakeStored` in the `refresh` describe to include `email: "buyer@example.com"` and add `mockPrisma.vendor.findUnique.mockResolvedValue(null)` in the `beforeEach`).

Update the refresh describe's `fakeStored`:
```ts
const fakeStored = {
  id: "rt_1",
  revokedAt: null,
  expiresAt: new Date(Date.now() + 86400000),
  user: { id: "usr_1", email: "buyer@example.com", phone: "+919876543210", deletedAt: null },
};
```

And add to refresh `beforeEach`:
```ts
mockPrisma.vendor.findUnique.mockResolvedValue(null);
```

- [ ] **Step 4: Run tests again**

```bash
pnpm --filter @sario/api test -- --testPathPattern=auth.service
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/auth.service.ts apps/api/src/auth/auth.service.spec.ts
git commit -m "feat(auth): adminLogin embeds real role; refresh re-derives CUSTOMER/VENDOR role"
```

---

## Task 7: Comment out OTP code

**Files:**
- Modify: `apps/api/src/auth/auth.service.ts`
- Modify: `apps/api/src/auth/auth.service.spec.ts`
- Modify: `apps/api/src/auth/auth.controller.ts` (done in Task 9, but service first)

- [ ] **Step 1: Comment out OTP service methods**

In `apps/api/src/auth/auth.service.ts`, find the three OTP-related methods (`requestOtp`, `verifyOtp`, `enforceOtpRateLimit`) and wrap all three — including their full existing bodies — in a single block comment with an `OTP_DISABLED` marker:

```ts
// OTP_DISABLED — remove this block comment to re-enable OTP flow
/*
async requestOtp(phone: string, purpose: OtpPurpose): Promise<{ expiresIn: number }> {
  // ... keep existing full method body here, do not delete ...
}

async verifyOtp(phone: string, otp: string, purpose: OtpPurpose): Promise<AuthResponse> {
  // ... keep existing full method body here, do not delete ...
}

private async enforceOtpRateLimit(phone: string): Promise<void> {
  // ... keep existing full method body here, do not delete ...
}
*/
```

Also remove the now-unused imports (or comment them out):
```ts
// OTP_DISABLED
// import { OtpPurpose } from "@sario/db";
// import { OTP_TTL_SECONDS, OTP_MAX_ATTEMPTS_PER_HOUR } from "@sario/shared";
// import { Msg91Service } from "../msg91/msg91.service.js";
// import { generateOtp, hashOtp, verifyOtp as verifyOtpUtil } from "../common/crypto.util.js";
```

Remove `Msg91Service` from the constructor parameters (comment it out):
```ts
constructor(
  private readonly prisma: PrismaService,
  private readonly redis: RedisService,
  private readonly jwt: JwtService,
  private readonly config: ConfigService,
  // OTP_DISABLED: private readonly msg91: Msg91Service,
) {}
```

- [ ] **Step 2: Comment out OTP tests**

In `apps/api/src/auth/auth.service.spec.ts`, wrap the `requestOtp` and `verifyOtp` describe blocks:

```ts
// OTP_DISABLED — remove comment block to re-enable
/*
describe("requestOtp", () => {
  ... existing tests ...
});

describe("verifyOtp", () => {
  ... existing tests ...
});
*/
```

Also comment out:
```ts
// OTP_DISABLED
// import { OtpPurpose } from "@sario/db";
// import { Msg91Service } from "../msg91/msg91.service.js";
```

And remove `mockMsg91` from providers:
```ts
// OTP_DISABLED: { provide: Msg91Service, useValue: mockMsg91 },
```

- [ ] **Step 3: Run tests**

```bash
pnpm --filter @sario/api test -- --testPathPattern=auth.service
```

Expected: all remaining tests pass (OTP tests are commented out).

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/auth/auth.service.ts apps/api/src/auth/auth.service.spec.ts
git commit -m "feat(auth): comment out OTP service methods and tests (OTP_DISABLED)"
```

---

## Task 8: Update JWT strategy

**Files:**
- Modify: `apps/api/src/auth/strategies/jwt.strategy.ts`

- [ ] **Step 1: Update the `validate` method**

Replace the entire file content:

```ts
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../prisma/prisma.service.js";
import { RedisService } from "../../redis/redis.service.js";
import type { JwtPayload } from "../auth.types.js";

const USER_CACHE_TTL_S = 300;

type CachedPayload = Record<string, unknown>;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_SECRET"),
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.role === "SUPER_ADMIN" || payload.role === "SUPPORT") {
      const cacheKey = `jwt:admin:${payload.sub}`;

      let cached: string | null = null;
      try { cached = await this.redis.get(cacheKey); } catch { /* Redis down */ }
      if (cached) {
        try { return JSON.parse(cached) as CachedPayload; } catch { /* corrupt */ }
      }

      const admin = await this.prisma.adminUser.findUnique({
        where: { id: payload.sub, deletedAt: null },
        select: { id: true, email: true, name: true, role: true },
      });
      if (!admin) throw new UnauthorizedException();
      const result = { ...admin, role: payload.role };
      try { await this.redis.setex(cacheKey, USER_CACHE_TTL_S, JSON.stringify(result)); } catch { /* non-fatal */ }
      return result;
    }

    // CUSTOMER or VENDOR
    const cacheKey = `jwt:user:${payload.sub}`;

    let cached: string | null = null;
    try { cached = await this.redis.get(cacheKey); } catch { /* Redis down */ }
    if (cached) {
      try { return JSON.parse(cached) as CachedPayload; } catch { /* corrupt */ }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, deletedAt: null },
      select: { id: true, email: true, phone: true, name: true, isVerified: true },
    });
    if (!user) throw new UnauthorizedException();

    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: user.id },
      select: { id: true, businessName: true, status: true },
    });

    const result = { ...user, vendor: vendor ?? undefined, role: payload.role };
    try { await this.redis.setex(cacheKey, USER_CACHE_TTL_S, JSON.stringify(result)); } catch { /* non-fatal */ }
    return result;
  }
}
```

- [ ] **Step 2: Verify typecheck**

```bash
pnpm --filter @sario/api typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/auth/strategies/jwt.strategy.ts
git commit -m "feat(auth): jwt strategy branches on CUSTOMER/VENDOR/SUPER_ADMIN/SUPPORT roles"
```

---

## Task 9: Auth controller — wire new endpoints, comment out OTP

**Files:**
- Modify: `apps/api/src/auth/auth.controller.ts`

- [ ] **Step 1: Replace the file content**

```ts
import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AuthService } from "./auth.service.js";
import { LoginDto } from "./dto/login.dto.js";
import { RefreshDto } from "./dto/refresh.dto.js";
import { UpdateProfileDto } from "./dto/update-profile.dto.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";
import { CurrentUser, type CurrentUserPayload } from "./decorators/current-user.decorator.js";

// OTP_DISABLED — imports kept for when OTP is re-enabled
// import { RequestOtpDto } from "./dto/request-otp.dto.js";
// import { VerifyOtpDto } from "./dto/verify-otp.dto.js";
// import { AdminLoginDto } from "./dto/admin-login.dto.js"; // see below

import { IsEmail, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

class AdminLoginDto {
  @ApiProperty({ example: "admin@sario.in" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "Admin@sario1" })
  @IsString()
  @MinLength(6)
  password!: string;
}

class DevLoginDto {
  @ApiProperty({ example: "+919876543210" })
  @IsString()
  phone!: string;
}

@ApiTags("Auth")
@Controller({ path: "auth", version: "1" })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user profile" })
  getMe(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.getMe(user.id);
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update current user profile" })
  updateMe(@CurrentUser() user: CurrentUserPayload, @Body() dto: UpdateProfileDto) {
    return this.authService.updateMe(user.id, dto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Customer email + password login — auto-registers on first login" })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post("vendor/login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Vendor email + password login — requires existing vendor record" })
  vendorLogin(@Body() dto: LoginDto) {
    return this.authService.vendorLogin(dto.email, dto.password);
  }

  @Post("admin/login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Admin email + password login — returns JWT with SUPER_ADMIN or SUPPORT role" })
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto.email, dto.password);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Exchange a refresh token for a new token pair" })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoke the current refresh token" })
  logout(@CurrentUser() user: CurrentUserPayload, @Body() dto: RefreshDto) {
    return this.authService.logout(user.id, dto.refreshToken);
  }

  @Post("dev")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "[DEV ONLY] Instantly get tokens for a phone — no OTP required" })
  devLogin(@Body() dto: DevLoginDto) {
    return this.authService.devLogin(dto.phone);
  }

  // OTP_DISABLED — uncomment to re-enable OTP flow
  // @Post("otp/request")
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: "Request an OTP to the given phone number" })
  // requestOtp(@Body() dto: RequestOtpDto) {
  //   return this.authService.requestOtp(dto.phone, dto.purpose);
  // }

  // @Post("otp/verify")
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: "Verify OTP and receive access + refresh tokens" })
  // verifyOtp(@Body() dto: VerifyOtpDto) {
  //   return this.authService.verifyOtp(dto.phone, dto.otp, dto.purpose);
  // }
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @sario/api typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/auth/auth.controller.ts
git commit -m "feat(auth): wire POST /auth/login and POST /auth/vendor/login; comment out OTP endpoints"
```

---

## Task 10: Update Next.js login proxy route

**Files:**
- Modify: `apps/web/src/app/api/auth/login/route.ts`

- [ ] **Step 1: Replace the file content**

```ts
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:4000/v1";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const upstream = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), // { email, password }
  });

  if (!upstream.ok) {
    const err = await upstream.json().catch(() => ({ message: "Auth failed" }));
    return NextResponse.json(err, { status: upstream.status });
  }

  const data = (await upstream.json()) as {
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; phone?: string | null; name: string | null; isVerified: boolean };
  };

  const res = NextResponse.json({ user: data.user, refreshToken: data.refreshToken });
  res.cookies.set("access_token", data.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 15 * 60,
    path: "/",
  });
  return res;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/api/auth/login/route.ts
git commit -m "feat(web): proxy /api/auth/login to new POST /auth/login endpoint"
```

---

## Task 11: Replace OTP form in storefront auth page

**Files:**
- Modify: `apps/web/src/app/(storefront)/auth/page.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth, type User } from "@/hooks/use-auth";

// OTP_DISABLED — imports kept for re-enable
// import { API_BASE } from "@/lib/api";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const nextUrl = searchParams.get("next") ?? "/account/orders";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        throw new Error(err.message ?? "Invalid email or password.");
      }
      const data = (await res.json()) as { refreshToken: string; user: User };
      login(data);
      router.push(nextUrl);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // OTP_DISABLED — remove comment to re-enable OTP flow
  // const [step, setStep] = useState<"phone" | "otp">("phone");
  // const [phone, setPhone] = useState("");
  // const [otp, setOtp] = useState("");
  // const isDev = process.env.NODE_ENV === "development";
  // ... requestOtp, verifyOtp, devLogin handlers ...

  return (
    <main className="min-h-[80vh] bg-[#F5F5F5] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="overflow-hidden rounded-xl border border-[#E8E8E8] bg-white shadow-sm">
          <div className="bg-primary px-6 py-8 text-white">
            <h1 className="text-2xl font-extrabold">Sario</h1>
            <p className="mt-1 text-sm opacity-90">Sign in or create your account</p>
          </div>

          <div className="px-6 py-6">
            <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#4D4D4D]">
                  Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-[#E8E8E8] bg-white px-3 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#4D4D4D]">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#E8E8E8] bg-white px-3 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-primary"
                />
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-[#E02B2B]">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Signing in…" : "Sign In / Register"}
              </button>

              <p className="text-center text-xs text-[#9B9B9B] mt-6">
                By continuing, you agree to our{" "}
                <Link href="/terms" className="text-primary hover:underline">Terms</Link> &amp;{" "}
                <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              </p>
            </form>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-[#9B9B9B]">
          <Link href="/" className="hover:text-primary">← Back to Home</Link>
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @sario/web typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/app/(storefront)/auth/page.tsx"
git commit -m "feat(web): replace OTP login with email+password form"
```

---

## Task 12: Update auth-context User type

**Files:**
- Modify: `apps/web/src/contexts/auth-context.tsx`

- [ ] **Step 1: Update the User interface**

Find the `User` interface and change it to:

```ts
export interface User {
  id: string;
  email: string;        // was: optional; now required
  phone?: string | null; // was: required string; now optional
  name?: string;
  avatarUrl?: string;
  isVerified: boolean;
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @sario/web typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/contexts/auth-context.tsx
git commit -m "feat(web): make User.email required, User.phone optional in auth context"
```

---

## Task 13: Delete duplicate vendor portal from apps/web

**Files:**
- Delete: `apps/web/src/app/vendor/` (entire directory)

- [ ] **Step 1: Delete the directory**

```bash
rm -rf apps/web/src/app/vendor/
```

- [ ] **Step 2: Verify no imports reference the deleted files**

```bash
grep -r "app/vendor" apps/web/src --include="*.ts" --include="*.tsx" -l
```

Expected: no output (no files import from the deleted path).

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @sario/web typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(web): remove duplicate vendor portal — apps/vendor is the single vendor portal"
```

---

## Task 14: Replace OTP login in apps/vendor

**Files:**
- Modify: `apps/vendor/src/app/login/page.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
"use client";

import { useState } from "react";
import { setVendorToken, API_BASE } from "@/lib/api";

// OTP_DISABLED — remove comment to re-enable OTP flow
// type Step = "phone" | "otp";

export default function VendorLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/vendor/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        throw new Error(body.message ?? "Invalid credentials");
      }
      const data = (await res.json()) as { accessToken: string; vendor: { status: string } };
      if (data.vendor.status === "SUSPENDED") {
        throw new Error("Your vendor account has been suspended. Contact support.");
      }
      setVendorToken(data.accessToken);
      window.location.href = "/";
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="h-5 w-5">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Sario Vendor</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your vendor portal</p>
        </div>

        <form onSubmit={(e) => { void handleLogin(e); }} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Email</label>
            <input
              type="email"
              required
              placeholder="store@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Password</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @sario/vendor typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/vendor/src/app/login/page.tsx
git commit -m "feat(vendor): replace OTP login with email+password"
```

---

## Task 15: Add role guard to apps/vendor dashboard layout

**Files:**
- Modify: `apps/vendor/src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Add JWT decode helper and role check**

Add this helper function before the `DashboardLayout` component:

```ts
function getRoleFromToken(token: string | null): string | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]!)) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}
```

Update the `useEffect` in `DashboardLayout` that fetches vendor profile:

```ts
useEffect(() => {
  const token = getVendorToken();
  const role = getRoleFromToken(token);
  if (!token || role !== "VENDOR") {
    router.push("/login");
    return;
  }
  vendorFetch<VendorProfile>("/vendors/me")
    .then(setVendor)
    .catch(() => router.push("/login"));
}, [router]);
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @sario/vendor typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "apps/vendor/src/app/(dashboard)/layout.tsx"
git commit -m "feat(vendor): add JWT role guard to dashboard layout — requires VENDOR role"
```

---

## Task 16: Fix admin dashboard — add auth guard and decode role badge

**Files:**
- Modify: `apps/admin/src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Add state and auth guard**

Add `useState` for `adminRole` and a `useEffect` that validates the token exists and decodes the role.

At the top of `DashboardLayout`, add:

```ts
const [adminRole, setAdminRole] = useState<string>("SUPPORT");
```

Add a `useEffect` (before the existing `pathname` effect):

```ts
useEffect(() => {
  const token = localStorage.getItem("admin_token");
  if (!token) {
    router.push("/login");
    return;
  }
  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("malformed");
    const payload = JSON.parse(atob(parts[1]!)) as { role?: string };
    if (payload.role !== "SUPER_ADMIN" && payload.role !== "SUPPORT") {
      throw new Error("invalid role");
    }
    setAdminRole(payload.role);
  } catch {
    localStorage.removeItem("admin_token");
    router.push("/login");
  }
}, [router]);
```

- [ ] **Step 2: Replace the hardcoded role badge**

Find the header section with the hardcoded "Super Admin" badge:

```tsx
// OLD:
<p className="text-[10px] font-bold text-primary uppercase tracking-tighter">Super Admin</p>

// NEW:
<p className="text-[10px] font-bold text-primary uppercase tracking-tighter">
  {adminRole === "SUPER_ADMIN" ? "Super Admin" : "Support"}
</p>
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @sario/admin typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "apps/admin/src/app/(dashboard)/layout.tsx"
git commit -m "fix(admin): add missing auth guard to dashboard; decode role for badge display"
```

---

## Final Verification

- [ ] **Run all API tests**

```bash
pnpm --filter @sario/api test
```

Expected: all tests pass.

- [ ] **Run full typecheck**

```bash
pnpm typecheck
```

Expected: no errors across all apps.

- [ ] **Smoke test (manual)**

1. Start infra: `docker compose up -d`
2. Start API: `pnpm --filter @sario/api dev`
3. Start web: `pnpm --filter @sario/web dev`
4. Visit `http://localhost:3000/auth` — email+password form appears (no phone/OTP)
5. Register with a new email → redirected to orders page
6. Visit `http://localhost:4000/docs` — confirm `POST /auth/otp/request` and `/auth/otp/verify` are gone; `POST /auth/login` and `POST /auth/vendor/login` appear
7. Start vendor app, visit `/login` — email+password form appears
8. Start admin app, visit protected page without `admin_token` in localStorage → redirected to `/login`
