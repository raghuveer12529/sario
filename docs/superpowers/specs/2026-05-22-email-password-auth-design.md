# Email+Password Auth with Role Differentiation

**Date:** 2026-05-22  
**Status:** Approved  
**Scope:** Replace OTP login with email+password across all portals; fix JWT role differentiation; remove duplicate vendor portal.

---

## Goals

1. All four user types (customer, vendor, admin, super admin) authenticate with email + password.
2. JWT carries an explicit `role` field so every API guard and frontend layout knows who is who without extra DB calls.
3. OTP code is commented out (not deleted) so it can be re-enabled later.
4. Duplicate vendor portal (`apps/web/src/app/vendor/`) is removed; `apps/vendor` is the single vendor portal.
5. Admin dashboard gains a proper auth guard (currently missing).

---

## Portal Map

| Portal | App | URL (prod) | Login method |
|--------|-----|-----------|-------------|
| Storefront | `apps/web` | `sario.in` | Email + password |
| Vendor portal | `apps/vendor` | `vendor.sario.in` | Email + password |
| Admin panel | `apps/admin` | `admin.sario.in` | Email + password |

---

## Database Changes

### `User` model (`packages/db/prisma/schema.prisma`)

Add one field:

```prisma
model User {
  // ... existing fields unchanged ...
  phone        String    @unique   // retained for future OTP re-enable
  email        String?   @unique   // required via API-layer validation (not schema)
  passwordHash String?             // NEW — bcrypt hash; null for legacy OTP-only accounts
  // ... rest unchanged ...
}
```

`email` stays nullable in the schema to avoid a breaking migration on existing rows. The API enforces it as required on all new registrations.

`OtpRecord` model stays in the schema — no changes.

`AdminUser` model — no changes.

### Migration

One additive migration: `ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT`.

---

## JWT

### New payload type

```ts
// packages/shared or apps/api/src/auth/auth.types.ts
export interface JwtPayload {
  sub: string       // user or admin ID
  email: string
  role: "CUSTOMER" | "VENDOR" | "SUPER_ADMIN" | "SUPPORT"
}
```

The old `phone` field is removed from the payload. The old `role?: "admin"` is replaced by the explicit enum.

### Token issuance

| Login endpoint | Role in token |
|----------------|--------------|
| `POST /auth/login` | `CUSTOMER` |
| `POST /auth/vendor/login` | `VENDOR` |
| `POST /auth/admin/login` | `SUPER_ADMIN` or `SUPPORT` (from `AdminUser.role`) |

### JWT strategy (`apps/api/src/auth/strategies/jwt.strategy.ts`)

```ts
validate(payload: JwtPayload) {
  if (payload.role === "SUPER_ADMIN" || payload.role === "SUPPORT") {
    // look up AdminUser table
  } else {
    // look up User table (CUSTOMER or VENDOR)
  }
}
```

Redis cache keys stay the same pattern: `jwt:admin:<id>` for admin roles, `jwt:user:<id>` for customer/vendor.

---

## API Changes (`apps/api`)

### New endpoints

#### `POST /v1/auth/login` — customer login
- Body: `{ email: string, password: string }`
- Auto-creates `User` row if email does not exist (upsert pattern, same as OTP verify did).
- On first registration: `passwordHash` is set from bcrypt hash of password.
- Returns: `{ accessToken, refreshToken, user }` — same shape as current `AuthResponse`.
- JWT role: `CUSTOMER`.

#### `POST /v1/auth/vendor/login` — vendor login
- Body: `{ email: string, password: string }`
- Looks up `User` by email. Returns 401 if not found or password wrong.
- Checks that a `Vendor` row exists for this user. Returns 403 if not (with message: "No vendor account found. Please apply first.").
- Returns: `{ accessToken, refreshToken, user, vendor }`.
- JWT role: `VENDOR`.

### Updated endpoint

#### `POST /v1/auth/admin/login` — no UI change, but JWT updated
- Now embeds `role: admin.role` (`SUPER_ADMIN` or `SUPPORT`) instead of hardcoded `"admin"`.

### Commented-out endpoints

The following endpoints are commented out in `auth.controller.ts` with a `// OTP_DISABLED` marker. The service methods are also commented out in `auth.service.ts`:

- `POST /v1/auth/otp/request`
- `POST /v1/auth/otp/verify`

The `enforceOtpRateLimit`, `requestOtp`, and `verifyOtp` service methods are block-commented, not deleted.

### Unchanged endpoints

- `POST /v1/auth/refresh` — unchanged
- `POST /v1/auth/logout` — unchanged
- `GET /v1/auth/me` — unchanged
- `PATCH /v1/auth/me` — unchanged
- `POST /v1/auth/dev` — unchanged (dev-only bypass)

---

## Frontend Changes

### `apps/web` — storefront

**`src/app/(storefront)/auth/page.tsx`**
- Replace OTP form (phone → OTP two-step) with a single email + password form.
- Comment out OTP-related state, handlers, and JSX with `// OTP_DISABLED` marker.
- On submit: call `POST /auth/login`. Tokens are stored via the existing `login()` from `AuthContext` (cookies — no change needed).
- Post-login routing: if API returns a `vendor` object on the response, redirect to `vendor.sario.in`; otherwise go to `/` or `?next=` param.

**`src/contexts/auth-context.tsx`** — `User` interface
- `phone: string` → `phone?: string` (email is now the primary identifier)
- `email?: string` → `email: string` (required going forward)

**`src/app/vendor/` directory**
- Delete entirely. Any internal links pointing to `/vendor/*` are updated to `vendor.sario.in/*`.

### `apps/vendor` — vendor portal

**`src/app/login/page.tsx`**
- Replace OTP two-step form with email + password form (matching the admin login page's visual style).
- On submit: call `POST /auth/vendor/login`. Store token in localStorage as `vendor_token` (no change to key name).

**`src/app/(dashboard)/layout.tsx`**
- Add role validation: after fetching `/vendors/me`, also decode the JWT and assert `role === "VENDOR"`. If not, clear token and redirect to `/login`.

### `apps/admin` — admin panel

**`src/app/login/page.tsx`**
- No UI changes needed (already email + password).

**`src/app/(dashboard)/layout.tsx`**
- Add missing auth guard: on mount, check `localStorage.getItem("admin_token")`. If absent, redirect to `/login` immediately before rendering children.
- Update hardcoded "Super Admin" badge to read actual role from decoded JWT: show "Super Admin" for `SUPER_ADMIN`, "Support" for `SUPPORT`.

---

## Error Handling

| Scenario | HTTP status | Message |
|----------|-------------|---------|
| Wrong email or password | 401 | "Invalid credentials." |
| Vendor login, no vendor record | 403 | "No vendor account found." |
| Admin login, account deleted | 401 | "Invalid credentials." |
| Missing email on registration | 400 | Zod/class-validator message |

---

## What Is Not In Scope

- Password reset / forgot password flow (future work)
- 2FA / TOTP (schema has `totpSecret` on AdminUser — already planned, not this task)
- Migrating existing OTP-only users (no existing production data)
- Changing the `apps/vendor` visual design
- Any new admin features

---

## Testing

- Unit tests for `AuthService.login` and `AuthService.vendorLogin`: correct bcrypt comparison, auto-register path, vendor-missing path.
- Existing `AuthService.adminLogin` tests remain valid; update assertions for new role values in JWT.
- Manual smoke test: register as customer → log in → see storefront. Log in as vendor → see vendor dashboard. Log in as admin → see admin dashboard. Wrong password → 401.
