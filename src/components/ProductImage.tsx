import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { resolvePhotoUri } from '@/lib/photos';
import { DEMO_IMAGE_KEYS, isDemoItem } from '@/store/demo';
import { colors, radius as radii } from '@/theme/tokens';
import type { Category, Item } from '@/types';

import { CATEGORY_ACCENT, CATEGORY_ICONS, glyphForItem } from './glyphs';
import { Icon, type IconName } from './Icon';
import { tintFor } from './tints';

/** A bundled asset (`require(...)` module id) or a remote / file uri. */
export type ProductImageSource = number | { uri: string };

/** Transparent 512px product renders in assets/products (spec §7). */
export const PRODUCT_IMAGES = {
  sneakers: require('../../assets/products/sneakers.png') as number,
  airfryer: require('../../assets/products/airfryer.png') as number,
  headphones: require('../../assets/products/headphones.png') as number,
  jacket: require('../../assets/products/jacket.png') as number,
  lamp: require('../../assets/products/lamp.png') as number,
  coin: require('../../assets/products/coin.png') as number,
} as const;

export type ProductImageKey = keyof typeof PRODUCT_IMAGES;

function isProductImageKey(key: string): key is ProductImageKey {
  return Object.prototype.hasOwnProperty.call(PRODUCT_IMAGES, key);
}

/**
 * The picture for an item: its own `imageUri`, else — for a demo item only — the bundled render
 * (via DEMO_IMAGE_KEYS by name), else null: a user item without a photo shows its category tile
 * even when its name matches a demo item's (spec §7).
 */
export function productImageFor(item: Pick<Item, 'id' | 'name' | 'imageUri'>): ProductImageSource | null {
  if (item.imageUri) return { uri: resolvePhotoUri(item.imageUri) };
  if (!isDemoItem(item)) return null;
  const key = DEMO_IMAGE_KEYS[item.name];
  return key && isProductImageKey(key) ? PRODUCT_IMAGES[key] : null;
}

/** Normalizes an image prop (source, uri string or nothing) to a source or null. */
export function toImageSource(image: ProductImageSource | string | null | undefined): ProductImageSource | null {
  if (image == null || image === '') return null;
  return typeof image === 'string' ? { uri: resolvePhotoUri(image) } : image;
}

/**
 * `source` until it fails to load, then null (so callers fall back to the category tile — e.g. a
 * photo whose file is gone). Pass the returned `onError` to the expo-image <Image>.
 */
export function useImageFallback(source: ProductImageSource | null): {
  source: ProductImageSource | null;
  onError: () => void;
} {
  const key = source == null ? null : typeof source === 'number' ? `asset:${source}` : source.uri;
  const [failed, setFailed] = useState<string | null>(null);
  const onError = useCallback(() => {
    if (key != null) setFailed(key);
  }, [key]);
  return { source: key != null && key === failed ? null : source, onError };
}

// ---------------------------------------------------------------------------

export interface ProductTileProps {
  category: Category;
  /** Glyph override (defaults to CATEGORY_ICONS[category]). */
  glyph?: IconName;
  /** Tile size. Default 92 (radius scales: 30 at 92). */
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** The fallback product: a quiet paper tile with a thin ink glyph (v2). */
export function ProductTile({ category, glyph, size = 92, style }: ProductTileProps) {
  const r = Math.round(size * 0.26);
  return (
    <View
      style={[{ width: size, height: size, borderRadius: r, backgroundColor: CATEGORY_ACCENT[category] }, styles.center, style]}
    >
      <Icon
        name={glyph ?? CATEGORY_ICONS[category]}
        size={Math.round(size * 0.42)}
        color={colors.plum900}
        strokeWidth={1.5}
        opacity={0.6}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------

export interface ProductThumbProps {
  item: Pick<Item, 'id' | 'name' | 'imageUri' | 'category'>;
  /** Default 48. */
  size?: number;
  /** Background behind a picture. Default: the item's product tint (v2.1). */
  background?: string;
  style?: StyleProp<ViewStyle>;
}

/** Small square thumbnail for lists (Saved "Melted away" rows): picture on a soft tile, or the category tile. */
export function ProductThumb({ item, size = 48, background, style }: ProductThumbProps) {
  const { source, onError } = useImageFallback(productImageFor(item));
  if (!source)
    return (
      <ProductTile
        category={item.category}
        glyph={glyphForItem(item)}
        size={size}
        style={[{ backgroundColor: background ?? tintFor(item).bg }, style]}
      />
    );
  // A user photo fills the thumb; a bundled render sits inside it (on web both are objects).
  const isPhoto = !!item.imageUri;
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: Math.min(radii.md, Math.round(size * 0.26)),
          backgroundColor: background ?? tintFor(item).bg,
          overflow: 'hidden',
        },
        styles.center,
        style,
      ]}
    >
      <Image
        source={source}
        contentFit={isPhoto ? 'cover' : 'contain'}
        style={isPhoto ? StyleSheet.absoluteFill : { width: size * 0.72, height: size * 0.72 }}
        onError={onError}
        accessibilityIgnoresInvertColors
        testID="product-photo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  noTouch: { pointerEvents: 'none' },
});
