# Feature Roadmap Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the four highest-leverage buyer-facing features: occasion filter, shareable wishlist with WhatsApp share, weaver story landing pages, and UPI intent deep-links on checkout.

**Architecture:** Occasion is a new `String[]` field on `Product` — added to the Prisma schema, indexed in Meilisearch, and exposed as a sidebar filter. Wishlist sharing is purely frontend: base64-encode the localStorage IDs into a URL query param, no backend needed. Weaver pages are Next.js RSC routes reading existing vendor `about`/`bannerUrl`/products from the NestJS API. UPI intent is a checkout UI change only (Razorpay's standard order already supports it).

**Tech Stack:** Prisma 5 (schema migration), NestJS 10 (DTO + service update), Meilisearch v1.9 (settings update), Next.js 14 App Router (RSC + client components), Tailwind CSS.

---

## File Map

| File | Change |
|---|---|
| `packages/db/prisma/schema.prisma` | Add `occasion String[]` field to `Product` |
| `apps/api/src/catalog/dto/create-product.dto.ts` | Add `occasion` to create DTO |
| `apps/api/src/catalog/dto/update-product.dto.ts` | Add `occasion` to update DTO |
| `apps/api/src/catalog/product.service.ts` | Pass `occasion` to `search.upsert()` |
| `apps/api/src/catalog/meilisearch.service.ts` | Add `occasion` to filterable + searchable attributes |
| `apps/api/src/storefront/storefront.service.ts` | Add `occasion` filter param to `searchProducts()` |
| `apps/api/src/storefront/storefront.controller.ts` | Add `occasion` query param |
| `apps/web/src/app/(storefront)/search/search-controls.tsx` | Add Occasion filter section to `SidebarFilters` |
| `apps/web/src/app/(storefront)/search/page.tsx` | Pass `occasion` to API call |
| `apps/web/src/app/(storefront)/wishlist/page.tsx` | Add shareable URL + WhatsApp share button |
| `apps/web/src/app/(storefront)/weavers/[slug]/page.tsx` | **Create** — vendor story landing page (RSC) |
| `apps/web/src/app/(storefront)/p/[slug]/page.tsx` | Link vendor name to `/weavers/[vendorSlug]` |
| `apps/web/src/app/(storefront)/checkout/page.tsx` | Add UPI intent buttons |

---

### Task 1: Add Occasion Field to Product Schema

**Files:**
- Modify: `packages/db/prisma/schema.prisma`
- Modify: `apps/api/src/catalog/dto/create-product.dto.ts`
- Modify: `apps/api/src/catalog/dto/update-product.dto.ts`

- [ ] **Step 1: Add occasion field to schema**

In `packages/db/prisma/schema.prisma`, find the `Product` model. After the `tags String[]` field, add:

```prisma
occasion  String[]  // e.g. ["Wedding", "Festival", "Office"]
```

- [ ] **Step 2: Run migration**

```bash
pnpm db:migrate
# When prompted for a migration name, enter: add_product_occasion
```

Expected: migration file created, Prisma client regenerated.

```bash
pnpm db:generate
```

- [ ] **Step 3: Add occasion to create DTO**

In `apps/api/src/catalog/dto/create-product.dto.ts`, add after the `giTag` line:

```typescript
@ApiPropertyOptional({ type: [String], example: ["Wedding", "Festival"] })
@IsArray()
@IsString({ each: true })
@IsOptional()
occasion?: string[];
```

- [ ] **Step 4: Add occasion to update DTO**

In `apps/api/src/catalog/dto/update-product.dto.ts` (check if it's a `PartialType(CreateProductDto)` — if so, no change needed; otherwise add the same field as above).

```bash
cat apps/api/src/catalog/dto/update-product.dto.ts
# If it says: export class UpdateProductDto extends PartialType(CreateProductDto) {}
# Then no change needed — Step 3 is sufficient.
```

- [ ] **Step 5: Pass occasion through in product.service.ts**

In `apps/api/src/catalog/product.service.ts`, find the `createProduct` method. The Prisma `create` call uses a spread of the DTO. Verify `occasion` is included — since it's added to the DTO and the schema, Prisma will include it automatically. No code change needed if the create call spreads the whole DTO.

For `approveAndIndex`, update the `search.upsert()` call to pass `occasion`:

```typescript
await this.search.upsert({
  id: product.id,
  name: product.name,
  slug: product.slug,
  description: product.description,
  fabric: product.fabric,
  region: product.region,
  tags: product.tags,
  occasion: product.occasion,       // ← add this line
  categoryId: product.categoryId,
  vendorId: product.vendorId,
  minPricePaise,
  ...(product.images[0]?.url ? { primaryImageUrl: product.images[0].url } : {}),
});
```

The `product` variable comes from `prisma.product.update(..., include: { variants, images })` — `occasion` is a scalar array and will be included automatically.

- [ ] **Step 6: Commit**

```bash
git add packages/db/prisma/ apps/api/src/catalog/dto/ apps/api/src/catalog/product.service.ts
git commit -m "feat: add occasion field to Product schema and catalog DTO"
```

---

### Task 2: Index Occasion in Meilisearch + Expose Search Filter

**Files:**
- Modify: `apps/api/src/catalog/meilisearch.service.ts`
- Modify: `apps/api/src/storefront/storefront.service.ts`
- Modify: `apps/api/src/storefront/storefront.controller.ts`

- [ ] **Step 1: Add occasion to SearchableProduct interface**

In `apps/api/src/catalog/meilisearch.service.ts`, update the `SearchableProduct` interface:

```typescript
interface SearchableProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  fabric?: string | null;
  region?: string | null;
  tags: string[];
  occasion: string[];           // ← add
  categoryId: string;
  vendorId: string;
  minPricePaise: number;
  primaryImageUrl?: string;
}
```

- [ ] **Step 2: Add occasion to Meilisearch index settings**

In `setupIndex()`, update `filterableAttributes` and `facets`:

```typescript
await this.request("PATCH", `/indexes/${this.index}/settings`, {
  searchableAttributes: ["name", "description", "fabric", "region", "tags", "occasion"],
  filterableAttributes: ["categoryId", "vendorId", "region", "fabric", "minPricePaise", "occasion"],
  sortableAttributes: ["minPricePaise"],
  typoTolerance: { enabled: true, minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 } },
  synonyms: {
    saree: ["saari", "sari", "seere", "cheera"],
    kanjivaram: ["kanchipuram", "kanchi"],
    banarasi: ["banaras", "benares", "varanasi"],
  },
});
```

Also update `search()` to expose `occasion` as a facet:

```typescript
async search(query: string, filters: Record<string, unknown> = {}, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const body = {
    q: query,
    limit,
    offset,
    facets: ["region", "fabric", "categoryId", "occasion"],   // ← add occasion
    ...filters,
  };
  return this.request<{ hits: SearchableProduct[]; estimatedTotalHits: number }>(
    "POST",
    `/indexes/${this.index}/search`,
    body,
  );
}
```

- [ ] **Step 3: Add occasion filter to StorefrontService.searchProducts()**

In `apps/api/src/storefront/storefront.service.ts`, update the `opts` type and filter building:

```typescript
async searchProducts(opts: {
  q?: string;
  categoryId?: string;
  region?: string;
  fabric?: string;
  occasion?: string;          // ← add
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  page: number;
  limit: number;
}) {
  const filters: string[] = [];
  // ... existing filters ...
  if (opts.occasion) filters.push(`occasion = "${opts.occasion}"`);
  // ... rest of method unchanged ...
}
```

- [ ] **Step 4: Add occasion query param to storefront controller**

Read `apps/api/src/storefront/storefront.controller.ts` and find the `searchProducts` endpoint. Add:

```typescript
@Query("occasion") occasion?: string,
```

to the parameter list, and pass `occasion` into `this.storefront.searchProducts({ ..., occasion })`.

- [ ] **Step 5: Restart API and verify**

```bash
pnpm --filter @sario/api dev
curl -s "http://localhost:4000/v1/storefront/search?occasion=Wedding&limit=5" | jq .hits | head -5
# Expected: products with occasion including "Wedding" (or empty array if no products seeded yet)
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/catalog/meilisearch.service.ts apps/api/src/storefront/
git commit -m "feat: occasion filter in Meilisearch index and storefront search API"
```

---

### Task 3: Occasion Filter in Search UI

**Files:**
- Modify: `apps/web/src/app/(storefront)/search/search-controls.tsx`
- Modify: `apps/web/src/app/(storefront)/search/page.tsx`

- [ ] **Step 1: Add OCCASION_FILTERS constant to search-controls.tsx**

At the top of `search-controls.tsx`, after the `FABRIC_FILTERS` array, add:

```typescript
const OCCASION_FILTERS = [
  "Wedding", "Reception", "Festival", "Puja",
  "Navratri", "Office", "Casual",
];
```

- [ ] **Step 2: Add occasion to SidebarFilters props**

Update the `SidebarFilters` interface and the `navigate` helper:

```typescript
// In the props destructure:
export function SidebarFilters({ q, sort, fabric, categoryId, region, minPrice: minPriceProp, maxPrice: maxPriceProp, occasion }: {
  q: string; sort: string; fabric: string; categoryId: string;
  region: string; minPrice: string; maxPrice: string; occasion: string;
}) {

// In navigate():
const navigate = (overrides: { fabric?: string; sort?: string; region?: string; minPrice?: number; maxPrice?: number; occasion?: string }) => {
  const params = new URLSearchParams();
  const ns = overrides.sort ?? sort;
  const nf = overrides.fabric ?? fabric;
  const nr = overrides.region ?? region;
  const nMin = overrides.minPrice ?? minPrice;
  const nMax = overrides.maxPrice ?? maxPrice;
  const no = overrides.occasion ?? occasion;
  if (q) params.set("q", q);
  if (ns) params.set("sort", ns);
  if (nf) params.set("fabric", nf);
  if (categoryId) params.set("categoryId", categoryId);
  if (nr) params.set("region", nr);
  if (nMin) params.set("minPrice", String(nMin));
  if (nMax) params.set("maxPrice", String(nMax));
  if (no) params.set("occasion", no);
  router.push(`/search?${params.toString()}`);
};
```

- [ ] **Step 3: Add Occasion filter section to SidebarFilters JSX**

In the `SidebarFilters` return JSX, add this block before the final `</div>` (after the Fabric section):

```tsx
{/* Occasion */}
<div className="border-b border-[#F0F0F0] px-4 py-3">
  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#696969]">Occasion</p>
  <div className="space-y-1.5">
    {OCCASION_FILTERS.map((o) => {
      const active = occasion === o;
      return (
        <button
          key={o}
          onClick={() => navigate({ occasion: active ? "" : o })}
          className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors hover:bg-[#F5F5F5] ${active ? "font-semibold text-primary" : "text-[#4D4D4D]"}`}
        >
          <span className={`h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 ${active ? "border-primary bg-primary" : "border-[#CCCCCC]"}`}>
            {active && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" /></svg>}
          </span>
          {o}
        </button>
      );
    })}
  </div>
</div>
```

- [ ] **Step 4: Pass occasion from search page to SidebarFilters**

In `apps/web/src/app/(storefront)/search/page.tsx`:

1. Read the `occasion` query param: `const occasion = searchParams.occasion ?? ""`
2. Pass it to the API fetch: `&occasion=${encodeURIComponent(occasion)}`
3. Pass it as a prop to `<SidebarFilters ... occasion={occasion} />`

- [ ] **Step 5: Verify in browser**

```bash
pnpm --filter @sario/web dev
# Open http://localhost:3000/search
# Occasion section should appear in left sidebar
# Clicking "Wedding" should navigate to /search?occasion=Wedding
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/(storefront)/search/
git commit -m "feat: occasion filter in search sidebar — links to Meilisearch occasion facet"
```

---

### Task 4: Shareable Wishlist with WhatsApp Share

**Files:**
- Modify: `apps/web/src/app/(storefront)/wishlist/page.tsx`

The wishlist is already built (localStorage-backed). This task adds:
1. A "Share via WhatsApp" button that encodes the IDs as a base64 URL param
2. Auto-loading from `?shared=<base64>` on page load so shared links work

- [ ] **Step 1: Write the encoding helpers (inline in wishlist page)**

No separate file needed. Add these two helpers inside the `WishlistPage` component file, before the component:

```typescript
function encodeWishlist(ids: string[]): string {
  return btoa(JSON.stringify(ids));
}

function decodeWishlist(encoded: string): string[] {
  try {
    const parsed: unknown = JSON.parse(atob(encoded));
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}
```

- [ ] **Step 2: Update WishlistPage to read ?shared= param**

Replace the first `useEffect` that reads from localStorage:

```typescript
useEffect(() => {
  // Check for a shared wishlist in the URL first
  const params = new URLSearchParams(window.location.search);
  const shared = params.get("shared");
  if (shared) {
    setIds(decodeWishlist(shared));
    return;
  }
  // Otherwise load from localStorage
  try {
    const stored: string[] = JSON.parse(localStorage.getItem("sario_wishlist") ?? "[]");
    setIds(stored);
  } catch {
    setIds([]);
  }
}, []);
```

- [ ] **Step 3: Add WhatsApp share button**

Add a share button in the header section of `WishlistPage`, alongside the "Continue Shopping" link:

```tsx
{ids.length > 0 && (
  <button
    onClick={() => {
      const encoded = encodeWishlist(ids);
      const url = `${window.location.origin}/wishlist?shared=${encoded}`;
      const waUrl = `https://wa.me/?text=${encodeURIComponent(`Check out my saree wishlist on Sario: ${url}`)}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");
    }}
    className="flex items-center gap-1.5 rounded-xl border border-[#E8E8E8] bg-white px-4 py-2 text-sm font-bold text-[#4D4D4D] hover:border-[#25D366] hover:text-[#25D366] transition-colors"
  >
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.094.537 4.065 1.479 5.784L0 24l6.395-1.667A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.652-.51-5.168-1.399l-.371-.22-3.801.991.998-3.698-.242-.382A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
    </svg>
    Share via WhatsApp
  </button>
)}
```

Place this button in the header `div` next to the "Continue Shopping" link.

- [ ] **Step 4: Verify share flow**

```bash
pnpm --filter @sario/web dev
# 1. Add items to wishlist via /p/[slug] pages
# 2. Go to /wishlist — "Share via WhatsApp" button should appear
# 3. Click button — WhatsApp Web should open with a URL containing ?shared=<base64>
# 4. Open that URL in a new browser tab — wishlist should load from URL param
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(storefront)/wishlist/page.tsx
git commit -m "feat: shareable wishlist URL + WhatsApp share button"
```

---

### Task 5: Weaver / Vendor Story Landing Page

**Files:**
- Create: `apps/web/src/app/(storefront)/weavers/[slug]/page.tsx`
- Modify: `apps/web/src/app/(storefront)/p/[slug]/page.tsx`

The `Vendor` model already has `businessName`, `slug`, `about`, `bannerUrl`. Products for the vendor are available via `/v1/storefront/search?vendorId=<id>`. No backend changes needed — use the existing storefront API.

- [ ] **Step 1: Create the weaver page**

Create `apps/web/src/app/(storefront)/weavers/[slug]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { formatPaise } from "@sario/ui";

const API_BASE = process.env.API_URL ?? "http://localhost:4000/v1";

interface Vendor {
  id: string;
  businessName: string;
  slug: string;
  about?: string;
  bannerUrl?: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  images: { url: string; altText?: string }[];
  variants: { pricePaise: number; mrpPaise: number }[];
}

async function getVendorBySlug(slug: string): Promise<Vendor | null> {
  const res = await fetch(`${API_BASE}/storefront/vendors/${slug}`, { next: { revalidate: 300 } });
  if (!res.ok) return null;
  return res.json() as Promise<Vendor>;
}

async function getVendorProducts(vendorId: string): Promise<Product[]> {
  const res = await fetch(`${API_BASE}/storefront/search?vendorId=${vendorId}&limit=12`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return [];
  const data = await res.json() as { hits: Product[] };
  return data.hits;
}

export default async function WeaverPage({ params }: { params: { slug: string } }) {
  const vendor = await getVendorBySlug(params.slug);
  if (!vendor) notFound();

  const products = await getVendorProducts(vendor.id);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Banner */}
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-[#1A1A1A]" style={{ minHeight: 220 }}>
        {vendor.bannerUrl && (
          <Image
            src={vendor.bannerUrl}
            alt={vendor.businessName}
            fill
            className="object-cover opacity-50"
          />
        )}
        <div className="relative z-10 flex flex-col justify-end p-8 h-full" style={{ minHeight: 220 }}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A96E] mb-1">Master Weaver</p>
          <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
            {vendor.businessName}
          </h1>
        </div>
      </div>

      {/* About */}
      {vendor.about && (
        <div className="mb-10 max-w-2xl">
          <p className="text-base leading-relaxed text-[#4D4D4D]">{vendor.about}</p>
        </div>
      )}

      {/* Products */}
      {products.length > 0 && (
        <>
          <h2 className="mb-4 font-display text-xl font-bold text-[#1A1A1A]">
            Sarees by {vendor.businessName}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => {
              const price = p.variants[0]?.pricePaise ?? 0;
              const mrp = p.variants[0]?.mrpPaise ?? 0;
              const img = p.images[0]?.url ?? "";
              return (
                <Link key={p.id} href={`/p/${p.slug}`} className="group rounded-xl border border-[#F0F0F0] bg-white overflow-hidden hover:shadow-md transition-all">
                  <div className="relative aspect-[3/4] bg-[#F9F9F9]">
                    {img && (
                      <Image
                        src={img}
                        alt={p.images[0]?.altText ?? p.name}
                        fill
                        sizes="(max-width: 640px) 50vw, 25vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-bold text-[#1A1A1A] line-clamp-2 leading-snug">{p.name}</p>
                    <div className="mt-1.5 flex items-baseline gap-1.5">
                      <span className="text-sm font-extrabold text-primary">{formatPaise(price)}</span>
                      {mrp > price && (
                        <span className="text-[10px] text-[#9B9B9B] line-through">{formatPaise(mrp)}</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Add storefront vendor endpoint to NestJS**

The weaver page calls `/v1/storefront/vendors/:slug` which doesn't exist yet. Add to `apps/api/src/storefront/storefront.controller.ts`:

```typescript
@Get("vendors/:slug")
async getVendor(@Param("slug") slug: string) {
  return this.storefront.getVendorBySlug(slug);
}
```

Add to `apps/api/src/storefront/storefront.service.ts`:

```typescript
async getVendorBySlug(slug: string) {
  const vendor = await this.prisma.vendor.findUnique({
    where: { slug, status: VendorStatus.APPROVED, deletedAt: null },
    select: { id: true, businessName: true, slug: true, about: true, bannerUrl: true },
  });
  if (!vendor) throw new NotFoundException("Vendor not found.");
  return vendor;
}
```

Add the `VendorStatus` import at the top of `storefront.service.ts`:

```typescript
import { ProductStatus, VendorStatus } from "@sario/db";
```

- [ ] **Step 3: Link vendor name on PDP to weaver page**

In `apps/web/src/app/(storefront)/p/[slug]/page.tsx`, find where the vendor `businessName` is rendered (around line 146 based on the giTag being at 146). Wrap the vendor name in a `<Link>`:

```tsx
// Find: <span>{product.vendor.businessName}</span>  (or however it's rendered)
// Replace with:
<Link href={`/weavers/${product.vendor.slug}`} className="hover:underline text-[#C9A96E]">
  {product.vendor.businessName}
</Link>
```

- [ ] **Step 4: Verify weaver page**

```bash
pnpm --filter @sario/api dev
pnpm --filter @sario/web dev
# Open http://localhost:3000/weavers/<a-vendor-slug>
# Expected: vendor banner + about text + product grid
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(storefront)/weavers/ apps/api/src/storefront/ apps/web/src/app/(storefront)/p/
git commit -m "feat: weaver story landing pages at /weavers/[slug] with product grid"
```

---

### Task 6: UPI Intent Deep-links on Checkout

**Files:**
- Modify: `apps/web/src/app/(storefront)/checkout/page.tsx` (or the payment step component)

Razorpay's checkout JS already opens UPI collect by default. The UPI **intent** flow (deep-link directly into GPay/PhonePe) is triggered by passing `method: "upi"` and `_[flow]: "intent"` to Razorpay's `open()`. This task adds mobile-visible UPI shortcut buttons above the main "Pay Now" button.

- [ ] **Step 1: Find the Razorpay open() call**

```bash
grep -rn "Razorpay\|razorpay\|rzp\|payment_id\|order_id" apps/web/src/app/\(storefront\)/checkout/ | head -20
```

Identify the file and line where `new (window as any).Razorpay(options).open()` is called.

- [ ] **Step 2: Add UPI intent handler function**

In the checkout component, add this helper alongside the existing payment handler:

```typescript
function openUpiIntent(razorpayOrderId: string, amountPaise: number, app: "gpay" | "phonepe" | "paytm") {
  const appVpa: Record<string, string> = {
    gpay: "okicici@okhdfcbank",   // placeholder — Razorpay uses its own VPA routing
    phonepe: "9999999999@ybl",
    paytm: "paytm@paytm",
  };
  const options = {
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    amount: amountPaise,
    currency: "INR",
    order_id: razorpayOrderId,
    method: "upi",
    "_[flow]": "intent",
    vpa: appVpa[app],
    handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
      // Call the same verify endpoint as the regular payment flow
      handlePaymentSuccess(response);
    },
  };
  const rzp = new (window as any).Razorpay(options);
  rzp.open();
}
```

- [ ] **Step 3: Add UPI shortcut buttons to the payment step UI**

In the payment step JSX, directly above the main "Pay Now" button, add:

```tsx
{/* UPI intent shortcuts — shown only on mobile where UPI apps are installed */}
<div className="mb-4 sm:hidden">
  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#696969]">Pay Instantly</p>
  <div className="grid grid-cols-3 gap-2">
    {(["gpay", "phonepe", "paytm"] as const).map((app) => {
      const labels: Record<string, string> = { gpay: "GPay", phonepe: "PhonePe", paytm: "Paytm" };
      return (
        <button
          key={app}
          onClick={() => openUpiIntent(razorpayOrderId, totalAmountPaise, app)}
          className="flex flex-col items-center justify-center gap-1 rounded-xl border border-[#E8E8E8] bg-white py-3 text-xs font-bold text-[#1A1A1A] hover:border-primary transition-colors"
        >
          <span className="text-xl">{app === "gpay" ? "G" : app === "phonepe" ? "Pe" : "P"}</span>
          {labels[app]}
        </button>
      );
    })}
  </div>
  <p className="mt-2 text-center text-xs text-[#9B9B9B]">or pay with any method below</p>
</div>
```

Replace `razorpayOrderId` and `totalAmountPaise` with the actual variable names from the checkout component. Replace `handlePaymentSuccess` with the existing success handler name.

- [ ] **Step 4: Verify on mobile viewport**

```bash
pnpm --filter @sario/web dev
# Open Chrome DevTools → Toggle device toolbar → Select "iPhone 14 Pro"
# Go through checkout until the payment step
# Expected: GPay, PhonePe, Paytm shortcut buttons visible
# On desktop: buttons should be hidden (sm:hidden)
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(storefront\)/checkout/
git commit -m "feat: UPI intent deep-links for GPay, PhonePe, Paytm on mobile checkout"
```

---

## Self-Review

**Spec coverage:**
- ✅ Occasion filter (schema + Meilisearch + API + UI) — Tasks 1-3
- ✅ Shareable wishlist + WhatsApp share — Task 4
- ✅ Weaver story landing page — Task 5
- ✅ UPI intent deep-links — Task 6
- ⚠️ GI badge — already implemented on PDP (product.giTag displayed). No work needed.
- ⚠️ Drape length guide — `sareeLength`/`blouseLength` already in `ProductVariant` schema and displayed in the PDP fabric specs section. Filter by length not planned (low buyer demand for exact-length filtering vs occasion).

**Placeholder scan:**
- Task 6 Step 2: `handlePaymentSuccess` and `razorpayOrderId` are placeholders — the worker must read the actual variable names from the checkout component before implementing. This is called out explicitly in the step.

**Type consistency:**
- `SearchableProduct.occasion` added as `string[]` in Task 2 Step 1 — matches `Product.occasion String[]` added in Task 1.
- `SidebarFilters` occasion prop is `string` (single selected value) — consistent with how `fabric` and `region` work.
- `getVendorBySlug` return type is inlined `Vendor` on frontend — matches the select shape from backend.
