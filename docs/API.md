# API

**There is no HTTP API.** Every route prerenders static and the only data store is the
visitor's own browser. What this document describes is the internal contract every screen
goes through - `InventoryRepository` - which is the interface any future HTTP layer would
have to satisfy, plus the route surface the site actually serves.

Source: [`lib/inventory/repository.ts`](../lib/inventory/repository.ts).

## InventoryRepository

The whole app reads and writes through this. `LocalInventoryRepository` is the only
implementation; swapping it means changing one line in `InventoryProvider`.

Every method is async even though localStorage is synchronous, precisely so that swap does
not ripple into a single component.

```ts
interface InventoryRepository {
  load(): Promise<InventorySnapshot>;
  createItem(draft: ItemDraft): Promise<Item>;
  updateItem(id: string, patch: Partial<ItemDraft>): Promise<Item>;
  deleteItems(ids: string[]): Promise<void>;
  adjust(request: AdjustRequest): Promise<{ item: Item; movement: Movement }>;
  reset(): Promise<InventorySnapshot>;
  isPersisting(): boolean;
}
```

### `load()`

Returns the whole snapshot. Seeds on first call and writes that seed back. Anything
unreadable falls back to a fresh seed rather than throwing.

### `createItem(draft)`

`ItemDraft` is `Item` without `id` and `updatedAt`; an `id` may be supplied to force one.
Assigns the next id, stamps `updatedAt`, puts the part at the head of the list.

Does **not** log a movement. An opening quantity is a starting balance, not a receipt.

### `updateItem(id, patch)`

Shallow merge, restamps `updatedAt`. Throws `No item with id {id}` if it is gone.

Does not change `qty` in practice - the drawer's edit form does not submit it. Quantity
moves through `adjust`, so every change has a movement behind it.

### `deleteItems(ids)`

Removes the parts and their movements together. Unknown ids are ignored rather than
throwing, so a bulk delete is not defeated by one stale row.

### `adjust(request)`

The only path that changes stock.

```ts
interface AdjustRequest {
  itemId: string;
  type: MovementType;      // receipt | issue | adjustment | transfer | count
  qty: number;             // signed: positive receives, negative issues
  reference?: string;      // trimmed; empty becomes "MANUAL"
  toBin?: string;          // transfers only
  by?: string;             // defaults to "you"
}
```

Two rules matter here:

- **Stock is clamped at zero.** `delta = max(qty, -onHand)`.
- **The movement records the delta, not the request.** Picking 50 from a bin holding 30
  writes `qty: -30`. This is the difference between a log that reconciles and one that
  does not.

Transfers are a special case: `qty` is forced to 0, `bin` moves to `toBin`, and the
movement carries both `fromBin` and `toBin`.

Throws `No item with id {itemId}`.

### `reset()`

Rebuilds from the seed and returns it. Discards everything the visitor changed.

### `isPersisting()`

`false` once a write has failed to reach durable storage - a full quota, private browsing.
The session keeps working from the in-memory cache, and the provider turns this into a
banner saying the tab is now the only copy.

Without it the app would close the drawer on a failed save and look like it worked. This
is the one method that is not CRUD, and it earns its place.

## Provider surface

What screens actually call, from `useInventory()`:

| | |
|---|---|
| `snapshot` | `{ items, suppliers, movements }` |
| `ready` | False until the first load resolves; screens show skeletons |
| `error` | A message, or null. Rendered by `ErrorBanner` |
| `createItem` `updateItem` `deleteItems` `adjust` `resetToSeed` | Write, then reload |
| `dismissError` | Clears the banner |

Every write catches and turns failure into `error` rather than rejecting, so no screen
needs a try/catch and no failure is silent.

## Derived data

Pure functions over a snapshot, in [`lib/inventory/derive.ts`](../lib/inventory/derive.ts)
and [`floor.ts`](../lib/inventory/floor.ts). Nothing derived is ever stored.

| Function | Returns |
|---|---|
| `statusOf(item)` | `ok` \| `low` \| `out`. At the reorder point counts as low |
| `lineValue(item)` | `qty * unitCost`, minor units |
| `fillRatio(item)` | 0-1 against a full bin, six times the reorder point |
| `totals(items)` | skus, units, value, low and out counts |
| `reorderQueue(items, suppliers, limit?)` | Most urgent first: shortfall x lead time, doubled when out |
| `throughputSeries(movements, days, endAt)` | Units moved per day, oldest first |
| `binOccupancy(items)` | Bin code to the fullest part in it |
| `buildFloor(items)` | Aisles, racks and cells in reading order |
| `fillStep(fill)` | 0-4, the ramp index. Empty always gets its own step |

## Route surface

All static, all prerendered.

| Route | Type |
|---|---|
| `/` | Marketing page |
| `/app` `/app/items` `/app/map` `/app/movements` `/app/suppliers` | App screens |
| `/robots.txt` `/sitemap.xml` `/manifest.webmanifest` | Metadata |
| `/opengraph-image` `/apple-icon` `/icon.svg` `/favicon.ico` | Images |

Query parameters the parts page reads:

| Parameter | Effect |
|---|---|
| `?status=` | `all` \| `attention` \| `low` \| `out` \| `ok`. Anything else falls back to `all` |
| `?supplier=` | A supplier id |
| `?focus=` | A SKU. Filters to it and opens its drawer |

## If this became an HTTP API

The interface maps to REST directly, which is the point of having it:

| Method | Endpoint |
|---|---|
| `load` | `GET /api/snapshot` |
| `createItem` | `POST /api/items` |
| `updateItem` | `PATCH /api/items/:id` |
| `deleteItems` | `DELETE /api/items` |
| `adjust` | `POST /api/items/:id/movements` |
| `reset` | `POST /api/reset` |

Three things would have to be added rather than translated: authentication, per-request
authorisation on every one of those endpoints, and server-side validation of everything
the drawer currently checks in the browser. `isPersisting()` would become a connection
health check, or drop away entirely in favour of real error responses.
