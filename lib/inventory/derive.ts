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
  binsUsed: number;
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

  return {
    skus: items.length,
    unitsOnHand,
    stockValue,
    low,
    out,
    binsUsed: new Set(items.map((item) => item.bin)).size,
  };
}

export interface ReorderLine {
  item: Item;
  supplier?: Supplier;
  shortfall: number;
  coverDays: number | null;
}

/**
 * Everything at or below its reorder point, worst first.
 * Out of stock outranks low, then larger shortfall, then longer supplier lead time.
 */
export function reorderQueue(items: Item[], suppliers: Supplier[], limit?: number): ReorderLine[] {
  const supplierById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));

  const lines = items
    .filter((item) => statusOf(item) !== "ok")
    .map((item) => {
      const supplier = supplierById.get(item.supplierId);
      const target = item.reorderPoint + item.safetyStock;
      return {
        item,
        supplier,
        shortfall: Math.max(0, target - item.qty),
        coverDays: supplier ? supplier.leadTimeDays : null,
      };
    })
    .sort((a, b) => {
      const aOut = a.item.qty <= 0 ? 1 : 0;
      const bOut = b.item.qty <= 0 ? 1 : 0;
      if (aOut !== bOut) return bOut - aOut;
      if (b.shortfall !== a.shortfall) return b.shortfall - a.shortfall;
      return (b.coverDays ?? 0) - (a.coverDays ?? 0);
    });

  return limit ? lines.slice(0, limit) : lines;
}

export interface CategoryRollup {
  category: string;
  skus: number;
  units: number;
  value: number;
  low: number;
}

export function byCategory(items: Item[]): CategoryRollup[] {
  const map = new Map<string, CategoryRollup>();

  for (const item of items) {
    const row = map.get(item.category) ?? {
      category: item.category,
      skus: 0,
      units: 0,
      value: 0,
      low: 0,
    };
    row.skus += 1;
    row.units += item.qty;
    row.value += lineValue(item);
    if (statusOf(item) !== "ok") row.low += 1;
    map.set(item.category, row);
  }

  return [...map.values()].sort((a, b) => b.value - a.value);
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
