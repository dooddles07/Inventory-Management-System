import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalInventoryRepository } from "./local-repository";
import type { ItemDraft } from "./types";

/** Enough of the Storage contract for the repository, with a switch for making writes fail. */
class FakeStorage {
  private map = new Map<string, string>();
  failWrites = false;

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failWrites) {
      const error = new Error("quota");
      error.name = "QuotaExceededError";
      throw error;
    }
    this.map.set(key, value);
  }

  seedRaw(key: string, value: string): void {
    this.map.set(key, value);
  }
}

let storage: FakeStorage;

beforeEach(() => {
  storage = new FakeStorage();
  // The repository reaches for the global window, so the test supplies one.
  Object.defineProperty(globalThis, "window", {
    value: { localStorage: storage },
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, "window");
});

function draft(patch: Partial<ItemDraft> = {}): ItemDraft {
  return {
    sku: "TST-0001",
    name: "Test Part",
    category: "Fasteners",
    supplierId: "sup_01",
    uom: "ea",
    qty: 10,
    reorderPoint: 5,
    safetyStock: 2,
    unitCost: 100,
    bin: "A-01-01",
    ...patch,
  };
}

describe("loading", () => {
  it("seeds itself on a first visit and writes that seed back", async () => {
    const repository = new LocalInventoryRepository();
    const snapshot = await repository.load();

    expect(snapshot.items.length).toBeGreaterThan(0);
    expect(storage.getItem("stockroom:snapshot:v1")).not.toBeNull();
  });

  it("falls back to a fresh seed when the stored value is corrupt", async () => {
    storage.seedRaw("stockroom:snapshot:v1", "{ not json");
    const snapshot = await new LocalInventoryRepository().load();
    expect(snapshot.items.length).toBeGreaterThan(0);
  });

  it("falls back when the stored value parses but is the wrong shape", async () => {
    storage.seedRaw("stockroom:snapshot:v1", JSON.stringify({ items: "nope" }));
    const snapshot = await new LocalInventoryRepository().load();
    expect(Array.isArray(snapshot.items)).toBe(true);
    expect(snapshot.items.length).toBeGreaterThan(0);
  });

  // Shaped right, junk inside. This used to reach the screens: the parts page threw to the
  // error boundary and the overview rendered NaN.
  const JUNK: Array<[string, unknown]> = [
    ["an item missing its numbers", { items: [{ id: "i", sku: "X", name: "n", bin: "A-01-01" }], suppliers: [], movements: [] }],
    ["an item with a string quantity", { items: [{ id: "i", sku: "X", name: "n", category: "c", supplierId: "s", uom: "ea", bin: "A-01-01", updatedAt: "t", qty: "40", reorderPoint: 1, safetyStock: 1, unitCost: 1 }], suppliers: [], movements: [] }],
    ["a cost that is not a number", { items: [{ id: "i", sku: "X", name: "n", category: "c", supplierId: "s", uom: "ea", bin: "A-01-01", updatedAt: "t", qty: 1, reorderPoint: 1, safetyStock: 1, unitCost: Number.NaN }], suppliers: [], movements: [] }],
    ["null rows", { items: [null], suppliers: [null], movements: [null] }],
    ["a supplier with no lead time", { items: [], suppliers: [{ id: "s", name: "n", code: "c", country: "GB", contact: "x" }], movements: [] }],
    ["a movement with no quantity", { items: [], suppliers: [], movements: [{ id: "m", itemId: "i", type: "receipt", reference: "r", at: "t", by: "you" }] }],
  ];

  for (const [label, stored] of JUNK) {
    it(`reseeds rather than serving ${label}`, async () => {
      storage.seedRaw("stockroom:snapshot:v1", JSON.stringify(stored));
      const snapshot = await new LocalInventoryRepository().load();

      expect(snapshot.items.length).toBeGreaterThan(1);
      expect(snapshot.items.every((item) => Number.isFinite(item.qty))).toBe(true);
      expect(snapshot.items.every((item) => Number.isFinite(item.unitCost))).toBe(true);
    });
  }

  it("keeps a snapshot that is genuinely valid", async () => {
    const first = new LocalInventoryRepository();
    const seeded = await first.load();
    const created = await first.createItem(draft({ sku: "KEEP-ME" }));

    // A second repository reads what the first wrote, rather than starting over.
    const second = await new LocalInventoryRepository().load();
    expect(second.items.some((item) => item.id === created.id)).toBe(true);
    expect(second.items.length).toBe(seeded.items.length + 1);
  });
});

describe("createItem", () => {
  it("puts the new part at the top and gives it an id and a timestamp", async () => {
    const repository = new LocalInventoryRepository();
    const created = await repository.createItem(draft());
    const snapshot = await repository.load();

    expect(created.id).toMatch(/^itm_\d{3}$/);
    expect(created.updatedAt).toBeTruthy();
    expect(snapshot.items[0].id).toBe(created.id);
  });

  it("does not reuse an existing id", async () => {
    const repository = new LocalInventoryRepository();
    const first = await repository.createItem(draft({ sku: "TST-0001" }));
    const second = await repository.createItem(draft({ sku: "TST-0002" }));
    expect(second.id).not.toBe(first.id);
  });
});

describe("updateItem", () => {
  it("merges the patch and refuses an unknown id", async () => {
    const repository = new LocalInventoryRepository();
    const created = await repository.createItem(draft());

    const updated = await repository.updateItem(created.id, { name: "Renamed" });
    expect(updated.name).toBe("Renamed");
    expect(updated.sku).toBe(created.sku);

    await expect(repository.updateItem("itm_missing", { name: "x" })).rejects.toThrow(
      /No item with id/,
    );
  });

  it("logs a move when the bin changes, so history cannot be bypassed by the form", async () => {
    const repository = new LocalInventoryRepository();
    const created = await repository.createItem(draft({ bin: "A-01-01" }));

    await repository.updateItem(created.id, { bin: "F-08-06" });
    const snapshot = await repository.load();

    const moves = snapshot.movements.filter(
      (movement) => movement.itemId === created.id && movement.type === "transfer",
    );

    expect(moves).toHaveLength(1);
    expect(moves[0]).toMatchObject({
      qty: 0,
      fromBin: "A-01-01",
      toBin: "F-08-06",
    });
  });

  it("logs nothing when an edit leaves the bin alone", async () => {
    const repository = new LocalInventoryRepository();
    const created = await repository.createItem(draft({ bin: "A-01-01" }));
    const before = (await repository.load()).movements.length;

    await repository.updateItem(created.id, { name: "Renamed", unitCost: 999 });

    expect((await repository.load()).movements).toHaveLength(before);
  });

  it("counts a move as a move, not as stock arriving or leaving", async () => {
    const repository = new LocalInventoryRepository();
    const created = await repository.createItem(draft({ qty: 42, bin: "B-02-02" }));

    const updated = await repository.updateItem(created.id, { bin: "C-03-03" });

    expect(updated.qty).toBe(42);
  });
});

describe("adjust", () => {
  it("records what was applied, not what was asked for, when stock runs out", async () => {
    const repository = new LocalInventoryRepository();
    const created = await repository.createItem(draft({ qty: 30 }));

    const { item, movement } = await repository.adjust({
      itemId: created.id,
      type: "issue",
      qty: -50,
    });

    expect(item.qty).toBe(0);
    expect(movement.qty).toBe(-30);
  });

  it("adds a receipt to the count", async () => {
    const repository = new LocalInventoryRepository();
    const created = await repository.createItem(draft({ qty: 30 }));

    const { item, movement } = await repository.adjust({
      itemId: created.id,
      type: "receipt",
      qty: 25,
      reference: "GRN-40218",
    });

    expect(item.qty).toBe(55);
    expect(movement.qty).toBe(25);
    expect(movement.reference).toBe("GRN-40218");
  });

  it("moves the bin without touching the count on a transfer", async () => {
    const repository = new LocalInventoryRepository();
    const created = await repository.createItem(draft({ qty: 30, bin: "A-01-01" }));

    const { item, movement } = await repository.adjust({
      itemId: created.id,
      type: "transfer",
      qty: -999,
      toBin: "C-04-12",
    });

    expect(item.qty).toBe(30);
    expect(item.bin).toBe("C-04-12");
    expect(movement.qty).toBe(0);
    expect(movement.fromBin).toBe("A-01-01");
    expect(movement.toBin).toBe("C-04-12");
  });

  it("labels an unreferenced movement rather than leaving it blank", async () => {
    const repository = new LocalInventoryRepository();
    const created = await repository.createItem(draft());
    const { movement } = await repository.adjust({
      itemId: created.id,
      type: "adjustment",
      qty: 1,
      reference: "   ",
    });

    expect(movement.reference).toBe("MANUAL");
  });
});

describe("deleteItems", () => {
  it("takes the part's movements with it", async () => {
    const repository = new LocalInventoryRepository();
    const created = await repository.createItem(draft());
    await repository.adjust({ itemId: created.id, type: "receipt", qty: 5 });

    await repository.deleteItems([created.id]);
    const snapshot = await repository.load();

    expect(snapshot.items.some((item) => item.id === created.id)).toBe(false);
    expect(snapshot.movements.some((movement) => movement.itemId === created.id)).toBe(false);
  });
});

describe("reset", () => {
  it("throws away local edits and returns the seed", async () => {
    const repository = new LocalInventoryRepository();
    const created = await repository.createItem(draft({ sku: "ONLY-MINE" }));

    const snapshot = await repository.reset();
    expect(snapshot.items.some((item) => item.id === created.id)).toBe(false);
  });
});

describe("isPersisting", () => {
  it("starts true and turns false once a write cannot reach storage", async () => {
    const repository = new LocalInventoryRepository();
    await repository.load();
    expect(repository.isPersisting()).toBe(true);

    storage.failWrites = true;
    await repository.createItem(draft());

    expect(repository.isPersisting()).toBe(false);
  });

  it("keeps serving the change from memory after a failed write", async () => {
    const repository = new LocalInventoryRepository();
    await repository.load();
    storage.failWrites = true;

    const created = await repository.createItem(draft({ sku: "IN-MEMORY" }));
    const snapshot = await repository.load();

    expect(snapshot.items.some((item) => item.id === created.id)).toBe(true);
  });

  it("recovers once storage accepts writes again", async () => {
    const repository = new LocalInventoryRepository();
    await repository.load();
    storage.failWrites = true;
    await repository.createItem(draft({ sku: "FAILS" }));

    storage.failWrites = false;
    await repository.createItem(draft({ sku: "WORKS" }));

    expect(repository.isPersisting()).toBe(true);
  });
});
