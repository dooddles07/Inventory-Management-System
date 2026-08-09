# Stockroom

[![CI](https://github.com/dooddles07/Inventory-Management-System/actions/workflows/ci.yml/badge.svg)](https://github.com/dooddles07/Inventory-Management-System/actions/workflows/ci.yml)

[Live](https://inventory-management-system-one-zeta.vercel.app)

Inventory tracking for small warehouses. Every part gets a bin number, so anyone on
shift can walk straight to it, and the floor map shows how full the building is at a
glance.

Two surfaces in one app: a marketing site at `/` and the working tool at `/app`. Both
run on the same seeded dataset, so nothing on the landing page is a mockup.

## Running it

```bash
npm install && npm run dev
```

Open http://localhost:3000. The app seeds itself on first load and stores everything in
`localStorage`, so there is no database to set up and no account to create.

Other scripts: `npm run build`, `npm run typecheck`, `npm run lint`.

## Tests

```bash
npm test        # Vitest over the data layer
npm run test:e2e  # Playwright over the real flows, on a production build
```

`lib/**/*.test.ts` covers the pure layer: stock status, reorder urgency, the repository's
write path, seed determinism, formatting. No jsdom, because none of it touches the DOM.

`e2e/` drives the app the way someone would: adding a part and finding it on the shelf,
receiving and picking against a reference, refusing a pick larger than the shelf holds,
the supplier deep link, keyboard movement across the floor map, and a reset that puts
everything back. The Playwright config builds and starts the app itself.

## Deploying

Set `NEXT_PUBLIC_SITE_URL` to the public origin, with no trailing slash. It is what
`metadataBase`, the OpenGraph and Twitter cards, `robots.txt` and `sitemap.xml` are built
from, so link previews point at the wrong host without it. See `.env.example`.

Every route prerenders static, so any Node host or static-capable platform will serve it.
`next.config.ts` sends the security headers, including a content security policy that
matches what the app actually loads: itself, and nothing else.

## What is in the box

- **Overview** - stock value, units on hand, what needs restocking, recent movements
- **Parts** - search, filter and sort 184 parts; add, edit, delete, adjust quantities
- **Floor map** - 288 bins across 6 aisles, brightness encoding how full each bin is
- **Movements** - receipts, picks, transfers, adjustments and cycle counts
- **Suppliers** - lead times and what each one supplies

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Framer Motion. Radix
primitives for the dialog and drawer behaviour that is genuinely hard to get right.

Deliberately not used: TanStack Table, Recharts, a state library. The data table is a
hook, the sparklines are hand-rolled SVG, and state is React context with a reducer.

## Data

`lib/inventory/` holds the whole data layer. Everything goes through the
`InventoryRepository` interface; `LocalInventoryRepository` is the only implementation
today, and swapping it for a network one changes one line in the provider.

The seed is deterministic (fixed PRNG seed, fixed timestamp anchor), so the server and
the client render the same snapshot.

Writes that fail to reach `localStorage` - a full quota, or private browsing - keep
working in memory and say so in a banner, rather than looking like they saved.

## Docs

| | |
|---|---|
| [PRD.md](docs/PRD.md) | The problem, who it is for, scope and non-goals |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | How it is put together and what was left out |
| [DATABASE.md](docs/DATABASE.md) | The data model, its rules, and the SQL it would map to |
| [API.md](docs/API.md) | The repository contract and the route surface |
| [DESIGN.md](docs/DESIGN.md) | Interface and copy decisions |
| [DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) | Colour roles, contrast ratios, type |
| [SECURITY.md](docs/SECURITY.md) | Threat model, headers, data handling, reporting |
| [CHANGELOG.md](docs/CHANGELOG.md) | What changed, and why |

## Design

`docs/DESIGN-SYSTEM.md` covers the colour roles, the measured contrast ratios, the type
system and the copy rules. Short version: the palette is four blues, navy is the ground
rather than an accent, and `#2196F3` is reserved for interaction because it fails
contrast as a text colour in both directions.
