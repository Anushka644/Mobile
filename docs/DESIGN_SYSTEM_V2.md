# Chill v2: "Frost minimal"

v2 replaces the clay look. The app is quiet, typographic and cool to the touch. The product photos carry the colour, and the UI stays out of the way. One idea per screen.

This doc takes precedence over `DESIGN_SPEC.md` wherever they disagree on visuals. Copy, flows and behaviour stay as the spec describes them.

## Principles

1. **Type does the work.** There is a big serif moment on every screen (a title or a question), quiet Geist for everything else, and mono for small labels.
2. **Colour means something.** Paper and ink everywhere. Ice blue appears only where time, frost or water is involved: time left, the frost layer, the savings water, the accent dot. Red is for destructive actions only.
3. **Flat, with hairlines.** No clay, no inner highlights, no coloured glows, no gradients on cards. Separate things with whitespace first and a 1px hairline second. Use a card (white surface with a hairline shadow) only for interactive groups.
4. **Generous air.** Use 20pt gutters, about 28pt between sections, and fewer elements. When in doubt, remove it.
5. **Motion is calm and physical.** Frost clears, water rises, a glint passes, droplets fall. Use springs without big overshoot, and respect reduced motion.

## Tokens (`src/theme/tokens.ts`)

The legacy names are kept, so the values do the restyling:

| Role | Token | Value |
|---|---|---|
| Canvas (paper) | `colors.bg.canvas` / `cream100` | `#F6F6F3` |
| Surface (cards, inputs) | `colors.bg.surface` | `#FFFFFF` |
| Sunken (quiet fills, badges) | `colors.bg.sunken` / `cream200` | `#EEEEEA` |
| Ink (text, primary buttons) | `colors.text.primary` / `plum900` | `#111113` |
| Secondary text | `colors.text.secondary` / `plum500` | `#6F6F76` |
| Tertiary text | `colors.text.tertiary` / `plum300` | `#A9A9AF` |
| Hairline | `colors.border.subtle` / `plum100` | `#E8E8E4` |
| Strong hairline | `colors.border.strong` | `#CFCFCA` |
| Accent (ice blue) | `colors.text.ice` / `ice600` | `#2B74E0` |
| Frost tones | `ice50` … `ice400` | `#F3F7FB` … `#8AB6E6` |
| Destructive | `coral500` | `#E5484D` |

`lavender*`, `mint*` and `butter*` now resolve to ice-blue tones. **Do not reach for them in new code.** Use ink, paper, or the `ice*` names directly.

Shadows: `shadow('raised')` gives a card a hairline plus a long, faint drop. `shadow('soft')` is a hairline for chips and inputs. `shadow('button')` is a 1px whisper. Never add custom heavy shadows.

## Type

| Variant | Face | Use |
|---|---|---|
| `displayL` (42) / `displayXL` (56) | Instrument Serif | Screen titles ("Your freezer", "Saved"), big questions ("Still want it?"), celebration lines |
| `displayItalic` (28) | Instrument Serif Italic | Reflection prompts, a single emotional aside |
| `numericXL` (72) / `numericL` (44) | Geist Light | Hero amounts and countdowns |
| `titleL/M/S` | Geist SemiBold/Medium | Card titles, item names on detail screens |
| `labelL/M/S` | Geist Medium | Buttons, list titles, chip labels |
| `bodyL/M/S` | Geist Regular | Running text and meta lines |
| `caption` | Geist Mono 11, uppercase | Eyebrows, section trailing labels ("SOONEST FIRST"), dates |
| `mono` | Geist Mono 13 | Rare: a code-like value such as a countdown in a list. Prefer `bodyS` with `tabular` for prices. |

Rules:
- Use one serif element per screen region; don't set two serif lines next to each other.
- Write serif headlines in sentence case.
- Never bold the serif.

## Signature components

- **Frost tile** (`Cube` / `ItemCube`): a square of frosted glass. Frost covers the bottom share of the tile equal to the cooldown left, blurring the product behind it. The tile is clear when thawed. `size`, `radius` and `photo` are props. It is the hero object wherever the old clay cube appeared.
- **Savings glass** (`Jar`): a clear glass with ice-blue water, a travelling wave and measuring ticks. Water is what melted wants become.
- **Droplet** (`Coin`): an ice-blue droplet. Bursts of droplets replace the coin bursts.
- **TabBar**: a frosted glass capsule with four tabs around an ink "+".
- **Buttons**:
  - Primary: ink pill, 56pt high, white Geist Medium label.
  - Secondary: white with a hairline.
  - `mint`: the ice-blue accent pill. Use it sparingly, for at most one accent CTA per screen.
  - Ghost: text only.
  - Disabled: 40% opacity.
- **Chips**: white with a hairline. Selected chips are ink with white text.
- **CooldownPicker**: four white tiles with hairlines; the selected one is ink.
- **Lists**: rows on a white card with hairline separators (iOS grouped-list style), or plain rows on paper separated by hairlines. Icons are monochrome ink line icons at 20pt with no coloured badges. Use `IconBadge` only as a neutral sunken circle.
- **ProgressBar**: 6pt high. The `ice` tone is a blue fill on frost; the `mint` tone is now an ink fill on a hairline track.

## Screen direction

| Screen | Direction |
|---|---|
| Freezer home | Done; use it as the reference. Mono date caption, serif "Your freezer", subtitle, the saved line between hairlines, white ready cards, a grid of frost tiles with name / price / time left under each. |
| Empty freezer | One large frost tile (progress 0, bag glyph), a serif line, a short body line, an ink CTA. Lots of air. |
| Item cooling | Frost wash at the top (preset `item`). Glass back and more icon buttons. A big frost tile (about 260). Mono caption "THAWS IN" with the countdown in `numericL`/`numericXL` Geist Light and a thin ice progress line. Item name (`titleL`) and price. A reflection (hairline, mono eyebrow, serif-italic question). Details as hairline key/value rows. "Thaw early" as a ghost or secondary button. |
| Thawed decision | Plain paper. Clear tile (about 240). Mono caption "THAWED · WAITED 3 DAYS". Serif "Still want it?". One line of context (what you felt when you froze it). Then stacked actions: ink primary "Let it go", white secondary "Buy it", ghost "Refreeze". |
| Let go | Frost wash. Droplets fall from the tile into the savings glass, the water rises, and "+$65" counts up in Geist Light. A serif line ("Let go." / "That's $65 you kept."). One ink "Done" button. |
| Buy celebration | Calm: an ink/ice confetti burst, a serif "Enjoy it.", a no-guilt line, and a button to open the link. |
| Saved | Serif "Saved", a big Geist Light amount, the glass, the goal as a minimal row with a thin bar, and the "Melted away" list as plain hairline rows (thumb 44, name, meta, "+$95" in ink or accent). The Bought section uses the same rows. |
| Insights | Serif title. Hero stat with no dark card: a huge `numericXL` "75%" plus "of your wants melted away" plus "6 of 8 · $934 not spent". Weekday chart: thin rounded bars in `cream300`, the peak in ink with a small label. Moods: rows with a label and thin ink bars. Categories and streak as quiet white cards with hairlines. |
| You | Serif title. White grouped lists with hairline separators, monochrome icons with no tinted badges, values in secondary text, "Reset everything" in red. |
| Freeze sheet | Serif "Freeze it" title with a quiet subtitle. The photo tile is a frost tile with a camera glyph. Hairline inputs, hairline chips, the cooldown picker. A sticky ink CTA "Freeze it for 3 days". |
| Freezing moment | Preset `frozen`. The frost rises over the product (the reverse of melting) with a glint, then a serif "On ice." and a quiet line saying when it thaws. Ink button. |
| Onboarding (3) | One serif headline per slide, a short body, and one illustration each: (1) a tile freezing over a product, (2) the frost line sinking as it melts, (3) the glass filling with droplets. Pager dots are thin ink dashes. Ink CTA. |

## v2.1: signature moments (keep it minimal, never boring)

The designer's feedback on v2 was: "I love everything, but it's a bit boring." v2.1 keeps the system and adds a few strong, on-concept ideas. Use them deliberately: one or two per screen, never all at once.

1. **Product tints.** Every want's frost tile is tinted by its product: coral sneakers, butter air fryer, lavender headphones, mint jacket. The freezer becomes a gallery of frosted coloured glass.
   - `ItemCube` and `ProductThumb` do this automatically via `tintFor(item)` (`src/components/tints.ts`, tokens `tints.*`).
   - Use `tintFor(item).bg/.deep` for any other item-coloured surface, such as a soft wash behind a hero tile.
2. **Inside the freezer is night.** Dark is reserved for being frozen:
   - **Tokens:** `night900` (bg), `night800`, `night700` (tracks, hairlines), `night500`, `night300` (secondary text).
   - **Home:** the "Next to thaw" card is the reference (`src/screens/home/NextThawCard.tsx`): night card, a cold blue radial light behind a tinted tile rotated 6°, white serif-italic name, and a live hh:mm:ss countdown ticking every second.
   - **Night screens:** Item cooling and the Freezing moment are full night screens. Use a night background (`Screen background={colors.night900}` with glow 'none'), a cold blue radial light behind the hero tile, `<Grain opacity={0.7} />`, sparse slow white snow (SnowField), white and `night300` text, and glass icon buttons tinted for dark.
   - **Light screens:** Thawed decision, Let go, Saved and Buy are back in daylight (paper). Coming out of the freezer is the story.
   - **Night kit:** `Button` variants `light` (white pill, ink text) and `ghostLight`; `IconButton variant="night"` (dark glass); `ReflectionCard tone="night"`; `ProgressBar style={{ backgroundColor: colors.night700 }}`; `SnowField` (white dots); `<Grain opacity={0.7} />`.
3. **Expressive serif with italic accents.** `<Headline>` (`src/components/Headline.tsx`) sets words wrapped in `*asterisks*` in Instrument Serif Italic:
   - Examples: "Your *freezer*", "Still want *it?*", "Let it *go.*", "On *ice.*", "Every no is a *yes* to something".
   - Use one Headline per screen. Accents go on the emotional word.
   - Insights should read as sentences: "You want things most on *Saturday nights*", with the numbers carrying the drama.
4. **Tactility.** `Screen` lays a barely-there paper grain over every canvas (`grain` prop, on by default). Dark surfaces add `<Grain opacity={0.7} />`. The savings glass has bubbles and a travelling wave, and the frost tile has a glint.
5. **Play in the hero.** Hero moments may rotate a tile a few degrees and give it a coloured glow shadow (its tint, or ice on night), and may use oversized numbers (Geist Light, tight tracking). Lists and forms stay calm and straight.

## Verifying

- **Screenshots:**
  - Command: `node scripts/shoot.mjs --out <dir> --dist <own-dist-dir> "/?reset=1&seed=demo" <routes…>`. The routes run in one browser context, so seed first.
  - Demo item ids: `demo-sneakers`, `demo-airfryer`, `demo-headphones`, `demo-jacket` (cooling) and `demo-lamp` (ready). Routes include `/item/demo-sneakers`, `/thawed/demo-lamp`, `/let-go/demo-lamp`, `/saved`, `/insights`, `/you`, `/freeze`, `/onboarding` (after `/?reset=1`), and `/dev/kit`.
  - `?ff=<hours>` fast-forwards the clock.
- **Checks:** `npm run typecheck`, `npm run lint` and `npx jest` must stay green. Update test expectations only where copy or structure changed on purpose.
