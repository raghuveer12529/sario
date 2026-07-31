import { test, expect } from "@playwright/test";

const API = "http://localhost:4000/v1";

test.describe("Order Tracking", () => {
  test("placed order appears on orders page and detail page shows correct status", async ({ page }) => {
    test.setTimeout(120000);

    // 1. Login
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

    // 3. Place an order
    await page.goto("/p/gadwal-cotton-silk-checks-stripes");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /BUY NOW/i }).click();
    await expect(page).toHaveURL(/\/checkout/, { timeout: 15000 });

    await page.waitForLoadState("networkidle");
    const hasAddress = await page.locator("input[type='radio']").first().isVisible().catch(() => false);
    if (!hasAddress) {
      await page.getByPlaceholder(/Recipient's Name/i).fill("Tracking Tester");
      await page.getByPlaceholder(/10-digit number/i).fill("9876543210");
      await page.getByPlaceholder(/House\/Flat no/i).fill("1 Test Lane");
      await page.getByPlaceholder(/City/i).fill("Chennai");
      await page.selectOption("select", "Tamil Nadu");
      await page.getByPlaceholder(/6 digits/i).fill("600001");
      await page.getByRole("button", { name: /Deliver to this address/i }).click();
    } else {
      await page.getByRole("button", { name: /Continue to Payment/i }).click();
    }
    await expect(page.getByRole("heading", { name: /Review & Pay/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /Pay ₹/ }).click();
    await expect(page.getByRole("heading", { name: /Order Confirmed/i })).toBeVisible({ timeout: 20000 });

    // 4. Go to orders list — order should appear with "Confirmed" status
    await page.goto("/account/orders");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Confirmed").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Gadwal Cotton/i).first()).toBeVisible();
    await page.screenshot({ path: "tests/screenshots/order-tracking-list.png", fullPage: true });

    // 5. Click "View Full Details" on the first order
    await page.getByRole("link", { name: /View Full Details/i }).first().click();
    await expect(page).toHaveURL(/\/account\/orders\/.+/);
    await page.waitForLoadState("networkidle");

    // 6. Order detail page shows status stepper and items
    await expect(page.getByText(/Order Details/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Order Status/i)).toBeVisible();
    await expect(page.getByText(/Gadwal Cotton/i)).toBeVisible();
    await page.screenshot({ path: "tests/screenshots/order-tracking-detail.png", fullPage: true });
  });
});
