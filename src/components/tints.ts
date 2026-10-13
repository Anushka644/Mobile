// Product tints (v2.1): the colour of a want's frost tile, taken from its product.
import { DEMO_IMAGE_KEYS, isDemoItem, type DemoImageKey } from '@/store/demo';
import { tints, type TintName } from '@/theme/tokens';
import type { Category, Item } from '@/types';

/** Tint per bundled demo product (its dominant colour). */
const DEMO_TINTS: Record<DemoImageKey, TintName> = {
  sneakers: 'coral',
  airfryer: 'butter',
  headphones: 'lavender',
  jacket: 'mint',
  lamp: 'butter',
  watch: 'sky',
  skincare: 'rose',
  lego: 'rose',
  espresso: 'sand',
  tee: 'coral',
  chair: 'lavender',
  phonecase: 'sky',
  scarf: 'rose',
};

/** Tint per category, for user items (and demo items without a mapped picture). */
export const CATEGORY_TINTS: Record<Category, TintName> = {
  fashion: 'coral',
  tech: 'lavender',
  home: 'butter',
  beauty: 'rose',
  food: 'sand',
  fun: 'mint',
  other: 'sky',
};

/** The tint name for an item: its demo product's colour, else its category's. */
export function tintNameFor(item: Pick<Item, 'id' | 'name' | 'category'>): TintName {
  if (isDemoItem(item)) {
    const key = DEMO_IMAGE_KEYS[item.name];
    if (key && key in DEMO_TINTS) return DEMO_TINTS[key];
  }
  return CATEGORY_TINTS[item.category];
}

/** The `{ bg, deep }` colours for an item's tile. */
export function tintFor(item: Pick<Item, 'id' | 'name' | 'category'>): (typeof tints)[TintName] {
  return tints[tintNameFor(item)];
}
