import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
  test("the hero counts parts and bins as two different figures", async ({ page }) => {
    await page.goto("/");

    // This read "184 parts across 184 bins" once, because every seeded part holds its own
    // bin. Two identical numbers in one sentence looks like a rendering fault.
    const sentence = await page.getByText(/^This warehouse holds/).innerText();
    const [parts, bins, needing] = sentence.match(/[\d,]+/g)!.map((n) => Number(n.replace(/,/g, "")));

    expect(parts).toBe(184);
    expect(bins).toBe(288);
    expect(parts).not.toBe(bins);
    expect(needing).toBeGreaterThan(0);
    expect(needing).toBeLessThan(parts);
  });

  test("each plan's button names the plan it belongs to", async ({ page }) => {
    await page.goto("/");

    const labels = await page.locator("#pricing a").allInnerTexts();
    expect(labels).toEqual(["Choose Shelf", "Choose Warehouse", "Choose Multi-site"]);
    expect(new Set(labels).size).toBe(labels.length);
  });

  test("the pricing section admits it does not bill anyone", async ({ page }) => {
    await page.goto("/");

    const pricing = page.locator("#pricing");
    await expect(pricing).toContainText("portfolio project");
    await expect(pricing).toContainText(/bills? (you|nobody)/i);
  });

  test("the proof table is rendered, not a screenshot", async ({ page }) => {
    await page.goto("/");

    const rows = page.locator("#floor tbody tr");
    await expect(rows).toHaveCount(7);
    await expect(rows.first()).toContainText(/[A-Z]{3}-\d{4}/);
  });

  test("the floor map names a bin when you point at one", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText(/Pick a bin to see what is in it/)).toBeVisible();

    await page.locator(".bin-cell-in").nth(40).hover();
    await expect(page.getByText(/^[A-F]-\d{2}-\d{2}/).first()).toBeVisible();
  });

  test("every route out of the header reaches the app", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("banner").getByRole("link", { name: "Open Stockroom" }).click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  });

  test.describe("on a phone", () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

    // The bin code is the first thing in the readout, which is what anchors this.
    const binCode = /^[A-F]-\d{2}-\d{2}/;

    test("the floor map answers a tap, since there is no hover to give it", async ({ page }) => {
      await page.goto("/");

      // The instruction has to be one a touch visitor can actually follow.
      await expect(page.getByText(/Hover a bin/)).toHaveCount(0);
      expect(await page.evaluate(() => window.matchMedia("(hover: hover)").matches)).toBe(false);

      const prompt = page.getByText(/Pick a bin to see what is in it/);
      await expect(prompt).toBeVisible();

      await page.locator(".bin-cell-in").nth(60).tap();

      await expect(prompt).toBeHidden();
      await expect(page.getByText(binCode).first()).toBeVisible();
    });

    test("tapping a different bin moves the readout to it", async ({ page }) => {
      await page.goto("/");

      await page.locator(".bin-cell-in").nth(60).tap();
      const first = await page.getByText(binCode).first().innerText();

      await page.locator(".bin-cell-in").nth(140).tap();
      const second = await page.getByText(binCode).first().innerText();

      expect(first).toMatch(binCode);
      expect(second).not.toBe(first);
    });
  });

  test("the page keeps one h1 and an outline that does not skip", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

    const levels = await page.evaluate(() =>
      [...document.querySelectorAll("h1,h2,h3,h4")].map((h) => Number(h.tagName[1])),
    );

    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
  });
});
