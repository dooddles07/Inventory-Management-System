import { binOccupancy, fillRatio, statusOf } from "./derive";
import { AISLES, RACKS_PER_AISLE, SHELVES_PER_RACK } from "./seed";
import type { Item, StockStatus } from "./types";

export interface FloorCell {
  code: string;
  fill: number;
  sku: string | null;
  name: string | null;
  qty: number | null;
  status: StockStatus | null;
}

export interface FloorRack {
  rack: number;
  cells: FloorCell[];
}

export interface FloorAisle {
  aisle: string;
  racks: FloorRack[];
}

/** Five steps of the blue ramp. The palette is the legend: darker means emptier. */
export const FILL_STEPS = 5;

export function fillStep(fill: number): number {
  if (fill <= 0.001) return 0;
  return Math.min(FILL_STEPS - 1, Math.floor(fill * (FILL_STEPS - 1)) + 1);
}

/** Turns the item list into the building: aisles, racks, shelves, in reading order. */
export function buildFloor(items: Item[]): FloorAisle[] {
  const occupancy = binOccupancy(items);

  return AISLES.map((aisle) => ({
    aisle,
    racks: Array.from({ length: RACKS_PER_AISLE }, (_, rackIndex) => {
      const rack = rackIndex + 1;
      return {
        rack,
        cells: Array.from({ length: SHELVES_PER_RACK }, (_, shelfIndex) => {
          const code = `${aisle}-${String(rack).padStart(2, "0")}-${String(shelfIndex + 1).padStart(2, "0")}`;
          const item = occupancy.get(code);
          return {
            code,
            fill: item ? fillRatio(item) : 0,
            sku: item?.sku ?? null,
            name: item?.name ?? null,
            qty: item?.qty ?? null,
            status: item ? statusOf(item) : null,
          };
        }),
      };
    }),
  }));
}
