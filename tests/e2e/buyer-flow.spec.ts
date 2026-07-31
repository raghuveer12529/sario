import { test, expect } from "@playwright/test";

const API = "http://localhost:4000/v1";

test.describe("Buyer Authenticated Flow", () => {
  test("should complete a full purchase flow via dev bypass", async ({ page }) => {
    test.setTimeout(300000);

    // 1. Login via Quick Dev Login (no phone field — button posts directly)
    await page.goto("/auth");
    await page.getByRole("button", { name: /Quick Dev Login/i }).click();
    await expect(page).toHaveURL(/\/account\/orders/, { timeout: 60000 });

    // 2. Clear any stale cart items from previous test runs
    await page.evaluate(async (api) => {
      const res = await fetch(`${api}/cart`, { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as { items?: { variantId: string }[] };
      for (const item of data.items ?? []) {
        await fetch(`${api}/cart/items/${item.variantId}`, {
          method: "DELETE",
          credentials: "include",
        });
      }
    }, API);

    // 3. Navigate to an in-stock product (Tussar Raw Silk — 6 units in stock)
    await page.goto("/p/tussar-raw-silk-natural-indigo");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "tests/screenshots/product-page.png" });

    // 4. Click BUY NOW — adds item to cart and navigates directly to /checkout
    const buyNowBtn = page.getByRole("button", { name: /BUY NOW/i });
    await buyNowBtn.waitFor({ timeout: 10000 });
    await expect(buyNowBtn).toBeEnabled({ timeout: 5000 });
    await buyNowBtn.click();
    await expect(page).toHaveURL(/\/checkout/, { timeout: 15000 });
    await page.screenshot({ path: "tests/screenshots/checkout-address.png" });

    // 5. Address step — fill form if no saved address
    await page.waitForLoadState("networkidle");
    const hasExistingAddress = await page.locator("input[type='radio']").first().isVisible().catch(() => false);

    if (!hasExistingAddress) {
      await page.getByPlaceholder(/Recipient's Name/i).fill("Playwright Tester");
      await page.getByPlaceholder(/10-digit number/i).fill("9876543210");
      await page.getByPlaceholder(/House\/Flat no/i).fill("42 Main Street");
      await page.getByPlaceholder(/City/i).fill("Bengaluru");
      await page.selectOption("select", "Karnataka");
      await page.getByPlaceholder(/6 digits/i).fill("560001");
      await page.getByRole("button", { name: /Deliver to this address/i }).click();
    } else {
      await page.getByRole("button", { name: /Continue to Payment/i }).click();
    }

    // 6. Review & Pay — dev mode (no Razorpay key) calls /checkout/dev/confirm directly
    await expect(page.getByRole("heading", { name: /Review & Pay/i })).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: "tests/screenshots/review-and-pay.png" });

    const payBtn = page.getByRole("button", { name: /Pay ₹/ });
    await payBtn.waitFor({ timeout: 10000 });
    await payBtn.click();

    // 7. Order Confirmed success screen
    await expect(page.getByRole("heading", { name: /Order Confirmed/i })).toBeVisible({ timeout: 20000 });
    await page.screenshot({ path: "tests/screenshots/order-success-e2e.png", fullPage: true });
  });
});
