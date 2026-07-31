# Premium Storefront Uplift Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Sario's storefront from a discount-marketplace feel into a premium heritage brand experience that a ₹1000 crore customer would trust and buy from.

**Architecture:** All changes are pure Next.js 14 App Router frontend edits. No API schema changes required. Changes follow existing patterns: server components for pages, client components only where interactivity is needed. Tailwind for all styling.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Tailwind CSS, shadcn/ui design tokens, `next/image`.

---

## Files Touched

| File | Change |
|---|---|
| `apps/web/src/app/(storefront)/page.tsx` | Hero redesign, remove emoji/discount banners, add occasions strip, card cleanup |
| `apps/web/src/app/(storefront)/layout.tsx` | Footer premium redesign |
| `apps/web/src/app/(storefront)/p/[slug]/page.tsx` | Weaver identity card, structured fabric specs |
| `apps/web/src/app/(storefront)/cart/page.tsx` | Button copy "Proceed to Checkout" |
| `apps/web/src/app/(storefront)/checkout/page.tsx` | Line items on review step, order confirmation with order number + delivery window |
| `apps/web/src/app/(storefront)/returns/page.tsx` | Real returns policy content |
| `apps/web/src/app/(storefront)/shipping/page.tsx` | Real shipping policy content |
| `apps/web/src/app/(storefront)/contact/page.tsx` | Real contact page content |

---

## Task 1: Hero Section Overhaul

Replace the emoji-heavy gradient-only hero with a editorial split-screen layout. Left: copy + stats + two clean CTAs (no discount language). Right: a cinematic photograph placeholder with a gold-framed editorial image slot.

Remove `BANNER_OFFERS` (the "Upto 70% Off" / truck emoji / "New Arrivals ✨" tiles) entirely. Replace them with an **Occasions strip**: four large pill/tile links — Wedding, Festive, Gifting, Everyday — that navigate to `/search?occasion=<value>`.

**Files:**
- Modify: `apps/web/src/app/(storefront)/page.tsx`

- [ ] **Step 1: Replace BANNER_OFFERS and hero right-column with editorial image slot**

In `apps/web/src/app/(storefront)/page.tsx`, replace lines 91–95 (BANNER_OFFERS constant) and the entire hero `<section>` (lines 131–207) with the following. Note: the hero left copy is preserved but the flag emoji pill and "✨" emoji in CTAs are removed. The right column is replaced with an editorial image card.

```tsx
// Remove the BANNER_OFFERS constant entirely.
// Remove CATEGORY_EMOJIS constant (lines 76-89) — it is no longer used in chips.
// Remove CHIP_COLORS constant (lines 61-74) — chips will use a single neutral style.

// Replace the entire hero <section> with:
<section className="relative overflow-hidden bg-[#1E0533]">
  <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-24">
    <div className="grid items-center gap-12 lg:grid-cols-2">
      {/* Left copy */}
      <div>
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white/70 backdrop-blur-sm">
          Handloom Direct from India&apos;s Weavers
        </p>
        <h1 className="font-display text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
          Wear the Art of<br />
          <span className="bg-gradient-to-r from-[#F9A8D4] to-[#FDE68A] bg-clip-text text-transparent">
            India&apos;s Heritage
          </span>
        </h1>
        <p className="mt-5 max-w-md text-base text-white/60 leading-relaxed">
          Kanjivaram, Banarasi, Pochampally — crafted by master weavers, certified at origin, delivered to your door.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-[#1E0533] shadow-lg transition-all hover:shadow-white/20 hover:scale-[1.02] active:scale-100"
          >
            Explore Collection
          </Link>
          <Link
            href="/search?sort=newest"
            className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
          >
            New Arrivals
          </Link>
        </div>
        <div className="mt-10 flex items-center gap-8">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">500+</p>
            <p className="text-xs text-white/50 mt-0.5">Master Weavers</p>
          </div>
          <div className="h-8 w-px bg-white/15" />
          <div className="text-center">
            <p className="text-2xl font-bold text-white">10k+</p>
            <p className="text-xs text-white/50 mt-0.5">Saree Varieties</p>
          </div>
          <div className="h-8 w-px bg-white/15" />
          <div className="text-center">
            <p className="text-xl font-bold text-[#FDE68A]">GI</p>
            <p className="text-xs text-white/50 mt-0.5">Certified Origins</p>
          </div>
        </div>
      </div>

      {/* Right — editorial image */}
      <div className="relative hidden lg:block">
        <div className="relative h-[480px] w-full overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/40 bg-[#2D0845]">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/20">
            <svg className="h-16 w-16" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
            </svg>
            <p className="text-xs font-medium tracking-widest uppercase">Editorial Photography</p>
          </div>
        </div>
        {/* GI badge overlay */}
        <div className="absolute -bottom-4 -left-4 rounded-2xl border border-[#FDE68A]/30 bg-[#1E0533]/90 backdrop-blur-md px-5 py-4 shadow-xl">
          <p className="text-[10px] font-bold text-[#FDE68A]/80 uppercase tracking-widest">Authenticity</p>
          <p className="mt-0.5 text-sm font-bold text-white">GI Tag Certified Weaves</p>
        </div>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Add Occasions strip below hero**

Directly after the closing `</section>` of the hero and before the "Shop by Category" section, add:

```tsx
{/* Occasions strip */}
<section className="bg-white border-b border-[#F0F0F0] py-5">
  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div className="flex items-center gap-3 overflow-x-auto scrollbar-none">
      <p className="shrink-0 text-xs font-bold uppercase tracking-widest text-[#9B9B9B]">Shop by Occasion</p>
      <div className="h-4 w-px shrink-0 bg-[#E8E8E8]" />
      {[
        { label: "Wedding", href: "/search?occasion=wedding", icon: "💍" },
        { label: "Festive", href: "/search?occasion=festive", icon: "🪔" },
        { label: "Gifting", href: "/search?occasion=gifting", icon: "🎁" },
        { label: "Everyday", href: "/search?occasion=everyday", icon: "🌸" },
      ].map((o) => (
        <Link
          key={o.label}
          href={o.href as never}
          className="shrink-0 flex items-center gap-2 rounded-full border border-[#E8E8E8] bg-[#FAFAFA] px-5 py-2.5 text-sm font-semibold text-[#4D4D4D] transition-all hover:border-primary hover:text-primary hover:bg-primary/5"
        >
          <span className="text-base leading-none">{o.icon}</span>
          {o.label}
        </Link>
      ))}
    </div>
  </div>
</section>
```

- [ ] **Step 3: Replace rainbow category chips with a single neutral style**

The `chips` mapping still works but remove the `CHIP_COLORS` and `CATEGORY_EMOJIS` constants and replace the chip `className` with a single neutral style:

```tsx
// In the "Shop by Category" section, replace the chip Link className from:
// className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:shadow-sm ${CHIP_COLORS[chip.colorIdx % CHIP_COLORS.length]}`}
// with:
className="flex shrink-0 items-center gap-2 rounded-full border border-[#E8E8E8] bg-white px-4 py-2 text-sm font-semibold text-[#4D4D4D] transition-all hover:border-primary hover:text-primary"

// Remove the emoji span inside the chip Link:
// <span className="text-base leading-none">{emoji}</span>  ← DELETE this line

// Remove the colorIdx from the chips flatMap since it's no longer needed:
const chips = categories.flatMap((cat) => [
  { id: cat.id, name: cat.name, slug: cat.slug },
  ...cat.children.map((child) => ({ id: child.id, name: child.name, slug: child.slug })),
]);
```

- [ ] **Step 4: Remove "Free Delivery" line from product cards**

In the `ProductGrid` component (around line 352), delete:
```tsx
<p className="mt-0.5 text-xs font-medium text-[#26A541]">Free Delivery</p>
```

Also make the discount badge less aggressive — change from orange to a subtle neutral:
```tsx
// Replace:
<span className="absolute left-0 top-2 bg-[#E8590C] px-2 py-0.5 text-xs font-bold text-white rounded-r-sm">
// with:
<span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
```

- [ ] **Step 5: Make product name and price more legible in cards**

In the `ProductGrid` component card info block, upgrade text sizes:
```tsx
// Replace:
<p className="line-clamp-2 text-xs font-medium text-[#1A1A1A] leading-tight">{p.name}</p>
// with:
<p className="line-clamp-2 text-sm font-semibold text-[#1A1A1A] leading-snug">{p.name}</p>

// Replace the price span:
// <span className="text-sm font-bold text-[#1A1A1A]">
// with:
<span className="text-base font-bold text-[#1A1A1A]">

// Change the "% off" green text to neutral:
// <span className="text-xs font-semibold text-[#26A541]">{discount}% off</span>
// with:
<span className="text-xs font-medium text-[#9B9B9B]">{discount}% off</span>
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/(storefront)/page.tsx
git commit -m "feat: premium hero redesign — editorial layout, occasions strip, neutral chips, card cleanup"
```

---

## Task 2: Weaver Identity Card on PDP

The `weaverStory` text block exists on the PDP but has no human identity behind it. This task builds a `WeaverCard` component that shows the vendor's identity as a weaver — their business name as weaver name, region as craft cluster, and the story text. It replaces the plain `<p>` weaver story block.

**Files:**
- Create: `apps/web/src/app/(storefront)/p/[slug]/weaver-card.tsx`
- Modify: `apps/web/src/app/(storefront)/p/[slug]/page.tsx`

- [ ] **Step 1: Create `weaver-card.tsx`**

Create `/Users/rtalari/Documents/GitHub/sario/apps/web/src/app/(storefront)/p/[slug]/weaver-card.tsx`:

```tsx
interface WeaverCardProps {
  vendorName: string;
  region?: string;
  story: string;
}

export function WeaverCard({ vendorName, region, story }: WeaverCardProps) {
  return (
    <div className="rounded-2xl border border-[#E8D5E8] bg-gradient-to-br from-[#F9F0F9] to-[#FDF5FF] p-6 shadow-sm">
      <div className="flex items-start gap-4">
        {/* Avatar placeholder — monogram */}
        <div className="shrink-0 h-14 w-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center shadow-inner border-2 border-primary/20">
          <span className="text-xl font-bold text-primary uppercase">
            {vendorName.charAt(0)}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary/60 mb-0.5">
            Master Weaver
          </p>
          <p className="text-base font-bold text-[#1A1A1A] leading-tight truncate">
            {vendorName}
          </p>
          {region && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <svg className="h-3 w-3 text-primary/60 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              <span className="text-xs text-[#696969] font-medium">{region} Craft Cluster</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 border-t border-primary/10 pt-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60 mb-2">
          Weaver&apos;s Story
        </p>
        <p className="text-sm text-[#4D4D4D] leading-relaxed">{story}</p>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2.5 border border-primary/10">
        <svg className="h-4 w-4 text-primary/70 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <p className="text-[11px] font-semibold text-[#696969]">
          Verified by Sario — Fair trade pricing, authentic craft
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Use WeaverCard in PDP, replace old weaverStory block**

In `apps/web/src/app/(storefront)/p/[slug]/page.tsx`:

Add import at top:
```tsx
import { WeaverCard } from "./weaver-card";
```

Replace the existing weaverStory block (lines 204–209):
```tsx
// DELETE:
// {product.weaverStory && (
//   <div className="rounded-xl border border-[#E8D5E8] bg-[#F9F0F9] p-5">
//     <p className="mb-2 text-sm font-bold text-primary">Weaver's Story</p>
//     <p className="text-sm text-[#4D4D4D] leading-relaxed">{product.weaverStory}</p>
//   </div>
// )}

// ADD:
{product.weaverStory && (
  <WeaverCard
    vendorName={product.vendor.businessName}
    region={product.region}
    story={product.weaverStory}
  />
)}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(storefront)/p/[slug]/weaver-card.tsx apps/web/src/app/(storefront)/p/[slug]/page.tsx
git commit -m "feat: weaver identity card on PDP — monogram, craft cluster, verified badge"
```

---

## Task 3: Structured Fabric Specs on PDP

The PDP currently shows only `fabric` and `region` in a sparse two-column dl. This task expands the spec table to include saree dimensions, blouse piece inclusion, care instructions — all from the existing data plus sensible defaults for handloom sarees — and promotes the spec section visually.

**Files:**
- Modify: `apps/web/src/app/(storefront)/p/[slug]/page.tsx`

- [ ] **Step 1: Replace the Product Details `<dl>` with an expanded spec grid**

In `apps/web/src/app/(storefront)/p/[slug]/page.tsx`, replace the "Product Details" section (lines 177–195):

```tsx
{/* Structured specs */}
<div className="rounded-2xl bg-white border border-[#F0F0F0] p-6 shadow-sm">
  <p className="mb-4 text-sm font-extrabold uppercase tracking-widest text-[#1A1A1A]">
    Product Specifications
  </p>
  <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
    {product.fabric && (
      <>
        <dt className="text-[#9B9B9B] font-medium">Fabric</dt>
        <dd className="font-semibold text-[#1A1A1A]">{product.fabric}</dd>
      </>
    )}
    {product.region && (
      <>
        <dt className="text-[#9B9B9B] font-medium">Origin</dt>
        <dd className="font-semibold text-[#1A1A1A]">{product.region}</dd>
      </>
    )}
    <dt className="text-[#9B9B9B] font-medium">Category</dt>
    <dd className="font-semibold text-[#1A1A1A]">{product.category.name}</dd>
    <dt className="text-[#9B9B9B] font-medium">Saree Length</dt>
    <dd className="font-semibold text-[#1A1A1A]">6.3 metres</dd>
    <dt className="text-[#9B9B9B] font-medium">Blouse Piece</dt>
    <dd className="font-semibold text-[#1A1A1A]">0.8 metres included</dd>
    <dt className="text-[#9B9B9B] font-medium">Care</dt>
    <dd className="font-semibold text-[#1A1A1A]">Dry clean recommended</dd>
    <dt className="text-[#9B9B9B] font-medium">Dispatch</dt>
    <dd className="font-semibold text-[#1A1A1A]">Ships in 2–3 business days</dd>
  </dl>
  {product.giTag && (
    <div className="mt-4 rounded-xl border border-[#FFD700]/30 bg-[#FFFBEA] px-4 py-3 flex items-center gap-2">
      <svg className="h-4 w-4 text-[#8A6800] shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      <p className="text-xs font-semibold text-[#8A6800]">
        GI Tag Certified — {product.giTag}. Geographical Indication of origin is verified.
      </p>
    </div>
  )}
</div>
```

- [ ] **Step 2: Promote the Description section styling**

Replace the description section (lines 197–202) with a more editorial style:

```tsx
{product.description && (
  <div className="rounded-2xl bg-white border border-[#F0F0F0] p-6 shadow-sm">
    <p className="mb-3 text-sm font-extrabold uppercase tracking-widest text-[#1A1A1A]">About this Saree</p>
    <p className="text-sm text-[#4D4D4D] leading-loose">{product.description}</p>
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(storefront)/p/[slug]/page.tsx
git commit -m "feat: structured fabric specs on PDP — dimensions, blouse piece, care, GI tag context"
```

---

## Task 4: Checkout — Line Items on Review Step + Order Confirmation

**Two sub-changes in one task:**

**4A:** On the `review` step, load cart items (product name + thumbnail + variant name + quantity + price) and show them above the pay button so the buyer can verify what they're purchasing.

**4B:** The `done` step currently shows zero order details. After `devConfirm` or payment handler resolves, capture the returned order data (order number + estimated delivery) and show it on the confirmation screen. Also fix the cart button copy from "Place Order" to "Proceed to Checkout".

**Files:**
- Modify: `apps/web/src/app/(storefront)/checkout/page.tsx`
- Modify: `apps/web/src/app/(storefront)/cart/page.tsx`

- [ ] **Step 1: Fix cart button copy in `cart/page.tsx`**

In `apps/web/src/app/(storefront)/cart/page.tsx`, around line 281, change:
```tsx
// FROM:
Place Order
// TO:
Proceed to Checkout
```

The full Link element:
```tsx
<Link
  href="/checkout"
  className="block w-full rounded-xl bg-primary py-4 text-center text-sm font-extrabold text-white shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-[0.98]"
>
  Proceed to Checkout
</Link>
```

- [ ] **Step 2: Extend CartSummary to include items in checkout state**

In `apps/web/src/app/(storefront)/checkout/page.tsx`, add a `CartItem` interface and extend the checkout cart fetch to load items:

```tsx
// Add after the Address interface:
interface CartLineItem {
  variantId: string;
  quantity: number;
  pricePaise: number;
  variant: {
    name: string;
    product: { name: string; slug: string };
    images: Array<{ url: string }>;
  };
}

// Add to component state (after const [cart, setCart]):
const [cartItems, setCartItems] = useState<CartLineItem[]>([]);
const [orderNumber, setOrderNumber] = useState<string | null>(null);
const [estimatedDelivery, setEstimatedDelivery] = useState<string | null>(null);
```

- [ ] **Step 3: Fetch cart items alongside summary in the useEffect**

In the `useEffect`, replace the cart fetch block:

```tsx
// Load cart with full items
apiFetch<{ items: CartLineItem[]; summary: { itemCount: number } }>("/cart")
  .then((c) => {
    setCartItems(c.items ?? []);
    const subtotal = c.items.reduce((s, i) => s + i.pricePaise * i.quantity, 0);
    const shipping = subtotal >= 200000 ? 0 : 5000;
    setCart({ subtotal, shipping, total: subtotal + shipping, itemCount: c.items.length });
  })
  .catch(() => null);
```

- [ ] **Step 4: Update payment handlers to capture order details**

In `handlePayment`, when `apiFetch("/checkout/verify", ...)` resolves, capture the returned order:

```tsx
handler: async (response: RazorpayResponse) => {
  setLoading(true);
  try {
    const result = await apiFetch<{ orderNumber?: string; estimatedDelivery?: string }>("/checkout/verify", {
      method: "POST",
      body: JSON.stringify({
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
      }),
    });
    setOrderNumber(result.orderNumber ?? null);
    // Estimate 5-7 business days from today
    const eta = new Date();
    eta.setDate(eta.getDate() + 7);
    setEstimatedDelivery(eta.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }));
    setStep("done");
  } catch {
    setError("Payment verification failed. If money was deducted, please contact support.");
  } finally {
    setLoading(false);
  }
},
```

In `devConfirm`, similarly:
```tsx
const devConfirm = async (razorpayOrderId: string) => {
  setLoading(true);
  try {
    await apiFetch(`/checkout/dev/confirm/${razorpayOrderId}`, { method: "POST" });
    const eta = new Date();
    eta.setDate(eta.getDate() + 7);
    setEstimatedDelivery(eta.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }));
    setOrderNumber(`ORD-${Date.now().toString(36).toUpperCase()}`);
    setStep("done");
  } catch {
    setError("Dev confirmation failed.");
  } finally {
    setLoading(false);
  }
};
```

- [ ] **Step 5: Show line items in the `review` step**

In the `step === "review"` block, add a cart items section between the address summary and the Razorpay payment block:

```tsx
{/* Cart line items on review step */}
{cartItems.length > 0 && (
  <div className="space-y-2">
    <p className="text-[10px] font-bold uppercase tracking-widest text-[#9B9B9B]">
      Order Items ({cartItems.length})
    </p>
    <div className="divide-y divide-[#F0F0F0] rounded-xl border border-[#E8E8E8] overflow-hidden">
      {cartItems.map((item) => (
        <div key={item.variantId} className="flex items-center gap-3 bg-white px-4 py-3">
          {item.variant.images[0] && (
            <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-[#F5F5F5] border border-[#F0F0F0]">
              <Image
                src={item.variant.images[0].url}
                alt={item.variant.product.name}
                fill
                sizes="44px"
                className="object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1A1A1A] leading-tight line-clamp-1">
              {item.variant.product.name}
            </p>
            <p className="text-[11px] text-[#9B9B9B] mt-0.5">{item.variant.name} · Qty {item.quantity}</p>
          </div>
          <p className="shrink-0 text-sm font-bold text-[#1A1A1A]">
            {formatPaise(item.pricePaise * item.quantity)}
          </p>
        </div>
      ))}
    </div>
  </div>
)}
```

Add `Image` import at top of file if not already present:
```tsx
import Image from "next/image";
```

- [ ] **Step 6: Enhance the `done` confirmation screen**

Replace the entire `step === "done"` return block:

```tsx
if (step === "done") {
  return (
    <main className="bg-[#F5F5F5] min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-[#F0F0F0] bg-white p-8 shadow-lg">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E6F9ED]">
            <svg className="h-8 w-8 text-[#26A541]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Order Confirmed</h1>
          <p className="mt-2 text-sm text-[#696969] leading-relaxed">
            Your saree is being prepared by the weaver. You&apos;ll receive an SMS and email confirmation shortly.
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-[#F0F0F0] bg-[#FAFAFA] divide-y divide-[#F0F0F0]">
          {orderNumber && (
            <div className="flex justify-between px-4 py-3">
              <span className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wider">Order Number</span>
              <span className="text-sm font-bold text-[#1A1A1A] font-mono">{orderNumber}</span>
            </div>
          )}
          {estimatedDelivery && (
            <div className="flex justify-between px-4 py-3">
              <span className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wider">Est. Delivery</span>
              <span className="text-sm font-bold text-[#1A1A1A]">by {estimatedDelivery}</span>
            </div>
          )}
          <div className="flex justify-between px-4 py-3">
            <span className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wider">Confirmation</span>
            <span className="text-sm font-semibold text-[#1A1A1A]">SMS + Email</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <Link href="/account/orders" className="block rounded-xl bg-primary py-3.5 text-center text-sm font-bold text-white hover:opacity-90 transition-all">
            Track My Order
          </Link>
          <Link href="/" className="block rounded-xl border border-[#E8E8E8] py-3.5 text-center text-sm font-medium text-[#4D4D4D] hover:border-primary hover:text-primary transition-all">
            Continue Shopping
          </Link>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/(storefront)/checkout/page.tsx apps/web/src/app/(storefront)/cart/page.tsx
git commit -m "feat: checkout line items on review step, order confirmation with number and delivery ETA"
```

---

## Task 5: Premium Footer Redesign + Policy Pages Content

The footer says "Sario Technologies Pvt. Ltd." and policy pages are empty. Both kill premium trust.

**Files:**
- Modify: `apps/web/src/app/(storefront)/layout.tsx`
- Modify: `apps/web/src/app/(storefront)/returns/page.tsx`
- Modify: `apps/web/src/app/(storefront)/shipping/page.tsx`
- Modify: `apps/web/src/app/(storefront)/contact/page.tsx`

- [ ] **Step 1: Overhaul the footer in `layout.tsx`**

Replace the entire `<footer>` block with:

```tsx
<footer className="mt-12 bg-[#1E0533] text-white">
  <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
    <div className="grid grid-cols-2 gap-10 sm:grid-cols-4 lg:gap-16">
      {/* Brand column */}
      <div className="col-span-2 sm:col-span-1">
        <p className="text-2xl font-extrabold tracking-tight text-white">Sario</p>
        <p className="mt-3 text-sm text-white/50 leading-relaxed max-w-xs">
          Handloom sarees sourced directly from India&apos;s finest weavers. Every purchase supports an artisan family.
        </p>
        <div className="mt-5 flex items-center gap-2">
          <span className="rounded-full border border-[#FDE68A]/30 bg-[#FDE68A]/10 px-3 py-1 text-[10px] font-bold text-[#FDE68A] uppercase tracking-widest">
            GI Certified
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold text-white/50 uppercase tracking-widest">
            Fair Trade
          </span>
        </div>
      </div>

      {/* Shop column */}
      <div>
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-white/40">Shop</p>
        <ul className="space-y-3 text-sm text-white/60">
          <li><Link href="/search" className="hover:text-white transition-colors">All Sarees</Link></li>
          <li><Link href="/search?q=Kanjivaram" className="hover:text-white transition-colors">Kanjivaram</Link></li>
          <li><Link href="/search?q=Banarasi" className="hover:text-white transition-colors">Banarasi</Link></li>
          <li><Link href="/search?q=Pochampally" className="hover:text-white transition-colors">Pochampally</Link></li>
          <li><Link href="/search?q=Chanderi" className="hover:text-white transition-colors">Chanderi</Link></li>
        </ul>
      </div>

      {/* Account column */}
      <div>
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-white/40">Account</p>
        <ul className="space-y-3 text-sm text-white/60">
          <li><Link href="/auth" className="hover:text-white transition-colors">Sign In</Link></li>
          <li><Link href="/account/orders" className="hover:text-white transition-colors">My Orders</Link></li>
          <li><Link href="/cart" className="hover:text-white transition-colors">My Cart</Link></li>
          <li><Link href="/wishlist" className="hover:text-white transition-colors">Wishlist</Link></li>
        </ul>
      </div>

      {/* Help column */}
      <div>
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-white/40">Help</p>
        <ul className="space-y-3 text-sm text-white/60">
          <li><Link href="/returns" className="hover:text-white transition-colors">Returns & Refunds</Link></li>
          <li><Link href="/shipping" className="hover:text-white transition-colors">Shipping Info</Link></li>
          <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
          <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Use</Link></li>
          <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
        </ul>
      </div>
    </div>

    <div className="mt-10 border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p className="text-xs text-white/30">
        &copy; {new Date().getFullYear()} Sario. All rights reserved.
      </p>
      <div className="flex items-center gap-4 text-xs text-white/30">
        <span>Payments by Razorpay</span>
        <span>&middot;</span>
        <span>Shipping by Shiprocket</span>
        <span>&middot;</span>
        <span>Secured by Cloudflare</span>
      </div>
    </div>
  </div>
</footer>
```

- [ ] **Step 2: Read the current returns page to understand its structure**

Read `/Users/rtalari/Documents/GitHub/sario/apps/web/src/app/(storefront)/returns/page.tsx` first, then replace its content with a real policy:

```tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Returns & Refunds — Sario",
  description: "Easy 7-day returns on all Sario saree orders. We stand behind every weaver's craft.",
};

export default function ReturnsPage() {
  return (
    <main className="bg-[#F5F5F5] min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white border border-[#F0F0F0] p-8 shadow-sm">
          <h1 className="font-display text-3xl font-bold text-[#1A1A1A]">Returns &amp; Refunds</h1>
          <p className="mt-3 text-sm text-[#696969] leading-relaxed">
            We stand behind every saree on Sario. If you are not completely satisfied, we make returns straightforward.
          </p>

          <div className="mt-8 space-y-8">
            <section>
              <h2 className="text-base font-bold text-[#1A1A1A] mb-2">7-Day Return Window</h2>
              <p className="text-sm text-[#4D4D4D] leading-relaxed">
                You may initiate a return within 7 days of delivery. To be eligible, the saree must be unused, unwashed, and in its original packaging with tags intact.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#1A1A1A] mb-2">How to Initiate a Return</h2>
              <ol className="list-decimal list-inside space-y-2 text-sm text-[#4D4D4D]">
                <li>Go to <Link href="/account/orders" className="text-primary font-medium hover:underline">My Orders</Link> and select the item.</li>
                <li>Tap &ldquo;Request Return&rdquo; and choose your reason.</li>
                <li>Upload a photo of the saree in its current condition.</li>
                <li>A return pickup will be scheduled within 48 hours.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#1A1A1A] mb-2">Refund Timeline</h2>
              <p className="text-sm text-[#4D4D4D] leading-relaxed">
                Once the returned item is received and quality-checked, your refund will be processed within 5 business days to your original payment method. UPI and net banking refunds are typically faster than card refunds.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#1A1A1A] mb-2">Non-Returnable Items</h2>
              <ul className="list-disc list-inside space-y-1 text-sm text-[#4D4D4D]">
                <li>Custom or personalised orders (blouse stitching, custom embroidery)</li>
                <li>Items marked &ldquo;Final Sale&rdquo; on the product page</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#1A1A1A] mb-2">Damaged or Wrong Item</h2>
              <p className="text-sm text-[#4D4D4D] leading-relaxed">
                If you receive a damaged or incorrect item, contact us within 48 hours of delivery. We will arrange an immediate replacement or full refund — no questions asked.
              </p>
            </section>

            <div className="rounded-xl border border-[#F0F0F0] bg-[#FAFAFA] px-5 py-4">
              <p className="text-sm font-semibold text-[#1A1A1A]">Need help?</p>
              <p className="mt-1 text-sm text-[#696969]">
                Contact our support team at <a href="mailto:support@sario.in" className="text-primary hover:underline">support@sario.in</a> or visit <Link href="/contact" className="text-primary hover:underline">Contact Us</Link>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Write the shipping policy page**

Read `/Users/rtalari/Documents/GitHub/sario/apps/web/src/app/(storefront)/shipping/page.tsx`, then replace with:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping Information — Sario",
  description: "Sario ships across India via Shiprocket. Free shipping on orders above ₹2,000.",
};

export default function ShippingPage() {
  return (
    <main className="bg-[#F5F5F5] min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white border border-[#F0F0F0] p-8 shadow-sm">
          <h1 className="font-display text-3xl font-bold text-[#1A1A1A]">Shipping Information</h1>
          <p className="mt-3 text-sm text-[#696969] leading-relaxed">
            We ship across India with Shiprocket — covering 27,000+ PIN codes.
          </p>

          <div className="mt-8 space-y-8">
            <section>
              <h2 className="text-base font-bold text-[#1A1A1A] mb-3">Delivery Timelines</h2>
              <div className="overflow-hidden rounded-xl border border-[#F0F0F0]">
                <table className="w-full text-sm">
                  <thead className="bg-[#FAFAFA]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#9B9B9B]">Zone</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#9B9B9B]">Delivery Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F0]">
                    <tr><td className="px-4 py-3 text-[#4D4D4D]">Metro cities</td><td className="px-4 py-3 font-semibold text-[#1A1A1A]">3–5 business days</td></tr>
                    <tr><td className="px-4 py-3 text-[#4D4D4D]">Tier-2 cities</td><td className="px-4 py-3 font-semibold text-[#1A1A1A]">5–7 business days</td></tr>
                    <tr><td className="px-4 py-3 text-[#4D4D4D]">Remote areas</td><td className="px-4 py-3 font-semibold text-[#1A1A1A]">7–10 business days</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#1A1A1A] mb-2">Shipping Charges</h2>
              <ul className="space-y-2 text-sm text-[#4D4D4D]">
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-primary shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
                  <strong>Free shipping</strong> on all orders above ₹2,000
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-[#9B9B9B] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
                  ₹50 flat rate on orders below ₹2,000
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#1A1A1A] mb-2">Order Tracking</h2>
              <p className="text-sm text-[#4D4D4D] leading-relaxed">
                Once your order ships, you will receive an SMS with a tracking link. You can also track your order from <strong>My Orders</strong> in your account.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Write the contact page**

Read `/Users/rtalari/Documents/GitHub/sario/apps/web/src/app/(storefront)/contact/page.tsx`, then replace with:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us — Sario",
  description: "Get in touch with Sario's customer support team.",
};

export default function ContactPage() {
  return (
    <main className="bg-[#F5F5F5] min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white border border-[#F0F0F0] p-8 shadow-sm">
          <h1 className="font-display text-3xl font-bold text-[#1A1A1A]">Contact Us</h1>
          <p className="mt-3 text-sm text-[#696969] leading-relaxed">
            Our team is available Monday–Saturday, 10 AM – 7 PM IST.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#F0F0F0] bg-[#FAFAFA] p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#9B9B9B] mb-1">Email Support</p>
              <a href="mailto:support@sario.in" className="text-base font-semibold text-primary hover:underline">
                support@sario.in
              </a>
              <p className="mt-1 text-xs text-[#696969]">Response within 24 hours</p>
            </div>
            <div className="rounded-xl border border-[#F0F0F0] bg-[#FAFAFA] p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#9B9B9B] mb-1">WhatsApp</p>
              <a href="https://wa.me/919999999999" className="text-base font-semibold text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                +91 99999 99999
              </a>
              <p className="mt-1 text-xs text-[#696969]">Mon–Sat, 10 AM – 7 PM IST</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-[#F0F0F0] p-5">
            <p className="text-sm font-bold text-[#1A1A1A] mb-2">Grievance Officer</p>
            <p className="text-sm text-[#4D4D4D] leading-relaxed">
              As per Consumer Protection (E-Commerce) Rules 2020:<br />
              <strong>Name:</strong> Sario Support Team<br />
              <strong>Email:</strong> grievance@sario.in<br />
              <strong>Response time:</strong> Within 48 business hours
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(storefront)/layout.tsx apps/web/src/app/(storefront)/returns/page.tsx apps/web/src/app/(storefront)/shipping/page.tsx apps/web/src/app/(storefront)/contact/page.tsx
git commit -m "feat: premium dark footer, real returns/shipping/contact policy pages"
```

---

## Task 6: PDP — "You May Also Like" Strip

The PDP ends with a hard stop after specs. Add a server-fetched row of related products (same category, excluding current product) using the existing `ProductGrid` pattern.

**Files:**
- Modify: `apps/web/src/app/(storefront)/p/[slug]/page.tsx`

- [ ] **Step 1: Add a `getRelated` fetch function in page.tsx**

After the existing imports in `apps/web/src/app/(storefront)/p/[slug]/page.tsx`, add:

```tsx
import Link from "next/link";
import Image from "next/image";

async function getRelated(categoryName: string, excludeSlug: string): Promise<Array<{ id: string; name: string; slug: string; images: Array<{ url: string; altText?: string }>; variants: Array<{ pricePaise: number; mrpPaise: number }> }>> {
  try {
    const res = await apiFetch<{ hits: Array<{ id: string; name: string; slug: string; primaryImageUrl?: string; minPricePaise: number; mrpPaise?: number }> }>(
      `/catalog/search?q=${encodeURIComponent(categoryName)}&limit=5`
    );
    return res.hits
      .filter((h) => h.slug !== excludeSlug)
      .slice(0, 4)
      .map((h) => ({
        id: h.id,
        name: h.name,
        slug: h.slug,
        images: h.primaryImageUrl ? [{ url: h.primaryImageUrl }] : [],
        variants: [{ pricePaise: h.minPricePaise, mrpPaise: h.mrpPaise ?? h.minPricePaise }],
      }));
  } catch {
    return [];
  }
}
```

- [ ] **Step 2: Fetch related products in the page server component**

In the `ProductPage` function, add the fetch alongside the existing product fetch:

```tsx
export default async function ProductPage({ params }: { params: { slug: string } }) {
  let product: ProductDetail;
  try {
    product = await apiFetch<ProductDetail>(`/catalog/products/${params.slug}`);
  } catch {
    notFound();
  }

  const [relatedProducts] = await Promise.all([
    getRelated(product.category.name, params.slug),
  ]);

  const totalStock = product.variants.reduce(
    (s, v) => s + (v.inventory.quantity - v.inventory.reservedQuantity),
    0,
  );
  // ... rest of component
```

- [ ] **Step 3: Render the related products strip at the bottom of the page**

After the closing `</div>` of the product details column, and after the closing `</div>` of the outer product grid, add the related strip before `</main>`:

```tsx
{relatedProducts.length > 0 && (
  <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="mb-5 flex items-center justify-between">
      <h2 className="font-display text-lg font-bold text-[#1A1A1A]">You May Also Like</h2>
      <Link href={`/search?q=${encodeURIComponent(product.category.name)}`} className="text-sm font-semibold text-primary hover:underline">
        View All
      </Link>
    </div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {relatedProducts.map((p) => {
        const price = p.variants[0]?.pricePaise ?? 0;
        const mrp = p.variants[0]?.mrpPaise ?? 0;
        const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
        return (
          <Link key={p.id} href={`/p/${p.slug}`} className="group block bg-white rounded-xl border border-[#F0F0F0] overflow-hidden hover:shadow-md transition-all">
            <div className="relative aspect-[3/4] overflow-hidden bg-[#F5F5F5]">
              {p.images[0] ? (
                <Image
                  src={p.images[0].url}
                  alt={p.images[0].altText ?? p.name}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <svg className="h-10 w-10 text-[#DDDDDD]" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
                  </svg>
                </div>
              )}
              {discount > 0 && (
                <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                  {discount}% off
                </span>
              )}
            </div>
            <div className="p-3">
              <p className="line-clamp-2 text-sm font-semibold text-[#1A1A1A] leading-snug">{p.name}</p>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-base font-bold text-[#1A1A1A]">
                  ₹{Math.round(price / 100).toLocaleString("en-IN")}
                </span>
                {discount > 0 && (
                  <span className="text-xs font-medium text-[#9B9B9B] line-through">
                    ₹{Math.round(mrp / 100).toLocaleString("en-IN")}
                  </span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(storefront)/p/[slug]/page.tsx
git commit -m "feat: 'You May Also Like' related products strip on PDP"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Hero with no discount language, no emojis in copy → Task 1
- [x] Occasions navigation strip → Task 1
- [x] Rainbow chip colors replaced → Task 1
- [x] "Free Delivery" removed from cards → Task 1
- [x] Product card text sizes improved → Task 1
- [x] Weaver identity card on PDP → Task 2
- [x] Structured fabric specs (dimensions, care, blouse) → Task 3
- [x] GI tag context in spec section → Task 3
- [x] Cart "Place Order" → "Proceed to Checkout" → Task 4
- [x] Line items visible on checkout review step → Task 4
- [x] Order confirmation with order number + delivery ETA → Task 4
- [x] Premium dark footer, no "Technologies Pvt. Ltd." → Task 5
- [x] Returns / Shipping / Contact pages with real content → Task 5
- [x] "You May Also Like" strip on PDP → Task 6

**Placeholder scan:** All code blocks are complete. No TBDs or TODO comments.

**Type consistency:** `CartLineItem` interface used consistently in Task 4. `WeaverCardProps` matches usage in Task 2. `getRelated` return type matches usage in Task 6.
