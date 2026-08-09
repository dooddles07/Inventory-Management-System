import { describe, expect, it } from "vitest";
import { FILL_STEPS, buildFloor, fillStep } from "./floor";
import { AISLES, RACKS_PER_AISLE, SHELVES_PER_RACK, allBins, createSeedSnapshot } from "./seed";
import type { Item } from "./types";

describe("fillStep", () => {
  it("keeps an empty bin on its own step, so empty never looks stocked", () => {
    expect(fillStep(0)).toBe(0);
    expect(fillStep(0.0005)).toBe(0);
    expect(fillStep(0.01)).toBe(1);
  });

  it("tops out at the last step of the ramp", () => {
    expect(fillStep(1)).toBe(FILL_STEPS - 1);
    expect(fillStep(5)).toBe(FILL_STEPS - 1);
  });

  it("never goes backwards as a bin fills", () => {
    const steps = Array.from({ length: 21 }, (_, index) => fillStep(index / 20));
    const ascending = [...steps].sort((a, b) => a - b);
    expect(steps).toEqual(ascending);
  });
});

describe("buildFloor", () => {
  it("lays out the whole building whether or not anything is stored in it", () => {
    const floor = buildFloor([]);
    const cells = floor.flatMap((aisle) => aisle.racks.flatMap((rack) => rack.cells));

    expect(floor).toHaveLength(AISLES.length);
    expect(floor[0].racks).toHaveLength(RACKS_PER_AISLE);
    expect(floor[0].racks[0].cells).toHaveLength(SHELVES_PER_RACK);
    expect(cells).toHaveLength(allBins().length);
    expect(cells.every((cell) => cell.sku === null && cell.fill === 0)).toBe(true);
  });

  it("walks the bins in the same reading order the addresses imply", () => {
    const codes = buildFloor([])
      .flatMap((aisle) => aisle.racks.flatMap((rack) => rack.cells))
      .map((cell) => cell.code);

    expect(codes).toEqual(allBins());
  });

  it("carries the part's status and count onto its cell", () => {
    const item: Item = {
      id: "itm_001",
      sku: "FST-1000",
      name: "M8x40 Hex Bolt",
      category: "Fasteners",
      supplierId: "sup_01",
      uom: "box",
      qty: 0,
      reorderPoint: 20,
      safetyStock: 8,
      unitCost: 250,
      bin: "C-04-06",
      updatedAt: "2026-08-01T00:00:00.000Z",
    };

    const cell = buildFloor([item])
      .flatMap((aisle) => aisle.racks.flatMap((rack) => rack.cells))
      .find((candidate) => candidate.code === "C-04-06");

    expect(cell).toMatchObject({ sku: "FST-1000", qty: 0, status: "out", fill: 0 });
  });

  it("fills a cell for every seeded part", () => {
    const occupied = buildFloor(createSeedSnapshot().items)
      .flatMap((aisle) => aisle.racks.flatMap((rack) => rack.cells))
      .filter((cell) => cell.sku !== null);

    expect(occupied).toHaveLength(createSeedSnapshot().items.length);
  });
});
