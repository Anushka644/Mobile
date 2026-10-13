// Insights colour pairings (soft tint + ink + bar) per mood and category.
//
// The mood rows follow design/exports/06-insights@2x.png: hyped = coral, bored = butter,
// stressed = lavender. (The kit's MOOD_TINT maps bored → lavender and stressed → butter, which
// suits the Thawed context card but not this chart, so Insights keeps its own table.)

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

export const MOOD_SWATCH: Record<Mood, Swatch> = {
  hyped: { tint: colors.coral100, ink: colors.coral500, bar: colors.coral500 },
  bored: { tint: colors.butter100, ink: colors.butter600, bar: colors.butter500 },
  stressed: { tint: colors.lavender100, ink: colors.lavender500, bar: colors.lavender500 },
  sad: { tint: colors.ice100, ink: colors.ice600, bar: colors.ice400 },
  need: { tint: colors.mint100, ink: colors.mint700, bar: colors.mint500 },
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
