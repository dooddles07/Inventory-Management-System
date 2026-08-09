import { expect, test } from "@playwright/test";
import { SEEDED_PART_COUNT, addPart, drawer, findBySku, openPart, openParts, totalParts } from "./helpers";

test.describe("adding a part", () => {
  test("saves it and shows it on the shelf where it was put", async ({ page }) => {
    await openParts(page);

    await addPart(page, {
      name: "M10x50 Hex Bolt, Zinc",
      sku: "TST-9001",
      bin: "D-05-03",
      qty: 40,
    });

    const row = await findBySku(page, "TST-9001");
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("M10x50 Hex Bolt, Zinc");
    await expect(row).toContainText("D-05-03");
    await expect(row).toContainText("40");
    await expect(row).toContainText("In stock");
  });

  test("a part below its reorder point arrives already flagged", async ({ page }) => {
    await openParts(page);

    await addPart(page, { name: "Nearly Gone", sku: "TST-9002", bin: "A-02-02", qty: 3 });

    const row = await findBySku(page, "TST-9002");
    await expect(row).toContainText("Below reorder");
  });

  test("a part with nothing on the shelf reads as out of stock", async ({ page }) => {
    await openParts(page);

    await addPart(page, { name: "Empty Bin Part", sku: "TST-9003", bin: "A-03-03", qty: 0 });

    const row = await findBySku(page, "TST-9003");
    await expect(row).toContainText("Out of stock");
  });
});

test.describe("the form refuses what it cannot store", () => {
  test("a missing name and SKU", async ({ page }) => {
    await openParts(page);
    await page.getByRole("button", { name: "Add part", exact: true }).click();

    const panel = drawer(page);
    await panel.getByRole("button", { name: "Add part", exact: true }).click();

    await expect(panel.getByText("Give the part a name people will recognise.")).toBeVisible();
    await expect(panel.getByText("Every part needs a SKU.")).toBeVisible();
    await expect(panel).toBeVisible();
  });

  test("a SKU another part already uses", async ({ page }) => {
    await openParts(page);
    await addPart(page, { name: "First", sku: "TST-9100", bin: "B-01-01", qty: 10 });

    await page.getByRole("button", { name: "Add part", exact: true }).click();
    const panel = drawer(page);
    await panel.getByLabel("Part name", { exact: true }).fill("Second");
    await panel.getByLabel("SKU", { exact: true }).fill("TST-9100");
    await panel.getByLabel("Bin", { exact: true }).fill("B-01-02");
    await panel.getByRole("button", { name: "Add part", exact: true }).click();

    await expect(panel.getByText("Another part already uses this SKU.")).toBeVisible();
  });

  test("a bin that is not an address", async ({ page }) => {
    await openParts(page);
    await page.getByRole("button", { name: "Add part", exact: true }).click();

    const panel = drawer(page);
    await panel.getByLabel("Part name", { exact: true }).fill("Bad Bin");
    await panel.getByLabel("SKU", { exact: true }).fill("TST-9200");
    await panel.getByLabel("Bin", { exact: true }).fill("shelf 4");
    await panel.getByRole("button", { name: "Add part", exact: true }).click();

    await expect(panel.getByText("Use aisle-rack-shelf, like C-04-12.")).toBeVisible();
  });
});

test.describe("editing", () => {
  test("a rename shows up in the table", async ({ page }) => {
    await openParts(page);
    await addPart(page, { name: "Before", sku: "TST-9300", bin: "C-01-01", qty: 12 });

    await findBySku(page, "TST-9300");
    await openPart(page, "TST-9300");

    const panel = drawer(page);
    await panel.getByLabel("Part name", { exact: true }).fill("After");
    await panel.getByRole("button", { name: "Save changes" }).click();
    await expect(panel).toBeHidden();

    await expect(page.getByRole("row").filter({ hasText: "TST-9300" })).toContainText("After");
  });
});

test.describe("deleting", () => {
  test("one part, with copy that reads as one part", async ({ page }) => {
    await openParts(page);
    await addPart(page, { name: "Doomed Part", sku: "TST-9400", bin: "E-01-01", qty: 5 });

    await findBySku(page, "TST-9400");
    await openPart(page, "TST-9400");
    await drawer(page).getByRole("button", { name: "Delete", exact: true }).click();

    const confirm = page.getByRole("dialog").filter({ hasText: "Delete Doomed Part?" });
    await expect(confirm).toBeVisible();
    await expect(confirm).toContainText("The part and its movement history");
    await confirm.getByRole("button", { name: "Delete part" }).click();

    await expect(page.getByText("No parts match these filters")).toBeVisible();
  });

  test("the bulk dialog says 'this part' for one and counts the rest", async ({ page }) => {
    await openParts(page);

    await page.locator("tbody input[type=checkbox]").first().check();
    await expect(page.getByText("1 selected")).toBeVisible();
    await page.getByRole("button", { name: "Delete selected" }).click();

    let confirm = page.getByRole("dialog");
    await expect(confirm).toContainText("Delete this part?");
    await confirm.getByRole("button", { name: "Keep it" }).click();

    await page.locator("tbody input[type=checkbox]").nth(1).check();
    await page.getByRole("button", { name: "Delete selected" }).click();

    confirm = page.getByRole("dialog");
    await expect(confirm).toContainText("Delete 2 parts?");
    await confirm.getByRole("button", { name: "Delete parts" }).click();

    expect(await totalParts(page)).toBe(SEEDED_PART_COUNT - 2);
  });
});

test.describe("filtering", () => {
  test("status, category and a cleared search each move the total", async ({ page }) => {
    await openParts(page);
    expect(await totalParts(page)).toBe(SEEDED_PART_COUNT);

    await page.getByLabel("Filter by stock status").selectOption("out");
    const outOfStock = await totalParts(page);
    expect(outOfStock).toBeGreaterThan(0);
    expect(outOfStock).toBeLessThan(SEEDED_PART_COUNT);

    await page.getByLabel("Filter by category").selectOption("Fasteners");
    expect(await totalParts(page)).toBeLessThanOrEqual(outOfStock);

    await page.getByRole("button", { name: "Clear filters" }).click();
    expect(await totalParts(page)).toBe(SEEDED_PART_COUNT);
  });

  test("a search that matches nothing offers the way out", async ({ page }) => {
    await openParts(page);

    await page.getByLabel("Filter parts").fill("nothing-matches-this");
    await expect(page.getByText("No parts match these filters")).toBeVisible();

    await page.getByRole("button", { name: "Clear filters" }).first().click();
    expect(await totalParts(page)).toBe(SEEDED_PART_COUNT);
  });

  test("sorting by quantity puts the empty bins first", async ({ page }) => {
    await openParts(page);

    await page.getByRole("button", { name: "On hand" }).click();
    await expect(page.getByRole("columnheader", { name: /On hand/ })).toHaveAttribute(
      "aria-sort",
      "descending",
    );

    await page.getByRole("button", { name: "On hand" }).click();
    await expect(page.getByRole("columnheader", { name: /On hand/ })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    await expect(page.locator("tbody tr").first()).toContainText("Out of stock");
  });
});

test.describe("resetting", () => {
  test("puts back everything that was deleted", async ({ page }) => {
    await openParts(page);

    await page.locator("tbody input[type=checkbox]").first().check();
    await page.getByRole("button", { name: "Delete selected" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete part" }).click();
    expect(await totalParts(page)).toBe(SEEDED_PART_COUNT - 1);

    await page.getByTitle("Restore the sample warehouse").click();
    const confirm = page.getByRole("dialog");
    await expect(confirm).toContainText("Reset to the sample warehouse?");
    await confirm.getByRole("button", { name: "Reset everything" }).click();

    expect(await totalParts(page)).toBe(SEEDED_PART_COUNT);
  });
});
