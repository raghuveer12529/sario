import { test, expect } from "@playwright/test";

test.describe("Vendor Portal — Product Creation", () => {
  test("vendor can create a product and see it in the products list", async ({ page }) => {
    test.setTimeout(120000);

    // 1. Login as vendor1 (email+password, seeded approved vendor)
    await page.goto("/auth?next=/vendor");
    await page.getByPlaceholder("you@example.com").fill("vendor1@sario.dev");
    await page.getByPlaceholder(/Min\. 6 characters/i).fill("Password1!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    // Auth page redirects to ?next=/vendor after successful login
    await expect(page).toHaveURL(/\/vendor/, { timeout: 30000 });
    await page.screenshot({ path: "tests/screenshots/vendor-dashboard.png" });

    // 2. Navigate to new product form
    await page.goto("/vendor/products/new");
    await expect(page.getByText(/Product Details/i)).toBeVisible({ timeout: 10000 });

    // 3. Fill required product fields
    const productName = `E2E Test Saree ${Date.now()}`;
    await page.getByPlaceholder(/Pure Kanjivaram Silk Saree/i).fill(productName);
    await page.getByPlaceholder(/Describe the saree/i).fill("A beautiful handwoven saree created for automated testing purposes.");

    // Select first available category
    const categorySelect = page.locator("select").first();
    await categorySelect.waitFor({ timeout: 10000 });
    const options = await categorySelect.locator("option").allTextContents();
    const firstReal = options.find((o) => o !== "Select a category…");
    if (firstReal) await categorySelect.selectOption({ label: firstReal });

    // 4. Fill variant fields (the form always has 1 variant row)
    await page.getByPlaceholder("e.g. Red").fill("Royal Blue");
    await page.getByPlaceholder("SKU-001").fill(`E2E-SKU-${Date.now()}`);
    await page.getByPlaceholder("5000").fill("4500");
    await page.getByPlaceholder("6000").fill("5500");
    await page.getByPlaceholder("10").fill("5");

    await page.screenshot({ path: "tests/screenshots/vendor-product-form.png" });

    // 5. Submit for review
    await page.getByRole("button", { name: /Submit for Review/i }).click();

    // 6. Should redirect to /vendor/products after successful creation
    await expect(page).toHaveURL(/\/vendor\/products$/, { timeout: 15000 });
    await page.screenshot({ path: "tests/screenshots/vendor-products-list.png", fullPage: true });

    // 7. New product should appear in the list (DRAFT/PENDING_REVIEW tab)
    await expect(page.getByText(productName)).toBeVisible({ timeout: 10000 });
  });
});
