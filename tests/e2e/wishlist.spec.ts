import { test, expect } from "@playwright/test";

test.describe("Wishlist", () => {
  test.beforeEach(async ({ page }) => {
    // Clear wishlist from previous runs
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("sario_wishlist"));
  });

  test("add product to wishlist, view wishlist page, remove item", async ({ page }) => {
    test.setTimeout(60000);

    // 1. Go to a known product page
    await page.goto("/p/tussar-raw-silk-natural-indigo");
    await page.waitForLoadState("networkidle");

    // 2. Click the wishlist heart button (visible on hover — force click)
    const heartBtn = page.getByRole("button", { name: /Save to wishlist/i });
    await heartBtn.waitFor({ timeout: 10000 });
    await heartBtn.click({ force: true });

    // Button should now show "Remove from wishlist" state
    await expect(page.getByRole("button", { name: /Remove from wishlist/i })).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: "tests/screenshots/wishlist-added.png" });

    // 3. Navigate to wishlist page
    await page.goto("/wishlist");
    await page.waitForLoadState("networkidle");

    // 4. Product should appear
    await expect(page.getByText(/Tussar Raw Silk/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/1 item saved/i)).toBeVisible();
    await page.screenshot({ path: "tests/screenshots/wishlist-page.png" });

    // 5. Remove the item via the heart button on the wishlist card
    await page.getByRole("button", { name: /Remove from wishlist/i }).click();

    // 6. Wishlist should now be empty
    await expect(page.getByText(/Nothing saved yet/i)).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: "tests/screenshots/wishlist-empty.png" });
  });

  test("wishlist persists across page navigations", async ({ page }) => {
    await page.goto("/p/tussar-raw-silk-natural-indigo");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /Save to wishlist/i }).click({ force: true });

    // Verify it was saved to localStorage
    const saved = await page.evaluate(() => {
      const list: string[] = JSON.parse(localStorage.getItem("sario_wishlist") ?? "[]");
      return list.length;
    });
    expect(saved).toBe(1);

    // Navigate away and back
    await page.goto("/");
    await page.goto("/p/tussar-raw-silk-natural-indigo");
    await page.waitForLoadState("networkidle");

    // Verify localStorage still has the item after navigation
    const stillSaved = await page.evaluate(() => {
      const list: string[] = JSON.parse(localStorage.getItem("sario_wishlist") ?? "[]");
      return list.length;
    });
    expect(stillSaved).toBe(1);
  });
});
