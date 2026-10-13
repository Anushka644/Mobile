// Onboarding content + layout geometry (spec §4.1, v2 "frost minimal": docs/DESIGN_SYSTEM_V2.md).
// Pure: no React, so the copy and the bottom-controls maths are unit-testable.

export type SlideKey = 'melt' | 'cool' | 'grow';

export interface OnboardingSlide {
  key: SlideKey;
  /** The headline as plain text (screen readers, tests), with the line break baked in. */
  title: string;
  /** The same headline marked up for <Headline>: the *emotional word* is set in serif italic. */
  headline: string;
  /** Body/L, secondary text. */
  body: string;
}

export const SLIDES: readonly OnboardingSlide[] = [
  {
    key: 'melt',
    title: 'Wants melt.\nMoney doesn’t.',
    headline: 'Wants *melt.*\nMoney doesn’t.',
    body: 'Freeze the things you’re itching to buy. If you still want them when they thaw, go for it.',
  },
  {
    key: 'cool',
    title: 'Give it time\nto cool.',
    headline: 'Give it time\nto *cool.*',
    body: 'Pick a cooldown — a day, three, a week. We’ll nudge you when it’s ready.',
  },
  {
    key: 'grow',
    title: 'Let it go,\nwatch it grow.',
    headline: 'Let it go,\nwatch it *grow.*',
    body: 'Everything you let go drops into your jar. Watch your savings pile up.',
  },
];

export const LAST_SLIDE = SLIDES.length - 1;

// ---------------------------------------------------------------------------
// Chrome. Top row (under the status bar): the pager dashes on the left, "Skip" on the right.
// Bottom, 24pt above the edge (no home indicator):
//   Slides 1–2: Primary "Next".
//   Slide 3:    Primary "Start my freezer", 8, Ghost "Try it with a sample freezer".
// The copy block always ends 32 above the Primary button, so on slide 3 it sits 64pt higher.

/** Height of the top row that holds the dashes and "Skip". */
export const TOP_ROW = 44;
/** Pager dashes: thin ink strokes, the active one longer. */
export const DASH_WIDTH = 12;
export const DASH_ACTIVE_WIDTH = 28;
export const DASH_HEIGHT = 2;
export const DASH_GAP = 6;
/** Button md (56) and the gap between the stacked buttons on the last slide. */
export const BUTTON_HEIGHT = 56;
export const BUTTON_GAP = 8;
/** Copy block (last line box) → Primary button. */
export const COPY_TO_CONTROLS = 32;
/** How far the Primary rises on the last slide to make room for the Ghost button. */
export const LAST_SLIDE_RISE = BUTTON_HEIGHT + BUTTON_GAP;

/** Height of the bottom controls above the bottom gap. */
export function controlsHeight(last: boolean): number {
  return last ? BUTTON_HEIGHT + BUTTON_GAP + BUTTON_HEIGHT : BUTTON_HEIGHT;
}

/** Bottom padding of a slide's copy block, from the screen's bottom edge. */
export function copyBottomInset(index: number, bottomGap: number): number {
  return bottomGap + controlsHeight(index === LAST_SLIDE) + COPY_TO_CONTROLS;
}

/** Clamp a pager position (0 … LAST_SLIDE) to a valid slide index. */
export function clampSlide(index: number): number {
  if (!Number.isFinite(index)) return 0;
  return Math.min(LAST_SLIDE, Math.max(0, Math.round(index)));
}
