// Insights colour pairings (soft tint + ink + bar) per mood and category.
//
// Mood tints and inks are the kit's app-wide MOOD_TINT / MOOD_INK (design/exports/06-insights:
// hyped = coral, bored = butter, stressed = lavender), so a mood looks the same here as on the
// Thawed context card; Insights only adds the bar fill.

import { MOOD_INK, MOOD_TINT } from '@/components';
import { colors } from '@/theme/tokens';
import type { Category, Mood } from '@/types';

export interface Swatch {
  /** Soft background (badge circle, bar track, tile). */
  tint: string;
  /** Icon colour on the tint. */
  ink: string;
  /** Bar fill. */
  bar: string;
}

const MOOD_BAR: Record<Mood, string> = {
  hyped: colors.coral500,
  bored: colors.butter500,
  stressed: colors.lavender500,
  sad: colors.ice400,
  need: colors.mint500,
};

const swatchFor = (mood: Mood): Swatch => ({ tint: MOOD_TINT[mood], ink: MOOD_INK[mood], bar: MOOD_BAR[mood] });

export const MOOD_SWATCH: Record<Mood, Swatch> = {
  hyped: swatchFor('hyped'),
  bored: swatchFor('bored'),
  stressed: swatchFor('stressed'),
  sad: swatchFor('sad'),
  need: swatchFor('need'),
};

export const CATEGORY_SWATCH: Record<Category, Swatch> = {
  fashion: { tint: colors.coral100, ink: colors.coral500, bar: colors.coral500 },
  tech: { tint: colors.lavender100, ink: colors.lavender500, bar: colors.lavender500 },
  home: { tint: colors.butter100, ink: colors.butter600, bar: colors.butter500 },
  beauty: { tint: colors.coral100, ink: colors.coral300, bar: colors.coral300 },
  food: { tint: colors.butter100, ink: colors.butter600, bar: colors.butter500 },
  fun: { tint: colors.mint100, ink: colors.mint700, bar: colors.mint500 },
  other: { tint: colors.ice100, ink: colors.ice800, bar: colors.ice400 },
};
