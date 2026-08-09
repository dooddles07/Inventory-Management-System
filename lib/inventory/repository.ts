import type { InventorySnapshot, Item, ItemDraft, Movement, MovementType } from "./types";

export interface AdjustRequest {
  itemId: string;
  type: MovementType;
  qty: number;
  reference?: string;
  toBin?: string;
  by?: string;
}

/**
 * The whole app reads and writes through this. Swapping localStorage for a real
 * API later means adding one implementation and changing one line in the provider.
 */
export interface InventoryRepository {
  load(): Promise<InventorySnapshot>;
  createItem(draft: ItemDraft): Promise<Item>;
  /** The id is the first argument; a patch cannot carry one that would be ignored. */
  updateItem(id: string, patch: Partial<Omit<ItemDraft, "id">>): Promise<Item>;
  deleteItems(ids: string[]): Promise<void>;
  adjust(request: AdjustRequest): Promise<{ item: Item; movement: Movement }>;
  reset(): Promise<InventorySnapshot>;
  /** False once a write has failed to reach durable storage and is only held in memory. */
  isPersisting(): boolean;
}
