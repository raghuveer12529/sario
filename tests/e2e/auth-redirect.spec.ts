import { test, expect } from "@playwright/test";

test.describe("Unauthenticated Redirect Guards", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure no session
    await page.context().clearCookies();
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
  });

  test("visiting /checkout shows in-page sign-in prompt (client-side guard)", async ({ page }) => {
    await page.goto("/checkout");
    await page.waitForLoadState("networkidle");
    // Checkout renders an in-page auth wall — no hard redirect
    await expect(page.getByText(/Sign in to checkout/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("main").getByRole("link", { name: /Sign In/i })).toBeVisible();
    await page.screenshot({ path: "tests/screenshots/auth-redirect-checkout.png" });
  });

  test("visiting /account/orders shows in-page sign-in prompt (client-side guard)", async ({ page }) => {
    await page.goto("/account/orders");
    await page.waitForLoadState("networkidle");
    // Orders page renders an in-page auth wall — no hard redirect
    await expect(page.getByText(/Sign in to view orders/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("main").getByRole("link", { name: /Sign In/i })).toBeVisible();
    await page.screenshot({ path: "tests/screenshots/auth-redirect-orders.png" });
  });

  test("visiting /vendor redirects to /auth (server/layout guard)", async ({ page }) => {
    await page.goto("/vendor");
    await expect(page).toHaveURL(/\/auth/, { timeout: 15000 });
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
    await page.screenshot({ path: "tests/screenshots/auth-redirect-vendor.png" });
  });

  test("after login via ?next param, user is returned to the intended page", async ({ page }) => {
    // Vendor layout sets ?next=/vendor when redirecting unauthenticated users
    await page.goto("/vendor");
    await expect(page).toHaveURL(/\/auth\?next=(%2F|\/)?vendor/, { timeout: 15000 });

    // Log in as vendor
    await page.getByPlaceholder("you@example.com").fill("vendor1@sario.dev");
    await page.getByPlaceholder(/Your password/i).fill("Password1!");
    await page.getByRole("button", { name: /Sign In/i }).click();

    // Should be returned to /vendor
    await expect(page).toHaveURL(/\/vendor/, { timeout: 20000 });
    await page.screenshot({ path: "tests/screenshots/auth-redirect-return.png" });
  });
});
