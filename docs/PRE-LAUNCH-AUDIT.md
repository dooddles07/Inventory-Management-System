# Pre-launch audit

Date: 2026-08-09. Scope: whole repo. Verified against a production build (`next build` +
`next start`) driven in a real browser, not just static reading.

## Baseline (already good)

- `npx tsc --noEmit` - clean.
- `npx eslint .` - clean.
- `next build` - compiles, 9 routes, all prerendered static.
- Zero runtime console errors on `/`, `/app`, `/app/items`, `/app/map`, `/app/movements`,
  `/app/suppliers`.
- No horizontal overflow at 375px.
- Copy is already written in plain language - no AI filler, no "seamlessly", no
  "leverage", no em-dash pile-ups. The problems below are specific, not stylistic.

---

## P0 - blocks a live deploy

### 1. Every `/app` page has the tab title "Overview - Stockroom"

`app/app/layout.tsx:6-8` sets a static `metadata.title = "Overview"`. The four child
pages are client components, so they cannot export their own metadata. Verified: `/app/items`,
`/app/map`, `/app/movements` and `/app/suppliers` all serve `<title>Overview - Stockroom</title>`.
Browser tabs, history and bookmarks are all wrong.

Fix: split each route into a server `page.tsx` that exports `metadata` and renders the
client view from a sibling file.

### 2. No OpenGraph or Twitter metadata, no `metadataBase`

`app/layout.tsx:21-28` has title and description only. Any link to the site pastes into
Slack, LinkedIn or iMessage with no card. For a portfolio piece that is the main way it
gets seen.

Fix: add `metadataBase`, `openGraph`, `twitter`, and an `opengraph-image.tsx`.

### 3. No custom 404

`/does-not-exist` returns Next's default page carrying the root title. No nav back.

Fix: `app/not-found.tsx`.

### 4. No error boundary

Any client-side throw renders a blank white page with no recovery.

Fix: `app/error.tsx` and `app/global-error.tsx`.

### 5. Repository failures are swallowed

`lib/store/inventory-context.tsx` dispatches `{ kind: "failed" }` at lines 72, 90, 102,
114 and 126, and `state.error` is exposed on the context - but no component anywhere
reads it. Confirmed by search: zero references to `error` in `app/**/*.tsx`.

Consequence: localStorage quota exceeded, private-browsing mode, or corrupt storage all
fail silently. The user hits Save, the drawer closes, nothing was written, and there is
no signal.

`resetToSeed` (line 132) has no `try`/`catch` at all, so a failure there is an unhandled
promise rejection.

Fix: render the error as a dismissible banner in the app shell; wrap `resetToSeed`.

### 6. Destructive reset uses `window.confirm`

`components/app/topbar.tsx:165`. This wipes every part and movement. A native dialog is
unstyled, can be permanently suppressed by the browser, and ignores the `ConfirmDialog`
component this project already ships and uses for the two delete paths.

Fix: use `ConfirmDialog`.

---

## P1 - correctness and user-facing bugs

### 7. "Delete 1 parts?"

`app/app/items/page.tsx:377` - `Delete ${selected.size} parts?` with no singular form.

### 8. The supplier restock link lies

`app/app/suppliers/page.tsx:117` links every supplier's "Need restocking" count to
`/app/items?status=attention`. Clicking the count for a supplier with 3 low parts shows
all 44 low parts in the warehouse.

`useDataTable` also never reads a supplier from the URL (`app/app/items/page.tsx:44-47`
passes only `status` and `search`), so the deep link cannot work as written.

Fix: emit `?status=attention&supplier=<id>` and read `supplier` into the initial filters.

### 9. The hero stat reads like a bug: "184 parts across 184 bins"

`components/marketing/hero.tsx:41-55`. The seed gives every part its own bin, so
`skus` and `binsUsed` are always identical. Two identical numbers in one sentence looks
like a rendering fault. "44 of them need restocking" also attaches "them" to *bins*, the
nearer noun, when it means parts.

Fix: rewrite against the bin total, which is the number that carries information -
184 parts in 288 bins.

### 10. A movement can record more than was moved

`lib/inventory/local-repository.ts:122` clamps the item's quantity with
`Math.max(0, current.qty + request.qty)` but writes the **unclamped** `request.qty` into
the movement at line 130. Pick 50 from a bin holding 30 and stock goes to 0 while the log
says -50: the history no longer reconciles.

The drawer guards this today (`components/app/item-drawer.tsx:146`), so it is unreachable
from the UI - which is exactly why it should be fixed at the repository, the layer whose
whole job is to be the swappable source of truth.

### 11. `Ticker` jumps when a value changes mid-animation

`components/motion/ticker.tsx:26-28`. `previous.current` is only updated in `onComplete`.
Interrupt the animation - change a quantity while the counter is still running - and the
next animation starts from a stale origin. Update it in the cleanup path as well.

### 12. Unused import

`app/app/map/page.tsx:3` imports `Link` and never uses it. Lint does not catch it because
the flat `eslint-config-next` in `eslint.config.mjs` carries no TypeScript unused-vars
rule. Add `@typescript-eslint/no-unused-vars` so the next one is caught automatically.

---

## P2 - copy, wording and accessibility

### 13. Three identical pricing CTAs

`components/marketing/pricing.tsx:17,32,47` - all three plans say "Start with this". A
screen reader announces "Start with this, link" three times with no way to tell them
apart. Make each one name its plan.

### 14. "Every kind"

`app/app/movements/page.tsx:84`. The items page uses "All stock levels", "All categories",
"All suppliers". This one breaks the pattern. Use "All movements".

### 15. Heading order breaks in the restock section

`components/marketing/live-proof.tsx:122-124`. The panel's `h3` ("Needs restocking")
renders before its own section's `h2` because of the `order-1`/`order-2` flip, so the
document outline files it under the previous section.

### 16. Footer column labels are `<h2>`

`components/marketing/site-footer.tsx:60`. They sit inside `<nav aria-label>`, which
already names them. As `h2` they add "PRODUCT" and "ON THIS PAGE" to the page outline
alongside the real section headings. Use a `<p>`.

### 17. "need restocking today" overclaims

`components/marketing/hero.tsx:54`. Nothing in the code computes a same-day boundary; the
figure is simply everything below its reorder point. Drop "today".

### 18. Pricing implies a product you can buy

Three priced tiers, three buttons, all pointing at the free demo. The footer admits it is
a portfolio project 700px further down. One honest line under the pricing heading fixes
it without weakening the section.

---

## P3 - hygiene, dead code, deploy config

19. `byCategory` and `CategoryRollup` - `lib/inventory/derive.ts:103-130`, exported, zero callers.
20. `.tear-edge` - `app/globals.css:157-163`, zero callers.
21. `formatMoney`'s `precise` branch and the `moneyPrecise` formatter - `lib/format.ts:7-18`, never used.
22. `Bin` interface - `lib/inventory/types.ts:8-13`, never used.
23. "Deleted part" fallbacks - `components/app/movement-feed.tsx:40` and
    `app/app/movements/page.tsx:154` are unreachable: `deleteItems` removes the movements
    alongside the item.
24. `.claude/launch.json` is tracked in git. Editor config, not project code.
25. `next.config.ts` is bare - no `poweredByHeader: false`, no `Referrer-Policy`,
    `X-Content-Type-Options`, `X-Frame-Options` or HSTS headers.
26. No `robots.txt`, no `sitemap.ts`.
27. No `manifest.webmanifest` and no `apple-icon`. `app/icon.svg` alone covers the browser
    tab but not an iOS home-screen save.

---

## Resolution - 2026-08-09

All 27 items worked through. Everything above is fixed except one, and three more turned
up along the way.

### Item 23 was left alone, deliberately

The "Deleted part" fallbacks are unreachable today because `deleteItems` removes an item's
movements alongside it. They stay in place anyway: `InventoryRepository` exists so a
network implementation can drop in, and a real API would very likely soft-delete. The
guard costs one `??` and is the correct shape for the boundary it sits on. Calling it dead
code was the wrong read.

### Found during the work

- **`/favicon.ico` 404 on every page load.** `app/icon.svg` does not answer the browser's
  automatic probe. A real ICO now sits at `app/favicon.ico`.
- **A second unused variable.** The new lint rule immediately caught `suppliersById` on
  the parts page, which item 12's rule was added to prevent.
- **`ConfirmDialog` hardcoded "Keep it" as its cancel label**, which reads wrong on the
  reset dialog. It is a prop now, defaulting to "Keep it" for deletes.

### Verified in a production build

`tsc --noEmit`, `eslint .` and `next build` clean, 15 routes prerendered static. Driven in
a browser: per-route titles, OG tags and rendered card image, security headers present and
`x-powered-by` gone, the 404 page, singular and plural delete dialogs, the supplier deep
link (a supplier showing 9 lands on exactly 9 rows with both filters set), the reset
dialog, and the storage-failure banner triggered by stubbing `Storage.prototype.setItem`
to throw. Zero console errors.

### Still needs a human

`NEXT_PUBLIC_SITE_URL` has to be set on the deployment target. Until it is, every
OpenGraph URL, `robots.txt` and `sitemap.xml` points at `http://localhost:3000`.
