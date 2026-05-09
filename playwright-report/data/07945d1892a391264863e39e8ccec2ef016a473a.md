# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/buyer-flow.spec.ts >> Buyer Authenticated Flow >> should complete a full purchase flow via dev bypass
- Location: tests/e2e/buyer-flow.spec.ts:6:7

# Error details

```
Test timeout of 300000ms exceeded.
```

```
Error: locator.click: Test timeout of 300000ms exceeded.
Call log:
  - waiting for locator('a[href^=\'/p/\']').first()

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e4]:
        - link "Sario" [ref=e5] [cursor=pointer]:
          - /url: /
        - generic [ref=e7]:
          - img [ref=e9]
          - searchbox "Try Kanjivaram, Banarasi, Silk…" [ref=e12]
        - navigation [ref=e13]:
          - link "My Orders" [ref=e14] [cursor=pointer]:
            - /url: /account/orders
            - img [ref=e15]
            - generic [ref=e18]: Orders
          - link "Shopping Cart" [ref=e19] [cursor=pointer]:
            - /url: /cart
            - img [ref=e20]
            - generic [ref=e24]: Cart
          - button "User menu" [ref=e26] [cursor=pointer]:
            - generic [ref=e27]: P
            - generic [ref=e28]: Priya
            - img [ref=e29]
      - generic [ref=e32]:
        - link "Sarees" [ref=e33] [cursor=pointer]:
          - /url: /search?q=Sarees
        - link "Kanjivaram" [ref=e34] [cursor=pointer]:
          - /url: /search?q=Kanjivaram
        - link "Banarasi" [ref=e35] [cursor=pointer]:
          - /url: /search?q=Banarasi
        - link "Pochampally" [ref=e36] [cursor=pointer]:
          - /url: /search?q=Pochampally
        - link "Chanderi" [ref=e37] [cursor=pointer]:
          - /url: /search?q=Chanderi
        - link "Mysore Silk" [ref=e38] [cursor=pointer]:
          - /url: /search?q=Mysore%20Silk
        - link "Tussar" [ref=e39] [cursor=pointer]:
          - /url: /search?q=Tussar
        - link "Patola" [ref=e40] [cursor=pointer]:
          - /url: /search?q=Patola
        - link "Sambalpuri" [ref=e41] [cursor=pointer]:
          - /url: /search?q=Sambalpuri
    - main [ref=e42]:
      - generic [ref=e43]:
        - complementary [ref=e44]:
          - generic [ref=e45]:
            - paragraph [ref=e47]: Filters
            - generic [ref=e48]:
              - paragraph [ref=e49]: Fabric / Type
              - generic [ref=e50]:
                - button "Kanjivaram" [ref=e51] [cursor=pointer]: Kanjivaram
                - button "Banarasi" [ref=e53] [cursor=pointer]: Banarasi
                - button "Pochampally" [ref=e55] [cursor=pointer]: Pochampally
                - button "Chanderi" [ref=e57] [cursor=pointer]: Chanderi
                - button "Mysore Silk" [ref=e59] [cursor=pointer]: Mysore Silk
                - button "Tussar" [ref=e61] [cursor=pointer]: Tussar
                - button "Patola" [ref=e63] [cursor=pointer]: Patola
                - button "Sambalpuri" [ref=e65] [cursor=pointer]: Sambalpuri
        - generic [ref=e67]:
          - generic [ref=e68]:
            - paragraph [ref=e70]:
              - text: 0 results for
              - generic [ref=e71]: "\"silk\""
            - combobox [ref=e73]:
              - option "Relevance" [selected]
              - 'option "Price: Low to High"'
              - 'option "Price: High to Low"'
              - option "Newest First"
          - generic [ref=e74]:
            - img [ref=e75]
            - paragraph [ref=e78]: No results found
            - paragraph [ref=e79]: No sarees found for "silk".
            - generic [ref=e80]:
              - link "Kanjivaram" [ref=e81] [cursor=pointer]:
                - /url: /search?q=Kanjivaram
              - link "Banarasi" [ref=e82] [cursor=pointer]:
                - /url: /search?q=Banarasi
              - link "Silk" [ref=e83] [cursor=pointer]:
                - /url: /search?q=Silk
              - link "Chanderi" [ref=e84] [cursor=pointer]:
                - /url: /search?q=Chanderi
              - link "Tussar" [ref=e85] [cursor=pointer]:
                - /url: /search?q=Tussar
            - link "Go to Home" [ref=e86] [cursor=pointer]:
              - /url: /
    - contentinfo [ref=e87]:
      - generic [ref=e88]:
        - generic [ref=e89]:
          - generic [ref=e90]:
            - paragraph [ref=e91]: Sario
            - paragraph [ref=e92]: Handloom sarees, direct from India's finest weavers. Verified origin, transparent pricing.
          - generic [ref=e93]:
            - paragraph [ref=e94]: Shop
            - list [ref=e95]:
              - listitem [ref=e96]:
                - link "All Sarees" [ref=e97] [cursor=pointer]:
                  - /url: /search
              - listitem [ref=e98]:
                - link "Kanjivaram" [ref=e99] [cursor=pointer]:
                  - /url: /search?q=Kanjivaram
              - listitem [ref=e100]:
                - link "Banarasi" [ref=e101] [cursor=pointer]:
                  - /url: /search?q=Banarasi
              - listitem [ref=e102]:
                - link "Pochampally" [ref=e103] [cursor=pointer]:
                  - /url: /search?q=Pochampally
              - listitem [ref=e104]:
                - link "Chanderi" [ref=e105] [cursor=pointer]:
                  - /url: /search?q=Chanderi
          - generic [ref=e106]:
            - paragraph [ref=e107]: Account
            - list [ref=e108]:
              - listitem [ref=e109]:
                - link "Sign In" [ref=e110] [cursor=pointer]:
                  - /url: /auth
              - listitem [ref=e111]:
                - link "My Orders" [ref=e112] [cursor=pointer]:
                  - /url: /account/orders
              - listitem [ref=e113]:
                - link "My Cart" [ref=e114] [cursor=pointer]:
                  - /url: /cart
          - generic [ref=e115]:
            - paragraph [ref=e116]: Help
            - list [ref=e117]:
              - listitem [ref=e118]:
                - link "Returns & Refunds" [ref=e119] [cursor=pointer]:
                  - /url: "#"
              - listitem [ref=e120]:
                - link "Shipping Info" [ref=e121] [cursor=pointer]:
                  - /url: "#"
              - listitem [ref=e122]:
                - link "Contact Us" [ref=e123] [cursor=pointer]:
                  - /url: "#"
              - listitem [ref=e124]:
                - link "Terms of Use" [ref=e125] [cursor=pointer]:
                  - /url: "#"
              - listitem [ref=e126]:
                - link "Privacy Policy" [ref=e127] [cursor=pointer]:
                  - /url: "#"
        - paragraph [ref=e129]: © 2026 Sario Technologies Pvt. Ltd. All rights reserved.
  - generic [ref=e130]:
    - img [ref=e132]
    - button "Open Tanstack query devtools" [ref=e180] [cursor=pointer]:
      - img [ref=e181]
  - alert [ref=e229]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("Buyer Authenticated Flow", () => {
  4  |   const TEST_PHONE = "9876543210";
  5  | 
  6  |   test("should complete a full purchase flow via dev bypass", async ({ page }) => {
  7  |     test.setTimeout(300000);
  8  |     // 1. Sign In via Dev Bypass
  9  |     await page.goto("/auth");
  10 |     await page.getByPlaceholder("98765 43210").fill(TEST_PHONE);
  11 |     await page.getByRole("button", { name: /Quick Dev Login/i }).click();
  12 |     
  13 |     // Should redirect to orders (increased timeout for Next.js compilation)
  14 |     await expect(page).toHaveURL(/\/account\/orders/, { timeout: 60000 });
  15 |     
  16 |     // 2. Search for products
  17 |     await page.goto("/");
  18 |     await page.getByPlaceholder(/Try Kanjivaram/i).fill("silk");
  19 |     await page.keyboard.press("Enter");
  20 |     await expect(page).toHaveURL(/\/search/);
  21 |     
  22 |     // 3. Select a product
  23 |     const productLink = page.locator("a[href^='/p/']").first();
> 24 |     await productLink.click();
     |                       ^ Error: locator.click: Test timeout of 300000ms exceeded.
  25 |     await expect(page).toHaveURL(/\/p\//);
  26 |     
  27 |     // 4. Add to Cart
  28 |     await page.getByRole("button", { name: /Add to Cart/i }).click();
  29 |     await expect(page.getByText(/Added to cart/i)).toBeVisible();
  30 |     
  31 |     // 5. Go to Checkout
  32 |     await page.goto("/cart");
  33 |     await page.getByRole("link", { name: /Checkout/i }).click();
  34 |     await expect(page).toHaveURL(/\/checkout/);
  35 |     
  36 |     // 6. Enter Address (if not present)
  37 |     const hasAddress = await page.locator("input[name='address']").first().isVisible();
  38 |     if (!hasAddress) {
  39 |       await page.getByPlaceholder(/Recipient's Name/i).fill("E2E Tester");
  40 |       await page.getByPlaceholder(/10-digit number/i).fill(TEST_PHONE);
  41 |       await page.getByPlaceholder(/House\/Flat no/i).fill("123 Test Street");
  42 |       await page.getByPlaceholder(/City/i).fill("Bengaluru");
  43 |       await page.selectOption("select", "Karnataka");
  44 |       await page.getByPlaceholder(/6 digits/i).fill("560001");
  45 |       await page.getByRole("button", { name: /Deliver to this address/i }).click();
  46 |     } else {
  47 |       await page.getByRole("button", { name: /Continue to Payment/i }).click();
  48 |     }
  49 |     
  50 |     // 7. Review and Pay (Dev Bypass)
  51 |     await expect(page.getByText(/Review & Pay/i)).toBeVisible();
  52 |     await page.getByRole("button", { name: /Pay/i }).click();
  53 |     
  54 |     // 8. Order Success
  55 |     await expect(page.getByRole("heading", { name: /Order Placed!/i })).toBeVisible({ timeout: 15000 });
  56 |     await page.screenshot({ path: "tests/screenshots/order-success-e2e.png", fullPage: true });
  57 |   });
  58 | });
  59 | 
```