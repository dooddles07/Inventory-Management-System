import { expect, test } from "@playwright/test";
import { addPart, drawer, findBySku, openPart, openParts } from "./helpers";

const KEY = "stockroom:snapshot:v1";

/** Puts a value in storage before the app's first read on the next navigation. */
async function store(page: import("@playwright/test").Page, value: string) {
  await page.goto("/app");
  await page.evaluate(([k, v]) => window.localStorage.setItem(k, v), [KEY, value] as const);
}

test.describe("a browser holding something unusable", () => {
  const JUNK: Array<[string, string]> = [
    ["unparseable", "{ not json at all"],
    ["the wrong shape", JSON.stringify({ items: "nope" })],
    [
      "items missing their numbers",
      JSON.stringify({ items: [{ id: "i", sku: "X-1", name: "Half", bin: "A-01-01" }], suppliers: [], movements: [] }),
    ],
    ["null rows", JSON.stringify({ items: [null], suppliers: [null], movements: [null] })],
  ];

  for (const [label, value] of JUNK) {
    test(`${label} reseeds instead of breaking the parts page`, async ({ page }) => {
      await store(page, value);
      await page.goto("/app/items");

      await expect(page.getByText("Something broke on this screen.")).toBeHidden();
      await expect(page.getByText(/of [\d,]+ parts/)).toBeVisible();
      await expect(page.locator("tbody tr").first()).toBeVisible();
      await expect(page.locator("body")).not.toContainText("NaN");
    });

    test(`${label} reseeds instead of putting NaN on the overview`, async ({ page }) => {
      await store(page, value);
      await page.goto("/app");

      await expect(page.getByText("Something broke on this screen.")).toBeHidden();
      await expect(page.locator("body")).not.toContainText("NaN");
      await expect(page.getByText("Stock value")).toBeVisible();
    });
  }

  test("a snapshot that is genuinely valid survives a reload", async ({ page }) => {
    await openParts(page);
    await addPart(page, { name: "Survives Reload", sku: "TST-6001", bin: "C-02-02", qty: 20 });

    await page.reload();
    const row = await findBySku(page, "TST-6001");
    await expect(row).toContainText("Survives Reload");
  });
});

test.describe("announcements", () => {
  test("filtering reports how many parts are left", async ({ page }) => {
    await openParts(page);

    const live = page.locator('[aria-live="polite"]');
    await expect(live).toContainText(/\d+ parts match/);

    await page.getByLabel("Filter parts").fill("nothing-matches-this");
    await expect(live).toContainText("No parts match.");

    await page.getByLabel("Filter parts").fill("");
    await expect(live).toContainText("184 parts match.");
  });

  test("recording a movement says so, not just on screen", async ({ page }) => {
    await openParts(page);
    await addPart(page, { name: "Announce Test", sku: "TST-6002", bin: "C-03-03", qty: 10 });

    await findBySku(page, "TST-6002");
    await openPart(page, "TST-6002");

    const panel = drawer(page);
    await panel.getByLabel("Quantity", { exact: true }).fill("7");
    await panel.getByRole("button", { name: "Receive", exact: true }).click();

    await expect(panel.getByRole("status")).toContainText("Received 7 ea.");

    await panel.getByLabel("Quantity", { exact: true }).fill("3");
    await panel.getByRole("button", { name: "Pick", exact: true }).click();
    await expect(panel.getByRole("status")).toContainText("Picked 3 ea.");
  });

  test("a refused movement is announced as an error, not a success", async ({ page }) => {
    await openParts(page);
    await addPart(page, { name: "Refusal Test", sku: "TST-6003", bin: "C-04-04", qty: 2 });

    await findBySku(page, "TST-6003");
    await openPart(page, "TST-6003");

    const panel = drawer(page);
    await panel.getByLabel("Quantity", { exact: true }).fill("99");
    await panel.getByRole("button", { name: "Pick", exact: true }).click();

    await expect(panel.getByRole("alert")).toContainText("Only 2 on hand.");
    await expect(panel.getByRole("status")).toBeEmpty();
  });
});
