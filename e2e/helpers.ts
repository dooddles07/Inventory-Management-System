import { expect, type Page } from "@playwright/test";

/** What the deterministic seed builds. A change here should be a deliberate one. */
export const SEEDED_PART_COUNT = 184;

export interface NewPart {
  name: string;
  sku: string;
  bin: string;
  qty: number;
}

/** The table only paints once the repository has read from localStorage. */
export async function openParts(page: Page, path = "/app/items") {
  await page.goto(path);
  await expect(page.getByRole("button", { name: "Add part", exact: true })).toBeVisible();
}

export function drawer(page: Page) {
  return page.getByRole("dialog");
}

export async function addPart(page: Page, part: NewPart) {
  await page.getByRole("button", { name: "Add part", exact: true }).click();

  const panel = drawer(page);
  await expect(panel).toBeVisible();
  await panel.getByLabel("Part name", { exact: true }).fill(part.name);
  await panel.getByLabel("SKU", { exact: true }).fill(part.sku);
  await panel.getByLabel("Bin", { exact: true }).fill(part.bin);
  await panel.getByLabel("Opening quantity", { exact: true }).fill(String(part.qty));
  await panel.getByRole("button", { name: "Add part", exact: true }).click();

  await expect(panel).toBeHidden();
}

/** Narrows the table to one part, so assertions do not depend on sort order or paging. */
export async function findBySku(page: Page, sku: string) {
  await page.getByLabel("Filter parts").fill(sku);
  return page.getByRole("row").filter({ hasText: sku });
}

export async function openPart(page: Page, sku: string) {
  await page.getByRole("button", { name: new RegExp(sku) }).click();
  await expect(drawer(page)).toBeVisible();
}

/** "1-25 of 184 parts" -> 184 */
export async function totalParts(page: Page): Promise<number> {
  const footer = await page.getByText(/of [\d,]+ parts/).innerText();
  return Number(footer.replace(/.*of\s+([\d,]+)\s+parts.*/s, "$1").replace(/,/g, ""));
}
