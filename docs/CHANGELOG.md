# Changelog

Notable changes to Stockroom. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow [semantic versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Printable shelf labels.** A Print button in the part drawer, and a print stylesheet
  that takes the label and nothing else: part name, bin address, Code 39 barcode, SKU, on
  62mm stock. The marketing page had promised this for a while.
- Quiet zones on the barcode, ten narrow widths either side. Without them a scanner will
  not lock on to the start character, which made "a scanner pointed at this reads back the
  SKU" optimistic.
- Project documentation: `PRD.md`, `ARCHITECTURE.md`, `DATABASE.md`, `API.md`, `DESIGN.md`.
- CI status badge and a live link in the README.

- **A skip link** on both surfaces, past nine navigation stops into the page content.
- Live regions where the interface changed silently: the parts table announces how many
  parts a filter left, and recording a movement says what was received or picked.
- An escape hatch on the error page that clears the stored snapshot, since that page
  replaces the app shell and the reset button along with it.

### Fixed

- **A stored snapshot shaped right but holding junk reached the screens.** `isSnapshot`
  only checked that the three collections were arrays, so an item missing its numbers threw
  the parts page to the error boundary and put `NaN` on the overview - and because the
  error page replaces the top bar, "Try again" re-read the same bad data forever. Every row
  is validated now, and anything failing falls back to a fresh seed.

- **Closing a dialog left focus on the document body** instead of the control that opened
  it, so a keyboard user was thrown to the top of the page every time. Radix restores
  focus when its content unmounts; the drawer stays mounted through its exit animation, so
  the components now restore it themselves. WCAG 2.4.3.
- **Moving a part to another bin was never recorded.** `updateItem` merged the change
  blindly, so a bin edit through the form vanished from a log that claims to hold every
  movement. It now writes a `transfer` with the old and new bins, in the repository rather
  than the form, so no caller can bypass it.
- The print layout put the label wherever the drawer's spring animation had stopped: a
  transformed ancestor re-anchors `position: fixed` to itself. The stylesheet clears it.

### Changed

- The pricing disclaimer no longer says the demo has "everything switched on", which was
  untrue of CSV import, API access and multi-site transfers. It says the tiers describe
  where the product would go rather than what is built.

## [0.1.0] - 2026-08-09

First release. Live at <https://inventory-management-system-one-zeta.vercel.app>.

### Added

**End-to-end tests** (`52c44c2`)

- 43 Playwright specs over the real flows, run against a production build. Each test gets
  a fresh browser context, so localStorage starts empty and the app reseeds.
- Covers adding a part and finding it on the shelf, the three validation refusals,
  renaming, single and bulk deletes with their singular and plural copy, filtering and
  sorting, reset restoring all 184 parts, receiving and picking against a reference, a
  pick larger than the shelf holds being refused with nothing logged, restocking clearing
  a part off the overview queue, per-route titles, the 404, the supplier deep link,
  floor-map keyboard movement, and the marketing page.
- Second CI job installing Chromium, with the Playwright report uploaded on failure.

**Unit tests and CI** (`8aa0488`)

- 70 Vitest tests over the data layer. No jsdom: the layer under test is pure TypeScript.
- `.github/workflows/ci.yml` running typecheck, lint, tests and build on push and pull
  request, each step with `if: !cancelled()` so one push reports every failure.

**Production readiness** (`6684547`)

- Per-route metadata for all five app screens.
- OpenGraph and Twitter cards, with an `opengraph-image` drawn from the real seed.
- `not-found`, `error` and `global-error` boundaries.
- `robots.txt`, `sitemap.xml`, `manifest.webmanifest`, `apple-icon`, `favicon.ico`.
- Security headers: content security policy, HSTS, `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`. `poweredByHeader` off.
- `ErrorBanner`, the first place a repository failure becomes visible.
- `InventoryRepository.isPersisting()`, so a write that only reached memory says so.

**The application** (`16066ac`)

- App shell: rail and strip navigation, top bar with search, five screens.
- Parts: search, filter, sort, paginate, add, edit, delete, bulk delete, adjust.
- Floor map: 288 bins by fill or status, keyboard navigable.
- Movements, suppliers, and the marketing site.

**Foundation** (`e5e3a88`)

- Next.js 16 App Router, React 19, TypeScript, Tailwind v4.
- Design tokens, deterministic seeded data layer, floor map hero.

### Fixed

- **Every `/app` route served the title "Overview - Stockroom."** The layout set a static
  title and the four views are client components, which cannot export metadata. Each route
  is now a server `page.tsx` over a sibling view. (`6684547`)
- **Repository failures were entirely silent.** `state.error` was dispatched in five places
  and read in none, and `write()` swallowed quota errors so the error could not even reach
  the context. A full quota or private browsing meant the drawer closed on a save that
  never happened. (`6684547`)
- **A movement could record more than was moved.** `adjust` clamped stock at zero but
  logged the requested quantity, so history and count disagreed. Both use the applied
  delta now. (`6684547`)
- **`/favicon.ico` returned 404 on every page load.** `app/icon.svg` does not answer the
  browser's automatic probe. (`6684547`)
- **A supplier's restock count linked to every low part, not that supplier's.** The link
  now carries the supplier and the parts page reads it. (`6684547`)
- **The hero read "184 parts across 184 bins."** Every seeded part holds its own bin, so
  the two figures were always identical and looked like a rendering fault. It counts
  against the building's 288 bins now. (`6684547`)
- **Two status colours failed AA.** `ok #1B806A` measured 4.20:1 on its wash and
  `low #B45309` 4.40:1, at the 10px the pills are set in. Now `#176E5A` and `#9E4808`,
  each checked against its wash and against surface, paper and blue-50. (`8aa0488`)
- **`describeBin` returned "Aisle NOT, rack NaN, shelf NaN"** for anything that was not an
  address. It hands the input back untouched now. (`8aa0488`)
- **`formatRelative` had a month step running to infinity**, so a seven-year-old date read
  "91 months ago". Added a year step. (`8aa0488`)
- **"Delete 1 parts?"** - the bulk confirm had no singular form. (`6684547`)
- `ConfirmDialog` hardcoded "Keep it" as its cancel label, which reads wrong on a reset.
  (`6684547`)
- The `Ticker` restarted from a stale origin when a value changed mid-animation. (`6684547`)
- `window.confirm` replaced with the project's own `ConfirmDialog` on the data reset,
  which is destructive and was using an unstyled, suppressible native dialog. (`6684547`)

### Changed

- Pricing buttons name their plan instead of all reading "Start with this", which gave
  screen readers three identically named links. (`6684547`)
- The pricing section says outright that it bills nobody. (`6684547`)
- Dropped "today" from the hero: nothing computed a day boundary. (`6684547`)
- "Every kind" became "All movements", matching the "All ..." pattern the parts filters
  use. (`6684547`)
- Two decorative headings became paragraphs, so the document outline holds. (`6684547`)
- Martian Mono no longer requests weight 600, which nothing used - `type-meta` carries the
  600 and is set in the sans face. (`8aa0488`)

### Removed

- Dead code: `byCategory`, `CategoryRollup`, `binsUsed`, the `Bin` interface, the
  `.tear-edge` utility, and `formatMoney`'s unused `precise` branch. (`6684547`, `8aa0488`)
- `.claude/launch.json` untracked; editor config, not project code. (`6684547`)

### Security

- Content security policy allowing `self` only. Fonts are self-hosted by `next/font`, so
  there is no external origin to permit. (`6684547`)
- No credentials, API keys or personal data anywhere in the repository. Supplier contacts
  in the seed use `.example` addresses. (`6684547`)

[Unreleased]: https://github.com/dooddles07/Inventory-Management-System/compare/52c44c2...HEAD
[0.1.0]: https://github.com/dooddles07/Inventory-Management-System/releases/tag/v0.1.0
