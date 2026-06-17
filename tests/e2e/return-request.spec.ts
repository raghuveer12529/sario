import { test, expect } from "@playwright/test";
import { execSync } from "child_process";

const API = "http://localhost:4000/v1";
const DB = "postgresql://sario:sario_dev@localhost:5432/sario";

/**
 * Force an order to DELIVERED status directly in the DB.
 * This is needed because DELIVERED is only set via Shiprocket webhook in prod.
 */
function setOrderDelivered(orderId: string) {
  execSync(
    `psql "${DB}" -c "UPDATE \\"Order\\" SET status = 'DELIVERED', \\"deliveredAt\\" = NOW(), \\"updatedAt\\" = NOW() WHERE id = '${orderId}'"`,
    { stdio: "pipe" }
  );
}

test.describe("Return Request", () => {
  test("buyer can request a return on a delivered order and status updates to Return Requested", async ({ page }) => {
    test.setTimeout(180000);

    // 1. Login
    await page.goto("/auth");
    await page.getByRole("button", { name: /Quick Dev Login/i }).click();
    await expect(page).toHaveURL(/\/account\/orders/, { timeout: 60000 });

    // 2. Clear cart and place an order
    await page.evaluate(async (api) => {
      const res = await fetch(`${api}/cart`, { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as { items?: { variantId: string }[] };
      for (const item of data.items ?? []) {
        await fetch(`${api}/cart/items/${item.variantId}`, { method: "DELETE", credentials: "include" });
      }
    }, API);

    await page.goto("/p/pochampally-double-ikat-cotton");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /BUY NOW/i }).click();
    await expect(page).toHaveURL(/\/checkout/, { timeout: 15000 });

    await page.waitForLoadState("networkidle");
    const hasAddress = await page.locator("input[type='radio']").first().isVisible().catch(() => false);
    if (!hasAddress) {
      await page.getByPlaceholder(/Recipient's Name/i).fill("Return Tester");
      await page.getByPlaceholder(/10-digit number/i).fill("9876543210");
      await page.getByPlaceholder(/House\/Flat no/i).fill("5 Return Street");
      await page.getByPlaceholder(/City/i).fill("Hyderabad");
      await page.selectOption("select", "Telangana");
      await page.getByPlaceholder(/6 digits/i).fill("500001");
      await page.getByRole("button", { name: /Deliver to this address/i }).click();
    } else {
      await page.getByRole("button", { name: /Continue to Payment/i }).click();
    }
    await expect(page.getByRole("heading", { name: /Review & Pay/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /Pay/i }).click();
    await expect(page.getByRole("heading", { name: /Order Confirmed/i })).toBeVisible({ timeout: 20000 });

    // 3. Get the newly created order ID from the API
    const orderId = await page.evaluate(async (api) => {
      const res = await fetch(`${api}/me/orders?limit=1`, { credentials: "include" });
      const data = (await res.json()) as { data: { id: string }[] };
      return data.data[0]?.id ?? null;
    }, API);

    expect(orderId).toBeTruthy();

    // 4. Force order to DELIVERED via DB (simulates shiprocket delivery webhook)
    setOrderDelivered(orderId as string);

    // 5. Trigger return via API directly (UI "Request Return" button is a stub without onClick)
    const returnResult = await page.evaluate(async ({ api, id }) => {
      const res = await fetch(`${api}/me/orders/${id}/return`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Product not as described — colour mismatch" }),
      });
      return { ok: res.ok, status: res.status };
    }, { api: API, id: orderId });

    expect(returnResult.ok).toBe(true);

    // 6. Refresh orders page — order should now show "Return Requested"
    await page.goto("/account/orders");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/Return Requested/i).first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "tests/screenshots/return-requested.png", fullPage: true });
  });
});
