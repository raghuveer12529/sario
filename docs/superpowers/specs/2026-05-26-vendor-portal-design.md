# Vendor Portal UI — Design Spec

**Date:** 2026-05-26  
**Status:** Approved

---

## Overview

The vendor portal lives at `/vendor/*` inside the existing `apps/web` Next.js app. It is a separate route group alongside `(storefront)` and does **not** inherit the buyer header or category nav. It gives saree vendors a complete self-serve interface: onboarding, product management, order fulfillment, return handling, and store profile editing.

All data fetches use the existing `apiFetch` utility with cookie-based JWT auth. Money values are stored as paise and displayed via `formatPaise` from `@sario/ui`. No new backend endpoints are required — all API routes already exist.

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

`vendor/layout.tsx` is a `"use client"` component. It reads `useAuth` + `useVendor` + `usePathname` and enforces:

| State | Action |
|---|---|
| `auth.loading` or `vendor.loading` | Full-screen centered spinner |
| Not authenticated | Redirect `/auth?next=/vendor` |
| `vendor === null` or status `DRAFT`, and not on `/vendor/onboarding` | Redirect `/vendor/onboarding` |
| status `PENDING` | Full-page "Under Review" screen (no nav) |
| status `SUSPENDED` | Full-page "Suspended" screen (no nav) |
| status `APPROVED` | Render sidebar shell + `{children}` |

**Shell layout:**
- Desktop: fixed 240px left sidebar. Shows "Sario Vendor" logo, vendor `businessName` chip, status badge, nav links, logout button at bottom.
- Mobile: full-width content area + fixed bottom tab bar (5 tabs: Dashboard, Products, Orders, Returns, Profile).
- Active nav item: `bg-primary/10 text-primary font-bold rounded-lg`. Inactive: `text-[#4D4D4D] hover:bg-[#F5F5F5] rounded-lg`.
- Main content: `bg-[#F5F5F5] min-h-screen p-6`.

**Under Review screen:** Centered card with icon, "Application Under Review" heading, message that the Sario team is reviewing the application and will notify via email.

**Suspended screen:** Centered card with icon, "Account Suspended" heading, message to contact support. Logout button shown.

---

## Section 2: Onboarding Wizard

Single page at `/vendor/onboarding`. The layout guard allows access even when vendor is null/DRAFT (pathname check). All step state held in `useState`. Single `POST /v1/vendors/apply` call on final submit with all collected fields.

Step indicator: 3 numbered circles with connector lines, active step highlighted in primary color.

**Step 1 — Business Info**
- Business Name (required, maps to `businessName`)
- About (optional, textarea, max 2000 chars, maps to `about`)
- Return Policy (optional, textarea, max 1000 chars, maps to `returnPolicy`)

**Step 2 — KYC Details**
- GSTIN (optional, text, placeholder `33AABCU9603R1ZV`, hint: "15-character GST Identification Number")
- PAN (optional, text, placeholder `ABCDE1234F`, hint: "10-character Permanent Account Number")
- Both are optional — vendor can leave blank and proceed

**Step 3 — Bank Account**
- Account Holder Name (required, maps to `accountHolder`)
- Bank Name (required, maps to `bankName`)
- Account Number (required, maps to `accountNumber`, pattern `\d{9,18}`)
- Confirm Account Number (required, client-side match validation only, not sent to API)
- IFSC Code (required, maps to `ifsc`, placeholder `SBIN0001234`)
- Submit → `POST /v1/vendors/apply` with all fields from steps 1–3
- On success → redirect to `/vendor` (guard shows "Under Review" since status becomes PENDING)
- On API error → inline error message below submit button

"Back" button on steps 2 and 3 restores previous step without data loss. Step 1 has no Back.

---

## Section 3: Dashboard

Fetches in parallel on mount:
- `GET /v1/vendors/me/products` → derive total product count and pending-review count
- `GET /v1/vendors/me/orders?limit=5` → derive pending-action count and return-pending count; also used for Recent Orders table

**3 stat cards (row):**

| Card | Derived from |
|---|---|
| Total Products | `products` response total count |
| Orders to Process | orders with status `CONFIRMED` or `PACKED` |
| Pending Returns | orders with status `RETURN_REQUESTED` |

Stat card skeleton: `animate-pulse h-24 rounded-xl bg-[#F0F0F0]` while loading.

**Recent Orders table:** Last 5 orders — short order ID (last 8 chars uppercased), date, status badge, amount via `formatPaise`. Link "View All →" to `/vendor/orders`.

**Quick actions:** "Add New Product" → `/vendor/products/new`, "View All Orders" → `/vendor/orders`.

---

## Section 4: Products

**List** (`/vendor/products`)
- Tab filters: All · Pending Review · Approved · Rejected (maps to `ProductStatus` enum values)
- Debounced search input (400ms, `GET /v1/vendors/me/products?search=...&status=...`)
- 20 per page with prev/next pagination controls
- Product cards in responsive grid (1 col mobile, 2 col sm, 3 col lg):
  - Name, status badge, category name, variant count, price range (min `pricePaise` formatted via `formatPaise`)
  - Edit button → `/vendor/products/[id]/edit`
  - Delete button → inline confirm ("Delete product?" + Confirm/Cancel) — no modal
  - Rejected products: `rejectionReason` shown in red callout below the card name
- Empty state: icon + "No products yet. Add your first saree." + "Add Product" button
- Skeleton: 6 placeholder cards while loading

**Create Product** (`/vendor/products/new`)

Fetches `GET /v1/catalog/categories` for the category dropdown on mount.

Fields (maps directly to `CreateProductDto`):
- Name (required)
- Description (required, textarea)
- Category (required, select from categories API)
- Fabric (optional)
- Region (optional)
- Occasion (optional, comma-separated input → split to `string[]` on submit)
- Tags (optional, comma-separated input → split to `string[]` on submit)
- Weaver Story (optional, textarea, maps to `weaverStory`)
- GI Tag (optional, maps to `giTag`)
- HSN Code (optional, maps to `hsnCode`)

Variants section (`<VariantEditor>`): dynamic rows, minimum 1. "Add Variant" appends a row.
- Per row: Name (required), SKU (required), Color (optional), Price in ₹ (required, × 100 → `pricePaise`), MRP in ₹ (required, × 100 → `mrpPaise`), Weight g (optional → `weightGrams`), Stock Qty (optional → `quantity`)
- Delete row button disabled when only 1 row remains

Submit → `POST /v1/vendors/me/products` → on success redirect to `/vendor/products` with success flash.

**Edit Product** (`/vendor/products/[id]/edit`)

Fetches `GET /v1/vendors/me/products` then finds by `id` to pre-populate form. Submit → `PATCH /v1/vendors/me/products/:id`. Same field layout as create. Prices pre-populated as ₹ (divide stored paise by 100 for display).

---

## Section 5: Orders

**List** (`/vendor/orders`)
- Tab filters: All · Confirmed · Packed · Shipped · Delivered
- `GET /v1/vendors/me/orders?status=...&page=1&limit=20`
- Expandable cards (click header row to toggle):
  - Collapsed: short order ID, date, item count, total (formatPaise), status badge
  - Expanded: list of items (name, variant, qty, unit price); tracking number if available
- Action buttons by status:
  - `CONFIRMED` → "Mark Packed" (`POST /v1/vendors/me/orders/:id/advance`)
  - `PACKED` → "Mark Shipped" (`POST /v1/vendors/me/orders/:id/ship`)
  - `SHIPPED` / `DELIVERED` → read-only, no action button
- After action: refetch the list
- Status badge color pairs: CONFIRMED=yellow, PACKED=purple, SHIPPED=indigo, DELIVERED=green (matches buyer orders page pattern)

---

## Section 6: Returns

**List** (`/vendor/returns`)
- Tab 1 "Pending": `GET /v1/vendors/me/orders?status=RETURN_REQUESTED`
- Tab 2 "History": `GET /v1/vendors/me/orders?status=RETURN_APPROVED` + `GET /v1/vendors/me/orders?status=RETURN_REJECTED` merged
- Cards: order ID, date, amount, order status badge
- Pending cards: "Approve" button + "Reject" button
  - Approve: `POST /v1/vendors/me/orders/:id/return/approve` → remove card from list
  - Reject: opens inline reason input below the card → submit `POST /v1/vendors/me/orders/:id/return/reject` with `{ reason }` → remove card from list
- History cards: read-only with outcome badge
- Empty state: "No pending return requests."

---

## Section 7: Profile

**`/vendor/profile`** — uses `useVendor` for initial data.

Editable section → `PATCH /v1/vendors/me`:
- Business Name (maps to `businessName`)
- About (textarea, maps to `about`)
- Return Policy (textarea, maps to `returnPolicy`)

Read-only section — KYC:
- GSTIN (grayed input or plain text, from `vendor.gstin`)
- PAN (grayed input, from `vendor.pan`)

Read-only section — Bank Account (from `vendor.bankAccounts[0]`):
- Bank Name
- Account number masked as `••••` + last 4 digits (frontend masking only)
- Verified badge: green "Verified" if `isVerified`, else gray "Pending Verification"

Save button → inline success/error message below form.

---

## API Reference

| Action | Method | Endpoint |
|---|---|---|
| Get vendor profile | GET | `/v1/vendors/me` |
| Apply as vendor | POST | `/v1/vendors/apply` |
| Update vendor profile | PATCH | `/v1/vendors/me` |
| List own products | GET | `/v1/vendors/me/products` |
| Create product | POST | `/v1/vendors/me/products` |
| Update product | PATCH | `/v1/vendors/me/products/:id` |
| Delete product | DELETE | `/v1/vendors/me/products/:id` |
| List own orders | GET | `/v1/vendors/me/orders` |
| Advance order status | POST | `/v1/vendors/me/orders/:id/advance` |
| Create Shiprocket shipment | POST | `/v1/vendors/me/orders/:id/ship` |
| Approve return | POST | `/v1/vendors/me/orders/:id/return/approve` |
| Reject return | POST | `/v1/vendors/me/orders/:id/return/reject` |
| List categories | GET | `/v1/catalog/categories` |

---

## Key Constraints

- No `any` — TypeScript strict throughout
- Money always stored/transmitted as integer paise; `formatPaise()` from `@sario/ui` for display
- `apiFetch` from `@/lib/api` for all API calls (attaches `credentials: "include"` + Content-Type)
- No external UI libraries beyond existing stack (Tailwind, shadcn/ui tokens)
- Mobile-first — bottom tab nav on mobile, sidebar on desktop (`lg:` breakpoint)
- Skeleton loading states for data-heavy pages (not full-page spinners)
- No new backend endpoints required — frontend only

## Section 8: Product Image Upload

Vendors must be able to upload product images during create and edit. Images are stored in Cloudflare R2 (S3-compatible). The upload flow uses **presigned PUT URLs** so image bytes never pass through the API server.

### Backend

**Install:** `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` in `apps/api`.

**New files:**
- `apps/api/src/upload/upload.service.ts` — wraps `S3Client`, generates presigned PUT URLs and deletes objects
- `apps/api/src/upload/upload.module.ts` — exports `UploadService`
- `apps/api/src/catalog/product-image.controller.ts` — image CRUD routes, registered in `CatalogModule`

**Env vars (already in `.env.example`):** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

**API endpoints:**

| Method | Path | Purpose |
|---|---|---|
| POST | `/v1/vendors/me/products/:id/images/presign` | Return presigned PUT URL + public URL |
| POST | `/v1/vendors/me/products/:id/images` | Save `ProductImage` record after upload |
| DELETE | `/v1/vendors/me/products/:id/images/:imageId` | Delete record + R2 object |
| PATCH | `/v1/vendors/me/products/:id/images/:imageId/primary` | Set image as primary (unsets others) |

**Presign request body:** `{ filename: string; contentType: string }` — returns `{ presignedUrl: string; publicUrl: string; key: string }`.

**Key format:** `products/{productId}/{timestamp}-{filename}`. Content-type restricted to `image/jpeg`, `image/png`, `image/webp`. Max size enforced client-side (5 MB).

### Frontend

The product form gains an **Images** section below Variants:

- "Upload Images" file input (hidden), triggered by a styled button. Accepts `image/jpeg,image/png,image/webp`, multiple, max 5 total.
- On file selection: immediately upload each file — call presign → `PUT` to R2 → call save endpoint → add to image list.
- Show grid of uploaded image thumbnails with:
  - Delete button (calls DELETE endpoint, removes from list)
  - "Set Primary" badge / button (calls PATCH primary endpoint)
  - Primary image marked with a gold border + "Primary" chip
- Upload progress indicator per file (simple spinner on the thumbnail slot).
- Edit mode: pre-load existing images from the product fetch.

---

## Section 9: Vendor Attribution on Storefront Cards

Product cards on the home page and search results do not currently show which vendor sells each product. Adding "Sold by [name]" links these surfaces to the vendor store page and makes the multi-vendor nature of the platform visible to buyers.

### Backend change — `product.service.ts` `approveAndIndex`

Add `vendorName` and `vendorSlug` to the Meilisearch document. The Prisma query in `approveAndIndex` must include the vendor:

```ts
include: {
  variants: { select: { pricePaise: true } },
  images: { where: { isPrimary: true }, take: 1 },
  vendor: { select: { businessName: true, slug: true } },   // add this
},
```

Then add to the `search.upsert` call:

```ts
vendorName: product.vendor.businessName,
vendorSlug: product.vendor.slug,
```

### Frontend changes

**`apps/web/src/app/(storefront)/search/page.tsx`**

Add to `SearchHit` interface:
```ts
vendorName?: string;
vendorSlug?: string;
```

Add below product name in each card:
```tsx
{hit.vendorName && hit.vendorSlug && (
  <Link href={`/weavers/${hit.vendorSlug}`} className="text-[10px] text-[#9B9B9B] hover:text-primary truncate">
    {hit.vendorName}
  </Link>
)}
```

**`apps/web/src/app/(storefront)/page.tsx`**

Same pattern on featured and new-arrivals product cards. The `Product` interface (from `/catalog/featured` and `/catalog/search`) needs `vendorName` and `vendorSlug` added.

Note: existing products already in the Meilisearch index will not have `vendorName`/`vendorSlug` until they are re-indexed. Re-indexing is out of scope here — the field will appear for newly approved products. A one-time re-index script can be run separately.

---

## Out of Scope

- Vendor analytics or revenue charts beyond the 3 dashboard stat cards
- Buyer messaging or chat
- Re-indexing existing Meilisearch documents (vendor attribution only applies to newly approved products until a separate migration runs)
