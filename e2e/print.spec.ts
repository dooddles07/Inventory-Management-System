import { expect, test } from "@playwright/test";
import { openParts } from "./helpers";

/** Counts what would actually reach paper: laid out, visible, and carrying text. */
async function printableCount(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    return [...document.querySelectorAll("body *")].filter((el) => {
      const style = getComputedStyle(el);
      if (style.visibility !== "visible" || style.display === "none") return false;
      const box = el.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && (el.textContent ?? "").trim().length > 0;
    }).length;
  });
}

/**
 * The app paints skeletons until the repository has read from localStorage. Measuring
 * before that is measuring nothing, so every route waits on something only the real
 * screen renders.
 */
const READY: Record<string, (page: import("@playwright/test").Page) => Promise<void>> = {
  "/": async (page) => expect(page.getByRole("heading", { level: 1 })).toBeVisible(),
  "/app": async (page) => expect(page.getByText("Stock value")).toBeVisible(),
  "/app/items": async (page) => expect(page.locator("tbody tr").first()).toBeVisible(),
  "/app/movements": async (page) => expect(page.locator("tbody tr").first()).toBeVisible(),
  "/app/suppliers": async (page) => expect(page.locator("tbody tr").first()).toBeVisible(),
  "/app/map": async (page) => expect(page.locator("[role=gridcell]").first()).toBeVisible(),
};

async function openReady(page: import("@playwright/test").Page, route: string) {
  await page.goto(route);
  await READY[route](page);
}

test.describe("printing a screen", () => {
  // The label rules once hid everything on every page, so Ctrl+P anywhere gave a blank sheet.
  for (const route of Object.keys(READY)) {
    test(`${route} puts something on the page`, async ({ page }) => {
      await openReady(page, route);
      await page.emulateMedia({ media: "print" });

      expect(await printableCount(page)).toBeGreaterThan(20);
    });
  }

  test("the navigation and the top bar stay off the paper", async ({ page }) => {
    await openReady(page, "/app/items");
    await page.emulateMedia({ media: "print" });

    await expect(page.locator('[data-app-shell] nav[aria-label="Sections"]').first()).toBeHidden();
    await expect(page.getByLabel("Search parts, SKUs and bins")).toBeHidden();
  });

  test("the table is not clipped to one screen's worth", async ({ page }) => {
    await openReady(page, "/app/items");
    await page.emulateMedia({ media: "print" });

    const overflow = await page.evaluate(() => {
      const main = document.querySelector("#main-content");
      const shell = document.querySelector("[data-app-shell]");
      return {
        main: getComputedStyle(main!).overflow,
        shellHeight: getComputedStyle(shell!).height,
      };
    });

    expect(overflow.main).toBe("visible");
    expect(overflow.shellHeight).not.toMatch(/^\d+px$/);
  });
});

test.describe("printing a shelf label", () => {
  test("takes the label and leaves the screen behind", async ({ page }) => {
    await openParts(page);
    await page.locator("tbody tr:first-child td:nth-child(2) button").click();
    await expect(page.locator("[data-shelf-label]")).toBeVisible();

    await page.emulateMedia({ media: "print" });

    const label = page.locator("[data-shelf-label]");
    await expect(label).toBeVisible();
    await expect(page.locator("table").first()).toBeHidden();

    // Anchored on the page origin, not wherever the drawer's animation stopped.
    const box = await label.boundingBox();
    expect(box!.x).toBe(0);
    expect(box!.y).toBe(0);
  });

  test("keeps the caption and the print button off the label", async ({ page }) => {
    await openParts(page);
    await page.locator("tbody tr:first-child td:nth-child(2) button").click();
    await expect(page.locator("[data-shelf-label]")).toBeVisible();

    await page.emulateMedia({ media: "print" });

    await expect(page.getByRole("button", { name: "Print" })).toBeHidden();
    await expect(page.getByText("Shelf label")).toBeHidden();
  });
});

test.describe("high contrast", () => {
  test("the floor map keeps the fill that carries its data", async ({ page }) => {
    await page.emulateMedia({ forcedColors: "active" });
    await openReady(page, "/app/map");

    const distinct = await page.evaluate(() => {
      const cells = [...document.querySelectorAll("[role=gridcell]")].slice(0, 60);
      return new Set(cells.map((cell) => getComputedStyle(cell).backgroundColor)).size;
    });

    // Without forced-color-adjust every cell resolves to one colour and the map says nothing.
    expect(distinct).toBeGreaterThan(1);
  });
});
