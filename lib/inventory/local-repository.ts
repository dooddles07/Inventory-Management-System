import { createSeedSnapshot } from "./seed";
import type { AdjustRequest, InventoryRepository } from "./repository";
import type { InventorySnapshot, Item, ItemDraft, Movement } from "./types";

const STORAGE_KEY = "stockroom:snapshot:v1";

function isSnapshot(value: unknown): value is InventorySnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<InventorySnapshot>;
  return (
    Array.isArray(candidate.items) &&
    Array.isArray(candidate.suppliers) &&
    Array.isArray(candidate.movements)
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

    const updated: Item = {
      ...snapshot.items[index],
      ...patch,
      id,
      updatedAt: new Date().toISOString(),
    };
    const items = [...snapshot.items];
    items[index] = updated;
    this.write({ ...snapshot, items });
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
