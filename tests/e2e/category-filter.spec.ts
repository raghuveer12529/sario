import { test, expect } from "@playwright/test";

test.describe("Category subcategory filtering", () => {
  test("shows products when a subcategory is selected from nav", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Find the category nav bar (the one containing the category buttons)
    const navBar = page.locator(".border-t.border-\\[\\#F0F0F0\\].bg-white").first();
    await navBar.waitFor({ timeout: 10000 });

    // Hover over first top-level category that has children
    const firstCatButton = navBar.locator("button").first();
    await firstCatButton.hover();

    // Wait for dropdown
    const dropdown = page.locator(".absolute.left-0.right-0.top-full");
    await dropdown.waitFor({ timeout: 5000 });

    // Click first subcategory link (e.g. Silk Sarees)
    const firstSubLink = dropdown.locator("a[href*='categoryId']").first();
    const href = await firstSubLink.getAttribute("href");
    await firstSubLink.click();

    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/categoryId=/);

    // Take screenshot for visual confirmation
    await page.screenshot({ path: "tests/screenshots/subcategory-result.png", fullPage: true });

    // Check if products are shown or empty state
    const productGrid = page.locator("a[href^='/p/']");
    const emptyState = page.locator("text=No results found");

    const productCount = await productGrid.count();
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    console.log(`URL: ${page.url()}`);
    console.log(`Products found: ${productCount}`);
    console.log(`Empty state shown: ${hasEmpty}`);

    // This should pass after the fix — products must be visible
    await expect(productGrid.first()).toBeVisible({ timeout: 8000 });
  });

  test("All link shows products from search page", async ({ page }) => {
    await page.goto("/search");
    await page.waitForLoadState("networkidle");

    await page.screenshot({ path: "tests/screenshots/search-all.png", fullPage: true });

    const productGrid = page.locator("a[href^='/p/']");
    const count = await productGrid.count();
    console.log(`All search products: ${count}`);

    await expect(productGrid.first()).toBeVisible({ timeout: 8000 });
  });
});
