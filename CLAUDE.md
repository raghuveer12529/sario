# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Sario is a multi-vendor saree ecommerce marketplace for the Indian market. Architecture: pnpm monorepo with Turborepo, modular NestJS API, Next.js 14 storefront.

## Monorepo Layout

```
apps/web        Next.js 14 App Router — buyer storefront
apps/api        NestJS 10 + Fastify — REST API
packages/db     Prisma schema + PrismaClient singleton
packages/shared Constants, Zod schemas, TypeScript types shared across all apps
packages/ui     shadcn/ui component library (source, not compiled)
```

## Commands

```bash
# Start local infra (Postgres, Redis, Meilisearch)
docker compose up -d

# Install all deps
pnpm install

# Run everything in dev
pnpm dev

# Individual apps
pnpm --filter @sario/web dev       # http://localhost:3000
pnpm --filter @sario/api dev       # http://localhost:4000, Swagger at /docs

# Database
pnpm db:generate        # regenerate Prisma client after schema changes
pnpm db:migrate         # run migrations (dev)
pnpm db:studio          # Prisma Studio UI

# Build / check
pnpm build
pnpm typecheck
pnpm lint
```

## Stack Lock-in

| Concern | Choice |
|---|---|
| Frontend | Next.js 14 App Router, TypeScript strict |
| Backend | NestJS 10 + Fastify, TypeScript strict |
| ORM | Prisma 5 + PostgreSQL |
| Cache / Queues | Redis + BullMQ (ioredis) |
| Search | Meilisearch v1.9 |
| Auth | JWT (15 min access / 30 day refresh) + OTP via MSG91 |
| Payments | Razorpay |
| Shipping | Shiprocket |
| Storage | Cloudflare R2 + Cloudinary for transforms |
| Hosting (MVP) | Vercel (web) + Railway (api) + Neon (db) |

## Key Conventions

- **Money is always stored as integer paise** (₹1 = 100 paise). Use `formatPaise()` from `@sario/ui` for display.
- **Timestamps**: store UTC, display IST. Never trust the client clock.
- **IDs**: `cuid2` everywhere via Prisma default.
- **No `any`** — TypeScript strict mode is enforced.
- **Idempotency keys** are mandatory on order creation and payment intents.
- Every NestJS module that handles money or auth must have unit tests for its service layer.

## Local Env Files

Copy `.env.example` to `.env` in each app before running:
- `apps/api/.env.example` — database, Redis, JWT secrets, third-party keys
- `apps/web/.env.example` — public API URL, Razorpay public key

Docker Compose credentials match the defaults in `apps/api/.env.example`.

## Build Phases (from master plan)

**Step 1 ✓** — Monorepo bootstrap  
**Step 2 ✓** — Prisma schema (21 models)  
**Step 3 ✓** — OTP auth module + JWT strategy  
**Step 4 ✓** — Vendor onboarding + KYC (apply, approve/reject/suspend, penny-drop stub)  
**Step 5 ✓** — Product catalog — vendor CRUD, Meilisearch indexing, admin approve/reject  
**Step 6 ✓** — Public storefront API + Next.js pages (home, PDP, search)  
**Step 7 ✓** — Cart + Razorpay checkout + webhook handler + 5-min reconciliation cron  
**Step 8 ✓** — Order lifecycle (PENDING→DELIVERED), Shiprocket integration, vendor dashboard  
**Step 9 ✓** — Returns + refunds (buyer→vendor→admin flow, Razorpay refund API)  
**Step 10 ✓** — Admin panel (apps/admin) — vendor approval, product moderation, dashboard  
**Step 11 ✓** — Notifications (SMS/email via MSG91+Resend, mock mode when keys absent)  
**Step 12 ✓** — Sitemap, robots.txt, request-ID middleware  

**Remaining work:**
- Wire `apps/admin` CSS (copy tailwind config from apps/web)
- Add `NEXT_PUBLIC_SITE_URL` to `apps/web/.env.example`
- Run `pnpm install && pnpm db:generate && pnpm db:migrate` to materialise schema
- Replace TODO in `checkout.service.ts`: create actual `Order` + `OrderItem` records from cart on `payment.captured` webhook
3. Vendor onboarding + KYC
4. Product catalog (vendor side + Meilisearch)
5. Customer storefront
6. Cart + Razorpay checkout
7. Order management + Shiprocket
8. Returns + refunds
9. Admin panel
10. Notifications, observability, SEO
