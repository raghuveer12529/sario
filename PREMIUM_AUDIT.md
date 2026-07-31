# Sario — Premium Experience Audit

_Generated: 2026-05-14_

This file tracks every gap that prevents Sario from feeling and functioning like a premium saree marketplace. Issues are ordered by impact. Each item will be checked off as it is fixed.

---

## Design & Visual

| # | Issue | Status |
|---|-------|--------|
| D1 | **No hero banner** — homepage opens with 3 tiny gradient promotion cards instead of an aspirational full-width hero image/showcase | ✅ |
| D2 | **Identical category chip icons** — every chip uses the same generic globe SVG; each saree type should have a distinct icon or colour | ✅ |
| D3 | **Raw `<img>` tags** — product images throughout (homepage, search, PDP, cart) use `<img>` instead of `next/image`; no blur placeholder, no lazy loading, no sizing hints | ✅ |
| D4 | **Auth form sharp corners** — `rounded-sm` on the auth card looks like a corporate SaaS login, not a boutique storefront | ✅ |
| D5 | **"Trending Now" is a lie** — the section renders `products.slice().reverse()`, i.e. the exact same 12 featured items in reverse order; needs a real distinct data source | ✅ |
| D6 | **No cart count badge** — header cart icon shows no item count; users don't know anything is in their cart | ✅ |
| D7 | **No wishlist button on product cards** — hover reveals no quick-save action; premium fashion stores always have this | ✅ |
| D8 | **Typography is flat** — only Inter throughout; headings and the brand name deserve a display/serif font to feel artisanal | ✅ |

---

## Search & Filters

| # | Issue | Status |
|---|-------|--------|
| S1 | **No price range filter** — API accepts `minPrice` / `maxPrice` but there is no UI control exposing it | ✅ |
| S2 | **No region filter** — API accepts `region` but the sidebar and mobile drawer don't expose it | ✅ |
| S3 | **Pagination drops `categoryId` and `region` params** — page 2+ of a filtered category search loses the category context entirely | ✅ |
| S4 | **Mobile category nav is absent** — `CategoryNav` only shows on desktop (`lg:`); mobile users have no way to browse categories | ✅ |

---

## Checkout Flow

| # | Issue | Status |
|---|-------|--------|
| C1 | **Auth ignores `?next=` redirect** — after login, the user is always sent to `/account/orders` regardless of where they came from; breaks "add to cart → sign in → return to product" flow | ✅ |
| C2 | **Checkout savings badge is wrong** — when shipping is already `FREE` the summary footer says "You are saving ₹0 on delivery!" instead of hiding | ✅ |
| C3 | **Pincode delivery check is cosmetic** — the input and CHECK button on the PDP do nothing; either wire it up or remove the placeholder | ✅ |

---

## Code Quality / TypeScript

| # | Issue | Status |
|---|-------|--------|
| T1 | **`any` in checkout.tsx** — `handlePayment` types the Razorpay callback response as `any`; strict-mode violation | ✅ |
| T2 | **`any` in add-to-cart.tsx** — error catch block uses `err: any` | ✅ |

---

## Navigation

| # | Issue | Status |
|---|-------|--------|
| N1 | **Footer "Help" links are dead** — Returns & Refunds, Shipping Info, Contact Us, Terms of Use, Privacy Policy all have `href="#"` | ✅ |
| N2 | **Auth page Terms & Privacy links are dead** — users see "agree to our Terms & Privacy Policy" but clicking either does nothing | ✅ |
| N3 | **Mobile menu missing Profile & Saved Items links** — only "My Orders" shown for authenticated users in the mobile drawer | ✅ |
| N4 | **Desktop user dropdown missing Saved Items link** — no path to wishlist from the header dropdown | ✅ |
| N5 | **"Saved Addresses" profile sidebar button has no action** — no `onClick`, no route; silently does nothing | ✅ |
| N6 | **Wishlist button saves items but no page exists to view them** — `WishlistButton` writes to localStorage but `/wishlist` route was absent | ✅ |
| N7 | **Cart out-of-stock CTA is confusing** — "Adjust Quantities" button uses `href="#"` + `preventDefault`; no message about what to fix | ✅ |

---

## Fix Log

_Each fix will be noted here with a short description of what changed._

| Fix | File(s) | Notes |
|-----|---------|-------|
| C1 Auth redirect | `auth/page.tsx`, `header.tsx`, `add-to-cart.tsx` | Auth page reads `?next=` param; header and add-to-cart pass current pathname |
| S3 Pagination params | `search/page.tsx`, `search-controls.tsx` | `buildPageUrl` preserves all active filters; sidebar + controls propagate `categoryId` and `region` |
| C2 Savings badge | `checkout/page.tsx` | Only renders badge when `shipping === 0` with correct copy |
| C3 Pincode placeholder | `p/[slug]/page.tsx` | Removed non-functional input; kept delivery info cards |
| T1 Razorpay any | `checkout/page.tsx` | Typed as `RazorpayResponse` interface |
| T2 Add-to-cart any | `add-to-cart.tsx` | Catch block uses `err: unknown` |
| D1 Hero banner | `(storefront)/page.tsx` | Full-width dark purple hero with copy, stats, and offer cards |
| D2 Category icons | `(storefront)/page.tsx` | Emoji map keyed by category slug |
| D3 next/image | `page.tsx`, `search/page.tsx`, `cart/page.tsx` | `<img>` → `<Image fill sizes=...>` throughout |
| D4 Auth corners | `auth/page.tsx` | `rounded-sm` → `rounded-xl` across all form elements |
| D5 Trending Now | `(storefront)/page.tsx` | Replaced with real `getNewArrivals()` call using `sort=newest` |
| D6 Cart badge | `header.tsx` | Fetches cart on mount/pathname change; shows count badge |
| D7 Wishlist button | `wishlist-button.tsx` (new) | Client component with localStorage; heart icon on hover over product cards |
| D8 Typography | `layout.tsx`, `tailwind.config.ts` | Added Playfair Display as `--font-display`; `font-display` class for headings |
| S1 Price filter | `search-controls.tsx`, `search/page.tsx` | Price range radio buttons in sidebar; passes `minPrice`/`maxPrice` to API |
| S2 Region filter | `search-controls.tsx`, `search/page.tsx` | Region checkbox list in sidebar; passes `region` to API |
| S4 Mobile nav | `header.tsx` | Hamburger → slide-in drawer with full category tree + auth links |
| N1 Footer dead links | `layout.tsx` | `href="#"` → `Link` to `/returns`, `/shipping`, `/contact`, `/terms`, `/privacy` |
| N2 Auth Terms/Privacy | `auth/page.tsx` | `href="#"` → `Link` to `/terms` and `/privacy` |
| N3+N4 Mobile & desktop nav | `header.tsx` | Added Profile Settings, Saved Items to mobile drawer; Saved Items to desktop dropdown |
| N5 Saved Addresses | `account/profile/page.tsx` | Replaced invisible button with disabled + "Soon" badge |
| N6 Wishlist page | `wishlist/page.tsx` (new) | Client page reads localStorage IDs, fetches products from API, displays with remove button |
| N7 Cart OOS CTA | `cart/page.tsx` | Replaced `href="#"` + cryptic text with inline error panel explaining what to fix |
| — Info pages | `terms/page.tsx`, `privacy/page.tsx`, `returns/page.tsx`, `shipping/page.tsx`, `contact/page.tsx` (all new) | Full-content static pages for all five help links |
