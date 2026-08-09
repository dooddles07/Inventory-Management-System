# Stockroom - product requirements

## The problem

A small warehouse loses time in two places. Someone needs a part and nobody knows which
shelf it is on. And a part runs out with no warning, because the only signal anyone had
was a number that meant nothing on its own.

Forty units left is not information. Forty units left, going out at six a day, from a
supplier who takes three weeks, means the order should already have been placed.

## Who it is for

A stockroom of one to eight people holding a few hundred part numbers in one building.
Small enough that a full warehouse management system is more process than the place can
carry, big enough that a spreadsheet has stopped working.

Not for: distribution centres, multi-warehouse operations with their own transfer rules,
or anyone who needs lot and serial tracking.

## What it has to do

### 1. Give every part an address

Every part sits in one bin, addressed aisle-rack-shelf, `C-04-12`. The address is
printable on a shelf label and readable off a rack. A person told "C-04-12" can walk to
it without asking anyone.

The building is 6 aisles, 8 racks per aisle, 6 shelves per rack: 288 bins.

### 2. Say what needs restocking, in the right order

Anything at or below its reorder point is on the restocking list. The order is not "most
empty first", which lists seventeen parts all showing zero in no useful sequence. It is
how much is missing multiplied by how long that supplier takes, doubled once the part has
actually run out.

A part that is empty with a three-week supplier outranks one that is empty with a
three-day supplier. That is the whole point of the feature.

### 3. Show the building, not a list of it

One cell per bin, arranged the way the building is. Brightness carries how full each bin
is, so an aisle that is emptying out is visible without reading a single number. Same map,
switchable to colour by stock status.

### 4. Keep a history that reconciles

Every receipt, pick, transfer, correction and cycle count is recorded with a reference
that ties back to paperwork. The count on screen and the sum of movements must agree; a
movement records what was actually applied, never what was requested.

### 5. Carry supplier lead times

Lead time is what turns a quantity into a date. Suppliers are ranked by how many of their
parts need restocking, and each supplier's count links to exactly those parts.

## Surfaces

| Surface | Route | Purpose |
|---|---|---|
| Marketing site | `/` | Explains the product, running on the same data the app does |
| Overview | `/app` | Stock value, units, what needs restocking, recent movements, throughput |
| Parts | `/app/items` | Search, filter, sort, add, edit, delete, adjust |
| Floor map | `/app/map` | All 288 bins, by fill or by status, keyboard navigable |
| Movements | `/app/movements` | The full log, filterable by kind and reference |
| Suppliers | `/app/suppliers` | Lead times and what each one covers |

## Non-goals

Deliberately out of scope, and each for a reason:

- **Accounts and multi-user.** The demo has no server, so there is nobody to be.
- **Purchase orders.** The product says what to order. Placing it is another system's job.
- **Lot, serial and expiry tracking.** A different product for a different warehouse.
- **Barcode scanning input.** Labels are generated and are real Code 39; reading them back
  needs hardware this cannot assume.
- **Multi-site transfers.** Named in the pricing tiers as a direction, not built.

## Constraints

- No account, no install, no database to provision. Opening the app has to work.
- The sample warehouse must be identical on the server and in the browser, so nothing
  flickers or rehydrates differently.
- Everything a visitor changes stays in their browser and can be reset in one action.

## What "done" means

- Every route prerenders static and carries its own title and description.
- Zero console errors, zero axe violations, AA contrast on every text pairing.
- The data layer is covered by unit tests; the real flows are covered end to end.
- Typecheck, lint, unit tests and the E2E suite all pass in CI on every push.
- A failed write says so instead of looking like it saved.

## Status

Shipped and live at
<https://inventory-management-system-one-zeta.vercel.app>.

Built as a portfolio project. The pricing section is illustrative and bills nobody, which
the section itself says.
