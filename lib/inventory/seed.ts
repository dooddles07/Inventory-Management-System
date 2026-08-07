import type { InventorySnapshot, Item, Movement, MovementType, Supplier, UnitOfMeasure } from "./types";

/*
  Deterministic seed. The same snapshot renders on the server and on the client,
  so nothing hydrates twice and the marketing page can share the app's data.
*/

const SEED = 0x5700c4;

function mulberry32(a: number) {
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fixed anchor for every generated timestamp - never Date.now(). */
export const SNAPSHOT_AT = Date.parse("2026-08-07T08:00:00.000Z");

export const AISLES = ["A", "B", "C", "D", "E", "F"] as const;
export const RACKS_PER_AISLE = 8;
export const SHELVES_PER_RACK = 6;

interface CategorySpec {
  name: string;
  prefix: string;
  uom: UnitOfMeasure;
  costRange: [number, number];
  parts: string[];
  variants: string[];
}

const CATEGORIES: CategorySpec[] = [
  {
    name: "Fasteners",
    prefix: "FST",
    uom: "box",
    costRange: [180, 4200],
    parts: [
      "Hex Bolt",
      "Socket Cap Screw",
      "Hex Nut",
      "Flat Washer",
      "Spring Washer",
      "Threaded Rod",
      "Clevis Pin",
      "Shoulder Bolt",
    ],
    variants: ["M4x12", "M5x16", "M6x20", "M8x30", "M8x40", "M10x50", "M12x60"],
  },
  {
    name: "Electrical",
    prefix: "ELC",
    uom: "coil",
    costRange: [420, 18500],
    parts: [
      "Tinned Copper Wire",
      "Ring Terminal",
      "Butt Splice",
      "Cable Gland",
      "DIN Rail Terminal",
      "Heat Shrink Sleeve",
      "Bootlace Ferrule",
    ],
    variants: ["22AWG", "18AWG", "16AWG", "14AWG", "12AWG", "10AWG"],
  },
  {
    name: "Packaging",
    prefix: "PKG",
    uom: "case",
    costRange: [260, 9600],
    parts: [
      "Corrugated Carton",
      "Stretch Wrap",
      "Void Fill",
      "Strapping Coil",
      "Pallet Sheet",
      "Carton Tape",
      "Bubble Roll",
    ],
    variants: ["300x200", "400x300", "500mm", "750mm", "1200x1000"],
  },
  {
    name: "Safety",
    prefix: "SAF",
    uom: "box",
    costRange: [340, 12800],
    parts: [
      "Nitrile Glove",
      "Cut-Resistant Glove",
      "Safety Glasses",
      "Ear Defender",
      "Hi-Vis Vest",
      "Hard Hat",
      "Respirator Cartridge",
    ],
    variants: ["S", "M", "L", "XL", "XXL"],
  },
  {
    name: "Tooling",
    prefix: "TLG",
    uom: "ea",
    costRange: [1250, 46000],
    parts: [
      "Carbide End Mill",
      "HSS Drill Bit",
      "Machine Tap",
      "Insert Holder",
      "Deburring Blade",
      "Chucking Reamer",
    ],
    variants: ["3mm", "4mm", "6mm", "8mm", "10mm", "12mm"],
  },
  {
    name: "Adhesives",
    prefix: "ADH",
    uom: "ea",
    costRange: [560, 8400],
    parts: [
      "Threadlocker",
      "Cyanoacrylate",
      "Epoxy Cartridge",
      "Silicone Sealant",
      "Anti-Seize Compound",
    ],
    variants: ["10ml", "50ml", "250ml", "310ml"],
  },
  {
    name: "Filtration",
    prefix: "FIL",
    uom: "ea",
    costRange: [1900, 32000],
    parts: [
      "Hydraulic Filter",
      "Air Filter Cartridge",
      "Inline Strainer",
      "Coalescing Element",
    ],
    variants: ["10um", "25um", "40um", "100um"],
  },
  {
    name: "Bearings",
    prefix: "BRG",
    uom: "ea",
    costRange: [820, 54000],
    parts: [
      "Deep Groove Bearing",
      "Tapered Roller Bearing",
      "Linear Bushing",
      "Thrust Washer",
      "Rod End",
    ],
    variants: ["6002", "6203", "6205", "6305", "LM12", "LM20"],
  },
];

const FINISHES = ["Zinc", "A2 Stainless", "A4 Stainless", "Black Oxide", "Galvanised", "Plain"];

const SUPPLIER_SEED: Array<Omit<Supplier, "id">> = [
  { name: "Halden Industrial", code: "HLD", leadTimeDays: 4, country: "GB", contact: "orders@halden.example" },
  { name: "Verkade Componenten", code: "VKD", leadTimeDays: 9, country: "NL", contact: "sales@verkade.example" },
  { name: "Tan Seng Hardware", code: "TSH", leadTimeDays: 21, country: "SG", contact: "export@tanseng.example" },
  { name: "Nordbolt AS", code: "NRB", leadTimeDays: 6, country: "NO", contact: "post@nordbolt.example" },
  { name: "Cerrado Suministros", code: "CRD", leadTimeDays: 12, country: "ES", contact: "pedidos@cerrado.example" },
  { name: "Fairmount Supply Co", code: "FMT", leadTimeDays: 3, country: "US", contact: "desk@fairmount.example" },
  { name: "Okonkwo Trading", code: "OKW", leadTimeDays: 16, country: "NG", contact: "trade@okonkwo.example" },
  { name: "Ridgeline Abrasives", code: "RDG", leadTimeDays: 7, country: "CA", contact: "hello@ridgeline.example" },
  { name: "Kastellan Werke", code: "KST", leadTimeDays: 11, country: "DE", contact: "vertrieb@kastellan.example" },
  { name: "Aoyama Seiki", code: "AYS", leadTimeDays: 24, country: "JP", contact: "kaigai@aoyama.example" },
  { name: "Brightwater Packaging", code: "BRW", leadTimeDays: 5, country: "IE", contact: "orders@brightwater.example" },
  { name: "Meridian Safety Group", code: "MRD", leadTimeDays: 8, country: "AU", contact: "supply@meridian.example" },
];

const OPERATORS = [
  "R. Okafor",
  "M. Lindqvist",
  "J. Alvarez",
  "P. Nakamura",
  "S. Whitfield",
  "D. Boateng",
  "K. Mihailova",
  "cycle-count",
];

const MOVEMENT_MIX: Array<{ type: MovementType; weight: number }> = [
  { type: "issue", weight: 46 },
  { type: "receipt", weight: 26 },
  { type: "transfer", weight: 12 },
  { type: "adjustment", weight: 9 },
  { type: "count", weight: 7 },
];

export const ITEM_COUNT = 184;
const MOVEMENT_COUNT = 420;

function pick<T>(rand: () => number, list: readonly T[]): T {
  return list[Math.floor(rand() * list.length)];
}

function intBetween(rand: () => number, min: number, max: number) {
  return min + Math.floor(rand() * (max - min + 1));
}

/** Every bin in the building, in reading order. */
export function allBins(): string[] {
  const bins: string[] = [];
  for (const aisle of AISLES) {
    for (let rack = 1; rack <= RACKS_PER_AISLE; rack += 1) {
      for (let shelf = 1; shelf <= SHELVES_PER_RACK; shelf += 1) {
        bins.push(`${aisle}-${String(rack).padStart(2, "0")}-${String(shelf).padStart(2, "0")}`);
      }
    }
  }
  return bins;
}

function buildSuppliers(): Supplier[] {
  return SUPPLIER_SEED.map((supplier, index) => ({
    ...supplier,
    id: `sup_${String(index + 1).padStart(2, "0")}`,
  }));
}

function buildItems(rand: () => number, suppliers: Supplier[]): Item[] {
  const bins = allBins();
  // Shuffle bins so stock is scattered through the building, not packed into aisle A.
  for (let i = bins.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [bins[i], bins[j]] = [bins[j], bins[i]];
  }

  const items: Item[] = [];
  const usedSkus = new Set<string>();

  for (let i = 0; i < ITEM_COUNT; i += 1) {
    const category = CATEGORIES[i % CATEGORIES.length];
    const part = pick(rand, category.parts);
    const variant = pick(rand, category.variants);
    const needsFinish = category.name === "Fasteners" || category.name === "Bearings";
    const finish = needsFinish ? pick(rand, FINISHES) : null;

    let sku = "";
    do {
      sku = `${category.prefix}-${intBetween(rand, 1000, 9999)}`;
    } while (usedSkus.has(sku));
    usedSkus.add(sku);

    const reorderPoint = intBetween(rand, 12, 90);
    const safetyStock = Math.max(4, Math.round(reorderPoint * 0.35));

    // Roughly 8% out of stock, 17% below reorder point, the rest healthy.
    const roll = rand();
    let qty: number;
    if (roll < 0.08) qty = 0;
    else if (roll < 0.25) qty = intBetween(rand, 1, reorderPoint);
    else qty = intBetween(rand, reorderPoint + 1, reorderPoint * 6);

    items.push({
      id: `itm_${String(i + 1).padStart(3, "0")}`,
      sku,
      name: [variant, part, finish].filter(Boolean).join(" "),
      category: category.name,
      supplierId: pick(rand, suppliers).id,
      uom: category.uom,
      qty,
      reorderPoint,
      safetyStock,
      unitCost: intBetween(rand, category.costRange[0], category.costRange[1]),
      bin: bins[i],
      updatedAt: new Date(SNAPSHOT_AT - intBetween(rand, 0, 60 * 24 * 26) * 60_000).toISOString(),
    });
  }

  return items;
}

function weightedMovementType(rand: () => number): MovementType {
  const total = MOVEMENT_MIX.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rand() * total;
  for (const entry of MOVEMENT_MIX) {
    roll -= entry.weight;
    if (roll <= 0) return entry.type;
  }
  return "issue";
}

function buildMovements(rand: () => number, items: Item[]): Movement[] {
  const bins = allBins();
  const movements: Movement[] = [];

  for (let i = 0; i < MOVEMENT_COUNT; i += 1) {
    const item = pick(rand, items);
    const type = weightedMovementType(rand);
    const minutesAgo = intBetween(rand, 5, 60 * 24 * 84);

    let qty = 0;
    let reference = "";
    let fromBin: string | undefined;
    let toBin: string | undefined;

    switch (type) {
      case "receipt":
        qty = intBetween(rand, 20, 400);
        reference = `GRN-${intBetween(rand, 40000, 49999)}`;
        toBin = item.bin;
        break;
      case "issue":
        qty = -intBetween(rand, 1, 60);
        reference = `PICK-${intBetween(rand, 70000, 79999)}`;
        fromBin = item.bin;
        break;
      case "transfer":
        qty = 0;
        reference = `TRF-${intBetween(rand, 3000, 3999)}`;
        fromBin = pick(rand, bins);
        toBin = item.bin;
        break;
      case "adjustment":
        qty = rand() < 0.5 ? -intBetween(rand, 1, 12) : intBetween(rand, 1, 12);
        reference = `ADJ-${intBetween(rand, 800, 999)}`;
        break;
      case "count":
        qty = rand() < 0.7 ? 0 : -intBetween(rand, 1, 6);
        reference = `CC-${intBetween(rand, 200, 299)}`;
        break;
    }

    movements.push({
      id: `mov_${String(i + 1).padStart(4, "0")}`,
      itemId: item.id,
      type,
      qty,
      fromBin,
      toBin,
      reference,
      at: new Date(SNAPSHOT_AT - minutesAgo * 60_000).toISOString(),
      by: type === "count" ? "cycle-count" : pick(rand, OPERATORS.slice(0, -1)),
    });
  }

  return movements.sort((a, b) => b.at.localeCompare(a.at));
}

export function createSeedSnapshot(): InventorySnapshot {
  const rand = mulberry32(SEED);
  const suppliers = buildSuppliers();
  const items = buildItems(rand, suppliers);
  const movements = buildMovements(rand, items);
  return { items, suppliers, movements };
}

export const CATEGORY_NAMES = CATEGORIES.map((category) => category.name);
