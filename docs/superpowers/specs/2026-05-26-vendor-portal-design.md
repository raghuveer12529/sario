# Vendor Portal UI — Design Spec

**Date:** 2026-05-26  
**Status:** Approved  
**Approach:** A — Integrated route group in `apps/web`, sidebar + mobile bottom nav

---

## Overview

The vendor portal lives at `/vendor/*` inside the existing `apps/web` Next.js app as a separate route group alongside `(storefront)`. It gives saree vendors a complete self-serve interface: onboarding, product management, order fulfillment, return handling, and store profile editing.

All data fetches use the existing `apiFetch` utility with cookie-based JWT auth. Money values are stored as paise and displayed via `formatPaise` from `@sario/ui`. Product images use URL inputs (no upload endpoint yet).

---

## Route & File Structure

```
apps/web/src/app/vendor/
├── layout.tsx                    Auth guard + sidebar shell
├── page.tsx                      Dashboard
├── onboarding/
│   └── page.tsx                  3-step wizard
├── products/
│   ├── page.tsx                  Product list
│   ├── new/
│   │   └── page.tsx              Create product
│   └── [id]/
│       └── edit/
│           └── page.tsx          Edit product
├── orders/
│   └── page.tsx                  Orders queue
├── returns/
│   └── page.tsx                  Return requests
└── profile/
    └── page.tsx                  Store profile

apps/web/src/app/vendor/_components/
├── vendor-nav.tsx                Sidebar (desktop) + bottom tabs (mobile)
├── stat-card.tsx                 Dashboard KPI cards with skeleton loading
├── product-form.tsx              Shared create/edit form
├── variant-editor.tsx            Dynamic variant rows
├── order-row.tsx                 Expandable order card
└── return-row.tsx                Return request card
```

---

## Section 1: Layout & Auth Guard

`vendor/layout.tsx` is a `"use client"` component. It reads `useAuth` + `useVendor` and enforces:

| State | Action |
|---|---|
| `loading` | Full-screen centered spinner |
| Not authenticated | Redirect `/auth?next=/vendor` |
| `vendor === null` or status `DRAFT` | Redirect `/vendor/onboarding` |
| status `PENDING` | Full-page "Under Review" screen (no nav) |
| status `SUSPENDED` | Full-page "Suspended" screen (no nav) |
| status `APPROVED` | Render sidebar shell + `{children}` |

**Shell layout:**
- Desktop: fixed 240px left sidebar. Shows Sario logo, vendor `businessName`, status badge, nav links, logout at bottom.
- Mobile: full-width content area + fixed bottom tab bar (5 tabs: Dashboard, Products, Orders, Returns, Profile).
- Active nav item uses brand primary color highlight.

---

## Section 2: Onboarding Wizard

Single page at `/vendor/onboarding`. 3-step stepper, all state in `useState`. Single `POST /v1/vendors/apply` on final submit.

**Step 1 — Business Info**
- Business Name (required)
- GSTIN (optional)
- PAN (optional)
- About (textarea, optional)
- Return Policy (textarea, optional)

**Step 2 — KYC**
- Read-only info card: "KYC verification is handled by the Sario team after approval."
- No fields. Single "Continue" button.

**Step 3 — Bank Details**
- Account Holder Name (required)
- Account Number (required)
- Confirm Account Number (required, must match)
- IFSC Code (required)
- Bank Name (required)
- Submit → `POST /v1/vendors/apply` with all collected data
- On success → redirect to "Application Submitted" screen (same as PENDING state in layout)

Stepper shows step number + label at top. "Back" button on steps 2 and 3. Client-side validation with inline error messages before submit.

---

## Section 3: Dashboard

Calls `GET /v1/vendors/me/stats` (new endpoint). Skeleton cards while loading.

**KPI cards (top row, 2×2 on mobile, 4-across on desktop):**
- Total Approved Products
- Pending Orders
- Orders This Month
- Revenue This Month (₹)

**Below cards:**
- Recent Orders: last 5 orders — order ID (short), buyer city, amount, status badge, date
- Quick actions: "+ Add Product" → `/vendor/products/new`, "View All Orders" → `/vendor/orders`

---

## Section 4: Products

**List** (`/vendor/products`)
- Tab filters: All | Draft | Pending Review | Approved | Rejected
- Debounced search input (300ms, `GET /vendors/me/products?search=...&status=...`)
- 20 per page with prev/next pagination
- Row: thumbnail (URL or placeholder icon), name, fabric + region tags, variant count, price range, status badge, Edit + Delete
- Delete: inline confirmation text below the row (no modal)
- Rejected: shows `rejectionReason` in red callout on the row

**Create/Edit form** (shared `<ProductForm>`)
- Edit pre-populates from the product list or via direct API fetch
- Fields: Name, Description, Category (dropdown from `GET /v1/catalog/categories`), Fabric, Region, Occasion (multi-select chips), Tags (comma-separated input), GI Tag, HSN Code, Weaver Story, Image URLs (up to 5 URL text inputs)
- Variant Editor: dynamic rows — Name, SKU, Color, Price (₹), MRP (₹), Weight (g), Stock Qty. "Add Variant" appends a row. Minimum 1 variant enforced.
- Price inputs: accept ₹ rupees in UI, multiply by 100 before sending to API
- Submit: `POST /v1/vendors/me/products` (create) or `PATCH /v1/vendors/me/products/:id` (edit)
- Success: redirect to `/vendor/products` with inline success message

---

## Section 5: Orders

**List** (`/vendor/orders`)
- Tab filters: All | Confirmed | Packed | Shipped | Delivered
- Expandable cards:
  - Collapsed: short order ID, date, item count, total ₹, status badge
  - Expanded: item list (name + variant + qty + price from product snapshot), buyer city, tracking number if available
- Action buttons by status:
  - `CONFIRMED` → "Mark Packed" (`POST /vendors/me/orders/:id/advance`)
  - `PACKED` → "Mark Shipped" (`POST /vendors/me/orders/:id/ship`)
  - `SHIPPED` / `DELIVERED` → read-only
- Status badge colors: yellow=Confirmed, blue=Packed, orange=Shipped, green=Delivered (consistent with Flipkart/Meesho seller conventions)

---

## Section 6: Returns

**List** (`/vendor/returns`)
- Fetches `GET /vendors/me/orders?status=RETURN_REQUESTED` (no separate returns endpoint — reuses the orders list filtered by status). Also shows `RETURN_APPROVED` and `RETURN_REJECTED` in a "History" tab.
- Cards showing: order ID, product name, buyer reason, date, status
- `PENDING` cards: "Approve" (green) + "Reject" (red) buttons
- Reject: inline reason input + confirm button — no modal
- `POST /vendors/me/orders/:id/return/approve` or `/reject`
- Approved/Rejected: shows outcome + timestamp, no actions

---

## Section 7: Profile

**`/vendor/profile`**
- Editable: Business Name, About, Return Policy, Banner URL
- Read-only: GSTIN, PAN, Bank Account (number masked `••••1234`, bank name, verified badge)
- Save: `PATCH /v1/vendors/me`
- Inline success/error message after save

---

## Section 8: API — Stats Endpoint

**`vendor.service.ts`** — add `getStats(userId: string)`:
1. Resolve vendorId from userId via Prisma
2. Check Redis key `vendor:stats:{vendorId}` — return cached if hit
3. Run in `Promise.all`:
   - Count products where `vendorId` + `status = APPROVED` + `deletedAt null`
   - Count orders where `vendorId` + `status IN [CONFIRMED, PACKED, SHIPPED]`
   - Count + sum orders where `vendorId` + `createdAt >= start of current month`
4. Cache result 60s in Redis
5. Return `{ approvedProducts, pendingOrders, ordersThisMonth, revenueThisMonthPaise }`

**`vendor.controller.ts`** — add:
```
@Get("me/stats")
@ApiOperation({ summary: "Vendor dashboard stats (cached 60s)" })
getStats(@CurrentUser() user: CurrentUserPayload) {
  return this.vendorService.getStats(user.id);
}
```

---

## Key Constraints

- No `any` — TypeScript strict throughout
- Money always stored/transmitted as integer paise; `formatPaise()` for display
- `apiFetch` for all API calls (handles credentials + Content-Type + error throwing)
- No external UI libraries beyond what's already in the stack (shadcn/ui, Tailwind)
- Mobile-first — bottom tab nav on mobile, sidebar on desktop
- Skeleton loading states (not spinners) for data-heavy pages — better perceived performance on Indian mobile networks
