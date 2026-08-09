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

test.describe("two tabs on the same warehouse", () => {
  async function add(page: import("@playwright/test").Page, name: string, sku: string, bin: string) {
    await page.getByRole("button", { name: "Add part", exact: true }).click();
    const panel = page.getByRole("dialog");
    await panel.getByLabel("Part name", { exact: true }).fill(name);
    await panel.getByLabel("SKU", { exact: true }).fill(sku);
    await panel.getByLabel("Bin", { exact: true }).fill(bin);
    await panel.getByRole("button", { name: "Add part", exact: true }).click();
    await expect(panel).toBeHidden();
  }

  test("neither tab destroys the other's work", async ({ page, context }) => {
    const second = await context.newPage();

    await openParts(page);
    await openParts(second);

    await add(page, "From Tab A", "TAB-A001", "A-01-02");
    await add(second, "From Tab B", "TAB-B001", "A-01-03");

    // A third reader sees the storage both tabs wrote to.
    const third = await context.newPage();
    await openParts(third);

    await third.getByLabel("Filter parts").fill("TAB-");
    await expect(third.getByRole("row").filter({ hasText: "TAB-A001" })).toHaveCount(1);
    await expect(third.getByRole("row").filter({ hasText: "TAB-B001" })).toHaveCount(1);

    await second.close();
    await third.close();
  });

  test("a tab picks up what the other one wrote", async ({ page, context }) => {
    const second = await context.newPage();

    await openParts(page);
    await openParts(second);

    await add(second, "Written Elsewhere", "TAB-C001", "B-05-05");

    // No reload: the storage event should have brought it across.
    await page.getByLabel("Filter parts").fill("TAB-C001");
    await expect(page.getByRole("row").filter({ hasText: "TAB-C001" })).toHaveCount(1, {
      timeout: 10_000,
    });

    await second.close();
  });

  test("a reset in one tab clears the other", async ({ page, context }) => {
    const second = await context.newPage();

    await openParts(page);
    await add(page, "Doomed By Reset", "TAB-D001", "C-06-06");
    await openParts(second);

    await second.getByTitle("Restore the sample warehouse").click();
    await second.getByRole("dialog").getByRole("button", { name: "Reset everything" }).click();

    await page.getByLabel("Filter parts").fill("TAB-D001");
    await expect(page.getByText("No parts match these filters")).toBeVisible({ timeout: 10_000 });

    await second.close();
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
