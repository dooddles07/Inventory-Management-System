import { createSeedSnapshot } from "./seed";
import type { AdjustRequest, InventoryRepository } from "./repository";
import type { InventorySnapshot, Item, ItemDraft, Movement, Supplier } from "./types";

export const STORAGE_KEY = "stockroom:snapshot:v1";

/** Wipes the stored snapshot. The escape hatch for a browser holding something unusable. */
export function clearStoredSnapshot(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing useful to do if storage refuses a delete.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isItem(value: unknown): value is Item {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.sku === "string" &&
    typeof value.name === "string" &&
    typeof value.category === "string" &&
    typeof value.supplierId === "string" &&
    typeof value.uom === "string" &&
    typeof value.bin === "string" &&
    typeof value.updatedAt === "string" &&
    Number.isFinite(value.qty) &&
    Number.isFinite(value.reorderPoint) &&
    Number.isFinite(value.safetyStock) &&
    Number.isFinite(value.unitCost)
  );
}

function isSupplier(value: unknown): value is Supplier {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.code === "string" &&
    typeof value.country === "string" &&
    typeof value.contact === "string" &&
    Number.isFinite(value.leadTimeDays)
  );
}

function isMovement(value: unknown): value is Movement {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.itemId === "string" &&
    typeof value.type === "string" &&
    typeof value.reference === "string" &&
    typeof value.at === "string" &&
    typeof value.by === "string" &&
    Number.isFinite(value.qty)
  );
}

/**
 * Checks every row, not just the three collections.
 *
 * A snapshot that is shaped right but holds junk used to sail through: the parts page
 * threw to the error boundary, which replaces the app shell and the reset button with it,
 * and the overview rendered NaN. Anything that fails here falls back to a fresh seed,
 * which is the honest outcome for a disposable demo dataset - partial recovery would only
 * mean carrying half a warehouse forward without saying so.
 */
function isSnapshot(value: unknown): value is InventorySnapshot {
  if (!isRecord(value)) return false;
  return (
    Array.isArray(value.items) &&
    Array.isArray(value.suppliers) &&
    Array.isArray(value.movements) &&
    value.items.every(isItem) &&
    value.suppliers.every(isSupplier) &&
    value.movements.every(isMovement)
  );
}

function nextId(prefix: string, existing: Array<{ id: string }>): string {
  let highest = 0;
  for (const row of existing) {
    const numeric = Number.parseInt(row.id.split("_")[1] ?? "", 10);
    if (Number.isFinite(numeric) && numeric > highest) highest = numeric;
  }
  return `${prefix}_${String(highest + 1).padStart(prefix === "itm" ? 3 : 4, "0")}`;
}

/**
 * Browser-backed store. Reads are synchronous under the hood but the interface stays
 * async so a network implementation drops in without touching a single component.
 */
export class LocalInventoryRepository implements InventoryRepository {
  private cache: InventorySnapshot | null = null;
  private persisting = true;

  private read(): InventorySnapshot {
    if (this.cache) return this.cache;

    if (typeof window === "undefined") {
      this.cache = createSeedSnapshot();
      return this.cache;
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isSnapshot(parsed)) {
          this.cache = parsed;
          return this.cache;
        }
      }
    } catch {
      // Corrupt or unavailable storage falls back to a fresh seed rather than breaking the app.
    }

    this.cache = createSeedSnapshot();
    this.write(this.cache);
    return this.cache;
  }

  private write(snapshot: InventorySnapshot): void {
    this.cache = snapshot;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      this.persisting = true;
    } catch {
      // Quota or private mode. The cache stays authoritative so the session keeps working,
      // and the flag lets the app say so instead of pretending the save landed.
      this.persisting = false;
    }
  }

  isPersisting(): boolean {
    return this.persisting;
  }

  async load(): Promise<InventorySnapshot> {
    return this.read();
  }

  async createItem(draft: ItemDraft): Promise<Item> {
    const snapshot = this.read();
    const item: Item = {
      ...draft,
      id: draft.id ?? nextId("itm", snapshot.items),
      updatedAt: new Date().toISOString(),
    };
    this.write({ ...snapshot, items: [item, ...snapshot.items] });
    return item;
  }

  async updateItem(id: string, patch: Partial<ItemDraft>): Promise<Item> {
    const snapshot = this.read();
    const index = snapshot.items.findIndex((item) => item.id === id);
    if (index === -1) throw new Error(`No item with id ${id}`);

    const current = snapshot.items[index];
    const at = new Date().toISOString();
    const updated: Item = { ...current, ...patch, id, updatedAt: at };

    const items = [...snapshot.items];
    items[index] = updated;

    // Moving a part to another bin is a movement, whoever asked for it. Logging it here
    // rather than in the form means the history cannot be bypassed by editing the field.
    const moved = updated.bin !== current.bin;
    const movements = moved
      ? [
          {
            id: nextId("mov", snapshot.movements),
            itemId: id,
            type: "transfer" as const,
            qty: 0,
            fromBin: current.bin,
            toBin: updated.bin,
            reference: "MANUAL",
            at,
            by: "you",
          } satisfies Movement,
          ...snapshot.movements,
        ]
      : snapshot.movements;

    this.write({ ...snapshot, items, movements });
    return updated;
  }

  async deleteItems(ids: string[]): Promise<void> {
    const snapshot = this.read();
    const doomed = new Set(ids);
    this.write({
      ...snapshot,
      items: snapshot.items.filter((item) => !doomed.has(item.id)),
      movements: snapshot.movements.filter((movement) => !doomed.has(movement.itemId)),
    });
  }

  async adjust(request: AdjustRequest): Promise<{ item: Item; movement: Movement }> {
    const snapshot = this.read();
    const index = snapshot.items.findIndex((item) => item.id === request.itemId);
    if (index === -1) throw new Error(`No item with id ${request.itemId}`);

    const current = snapshot.items[index];
    const at = new Date().toISOString();
    const isTransfer = request.type === "transfer";

    // Stock cannot go below zero, and the movement has to record what was actually applied.
    // Logging the requested amount instead would leave the history unable to reconcile.
    const delta = isTransfer ? 0 : Math.max(request.qty, -current.qty);

    const item: Item = {
      ...current,
      qty: current.qty + delta,
      bin: isTransfer && request.toBin ? request.toBin : current.bin,
      updatedAt: at,
    };

    const movement: Movement = {
      id: nextId("mov", snapshot.movements),
      itemId: item.id,
      type: request.type,
      qty: delta,
      fromBin: isTransfer ? current.bin : undefined,
      toBin: isTransfer ? item.bin : undefined,
      reference: request.reference?.trim() || "MANUAL",
      at,
      by: request.by ?? "you",
    };

    const items = [...snapshot.items];
    items[index] = item;
    this.write({ ...snapshot, items, movements: [movement, ...snapshot.movements] });
    return { item, movement };
  }

  async reset(): Promise<InventorySnapshot> {
    const snapshot = createSeedSnapshot();
    this.write(snapshot);
    return snapshot;
  }
}
