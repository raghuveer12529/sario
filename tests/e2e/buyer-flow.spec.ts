import { test, expect } from "@playwright/test";

test.describe("Buyer Authenticated Flow", () => {
  const TEST_PHONE = "9876543210";

  test("should complete a full purchase flow via dev bypass", async ({ page }) => {
    test.setTimeout(300000);
    // 1. Sign In via Dev Bypass
    await page.goto("/auth");
    await page.getByPlaceholder("98765 43210").fill(TEST_PHONE);
    await page.getByRole("button", { name: /Quick Dev Login/i }).click();
    
    // Should redirect to orders (increased timeout for Next.js compilation)
    await expect(page).toHaveURL(/\/account\/orders/, { timeout: 60000 });
    
    // 2. Search for products
    await page.goto("/");
    await page.getByPlaceholder(/Try Kanjivaram/i).fill("silk");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/search/);
    
    // 3. Select a product
    const productLink = page.locator("a[href^='/p/']").first();
    await productLink.click();
    await expect(page).toHaveURL(/\/p\//);
    
    // 4. Add to Cart
    await page.getByRole("button", { name: /Add to Cart/i }).click();
    await expect(page.getByText(/Added to cart/i)).toBeVisible();
    
    // 5. Go to Checkout
    await page.goto("/cart");
    await page.getByRole("link", { name: /Checkout/i }).click();
    await expect(page).toHaveURL(/\/checkout/);
    
    // 6. Enter Address (if not present)
    const hasAddress = await page.locator("input[name='address']").first().isVisible();
    if (!hasAddress) {
      await page.getByPlaceholder(/Recipient's Name/i).fill("E2E Tester");
      await page.getByPlaceholder(/10-digit number/i).fill(TEST_PHONE);
      await page.getByPlaceholder(/House\/Flat no/i).fill("123 Test Street");
      await page.getByPlaceholder(/City/i).fill("Bengaluru");
      await page.selectOption("select", "Karnataka");
      await page.getByPlaceholder(/6 digits/i).fill("560001");
      await page.getByRole("button", { name: /Deliver to this address/i }).click();
    } else {
      await page.getByRole("button", { name: /Continue to Payment/i }).click();
    }
    
    // 7. Review and Pay (Dev Bypass)
    await expect(page.getByText(/Review & Pay/i)).toBeVisible();
    await page.getByRole("button", { name: /Pay/i }).click();
    
    // 8. Order Success
    await expect(page.getByRole("heading", { name: /Order Placed!/i })).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: "tests/screenshots/order-success-e2e.png", fullPage: true });
  });
});
