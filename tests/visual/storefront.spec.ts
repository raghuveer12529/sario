import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test("desktop renders hero + categories + products", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Featured Sarees/i })).toBeVisible();
    await page.screenshot({ path: "tests/screenshots/home-desktop.png", fullPage: true });
  });

  test("mobile renders correctly at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.locator("header")).toBeVisible();
    await page.screenshot({ path: "tests/screenshots/home-mobile.png", fullPage: true });
  });
});

test.describe("Search page", () => {
  test("desktop shows filters sidebar + product grid", async ({ page }) => {
    await page.goto("/search?q=saree");
    await expect(page.locator("aside").first()).toBeVisible();
    await page.screenshot({ path: "tests/screenshots/search-desktop.png", fullPage: true });
  });

  test("mobile shows filter button (no sidebar)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/search?q=saree");
    await expect(page.getByRole("button", { name: /Filters/i })).toBeVisible();
    await page.screenshot({ path: "tests/screenshots/search-mobile.png", fullPage: true });
  });

  test("mobile filter drawer opens", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/search");
    await page.getByRole("button", { name: /Filters/i }).click();
    await expect(page.getByRole("heading", { name: /Filters/i })).toBeVisible();
    await page.screenshot({ path: "tests/screenshots/search-mobile-filters.png" });
  });

  test("sort dropdown changes URL", async ({ page }) => {
    await page.goto("/search?q=silk");
    const select = page.locator("select").first();
    await select.selectOption("price_asc");
    await expect(page).toHaveURL(/sort=price_asc/);
  });

  test("empty state shows suggestions", async ({ page }) => {
    await page.goto("/search?q=zzznoresults12345");
    await expect(page.getByText(/No results found/i)).toBeVisible();
    await page.screenshot({ path: "tests/screenshots/search-empty.png", fullPage: true });
  });
});

test.describe("Product detail page", () => {
  test("desktop renders gallery + add to cart", async ({ page }) => {
    await page.goto("/search");
    const firstProduct = page.locator("a[href^='/p/']").first();
    const href = await firstProduct.getAttribute("href");
    if (!href) test.skip();
    await page.goto(href!);
    await expect(page.getByRole("button", { name: /Add to Cart/i })).toBeVisible();
    await page.screenshot({ path: "tests/screenshots/pdp-desktop.png", fullPage: true });
  });

  test("mobile renders correctly at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/search");
    const firstProduct = page.locator("a[href^='/p/']").first();
    const href = await firstProduct.getAttribute("href");
    if (!href) test.skip();
    await page.goto(href!);
    await page.screenshot({ path: "tests/screenshots/pdp-mobile.png", fullPage: true });
  });
});

test.describe("Cart page", () => {
  test("shows sign-in prompt when logged out", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.getByRole("link", { name: /Sign In/i })).toBeVisible();
    await page.screenshot({ path: "tests/screenshots/cart-logged-out.png", fullPage: true });
  });
});

test.describe("Checkout page", () => {
  test("shows sign-in prompt when logged out", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page.getByRole("link", { name: /Sign In/i })).toBeVisible();
    await page.screenshot({ path: "tests/screenshots/checkout-logged-out.png", fullPage: true });
  });
});
