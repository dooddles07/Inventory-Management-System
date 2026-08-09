import { expect, test } from "@playwright/test";

test.describe("routing", () => {
  const ROUTES = [
    { path: "/", title: "Stockroom - inventory tracking for small warehouses" },
    { path: "/app", title: "Overview - Stockroom" },
    { path: "/app/items", title: "Parts - Stockroom" },
    { path: "/app/map", title: "Floor map - Stockroom" },
    { path: "/app/movements", title: "Movements - Stockroom" },
    { path: "/app/suppliers", title: "Suppliers - Stockroom" },
  ];

  for (const route of ROUTES) {
    test(`${route.path} carries its own title`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page).toHaveTitle(route.title);
    });
  }

  test("an unknown address answers 404 with a way back", async ({ page }) => {
    const response = await page.goto("/no-such-page");

    expect(response?.status()).toBe(404);
    await expect(page).toHaveTitle("Page not found - Stockroom");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("No such page");

    await page.getByRole("link", { name: "Open Stockroom" }).click();
    await expect(page).toHaveURL(/\/app$/);
  });

  test("the rail marks the section you are in", async ({ page }) => {
    await page.goto("/app/map");
    await expect(page.getByRole("link", { name: "Floor map" }).first()).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

test.describe("deep links", () => {
  test("a supplier's restock count opens only that supplier's parts", async ({ page }) => {
    await page.goto("/app/suppliers");

    const link = page.locator('a[href*="supplier="]').first();
    await expect(link).toBeVisible();

    // The label names both the count and the supplier, so it is the honest source here.
    const label = (await link.getAttribute("aria-label")) ?? "";
    const [, expected, supplierName] =
      label.match(/^Show the ([\d,]+) parts from (.+) that need restocking$/) ?? [];
    expect(supplierName).toBeTruthy();
    expect(Number(expected.replace(/,/g, ""))).toBe(Number((await link.innerText()).replace(/,/g, "")));

    await link.click();
    await expect(page).toHaveURL(/status=attention&supplier=/);

    await expect(page.getByLabel("Filter by stock status")).toHaveValue("attention");
    await expect(page.getByLabel("Filter by supplier").locator("option:checked")).toHaveText(
      supplierName,
    );
    await expect(page.getByText(new RegExp(`of ${expected} parts`))).toBeVisible();
  });

  test("a status the app does not have falls back to showing everything", async ({ page }) => {
    await page.goto("/app/items?status=nonsense");
    await expect(page.getByLabel("Filter by stock status")).toHaveValue("all");
  });

  test("searching from the top bar opens the part it found", async ({ page }) => {
    await page.goto("/app");

    await page.getByLabel("Search parts, SKUs and bins").fill("hydraulic");
    const firstResult = page.getByRole("option").first();
    await expect(firstResult).toBeVisible();
    const sku = (await firstResult.innerText()).match(/[A-Z]{3}-\d{4}/)?.[0];

    await firstResult.click();

    await expect(page).toHaveURL(new RegExp(`focus=${sku}`));
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText(sku!);
  });
});
