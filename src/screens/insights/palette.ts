// Insights colours (v2 "frost minimal"): ink on paper. Charts read by length and order, not by hue,
// so every mood and category shares one swatch. Ice blue appears once, on the keep-rate bar: the
// share of wants that melted into water.

import { colors } from '@/theme/tokens';
import type { Category, Mood } from '@/types';

export interface Swatch {
  /** Quiet fill behind a bar or glyph. */
  tint: string;
  /** Glyph / label colour. */
  ink: string;
  /** Bar fill. */
  bar: string;
}

/** The one swatch: an ink bar on a paper track. */
const MONO: Swatch = { tint: colors.cream200, ink: colors.plum900, bar: colors.plum900 };

export const MOOD_SWATCH: Record<Mood, Swatch> = {
  hyped: MONO,
  bored: MONO,
  stressed: MONO,
  sad: MONO,
  need: MONO,
};

export const CATEGORY_SWATCH: Record<Category, Swatch> = {
  fashion: MONO,
  tech: MONO,
  home: MONO,
  beauty: MONO,
  food: MONO,
  fun: MONO,
  other: MONO,
};

/** Chart roles. */
export const CHART = {
  /** Weekday bars. */
  bar: colors.cream300,
  /** The peak weekday bar and its label. */
  peak: colors.plum900,
  /** Mood bar tracks. */
  track: colors.cream200,
  /** Keep-rate split bar: the share let go (melted into water) and the share bought. */
  letGo: colors.ice600,
  bought: colors.cream300,
  /** Chart baselines. */
  rule: colors.border.strong,
} as const;
