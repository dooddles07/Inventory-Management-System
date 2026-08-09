import { describe, expect, it } from "vitest";
import {
  binOccupancy,
  fillRatio,
  lineValue,
  reorderQueue,
  statusOf,
  throughputSeries,
  totals,
} from "./derive";
import type { Item, Movement, Supplier } from "./types";

function item(patch: Partial<Item> = {}): Item {
  return {
    id: "itm_001",
    sku: "FST-1000",
    name: "M8x40 Hex Bolt",
    category: "Fasteners",
    supplierId: "sup_01",
    uom: "box",
    qty: 100,
    reorderPoint: 20,
    safetyStock: 8,
    unitCost: 250,
    bin: "A-01-01",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...patch,
  };
}

function supplier(patch: Partial<Supplier> = {}): Supplier {
  return {
    id: "sup_01",
    name: "Halden Industrial",
    code: "HLD",
    leadTimeDays: 4,
    country: "GB",
    contact: "orders@halden.example",
    ...patch,
  };
}

describe("statusOf", () => {
  it("reads zero and below as out of stock", () => {
    expect(statusOf(item({ qty: 0 }))).toBe("out");
    expect(statusOf(item({ qty: -3 }))).toBe("out");
  });

  it("treats the reorder point itself as already low", () => {
    expect(statusOf(item({ qty: 20, reorderPoint: 20 }))).toBe("low");
    expect(statusOf(item({ qty: 21, reorderPoint: 20 }))).toBe("ok");
  });
});

describe("fillRatio", () => {
  it("treats six times the reorder point as a full bin", () => {
    expect(fillRatio(item({ qty: 120, reorderPoint: 20 }))).toBe(1);
    expect(fillRatio(item({ qty: 60, reorderPoint: 20 }))).toBe(0.5);
  });

  it("clamps rather than reporting an overfull bin", () => {
    expect(fillRatio(item({ qty: 9999, reorderPoint: 20 }))).toBe(1);
    expect(fillRatio(item({ qty: 0 }))).toBe(0);
  });

  it("survives a reorder point of zero", () => {
    expect(fillRatio(item({ qty: 5, reorderPoint: 0 }))).toBe(1);
  });
});

describe("totals", () => {
  it("counts low and out separately and values stock in minor units", () => {
    const summary = totals([
      item({ id: "a", qty: 100, unitCost: 250 }),
      item({ id: "b", qty: 20, reorderPoint: 20, unitCost: 100 }),
      item({ id: "c", qty: 0, unitCost: 500 }),
    ]);

    expect(summary).toEqual({
      skus: 3,
      unitsOnHand: 120,
      stockValue: 100 * 250 + 20 * 100,
      low: 1,
      out: 1,
    });
  });

  it("returns zeroes for an empty warehouse", () => {
    expect(totals([])).toEqual({ skus: 0, unitsOnHand: 0, stockValue: 0, low: 0, out: 0 });
  });
});

describe("lineValue", () => {
  it("multiplies quantity by the minor-unit cost", () => {
    expect(lineValue(item({ qty: 3, unitCost: 1299 }))).toBe(3897);
  });
});

describe("reorderQueue", () => {
  const slow = supplier({ id: "sup_slow", leadTimeDays: 21 });
  const fast = supplier({ id: "sup_fast", leadTimeDays: 3 });

  it("leaves out anything above its reorder point", () => {
    const queue = reorderQueue([item({ qty: 100 })], [supplier()]);
    expect(queue).toHaveLength(0);
  });

  it("ranks an empty bin with a slow supplier above one with a fast supplier", () => {
    const queue = reorderQueue(
      [
        item({ id: "fastItem", sku: "A", qty: 0, supplierId: fast.id }),
        item({ id: "slowItem", sku: "B", qty: 0, supplierId: slow.id }),
      ],
      [fast, slow],
    );

    expect(queue.map((line) => line.item.id)).toEqual(["slowItem", "fastItem"]);
  });

  it("orders a part that has run out above one merely below its reorder point", () => {
    const queue = reorderQueue(
      [
        item({ id: "low", qty: 19, reorderPoint: 20, supplierId: fast.id }),
        item({ id: "out", qty: 0, reorderPoint: 20, supplierId: fast.id }),
      ],
      [fast],
    );

    expect(queue[0].item.id).toBe("out");
  });

  it("sizes the shortfall against the reorder point plus safety stock", () => {
    const [line] = reorderQueue(
      [item({ qty: 5, reorderPoint: 20, safetyStock: 8 })],
      [supplier()],
    );
    expect(line.shortfall).toBe(23);
  });

  it("reports no cover days when the supplier is missing", () => {
    const [line] = reorderQueue([item({ qty: 0, supplierId: "sup_gone" })], []);
    expect(line.supplier).toBeUndefined();
    expect(line.coverDays).toBeNull();
  });

  it("honours the limit", () => {
    const items = Array.from({ length: 5 }, (_, index) =>
      item({ id: `itm_${index}`, sku: `SKU-${index}`, qty: 0 }),
    );
    expect(reorderQueue(items, [supplier()], 2)).toHaveLength(2);
  });
});

describe("throughputSeries", () => {
  const endAt = Date.parse("2026-08-09T00:00:00.000Z");
  const day = 86_400_000;

  function movement(at: string, qty: number): Movement {
    return {
      id: `mov_${at}`,
      itemId: "itm_001",
      type: qty >= 0 ? "receipt" : "issue",
      qty,
      reference: "GRN-1",
      at,
      by: "you",
    };
  }

  it("buckets by day and counts issues as movement, not as a negative", () => {
    const series = throughputSeries(
      [
        movement(new Date(endAt - day * 0.5).toISOString(), -30),
        movement(new Date(endAt - day * 0.4).toISOString(), 20),
      ],
      3,
      endAt,
    );

    expect(series).toHaveLength(3);
    expect(series[2]).toBe(50);
    expect(series[0]).toBe(0);
  });

  it("ignores anything outside the window", () => {
    const series = throughputSeries(
      [movement(new Date(endAt - day * 30).toISOString(), 500)],
      3,
      endAt,
    );
    expect(series.every((value) => value === 0)).toBe(true);
  });
});

describe("binOccupancy", () => {
  it("keeps the fuller part when two share a bin", () => {
    const map = binOccupancy([
      item({ id: "sparse", bin: "B-02-03", qty: 10, reorderPoint: 20 }),
      item({ id: "packed", bin: "B-02-03", qty: 110, reorderPoint: 20 }),
    ]);

    expect(map.get("B-02-03")?.id).toBe("packed");
  });
});
