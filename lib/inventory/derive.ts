import type { Item, Movement, StockStatus, Supplier } from "./types";

export function statusOf(item: Item): StockStatus {
  if (item.qty <= 0) return "out";
  if (item.qty <= item.reorderPoint) return "low";
  return "ok";
}

export const STATUS_LABEL: Record<StockStatus, string> = {
  ok: "In stock",
  low: "Below reorder",
  out: "Out of stock",
};

/** Value on hand for one line, in minor units. */
export function lineValue(item: Item): number {
  return item.qty * item.unitCost;
}

/**
 * Where the quantity sits between empty and a comfortably full bin.
 * Six times the reorder point is treated as full; that is the ceiling the seed generates to.
 */
export function fillRatio(item: Item): number {
  const ceiling = Math.max(item.reorderPoint * 6, 1);
  return Math.min(1, Math.max(0, item.qty / ceiling));
}

export interface Totals {
  skus: number;
  unitsOnHand: number;
  stockValue: number;
  low: number;
  out: number;
}

export function totals(items: Item[]): Totals {
  let unitsOnHand = 0;
  let stockValue = 0;
  let low = 0;
  let out = 0;

  for (const item of items) {
    unitsOnHand += item.qty;
    stockValue += lineValue(item);
    const status = statusOf(item);
    if (status === "low") low += 1;
    if (status === "out") out += 1;
  }

  return { skus: items.length, unitsOnHand, stockValue, low, out };
}

export interface ReorderLine {
  item: Item;
  supplier?: Supplier;
  shortfall: number;
  coverDays: number | null;
  urgency: number;
}

const ASSUMED_LEAD_DAYS = 7;

/**
 * Everything at or below its reorder point, most urgent first.
 *
 * Sorting out-of-stock to the top first sounds right and reads badly: seventeen parts
 * all showing zero, in no useful order. Urgency is how much is missing multiplied by
 * how long the supplier takes, doubled once a part has actually run out. A part that is
 * empty with a three-week supplier outranks one that is empty with a three-day supplier.
 *
 * Both factors are floored at one. A supplier who delivers the same day, or a part sitting
 * exactly on its reorder point with no safety stock, would otherwise multiply out to zero
 * urgency and sink below parts that are in better shape - which is the one thing the
 * doubling is there to prevent.
 */
export function reorderQueue(items: Item[], suppliers: Supplier[], limit?: number): ReorderLine[] {
  const supplierById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));

  const lines = items
    .filter((item) => statusOf(item) !== "ok")
    .map((item) => {
      const supplier = supplierById.get(item.supplierId);
      const target = item.reorderPoint + item.safetyStock;
      const shortfall = Math.max(0, target - item.qty);
      const leadDays = supplier?.leadTimeDays ?? ASSUMED_LEAD_DAYS;
      return {
        item,
        supplier,
        shortfall,
        coverDays: supplier ? supplier.leadTimeDays : null,
        urgency: Math.max(shortfall, 1) * Math.max(leadDays, 1) * (item.qty <= 0 ? 2 : 1),
      };
    })
    .sort((a, b) => b.urgency - a.urgency || a.item.name.localeCompare(b.item.name));

  return limit ? lines.slice(0, limit) : lines;
}

/** Units moved per day over the trailing window, oldest first. Drives the sparkline. */
export function throughputSeries(movements: Movement[], days: number, endAt: number): number[] {
  const dayMs = 86_400_000;
  const buckets = new Array<number>(days).fill(0);
  const start = endAt - days * dayMs;

  for (const movement of movements) {
    const at = Date.parse(movement.at);
    if (at < start || at > endAt) continue;
    const index = Math.min(days - 1, Math.floor((at - start) / dayMs));
    buckets[index] += Math.abs(movement.qty);
  }

  return buckets;
}

/** Highest fill ratio held in each bin, for the map. */
export function binOccupancy(items: Item[]): Map<string, Item> {
  const map = new Map<string, Item>();
  for (const item of items) {
    const held = map.get(item.bin);
    if (!held || fillRatio(item) > fillRatio(held)) map.set(item.bin, item);
  }
  return map;
}
