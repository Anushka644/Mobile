// Icon + color mappings for moods and categories (spec §3 Chip, Cube fallback tile).
// Use these instead of the emoji labels in src/types.ts: emoji don't render consistently.

import { colors } from '@/theme/tokens';
import type { Category, Mood } from '@/types';

import type { IconName } from './icons';

/** Mood chip icons: bored→meh, sad→frown, hyped→flame, stressed→zap, need→check. */
export const MOOD_ICONS: Record<Mood, IconName> = {
  bored: 'meh',
  sad: 'frown',
  hyped: 'flame',
  stressed: 'zap',
  need: 'check',
};

/** Category icons: fashion→shirt, tech→headphones, home→lamp, beauty→sparkles, food→cooking-pot, fun→gamepad, other→bag. */
export const CATEGORY_ICONS: Record<Category, IconName> = {
  fashion: 'shirt',
  tech: 'headphones',
  home: 'lamp',
  beauty: 'sparkles',
  food: 'cooking-pot',
  fun: 'gamepad',
  other: 'bag',
};

/**
 * Cube fallback tile color per category (spec §3 Cube → Product). Beauty uses coral300 rather than
 * the spec's coral100 so the white glyph stays legible.
 */
export const CATEGORY_ACCENT: Record<Category, string> = {
  fashion: colors.coral500,
  tech: colors.lavender500,
  home: colors.butter500,
  beauty: colors.coral300,
  food: colors.butter500,
  fun: colors.mint500,
  other: colors.lavender500,
};

/** Soft background per mood for round mood badges (e.g. the Thawed context card's 44 circle). */
export const MOOD_TINT: Record<Mood, string> = {
  bored: colors.lavender100,
  sad: colors.ice100,
  hyped: colors.coral100,
  stressed: colors.butter100,
  need: colors.mint100,
};

/** Foreground for MOOD_TINT badges. */
export const MOOD_INK: Record<Mood, string> = {
  bored: colors.lavender500,
  sad: colors.ice600,
  hyped: colors.coral500,
  stressed: colors.butter600,
  need: colors.mint700,
};

/** Name keywords → a more specific fallback glyph than the category's (the Figma uses footprints for sneakers, a pot for the air fryer). */
const NAME_GLYPHS: readonly [RegExp, IconName][] = [
  [/sneaker|shoe|boot|trainer|heel|sandal|loafer/i, 'footprints'],
  [/fryer|pot\b|pan\b|kettle|blender|espresso|coffee|toaster|kitchen|cook/i, 'cooking-pot'],
  [/headphone|earbud|airpod|speaker/i, 'headphones'],
  [/lamp|light|candle/i, 'lamp'],
  [/jacket|shirt|tee\b|t-shirt|hoodie|sweater|scarf|dress|coat|jeans/i, 'shirt'],
  [/game|console|controller|lego|puzzle|switch\b/i, 'gamepad'],
];

/** Fallback-tile glyph for an item: a name-specific glyph when one matches, else the category icon. */
export function glyphForItem(item: { name: string; category: Category }): IconName {
  for (const [pattern, glyph] of NAME_GLYPHS) if (pattern.test(item.name)) return glyph;
  return CATEGORY_ICONS[item.category];
}
