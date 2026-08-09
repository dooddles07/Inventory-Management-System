# Design

Product and interface decisions, and the reasoning behind them.

Colour roles, measured contrast ratios, the type system and the token names live in
[DESIGN-SYSTEM.md](DESIGN-SYSTEM.md). This document is about what the screens do and why;
that one is about what they are made of.

## The stance

This is rack signage and label stock, not a consumer app. Tight radii, hairline borders,
one shadow for cards and one for popovers. Nothing glows.

The test for any element: does it report something, or does it decorate? A bar with no
reference mark is decoration. A count with no unit is decoration. A status colour with no
label beside it is decoration and an accessibility failure.

## Information architecture

Five sections, flat, no nesting:

| | |
|---|---|
| Overview | What needs attention right now |
| Parts | The full list, and every edit |
| Floor map | The building |
| Movements | What happened |
| Suppliers | Who supplies it and how long they take |

Below `lg` the rail becomes a scrollable strip rather than a menu behind a modal. Five
links do not justify a hamburger; hiding them costs more than the row of space it saves.

Every screen is one or two panels. Panels do not nest.

## The floor map

The signature element, and the reason the product is not a table with a chart on top.

One cell per bin, laid out the way the building is: six aisle rows, eight racks across,
six shelves per rack. Brightness carries how full each bin is, so the four brand blues do
the data work instead of decorating the page. An aisle emptying out is visible without
reading a number.

Two decisions worth keeping:

**Empty gets its own step.** `fillStep` returns 0 only for a genuinely empty bin, and
every non-zero fill starts at step 1. Without that, a nearly-empty bin and an empty one
look the same, which is the one distinction the map exists to make.

**The readout is a fixed slot, not a floating tooltip.** Choosing a bin fills a reserved
strip under the grid. Nothing reflows, nothing is obscured, and a pointer moving across
288 cells does not cause 288 layout passes.

**It answers a tap as well as a pointer.** The marketing map was hover-only and told
visitors to "hover a bin", which is an instruction no phone can follow - the signature
element of the landing page, inert on half the traffic. Hover still drives it on a mouse,
but enter and leave are gated on `pointerType === "mouse"`, because a tap emits those
events too and the trailing `pointerleave` wiped the cell the tap had just chosen.

On the map screen the grid is keyboard navigable - arrow keys walk the racks, `Home` and
`End` jump to the ends of an aisle, and only the active cell is tabbable so the grid is a
single tab stop rather than 288.

On the marketing page the same grid is `aria-hidden` and pointer-driven. It is
illustration there; the readout beside it carries the content.

## Status is never colour alone

Three states - in stock, below reorder, out of stock - each with a text label, a shape,
and a colour. The label carries the meaning on its own; colour is reinforcement.

`StatusDot`, used where a full pill will not fit, carries an `sr-only` label and a
`title`. The colour is never the only signal.

Each status pair is measured against its own wash and against surface, paper and blue-50,
because those are every ground a pill or figure lands on. The worst pairing of the three
is 5.3:1. Two of them were below AA until an axe pass caught it - see DESIGN-SYSTEM.md.

## Numbers

Mono is reserved for things read character by character: SKUs, bin addresses, quantities,
money, dates. Interface labels are sans, because a column header is not a measurement.

Everything numeric carries `data-numeric`, which turns on tabular figures so a count that
ticks does not reflow the row it sits in.

Money is stored in minor units and divided once, at the formatter. Compact forms
(`$1.5k`, `$2.5M`) appear only in the four overview readouts, where the exact figure is
noise; every table shows the real number.

## Motion

Motion reports that something changed. It never announces itself.

| Where | What | Why |
|---|---|---|
| Overview readouts | Count up, 0.7s | A figure changed |
| Stock bars | Spring to width | The fill is the message |
| Drawer | Spring in from the right | It came from somewhere |
| Floor map cells | 288 staggered fades on load | The building assembling |

The map's stagger is CSS keyframes with an inline delay, not 288 motion components -
that many animation nodes is not worth the JavaScript.

Everything respects `prefers-reduced-motion`. The ticker renders its value directly, the
bars snap, the drawer has zero duration, and the global rule cuts every remaining
animation and transition to 0.01ms.

## States that are not the happy path

**Loading.** Skeletons shaped like the content they replace, not a spinner. The page does
not jump when data lands.

**Empty.** Every empty state says what would put something there. "Everything is above its
reorder point" explains what appears here and when. "No parts match these filters" comes
with the button that clears them.

**Error.** A failed write shows a banner in the app shell saying what failed and what it
means - a save that only reached memory says the tab is now the only copy. Route errors
land on a page that offers the screen again and points at reset. Both were added after an
audit found that failures were entirely silent.

**Destructive.** Deletes and the data reset go through the same confirm dialog, which
names what is being destroyed. Cancel reads "Keep it" for a delete and "Cancel" for a
reset, because "Keep it" makes no sense against a reset.

## Copy

Rules, in the order they matter:

1. **Say the thing.** "Know what's in stock, and where it is." Not "Streamline your
   inventory operations."
2. **A number needs a unit or a comparison.** "Forty units left" means nothing. "Forty
   left, going out at six a day, from a supplier who takes three weeks" means order now.
3. **Warehouse words, not software words.** Parts, bins, picks, receipts, cycle counts.
   Not items, locations, transactions.
4. **Labels are always visible.** A placeholder disappears the moment it is needed most.
5. **Errors say what to do.** "Use aisle-rack-shelf, like C-04-12", not "Invalid format".
6. **Buttons name their action.** Three plans do not all say "Start with this"; they say
   "Choose Shelf", "Choose Warehouse", "Choose Multi-site" - which is also why a screen
   reader can tell them apart.
7. **Do not claim what is not computed.** The hero said parts needed restocking "today"
   when nothing computed a day boundary. It does not say that now.
8. **Admit what is not real.** The pricing section says it bills nobody and that the tiers
   describe where the product would go rather than what is built, in the section itself
   rather than in the footer.
9. **Never describe a feature that does not exist.** "Click a row to change a count, move
   a part to a different bin, or print its shelf label" was two-thirds true for a while.
   Printing is built now; the alternative was deleting the clause.

## The shelf label

The one part of the interface designed for paper. Print takes the label and nothing else:
`visibility` rather than `display`, so collapsing the ancestors does not take the SVG's
layout with them, and the drawer's spring transform is cleared because a transformed
ancestor re-anchors `position: fixed` to itself.

What lands on the label is what someone reads off a rack, in that order: the part name,
the bin address in mono at the largest size, the barcode, then the SKU. The "Shelf label"
caption and the Print button are interface, so they do not print. The barcode carries a
ten-narrow-width quiet zone either side, without which a scanner will not lock on to the
start character.

## Accessibility

Verified with axe across 17 states - every route, both drawer modes, the confirm dialog,
the search listbox, and four routes at 375px. Zero violations.

What that took, beyond the contrast work:

- One `h1` per page and an outline that never skips a level. Two decorative headings - a
  panel label and the footer column titles - became paragraphs, because a `<nav>` with an
  `aria-label` does not also need an `h2`.
- The search field is a real combobox: `aria-expanded`, `aria-controls`, `role="listbox"`
  and `role="option"`, arrow keys and Enter.
- The floor grid is a `role="grid"` with one tab stop and per-cell labels naming the bin
  and what is in it.
- Focus rings flip on navy. `blue-500` reaches 2.6:1 there, so `.on-navy` switches the
  ring to `blue-300`, which reaches 4.6:1.
- A skip link on both surfaces. The app puts nine tab stops - the rail, the top bar -
  before a screen's own controls, and the parts table adds two per row after that.
- Closing a dialog puts focus back on whatever opened it. Radix does this when its content
  unmounts, which the drawer defeats by staying mounted through its exit animation, so the
  components restore focus themselves.

- Two live regions, and only two. Filtering the table announces how many parts are left,
  and recording a movement says what was received or picked. Both stay mounted while
  empty, because a live region that appears at the same moment as its content is not
  reliably announced.

axe does not catch any of those: a missing skip link is not a violation, and focus
restoration and announcements are behaviour rather than markup. They came out of walking
the app with the keyboard, and they are covered by `e2e/keyboard.spec.ts` and
`e2e/resilience.spec.ts` now.

**What deliberately does not announce.** The overview readouts tick silently, and so does
the attention badge on the rail. Both are summaries of figures already on the page; a
screen reader reading them aloud on every change would be noise, not information. The
filter count and the movement confirmation are the two cases where the interface changed
and nothing else said so.

## Responsive

One breakpoint that matters, `lg`, where the rail collapses to a strip. Tables scroll
inside their own container with a `min-width`, so the page body never scrolls sideways -
checked at 375px, `scrollWidth` equals `clientWidth`.

Columns drop by usefulness as width goes, not by position: category and updated time go
first, then value, then bin. Part, quantity and status survive to the narrowest screen,
because those three are the reason anyone opened the table.
