import { test, expect } from "@playwright/test";

const ADMIN_BASE = "http://localhost:3001";
const API = "http://localhost:4000/v1";

/** Fetch a real admin JWT and inject it into localStorage before the page loads,
 *  so the dashboard layout's auth guard doesn't redirect to /login. */
async function authAsAdmin(page: import("@playwright/test").Page) {
  const res = await fetch(`${API}/auth/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@sario.in", password: "Password1!" }),
  });
  const { accessToken } = (await res.json()) as { accessToken: string };
  await page.addInitScript((t) => localStorage.setItem("admin_token", t), accessToken);
}

test.describe("Admin panel", () => {
  test("login page renders without dev credentials", async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/login`);
    await expect(page.getByRole("heading", { name: /Sario Admin/i })).toBeVisible();
    await expect(page.getByText(/Dev credentials/i)).not.toBeVisible();
    await page.screenshot({ path: "tests/screenshots/admin-login.png", fullPage: true });
  });

  test("dashboard renders stat cards", async ({ page }) => {
    await authAsAdmin(page);
    await page.goto(`${ADMIN_BASE}/`);
    await page.screenshot({ path: "tests/screenshots/admin-dashboard.png", fullPage: true });
  });

  test("vendors page shows status tabs", async ({ page }) => {
    await authAsAdmin(page);
    await page.goto(`${ADMIN_BASE}/vendors`);
    await expect(page.getByRole("button", { name: "Pending" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Approved" })).toBeVisible();
    await page.screenshot({ path: "tests/screenshots/admin-vendors.png", fullPage: true });
  });

  test("products page shows status tabs", async ({ page }) => {
    await authAsAdmin(page);
    await page.goto(`${ADMIN_BASE}/products`);
    await expect(page.getByRole("button", { name: /Pending Review/i })).toBeVisible();
    await page.screenshot({ path: "tests/screenshots/admin-products.png", fullPage: true });
  });

  test("orders page shows status tabs", async ({ page }) => {
    await authAsAdmin(page);
    await page.goto(`${ADMIN_BASE}/orders`);
    await expect(page.getByRole("button", { name: "Confirmed" })).toBeVisible();
    await page.screenshot({ path: "tests/screenshots/admin-orders.png", fullPage: true });
  });

  test("returns page shows status tabs", async ({ page }) => {
    await authAsAdmin(page);
    await page.goto(`${ADMIN_BASE}/returns`);
    await expect(page.getByRole("button", { name: "Requested" })).toBeVisible();
    await page.screenshot({ path: "tests/screenshots/admin-returns.png", fullPage: true });
  });
});
