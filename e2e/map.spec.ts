import { expect, test } from "@playwright/test";

test.describe("floor map", () => {
  test("opens on a bin that holds something, not on a blank panel", async ({ page }) => {
    await page.goto("/app/map");

    const panel = page.getByRole("heading", { name: /^[A-F]-\d{2}-\d{2}$/ });
    await expect(panel).toBeVisible();
    await expect(page.getByRole("link", { name: "Open this part" })).toBeVisible();
  });

  test("arrow keys walk the racks and the panel follows", async ({ page }) => {
    await page.goto("/app/map");

    const grid = page.getByRole("grid", { name: /Warehouse bins/ });
    await expect(grid).toBeVisible();

    const heading = page.getByRole("heading", { name: /^[A-F]-\d{2}-\d{2}$/ });
    const before = await heading.innerText();

    await grid.getByRole("gridcell").filter({ has: page.locator(":scope") }).first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(heading).not.toHaveText(before);

    const afterRight = await heading.innerText();
    await page.keyboard.press("ArrowDown");
    await expect(heading).not.toHaveText(afterRight);
  });

  test("only one cell is in the tab order, so the grid is a single stop", async ({ page }) => {
    await page.goto("/app/map");

    const tabbable = page.locator('[role="gridcell"][tabindex="0"]');
    await expect(tabbable).toHaveCount(1);
  });

  test("the colour toggle swaps the legend", async ({ page }) => {
    await page.goto("/app/map");

    await expect(page.getByText("Empty", { exact: true })).toBeVisible();

    await page.getByRole("radio", { name: "Stock status" }).click();
    await expect(page.getByRole("radio", { name: "Stock status" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.getByText("Below reorder").first()).toBeVisible();
    await expect(page.getByText("Empty", { exact: true })).toBeHidden();
  });

  test("a bin leads back to the part it holds", async ({ page }) => {
    await page.goto("/app/map");

    await page.getByRole("link", { name: "Open this part" }).click();

    await expect(page).toHaveURL(/\/app\/items\?focus=/);
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("the header counts the bins that hold stock", async ({ page }) => {
    await page.goto("/app/map");

    const hint = page.getByText(/of [\d,]+ bins hold stock/);
    await expect(hint).toBeVisible();

    const [used, total] = (await hint.innerText()).match(/[\d,]+/g)!.map((n) => Number(n.replace(/,/g, "")));
    expect(total).toBe(288);
    expect(used).toBeGreaterThan(0);
    expect(used).toBeLessThanOrEqual(total);
  });
});
