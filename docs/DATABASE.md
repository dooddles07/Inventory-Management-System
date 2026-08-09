# Data model

**There is no database.** The whole dataset lives in one `localStorage` key in the
visitor's browser, behind the `InventoryRepository` interface. This document describes
the model that is actually stored, the rules it holds itself to, and the schema a real
database would need if the repository were ever swapped for a network one.

Types are in [`lib/inventory/types.ts`](../lib/inventory/types.ts).

## Storage

| | |
|---|---|
| Key | `stockroom:snapshot:v1` |
| Format | One JSON object, `{ items, suppliers, movements }` |
| Written | On every mutation, whole-snapshot |
| Read | Once per session into an in-memory cache |

The `v1` suffix is the migration hatch. A future shape becomes `v2` and the reader falls
back to a fresh seed rather than trying to upgrade a demo dataset.

Anything unreadable - absent, unparseable, the wrong shape, or holding a row that fails
validation - falls back to a fresh seed instead of failing. `isSnapshot()` checks every
row, not just that the three collections are arrays.

That is stricter than it first was, and for a reason. A snapshot shaped right but holding
junk used to sail through: the parts page threw to the error boundary, which replaces the
app shell and the reset button with it, and the overview rendered `NaN` on screen. Falling
back wholesale rather than dropping bad rows is deliberate - partial recovery would carry
half a warehouse forward without saying so, and this dataset is disposable by design.

## Entities

### Item

A part. One row per SKU.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | `itm_001`, zero-padded to 3 |
| `sku` | `string` | Unique, uppercase, `FST-1042` |
| `name` | `string` | `M8x40 Hex Bolt, Zinc` |
| `category` | `string` | One of eight, see below |
| `supplierId` | `string` | References `Supplier.id` |
| `uom` | `UnitOfMeasure` | `ea` `box` `case` `coil` `kg` `m` `pallet` |
| `qty` | `number` | On hand. Never negative |
| `reorderPoint` | `number` | At or below this, the part is low |
| `safetyStock` | `number` | Buffer above the reorder point, used to size an order |
| `unitCost` | `number` | **Minor units (cents)**, so arithmetic never drifts |
| `bin` | `string` | `C-04-12`, matches `/^[A-F]-\d{2}-\d{2}$/` |
| `updatedAt` | `string` | ISO 8601 |

### Supplier

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | `sup_01`, zero-padded to 2 |
| `name` | `string` | |
| `code` | `string` | Three letters, `HLD` |
| `leadTimeDays` | `number` | What turns a shortage into a date |
| `country` | `string` | ISO 3166-1 alpha-2 |
| `contact` | `string` | An `.example` address; no real contact data |

### Movement

Append-only log. One row per stock event.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | `mov_0001`, zero-padded to 4 |
| `itemId` | `string` | References `Item.id` |
| `type` | `MovementType` | `receipt` `issue` `transfer` `adjustment` `count` |
| `qty` | `number` | **Signed**: receipts positive, issues negative, transfers 0 |
| `fromBin` | `string?` | Transfers and issues |
| `toBin` | `string?` | Transfers and receipts |
| `reference` | `string` | `GRN-40218`, `PICK-70155`, or `MANUAL` |
| `at` | `string` | ISO 8601 |
| `by` | `string` | Operator name, or `cycle-count` |

## Relationships

```
Supplier 1 ──< Item 1 ──< Movement
```

Both are by id, resolved with a `Map` at the point of use. There are no joins because
there is no query engine; the whole dataset is a few hundred rows in memory.

## Rules the data holds itself to

1. **`qty` never goes below zero.** `adjust` clamps it.
2. **A movement records what was applied, not what was asked for.** Picking 50 from a bin
   holding 30 sets the count to 0 and logs `-30`. Logging `-50` would leave the history
   unable to reconcile against the count.
3. **Money is integer minor units everywhere.** Division happens once, at the formatter.
4. **SKUs are unique**, case-insensitively, enforced on save.
5. **Bins are addresses**, validated against the pattern before a part can be saved.
6. **Deleting a part deletes its movements.** No orphan rows, because nothing here does
   soft deletes.
7. **Ids never collide.** `nextId` reads the highest existing numeric suffix and adds one.
8. **A bin change is always a movement.** `updateItem` logs a `transfer` when the bin
   differs, so the history cannot be bypassed by editing the field on the form. The
   quantity on that movement is 0: a move is not stock arriving or leaving.

## The seed

Deterministic: a `mulberry32` PRNG on a fixed seed, and a fixed timestamp anchor
(`SNAPSHOT_AT`) rather than `Date.now()`. The same snapshot renders on the server and in
the browser, so nothing hydrates twice.

| | |
|---|---|
| Items | 184 |
| Bins | 288 (6 aisles x 8 racks x 6 shelves) |
| Suppliers | 12, lead times 3 to 24 days |
| Movements | 420, spread over 84 days |
| Categories | Fasteners, Electrical, Packaging, Safety, Tooling, Adhesives, Filtration, Bearings |

Stock health is generated to roughly 8% out of stock and 17% below reorder point, so the
restocking list has something in it on first open. Bins are shuffled before assignment, so
stock is scattered through the building rather than packed into aisle A - every part gets
its own bin, which is why 184 parts occupy 184 of the 288.

## If this needed a real database

The repository interface is the seam. A Postgres schema behind it:

```sql
create table supplier (
  id              text primary key,
  name            text not null,
  code            text not null unique,
  lead_time_days  integer not null check (lead_time_days >= 0),
  country         char(2) not null,
  contact         text not null
);

create table item (
  id             text primary key,
  sku            text not null unique,
  name           text not null,
  category       text not null,
  supplier_id    text not null references supplier(id),
  uom            text not null,
  qty            integer not null check (qty >= 0),
  reorder_point  integer not null check (reorder_point >= 0),
  safety_stock   integer not null check (safety_stock >= 0),
  unit_cost      integer not null check (unit_cost >= 0),  -- minor units
  bin            text not null check (bin ~ '^[A-F]-\d{2}-\d{2}$'),
  updated_at     timestamptz not null default now()
);

create table movement (
  id         bigserial primary key,
  item_id    text not null references item(id) on delete cascade,
  type       text not null check (type in ('receipt','issue','transfer','adjustment','count')),
  qty        integer not null,
  from_bin   text,
  to_bin     text,
  reference  text not null,
  at         timestamptz not null default now(),
  by_whom    text not null
);

create index on item (supplier_id);
create index on item (category);
create index on movement (item_id, at desc);
```

Three things move from application code into the database: `qty >= 0` becomes a check
constraint, the bin pattern becomes one too, and `on delete cascade` replaces the manual
movement cleanup in `deleteItems`.

Two things do not move. Stock status and reorder urgency stay derived rather than stored -
they are a function of columns that already exist, and storing them would create a second
truth to keep in sync.
