# Sario UX/UI Audit

Date: 2026-05-06  
Scope: `apps/web` buyer storefront and `apps/admin` admin panel.  
Method: static UI/code review of current repository state. I did not run the apps in a browser for this pass, so visual severity should be confirmed with Playwright screenshots before implementation.

## Executive Summary

The buyer storefront has a solid commerce skeleton, but several UX bugs currently affect conversion-critical flows: mobile sign-in access is hidden, checkout advances with invalid or unsaved addresses, the payment step bypasses Razorpay through a dev confirmation endpoint, and account orders are mocked with non-functional actions. Product pages also show hard-coded ratings/reviews and broad trust claims that can mislead buyers.

The admin app is usable on desktop for simple moderation, but it lacks mobile navigation, active nav states, detail views, visible error handling, and clear post-action feedback. Several admin failures are silently converted to empty states, which can make operators think queues are clear when the API actually failed.

## Priority Findings

### ~~P0 - Checkout Uses Dev Payment Confirmation~~ - [FIXED]
- Surface: Buyer checkout
- Evidence: `apps/web/src/app/(storefront)/checkout/page.tsx:135-144`
- Issue: After `/checkout/initiate`, the UI calls `/checkout/dev/confirm/{razorpayOrderId}` directly and then shows "Order Placed". This bypasses the real Razorpay UI/SDK and creates a false production checkout experience.
- User impact: Buyers may see a confirmed order without completing payment; QA may miss production payment failures.
- Recommendation: Replace the dev confirm call with the Razorpay checkout modal, success/failure callbacks, and a pending/failed payment state. Keep the dev confirm endpoint behind an explicit local-only feature flag.

### ~~P0 - Checkout Allows Broken Address Flow~~ - [FIXED]
- Surface: Buyer checkout
- Evidence: `apps/web/src/app/(storefront)/checkout/page.tsx:92-113`, `apps/web/src/app/(storefront)/checkout/page.tsx:269-272`
- Issue: If saving `/me/addresses` fails, checkout silently creates a `local_*` address id and moves to review. The CTA only checks that some fields are non-empty, not phone format, pincode length, or address persistence.
- User impact: Buyers can reach payment with an address the API does not know about; failed address saves look successful until order placement fails later.
- Recommendation: Treat address save failure as blocking, show the server error inline, validate 10-digit phone and 6-digit pincode, and only advance when a real persisted address id exists.

### ~~P0 - Orders Page Shows Mock Orders and Dead Actions~~ - [FIXED]
- Surface: Buyer account orders
- Evidence: `apps/web/src/app/(storefront)/account/orders/page.tsx:46-67`, `apps/web/src/app/(storefront)/account/orders/page.tsx:78-85`, `apps/web/src/app/(storefront)/account/orders/page.tsx:180-194`
- Issue: Signed-in users see hard-coded mock orders instead of their real orders. "Track Shipment" can point to `#`, while "Request Return" and "View Details" are buttons with no handlers.
- User impact: Account history is unreliable and post-purchase support actions do nothing.
- Recommendation: Fetch `/orders`, add real order detail pages or expandable rows, wire return requests, and hide unavailable actions rather than rendering inert buttons.

### ~~P1 - Mobile Header Hides Sign In~~ - [FIXED]
- Surface: Storefront header
- Evidence: `apps/web/src/components/layout/header.tsx:58-72`, `apps/web/src/components/layout/header.tsx:143-149`
- Issue: When logged out, the only explicit "Sign In" link is hidden below `sm`. Mobile users only see an unlabeled person icon linking to `/account/orders`, then get a sign-in prompt.
- User impact: New mobile shoppers have a less direct path to authenticate before checkout.
- Recommendation: Show an icon-accessible account/sign-in button on mobile with `aria-label`, or use a compact "Sign in" label. Make the account icon route directly to `/auth` when logged out.

### ~~P1 - Add-to-Cart Can Start With an Out-of-Stock Variant~~ - [FIXED]
- Surface: Product detail page
- Evidence: `apps/web/src/app/(storefront)/p/[slug]/add-to-cart.tsx:20`, `apps/web/src/app/(storefront)/p/[slug]/add-to-cart.tsx:31-33`, `apps/web/src/app/(storefront)/p/[slug]/add-to-cart.tsx:163-179`
- Issue: The first variant is selected even if it is out of stock. If later variants are available, the primary CTAs still appear disabled until the user manually finds an in-stock variant.
- User impact: Buyers may think the whole product is unavailable.
- Recommendation: Default to the first in-stock variant. If all variants are unavailable, show a single out-of-stock state with notify/wishlist support.

### ~~P1 - Product Ratings and Review Counts Are Hard-Coded~~ - [FIXED]
- Surface: Product detail page
- Evidence: `apps/web/src/app/(storefront)/p/[slug]/page.tsx:117-123`
- Issue: Every product renders "4.2", "1,234 ratings", and "234 reviews" regardless of product data.
- User impact: Misleading trust signal and potential compliance/reputation risk.
- Recommendation: Hide ratings until real review data exists, or render "No reviews yet" with a prompt to review after delivery.

### ~~P1 - Product Gallery Has Weak Mobile/Accessibility Behavior~~ - [FIXED]
- Surface: Product detail image gallery
- Evidence: `apps/web/src/app/(storefront)/p/[slug]/image-gallery.tsx:18-49`
- Issue: Thumbnails are always a vertical strip, only the first six images are reachable, there is no horizontal mobile thumbnail layout, no selected state label, and no zoom/full-screen view.
- User impact: Saree buyers cannot inspect fabric, border, pallu, and texture details easily, especially on phones.
- Recommendation: Use horizontal scroll thumbnails on mobile, support all images, add `aria-label`/`aria-pressed`, and add zoom/lightbox with pinch-friendly gestures.

### ~~P1 - Cart Quantity Ignores Available Inventory in UI~~ - [FIXED]
- Surface: Cart page
- Evidence: `apps/web/src/app/(storefront)/cart/page.tsx:13-18`, `apps/web/src/app/(storefront)/cart/page.tsx:195-210`
- Issue: Cart item data includes inventory, but the plus button does not disable at available stock and there is no stock warning near the item.
- User impact: Buyers can repeatedly request invalid quantities and only discover the problem through API errors.
- Recommendation: Compute available quantity per item, cap the stepper, show "Only N left" when relevant, and place the error on the affected cart item.

### ~~P1 - Cart and Checkout Shipping Logic Can Diverge From Backend~~ - [FIXED]
- Surface: Cart and checkout price summaries
- Evidence: `apps/web/src/app/(storefront)/cart/page.tsx:96-99`, `apps/web/src/app/(storefront)/checkout/page.tsx:80-83`
- Issue: Shipping is calculated locally as free over `200000` paise and `5000` otherwise. Checkout does not use a server-priced order summary.
- User impact: Buyers may see a different amount than the actual payment intent, especially once coupons, zone shipping, COD fees, or vendor splits exist.
- Recommendation: Fetch a backend cart/checkout summary and render server-calculated subtotal, shipping, discounts, taxes, and payable total.

### ~~P1 - Admin API Failures Look Like Empty Queues~~ - [FIXED]
- Surface: Admin vendors/products/orders/returns
- Evidence: `apps/admin/src/app/vendors/page.tsx:40-45`, `apps/admin/src/app/products/page.tsx:39-44`, `apps/admin/src/app/orders/page.tsx:57-62`
- Issue: Fetch failures are caught and rendered as empty arrays. Operators see "No pending vendors" or "Nothing to review" when the API may be down or auth may have expired.
- User impact: Moderation and fulfillment work can be missed.
- Recommendation: Track `error` separately from empty data, show retry actions, and redirect to `/login` on unauthorized responses.

### ~~P1 - Admin Actions Close Immediately Without Error Feedback~~ - [FIXED]
- Surface: Admin vendor/product/return moderation
- Evidence: `apps/admin/src/app/vendors/page.tsx:48-53`, `apps/admin/src/app/vendors/page.tsx:68-76`, `apps/admin/src/app/products/page.tsx:47-57`, `apps/admin/src/app/products/page.tsx:67-75`
- Issue: Confirm/reject dialogs close before the async action result is known. Failed approve/reject/suspend calls have no visible loading, failure, or retry state.
- User impact: Admins may believe moderation succeeded when it did not.
- Recommendation: Keep dialogs open during submission, disable buttons while pending, show error messages, and only remove rows after confirmed success.

### ~~P1 - Admin Layout Is Not Mobile-Friendly~~ - [FIXED]
- Surface: Admin shell
- Evidence: `apps/admin/src/app/layout.tsx:68-103`
- Issue: The app always renders a fixed-width sidebar and a table-heavy main area. There is no mobile top bar, drawer nav, or responsive card/table alternative.
- User impact: Admin tasks are difficult or unusable on tablet/phone.
- Recommendation: Add a responsive admin shell with collapsed sidebar, current-page title, and mobile table/card fallbacks for moderation queues.

## Additional Storefront Issues

### Search and Navigation

- Header icon links lack explicit accessible labels on mobile (`apps/web/src/components/layout/header.tsx:58-72`). Add `aria-label` and visible text where space allows.
- Header dropdown cannot be closed with Escape and has no menu roles/focus management (`apps/web/src/components/layout/header.tsx:76-139`). Add keyboard behavior and focus return.
- Horizontal category rails hide scrollbars (`apps/web/src/components/layout/header.tsx:154-165`, `apps/web/src/app/(storefront)/page.tsx:108-119`). Add fade/chevron affordances so users know more categories exist.
- Search pagination preserves only `q`, `sort`, and `fabric`, dropping `categoryId` and `region` filters (`apps/web/src/app/(storefront)/search/page.tsx:127-146`). Build pagination from existing `searchParams`.
- Search filters use "Fabric / Type" but values are saree categories/styles (`apps/web/src/app/(storefront)/search/search-controls.tsx:9-12`, `apps/web/src/app/(storefront)/search/search-controls.tsx:169-190`). Rename or split into fabric, weave, region, price, and availability.

### Home and Product Cards

- Home hero uses gradient offer cards with no product/craft imagery (`apps/web/src/app/(storefront)/page.tsx:77-101`). For a saree marketplace, the first viewport should show actual saree imagery, texture, and craft signal.
- Product cards duplicate discount labels in badge and text (`apps/web/src/app/(storefront)/page.tsx:187-215`, `apps/web/src/app/(storefront)/search/page.tsx:88-121`). Keep one discount treatment and use the saved space for fabric/region/vendor trust.
- Product card prices use local `Math.round(price / 100)` instead of the shared `formatPaise()` convention (`apps/web/src/app/(storefront)/page.tsx:199-207`, `apps/web/src/app/(storefront)/search/page.tsx:108-116`). Use the shared formatter for consistency.
- Empty featured state says "No products yet" but also suggests search terms (`apps/web/src/app/(storefront)/page.tsx:156-164`). If the API is down, this should be an error/retry state; if the catalog is empty, suggestions are misleading.

### Product Detail

- Breadcrumb uses raw `<a>` instead of Next `Link` (`apps/web/src/app/(storefront)/p/[slug]/page.tsx:82-91`). This causes full page reloads.
- Delivery promise is static "5-7 business days" with no pincode check (`apps/web/src/app/(storefront)/p/[slug]/page.tsx:139-160`). Add pincode entry and serviceability/ETA from backend.
- Trust copy says "No questions asked" and "100% Authenticity Guarantee" without backing data or policy links (`apps/web/src/app/(storefront)/p/[slug]/page.tsx:151-165`). Link to policy details and vendor verification evidence.
- Variant buttons do not show color swatches even though `color` exists in the variant type (`apps/web/src/app/(storefront)/p/[slug]/add-to-cart.tsx:14`, `apps/web/src/app/(storefront)/p/[slug]/add-to-cart.tsx:124-150`). Add visual swatches for color variants.
- CTA comment says "sticky on mobile", but the CTA container is not sticky (`apps/web/src/app/(storefront)/p/[slug]/add-to-cart.tsx:163-179`). Make Add to Cart/Buy Now fixed or sticky on mobile PDP.

### Auth and Account

- Auth phone input accepts arbitrary characters and only checks `phone.length < 10` (`apps/web/src/app/(storefront)/auth/page.tsx:89-108`). Normalize to digits, cap at 10, and show inline validation.
- OTP submit allows four digits even though the field length is six (`apps/web/src/app/(storefront)/auth/page.tsx:126-146`). Align UI validation with backend OTP length.
- Resend OTP has no cooldown or attempt count (`apps/web/src/app/(storefront)/auth/page.tsx:159-165`). Add timer, disabled state, and delivery channel status.
- Terms and Privacy links are `#` (`apps/web/src/app/(storefront)/auth/page.tsx:114-118`). Add real routes or remove until policy pages exist.
- Profile uses `any` to read email and asks for an avatar URL (`apps/web/src/app/(storefront)/account/profile/page.tsx:24-28`, `apps/web/src/app/(storefront)/account/profile/page.tsx:137-152`). Use typed user data and an upload/picker flow or remove avatar editing.
- Profile "Saved Addresses" nav is inert (`apps/web/src/app/(storefront)/account/profile/page.tsx:96-105`). Wire it to an address management screen or hide it.

### Cart and Checkout

- Logged-out cart headline says "Your cart is empty" when the real problem is authentication (`apps/web/src/app/(storefront)/cart/page.tsx:101-119`). Use "Sign in to view your cart" to avoid implying items are gone.
- Cart remove has no confirmation or undo (`apps/web/src/app/(storefront)/cart/page.tsx:212-218`). Add undo toast for accidental removal.
- Checkout never loads existing saved addresses; it initializes `addresses` to empty and immediately shows a new form (`apps/web/src/app/(storefront)/checkout/page.tsx:60-87`). Fetch saved addresses and default address before asking for a new one.
- Checkout lets users proceed with an empty cart summary hidden if cart load fails (`apps/web/src/app/(storefront)/checkout/page.tsx:80-84`, `apps/web/src/app/(storefront)/checkout/page.tsx:303-309`). Block checkout when cart cannot be loaded or item count is zero.
- Checkout address form uses two and three column grids without mobile breakpoints (`apps/web/src/app/(storefront)/checkout/page.tsx:246-265`). Use `grid-cols-1 sm:grid-cols-2/3` to prevent cramped mobile fields.

## Additional Admin Issues

### ~~Admin Shell~~ - [FIXED]
- ~~No active nav state~~ (`apps/admin/src/app/layout.tsx:79-89`). Operators cannot quickly confirm where they are.
- ~~"Sign out" is a plain link to /login and does not clear tokens~~ (`apps/admin/src/app/layout.tsx:91-99`). Use a client logout action that clears the admin token.
- ~~The root layout wraps /login with the admin sidebar~~ (`apps/admin/src/app/layout.tsx:64-103`). Login now uses a separate auth layout without navigation chrome.

### Admin Dashboard

- Dashboard stats default to zero on fetch failure (`apps/admin/src/app/page.tsx:14-18`). Show an error/retry state instead of a clean zero-state.
- Quick actions do not include counts or urgency once the top alert is absent (`apps/admin/src/app/page.tsx:52-83`). Keep actionable counts near each destination.

### ~~Vendor Moderation~~ - [FIXED]
- ~~Vendor rows providing detail context~~ (Fixed with `VendorDetailDrawer`).
- ~~Approve/reject actions available without detail step~~ (Fixed: admins are now encouraged to open the detail drawer before moderating).
- Status tabs do not show counts (`apps/admin/src/app/vendors/page.tsx:88-103`). Add per-status counts so admins know backlog size without clicking every tab.

### Product Moderation

- Product moderation lacks product image, price, inventory, description, and storefront preview (`apps/admin/src/app/products/page.tsx:118-169`). Admins cannot properly judge a saree listing from name/vendor/category alone.
- Approved/rejected/draft tabs have no available actions or detail context (`apps/admin/src/app/products/page.tsx:147-164`). Add view/edit/reopen/archive actions where appropriate.

### ~~Orders and Returns~~ - [FIXED]
- Admin orders page is read-only and has no fulfillment/status actions (`apps/admin/src/app/orders/page.tsx:104-148`). Add order detail, packing, Shiprocket shipment creation, tracking, cancellation, and refund entry points.
- ~~Order item list is truncated into a single line~~ (Fixed with improved table layout).
- ~~Returns table truncates reason and items into narrow cells~~ (Fixed with prominent dispute boxes).
- Return refund confirmation does not show exact refundable amount, payment id, or irreversible consequences (`apps/admin/src/app/returns/page.tsx:66-73`). Include amount and final confirmation wording.

## Visual Design and Accessibility Improvements

- Replace hand-written SVG icons with the existing icon library pattern where possible for consistency and accessible labels.
- Add focus-visible styles to icon buttons, dropdown triggers, quantity steppers, modal buttons, and table row actions.
- Avoid relying only on color for status; pair badges with icons or clear text labels.
- Use consistent radius tokens. Storefront mixes `rounded-sm`, `rounded-lg`, and `rounded-xl` heavily across related commerce surfaces.
- Ensure every modal has `role="dialog"`, `aria-modal`, title association, initial focus, Escape handling, and focus trap.
- Use `next/image` or an image component with dimensions, loading behavior, and fallback states for product images.
- Add mobile visual tests for checkout address/review, authenticated cart, profile, account orders, and admin table pages.

## Suggested Backlog Order

1. ~~Replace checkout dev payment flow with real Razorpay and block failed address/cart states.~~
2. ~~Wire real account orders, order details, returns, and tracking.~~
3. ~~Fix mobile authentication access in the storefront header.~~
4. ~~Add stock-aware variant defaulting and cart quantity caps.~~
5. ~~Remove hard-coded product ratings/reviews and unverified trust claims.~~
6. ~~Add admin error states, action loading/error feedback, and auth redirects.~~
7. ~~Add admin detail drawers/pages for vendors, products, orders, and returns.~~
8. ~~Improve PDP gallery, sticky mobile CTAs, and pincode delivery check.~~
9. ~~Make admin shell responsive and add active navigation.~~
10. [/] Expand Playwright coverage for mobile and authenticated conversion flows.
