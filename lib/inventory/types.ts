export type UnitOfMeasure = "ea" | "box" | "case" | "coil" | "kg" | "m" | "pallet";

export type MovementType = "receipt" | "issue" | "adjustment" | "transfer" | "count";

export type StockStatus = "ok" | "low" | "out";

/** Bin addresses are aisle-rack-shelf, e.g. "C-04-12". They encode a real location. */
export interface Bin {
  code: string;
  aisle: string;
  rack: number;
  shelf: number;
}

export interface Supplier {
  id: string;
  name: string;
  code: string;
  leadTimeDays: number;
  country: string;
  contact: string;
}

export interface Item {
  id: string;
  sku: string;
  name: string;
  category: string;
  supplierId: string;
  uom: UnitOfMeasure;
  qty: number;
  reorderPoint: number;
  safetyStock: number;
  /** Stored in minor units (cents) so arithmetic never drifts. */
  unitCost: number;
  bin: string;
  updatedAt: string;
}

export interface Movement {
  id: string;
  itemId: string;
  type: MovementType;
  /** Signed against stock on hand: receipts positive, issues negative. */
  qty: number;
  fromBin?: string;
  toBin?: string;
  reference: string;
  at: string;
  by: string;
}

export interface InventorySnapshot {
  items: Item[];
  suppliers: Supplier[];
  movements: Movement[];
}

export type ItemDraft = Omit<Item, "id" | "updatedAt"> & { id?: string };
