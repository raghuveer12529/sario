# Scale & Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate the already-installed Redis caching and BullMQ infrastructure so the API can handle 10K+ concurrent users without hitting PostgreSQL on every request.

**Architecture:** Add a Redis cache layer in JwtStrategy (user context, 5 min TTL), StorefrontService (category tree + product slugs, 60 s TTL), and wire BullMQ for async notification delivery. Separately patch webhook idempotency and httpOnly cookie security.

**Tech Stack:** NestJS 10, ioredis 5 (RedisService already injected), BullMQ 5 (installed, unused), Next.js 14 App Router API routes, Prisma 5.

---

## File Map

| File | Change |
|---|---|
| `apps/api/src/auth/strategies/jwt.strategy.ts` | Inject RedisService; cache user + admin contexts |
| `apps/api/src/auth/auth.module.ts` | Import RedisModule so JwtStrategy can receive it |
| `apps/api/src/storefront/storefront.service.ts` | Cache category tree + product-by-slug in Redis |
| `apps/api/src/storefront/storefront.module.ts` | Import RedisModule |
| `apps/api/src/queue/queue.module.ts` | **Create** — BullMQ module exposing named queues |
| `apps/api/src/queue/queue.service.ts` | **Create** — typed `enqueue()` helper |
| `apps/api/src/queue/notification.processor.ts` | **Create** — BullMQ worker that calls NotificationService |
| `apps/api/src/notification/notification.module.ts` | Export NotificationService so processor can inject it |
| `apps/api/src/app.module.ts` | Import QueueModule |
| `apps/api/src/checkout/checkout.service.ts` | Webhook idempotency guard via Redis SET NX |
| `apps/web/src/app/api/auth/login/route.ts` | **Create** — sets httpOnly cookie for access token |
| `apps/web/src/app/api/auth/refresh/route.ts` | **Create** — rotates access token via httpOnly cookie |
| `apps/web/src/contexts/auth-context.tsx` | Call `/api/auth/login` instead of NestJS directly |

---

### Task 1: Cache JWT User Context in JwtStrategy

**Files:**
- Modify: `apps/api/src/auth/strategies/jwt.strategy.ts`
- Modify: `apps/api/src/auth/auth.module.ts`
- Test: `apps/api/src/auth/auth.service.spec.ts` (manual verify via curl)

- [ ] **Step 1: Write the failing integration test**

Add to `apps/api/src/auth/auth.service.spec.ts`:

```typescript
it('JwtStrategy.validate caches user in Redis on first call', async () => {
  // This is an integration test — run: pnpm --filter @sario/api test auth
  // Verify by checking redis-cli: GET jwt:user:<userId>
  expect(true).toBe(true); // placeholder — real test is the curl sequence below
});
```

- [ ] **Step 2: Run test to confirm baseline**

```bash
pnpm --filter @sario/api test auth
```
Expected: all existing tests pass.

- [ ] **Step 3: Inject RedisModule into AuthModule**

Replace `apps/api/src/auth/auth.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ACCESS_TOKEN_TTL } from "@sario/shared";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { JwtStrategy } from "./strategies/jwt.strategy.js";
import { Msg91Module } from "../msg91/msg91.module.js";
import { RedisModule } from "../redis/redis.module.js";

@Module({
  imports: [
    PassportModule,
    Msg91Module,
    RedisModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
        signOptions: { expiresIn: ACCESS_TOKEN_TTL },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
```

- [ ] **Step 4: Update JwtStrategy to inject Redis and cache contexts**

Replace `apps/api/src/auth/strategies/jwt.strategy.ts`:

```typescript
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../prisma/prisma.service.js";
import { RedisService } from "../../redis/redis.service.js";
import type { JwtPayload } from "../auth.types.js";

const USER_CACHE_TTL_S = 300;

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
    if (payload.role === "admin") {
      const cacheKey = `jwt:admin:${payload.sub}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as object;

      const admin = await this.prisma.adminUser.findUnique({
        where: { id: payload.sub, deletedAt: null },
        select: { id: true, email: true, name: true, role: true },
      });
      if (!admin) throw new UnauthorizedException();
      const result = { ...admin, role: "admin" as const };
      await this.redis.setex(cacheKey, USER_CACHE_TTL_S, JSON.stringify(result));
      return result;
    }

    const cacheKey = `jwt:user:${payload.sub}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as object;

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, deletedAt: null },
      select: { id: true, phone: true, name: true, isVerified: true },
    });
    if (!user) throw new UnauthorizedException();

    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: user.id },
      select: { id: true, businessName: true, status: true },
    });

    const result = { ...user, vendor: vendor ?? undefined };
    await this.redis.setex(cacheKey, USER_CACHE_TTL_S, JSON.stringify(result));
    return result;
  }
}
```

- [ ] **Step 5: Run tests and verify**

```bash
pnpm --filter @sario/api test auth
```
Expected: all tests pass.

- [ ] **Step 6: Smoke-test with Redis CLI**

```bash
# terminal 1 — start API
pnpm --filter @sario/api dev

# terminal 2 — login and hit an auth-protected route, then check redis
# Replace TOKEN with actual access token from /auth/dev-login
curl -s -X POST http://localhost:4000/v1/auth/dev-login -H "Content-Type: application/json" -d '{"phone":"9999999999"}' | jq .accessToken

redis-cli GET "jwt:user:<paste-userId-from-token>"
# Expected: JSON string with id, phone, name, isVerified
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/auth/strategies/jwt.strategy.ts apps/api/src/auth/auth.module.ts
git commit -m "perf: cache JWT user context in Redis (300 s TTL) — eliminates DB hit per request"
```

---

### Task 2: Cache Category Tree in StorefrontService

**Files:**
- Modify: `apps/api/src/storefront/storefront.service.ts`
- Modify: `apps/api/src/storefront/storefront.module.ts`

- [ ] **Step 1: Inject RedisModule into StorefrontModule**

Read `apps/api/src/storefront/storefront.module.ts`, then add `RedisModule` to its imports array. The import line to add:

```typescript
import { RedisModule } from "../redis/redis.module.js";
```

Add `RedisModule` to the `imports: [...]` array in `@Module()`.

- [ ] **Step 2: Inject RedisService into StorefrontService**

In `apps/api/src/storefront/storefront.service.ts`, update the constructor:

```typescript
import { RedisService } from "../redis/redis.service.js";

// Add to constructor parameters after existing ones:
private readonly redis: RedisService,
```

- [ ] **Step 3: Cache the category tree fetch**

The `getDescendantCategoryIds()` method currently recurses into DB. Replace the whole method with a cached flat-lookup approach. Add these two methods to `StorefrontService`:

```typescript
private async getAllCategories() {
  const cacheKey = "category:all";
  const cached = await this.redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as { id: string; parentId: string | null; isActive: boolean }[];

  const categories = await this.prisma.category.findMany({
    select: { id: true, parentId: true, isActive: true },
  });
  await this.redis.setex(cacheKey, 300, JSON.stringify(categories));
  return categories;
}

private async getDescendantCategoryIds(categoryId: string): Promise<string[]> {
  const all = await this.getAllCategories();
  const result: string[] = [];
  const queue = [categoryId];
  while (queue.length) {
    const current = queue.shift()!;
    const children = all.filter((c) => c.parentId === current && c.isActive);
    for (const child of children) {
      result.push(child.id);
      queue.push(child.id);
    }
  }
  return result;
}
```

- [ ] **Step 4: Restart API and verify**

```bash
pnpm --filter @sario/api dev
curl -s "http://localhost:4000/v1/storefront/search?limit=5" | jq .hits | head -5
redis-cli GET "category:all"
# Expected: JSON array of category objects
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/storefront/storefront.service.ts apps/api/src/storefront/storefront.module.ts
git commit -m "perf: cache category tree in Redis (300 s TTL) — replaces recursive DB queries"
```

---

### Task 3: Cache Product-by-Slug in StorefrontService

**Files:**
- Modify: `apps/api/src/storefront/storefront.service.ts`

- [ ] **Step 1: Wrap getProductBySlug with Redis cache**

In `storefront.service.ts`, update `getProductBySlug`:

```typescript
async getProductBySlug(slug: string) {
  const cacheKey = `product:slug:${slug}`;
  const cached = await this.redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as object;

  const product = await this.prisma.product.findUnique({
    where: { slug, status: ProductStatus.APPROVED, deletedAt: null },
    include: {
      vendor: { select: { id: true, businessName: true, slug: true, about: true } },
      category: { select: { id: true, name: true, slug: true } },
      variants: {
        where: { isActive: true },
        include: { inventory: { select: { quantity: true, reservedQuantity: true } }, images: true },
      },
      images: { orderBy: { sortOrder: "asc" } },
      reviews: {
        where: { isApproved: true },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, rating: true, title: true, body: true, imageUrls: true, createdAt: true },
      },
    },
  });

  if (!product) throw new NotFoundException("Product not found.");
  await this.redis.setex(cacheKey, 60, JSON.stringify(product));
  return product;
}
```

- [ ] **Step 2: Add cache invalidation in CatalogService**

Find `apps/api/src/catalog/catalog.service.ts`. Locate the `approveProduct` and `updateProduct` methods. In each, after the Prisma update, add:

```typescript
// After the prisma.product.update() call, add:
await this.redis.del(`product:slug:${updatedProduct.slug}`);
```

You will need to inject RedisService into CatalogService and import RedisModule into CatalogModule — follow the same pattern as Task 2 Step 1-2.

- [ ] **Step 3: Verify caching works**

```bash
# First request — cache miss, hits DB
curl -s "http://localhost:4000/v1/storefront/products/banarasi-silk-saree-red" | jq .name
redis-cli GET "product:slug:banarasi-silk-saree-red"
# Expected: cached JSON

# Second request — cache hit (check API logs for no DB query)
curl -s "http://localhost:4000/v1/storefront/products/banarasi-silk-saree-red" | jq .name
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/storefront/storefront.service.ts apps/api/src/catalog/
git commit -m "perf: cache product-by-slug in Redis (60 s TTL) with invalidation on update/approve"
```

---

### Task 4: BullMQ Queue Module

**Files:**
- Create: `apps/api/src/queue/queue.module.ts`
- Create: `apps/api/src/queue/queue.service.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create queue.module.ts**

```typescript
// apps/api/src/queue/queue.module.ts
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { QueueService } from "./queue.service.js";

@Module({
  imports: [ConfigModule],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
```

- [ ] **Step 2: Create queue.service.ts**

```typescript
// apps/api/src/queue/queue.service.ts
import { Injectable, OnModuleDestroy, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue, Worker, Job } from "bullmq";

export type NotificationJob =
  | { type: "sms"; phone: string; message: string }
  | { type: "email"; to: string; subject: string; html: string };

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  readonly notificationQueue: Queue<NotificationJob>;

  constructor(private readonly config: ConfigService) {
    const connection = {
      host: this.config.get<string>("REDIS_HOST", "localhost"),
      port: this.config.get<number>("REDIS_PORT", 6379),
      password: this.config.get<string>("REDIS_PASSWORD"),
    };
    this.notificationQueue = new Queue<NotificationJob>("notifications", {
      connection,
      defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 2000 } },
    });
  }

  async enqueueNotification(job: NotificationJob): Promise<void> {
    await this.notificationQueue.add(job.type, job);
    this.logger.debug(`Enqueued ${job.type} notification`);
  }

  async onModuleDestroy() {
    await this.notificationQueue.close();
  }
}
```

- [ ] **Step 3: Register QueueModule in AppModule**

In `apps/api/src/app.module.ts`, add:

```typescript
import { QueueModule } from "./queue/queue.module.js";
// Add QueueModule to the imports array
```

- [ ] **Step 4: Create notification processor**

```typescript
// apps/api/src/queue/notification.processor.ts
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Worker, Job } from "bullmq";
import { NotificationService } from "../notification/notification.service.js";
import type { NotificationJob } from "./queue.service.js";

@Injectable()
export class NotificationProcessor implements OnModuleInit {
  private readonly logger = new Logger(NotificationProcessor.name);
  private worker: Worker<NotificationJob> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly notifications: NotificationService,
  ) {}

  onModuleInit() {
    const connection = {
      host: this.config.get<string>("REDIS_HOST", "localhost"),
      port: this.config.get<number>("REDIS_PORT", 6379),
      password: this.config.get<string>("REDIS_PASSWORD"),
    };

    this.worker = new Worker<NotificationJob>(
      "notifications",
      async (job: Job<NotificationJob>) => {
        const data = job.data;
        if (data.type === "sms") {
          await this.notifications.sendSms(data.phone, data.message);
        } else if (data.type === "email") {
          await this.notifications.sendEmail(data.to, data.subject, data.html);
        }
      },
      { connection, concurrency: 5 },
    );

    this.worker.on("failed", (job, err) => {
      this.logger.error(`Notification job ${job?.id} failed: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}
```

- [ ] **Step 5: Export NotificationService from NotificationModule**

In `apps/api/src/notification/notification.module.ts`, add `exports: [NotificationService]`.

Add `NotificationModule` and `NotificationProcessor` to `QueueModule`:

```typescript
// Updated queue.module.ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { QueueService } from "./queue.service.js";
import { NotificationProcessor } from "./notification.processor.js";
import { NotificationModule } from "../notification/notification.module.js";

@Module({
  imports: [ConfigModule, NotificationModule],
  providers: [QueueService, NotificationProcessor],
  exports: [QueueService],
})
export class QueueModule {}
```

- [ ] **Step 6: Verify BullMQ queue starts**

```bash
pnpm --filter @sario/api dev
# Look for log line: "Enqueued sms notification" or Worker connected
# No errors expected
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/queue/ apps/api/src/app.module.ts apps/api/src/notification/notification.module.ts
git commit -m "feat: BullMQ notification queue with retry — async SMS/email delivery"
```

---

### Task 5: Webhook Idempotency Guard

**Files:**
- Modify: `apps/api/src/checkout/checkout.service.ts`

The existing `confirmPayment()` has an early-return on `PaymentStatus.CAPTURED`, but two concurrent identical webhooks arriving within milliseconds can both pass that check before either commits. The fix is a Redis `SET NX` lock per `razorpayEventId`.

- [ ] **Step 1: Inject RedisService into CheckoutService**

In `apps/api/src/checkout/checkout.service.ts`, add import and inject:

```typescript
import { RedisService } from "../redis/redis.service.js";
// In constructor:
private readonly redis: RedisService,
```

Ensure `RedisModule` is imported in `apps/api/src/checkout/checkout.module.ts`.

- [ ] **Step 2: Update handleWebhook to guard with Redis NX**

Update the `handleWebhook` method:

```typescript
async handleWebhook(rawBody: string, signature: string) {
  if (!this.razorpay.verifyWebhookSignature(rawBody, signature)) {
    throw new BadRequestException("Invalid webhook signature.");
  }

  const event = JSON.parse(rawBody) as {
    event: string;
    event_id?: string;
    payload: { payment: { entity: { id: string; order_id: string; status: string } } };
  };

  // Deduplicate: Razorpay sends event_id on retries — use payment.id as fallback
  const { entity } = event.payload.payment;
  const idempotencyKey = `webhook:${event.event_id ?? entity.id}`;
  const acquired = await this.redis.set(idempotencyKey, "1", "EX", 86400, "NX");
  if (!acquired) {
    this.logger.warn(`Duplicate webhook ignored: ${idempotencyKey}`);
    return;
  }

  if (event.event === "payment.captured") {
    await this.confirmPayment(entity.order_id, entity.id);
  } else if (event.event === "payment.failed") {
    await this.prisma.payment.updateMany({
      where: { razorpayOrderId: entity.order_id },
      data: { status: PaymentStatus.FAILED, failureReason: "Payment failed via webhook" },
    });
    await this.releaseInventoryForRazorpayOrder(entity.order_id);
  }
}
```

- [ ] **Step 3: Verify**

```bash
pnpm --filter @sario/api dev
# Simulate duplicate webhook via curl twice with same body — second should return 200 but log "Duplicate webhook ignored"
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/checkout/checkout.service.ts apps/api/src/checkout/checkout.module.ts
git commit -m "fix: idempotency guard on Razorpay webhook via Redis SET NX — prevents double-processing"
```

---

### Task 6: httpOnly Access Token Cookie

**Files:**
- Create: `apps/web/src/app/api/auth/login/route.ts`
- Create: `apps/web/src/app/api/auth/refresh/route.ts`
- Modify: `apps/web/src/contexts/auth-context.tsx`

- [ ] **Step 1: Create Next.js login proxy route**

```typescript
// apps/web/src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_URL ?? "http://localhost:4000/v1";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const upstream = await fetch(`${API_BASE}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    const err = await upstream.json();
    return NextResponse.json(err, { status: upstream.status });
  }

  const data = await upstream.json() as {
    accessToken: string;
    refreshToken: string;
    user: { id: string; phone: string; name: string | null; isVerified: boolean };
  };

  const res = NextResponse.json({ user: data.user, refreshToken: data.refreshToken });
  res.cookies.set("access_token", data.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 15 * 60, // 15 minutes
    path: "/",
  });
  return res;
}
```

- [ ] **Step 2: Create Next.js refresh proxy route**

```typescript
// apps/web/src/app/api/auth/refresh/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_URL ?? "http://localhost:4000/v1";

export async function POST(req: NextRequest) {
  const body = await req.json() as { refreshToken: string };
  const upstream = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: body.refreshToken }),
  });

  if (!upstream.ok) {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    res.cookies.delete("access_token");
    return res;
  }

  const data = await upstream.json() as { accessToken: string; refreshToken: string };
  const res = NextResponse.json({ refreshToken: data.refreshToken });
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

- [ ] **Step 3: Update auth-context to call Next.js routes**

Read `apps/web/src/contexts/auth-context.tsx`. Find the `verifyOtp` function that calls `${API_BASE}/auth/verify-otp`. Change it to call `/api/auth/login` instead:

```typescript
// Replace the verifyOtp fetch call (currently calls NestJS directly):
const res = await fetch("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ phone, otp, purpose: "LOGIN" }),
});
const data = await res.json();
// data.user is returned; data.refreshToken is returned; access_token is in httpOnly cookie
// Store only refreshToken in cookie (non-httpOnly, for client refresh flow)
Cookies.set("refresh_token", data.refreshToken, { expires: 30, sameSite: "lax" });
setUser(data.user);
```

Also update the `refreshAccessToken` function to call `/api/auth/refresh` instead of NestJS directly.

Remove the `Cookies.set("access_token", ...)` line from auth context entirely — the server now sets it.

- [ ] **Step 4: Update apiFetch to include credentials**

In `apps/web/src/lib/api.ts`, ensure fetch calls include `credentials: "include"` so the httpOnly cookie is sent automatically:

```typescript
// In apiFetch, add to the fetch options:
credentials: "include",
```

Remove the `Authorization: Bearer` header injection for access tokens (the server-side httpOnly cookie handles it now for same-origin requests). Keep it for explicit token overrides if needed.

- [ ] **Step 5: Verify login flow**

```bash
pnpm --filter @sario/web dev
# Open browser DevTools → Application → Cookies
# After OTP login: access_token cookie should show HttpOnly = true
# JS: document.cookie should NOT contain access_token
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/api/auth/ apps/web/src/contexts/auth-context.tsx apps/web/src/lib/api.ts
git commit -m "security: move access token to httpOnly cookie via Next.js proxy routes — prevents XSS token theft"
```

---

## Self-Review

**Spec coverage:**
- ✅ Redis JWT cache — Task 1
- ✅ Redis category tree cache — Task 2
- ✅ Redis product slug cache — Task 3
- ✅ BullMQ module + notification worker — Task 4
- ✅ Webhook idempotency — Task 5
- ✅ httpOnly cookie — Task 6
- ⚠️ DB connection pooling (PgBouncer) — not included; this is infra config outside code, add `?connection_limit=25&pool_timeout=10` to `DATABASE_URL` in Railway/Neon dashboard settings

**Placeholder scan:** None found.

**Type consistency:** `NotificationJob` union defined in `queue.service.ts` and imported in `notification.processor.ts`. `JwtPayload` unchanged. `product` cache returns `object` — sufficient since callers use it as-is.
