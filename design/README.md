# Chill — Design

**Figma file:** https://www.figma.com/design/BOiZOAtr1JNzelDQjUddsC
**User flow (FigJam):** https://www.figma.com/board/tE3zngGbIzRxwwOQrQbe8W

## What's in the Figma file

| Page | Contents |
|---|---|
| 🧊 Cover | A 1920×960 portfolio cover with three device mockups. |
| 01 Research | The case-study board: the problem, cited stats, the key insight and the gap, proto-personas, the How Might We, design principles, solution pillars and success metrics. |
| 02 Design System | Tokens:<ul><li>Primitives, Color, Spacing and Radius variables, with scopes and WEB code syntax.</li><li>15 text styles (Bricolage Grotesque and Nunito).</li><li>6 clay effect styles.</li></ul>Components:<ul><li>Icons (Lucide-style).</li><li>Button (5 styles × 2 states).</li><li>Chip, Pill, Icon Button, Text Field, Cooldown Option, Toggle, Settings Row, Page Dots.</li><li>**Cube** (melt 0/25/50/75/100; all variants share one layer tree so Smart Animate morphs between them).</li><li>Coin, Jar (4 levels), Item Card, Tab Bar.</li><li>Reflection Card, History Row, Product Thumb, Notification, Widget, App Icon.</li></ul> |
| 03 Assets | The app icon at every size. |
| 04 Screens | 14 screens in two flow sections:<ul><li>**Core loop:** home, item cooling, thawed decision, let-go celebration, Saved, Insights, You.</li><li>**Onboarding, freezing & edge states:** onboarding ×3, freeze sheet, frozen-solid moment, empty freezer, lock-screen nudge.</li></ul> |
| 05 Prototype | The screens on 04 are fully wired: 46 interactions using Smart Animate with gentle springs. There are three flow starting points: first run, daily loop and thaw nudge. |
| 06 Motion | Three keyframed scenes: **Freeze moment**, **The melt** and **Let it go**. Each one exports to MP4 from Figma (Export → Video). |
| 07 Marketing | Five App Store screenshot layouts (645×1398, export at 2x). |

## Art direction notes
- **Soft squishy 3D (claymorphism).**
  - Palette: cream canvas, plum ink, coral / lavender / mint / butter accents, and an icy-blue ramp for frozen states.
  - Clay shadows are effect styles: `Clay/Raised`, `Clay/Soft`, `Clay/Button`, `Clay/Pressed`, `Ice/Glow`.
- **Background glows:**
  - Tab screens (home, empty, insights, you) are plain canvas.
  - Every other screen has one wide, very soft top glow (528×358 at −67,−118, blur 200), plus an optional primary glow behind the hero object.
- **No drawn home indicator.** Bottom-anchored content (tab bar, sticky CTAs) sits 24pt above the bottom edge.
- **Never shame.** "Buy it" is a calm secondary button; "Let it go" is the mint positive action.

## Files in this folder
- `exports/` — 2x PNG renders of all 14 screens.
- `marketing/` — the cover export.
- `assets/ai-thumbs/` — the AI-generated 3D clay renders (via Figma AI image generation): the app icon, hero illustrations, the coin and the product renders. The transparent 512px product cut-outs used by the app are in `/assets/products`.

## Known limits (environment)
This build ran in a sandbox whose network policy blocks `figma.com`. As a result:
- **Images:** the AI renders couldn't be uploaded into the Figma file, so in Figma the products show as clay tiles with category glyphs. Allow `figma.com` and `*.figma.com` in the environment's network settings to drop the real renders in.
- **Video:** Figma's video exports can't be downloaded here. The motion scenes export from Figma directly.
- **Rendering:** Figma's server renderer can't draw very large blurs (radius > 200) at high export scales. The Let-go screen keeps the designer's 300 blur in the file, and exports used 200.
