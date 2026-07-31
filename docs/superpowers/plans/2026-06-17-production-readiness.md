# Sario Production-Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every gap that blocks Sario from operating as a safe, payable, observable production multi-vendor marketplace — sequenced so the highest-risk gaps are fixed first and each change is independently shippable.

**Architecture:** Work is split into three review-gated phases. Phase 1 fixes the five launch blockers (secrets, observability, CI, money-module tests, vendor payouts). Phase 2 adds the legally/commercially required features (GST invoices, coupons, reviews, deploy config). Phase 3 is hardening cleanup. Vendor payouts use **Razorpay Route** split settlements; platform commission is a **flat percentage** sourced from `Vendor.commissionBps` (default seeded from a platform config).

**Tech Stack:** NestJS 10 + Fastify, Prisma 5 + PostgreSQL, Jest + ts-jest, Razorpay (Orders + Route + Refunds), Sentry, GitHub Actions, `@nestjs/config` + Joi validation.

---

## Decisions locked (from review)

| Decision | Choice |
|---|---|
| Payout mechanism | **Razorpay Route** — split each payment to vendor linked accounts at capture; Razorpay settles to vendors |
| Commission model | **Flat platform %** — single `PLATFORM_COMMISSION_BPS` config is the default; per-vendor override via existing `Vendor.commissionBps` |
| Plan scope | **Phased, critical-first** — review & approve each phase before the next |
| GST invoicing | **In scope** (Phase 2) |

## Open inputs needed before specific tasks (non-blocking for Phase 1 start)

- **Phase 1.5 (payouts):** Razorpay Route must be enabled on the account; need test-mode Route API keys.
- **Phase 2.1 (GST):** platform GSTIN, and confirmation of whether vendors are *individually* GST-registered (changes whether the invoice is platform-issued or vendor-issued, and CGST/SGST vs IGST logic by buyer/seller state).

## How the phasing maps to detail

Phase 1 below is written in full bite-sized TDD detail and is ready to execute now. Phases 2 and 3 are specified at the task level (files, approach, tests, acceptance criteria). Per the phased-review decision, the full bite-sized steps for Phase 2 and Phase 3 are expanded at the start of each phase, once Phase 1 is merged and the open inputs above are supplied. This is deliberate, not a placeholder — it avoids writing detailed steps against code that Phase 1 will change.

---

# PHASE 1 — Launch blockers

Order is intentional: secrets → observability → CI → tests → payouts. Each builds on the last (payouts are built TDD on top of the test+CI infrastructure).

---

## Task 1.1: Fail-fast environment validation

Boot must abort in production if any secret is missing or left at its insecure default. Also forces real third-party keys in production (no silent mock mode).

**Files:**
- Create: `apps/api/src/config/env.validation.ts`
- Modify: `apps/api/src/app.module.ts` (wire `validationSchema` into `ConfigModule.forRoot`)
- Modify: `apps/api/src/main.ts:26` (drop the `?? "sario-cookie-secret"` fallback — read from validated config)
- Test: `apps/api/src/config/env.validation.spec.ts`
- Modify: `apps/api/.env.example` (add `COOKIE_SECRET`, `SENTRY_DSN`, `PLATFORM_COMMISSION_BPS`, `RAZORPAY_ACCOUNT_NUMBER`)

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/config/env.validation.spec.ts
import { validateEnv } from "./env.validation.js";

const base = {
  NODE_ENV: "production",
  JWT_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
  COOKIE_SECRET: "c".repeat(32),
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  RAZORPAY_KEY_ID: "rzp_live_x",
  RAZORPAY_KEY_SECRET: "secret",
  RAZORPAY_WEBHOOK_SECRET: "whsec",
};

describe("validateEnv", () => {
  it("passes with valid production config", () => {
    expect(() => validateEnv(base)).not.toThrow();
  });

  it("rejects placeholder JWT secret in production", () => {
    expect(() => validateEnv({ ...base, JWT_SECRET: "change_me_in_production_min_32_chars" }))
      .toThrow(/JWT_SECRET/);
  });

  it("rejects too-short secret", () => {
    expect(() => validateEnv({ ...base, COOKIE_SECRET: "short" })).toThrow(/COOKIE_SECRET/);
  });

  it("requires Razorpay keys in production", () => {
    const { RAZORPAY_KEY_ID, ...noRzp } = base;
    expect(() => validateEnv(noRzp)).toThrow(/RAZORPAY_KEY_ID/);
  });

  it("allows missing third-party keys in development (mock mode)", () => {
    const { RAZORPAY_KEY_ID, ...noRzp } = base;
    expect(() => validateEnv({ ...noRzp, NODE_ENV: "development" })).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @sario/api test -- env.validation`
Expected: FAIL — `validateEnv` not defined.

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/api/src/config/env.validation.ts
import * as Joi from "joi";

const PLACEHOLDERS = [
  "change_me_in_production_min_32_chars",
  "change_me_too_in_production_min_32",
  "sario-cookie-secret",
];

const secret = Joi.string().min(32).invalid(...PLACEHOLDERS);

// Keys that must be real in production but may be absent in dev (service falls back to mock).
const prodRequired = Joi.when("NODE_ENV", {
  is: "production",
  then: Joi.required(),
  otherwise: Joi.optional().allow(""),
});

const schema = Joi.object({
  NODE_ENV: Joi.string().valid("development", "test", "production").default("development"),
  PORT: Joi.number().default(4000),
  DATABASE_URL: Joi.string().required(),
  REDIS_HOST: Joi.string().default("localhost"),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow("").optional(),
  MEILI_HOST: Joi.string().required(),
  MEILI_API_KEY: Joi.string().required(),
  JWT_SECRET: secret.required(),
  JWT_REFRESH_SECRET: secret.required(),
  COOKIE_SECRET: secret.required(),
  RAZORPAY_KEY_ID: Joi.string().concat(prodRequired),
  RAZORPAY_KEY_SECRET: Joi.string().concat(prodRequired),
  RAZORPAY_WEBHOOK_SECRET: Joi.string().concat(prodRequired),
  RAZORPAY_ACCOUNT_NUMBER: Joi.string().optional().allow(""),
  PLATFORM_COMMISSION_BPS: Joi.number().min(0).max(10000).default(1500),
  SENTRY_DSN: Joi.string().uri().optional().allow(""),
  ALLOWED_ORIGINS: Joi.string().optional(),
}).unknown(true);

export function validateEnv(config: Record<string, unknown>) {
  const { error, value } = schema.validate(config, { abortEarly: false });
  if (error) {
    throw new Error(`Environment validation failed: ${error.message}`);
  }
  return value;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @sario/api test -- env.validation`
Expected: PASS (5 tests). Install Joi first if absent: `pnpm --filter @sario/api add joi`.

- [ ] **Step 5: Wire into ConfigModule and main.ts**

In `apps/api/src/app.module.ts`, change the import:

```typescript
import { validateEnv } from "./config/env.validation.js";
// ...
ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
```

In `apps/api/src/main.ts`, replace the cookie secret fallback:

```typescript
await app.register(require("@fastify/cookie") as never, {
  secret: process.env["COOKIE_SECRET"],
});
```

- [ ] **Step 6: Update `.env.example`**

Add to `apps/api/.env.example`:

```
COOKIE_SECRET=change_me_cookie_secret_min_32_chars
SENTRY_DSN=
PLATFORM_COMMISSION_BPS=1500
RAZORPAY_ACCOUNT_NUMBER=
```

- [ ] **Step 7: Verify the app still boots in dev**

Run: `pnpm --filter @sario/api dev`
Expected: starts cleanly (dev allows empty third-party keys).

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/config apps/api/src/app.module.ts apps/api/src/main.ts apps/api/.env.example
git commit -m "feat(api): fail-fast env validation rejecting insecure secret defaults"
```

---

## Task 1.2: Observability — Sentry + no silent failures

Wire Sentry for error capture, and replace the silent `.catch(() => null)` swallows on inventory writes with logged + Sentry-reported failures so lost stock is never invisible.

**Files:**
- Create: `apps/api/src/observability/sentry.ts`
- Modify: `apps/api/src/main.ts` (init Sentry early; register a global exception filter)
- Create: `apps/api/src/observability/all-exceptions.filter.ts`
- Modify: `apps/api/src/checkout/checkout.service.ts:278`, `:305` (inventory catches)
- Modify: `apps/api/src/order/order.service.ts:86` and `apps/api/src/returns/returns.service.ts:124` (inventory catches)
- Test: `apps/api/src/observability/all-exceptions.filter.spec.ts`

- [ ] **Step 1: Install dependency**

Run: `pnpm --filter @sario/api add @sentry/node`

- [ ] **Step 2: Write the failing test for the exception filter**

```typescript
// apps/api/src/observability/all-exceptions.filter.spec.ts
import { AllExceptionsFilter } from "./all-exceptions.filter.js";
import { HttpException, HttpStatus } from "@nestjs/common";

function mockHost(send = jest.fn()) {
  const reply = { status: jest.fn().mockReturnThis(), send };
  return {
    switchToHttp: () => ({
      getResponse: () => reply,
      getRequest: () => ({ url: "/v1/x", id: "req-1" }),
    }),
  } as never;
}

describe("AllExceptionsFilter", () => {
  it("preserves HttpException status and reports unknown errors to Sentry", () => {
    const capture = jest.fn();
    const filter = new AllExceptionsFilter(capture);
    const send = jest.fn();

    filter.catch(new HttpException("nope", HttpStatus.BAD_REQUEST), mockHost(send));
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    expect(capture).not.toHaveBeenCalled(); // 4xx not reported

    filter.catch(new Error("boom"), mockHost(jest.fn()));
    expect(capture).toHaveBeenCalledTimes(1); // 500 reported
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @sario/api test -- all-exceptions`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement Sentry init + filter**

```typescript
// apps/api/src/observability/sentry.ts
import * as Sentry from "@sentry/node";

export function initSentry() {
  const dsn = process.env["SENTRY_DSN"];
  if (!dsn) return false;
  Sentry.init({ dsn, environment: process.env["NODE_ENV"], tracesSampleRate: 0.1 });
  return true;
}

export const captureException = (err: unknown, context?: Record<string, unknown>) => {
  if (process.env["SENTRY_DSN"]) Sentry.captureException(err, { extra: context });
};
```

```typescript
// apps/api/src/observability/all-exceptions.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { captureException } from "./sentry.js";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("Exceptions");
  constructor(private readonly report: typeof captureException = captureException) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const req = ctx.getRequest<FastifyRequest>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      exception instanceof HttpException ? exception.getResponse() : "Internal server error";

    if (status >= 500) {
      this.logger.error(`${req.url} → ${status}`, exception instanceof Error ? exception.stack : "");
      this.report(exception, { url: req.url });
    }

    reply.status(status).send(
      typeof message === "string" ? { statusCode: status, message } : { statusCode: status, ...message },
    );
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @sario/api test -- all-exceptions`
Expected: PASS.

- [ ] **Step 6: Wire into main.ts**

In `apps/api/src/main.ts`, before `NestFactory.create`:

```typescript
import { initSentry } from "./observability/sentry.js";
initSentry();
```

After the validation pipe block, register the filter:

```typescript
import { AllExceptionsFilter } from "./observability/all-exceptions.filter.js";
app.useGlobalFilters(new AllExceptionsFilter());
```

- [ ] **Step 7: Replace silent inventory catches**

In each of the four locations, replace `.catch(() => null)` with a logged + reported catch. Pattern (apply per call site, e.g. `checkout.service.ts` confirmPayment loop):

```typescript
.catch((err) => {
  this.logger.error(`Inventory write failed for variant ${item.variantId}`, err);
  captureException(err, { variantId: item.variantId, op: "decrement" });
  return null;
});
```

Add `import { captureException } from "../observability/sentry.js";` to each modified service.

- [ ] **Step 8: Run full API test suite + typecheck**

Run: `pnpm --filter @sario/api test && pnpm --filter @sario/api typecheck`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/observability apps/api/src/main.ts apps/api/src/checkout apps/api/src/order apps/api/src/returns
git commit -m "feat(api): Sentry error tracking + global exception filter; stop swallowing inventory failures"
```

---

## Task 1.3: CI pipeline

GitHub Actions runs install → prisma generate → lint → typecheck → test → build on every PR.

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write the workflow**

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
  push:
    branches: [main, dev]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm db:generate
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

- [ ] **Step 2: Confirm root scripts exist**

Run: `grep -E '"(lint|typecheck|test|build|db:generate)"' package.json`
Expected: all five present (Turborepo passthrough). If `test` is missing at root, add `"test": "turbo run test"` to root `package.json` scripts.

- [ ] **Step 3: Validate the workflow locally (lint the YAML)**

Run: `npx --yes @action-validator/cli .github/workflows/ci.yml || echo "validator unavailable — verify manually"`
Expected: no schema errors.

- [ ] **Step 4: Commit and push to trigger a run**

```bash
git add .github/workflows/ci.yml package.json
git commit -m "ci: add lint/typecheck/test/build pipeline"
```

- [ ] **Step 5: Verify the run is green**

After push, run: `gh run list --limit 1` then `gh run watch`
Expected: workflow concludes `success`. Fix any real failures it surfaces before proceeding.

---

## Task 1.4: Unit tests for money/auth modules

Satisfy the CLAUDE.md mandate. Cover the highest-risk paths: checkout idempotency + inventory reservation, refund capping + idempotency, and order status transitions.

**Files:**
- Create: `apps/api/src/checkout/checkout.service.spec.ts`
- Create: `apps/api/src/returns/returns.service.spec.ts`
- Create: `apps/api/src/order/order.service.spec.ts`

These follow the existing `auth.service.spec.ts` mocking style (plain mock objects per provider).

- [ ] **Step 1: Write checkout.service.spec.ts**

Cover, with mocked `PrismaService`, `CartService`, `RazorpayService`, `RedisService`:

```typescript
describe("CheckoutService", () => {
  it("returns the original checkout when called twice with the same idempotency key", async () => {
    // prisma.payment.findUnique resolves an existing payment → expect no new razorpay.createOrder call
  });
  it("throws BadRequest and refreshes the cart when a price changed since add", async () => {
    // cart item pricePaise !== variant.pricePaise → expect cartItem.update called, throws
  });
  it("rolls back and throws when an item is short on stock", async () => {
    // $executeRaw returns 0 → expect BadRequestException with product name
  });
  it("confirmPayment is idempotent — second call on a CAPTURED payment is a no-op", async () => {
    // payment.status === CAPTURED → expect no order.updateMany / inventory writes
  });
});
```

Write each with concrete mock return values mirroring `auth.service.spec.ts`. Assert via `expect(mockX.method).toHaveBeenCalledWith(...)` / `.not.toHaveBeenCalled()`.

- [ ] **Step 2: Write returns.service.spec.ts**

```typescript
describe("ReturnsService.issueRefund", () => {
  it("returns the existing refund without calling Razorpay when one already exists (idempotent)", async () => {});
  it("caps the refund at the payment's remaining refundable balance", async () => {
    // amountPaise huge, priorRefunds high → refundAmount = remaining; assert createRefund called with capped value
  });
  it("throws when no captured payment exists for the order group", async () => {});
  it("restocks each item after a successful refund", async () => {
    // assert inventory.update increment called per item
  });
});
```

- [ ] **Step 3: Write order.service.spec.ts**

```typescript
describe("OrderService.advanceOrderStatus", () => {
  it("CONFIRMED → PACKED sets packedAt", async () => {});
  it("PACKED → SHIPPED sets shippedAt", async () => {});
  it("throws when no transition exists from DELIVERED", async () => {});
  it("throws Forbidden when the order belongs to another vendor", async () => {});
});
describe("OrderService.requestReturn", () => {
  it("throws when order is not DELIVERED", async () => {});
  it("throws when the 7-day window has passed", async () => {});
});
```

- [ ] **Step 4: Run all new specs**

Run: `pnpm --filter @sario/api test`
Expected: all suites PASS. Iterate on mocks until green.

- [ ] **Step 5: Check coverage on the three services**

Run: `pnpm --filter @sario/api test:cov -- checkout order returns`
Expected: statements/branches meaningfully covered (target ≥80% on these files). Add cases for any uncovered critical branch.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/checkout/checkout.service.spec.ts apps/api/src/returns/returns.service.spec.ts apps/api/src/order/order.service.spec.ts
git commit -m "test(api): unit tests for checkout, refund, and order-lifecycle logic"
```

---

## Task 1.5: Vendor payouts via Razorpay Route

Split each captured payment to vendor linked accounts, retaining the flat platform commission. Built TDD.

**Sub-design:**
- Each `Vendor` gets a `razorpayAccountId` (linked account). Vendors without one are paid manually (logged) until onboarded — capture must never fail because a vendor isn't linked yet.
- Commission: `transferAmount = vendorOrderTotal - round(vendorOrderTotal * commissionBps / 10000)`. `commissionBps` defaults to `PLATFORM_COMMISSION_BPS`.
- Transfers are created **after** payment capture (in `confirmPayment`), one transfer per vendor order in the checkout group, recorded in a new `Payout` row for idempotency and reconciliation.

**Files:**
- Modify: `packages/db/prisma/schema.prisma` (add `Vendor.razorpayAccountId String?`; add `Payout` model + `PayoutStatus` enum)
- Create migration: `pnpm db:migrate --name add_vendor_payouts`
- Modify: `apps/api/src/payment/razorpay.service.ts` (add `createLinkedAccount`, `createTransfer`)
- Create: `apps/api/src/payout/payout.service.ts`, `payout.module.ts`
- Modify: `apps/api/src/checkout/checkout.service.ts` (call payout after confirm) and `apps/api/src/checkout/checkout.module.ts` (import PayoutModule)
- Modify: `apps/api/src/vendor/vendor.service.ts` + controller (endpoint to create/link Razorpay account)
- Test: `apps/api/src/payout/payout.service.spec.ts`

- [ ] **Step 1: Add schema models**

```prisma
enum PayoutStatus {
  PENDING
  PROCESSED
  FAILED
}

model Payout {
  id                 String       @id @default(cuid())
  orderId            String       @unique
  vendorId           String
  paymentId          String
  grossPaise         Int
  commissionPaise    Int
  netPaise           Int
  razorpayTransferId String?
  status             PayoutStatus @default(PENDING)
  failureReason      String?
  createdAt          DateTime     @default(now())
  processedAt        DateTime?

  vendor  Vendor  @relation(fields: [vendorId], references: [id])
  @@index([vendorId])
  @@index([status])
}
```

Add to `model Vendor`: `razorpayAccountId String?` and `payouts Payout[]`.

- [ ] **Step 2: Create migration + regenerate client**

Run: `pnpm db:migrate --name add_vendor_payouts && pnpm db:generate`
Expected: migration applies, client regenerated with `Payout` / `PayoutStatus`.

- [ ] **Step 3: Write the failing payout test**

```typescript
// apps/api/src/payout/payout.service.spec.ts
describe("PayoutService.createPayoutsForGroup", () => {
  it("computes net = gross - commission at the vendor's bps", async () => {
    // vendor.commissionBps = 1500, order.totalPaise = 100000
    // → commission 15000, net 85000; assert payout.create called with these
  });
  it("is idempotent — skips orders that already have a Payout row", async () => {
    // payout.findUnique returns existing → razorpay.createTransfer not called for it
  });
  it("records FAILED (does not throw) when the vendor has no razorpayAccountId", async () => {
    // assert payout.create called with status FAILED + reason; capture flow continues
  });
  it("marks PROCESSED with the transfer id on success", async () => {});
});
```

- [ ] **Step 4: Run to verify failure**

Run: `pnpm --filter @sario/api test -- payout`
Expected: FAIL — service not defined.

- [ ] **Step 5: Add Razorpay Route methods**

In `razorpay.service.ts`, add (mock-aware like existing methods):

```typescript
async createTransfer(paymentId: string, accountId: string, amountPaise: number): Promise<{ id: string }> {
  if (!this.keyId) {
    this.logger.warn(`[MOCK] Transfer ${amountPaise} to ${accountId}`);
    return { id: `mock_trf_${Date.now()}` };
  }
  return this.request<{ id: string }>("POST", `/payments/${paymentId}/transfers`, {
    transfers: [{ account: accountId, amount: amountPaise, currency: "INR" }],
  });
}
```

- [ ] **Step 6: Implement PayoutService**

```typescript
// apps/api/src/payout/payout.service.ts
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PayoutStatus } from "@sario/db";
import { PrismaService } from "../prisma/prisma.service.js";
import { RazorpayService } from "../payment/razorpay.service.js";
import { captureException } from "../observability/sentry.js";

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpay: RazorpayService,
    private readonly config: ConfigService,
  ) {}

  /** Create one transfer per vendor order in a paid checkout group. Idempotent per order. */
  async createPayoutsForGroup(razorpayPaymentId: string, orders: Array<{
    id: string; vendorId: string; totalPaise: number;
  }>, paymentId: string) {
    const defaultBps = this.config.get<number>("PLATFORM_COMMISSION_BPS", 1500);
    for (const order of orders) {
      const existing = await this.prisma.payout.findUnique({ where: { orderId: order.id } });
      if (existing) continue;

      const vendor = await this.prisma.vendor.findUnique({ where: { id: order.vendorId } });
      const bps = vendor?.commissionBps ?? defaultBps;
      const commissionPaise = Math.round((order.totalPaise * bps) / 10000);
      const netPaise = order.totalPaise - commissionPaise;

      if (!vendor?.razorpayAccountId) {
        await this.prisma.payout.create({
          data: { orderId: order.id, vendorId: order.vendorId, paymentId,
            grossPaise: order.totalPaise, commissionPaise, netPaise,
            status: PayoutStatus.FAILED, failureReason: "Vendor not linked to Razorpay" },
        });
        this.logger.warn(`Vendor ${order.vendorId} not linked — payout for order ${order.id} pending manual handling`);
        continue;
      }

      try {
        const transfer = await this.razorpay.createTransfer(razorpayPaymentId, vendor.razorpayAccountId, netPaise);
        await this.prisma.payout.create({
          data: { orderId: order.id, vendorId: order.vendorId, paymentId,
            grossPaise: order.totalPaise, commissionPaise, netPaise,
            razorpayTransferId: transfer.id, status: PayoutStatus.PROCESSED, processedAt: new Date() },
        });
      } catch (err) {
        captureException(err, { orderId: order.id });
        await this.prisma.payout.create({
          data: { orderId: order.id, vendorId: order.vendorId, paymentId,
            grossPaise: order.totalPaise, commissionPaise, netPaise,
            status: PayoutStatus.FAILED, failureReason: String(err) },
        });
      }
    }
  }
}
```

Create `payout.module.ts` exporting `PayoutService` (imports PrismaModule, the module providing RazorpayService).

- [ ] **Step 7: Run payout tests to green**

Run: `pnpm --filter @sario/api test -- payout`
Expected: PASS (4 tests).

- [ ] **Step 8: Call payouts from confirmPayment**

In `checkout.service.ts confirmPayment`, after the inventory decrement loop and before `clearCart`, gather the group orders (already fetched as `groupOrders`) and call:

```typescript
await this.payouts.createPayoutsForGroup(
  razorpayPaymentId,
  groupOrders.map((o) => ({ id: o.id, vendorId: o.vendorId, totalPaise: o.totalPaise })),
  payment.id,
);
```

Inject `PayoutService` into `CheckoutService` and import `PayoutModule` in `checkout.module.ts`. Update `groupOrders` include to select `vendorId` and `totalPaise`.

- [ ] **Step 9: Add vendor linked-account endpoint**

In `vendor.service.ts` add `linkRazorpayAccount(userId)` that calls `razorpay.createLinkedAccount` (add the mock-aware method to razorpay.service mirroring `createTransfer`, POSTing to `/accounts` with the vendor's business + bank details) and stores `razorpayAccountId`. Expose `POST /v1/vendors/me/razorpay-link` on the vendor controller behind the JWT guard.

- [ ] **Step 10: Full suite + typecheck**

Run: `pnpm --filter @sario/api test && pnpm --filter @sario/api typecheck`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add packages/db apps/api/src/payout apps/api/src/payment apps/api/src/checkout apps/api/src/vendor
git commit -m "feat(api): vendor payouts via Razorpay Route split transfers with flat commission"
```

---

### Phase 1 checkpoint

After 1.1–1.5 merged: secrets are validated at boot, errors reach Sentry, CI gates every PR, the money modules are tested, and vendors get paid. **Stop here for review before Phase 2.**

---

# PHASE 2 — Commercially/legally required (task-level spec)

> Full bite-sized steps expanded at Phase 2 kickoff. Requires Phase 2 open inputs (platform GSTIN, vendor GST-registration model).

## Task 2.1: GST tax-invoice generation
- **Files:** new `apps/api/src/invoice/` module (`invoice.service.ts`, `invoice.controller.ts`), PDF via `@react-pdf/renderer` or `pdfkit`; `Invoice` model in schema (number, orderId, pdfUrl, gstBreakup JSON) + migration; store PDF in R2 via existing `upload.service.ts`.
- **Approach:** On order → CONFIRMED, generate a sequential GST invoice number, compute CGST/SGST (intra-state) vs IGST (inter-state) from buyer vs seller state, render PDF, upload to R2, expose `GET /v1/orders/:id/invoice`.
- **Tests:** invoice numbering is sequential & gap-free under concurrency; CGST/SGST split for same-state; IGST for cross-state; total matches `order.totalPaise`.
- **Acceptance:** every CONFIRMED order has a downloadable GST-compliant invoice with GSTIN, HSN, tax breakup.

## Task 2.2: Wire coupons into checkout
- **Files:** `cart.service.ts`/`checkout.service.ts`, `Coupon` (exists) + new `CouponRedemption` model, `checkout.controller.ts` (accept `couponCode`).
- **Approach:** validate code (active, within dates, min-order, per-user usage cap), apply `DiscountType` (PERCENT/FLAT) to subtotal before Razorpay order creation, record redemption on capture, factor discount into commission base.
- **Tests:** expired/over-limit coupon rejected; percentage vs flat math; discount reduces Razorpay amount and the payout gross consistently.
- **Acceptance:** a valid coupon reduces the charged amount and is recorded once per order.

## Task 2.3: Buyer product reviews
- **Files:** new `apps/api/src/review/` module; uses existing `Review` model; storefront UI on PDP.
- **Approach:** only buyers with a DELIVERED order for the product may review (1 per product per buyer); aggregate rating cached on product; expose list + create endpoints.
- **Tests:** non-purchaser blocked; duplicate review blocked; aggregate recomputed on create.
- **Acceptance:** verified buyers can post a 1–5 star review with text; PDP shows rating + reviews.

## Task 2.4: Deploy configuration
- **Files:** `apps/api/Dockerfile`, `apps/web` Vercel settings doc, `railway.json` (or `render.yaml`), `.dockerignore`.
- **Approach:** multi-stage Node 20 build for the API targeting Railway; document Vercel project settings + required env vars for web; Neon `DATABASE_URL` with `?sslmode=require`.
- **Tests/verify:** `docker build` succeeds; container boots and `/health` returns ok against a test DB.
- **Acceptance:** reproducible deploy artifacts committed; one documented command/path per app to deploy.

### Phase 2 checkpoint — stop for review before Phase 3.

---

# PHASE 3 — Hardening (task-level spec)

> Several Phase-3 concerns are partly addressed by Phase 1 (silent catches by 1.2, mock-in-prod by 1.1). Remaining:

## Task 3.1: Cookie/CSRF topology verification
- Verify the prod `sameSite: "none"` access-token cookie matches the real web/API domain split; add a CSRF token or origin check on state-changing same-origin routes if needed. Document the decision in CLAUDE.md.

## Task 3.2: Refresh CLAUDE.md
- Remove the stale "Remaining work" items that are now done (checkout webhook order creation, migrations); add payouts, invoices, observability, CI to the build-phases log. Pure docs.

## Task 3.3: Repo hygiene audit
- Confirm `folder-alias.json`, `private-folder-alias.json`, `.claude/skills/`, `playwright-report/`, `test-results/`, `tests/screenshots/` are correctly git-ignored or intentionally tracked; ensure no secret leaks in `private-folder-alias.json`. Add missing `.gitignore` entries.

## Task 3.4: Payout reconciliation cron
- Add a scheduled job that retries `FAILED` payouts whose vendor has since linked a Razorpay account, mirroring the existing `reconcileOrphanPayments` pattern. Tests for retry idempotency.

### Phase 3 checkpoint — final review; then merge to main.

---

## Self-review notes

- **Spec coverage:** all 10 assessment gaps map to a task — secrets→1.1, observability/silent-catches→1.2, CI→1.3, money tests→1.4, payouts→1.5, GST→2.1, coupons→2.2, reviews→2.3, deploy config→2.4, cookie/CSRF→3.1, stale docs→3.2, untracked files→3.3. Payout reconciliation (3.4) added beyond the assessment for operational completeness.
- **Type consistency:** `Payout`/`PayoutStatus`, `razorpayAccountId`, `createPayoutsForGroup`, `createTransfer`, `validateEnv`, `captureException`, `AllExceptionsFilter` are used consistently across the tasks that reference them.
- **Phasing caveat:** Phase 1 is execution-ready; Phases 2–3 are task-level and get bite-sized expansion at their kickoff per the phased-review decision.
