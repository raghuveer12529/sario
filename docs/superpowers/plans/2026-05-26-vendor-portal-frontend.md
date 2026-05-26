# Vendor Portal Frontend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete vendor portal frontend at `apps/web/src/app/vendor/` including layout, onboarding, dashboard, products (with image upload), orders, returns, and profile — plus vendor attribution on storefront cards.

**Architecture:** Next.js App Router client components under `/vendor/*`, isolated from the `(storefront)` route group. Auth guard in `layout.tsx` enforces vendor status routing. All API calls via existing `apiFetch` utility with cookie JWT. Backend additions: single-product GET, expanded variant fields, R2 presigned-URL upload service + image CRUD endpoints, vendor fields in Meilisearch.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Tailwind CSS, `apiFetch` from `@/lib/api`, `useAuth` from `@/hooks/use-auth`, `useVendor` from `@/hooks/use-vendor`, `formatPaise` from `@sario/ui`, NestJS + Prisma + `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (backend tasks).

---

## File Map

**Create (frontend):**
- `apps/web/src/app/vendor/_components/vendor-nav.tsx` — sidebar + mobile bottom tabs
- `apps/web/src/app/vendor/_components/stat-card.tsx` — dashboard KPI card with skeleton
- `apps/web/src/app/vendor/_components/variant-editor.tsx` — dynamic variant rows for product form
- `apps/web/src/app/vendor/_components/product-form.tsx` — shared create/edit product form
- `apps/web/src/app/vendor/_components/order-row.tsx` — expandable order card
- `apps/web/src/app/vendor/_components/return-row.tsx` — return request card with inline reject
- `apps/web/src/app/vendor/layout.tsx` — auth guard + sidebar shell
- `apps/web/src/app/vendor/page.tsx` — dashboard
- `apps/web/src/app/vendor/onboarding/page.tsx` — 3-step wizard
- `apps/web/src/app/vendor/products/page.tsx` — product list
- `apps/web/src/app/vendor/products/new/page.tsx` — create product
- `apps/web/src/app/vendor/products/[id]/edit/page.tsx` — edit product
- `apps/web/src/app/vendor/orders/page.tsx` — orders queue
- `apps/web/src/app/vendor/returns/page.tsx` — return requests
- `apps/web/src/app/vendor/profile/page.tsx` — store profile

**Create (backend):**
- `apps/api/src/upload/upload.service.ts` — R2 `S3Client` wrapper, presigned PUT URL generation, object delete
- `apps/api/src/upload/upload.module.ts` — exports `UploadService`
- `apps/api/src/catalog/product-image.controller.ts` — presign, save, delete, set-primary image routes

**Modify (backend):**
- `apps/api/src/catalog/product.service.ts` — add `getForVendor`, expand `listForVendor` variant select, add vendor fields to `approveAndIndex`
- `apps/api/src/catalog/product.controller.ts` — add `GET /:id` route
- `apps/api/src/catalog/catalog.module.ts` — import `UploadModule`

**Modify (frontend storefront):**
- `apps/web/src/app/(storefront)/search/page.tsx` — add `vendorName`/`vendorSlug` to `SearchHit`, render "Sold by" on cards
- `apps/web/src/app/(storefront)/page.tsx` — add vendor name to featured + new-arrivals cards

---

## Task 1: Backend — expand product data + add single-product GET

**Files:**
- Modify: `apps/api/src/catalog/product.service.ts`
- Modify: `apps/api/src/catalog/product.controller.ts`

- [ ] **Step 1: Add `getForVendor` method to `product.service.ts`**

Open `apps/api/src/catalog/product.service.ts`. Add this method after `listForVendor`:

```typescript
async getForVendor(vendorId: string, productId: string) {
  const product = await this.prisma.product.findUnique({
    where: { id: productId, deletedAt: null },
    include: {
      variants: { include: { inventory: { select: { quantity: true, reservedQuantity: true } } } },
      images: true,
      category: { select: { id: true, name: true } },
    },
  });
  if (!product) throw new NotFoundException("Product not found.");
  if (product.vendorId !== vendorId) throw new ForbiddenException("Not your product.");
  return product;
}
```

- [ ] **Step 2: Expand variant fields in `listForVendor`**

In the same file, find the `listForVendor` method. Change the `include` inside `findMany` from:

```typescript
include: { variants: { select: { pricePaise: true, inventory: true } }, images: { where: { isPrimary: true }, take: 1 } },
```

to:

```typescript
include: {
  variants: { include: { inventory: { select: { quantity: true, reservedQuantity: true } } } },
  images: { where: { isPrimary: true }, take: 1 },
  category: { select: { id: true, name: true } },
},
```

- [ ] **Step 3: Add vendor fields to `approveAndIndex`**

In `approveAndIndex`, change the Prisma `update` include from:

```typescript
include: { variants: { select: { pricePaise: true } }, images: { where: { isPrimary: true }, take: 1 } },
```

to:

```typescript
include: {
  variants: { select: { pricePaise: true } },
  images: { where: { isPrimary: true }, take: 1 },
  vendor: { select: { businessName: true, slug: true } },
},
```

And add to the `search.upsert` call:

```typescript
vendorName: product.vendor.businessName,
vendorSlug: product.vendor.slug,
```

- [ ] **Step 4: Add `GET /:id` route in `product.controller.ts`**

Open `apps/api/src/catalog/product.controller.ts`. Add after the `list` method:

```typescript
@Get(":id")
@ApiOperation({ summary: "Get a single vendor product by ID" })
getOne(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
  return this.productService.getForVendor(user.id, id);
}
```

- [ ] **Step 5: Typecheck the API**

```bash
pnpm --filter @sario/api typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/catalog/product.service.ts apps/api/src/catalog/product.controller.ts
git commit -m "feat(api): expand vendor product fields, add single-product GET, index vendor attribution"
```

---

## Task 2: VendorNav component

**Files:**
- Create: `apps/web/src/app/vendor/_components/vendor-nav.tsx`

- [ ] **Step 1: Create the file**

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import type { Vendor } from "@/hooks/use-vendor";

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}
function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}
function PackageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
    </svg>
  );
}
function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

const NAV_ITEMS = [
  { href: "/vendor", label: "Dashboard", Icon: GridIcon, exact: true },
  { href: "/vendor/products", label: "Products", Icon: TagIcon, exact: false },
  { href: "/vendor/orders", label: "Orders", Icon: PackageIcon, exact: false },
  { href: "/vendor/returns", label: "Returns", Icon: RefreshIcon, exact: false },
  { href: "/vendor/profile", label: "Profile", Icon: UserIcon, exact: false },
] as const;

export function VendorNav({ vendor }: { vendor: Vendor }) {
  const pathname = usePathname();
  const { logout } = useAuth();

  const isActive = (item: (typeof NAV_ITEMS)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-56 bg-white border-r border-[#F0F0F0] z-30">
        <div className="px-4 py-5 border-b border-[#F0F0F0]">
          <p className="text-base font-extrabold text-primary tracking-tight">Sario Vendor</p>
          <p className="mt-0.5 text-xs text-[#696969] truncate">{vendor.businessName}</p>
          <span className="mt-2 inline-block rounded-full bg-green-50 border border-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700 uppercase tracking-wide">
            Approved
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-[#4D4D4D] hover:bg-[#F5F5F5] font-medium"
                }`}
              >
                <item.Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-[#F0F0F0]">
          <button
            onClick={() => { void logout(); }}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOutIcon className="h-4 w-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex bg-white border-t border-[#F0F0F0] lg:hidden">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold transition-colors ${
                active ? "text-primary" : "text-[#9B9B9B]"
              }`}
            >
              <item.Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
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
git add apps/web/src/app/vendor/_components/vendor-nav.tsx
git commit -m "feat(vendor): add VendorNav sidebar + mobile bottom tabs"
```

---

## Task 3: Vendor layout — auth guard + shell

**Files:**
- Create: `apps/web/src/app/vendor/layout.tsx`

- [ ] **Step 1: Create the file**

```typescript
"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useVendor } from "@/hooks/use-vendor";
import { VendorNav } from "./_components/vendor-nav";

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading: authLoading, logout } = useAuth();
  const { vendor, loading: vendorLoading, error: vendorError } = useVendor();
  const router = useRouter();
  const pathname = usePathname();

  const isOnboarding = pathname === "/vendor/onboarding";
  const loading = authLoading || vendorLoading;

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || vendorError === "unauthorized") {
      router.push("/auth?next=/vendor");
      return;
    }
    if (!isOnboarding && (!vendor || vendor.status === "DRAFT")) {
      router.push("/vendor/onboarding");
    }
  }, [loading, isAuthenticated, vendor, vendorError, isOnboarding, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // Onboarding — no sidebar, just children
  if (isOnboarding && (!vendor || vendor.status === "DRAFT")) {
    return <>{children}</>;
  }

  if (!vendor || vendor.status === "DRAFT") return null; // redirect in progress

  if (vendor.status === "PENDING") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4">
        <div className="w-full max-w-md rounded-xl border border-[#F0F0F0] bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-50 text-3xl">⏳</div>
          <h1 className="text-xl font-extrabold text-[#1A1A1A]">Application Under Review</h1>
          <p className="mt-3 text-sm leading-relaxed text-[#696969]">
            The Sario team is reviewing your application. You&apos;ll be notified via email once approved — this typically takes 1–2 business days.
          </p>
        </div>
      </div>
    );
  }

  if (vendor.status === "SUSPENDED") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4">
        <div className="w-full max-w-md rounded-xl border border-[#F0F0F0] bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl">🚫</div>
          <h1 className="text-xl font-extrabold text-[#1A1A1A]">Account Suspended</h1>
          <p className="mt-3 text-sm leading-relaxed text-[#696969]">
            Your vendor account has been suspended. Please contact{" "}
            <a href="mailto:support@sario.in" className="text-primary hover:underline">support@sario.in</a>{" "}
            for assistance.
          </p>
          <button
            onClick={() => { void logout(); }}
            className="mt-6 rounded-xl border border-red-200 px-6 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // APPROVED — full sidebar layout
  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <VendorNav vendor={vendor} />
      <main className="lg:ml-56 pb-20 lg:pb-0">
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
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
git add apps/web/src/app/vendor/layout.tsx
git commit -m "feat(vendor): layout auth guard with status routing and sidebar shell"
```

---

## Task 4: Onboarding wizard

**Files:**
- Create: `apps/web/src/app/vendor/onboarding/page.tsx`

- [ ] **Step 1: Create the file**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface OnboardingData {
  businessName: string;
  about: string;
  returnPolicy: string;
  gstin: string;
  pan: string;
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifsc: string;
}

const EMPTY: OnboardingData = {
  businessName: "", about: "", returnPolicy: "",
  gstin: "", pan: "",
  accountHolder: "", bankName: "", accountNumber: "", confirmAccountNumber: "", ifsc: "",
};

const STEPS = ["Business Info", "KYC Details", "Bank Account"] as const;

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
              i < current ? "bg-primary text-white" :
              i === current ? "bg-primary text-white" :
              "bg-[#E8E8E8] text-[#9B9B9B]"
            }`}>
              {i < current ? "✓" : i + 1}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${
              i === current ? "text-primary" : "text-[#9B9B9B]"
            }`}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 mb-5 ${i < current ? "bg-primary" : "bg-[#E8E8E8]"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#4D4D4D]">{children}</label>;
}

function TextInput({ value, onChange, placeholder, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      {...rest}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-[#E8E8E8] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-primary transition-colors"
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-[#E8E8E8] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-primary transition-colors resize-none"
    />
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(EMPTY);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field: keyof OnboardingData) => (v: string) =>
    setData((prev) => ({ ...prev, [field]: v }));

  const validateStep = (): string => {
    if (step === 0 && !data.businessName.trim()) return "Business name is required.";
    if (step === 2) {
      if (!data.accountHolder.trim()) return "Account holder name is required.";
      if (!data.bankName.trim()) return "Bank name is required.";
      if (!/^\d{9,18}$/.test(data.accountNumber)) return "Enter a valid account number (9–18 digits).";
      if (data.accountNumber !== data.confirmAccountNumber) return "Account numbers do not match.";
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(data.ifsc)) return "Enter a valid IFSC code (e.g. SBIN0001234).";
    }
    return "";
  };

  const next = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError("");
    setStep((s) => s + 1);
  };

  const submit = async () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setLoading(true);
    setError("");
    try {
      await apiFetch("/vendors/apply", {
        method: "POST",
        body: JSON.stringify({
          businessName: data.businessName,
          about: data.about || undefined,
          returnPolicy: data.returnPolicy || undefined,
          gstin: data.gstin || undefined,
          pan: data.pan || undefined,
          accountHolder: data.accountHolder,
          bankName: data.bankName,
          accountNumber: data.accountNumber,
          ifsc: data.ifsc.toUpperCase(),
        }),
      });
      router.push("/vendor");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F5F5] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <p className="text-2xl font-extrabold text-primary">Sario Vendor</p>
          <p className="mt-1 text-sm text-[#696969]">Complete your seller application</p>
        </div>

        <div className="rounded-xl border border-[#F0F0F0] bg-white p-6 shadow-sm">
          <StepIndicator current={step} />

          {step === 0 && (
            <div className="space-y-4">
              <div>
                <FieldLabel>Business Name *</FieldLabel>
                <TextInput value={data.businessName} onChange={set("businessName")} placeholder="Kanjivaram Silks" />
              </div>
              <div>
                <FieldLabel>About Your Store</FieldLabel>
                <Textarea value={data.about} onChange={set("about")} placeholder="Tell buyers about your craft, heritage, and speciality…" rows={4} />
              </div>
              <div>
                <FieldLabel>Return Policy</FieldLabel>
                <Textarea value={data.returnPolicy} onChange={set("returnPolicy")} placeholder="Returns accepted within 7 days of delivery…" />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-[#696969] mb-4">Both fields are optional. You can add these later from your profile.</p>
              <div>
                <FieldLabel>GSTIN (optional)</FieldLabel>
                <TextInput value={data.gstin} onChange={set("gstin")} placeholder="33AABCU9603R1ZV" maxLength={15} />
                <p className="mt-1 text-[10px] text-[#9B9B9B]">15-character GST Identification Number</p>
              </div>
              <div>
                <FieldLabel>PAN (optional)</FieldLabel>
                <TextInput value={data.pan} onChange={(v) => set("pan")(v.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} />
                <p className="mt-1 text-[10px] text-[#9B9B9B]">10-character Permanent Account Number</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <FieldLabel>Account Holder Name *</FieldLabel>
                <TextInput value={data.accountHolder} onChange={set("accountHolder")} placeholder="Kanjivaram Silks Pvt Ltd" />
              </div>
              <div>
                <FieldLabel>Bank Name *</FieldLabel>
                <TextInput value={data.bankName} onChange={set("bankName")} placeholder="State Bank of India" />
              </div>
              <div>
                <FieldLabel>Account Number *</FieldLabel>
                <TextInput value={data.accountNumber} onChange={set("accountNumber")} placeholder="1234567890" type="tel" />
              </div>
              <div>
                <FieldLabel>Confirm Account Number *</FieldLabel>
                <TextInput value={data.confirmAccountNumber} onChange={set("confirmAccountNumber")} placeholder="Re-enter account number" type="tel" />
              </div>
              <div>
                <FieldLabel>IFSC Code *</FieldLabel>
                <TextInput value={data.ifsc} onChange={(v) => set("ifsc")(v.toUpperCase())} placeholder="SBIN0001234" maxLength={11} />
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
          )}

          <div className="mt-6 flex gap-3">
            {step > 0 && (
              <button
                onClick={() => { setError(""); setStep((s) => s - 1); }}
                className="flex-1 rounded-xl border border-[#E8E8E8] py-2.5 text-sm font-bold text-[#4D4D4D] hover:bg-[#F5F5F5] transition-colors"
              >
                Back
              </button>
            )}
            {step < 2 ? (
              <button
                onClick={next}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={() => { void submit(); }}
                disabled={loading}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {loading ? "Submitting…" : "Submit Application"}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @sario/web typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/vendor/onboarding/page.tsx
git commit -m "feat(vendor): 3-step onboarding wizard"
```

---

## Task 5: VariantEditor component

**Files:**
- Create: `apps/web/src/app/vendor/_components/variant-editor.tsx`

- [ ] **Step 1: Create the file**

```typescript
"use client";

export interface VariantRow {
  name: string;
  sku: string;
  color: string;
  priceRupees: string;
  mrpRupees: string;
  weightGrams: string;
  quantity: string;
}

export const EMPTY_VARIANT: VariantRow = {
  name: "", sku: "", color: "", priceRupees: "", mrpRupees: "", weightGrams: "", quantity: "",
};

interface Props {
  variants: VariantRow[];
  onChange: (variants: VariantRow[]) => void;
}

function VariantInput({ value, onChange, placeholder, type = "text" }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-xs text-[#1A1A1A] outline-none focus:border-primary transition-colors"
    />
  );
}

export function VariantEditor({ variants, onChange }: Props) {
  const update = (index: number, field: keyof VariantRow, value: string) => {
    onChange(variants.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  };

  const add = () => onChange([...variants, { ...EMPTY_VARIANT }]);

  const remove = (index: number) => {
    if (variants.length <= 1) return;
    onChange(variants.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="hidden sm:grid grid-cols-7 gap-2 px-1">
        {["Name *", "SKU *", "Color", "Price ₹ *", "MRP ₹ *", "Weight g", "Stock"].map((h) => (
          <p key={h} className="text-[10px] font-bold uppercase tracking-wider text-[#9B9B9B]">{h}</p>
        ))}
      </div>

      {variants.map((v, i) => (
        <div key={i} className="rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] p-3">
          <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
            <div className="col-span-2 sm:col-span-1">
              <p className="mb-1 text-[10px] font-bold uppercase text-[#9B9B9B] sm:hidden">Name *</p>
              <VariantInput value={v.name} onChange={(val) => update(i, "name", val)} placeholder="e.g. Red" />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase text-[#9B9B9B] sm:hidden">SKU *</p>
              <VariantInput value={v.sku} onChange={(val) => update(i, "sku", val)} placeholder="SKU-001" />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase text-[#9B9B9B] sm:hidden">Color</p>
              <VariantInput value={v.color} onChange={(val) => update(i, "color", val)} placeholder="Red" />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase text-[#9B9B9B] sm:hidden">Price ₹ *</p>
              <VariantInput value={v.priceRupees} onChange={(val) => update(i, "priceRupees", val)} placeholder="5000" type="number" />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase text-[#9B9B9B] sm:hidden">MRP ₹ *</p>
              <VariantInput value={v.mrpRupees} onChange={(val) => update(i, "mrpRupees", val)} placeholder="6000" type="number" />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase text-[#9B9B9B] sm:hidden">Weight g</p>
              <VariantInput value={v.weightGrams} onChange={(val) => update(i, "weightGrams", val)} placeholder="800" type="number" />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase text-[#9B9B9B] sm:hidden">Stock</p>
              <VariantInput value={v.quantity} onChange={(val) => update(i, "quantity", val)} placeholder="10" type="number" />
            </div>
          </div>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={variants.length <= 1}
              className="text-[11px] font-bold text-red-500 hover:text-red-700 disabled:text-[#CCCCCC] disabled:cursor-not-allowed transition-colors"
            >
              Remove variant
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="w-full rounded-xl border border-dashed border-primary px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/5 transition-colors"
      >
        + Add Variant
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @sario/web typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/vendor/_components/variant-editor.tsx
git commit -m "feat(vendor): VariantEditor dynamic rows component"
```

---

## Task 6: ProductForm shared component

**Files:**
- Create: `apps/web/src/app/vendor/_components/product-form.tsx`

- [ ] **Step 1: Create the file**

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { VariantEditor, type VariantRow, EMPTY_VARIANT } from "./variant-editor";

interface Category {
  id: string;
  name: string;
  children?: Category[];
}

export interface ProductFormValues {
  name: string;
  description: string;
  categoryId: string;
  fabric: string;
  region: string;
  occasion: string;
  tags: string;
  weaverStory: string;
  giTag: string;
  hsnCode: string;
  variants: VariantRow[];
}

interface Props {
  initialValues?: Partial<ProductFormValues>;
  productId?: string; // present for edit, absent for create
}

const EMPTY_FORM: ProductFormValues = {
  name: "", description: "", categoryId: "", fabric: "", region: "",
  occasion: "", tags: "", weaverStory: "", giTag: "", hsnCode: "",
  variants: [{ ...EMPTY_VARIANT }],
};

function flattenCategories(cats: Category[]): Category[] {
  return cats.flatMap((c) => [c, ...(c.children ? flattenCategories(c.children) : [])]);
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#4D4D4D]">
      {children}{required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

function Input({ value, onChange, placeholder, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { value: string; onChange: (v: string) => void }) {
  return (
    <input
      {...rest}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-[#E8E8E8] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-primary transition-colors"
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 4 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-[#E8E8E8] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-primary transition-colors resize-none"
    />
  );
}

export function ProductForm({ initialValues, productId }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<ProductFormValues>({ ...EMPTY_FORM, ...initialValues });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    apiFetch<Category[]>("/catalog/categories")
      .then((cats) => setCategories(flattenCategories(cats)))
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (initialValues) setForm((prev) => ({ ...prev, ...initialValues }));
  }, [initialValues]);

  const set = (field: keyof ProductFormValues) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const validate = (): string => {
    if (!form.name.trim()) return "Product name is required.";
    if (!form.description.trim()) return "Description is required.";
    if (!form.categoryId) return "Please select a category.";
    for (const v of form.variants) {
      if (!v.name.trim()) return "Each variant must have a name.";
      if (!v.sku.trim()) return "Each variant must have a SKU.";
      const price = parseFloat(v.priceRupees);
      const mrp = parseFloat(v.mrpRupees);
      if (!v.priceRupees || isNaN(price) || price <= 0) return "Each variant must have a valid price.";
      if (!v.mrpRupees || isNaN(mrp) || mrp <= 0) return "Each variant must have a valid MRP.";
    }
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    setError("");
    setSuccess("");

    const payload = {
      name: form.name,
      description: form.description,
      categoryId: form.categoryId,
      ...(form.fabric && { fabric: form.fabric }),
      ...(form.region && { region: form.region }),
      ...(form.weaverStory && { weaverStory: form.weaverStory }),
      ...(form.giTag && { giTag: form.giTag }),
      ...(form.hsnCode && { hsnCode: form.hsnCode }),
      ...(form.occasion && { occasion: form.occasion.split(",").map((s) => s.trim()).filter(Boolean) }),
      ...(form.tags && { tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean) }),
      variants: form.variants.map((v) => ({
        name: v.name,
        sku: v.sku,
        ...(v.color && { color: v.color }),
        pricePaise: Math.round(parseFloat(v.priceRupees) * 100),
        mrpPaise: Math.round(parseFloat(v.mrpRupees) * 100),
        ...(v.weightGrams && { weightGrams: parseInt(v.weightGrams) }),
        ...(v.quantity && { quantity: parseInt(v.quantity) }),
      })),
    };

    try {
      if (productId) {
        await apiFetch(`/vendors/me/products/${productId}`, { method: "PATCH", body: JSON.stringify(payload) });
        setSuccess("Product updated successfully.");
      } else {
        await apiFetch("/vendors/me/products", { method: "POST", body: JSON.stringify(payload) });
        router.push("/vendor/products");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save product.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-6 max-w-2xl">
      <div className="rounded-xl border border-[#F0F0F0] bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#1A1A1A]">Product Details</h2>
        <div>
          <FieldLabel required>Product Name</FieldLabel>
          <Input value={form.name} onChange={set("name")} placeholder="Pure Kanjivaram Silk Saree" />
        </div>
        <div>
          <FieldLabel required>Description</FieldLabel>
          <Textarea value={form.description} onChange={set("description")} placeholder="Describe the saree, its unique features, weaving technique…" rows={5} />
        </div>
        <div>
          <FieldLabel required>Category</FieldLabel>
          <select
            value={form.categoryId}
            onChange={(e) => set("categoryId")(e.target.value)}
            className="w-full rounded-xl border border-[#E8E8E8] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-primary transition-colors"
          >
            <option value="">Select a category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Fabric</FieldLabel>
            <Input value={form.fabric} onChange={set("fabric")} placeholder="Pure Silk" />
          </div>
          <div>
            <FieldLabel>Region / Origin</FieldLabel>
            <Input value={form.region} onChange={set("region")} placeholder="Kanchipuram, Tamil Nadu" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Occasion</FieldLabel>
            <Input value={form.occasion} onChange={set("occasion")} placeholder="Wedding, Festival" />
            <p className="mt-1 text-[10px] text-[#9B9B9B]">Comma-separated</p>
          </div>
          <div>
            <FieldLabel>Tags</FieldLabel>
            <Input value={form.tags} onChange={set("tags")} placeholder="silk, handloom, zari" />
            <p className="mt-1 text-[10px] text-[#9B9B9B]">Comma-separated</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>GI Tag</FieldLabel>
            <Input value={form.giTag} onChange={set("giTag")} placeholder="Kanjivaram Silk" />
          </div>
          <div>
            <FieldLabel>HSN Code</FieldLabel>
            <Input value={form.hsnCode} onChange={set("hsnCode")} placeholder="5007" />
          </div>
        </div>
        <div>
          <FieldLabel>Weaver Story</FieldLabel>
          <Textarea value={form.weaverStory} onChange={set("weaverStory")} placeholder="Share the story behind this creation…" rows={4} />
        </div>
      </div>

      <div className="rounded-xl border border-[#F0F0F0] bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#1A1A1A]">Variants</h2>
        <p className="text-xs text-[#696969]">Add at least one variant. Each variant has its own price and stock.</p>
        <VariantEditor
          variants={form.variants}
          onChange={(variants) => setForm((prev) => ({ ...prev, variants }))}
        />
      </div>

      {error && (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      {success && (
        <p className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.push("/vendor/products")}
          className="rounded-xl border border-[#E8E8E8] px-6 py-2.5 text-sm font-bold text-[#4D4D4D] hover:bg-[#F5F5F5] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-primary px-8 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? "Saving…" : productId ? "Save Changes" : "Submit for Review"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @sario/web typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/vendor/_components/product-form.tsx
git commit -m "feat(vendor): ProductForm shared create/edit component"
```

---

## Task 7: Products list page

**Files:**
- Create: `apps/web/src/app/vendor/products/page.tsx`

- [ ] **Step 1: Create the file**

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatPaise } from "@sario/ui";

type ProductStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";

interface ProductVariant {
  pricePaise: number;
  inventory: { quantity: number; reservedQuantity: number };
}

interface VendorProduct {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  fabric?: string | null;
  region?: string | null;
  rejectionReason?: string | null;
  category?: { id: string; name: string } | null;
  variants: ProductVariant[];
  images: Array<{ url: string }>;
}

interface ProductsResponse {
  data: VendorProduct[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const STATUS_TABS: Array<{ label: string; value: ProductStatus | "" }> = [
  { label: "All", value: "" },
  { label: "Pending Review", value: "PENDING_REVIEW" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
];

const STATUS_BADGE: Record<ProductStatus, { bg: string; text: string; label: string }> = {
  DRAFT:          { bg: "bg-gray-100",   text: "text-gray-600",   label: "Draft" },
  PENDING_REVIEW: { bg: "bg-yellow-50",  text: "text-yellow-700", label: "Pending Review" },
  APPROVED:       { bg: "bg-green-50",   text: "text-green-700",  label: "Approved" },
  REJECTED:       { bg: "bg-red-50",     text: "text-red-700",    label: "Rejected" },
};

export default function VendorProductsPage() {
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "">("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) params.set("status", statusFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await apiFetch<ProductsResponse>(`/vendors/me/products?${params.toString()}`);
      setProducts(res.data);
      setTotal(res.meta.total);
    } catch {
      // show empty state on error
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debouncedSearch]);

  useEffect(() => { void fetchProducts(); }, [fetchProducts]);

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/vendors/me/products/${id}`, { method: "DELETE" });
      setConfirmDelete(null);
      void fetchProducts();
    } catch {
      // silent — refetch will still run
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Products</h1>
        <Link
          href="/vendor/products/new"
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity"
        >
          + Add Product
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 rounded-xl border border-[#E8E8E8] bg-white p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setStatusFilter(tab.value); setPage(1); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                statusFilter === tab.value
                  ? "bg-primary text-white"
                  : "text-[#4D4D4D] hover:bg-[#F5F5F5]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search products…"
          className="rounded-xl border border-[#E8E8E8] bg-white px-4 py-2 text-sm text-[#1A1A1A] outline-none focus:border-primary transition-colors"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-[#F0F0F0]" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-[#F0F0F0] bg-white py-20 text-center shadow-sm">
          <p className="text-lg font-bold text-[#1A1A1A]">No products yet</p>
          <p className="mt-1 text-sm text-[#696969]">Add your first saree to start selling.</p>
          <Link
            href="/vendor/products/new"
            className="mt-6 inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity"
          >
            Add Product
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => {
            const badge = STATUS_BADGE[p.status];
            const minPrice = p.variants.length > 0
              ? Math.min(...p.variants.map((v) => v.pricePaise))
              : 0;
            const isConfirmingDelete = confirmDelete === p.id;
            return (
              <div key={p.id} className="rounded-xl border border-[#F0F0F0] bg-white shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-bold text-[#1A1A1A] line-clamp-2 leading-snug">{p.name}</p>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>
                  {p.category && <p className="text-xs text-[#9B9B9B] mb-1">{p.category.name}</p>}
                  <p className="text-xs text-[#696969]">{p.variants.length} variant{p.variants.length !== 1 ? "s" : ""} · from {formatPaise(minPrice)}</p>

                  {p.status === "REJECTED" && p.rejectionReason && (
                    <div className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                      <span className="font-bold">Rejected:</span> {p.rejectionReason}
                    </div>
                  )}
                </div>

                <div className="border-t border-[#F0F0F0] px-4 py-3 flex items-center justify-between gap-2 bg-gray-50/30">
                  <Link
                    href={`/vendor/products/${p.id}/edit`}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Edit
                  </Link>

                  {isConfirmingDelete ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#696969]">Delete?</span>
                      <button
                        onClick={() => { void handleDelete(p.id); }}
                        className="text-xs font-bold text-red-600 hover:text-red-800"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs font-bold text-[#696969] hover:text-[#1A1A1A]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(p.id)}
                      className="text-xs font-bold text-[#9B9B9B] hover:text-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-[#E8E8E8] px-4 py-2 text-sm font-bold text-[#4D4D4D] hover:bg-[#F5F5F5] disabled:opacity-40 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-[#696969]">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-[#E8E8E8] px-4 py-2 text-sm font-bold text-[#4D4D4D] hover:bg-[#F5F5F5] disabled:opacity-40 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @sario/web typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/vendor/products/page.tsx
git commit -m "feat(vendor): product list page with filters, search, pagination, delete"
```

---

## Task 8: New and edit product pages

**Files:**
- Create: `apps/web/src/app/vendor/products/new/page.tsx`
- Create: `apps/web/src/app/vendor/products/[id]/edit/page.tsx`

- [ ] **Step 1: Create new product page**

```typescript
// apps/web/src/app/vendor/products/new/page.tsx
"use client";

import { ProductForm } from "../../_components/product-form";

export default function NewProductPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-[#1A1A1A]">Add New Product</h1>
      <ProductForm />
    </div>
  );
}
```

- [ ] **Step 2: Create edit product page**

```typescript
// apps/web/src/app/vendor/products/[id]/edit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { ProductForm, type ProductFormValues } from "../../../_components/product-form";

interface ProductVariantFull {
  id: string;
  name: string;
  sku: string;
  color?: string | null;
  pricePaise: number;
  mrpPaise: number;
  weightGrams?: number | null;
  inventory: { quantity: number; reservedQuantity: number };
}

interface FullProduct {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  fabric?: string | null;
  region?: string | null;
  weaverStory?: string | null;
  giTag?: string | null;
  hsnCode?: string | null;
  tags: string[];
  occasion: string[];
  variants: ProductVariantFull[];
}

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const [initial, setInitial] = useState<Partial<ProductFormValues> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<FullProduct>(`/vendors/me/products/${params.id}`)
      .then((p) => {
        setInitial({
          name: p.name,
          description: p.description,
          categoryId: p.categoryId,
          fabric: p.fabric ?? "",
          region: p.region ?? "",
          weaverStory: p.weaverStory ?? "",
          giTag: p.giTag ?? "",
          hsnCode: p.hsnCode ?? "",
          occasion: p.occasion.join(", "),
          tags: p.tags.join(", "),
          variants: p.variants.map((v) => ({
            name: v.name,
            sku: v.sku,
            color: v.color ?? "",
            priceRupees: String(v.pricePaise / 100),
            mrpRupees: String(v.mrpPaise / 100),
            weightGrams: v.weightGrams ? String(v.weightGrams) : "",
            quantity: String(v.inventory.quantity),
          })),
        });
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load product."))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 px-6 py-4 text-sm text-red-700">{error}</div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-[#1A1A1A]">Edit Product</h1>
      {initial && <ProductForm initialValues={initial} productId={params.id} />}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @sario/web typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/vendor/products/new/page.tsx apps/web/src/app/vendor/products/\[id\]/edit/page.tsx
git commit -m "feat(vendor): new and edit product pages"
```

---

## Task 9: OrderRow component + orders page

**Files:**
- Create: `apps/web/src/app/vendor/_components/order-row.tsx`
- Create: `apps/web/src/app/vendor/orders/page.tsx`

- [ ] **Step 1: Create order-row.tsx**

```typescript
// apps/web/src/app/vendor/_components/order-row.tsx
"use client";

import { useState } from "react";
import { formatPaise } from "@sario/ui";
import { apiFetch } from "@/lib/api";

export type OrderStatus =
  | "PENDING" | "CONFIRMED" | "PACKED" | "SHIPPED" | "DELIVERED"
  | "COMPLETED" | "CANCELLED" | "RETURN_REQUESTED" | "RETURN_APPROVED"
  | "RETURN_REJECTED" | "REFUNDED";

export interface OrderItem {
  id: string;
  quantity: number;
  unitPricePaise: number;
  totalPaise: number;
  variant: {
    name: string;
    product: { name: string; slug: string };
    images?: Array<{ url: string }>;
  };
}

export interface VendorOrder {
  id: string;
  status: OrderStatus;
  totalPaise: number;
  createdAt: string;
  items: OrderItem[];
  shipment?: { trackingNumber?: string | null; trackingUrl?: string | null } | null;
}

const STATUS_BADGE: Record<OrderStatus, { bg: string; text: string; label: string }> = {
  PENDING:          { bg: "bg-gray-100",    text: "text-gray-600",    label: "Pending" },
  CONFIRMED:        { bg: "bg-yellow-50",   text: "text-yellow-700",  label: "Confirmed" },
  PACKED:           { bg: "bg-purple-50",   text: "text-purple-700",  label: "Packed" },
  SHIPPED:          { bg: "bg-indigo-50",   text: "text-indigo-700",  label: "Shipped" },
  DELIVERED:        { bg: "bg-green-50",    text: "text-green-700",   label: "Delivered" },
  COMPLETED:        { bg: "bg-green-100",   text: "text-green-800",   label: "Completed" },
  CANCELLED:        { bg: "bg-red-50",      text: "text-red-700",     label: "Cancelled" },
  RETURN_REQUESTED: { bg: "bg-orange-50",   text: "text-orange-700",  label: "Return Requested" },
  RETURN_APPROVED:  { bg: "bg-orange-100",  text: "text-orange-800",  label: "Return Approved" },
  RETURN_REJECTED:  { bg: "bg-red-100",     text: "text-red-800",     label: "Return Rejected" },
  REFUNDED:         { bg: "bg-gray-100",    text: "text-gray-600",    label: "Refunded" },
};

interface Props {
  order: VendorOrder;
  onRefetch: () => void;
}

export function OrderRow({ order, onRefetch }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const badge = STATUS_BADGE[order.status] ?? { bg: "bg-gray-100", text: "text-gray-600", label: order.status };

  const advance = async () => {
    setActionLoading(true);
    try {
      await apiFetch(`/vendors/me/orders/${order.id}/advance`, { method: "POST" });
      onRefetch();
    } catch {
      // silent
    } finally {
      setActionLoading(false);
    }
  };

  const ship = async () => {
    setActionLoading(true);
    try {
      await apiFetch(`/vendors/me/orders/${order.id}/ship`, { method: "POST" });
      onRefetch();
    } catch {
      // silent
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#F0F0F0] bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div className="space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9B9B9B]">Order</p>
          <p className="text-sm font-bold text-[#1A1A1A]">#{order.id.slice(-8).toUpperCase()}</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9B9B9B]">Date</p>
          <p className="text-sm text-[#1A1A1A]">
            {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9B9B9B]">Items</p>
          <p className="text-sm text-[#1A1A1A]">{order.items.length}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
          <p className="text-sm font-extrabold text-primary">{formatPaise(order.totalPaise)}</p>
        </div>
        <svg className={`h-4 w-4 text-[#9B9B9B] transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <>
          <div className="border-t border-[#F0F0F0] px-5 py-4 space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="h-12 w-10 shrink-0 rounded-lg bg-[#F5F5F5] border border-[#F0F0F0] overflow-hidden">
                  {item.variant.images?.[0]?.url ? (
                    <img src={item.variant.images[0].url} alt={item.variant.product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-[#CCCCCC]">—</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1A1A1A] line-clamp-1">{item.variant.product.name}</p>
                  <p className="text-xs text-[#696969]">{item.variant.name} · Qty: {item.quantity}</p>
                </div>
                <p className="text-sm font-bold text-[#1A1A1A] shrink-0">{formatPaise(item.totalPaise)}</p>
              </div>
            ))}
            {order.shipment?.trackingNumber && (
              <p className="text-xs text-[#696969]">
                Tracking: <span className="font-bold text-[#1A1A1A]">{order.shipment.trackingNumber}</span>
              </p>
            )}
          </div>

          {(order.status === "CONFIRMED" || order.status === "PACKED") && (
            <div className="border-t border-[#F0F0F0] bg-gray-50/30 px-5 py-3 flex gap-2">
              {order.status === "CONFIRMED" && (
                <button
                  onClick={() => { void advance(); }}
                  disabled={actionLoading}
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {actionLoading ? "…" : "Mark Packed"}
                </button>
              )}
              {order.status === "PACKED" && (
                <button
                  onClick={() => { void ship(); }}
                  disabled={actionLoading}
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {actionLoading ? "…" : "Create Shipment"}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create orders/page.tsx**

```typescript
// apps/web/src/app/vendor/orders/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { OrderRow, type VendorOrder, type OrderStatus } from "../_components/order-row";

interface OrdersResponse {
  data: VendorOrder[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const STATUS_TABS: Array<{ label: string; value: OrderStatus | "" }> = [
  { label: "All", value: "" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Packed", value: "PACKED" },
  { label: "Shipped", value: "SHIPPED" },
  { label: "Delivered", value: "DELIVERED" },
];

export default function VendorOrdersPage() {
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await apiFetch<OrdersResponse>(`/vendors/me/orders?${params.toString()}`);
      setOrders(res.data);
      setTotal(res.meta.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { void fetchOrders(); }, [fetchOrders]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-[#1A1A1A]">Orders</h1>

      <div className="mb-4 flex gap-1 rounded-xl border border-[#E8E8E8] bg-white p-1 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              statusFilter === tab.value ? "bg-primary text-white" : "text-[#4D4D4D] hover:bg-[#F5F5F5]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-[#F0F0F0]" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-[#F0F0F0] bg-white py-20 text-center shadow-sm">
          <p className="text-lg font-bold text-[#1A1A1A]">No orders yet</p>
          <p className="mt-1 text-sm text-[#696969]">Orders from buyers will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} onRefetch={() => { void fetchOrders(); }} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-[#E8E8E8] px-4 py-2 text-sm font-bold text-[#4D4D4D] hover:bg-[#F5F5F5] disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-[#696969]">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-[#E8E8E8] px-4 py-2 text-sm font-bold text-[#4D4D4D] hover:bg-[#F5F5F5] disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @sario/web typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/vendor/_components/order-row.tsx apps/web/src/app/vendor/orders/page.tsx
git commit -m "feat(vendor): orders page with expandable rows, advance status, create shipment"
```

---

## Task 10: ReturnRow component + returns page

**Files:**
- Create: `apps/web/src/app/vendor/_components/return-row.tsx`
- Create: `apps/web/src/app/vendor/returns/page.tsx`

- [ ] **Step 1: Create return-row.tsx**

```typescript
// apps/web/src/app/vendor/_components/return-row.tsx
"use client";

import { useState } from "react";
import { formatPaise } from "@sario/ui";
import { apiFetch } from "@/lib/api";
import type { VendorOrder } from "./order-row";

interface Props {
  order: VendorOrder;
  onRefetch: () => void;
}

export function ReturnRow({ order, onRefetch }: Props) {
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const approve = async () => {
    setLoading(true);
    try {
      await apiFetch(`/vendors/me/orders/${order.id}/return/approve`, { method: "POST" });
      onRefetch();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to approve.");
    } finally {
      setLoading(false);
    }
  };

  const reject = async () => {
    if (!reason.trim()) { setError("Please provide a rejection reason."); return; }
    setLoading(true);
    try {
      await apiFetch(`/vendors/me/orders/${order.id}/return/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      onRefetch();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to reject.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#F0F0F0] bg-white shadow-sm p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9B9B9B]">Order</p>
          <p className="text-sm font-bold text-[#1A1A1A]">#{order.id.slice(-8).toUpperCase()}</p>
          <p className="text-xs text-[#696969] mt-0.5">
            {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="text-right">
          <span className="rounded-full bg-orange-50 border border-orange-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-orange-700">
            Return Requested
          </span>
          <p className="mt-1 text-sm font-extrabold text-primary">{formatPaise(order.totalPaise)}</p>
        </div>
      </div>

      <div className="mb-3 space-y-1">
        {order.items.map((item) => (
          <p key={item.id} className="text-xs text-[#4D4D4D]">
            {item.variant.product.name} — {item.variant.name} × {item.quantity}
          </p>
        ))}
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}

      {showReject ? (
        <div className="space-y-2">
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for rejection (shown to buyer)…"
            className="w-full rounded-xl border border-[#E8E8E8] px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-primary resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { void reject(); }}
              disabled={loading}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "…" : "Confirm Rejection"}
            </button>
            <button
              onClick={() => { setShowReject(false); setError(""); setReason(""); }}
              className="rounded-lg border border-[#E8E8E8] px-4 py-2 text-xs font-bold text-[#4D4D4D] hover:bg-[#F5F5F5] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => { void approve(); }}
            disabled={loading}
            className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "…" : "Approve Return"}
          </button>
          <button
            onClick={() => setShowReject(true)}
            className="rounded-lg border border-red-200 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create returns/page.tsx**

```typescript
// apps/web/src/app/vendor/returns/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { ReturnRow } from "../_components/return-row";
import type { VendorOrder } from "../_components/order-row";

interface OrdersResponse {
  data: VendorOrder[];
  meta: { total: number };
}

type Tab = "pending" | "history";

export default function VendorReturnsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [pending, setPending] = useState<VendorOrder[]>([]);
  const [history, setHistory] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        apiFetch<OrdersResponse>("/vendors/me/orders?status=RETURN_REQUESTED&limit=50"),
        apiFetch<OrdersResponse>("/vendors/me/orders?status=RETURN_APPROVED&limit=50"),
        apiFetch<OrdersResponse>("/vendors/me/orders?status=RETURN_REJECTED&limit=50"),
      ]);
      setPending(pendingRes.data);
      setHistory([...approvedRes.data, ...rejectedRes.data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchReturns(); }, [fetchReturns]);

  const items = tab === "pending" ? pending : history;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-[#1A1A1A]">Returns</h1>

      <div className="mb-4 flex gap-1 rounded-xl border border-[#E8E8E8] bg-white p-1 w-fit">
        {(["pending", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold capitalize transition-colors ${
              tab === t ? "bg-primary text-white" : "text-[#4D4D4D] hover:bg-[#F5F5F5]"
            }`}
          >
            {t === "pending" ? `Pending (${pending.length})` : "History"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-[#F0F0F0]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-[#F0F0F0] bg-white py-20 text-center shadow-sm">
          <p className="text-lg font-bold text-[#1A1A1A]">
            {tab === "pending" ? "No pending return requests" : "No return history yet"}
          </p>
        </div>
      ) : tab === "pending" ? (
        <div className="space-y-3">
          {items.map((order) => (
            <ReturnRow key={order.id} order={order} onRefetch={() => { void fetchReturns(); }} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((order) => {
            const isApproved = order.status === "RETURN_APPROVED";
            return (
              <div key={order.id} className="rounded-xl border border-[#F0F0F0] bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#1A1A1A]">#{order.id.slice(-8).toUpperCase()}</p>
                    <p className="text-xs text-[#696969] mt-0.5">
                      {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
                    isApproved ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  }`}>
                    {isApproved ? "Approved" : "Rejected"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @sario/web typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/vendor/_components/return-row.tsx apps/web/src/app/vendor/returns/page.tsx
git commit -m "feat(vendor): returns page with approve/reject inline flow"
```

---

## Task 11: StatCard + Dashboard page

**Files:**
- Create: `apps/web/src/app/vendor/_components/stat-card.tsx`
- Create: `apps/web/src/app/vendor/page.tsx`

- [ ] **Step 1: Create stat-card.tsx**

```typescript
// apps/web/src/app/vendor/_components/stat-card.tsx

interface Props {
  label: string;
  value: string | number;
  loading?: boolean;
}

export function StatCard({ label, value, loading }: Props) {
  if (loading) {
    return <div className="h-24 animate-pulse rounded-xl bg-[#F0F0F0]" />;
  }
  return (
    <div className="rounded-xl border border-[#F0F0F0] bg-white p-5 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#9B9B9B]">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-[#1A1A1A]">{value}</p>
    </div>
  );
}
```

- [ ] **Step 2: Create vendor/page.tsx**

```typescript
// apps/web/src/app/vendor/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatPaise } from "@sario/ui";
import { StatCard } from "./_components/stat-card";
import type { VendorOrder, OrderStatus } from "./_components/order-row";

interface ProductsResponse {
  meta: { total: number };
  data: Array<{ status: string }>;
}

interface OrdersResponse {
  data: VendorOrder[];
  meta: { total: number };
}

const STATUS_BADGE: Partial<Record<OrderStatus, { bg: string; text: string; label: string }>> = {
  CONFIRMED:        { bg: "bg-yellow-50",  text: "text-yellow-700", label: "Confirmed" },
  PACKED:           { bg: "bg-purple-50",  text: "text-purple-700", label: "Packed" },
  SHIPPED:          { bg: "bg-indigo-50",  text: "text-indigo-700", label: "Shipped" },
  DELIVERED:        { bg: "bg-green-50",   text: "text-green-700",  label: "Delivered" },
  RETURN_REQUESTED: { bg: "bg-orange-50",  text: "text-orange-700", label: "Return Requested" },
};

export default function VendorDashboardPage() {
  const [products, setProducts] = useState<ProductsResponse | null>(null);
  const [orders, setOrders] = useState<OrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<ProductsResponse>("/vendors/me/products?limit=100"),
      apiFetch<OrdersResponse>("/vendors/me/orders?limit=5"),
    ])
      .then(([p, o]) => { setProducts(p); setOrders(o); })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const totalProducts = products?.meta.total ?? 0;
  const pendingOrders = orders?.data.filter((o) =>
    ["CONFIRMED", "PACKED"].includes(o.status)
  ).length ?? 0;
  const pendingReturns = orders?.data.filter((o) =>
    o.status === "RETURN_REQUESTED"
  ).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Dashboard</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Products" value={totalProducts} loading={loading} />
        <StatCard label="Orders to Process" value={pendingOrders} loading={loading} />
        <StatCard label="Pending Returns" value={pendingReturns} loading={loading} />
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <Link
          href="/vendor/products/new"
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity"
        >
          + Add Product
        </Link>
        <Link
          href="/vendor/orders"
          className="rounded-xl border border-[#E8E8E8] px-5 py-2.5 text-sm font-bold text-[#4D4D4D] hover:bg-[#F5F5F5] transition-colors"
        >
          View All Orders
        </Link>
      </div>

      {/* Recent orders */}
      <div className="rounded-xl border border-[#F0F0F0] bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F0F0]">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#1A1A1A]">Recent Orders</h2>
          <Link href="/vendor/orders" className="text-xs font-bold text-primary hover:underline">View All →</Link>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded-lg bg-[#F0F0F0]" />
            ))}
          </div>
        ) : !orders?.data.length ? (
          <div className="py-12 text-center text-sm text-[#9B9B9B]">No orders yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F0F0F0] bg-gray-50/50">
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#9B9B9B]">Order</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#9B9B9B]">Date</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#9B9B9B]">Status</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-[#9B9B9B]">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {orders.data.map((order) => {
                const badge = STATUS_BADGE[order.status] ?? { bg: "bg-gray-100", text: "text-gray-600", label: order.status };
                return (
                  <tr key={order.id}>
                    <td className="px-5 py-3 font-bold text-[#1A1A1A]">#{order.id.slice(-8).toUpperCase()}</td>
                    <td className="px-5 py-3 text-[#696969]">
                      {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-primary">{formatPaise(order.totalPaise)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @sario/web typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/vendor/_components/stat-card.tsx apps/web/src/app/vendor/page.tsx
git commit -m "feat(vendor): dashboard with stat cards and recent orders"
```

---

## Task 12: Profile page

**Files:**
- Create: `apps/web/src/app/vendor/profile/page.tsx`

- [ ] **Step 1: Create the file**

```typescript
// apps/web/src/app/vendor/profile/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useVendor } from "@/hooks/use-vendor";
import { apiFetch } from "@/lib/api";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#4D4D4D]">{children}</label>;
}

function ReadOnlyInput({ value }: { value: string }) {
  return (
    <div className="w-full rounded-xl border border-[#F0F0F0] bg-[#F9F9F9] px-4 py-2.5 text-sm text-[#9B9B9B]">
      {value || "—"}
    </div>
  );
}

export default function VendorProfilePage() {
  const { vendor, loading: vendorLoading, refetch } = useVendor();
  const [businessName, setBusinessName] = useState("");
  const [about, setAbout] = useState("");
  const [returnPolicy, setReturnPolicy] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (vendor) {
      setBusinessName(vendor.businessName);
      setAbout(vendor.about ?? "");
      setReturnPolicy(vendor.returnPolicy ?? "");
    }
  }, [vendor]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) { setMessage({ type: "error", text: "Business name is required." }); return; }
    setSaving(true);
    setMessage(null);
    try {
      await apiFetch("/vendors/me", {
        method: "PATCH",
        body: JSON.stringify({
          businessName,
          about: about || undefined,
          returnPolicy: returnPolicy || undefined,
        }),
      });
      setMessage({ type: "success", text: "Profile updated successfully." });
      refetch();
    } catch (e: unknown) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to save." });
    } finally {
      setSaving(false);
    }
  };

  if (vendorLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const bank = vendor?.bankAccounts?.[0];
  const maskedAccount = bank?.bankName
    ? `••••${bank.bankName.slice(-4)}`
    : null;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Store Profile</h1>

      {/* Editable section */}
      <div className="rounded-xl border border-[#F0F0F0] bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-[#1A1A1A]">Store Information</h2>
        <form onSubmit={(e) => { void handleSave(e); }} className="space-y-4">
          <div>
            <FieldLabel>Business Name *</FieldLabel>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full rounded-xl border border-[#E8E8E8] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <FieldLabel>About Your Store</FieldLabel>
            <textarea
              rows={4}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Tell buyers about your craft and heritage…"
              className="w-full rounded-xl border border-[#E8E8E8] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-primary transition-colors resize-none"
            />
          </div>
          <div>
            <FieldLabel>Return Policy</FieldLabel>
            <textarea
              rows={3}
              value={returnPolicy}
              onChange={(e) => setReturnPolicy(e.target.value)}
              placeholder="Returns accepted within 7 days…"
              className="w-full rounded-xl border border-[#E8E8E8] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          {message && (
            <p className={`rounded-xl px-4 py-2.5 text-sm font-medium ${
              message.type === "success"
                ? "bg-green-50 border border-green-100 text-green-700"
                : "bg-red-50 border border-red-100 text-red-700"
            }`}>
              {message.text}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary px-8 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      {/* Read-only KYC */}
      <div className="rounded-xl border border-[#F0F0F0] bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-[#1A1A1A]">KYC Details</h2>
        <div className="space-y-4">
          <div>
            <FieldLabel>GSTIN</FieldLabel>
            <ReadOnlyInput value={vendor?.gstin ?? ""} />
          </div>
          <div>
            <FieldLabel>PAN</FieldLabel>
            <ReadOnlyInput value={vendor?.pan ?? ""} />
          </div>
        </div>
      </div>

      {/* Read-only bank */}
      {bank && (
        <div className="rounded-xl border border-[#F0F0F0] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-[#1A1A1A]">Bank Account</h2>
          <div className="space-y-4">
            <div>
              <FieldLabel>Bank Name</FieldLabel>
              <ReadOnlyInput value={bank.bankName} />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <FieldLabel>Account Number</FieldLabel>
                <ReadOnlyInput value={maskedAccount ?? "—"} />
              </div>
              <div className="mt-5">
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
                  bank.isVerified
                    ? "bg-green-50 border border-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {bank.isVerified ? "Verified" : "Pending Verification"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @sario/web typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/vendor/profile/page.tsx
git commit -m "feat(vendor): store profile page with editable info and read-only KYC/bank"
```

---

## Task 13: Backend — R2 upload service + product image endpoints

**Files:**
- Create: `apps/api/src/upload/upload.service.ts`
- Create: `apps/api/src/upload/upload.module.ts`
- Create: `apps/api/src/catalog/product-image.controller.ts`
- Modify: `apps/api/src/catalog/catalog.module.ts`

- [ ] **Step 1: Install AWS SDK packages**

```bash
pnpm --filter @sario/api add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

Expected: packages added to `apps/api/package.json` and `pnpm-lock.yaml` updated.

- [ ] **Step 2: Create `upload.service.ts`**

```typescript
// apps/api/src/upload/upload.service.ts
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type AllowedType = (typeof ALLOWED_TYPES)[number];

@Injectable()
export class UploadService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    const accountId = config.getOrThrow<string>("R2_ACCOUNT_ID");
    this.bucket = config.getOrThrow<string>("R2_BUCKET_NAME");
    this.publicUrl = config.getOrThrow<string>("R2_PUBLIC_URL");

    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.getOrThrow<string>("R2_ACCESS_KEY_ID"),
        secretAccessKey: config.getOrThrow<string>("R2_SECRET_ACCESS_KEY"),
      },
    });
  }

  isAllowedType(contentType: string): contentType is AllowedType {
    return (ALLOWED_TYPES as readonly string[]).includes(contentType);
  }

  async presign(key: string, contentType: AllowedType): Promise<{ presignedUrl: string; publicUrl: string }> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    const presignedUrl = await getSignedUrl(this.client, command, { expiresIn: 300 });
    const url = `${this.publicUrl}/${key}`;
    return { presignedUrl, publicUrl: url };
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  keyFromUrl(publicUrl: string): string {
    return publicUrl.replace(`${this.publicUrl}/`, "");
  }
}
```

- [ ] **Step 3: Create `upload.module.ts`**

```typescript
// apps/api/src/upload/upload.module.ts
import { Module } from "@nestjs/common";
import { UploadService } from "./upload.service.js";

@Module({
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
```

- [ ] **Step 4: Create `product-image.controller.ts`**

```typescript
// apps/api/src/catalog/product-image.controller.ts
import {
  Controller, Post, Delete, Patch, Body, Param, UseGuards, BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { IsString, IsBoolean, IsOptional, IsInt } from "class-validator";
import { PrismaService } from "../prisma/prisma.service.js";
import { UploadService } from "../upload/upload.service.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { CurrentUser, type CurrentUserPayload } from "../auth/decorators/current-user.decorator.js";
import { ProductService } from "./product.service.js";

class PresignDto {
  @IsString() filename: string;
  @IsString() contentType: string;
}

class SaveImageDto {
  @IsString() url: string;
  @IsString() @IsOptional() altText?: string;
  @IsBoolean() @IsOptional() isPrimary?: boolean;
  @IsInt() @IsOptional() sortOrder?: number;
}

@ApiTags("Product Images (Vendor)")
@Controller({ path: "vendors/me/products/:productId/images", version: "1" })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductImageController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly upload: UploadService,
    private readonly products: ProductService,
  ) {}

  @Post("presign")
  @ApiOperation({ summary: "Get a presigned PUT URL for R2 image upload" })
  async presign(
    @CurrentUser() user: CurrentUserPayload,
    @Param("productId") productId: string,
    @Body() dto: PresignDto,
  ) {
    // Verify ownership
    await this.products.getForVendor(user.id, productId);

    if (!this.upload.isAllowedType(dto.contentType)) {
      throw new BadRequestException("Only jpeg, png, and webp images are allowed.");
    }

    const ext = dto.filename.split(".").pop() ?? "jpg";
    const key = `products/${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { presignedUrl, publicUrl } = await this.upload.presign(key, dto.contentType);
    return { presignedUrl, publicUrl, key };
  }

  @Post()
  @ApiOperation({ summary: "Save a ProductImage record after upload" })
  async save(
    @CurrentUser() user: CurrentUserPayload,
    @Param("productId") productId: string,
    @Body() dto: SaveImageDto,
  ) {
    await this.products.getForVendor(user.id, productId);

    if (dto.isPrimary) {
      await this.prisma.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      });
    }

    return this.prisma.productImage.create({
      data: {
        productId,
        url: dto.url,
        altText: dto.altText,
        isPrimary: dto.isPrimary ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  @Delete(":imageId")
  @ApiOperation({ summary: "Delete a product image record and R2 object" })
  async remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param("productId") productId: string,
    @Param("imageId") imageId: string,
  ) {
    await this.products.getForVendor(user.id, productId);

    const image = await this.prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image || image.productId !== productId) return { deleted: false };

    await this.upload.deleteObject(this.upload.keyFromUrl(image.url)).catch(() => null);
    await this.prisma.productImage.delete({ where: { id: imageId } });
    return { deleted: true };
  }

  @Patch(":imageId/primary")
  @ApiOperation({ summary: "Set an image as primary" })
  async setPrimary(
    @CurrentUser() user: CurrentUserPayload,
    @Param("productId") productId: string,
    @Param("imageId") imageId: string,
  ) {
    await this.products.getForVendor(user.id, productId);

    await this.prisma.productImage.updateMany({
      where: { productId },
      data: { isPrimary: false },
    });
    return this.prisma.productImage.update({
      where: { id: imageId },
      data: { isPrimary: true },
    });
  }
}
```

- [ ] **Step 5: Register in `catalog.module.ts`**

Open `apps/api/src/catalog/catalog.module.ts`. Add `UploadModule` to imports and `ProductImageController` to controllers:

```typescript
import { UploadModule } from "../upload/upload.module.js";
import { ProductImageController } from "./product-image.controller.js";
// add ProductImageController to controllers array
// add UploadModule to imports array
```

- [ ] **Step 6: Typecheck the API**

```bash
pnpm --filter @sario/api typecheck
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/upload/ apps/api/src/catalog/product-image.controller.ts apps/api/src/catalog/catalog.module.ts
git commit -m "feat(api): R2 upload service + product image presign/save/delete/primary endpoints"
```

---

## Task 14: Frontend — image upload in ProductForm

**Files:**
- Modify: `apps/web/src/app/vendor/_components/product-form.tsx`

This task adds an Images section to the existing `ProductForm` component from Task 6.

- [ ] **Step 1: Add image types to the top of `product-form.tsx`**

After the existing imports, add:

```typescript
interface ProductImage {
  id: string;
  url: string;
  altText?: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

interface PendingUpload {
  file: File;
  previewUrl: string; // object URL for preview
  uploading: boolean;
  error: string;
}
```

- [ ] **Step 2: Add image state to `ProductForm`**

Inside the `ProductForm` function, after the existing `useState` calls, add:

```typescript
const [images, setImages] = useState<ProductImage[]>([]);
const [pending, setPending] = useState<PendingUpload[]>([]);
```

- [ ] **Step 3: Load existing images in edit mode**

In the `useEffect` that depends on `initialValues`, add image loading after form population. At the end of the `useEffect` where `initialValues` is applied, if `productId` is present, fetch the existing images:

```typescript
useEffect(() => {
  if (initialValues) setForm((prev) => ({ ...prev, ...initialValues }));
}, [initialValues]);

useEffect(() => {
  if (!productId) return;
  apiFetch<{ images: ProductImage[] }>(`/vendors/me/products/${productId}`)
    .then((p) => setImages(p.images ?? []))
    .catch(() => null);
}, [productId]);
```

Note: `getForVendor` now returns `images` in its include. Verify this is returned in the API response; if not, use `apiFetch<{ images: ProductImage[] }>`.

- [ ] **Step 4: Add the `uploadFile` function**

Inside `ProductForm`, below the `validate` function, add:

```typescript
const uploadFile = async (file: File, index: number): Promise<void> => {
  setPending((prev) =>
    prev.map((p, i) => (i === index ? { ...p, uploading: true, error: "" } : p))
  );
  try {
    const { presignedUrl, publicUrl } = await apiFetch<{ presignedUrl: string; publicUrl: string; key: string }>(
      `/vendors/me/products/${productId ?? "__new__"}/images/presign`,
      {
        method: "POST",
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      }
    );

    await fetch(presignedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    const saved = await apiFetch<ProductImage>(`/vendors/me/products/${productId ?? "__new__"}/images`, {
      method: "POST",
      body: JSON.stringify({ url: publicUrl, isPrimary: images.length === 0 }),
    });

    setImages((prev) => [...prev, saved]);
    setPending((prev) => prev.filter((_, i) => i !== index));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Upload failed.";
    setPending((prev) =>
      prev.map((p, i) => (i === index ? { ...p, uploading: false, error: msg } : p))
    );
  }
};
```

**Note:** For the create flow, `productId` is undefined at upload time. Upload happens after product creation. The `handleSubmit` function must be updated (Step 6) to create the product first, then upload.

- [ ] **Step 5: Add file selection handler**

```typescript
const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files ?? []);
  const totalAfter = images.length + pending.length + files.length;
  if (totalAfter > 5) {
    setError("Maximum 5 images per product.");
    return;
  }
  const newPending = files.map((file) => ({
    file,
    previewUrl: URL.createObjectURL(file),
    uploading: false,
    error: "",
  }));
  setPending((prev) => [...prev, ...newPending]);
  // reset input so same file can be re-selected after error
  e.target.value = "";
};
```

- [ ] **Step 6: Update `handleSubmit` to upload pending images after product creation**

Replace the submit logic for the create case so it uploads images after creating the product:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const err = validate();
  if (err) { setError(err); return; }
  setLoading(true);
  setError("");
  setSuccess("");

  const payload = {
    name: form.name,
    description: form.description,
    categoryId: form.categoryId,
    ...(form.fabric && { fabric: form.fabric }),
    ...(form.region && { region: form.region }),
    ...(form.weaverStory && { weaverStory: form.weaverStory }),
    ...(form.giTag && { giTag: form.giTag }),
    ...(form.hsnCode && { hsnCode: form.hsnCode }),
    ...(form.occasion && { occasion: form.occasion.split(",").map((s) => s.trim()).filter(Boolean) }),
    ...(form.tags && { tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean) }),
    variants: form.variants.map((v) => ({
      name: v.name,
      sku: v.sku,
      ...(v.color && { color: v.color }),
      pricePaise: Math.round(parseFloat(v.priceRupees) * 100),
      mrpPaise: Math.round(parseFloat(v.mrpRupees) * 100),
      ...(v.weightGrams && { weightGrams: parseInt(v.weightGrams) }),
      ...(v.quantity && { quantity: parseInt(v.quantity) }),
    })),
  };

  try {
    if (productId) {
      // Edit: save product fields, then upload any pending images
      await apiFetch(`/vendors/me/products/${productId}`, { method: "PATCH", body: JSON.stringify(payload) });
      await Promise.all(pending.map((_, i) => uploadFile(pending[i]!.file, i)));
      setSuccess("Product updated successfully.");
    } else {
      // Create: create product first, then upload images
      const created = await apiFetch<{ id: string }>("/vendors/me/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      // Upload each pending image sequentially to avoid race on isPrimary
      for (let i = 0; i < pending.length; i++) {
        const { presignedUrl, publicUrl } = await apiFetch<{ presignedUrl: string; publicUrl: string; key: string }>(
          `/vendors/me/products/${created.id}/images/presign`,
          { method: "POST", body: JSON.stringify({ filename: pending[i]!.file.name, contentType: pending[i]!.file.type }) }
        );
        await fetch(presignedUrl, { method: "PUT", headers: { "Content-Type": pending[i]!.file.type }, body: pending[i]!.file });
        await apiFetch(`/vendors/me/products/${created.id}/images`, {
          method: "POST",
          body: JSON.stringify({ url: publicUrl, isPrimary: i === 0 }),
        });
      }
      router.push("/vendor/products");
    }
  } catch (e: unknown) {
    setError(e instanceof Error ? e.message : "Failed to save product.");
  } finally {
    setLoading(false);
  }
};
```

- [ ] **Step 7: Add image delete and set-primary handlers**

```typescript
const deleteImage = async (image: ProductImage) => {
  if (!productId) return;
  try {
    await apiFetch(`/vendors/me/products/${productId}/images/${image.id}`, { method: "DELETE" });
    setImages((prev) => prev.filter((img) => img.id !== image.id));
  } catch { /* silent */ }
};

const setPrimaryImage = async (image: ProductImage) => {
  if (!productId) return;
  try {
    await apiFetch(`/vendors/me/products/${productId}/images/${image.id}/primary`, { method: "PATCH" });
    setImages((prev) => prev.map((img) => ({ ...img, isPrimary: img.id === image.id })));
  } catch { /* silent */ }
};
```

- [ ] **Step 8: Add Images section JSX to the form**

In the form JSX, after the Variants section `</div>` and before the error/success messages, add:

```tsx
<div className="rounded-xl border border-[#F0F0F0] bg-white p-6 shadow-sm space-y-4">
  <div className="flex items-center justify-between">
    <div>
      <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#1A1A1A]">Images</h2>
      <p className="text-xs text-[#696969] mt-0.5">Up to 5 images. First image is shown as primary.</p>
    </div>
    {(images.length + pending.length) < 5 && (
      <label className="cursor-pointer rounded-xl border border-primary px-4 py-2 text-xs font-bold text-primary hover:bg-primary/5 transition-colors">
        + Upload
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </label>
    )}
  </div>

  {(images.length > 0 || pending.length > 0) ? (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
      {images.map((img) => (
        <div
          key={img.id}
          className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-colors ${
            img.isPrimary ? "border-primary" : "border-[#E8E8E8]"
          }`}
        >
          <img src={img.url} alt={img.altText ?? "Product image"} className="h-full w-full object-cover" />
          {img.isPrimary && (
            <span className="absolute top-1 left-1 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-white">
              Primary
            </span>
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-end gap-1 bg-black/0 hover:bg-black/30 transition-colors p-1">
            {!img.isPrimary && productId && (
              <button
                type="button"
                onClick={() => { void setPrimaryImage(img); }}
                className="w-full rounded-lg bg-white/90 py-0.5 text-[9px] font-bold text-[#1A1A1A] hover:bg-white opacity-0 group-hover:opacity-100"
              >
                Set Primary
              </button>
            )}
            {productId && (
              <button
                type="button"
                onClick={() => { void deleteImage(img); }}
                className="w-full rounded-lg bg-red-600/90 py-0.5 text-[9px] font-bold text-white hover:bg-red-600"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ))}

      {pending.map((p, i) => (
        <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-dashed border-[#E8E8E8]">
          <img src={p.previewUrl} alt="Uploading…" className="h-full w-full object-cover opacity-60" />
          {p.uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
          {p.error && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-50/80 p-1">
              <p className="text-[9px] text-red-600 text-center font-bold">{p.error}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  ) : (
    <div className="rounded-xl border border-dashed border-[#E8E8E8] py-10 text-center text-sm text-[#9B9B9B]">
      No images yet. Click Upload to add product photos.
    </div>
  )}
</div>
```

- [ ] **Step 9: Typecheck**

```bash
pnpm --filter @sario/web typecheck
```

Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/app/vendor/_components/product-form.tsx
git commit -m "feat(vendor): product image upload with R2 presigned URLs in product form"
```

---

## Task 16: Frontend vendor attribution on storefront cards

**Files:**
- Modify: `apps/web/src/app/(storefront)/search/page.tsx`
- Modify: `apps/web/src/app/(storefront)/page.tsx`

- [ ] **Step 1: Add vendorName/vendorSlug to search page**

Open `apps/web/src/app/(storefront)/search/page.tsx`. Find the `SearchHit` interface and add:

```typescript
interface SearchHit {
  id: string;
  name: string;
  slug: string;
  region?: string;
  fabric?: string;
  minPricePaise: number;
  mrpPaise?: number;
  primaryImageUrl?: string;
  vendorName?: string;   // add
  vendorSlug?: string;   // add
}
```

Then find the product card rendering code (inside the grid of hits). Below the product name `<p>`, add:

```tsx
{hit.vendorName && hit.vendorSlug && (
  <Link
    href={`/weavers/${hit.vendorSlug}`}
    onClick={(e) => e.stopPropagation()}
    className="text-[10px] text-[#9B9B9B] hover:text-primary transition-colors truncate"
  >
    {hit.vendorName}
  </Link>
)}
```

- [ ] **Step 2: Add vendorName/vendorSlug to home page**

Open `apps/web/src/app/(storefront)/page.tsx`. Find the `Product` interface used for featured products and add:

```typescript
interface Product {
  id: string;
  name: string;
  slug: string;
  images: Array<{ url: string; altText?: string }>;
  variants: Array<{ pricePaise: number; mrpPaise: number }>;
  vendorName?: string;   // add
  vendorSlug?: string;   // add
}
```

Also update the type mapping in `getNewArrivals` for search hits:

```typescript
interface SearchHitHome {
  id: string;
  name: string;
  slug: string;
  primaryImageUrl?: string;
  minPricePaise: number;
  mrpPaise?: number;
  vendorName?: string;
  vendorSlug?: string;
}
```

And map it:

```typescript
return res.hits.map((h) => ({
  id: h.id,
  name: h.name,
  slug: h.slug,
  images: h.primaryImageUrl ? [{ url: h.primaryImageUrl }] : [],
  variants: [{ pricePaise: h.minPricePaise, mrpPaise: h.mrpPaise ?? h.minPricePaise }],
  vendorName: h.vendorName,
  vendorSlug: h.vendorSlug,
}));
```

Then add below the product name in product card JSX:

```tsx
{p.vendorName && p.vendorSlug && (
  <Link
    href={`/weavers/${p.vendorSlug}`}
    className="text-[10px] text-[#9B9B9B] hover:text-primary transition-colors truncate block"
  >
    {p.vendorName}
  </Link>
)}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @sario/web typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(storefront\)/search/page.tsx apps/web/src/app/\(storefront\)/page.tsx
git commit -m "feat(storefront): show vendor name on product cards in search and home"
```

---

## Task 17: Final typecheck + smoke test

- [ ] **Step 1: Full typecheck both apps**

```bash
pnpm typecheck
```

Expected: 0 errors across `@sario/web` and `@sario/api`.

- [ ] **Step 2: Start dev server**

```bash
pnpm dev
```

- [ ] **Step 3: Verify vendor portal flow**

1. Open `http://localhost:3000/vendor` — should redirect to `/auth?next=/vendor`
2. Sign in with test credentials
3. If no vendor exists → redirected to `/vendor/onboarding`
4. Complete 3-step wizard → submit → "Under Review" screen appears
5. Verify all 5 sidebar nav links are present at `http://localhost:3000/vendor`
6. Verify `/vendor/products`, `/vendor/products/new`, `/vendor/orders`, `/vendor/returns`, `/vendor/profile` all load without errors

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: vendor portal frontend — full implementation complete"
```
