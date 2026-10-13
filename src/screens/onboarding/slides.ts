// Onboarding content + layout geometry (spec §4.1, design/exports/08..10-onboarding-*@2x.png).
// Pure: no React, so the copy and the bottom-controls maths are unit-testable.

import type { GlowPreset } from '@/components';

export type SlideKey = 'melt' | 'cool' | 'grow';

export interface OnboardingSlide {
  key: SlideKey;
  /** Display/L, with the Figma line break baked in. */
  title: string;
  /** Body/L plum500. */
  body: string;
  /** Background glow preset (spec "Background glows"). */
  glow: GlowPreset;
}

export const SLIDES: readonly OnboardingSlide[] = [
  {
    key: 'melt',
    title: 'Wants melt.\nMoney doesn’t.',
    body: 'Freeze the things you’re itching to buy. If you still want them when they thaw, go for it.',
    glow: 'onboarding1',
  },
  {
    key: 'cool',
    title: 'Give it time\nto cool.',
    body: 'Pick a cooldown — a day, three, a week. We’ll nudge you when it’s ready.',
    glow: 'onboarding2',
  },
  {
    key: 'grow',
    title: 'Let it go,\nwatch it grow.',
    body: 'Everything you let go drops into your jar. Watch your savings pile up.',
    glow: 'onboarding3',
  },
];

export const LAST_SLIDE = SLIDES.length - 1;

// ---------------------------------------------------------------------------
// Bottom controls (dots + CTAs), measured from the PNGs at 393 × 852.
//
// Slides 1–2: dots, 16, Primary "Next" (60), 24 from the bottom.
// Slide 3:    dots, 8, Primary "Start my freezer" (60), 8, Ghost "Try it with a sample freezer" (60), 24.
// The copy block always ends 27 above the dots (body baseline ~35 above), so on slide 3 it sits 60pt higher.

export const DOT_SIZE = 8;
export const DOT_ACTIVE_WIDTH = 24;
export const DOT_GAP = 6;
export const BUTTON_HEIGHT = 60;
export const BUTTON_GAP = 8;
/** Dots → primary button on slides 1–2 (8 on the last slide). */
export const DOTS_TO_BUTTON = 16;
export const DOTS_TO_BUTTON_LAST = 8;
/** Copy block (last line box) → dots. */
export const COPY_TO_DOTS = 27;
/** How far the controls rise on the last slide to make room for the Ghost button. */
export const LAST_SLIDE_RISE = BUTTON_HEIGHT + BUTTON_GAP;

/** Height of the controls stack above the bottom gap: dots + gap + buttons. */
export function controlsHeight(last: boolean): number {
  return last
    ? DOT_SIZE + DOTS_TO_BUTTON_LAST + BUTTON_HEIGHT + BUTTON_GAP + BUTTON_HEIGHT
    : DOT_SIZE + DOTS_TO_BUTTON + BUTTON_HEIGHT;
}

/** Bottom padding of a slide's copy block, from the screen's bottom edge. */
export function copyBottomInset(index: number, bottomGap: number): number {
  return bottomGap + controlsHeight(index === LAST_SLIDE) + COPY_TO_DOTS;
}

/** Clamp a pager position (0 … LAST_SLIDE) to a valid slide index. */
export function clampSlide(index: number): number {
  if (!Number.isFinite(index)) return 0;
  return Math.min(LAST_SLIDE, Math.max(0, Math.round(index)));
}
