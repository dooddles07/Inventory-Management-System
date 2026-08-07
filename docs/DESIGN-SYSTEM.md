# Stockroom design system

Source of truth for colour, type, spacing and copy. Tokens live in `app/globals.css`.

## Colour: roles, not names

The brief pinned four blues. `#2196F3` is Material Blue 500, the most default blue in
software, so the system gives each blue a job instead of using it the default way.

| Token | Hex | Job |
|---|---|---|
| `navy-900` | `#06203F` | Recessed panels, deepest ground |
| `navy-800` | `#0A3372` | Hover state on navy surfaces |
| `navy-700` | `#0D47A1` | The dominant ground. Header, hero, footer, app rail |
| `navy-600` | `#1259C4` | Navy borders that need to read |
| `blue-700` | `#0A5FB0` | Blue **text** on light surfaces |
| `blue-500` | `#2196F3` | Interaction only: focus ring, active bar, selected row |
| `blue-300` | `#90CAF9` | Data ink, and interactive colour **on navy** |
| `blue-100` | `#E3F2FD` | Row hover, tinted panels |
| `blue-50` | `#F2F8FE` | Faintest wash |

Neutrals are blue-tinted throughout. No true gray appears anywhere: `ink-900 #0A1929`,
`ink-700 #24384D`, `ink-500 #566C82`, `ink-300 #8FA3B8`, `line #DDE5EE`,
`paper #EDF2F9`, `surface #FFFFFF`.

Stock status needs colour that four blues cannot carry: `ok #1B806A`, `low #B45309`,
`out #B3261E`, each with a wash for chip backgrounds.

### Contrast rules that are not optional

Measured, not assumed:

| Pairing | Ratio | Verdict |
|---|---|---|
| white on `navy-700` | 8.0:1 | Body text, button labels |
| `blue-300` on `navy-700` | 4.6:1 | Secondary text on navy |
| `on-navy-muted #A9C6E8` on `navy-700` | 4.5:1 | Muted text on navy, at the limit |
| `blue-500` on `navy-700` | 2.6:1 | **Never** on navy, not even as a focus ring |
| `blue-500` on white | 3.1:1 | Non-text only: rings, bars, fills |
| white on `blue-500` | 3.1:1 | **Never** a button label |
| `blue-700` on `paper` | 5.7:1 | Blue text on light surfaces |
| `ink-500` on `paper` | 4.8:1 | Smallest allowed muted text |

Two consequences worth remembering. Solid buttons are navy with white text, never
`#2196F3` with white text. Focus rings are `blue-500` on light and `blue-300` on navy,
which the `.on-navy` class switches automatically.

## Type

Two families, three roles. No Inter, no Geist, no display serif.

- **Archivo** variable, width axis loaded. `.type-display` runs `wdth 118 / wght 700`;
  `.type-title` runs `wdth 108 / wght 650`. The width axis is where the display type
  gets its character, so no novelty face is needed.
- **Martian Mono** is reserved for SKUs, bin addresses and every number on screen.
  `.type-label` is the 12px uppercase rack-signage style; `.type-data` is 13px with
  tightened tracking and tabular figures.

Body copy is 15px at 1.55 in the app and 17px in marketing prose. Nothing drops below
12px. Anything numeric carries `data-numeric` so figures do not reflow while they tick.

## Shape and depth

Radii stay tight: 2 / 3 / 5 / 8px. This is label stock and rack signage, not a consumer
app, so nothing is a pill. There is one card shadow and one popover shadow. No stacked
glows, no glassmorphism.

## Motion

Framer Motion drives component-level motion; the 288-cell floor map uses CSS keyframes
with an inline delay, because 288 motion nodes is not a trade worth making.

Entrances run 300 to 450ms on `--ease-out-quint`. Springs use `{ stiffness: 320,
damping: 32 }`. `prefers-reduced-motion` collapses everything to instant, enforced
globally in `globals.css`.

## The signature: the floor map

One cell per bin, addressed aisle-rack-shelf. Brightness encodes how full the bin is,
running `rgba(255,255,255,0.055)` for empty through `#1A63C0`, `#2196F3`, `#68B4F7` to
`#AFD9FC` for full. The palette does the data work, which is what keeps four ordinary
blues from reading as a template.

Section markers on the marketing page use real bin addresses (`A-01`, `A-02`) rather
than decorative numbering, because the addresses carry information.

## Copy rules

Write like a person who works in the warehouse, not like a brochure.

- Say what the thing does. "Know what's in stock, and where to find it" beats any
  line built on a formula like "Every X has a Y."
- Name things the way the people using them do: parts, bins, shelves, suppliers.
  Prefer "Need restocking" over "Below reorder point" in general-audience copy; keep
  trade terms inside the app where they are the accurate word.
- Buttons say what happens: "Save changes", "Add part", "Record movement". The word
  survives the whole flow, so a "Publish" button produces a "Published" message.
- Never call the product a demo in the interface. The primary action is "Open
  Stockroom", not "Open the demo". Copy is written as if the warehouse is live,
  because that is how the person reading it has to be able to use it.
- Errors explain what happened and what to do. They do not apologise and they are not
  vague. Empty states invite an action.
- Cut: "seamless", "robust", "comprehensive", "leverage", "streamline", "powerful",
  "effortless", "game-changing", "unlock". Cut "real" and "genuine" as intensifiers.
  Cut "not X, it's Y" pivots. Cut em dashes in prose.
- No emoji as icons. Lucide only.

## Banned

Gradient text, gradient buttons, glassmorphism, purple, floating decorative orbs,
hover-only affordances, emoji icons, pill radii, `0.5s` fade-everything.
