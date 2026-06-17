import { test, expect } from "@playwright/test";

test.describe("Search Flow", () => {
  test("type a query, sort results, click a product, verify PDP loads", async ({ page }) => {
    test.setTimeout(60000);

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 1. Type in the header search bar
    const searchInput = page.getByPlaceholder(/Try Kanjivaram, Banarasi, Silk/i);
    await searchInput.fill("silk");
    await page.keyboard.press("Enter");

    // 2. Should land on /search with results
    await expect(page).toHaveURL(/\/search\?q=silk/);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "tests/screenshots/search-results.png" });

    const resultCount = await page.locator("a[href^='/p/']").count();
    expect(resultCount).toBeGreaterThan(0);

    // 3. Sort by Price: Low to High
    await page.selectOption("select", "price_asc");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/sort=price_asc/);
    await page.screenshot({ path: "tests/screenshots/search-sorted.png" });

    // 4. Click first product card
    const firstProduct = page.locator("a[href^='/p/']").first();
    const productName = await firstProduct.textContent();
    await firstProduct.click();

    // 5. Verify PDP loaded
    await expect(page).toHaveURL(/\/p\//);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: /ADD TO CART/i })).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "tests/screenshots/search-pdp.png" });
  });

  test("empty search shows suggestions", async ({ page }) => {
    await page.goto("/search?q=xyznotarealproduct123");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/No results found/i)).toBeVisible();
    // Suggestion chips should appear (scoped to main to avoid footer links)
    await expect(page.getByRole("main").getByRole("link", { name: "Kanjivaram" })).toBeVisible();
  });
});
