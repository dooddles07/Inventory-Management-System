import { expect, test } from "@playwright/test";
import { openParts } from "./helpers";

test.describe("skip link", () => {
  for (const route of ["/", "/app/items"]) {
    test(`${route} offers a way past the navigation`, async ({ page }) => {
      await page.goto(route);
      await page.keyboard.press("Tab");

      const skip = page.getByRole("link", { name: "Skip to content" });
      await expect(skip).toBeFocused();
      await expect(skip).toBeVisible();

      await page.keyboard.press("Enter");
      await expect(page.locator("#main-content")).toBeFocused();
    });
  }

  test("it stays out of the way until it is needed", async ({ page }) => {
    await page.goto("/app/items");

    // sr-only collapses it to a single clipped pixel rather than hiding it from the
    // accessibility tree, which is what keeps it reachable by Tab.
    const box = await page.getByRole("link", { name: "Skip to content" }).boundingBox();
    expect(box!.width).toBeLessThan(4);
    expect(box!.height).toBeLessThan(4);
  });
});

test.describe("dialogs return focus", () => {
  test("the part drawer hands focus back to the row that opened it", async ({ page }) => {
    await openParts(page);

    const trigger = page.locator("tbody tr:first-child td:nth-child(2) button");
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("the confirm dialog hands focus back to the button that opened it", async ({ page }) => {
    await openParts(page);

    await page.locator("tbody input[type=checkbox]").first().check();
    const trigger = page.getByRole("button", { name: "Delete selected" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("focus stays inside the drawer while it is open", async ({ page }) => {
    await openParts(page);

    await page.locator("tbody tr:first-child td:nth-child(2) button").click();
    await expect(page.getByRole("dialog")).toBeVisible();

    for (let i = 0; i < 25; i += 1) {
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]"));
      expect(inside).toBe(true);
    }
  });
});

test.describe("keyboard paths", () => {
  test("slash focuses search, arrows pick a result, Enter opens it", async ({ page }) => {
    await page.goto("/app");

    await page.keyboard.press("/");
    await expect(page.getByLabel("Search parts, SKUs and bins")).toBeFocused();

    await page.keyboard.type("hydraulic");
    await expect(page.getByRole("option").first()).toBeVisible();

    await page.keyboard.press("ArrowDown");
    await expect(page.locator("[role=option][aria-selected=true]")).toHaveCount(1);

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/focus=/);
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("the floor grid is one tab stop, not 288", async ({ page }) => {
    await page.goto("/app/map");

    await page.locator('[role=gridcell][tabindex="0"]').focus();
    await page.keyboard.press("Tab");

    const stillInGrid = await page.evaluate(
      () => document.activeElement?.getAttribute("role") === "gridcell",
    );
    expect(stillInGrid).toBe(false);
  });

  test("a part can be added without touching the mouse", async ({ page }) => {
    await openParts(page);

    await page.getByRole("button", { name: "Add part", exact: true }).focus();
    await page.keyboard.press("Enter");

    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();

    await drawer.getByLabel("Part name", { exact: true }).focus();
    await page.keyboard.type("Keyboard Only Part");
    await drawer.getByLabel("SKU", { exact: true }).focus();
    await page.keyboard.type("TST-7001");
    await drawer.getByLabel("Bin", { exact: true }).focus();
    await page.keyboard.type("E-06-04");
    await drawer.getByLabel("Opening quantity", { exact: true }).focus();
    await page.keyboard.type("25");

    await drawer.getByRole("button", { name: "Add part", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(drawer).toBeHidden();

    await page.getByLabel("Filter parts").fill("TST-7001");
    await expect(page.getByRole("row").filter({ hasText: "TST-7001" })).toContainText(
      "Keyboard Only Part",
    );
  });
});
