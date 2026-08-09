import { expect, test } from "@playwright/test";
import { addPart, drawer, findBySku, openPart, openParts } from "./helpers";

async function recordMovement(
  page: import("@playwright/test").Page,
  action: "Receive" | "Pick",
  qty: number,
  reference?: string,
) {
  const panel = drawer(page);
  await panel.getByLabel("Quantity", { exact: true }).fill(String(qty));
  if (reference) await panel.getByLabel("Reference", { exact: true }).fill(reference);
  await panel.getByRole("button", { name: action, exact: true }).click();
}

test("receiving stock raises the count and logs it against the reference", async ({ page }) => {
  await openParts(page);
  await addPart(page, { name: "Receiving Test", sku: "TST-8001", bin: "A-04-04", qty: 10 });

  await findBySku(page, "TST-8001");
  await openPart(page, "TST-8001");
  await expect(drawer(page)).toContainText("10");

  await recordMovement(page, "Receive", 25, "GRN-99001");
  await expect(drawer(page)).toContainText("35");

  await page.getByRole("button", { name: "Close" }).click();
  await page.goto("/app/movements");

  await page.getByLabel("Filter movements").fill("GRN-99001");
  const row = page.getByRole("row").filter({ hasText: "GRN-99001" });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("Received");
  await expect(row).toContainText("Receiving Test");
  await expect(row).toContainText("+25");
});

test("picking lowers the count and logs a negative movement", async ({ page }) => {
  await openParts(page);
  await addPart(page, { name: "Picking Test", sku: "TST-8002", bin: "A-05-05", qty: 60 });

  await findBySku(page, "TST-8002");
  await openPart(page, "TST-8002");

  await recordMovement(page, "Pick", 20, "PICK-99002");
  await expect(drawer(page)).toContainText("40");

  await page.getByRole("button", { name: "Close" }).click();
  await page.goto("/app/movements");

  await page.getByLabel("Filter movements").fill("PICK-99002");
  const row = page.getByRole("row").filter({ hasText: "PICK-99002" });
  await expect(row).toContainText("Picked");
  await expect(row).toContainText("-20");
});

test("picking more than is on the shelf is refused, and nothing is logged", async ({ page }) => {
  await openParts(page);
  await addPart(page, { name: "Short Stock", sku: "TST-8003", bin: "A-06-06", qty: 5 });

  await findBySku(page, "TST-8003");
  await openPart(page, "TST-8003");

  await recordMovement(page, "Pick", 50, "PICK-99003");

  await expect(drawer(page).getByRole("alert")).toContainText("Only 5 on hand.");
  await expect(drawer(page)).toContainText("5");

  await page.getByRole("button", { name: "Close" }).click();
  await page.goto("/app/movements");
  await page.getByLabel("Filter movements").fill("PICK-99003");
  await expect(page.getByText("No movements match")).toBeVisible();
});

test("a movement without a reference is still traceable", async ({ page }) => {
  await openParts(page);
  await addPart(page, { name: "No Reference", sku: "TST-8004", bin: "A-07-01", qty: 10 });

  await findBySku(page, "TST-8004");
  await openPart(page, "TST-8004");
  await recordMovement(page, "Receive", 5);

  await page.getByRole("button", { name: "Close" }).click();
  await page.goto("/app/movements");

  await page.getByLabel("Filter movements").fill("No Reference");
  await expect(page.getByRole("row").filter({ hasText: "No Reference" })).toContainText("MANUAL");
});

test("the movement log filters by kind", async ({ page }) => {
  await page.goto("/app/movements");

  // The row count is capped by paging, so the header's total is what actually moves.
  const total = page.getByText(/entries, newest first/);
  await expect(total).toBeVisible();
  const everything = Number((await total.innerText()).replace(/\D/g, ""));

  await page.getByLabel("Filter by movement type").selectOption("receipt");

  // Auto-retrying assertions: the table re-renders after the select, and a one-shot
  // read of the cells races that render.
  const kinds = page.locator("tbody tr td:first-child");
  await expect(kinds.first()).toHaveText("Received");
  await expect(kinds.filter({ hasNotText: "Received" })).toHaveCount(0);

  await expect(total).not.toHaveText(new RegExp(`^${everything} entries`));
  const receipts = Number((await total.innerText()).replace(/\D/g, ""));
  expect(receipts).toBeGreaterThan(0);
  expect(receipts).toBeLessThan(everything);
});

test("restocking a part takes it off the overview queue", async ({ page }) => {
  await page.goto("/app");

  const queue = page.getByRole("link", { name: /left/ });
  await expect(queue.first()).toBeVisible();

  const firstEntry = await queue.first().innerText();
  const sku = firstEntry.match(/[A-Z]{3}-\d{4}/)?.[0];
  expect(sku).toBeTruthy();

  await queue.first().click();
  await expect(drawer(page)).toBeVisible();

  await recordMovement(page, "Receive", 5000, "GRN-99005");
  await expect(drawer(page).getByText("In stock")).toBeVisible();

  await page.getByRole("button", { name: "Close" }).click();
  await page.goto("/app");

  await expect(page.getByRole("link", { name: new RegExp(sku!) })).toHaveCount(0);
});
