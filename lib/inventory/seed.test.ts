import { describe, expect, it } from "vitest";
import {
  AISLES,
  ITEM_COUNT,
  RACKS_PER_AISLE,
  SHELVES_PER_RACK,
  allBins,
  createSeedSnapshot,
} from "./seed";

const BIN_PATTERN = /^[A-F]-\d{2}-\d{2}$/;

describe("allBins", () => {
  it("covers every shelf in the building exactly once", () => {
    const bins = allBins();
    expect(bins).toHaveLength(AISLES.length * RACKS_PER_AISLE * SHELVES_PER_RACK);
    expect(new Set(bins).size).toBe(bins.length);
    expect(bins.every((bin) => BIN_PATTERN.test(bin))).toBe(true);
  });
});

describe("createSeedSnapshot", () => {
  const snapshot = createSeedSnapshot();

  it("is deterministic, which is what stops the server and client disagreeing", () => {
    expect(createSeedSnapshot()).toEqual(createSeedSnapshot());
  });

  it("builds the advertised number of parts", () => {
    expect(snapshot.items).toHaveLength(ITEM_COUNT);
  });

  it("gives every part a unique SKU, a unique id and a real bin", () => {
    const skus = new Set(snapshot.items.map((item) => item.sku));
    const ids = new Set(snapshot.items.map((item) => item.id));

    expect(skus.size).toBe(snapshot.items.length);
    expect(ids.size).toBe(snapshot.items.length);
    expect(snapshot.items.every((item) => BIN_PATTERN.test(item.bin))).toBe(true);
  });

  it("scatters stock rather than packing it into one bin", () => {
    const bins = new Set(snapshot.items.map((item) => item.bin));
    expect(bins.size).toBe(snapshot.items.length);
  });

  it("points every part at a supplier that exists", () => {
    const supplierIds = new Set(snapshot.suppliers.map((supplier) => supplier.id));
    expect(snapshot.items.every((item) => supplierIds.has(item.supplierId))).toBe(true);
  });

  it("never generates a negative quantity or cost", () => {
    expect(snapshot.items.every((item) => item.qty >= 0 && item.unitCost > 0)).toBe(true);
  });

  it("gives the warehouse something to restock and something in stock", () => {
    const out = snapshot.items.filter((item) => item.qty === 0);
    const healthy = snapshot.items.filter((item) => item.qty > item.reorderPoint);

    expect(out.length).toBeGreaterThan(0);
    expect(healthy.length).toBeGreaterThan(0);
  });

  it("attaches every movement to a part that exists", () => {
    const ids = new Set(snapshot.items.map((item) => item.id));
    expect(snapshot.movements.every((movement) => ids.has(movement.itemId))).toBe(true);
  });

  it("orders movements newest first", () => {
    const timestamps = snapshot.movements.map((movement) => Date.parse(movement.at));
    const sorted = [...timestamps].sort((a, b) => b - a);
    expect(timestamps).toEqual(sorted);
  });

  it("signs movements the way the app reads them", () => {
    const receipts = snapshot.movements.filter((movement) => movement.type === "receipt");
    const issues = snapshot.movements.filter((movement) => movement.type === "issue");

    expect(receipts.every((movement) => movement.qty > 0)).toBe(true);
    expect(issues.every((movement) => movement.qty < 0)).toBe(true);
  });

  it("carries a reference on every movement", () => {
    expect(snapshot.movements.every((movement) => movement.reference.length > 0)).toBe(true);
  });
});
