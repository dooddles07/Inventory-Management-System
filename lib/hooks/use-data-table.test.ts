import { describe, expect, it } from "vitest";
import { compare, matches, type TableFilters } from "./use-data-table";
import type { Item } from "@/lib/inventory/types";

function item(patch: Partial<Item> = {}): Item {
  return {
    id: "itm_001",
    sku: "FST-1042",
    name: "M8x40 Hex Bolt",
    category: "Fasteners",
    supplierId: "sup_01",
    uom: "box",
    qty: 100,
    reorderPoint: 20,
    safetyStock: 8,
    unitCost: 250,
    bin: "C-04-12",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...patch,
  };
}

function filters(patch: Partial<TableFilters> = {}): TableFilters {
  return { search: "", category: "all", supplierId: "all", status: "all", ...patch };
}

describe("matches", () => {
  it("searches name, SKU, bin and category alike", () => {
    expect(matches(item(), filters({ search: "hex bolt" }))).toBe(true);
    expect(matches(item(), filters({ search: "fst-1042" }))).toBe(true);
    expect(matches(item(), filters({ search: "C-04" }))).toBe(true);
    expect(matches(item(), filters({ search: "fasteners" }))).toBe(true);
    expect(matches(item(), filters({ search: "bearing" }))).toBe(false);
  });

  it("ignores case and surrounding space in the search term", () => {
    expect(matches(item(), filters({ search: "  HEX BOLT  " }))).toBe(true);
    expect(matches(item(), filters({ search: "   " }))).toBe(true);
    expect(matches(item(), filters({ search: "  NUT  " }))).toBe(false);
  });

  it("filters by category and supplier", () => {
    expect(matches(item(), filters({ category: "Fasteners" }))).toBe(true);
    expect(matches(item(), filters({ category: "Bearings" }))).toBe(false);
    expect(matches(item(), filters({ supplierId: "sup_01" }))).toBe(true);
    expect(matches(item(), filters({ supplierId: "sup_99" }))).toBe(false);
  });

  it("treats 'attention' as anything that is not healthy", () => {
    const healthy = item({ qty: 100, reorderPoint: 20 });
    const low = item({ qty: 20, reorderPoint: 20 });
    const out = item({ qty: 0 });

    expect(matches(healthy, filters({ status: "attention" }))).toBe(false);
    expect(matches(low, filters({ status: "attention" }))).toBe(true);
    expect(matches(out, filters({ status: "attention" }))).toBe(true);
  });

  it("separates low from out when asked for one of them", () => {
    const low = item({ qty: 20, reorderPoint: 20 });
    const out = item({ qty: 0 });

    expect(matches(low, filters({ status: "low" }))).toBe(true);
    expect(matches(out, filters({ status: "low" }))).toBe(false);
    expect(matches(out, filters({ status: "out" }))).toBe(true);
  });

  it("applies filters together, not as alternatives", () => {
    const target = item({ qty: 0, category: "Fasteners", supplierId: "sup_01" });
    expect(
      matches(target, filters({ status: "out", category: "Fasteners", supplierId: "sup_01" })),
    ).toBe(true);
    expect(
      matches(target, filters({ status: "out", category: "Bearings", supplierId: "sup_01" })),
    ).toBe(false);
  });
});

describe("compare", () => {
  const cheap = item({ id: "a", name: "Alpha", sku: "AAA-1", qty: 5, unitCost: 100, bin: "A-01-01" });
  const dear = item({ id: "b", name: "Beta", sku: "ZZZ-9", qty: 50, unitCost: 900, bin: "F-08-06" });

  it("orders by quantity, value and the text columns", () => {
    expect(compare(cheap, dear, "qty")).toBeLessThan(0);
    expect(compare(cheap, dear, "value")).toBeLessThan(0);
    expect(compare(cheap, dear, "name")).toBeLessThan(0);
    expect(compare(cheap, dear, "sku")).toBeLessThan(0);
    expect(compare(cheap, dear, "bin")).toBeLessThan(0);
  });

  it("falls back to the name when two rows share a category", () => {
    const first = item({ name: "Alpha", category: "Fasteners" });
    const second = item({ name: "Beta", category: "Fasteners" });
    expect(compare(first, second, "category")).toBeLessThan(0);
  });

  it("orders dates oldest first, which the table then flips", () => {
    const older = item({ updatedAt: "2026-01-01T00:00:00.000Z" });
    const newer = item({ updatedAt: "2026-08-01T00:00:00.000Z" });
    expect(compare(older, newer, "updatedAt")).toBeLessThan(0);
  });
});
