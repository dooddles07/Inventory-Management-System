# Architecture

## Shape

Next.js 16 App Router, React 19, TypeScript, Tailwind v4. Every route prerenders to
static HTML at build time. There is no server at runtime beyond a static host: no API
routes, no server actions, no database.

Two surfaces share one codebase and one dataset. `/` is the marketing site. `/app` is the
tool. Both read the same deterministic seed, so nothing on the landing page is a mockup
of anything.

## Layout

```
app/
  layout.tsx            Root metadata, fonts, the OG and Twitter cards
  page.tsx              Marketing page, server component
  not-found.tsx         404
  error.tsx             Route-level error boundary
  global-error.tsx      Root-layout failure, styles inlined
  opengraph-image.tsx   Card image, drawn from the real seed
  robots.ts sitemap.ts manifest.ts apple-icon.tsx favicon.ico
  app/
    layout.tsx          Provider, rail, top bar, error banner
    page.tsx            Server: metadata only
    overview-view.tsx   Client: the screen
    items/ map/ movements/ suppliers/    same page + view split

components/
  marketing/            Hero, floor map, proof sections, pricing, header, footer
  app/                  Nav, top bar, panels, drawer, feeds, charts, barcode
  ui/                   Button, drawer, field. Shared primitives only
  motion/               Ticker

lib/
  inventory/            types, seed, derive, floor, repository, local-repository
  hooks/                use-data-table, use-now
  store/                inventory-context
  format.ts cn.ts
```

## The page and view split

Every `/app` route is two files. `page.tsx` is a server component whose only job is to
export `metadata` and render the view. `*-view.tsx` is the client component holding the
screen.

This exists because client components cannot export metadata. Before the split, all four
routes inherited a single static title from the layout and every tab read
"Overview - Stockroom".

## Data flow

```
seed.ts ──> LocalInventoryRepository ──> InventoryProvider ──> useInventory()
              (localStorage)               (reducer + context)      │
                                                                    v
                                            derive.ts / floor.ts (pure, memoised)
                                                                    │
                                                                    v
                                                                 screens
```

Screens never touch storage. They read a snapshot and call intent methods -
`createItem`, `updateItem`, `deleteItems`, `adjust`, `resetToSeed`. Each one writes
through the repository and reloads the snapshot, so there is one source of truth and no
optimistic state to reconcile.

## The repository seam

`InventoryRepository` is the whole reason the data layer is swappable.
`LocalInventoryRepository` is the only implementation today; a network one drops in by
changing the single `new LocalInventoryRepository()` in the provider. See
[API.md](API.md) for the contract and [DATABASE.md](DATABASE.md) for the model.

The interface is async even though localStorage is synchronous, so that swap does not
ripple into a single component.

It carries one method that is not CRUD: `isPersisting()`. A browser can accept a write
into memory and refuse to store it - a full quota, private browsing. Without that signal
the app would close the drawer and look like it saved. The provider turns a false into a
banner that says the tab is now the only copy.

## Rendering and hydration

The seed is deterministic: a fixed PRNG seed and a fixed timestamp anchor, never
`Date.now()`. The server and the first client render produce the same snapshot, so
nothing hydrates twice.

Relative times are the exception, since they depend on the current clock. `useNow` is a
`useSyncExternalStore` clock shared by every component that shows one. It returns `null`
until something subscribes on the client, so the server render and the first client
render agree, and it ticks once a minute from a single interval rather than one per row.

## State

React context over a reducer. No state library.

Two places adjust state during render rather than from an effect, which is the sanctioned
React pattern and avoids a paint with stale values:

- The item drawer resets its form when it opens on a different part, keyed on
  `open:itemId`.
- The parts page opens the drawer when a `?focus=` SKU arrives from elsewhere, once per
  SKU.

## Deliberately not used

- **A table library.** Search, filter, sort and paginate over a few hundred rows is what
  `useMemo` already does. `use-data-table.ts` is the whole thing.
- **A chart library.** The throughput sparkline is one path element of hand-rolled SVG.
- **A barcode library.** `barcode.tsx` encodes Code 39 directly - nine elements per
  character, three wide, wrapped in start and stop. A scanner reads the SKU back.
- **A state library.** See above.

Radix is used, for the dialog and drawer only, because focus trapping, escape handling,
scroll locking and portalling out of every scroll container are genuinely hard to get
right and cheap to get subtly wrong.

## Testing

Two layers, deliberately not three.

**Unit** (`lib/**/*.test.ts`, Vitest, 70 tests). The data layer is pure TypeScript, so
there is no jsdom and no component-testing dependency to keep current. Covers stock
status boundaries, reorder urgency ordering, the repository write path including the
clamp and the persistence flag, seed determinism and formatting.

**End to end** (`e2e/`, Playwright, 43 specs). Runs against a production build, because
the routes are prerendered and the failures worth catching are the ones a visitor hits.
Each test gets a fresh browser context, so localStorage starts empty and the app reseeds.

There is no component-level layer. Between pure functions below and real flows above,
it would mostly assert that React renders props.

## Delivery

Static output on Vercel. `next.config.ts` sets the security headers, including a content
security policy that matches what the app actually loads - itself, and nothing else.
Fonts are self-hosted by `next/font`, so there is no external origin to allow.

`NEXT_PUBLIC_SITE_URL` is inlined at build time and drives `metadataBase`, the OG and
Twitter cards, `robots.txt` and `sitemap.xml`. Changing it needs a redeploy, not just an
environment update.

CI runs typecheck, lint, unit tests and build in one job, and the E2E suite in a second.
