import { test, expect } from "@playwright/test";

const API = "http://localhost:4000/v1";

test.describe("Order History", () => {
  test("placed order appears in account orders page with Confirmed status", async ({ page }) => {
    test.setTimeout(120000);

    // 1. Login via dev bypass
    await page.goto("/auth");
    await page.getByRole("button", { name: /Quick Dev Login/i }).click();
    await expect(page).toHaveURL(/\/account\/orders/, { timeout: 60000 });

    // 2. Clear cart
    await page.evaluate(async (api) => {
      const res = await fetch(`${api}/cart`, { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as { items?: { variantId: string }[] };
      for (const item of data.items ?? []) {
        await fetch(`${api}/cart/items/${item.variantId}`, { method: "DELETE", credentials: "include" });
      }
    }, API);

    // 3. Buy a product directly (BUY NOW skips cart page)
    await page.goto("/p/tussar-raw-silk-natural-indigo");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /BUY NOW/i }).click();
    await expect(page).toHaveURL(/\/checkout/, { timeout: 15000 });

    // 4. Address step
    await page.waitForLoadState("networkidle");
    const hasAddress = await page.locator("input[type='radio']").first().isVisible().catch(() => false);
    if (!hasAddress) {
      await page.getByPlaceholder(/Recipient's Name/i).fill("Order History Tester");
      await page.getByPlaceholder(/10-digit number/i).fill("9876543210");
      await page.getByPlaceholder(/House\/Flat no/i).fill("42 Main Street");
      await page.getByPlaceholder(/City/i).fill("Bengaluru");
      await page.selectOption("select", "Karnataka");
      await page.getByPlaceholder(/6 digits/i).fill("560001");
      await page.getByRole("button", { name: /Deliver to this address/i }).click();
    } else {
      await page.getByRole("button", { name: /Continue to Payment/i }).click();
    }

    // 5. Pay (dev bypass)
    await expect(page.getByRole("heading", { name: /Review & Pay/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /Pay ₹/ }).click();
    await expect(page.getByRole("heading", { name: /Order Confirmed/i })).toBeVisible({ timeout: 20000 });

    // 6. Navigate to order history
    await page.goto("/account/orders");
    await page.waitForLoadState("networkidle");

    // 7. Verify order appears with Confirmed status
    await expect(page.getByRole("heading", { name: /My Orders/i })).toBeVisible();
    await expect(page.getByText("Confirmed").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Tussar Raw Silk/i).first()).toBeVisible();

    await page.screenshot({ path: "tests/screenshots/order-history.png", fullPage: true });
  });
});
