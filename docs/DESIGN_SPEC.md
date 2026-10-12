# Chill: Design Spec (v1)

> *Sleep on it before you buy it.* You freeze an impulse buy and it melts over a cooldown. When it thaws, you decide whether you still want it.

This file is the source of truth for the app build and for the remaining Figma screens.
Figma file: https://www.figma.com/design/BOiZOAtr1JNzelDQjUddsC (fileKey `BOiZOAtr1JNzelDQjUddsC`)

Rendered references — 2x PNGs of every Figma screen in `design/exports/` (match these closely):
`01-freezer-home`, `02-item-cooling`, `03-thawed-decision`, `04-let-go`, `05-saved`, `06-insights`, `07-you`, `08-onboarding-1`, `09-onboarding-2`, `10-onboarding-3`, `11-freeze-sheet`, `12-frozen-solid`, `13-freezer-empty`, `14-lock-screen` (each `@2x.png`).

Figma node ids (read-only references):

| Node | Id |
|---|---|
| Screens page | `3:5` |
| Home | `15:2` |
| Item | `16:270` |
| Thawed | `18:344` |
| Design System page | `3:3` |
| Cube set | `11:191` |
| Item Card | `12:881` |
| Tab Bar | `12:1030` |
| Button | `6:103` |
| Chip | `10:135` |
| Pill | `6:126` |
| Icon Button | `6:139` |
| Text Field | `12:1047` |
| Cooldown Option | `13:964` |
| Reflection Card | `13:965` |
| Jar | `11:1019` |
| Coin | `11:192` |

---

## 1. Principles
1. **Never shame.** Buying is always allowed. "Buy it" is a calm secondary action and is never red.
2. **Delight in waiting.** The melt is the reward loop: the cube visibly shrinks, the puddle grows, and the product slowly pokes out.
3. **One thumb.** Primary actions sit in the bottom third of the screen. Tap targets are at least 44pt.
4. **Squishy and tactile.** Every press gets a spring: scale 0.96, then overshoot back to 1. Haptics on meaningful moments.
5. **Calm copy.** Second person, short, warm. Sentence case, except Caption, which is UPPERCASE.

## 2. Foundations
Tokens live in `src/theme/tokens.ts`; never hard-code a hex value outside it. Fonts are loaded in `app/_layout.tsx`.

**Canvas and layout**
- Canvas is `bg.canvas` (#FFF4EC).
- Screen gutters are 20. The design frame is 393 × 852 (iPhone 15/16).
- Content max width is 353.

**Typography** (variants in `typography`)
- Bricolage Grotesque is used for display, titles and numbers.
- Nunito is used for body text and labels.

**Elevation:** use `shadow('raised' | 'soft' | 'button' | 'iceGlow')`.
- `raised`: cards
- `soft`: chips, small surfaces
- `button`: dark and mint buttons
- `iceGlow`: ice surfaces

**Radius**
- Cards use `radius.lg` (28).
- Inputs use `radius.md` (20).
- Buttons and chips use `radius.full`.

**Background glows** (art-directed by Anushka in Figma — follow exactly)
- **Plain canvas, no glows:** Freezer home, Empty freezer, Insights, You.
- **Everything else uses one wide, very soft top glow:** an ellipse 528 × 358 at x −67, y −118 (it spills past both screen edges), solid accent at 100%, layer blur 200. Web/CSS: `filter: blur(100px)` on that ellipse. Native: a radial gradient from the accent to transparent covering the top ~360pt.
- Some screens add one **primary glow** behind the hero object:

| Screen | Top glow | Primary glow / backdrop |
|---|---|---|
| Item cooling | lavender100 | ice backdrop gradient #CDEBFF → #EAF6FF → cream over the top 470pt |
| Thawed | butter100 | mint100, 420 × 380 at (−20, 90), blur 60 |
| Let-go | butter100 | mint500, 300 × 260 at (46, 300), blur 300 (very diffuse), over the mint100 → cream frame gradient |
| Saved | mint100 | lavender100, 473 × 344 at (−40, 106), blur 80 |
| Onboarding 1 | lavender100 | ice200, 420 × 380 at (−40, 60), blur 70 |
| Onboarding 2 | ice200 | lavender100, same geometry |
| Onboarding 3 | butter100 | mint100, same geometry |
| Frozen solid | lavender100 | frame gradient ice200 → ice50 → cream, plus an ice400 glow under the cube (260 × 120 at 66, 440, blur 60) |

**Status bar:** dark content.

**No home indicator.** Never draw one in the UI; the designs intentionally have none. Bottom-anchored elements (tab bar, sticky CTAs, onboarding buttons) sit **24pt above the screen's bottom edge**. Do not add the 34pt safe-area inset on top of that; 24pt already clears the system indicator.

### Motion tokens
| Name | Use | Values |
|---|---|---|
| `spring.press` | button and card press | damping 15, stiffness 260, mass 0.6 → scale 0.96 |
| `spring.pop` | appear, cube drop | damping 11, stiffness 180 (visible overshoot) |
| `timing.fade` | fades | 220ms, ease-out |
| `melt` | cube height and puddle | driven by `meltProgress(item, now)`, animated over 600ms when it changes |

Respect reduced motion (`useReducedMotion` from Reanimated): no overshoot, cross-fades only.

### Haptics (`src/lib/haptics.ts`)
- `tap`: button presses
- `selection`: chips and the cooldown picker
- `success`: frozen, and bought
- `heavy`: let go (the shatter)
- `warning`: confirm thaw early

## 3. Components (`src/components/`)

**Icon**
- Lucide-style glyphs drawn with `react-native-svg`: 24 × 24 viewBox, stroke 2, round caps and joins.
- Names: snowflake, plus, close, chevron-left, chevron-right, check, clock, link, camera, bell, settings, chart, sparkles, bag, refresh, coins, flame, arrow-up-right, hourglass, heart, user, droplet, meh, frown, zap, smile, shirt, headphones, lamp, gamepad, footprints, cooking-pot, image.
- The SVG paths are the Lucide ones; the Figma icon section (`5:2`) has them all.
- Props: `name`, `size = 24`, `color = text.primary`.

**Button**
- Height 60 (`size="md"`) or 48 (`"sm"`); horizontal padding 24; gap 8; pill-shaped.
- Has an optional leading icon (22) and a label in Label/L.

| Style | Background | Foreground | Shadow |
|---|---|---|---|
| Primary | `action.primary` (plum) | white | `button` |
| Secondary | white | plum | `raised` |
| Ice | ice200 | ice800 | `iceGlow` |
| Mint | mint500 | plum | `raised` |
| Ghost | none | plum500 | none |

- Pressed state uses `spring.press`. Ghost turns sunken (cream200) while pressed.
- Disabled is 40% opacity.

**IconButton**
- 48 circle with a 24 icon.
- Styles: Surface (white + `soft`), Glass (white at 55% + blur), Inverse (plum, white icon).

**Chip**
- Padding 16/12, gap 8, optional 18px icon, Label/M text.
- Unselected: white + `soft`.
- Selected: plum background, white text + `button`.
- Mood chips use these icons: bored→meh, sad→frown, hyped→flame, stressed→zap, need→check.
- Category chips:
  - Text only, or with icons: fashion→shirt, tech→headphones, home→lamp, beauty→sparkles, food→cooking-pot, fun→gamepad, other→bag.
  - Do not render emoji: Figma and the web export don't render them consistently, so use icons.

**Pill**
- Padding 12/8, gap 4, 16px icon, Label/S text.

| Tone | Background | Text | Icon |
|---|---|---|---|
| Ice | ice100 | ice800 | clock |
| Ready | mint100 | mint700 | check |
| Neutral | cream200 | plum500 | none |

**Cube** — the hero object. Props: `progress` (0..1, continuous), `thawed` (boolean), `size`, `image` (an ImageSource or uri), and `category` for the fallback glyph.

Geometry, on a 200 × 200 box scaled by `size / 200`, with the ground line at y = 176:
- **Body (cooling).** Width `150 → 138` and height `150 → 84` as progress goes 0 → 0.75+. Radius 40 to 44. The body sits on the ground line.
  - Fill: a diagonal gradient #F3FAFF (0.97) → #CDEBFF (0.9) at 55% → #8FD3FF (0.92).
  - Border: 2px white at 0.75, inside. Shadow: `iceGlow`.
- **Product.** A 92 × 92 radius-30 tile, or the product image (contain, 92 × 92).
  - It stays constant in size and rests near the bottom of the body. As the body shrinks, the product pokes out of the top; that's intentional.
  - The fallback tile is the category accent (fashion=coral, tech=lavender, home=butter, beauty=coral100, food=butter, fun=mint, other=lavender) with an inner highlight and a white category glyph (40, stroke 2.2, opacity 0.92).
- **Frost.** A white overlay at the body size with opacity `0.38 → 0.16` as progress goes 0 → 0.75. Optional blur. It sits above the product and below the shine.
- **Bubbles and shine.**
  - Three small white dots at 0.75 opacity.
  - A shine bar (30% of body width × 9, r5) and a dot (9 × 9), white at 0.95, top-left 18,15.
- **Puddle.** An ellipse centred on the ground line.
  - Width `96 → 170`, height `16 → 30`, opacity `0.35 → 0.85`. Radial fill ice400 → ice200 with a 1.5px white border.
  - Add a small white shine ellipse on the puddle.
- **Droplets.** 11 × 14 ice300 ellipses beside the body once progress ≥ 0.25.
- **Thawed** (`thawed` = true or progress ≥ 1):
  - The body has no fill, border or shadow, and frost, shine and bubbles are hidden.
  - The product sits on a 176 × 32 puddle at 0.9 opacity.
  - Two sparkle icons (butter500) float: left at 30,40 (22) and right at 150,26 (18), gently bobbing (±4px, 2.4s loop).
- **Idle animation** while cooling: a very subtle breathing (scaleY 1 ↔ 1.01, 3s) plus a droplet that drips from the right edge every ~6s.
- **Stages for static renders:** `meltStage(progress)` gives 0, 25, 50, 75 or 100. Animate continuously in the app.

**ItemCard** — 170 wide; two per row with a 13 gap.
- Padding 12, gap 8, white, `raised`, r28.
- **Stage:** 146 × 128, r20, ice50 background (mint100 when ready), with the Cube at size about 128 bottom-aligned.
- **Name:** Title/S, one line, ellipsis.
- **Row:** price in Label/M plum500 on the left, Pill on the right (Ice with `formatTimeLeft`, or Ready).
- **Ready variant:** 2.5px mint border.
- **Press:** `spring.press` → `/item/[id]`, or `/thawed/[id]` when ready.

**SavedBanner** — plum background, r28, padding 16, `button` shadow.
- Left: a stack of 3 coins (36). Middle: "$934 saved" (Numeric/M, white) and "by letting 8 wants melt away" (Body/S, white at 70%). Right: chevron.
- Press → Saved tab.

**ReadyBanner**
- White, 2.5px mint border, r28, padding 12, `raised`.
- 76 × 76 mint100 stage with the thawed cube; name (Title/S) and "$65 · thawed 2h ago" (Body/S plum500); a small plum "Decide" button (padding 16/12, Label/M).

**TabBar** — floating, 353 × 76, its bottom edge 24pt above the screen bottom (no extra safe-area inset).
- White at 0.92, backdrop blur 20, `raised`, pill-shaped, horizontal padding 20.
- Tabs: Freezer (snowflake), Saved (coins), [FAB], Insights (chart), You (user).
- Each tab is a 24 icon over a Caption label. Active tabs are plum; inactive ones are plum300.
- The FAB is a 58 plum circle with a white plus and `button` shadow. It opens `/freeze`.

**TextField**
- A Caption label (plum500, uppercase) with a gap of 8 above a 56-high field.
- The field: cream200, r20, inset (pressed) shadow, horizontal padding 16, optional 20px leading icon, Body/L value text, plum300 placeholder.

**CooldownPicker**
- Four options of 80 × 84, gap 11: "24 / hours", "3 / days", "1 / week", "30 / days".
- Each option shows a value (Numeric/M) over a unit (Label/S).
- Selected: ice200 + `iceGlow` + 2px ice300 border, with ice800 text. Unselected: white + `soft`.

**ReflectionCard**
- lavender100 background, r28, padding 20, gap 12, `soft`.
- Eyebrow: a sparkle icon (lavender500) and "WHILE IT MELTS" (Caption plum500).
- The prompt is Title/M. Below it, an "Another question ›" link in Label/S plum500 that cycles prompts.

**Jar** — 220 × 262.
- Mint lid: 150 × 38, r16, `raised`, at the top.
- Glass: 210 × 214, r68, white at 0.45, 3px white border, an inner ice tint and soft shadow, clipped.
- Coins fill from the bottom in staggered rows of 6. Coins are 38 with a row step of 26, rotated ±14°.
- Fill level is goal progress: rows = round(progress × 6). With no goal, use min(6, letGoCount).
- Two vertical shine bars sit on the left.

**Coin** — a 40 butter500 circle.
- Inner face: 28, butter300. Edge shades: a white inner highlight on top and #C9861A at 0.45 at the bottom.
- An embossed snowflake (#D99A2B), and a drop shadow.

**Confetti / CoinBurst** — see motion in §5.

## 4. Screens and routes (expo-router)

```
app/_layout.tsx           Stack, fonts; redirect to /onboarding unless settings.onboarded
app/onboarding.tsx        3-slide pager
app/(tabs)/_layout.tsx    Tabs with custom TabBar (FAB → /freeze)
app/(tabs)/index.tsx      Freezer (home)
app/(tabs)/saved.tsx      Saved jar
app/(tabs)/insights.tsx   Insights
app/(tabs)/you.tsx        You / settings (+ demo controls)
app/freeze.tsx            Freeze sheet (modal, formSheet style) + freezing moment
app/item/[id].tsx         Item detail — cooling
app/thawed/[id].tsx       Thawed decision (fullScreenModal)
app/let-go/[id].tsx       Let-go celebration (fullScreenModal, auto → saved)
```

### 4.1 Onboarding (3 slides, swipeable, page dots)
Each slide is a cream canvas with a hero illustration in the top 55%, a Display/L title, Body/L copy in plum500, and dots plus a CTA at the bottom.

1. **"Wants melt. Money doesn't."**
   - Illustration: a big frozen Cube (sneakers) with snow dots.
   - Copy: "Freeze the things you’re itching to buy. If you still want them when they thaw, go for it."
2. **"Give it time to cool."**
   - Illustration: three cubes at melt 0/50/75 in a row, with a lavender glow.
   - Copy: "Pick a cooldown — a day, three, a week. We’ll nudge you when it’s ready."
3. **"Let it go, watch it grow."**
   - Illustration: a Jar (Level Mid) with coins dropping in.
   - Copy: "Everything you let go drops into your jar. Watch your savings pile up."
   - CTAs: Primary "Start my freezer" sets onboarded with no demo. Ghost "Try it with a sample freezer" calls `seedDemo` and sets onboarded.
   - Notification permission is asked when the first item is frozen, not here.

Slides 1–2 have a Primary "Next" button and a "Skip" text link at the top right.

### 4.2 Freezer — home (`01 Freezer — Home`, see the PNG)
Background: lavender100 glow top-right and ice200 glow top-left.

- **Header**
  - Caption date ("TUESDAY, OCT 14") over "Your freezer" (Display/L).
  - Subtitle in Body/M plum500: "{n} wants cooling · {m} ready to decide".
  - A Surface IconButton (bell) on the right opens notification settings (the You tab).
- **SavedBanner**, shown when savedCents > 0.
- **"Ready to decide" section:** title + mint dot, then a ReadyBanner per ready item (max 3, then "+N more"). Shown only when ready items exist.
- **"Cooling" section:** "Cooling" (Title/M) on the left, "Soonest first" (Label/S plum500) on the right. A 2-column ItemCard grid sorted by thawAt.
- **Empty state** (no items at all):
  - A centred frozen Cube with the bag glyph.
  - "Your freezer is empty" (Title/L) / "Next time something tempts you, freeze it here first." (Body/M).
  - Primary button "Freeze something" → `/freeze`.
- The bottom 170pt has a cream fade gradient under the tab bar, anchored to the screen bottom. Content scrolls under the tab bar, with bottom padding 130.
- Live updates: re-render every 30s, or every second when any item has less than 1 hour left.

### 4.3 Freeze sheet (`app/freeze.tsx`)
A modal sheet with a cream background, top radius 36, and a 36 × 5 grabber.

- **Title:** "Freeze it" (Title/L), with a Glass IconButton (close) on the right.
- **Clipboard suggestion:** when `readClipboardSuggestion()` returns something, show an ice100 card: "Paste from clipboard? nike.com/…", with a mini Ice button "Paste".
- **Photo:** a 120 × 120 tile, r28, sunken.
  - Empty: camera icon + "Add photo" (Label/S). Tapping it opens the image picker.
  - Filled: the photo.
- **Fields**
  - "WHAT IS IT?": Text Field with placeholder "Chunky sneakers".
  - "PRICE": numeric, with the currency symbol prefix.
  - "LINK (OPTIONAL)": link icon.
- **"WHY DO YOU WANT IT?"** A wrap row of mood chips (optional, single select).
- **Category** chips (auto-guessed from name or URL via `guessCategory`, editable).
- **"COOLDOWN":** CooldownPicker, default `settings.defaultCooldown`.
- **Sticky bottom:** an Ice button "Freeze it" (snowflake icon) at full width. It is disabled until name and price are valid.
- **On submit — the freezing moment** (about 1.6s, a full-sheet overlay):
  1. The product tile drops from above into the centre (`spring.pop`, with squash scaleY 0.85 → scaleX 1.08 on landing).
  2. The cube body grows around it from scale 0.6 → 1, and frost fades in over 400ms.
  3. Snow dots burst outward.
  4. `haptics.success`. Text: "Frozen solid. See you in 3 days." (Title/M).
  5. Then `router.replace('/item/[id]')`.

  Before navigating: `ensurePermission()` on the first freeze, then `scheduleThawNotification` → `setNotificationId`.

### 4.4 Item — cooling (`02 Item — Cooling`, see the PNG)
- **Backdrop:** an ice gradient over the top 470pt (#CDEBFF → #EAF6FF → cream), a lavender glow on the right, and floating snow dots that drift slowly.
- **Nav:** Glass back button; centre "Frozen {relative} ago" (Label/S ice800); Glass arrow-up-right that opens the url (hidden without a url).
- **Hero:** the Cube at size about 230, continuously animated with its idle breathing.
- **Countdown:**
  - The big time left uses `formatTimeLeft` without the " left" suffix ("29h 14m"), in Numeric/XL.
  - Below it, a 260 × 12 progress track (ice100, inset) with a gradient fill (ice300 → ice600) at the melt %.
  - Then the caption "58% MELTED · THAWS THU 9:41 PM" (ice800).
- **Details card:** white, r28, padding 20, `raised`.
  - Name (Title/L) with price (Numeric/M) on the right.
  - Chips for the mood ("Felt hyped" with its icon) and the category.
  - An optional note in Body/M.
- **ReflectionCard:** uses `reflectionPromptFor(item, now)`; "Another question" cycles through `REFLECTION_PROMPTS`.
- **Ghost "Thaw it early"** (hourglass). It opens a confirm dialog: "Thaw it now?" / "Waiting is the whole trick — but it’s your call." with buttons "Keep it frozen" (Primary) and "Thaw now" (Ghost). Then `thawEarly`, then `/thawed/[id]`.
- If the item becomes ready while this screen is open, auto-navigate to `/thawed/[id]` (replace).

### 4.5 Thawed decision (`03 Thawed — Still want it?`, see the PNG)
- **Glows:** mint100 large (left/centre) and butter100 (top-right).
- **Close:** a Glass close button at the top right.
- **Headline:**
  - Eyebrow: sparkles + "IT’S THAWED" (Caption mint700).
  - "Still want the {name lowercased unless proper}?" (Display/L, centred, wraps).
- **Cube:** thawed, size about 250, with sparkles bobbing.
- **Context card:** white at 0.8 + blur, r28, padding 16, gap 12.
  - A 44 coral100 circle holding the mood icon.
  - "Frozen {n} days ago" (Label/M) over "Felt {mood} · {time-of-day phrase}" (Body/S plum500). Time-of-day phrases:
    - 22:00–04:59 "late-night scroll"
    - 05:00–11:59 "morning browse"
    - 12:00–17:59 "afternoon break"
    - 18:00–21:59 "evening wind-down"
  - Price (Numeric/M) on the right.
- **Actions** (bottom, gap 12):
  - Mint "Let it go · save $140" (coins icon): `decide(id, 'let-go')` → `/let-go/[id]` (replace).
  - Secondary "Yes, I’ll buy it" (bag icon): `decide(id, 'bought')` → a short celebration overlay "Enjoy it — you earned the certainty." with confetti, `haptics.success`, then it opens the url if present and returns home.
  - Ghost "Refreeze for {cooldown label}" (refresh icon): `refreeze(id)` → `/item/[id]` (replace).
  - Footnote: "No wrong answer. Buying is allowed." (Body/S plum300).

### 4.6 Let-go celebration (`app/let-go/[id].tsx`)
A full screen on a mint100 → cream gradient. Sequence, about 2.4s:
1. The thawed product tile fades and shrinks while 8–10 Coins burst outward from its centre (random arc, rotation, `spring.pop`).
2. The coins fall into a Jar that rises from the bottom, with `haptics.heavy` on the burst.
3. The amount counts up: "+$140" (Numeric/XL, mint700) under "Let go. Nice." (Display/L).
4. Total line: "$1,074 saved so far" (Body/L plum500).
5. If there's a goal, a progress bar shows "Weekend in Lisbon · 63%".

Primary button "Back to my freezer" → `/` (dismiss), and Ghost "See my jar" → `/saved`.

### 4.7 Saved (tab)
- **Header:** "Saved" (Display/L), with "by letting things melt" (Body/M plum500) below.
- **Hero:** the big Jar (level from goal progress), centred, with a lavender glow behind it. The total ("$934", Numeric/XL) sits above the jar.
- **Goal card:** white, r28.
  - Goal name (Title/S) + "$934 of $1,200" (Body/S) + a progress bar (mint gradient) + percent.
  - If there's no goal, show a dashed card: "Saving for something? Add a goal".
  - Tap → an edit-goal sheet (name + amount).
- **"Melted away" list:** let-go items, newest first. Each row has:
  - A 48 product thumb.
  - The name, and "Let go Oct 12 · waited 3 days".
  - The price in mint700 Label/M with a "+" prefix.
  - Rows are white, r20, `soft`, gap 10.
- **"You bought"** collapsible section, with a neutral tone (no judgement).

### 4.8 Insights (tab)
- **Header:** "Insights" (Display/L).
- **Hero stat card:** plum background.
  - "You let go of 6 of 8 wants" (Title/M white).
  - A big keep-rate ring: a donut, mint for let-go and coral300 for bought, with the centre showing "75%" (Numeric/L white) and "let go".
- **"When impulses strike":**
  - A 7-column weekday bar chart (`byWeekday`). Bars are ice300, and the peak bar is lavender500 with a tooltip.
  - Caption: "Your peak: Sunday around 11 PM" from `peakImpulseWindow`.
- **"What you were feeling":** a mood breakdown as horizontal bars, one per mood, each with its icon, count and the % let go.
- **"By category":** a 2-column grid of category tiles, each with an icon, count and cents.
- **"Longest streak":** "3 let-gos in a row" with flame icons.
- **Empty state** (fewer than 2 decisions): a Cube at melt 50 and "Insights appear after a few decisions."

### 4.9 You (tab)
- **Header:** "You".
- **Settings rows**, as white r20 cards with `soft`:
  - Default cooldown (opens the CooldownPicker in a sheet).
  - Currency (USD/EUR/GBP/INR/JPY…, segmented or list).
  - Notifications (a toggle that calls ensurePermission).
  - Savings goal.
- **Demo controls** card, so portfolio viewers can play:
  - "Load sample freezer" (seedDemo), "Fast-forward 1 day" and "Reset everything" (a confirm dialog, then resetAll).
  - Fast-forward is implemented with `src/lib/clock.ts`: a persisted `timeOffsetMs` in settings. `now()` returns `Date.now() + offset`, and `useNow(intervalMs)` ticks. Every screen must use `now()` or `useNow()`, never `Date.now()` directly.
- **About:** "Chill v1 · made with care", and "Why waiting works", which opens a short sheet: "Impulse wants peak fast and fade. A cooling-off period lets the calmer you decide."

## 5. Motion summary
- **Press:** `spring.press` on every pressable. Cards also lift their shadow slightly on press-out.
- **Freeze moment:** see §4.3.
- **Melt:** continuous, from `meltProgress`, interpolating body w/h/radius, frost opacity, puddle w/h/opacity and product y.
- **Thaw arrival:** when an item turns ready while you're on Home, its card flips to the Ready variant with a mint flash, the sparkles pop in, and the card moves to the Ready section with a layout animation.
- **Let go:** see §4.6. **Buy:** confetti, 24 pieces in coral, mint, butter and lavender, about 1.2s.
- **Tab change:** cross-fade 180ms; the active icon bounces (scale 1 → 1.15 → 1).
- **Reduced motion:** cross-fades only, and the coin burst is replaced by a fade-in of the jar.

## 6. Copy bank
- **Freeze CTA:** "Freeze it".
- **Toast after freeze:** "Frozen solid. See you in {cooldown}."
- **Notification:** "Your {name} has thawed 🧊" / "Still want it? Tap to decide." (the native notification may use emoji).
- **Thaw early confirm:** "Thaw it now?" / "Waiting is the whole trick — but it’s your call."
- **Empty home:** "Your freezer is empty" / "Next time something tempts you, freeze it here first."
- **Let go:** "Let go. Nice." / "+$140" / "$1,074 saved so far".
- **Buy:** "Enjoy it — you earned the certainty."

## 7. Images
**Product renders:** transparent 512px PNGs in `assets/products/` (sneakers, airfryer, headphones, jacket, lamp, coin).
- Demo items map to images via `DEMO_IMAGE_KEYS` in `src/store/demo.ts`.
- User items use `imageUri`. Without an image, the Cube falls back to the category tile + glyph.

**AI thumbnails** of the hero illustrations are in `design/assets/ai-thumbs/` (256px, reference only).
