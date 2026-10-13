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
 * v2: category and mood marks are monochrome — the product photos carry the colour. Kept as maps so
 * callers can still look them up per key.
 */
export const CATEGORY_ACCENT: Record<Category, string> = {
  fashion: colors.cream200,
  tech: colors.cream200,
  home: colors.cream200,
  beauty: colors.cream200,
  food: colors.cream200,
  fun: colors.cream200,
  other: colors.cream200,
};

/** Soft background per mood badge (v2: one quiet paper tone). */
export const MOOD_TINT: Record<Mood, string> = {
  hyped: colors.cream200,
  bored: colors.cream200,
  stressed: colors.cream200,
  sad: colors.cream200,
  need: colors.cream200,
};

/** Foreground for MOOD_TINT badges. */
export const MOOD_INK: Record<Mood, string> = {
  hyped: colors.plum900,
  bored: colors.plum900,
  stressed: colors.plum900,
  sad: colors.plum900,
  need: colors.plum900,
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
