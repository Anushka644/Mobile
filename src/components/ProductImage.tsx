import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { resolvePhotoUri } from '@/lib/photos';
import { DEMO_IMAGE_KEYS, isDemoItem } from '@/store/demo';
import { colors, radius as radii, withAlpha } from '@/theme/tokens';
import type { Category, Item } from '@/types';

import { CATEGORY_ACCENT, CATEGORY_ICONS, glyphForItem } from './glyphs';
import { Icon, type IconName } from './Icon';

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

/**
 * The fallback product: a clay tile in the category accent with an inner highlight and a white
 * glyph (40 at 92, stroke 2.2, opacity 0.92) — spec §3 Cube → Product.
 */
export function ProductTile({ category, glyph, size = 92, style }: ProductTileProps) {
  const accent = CATEGORY_ACCENT[category];
  const k = size / 92;
  const r = 30 * k;
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: r,
          backgroundColor: accent,
          boxShadow: [
            `inset 0px ${5 * k}px ${8 * k}px 0px ${withAlpha(colors.white, 0.45)}`,
            `inset 0px ${-7 * k}px ${12 * k}px 0px ${withAlpha(colors.plum900, 0.1)}`,
            `0px ${8 * k}px ${16 * k}px ${-5 * k}px ${withAlpha(colors.plum900, 0.22)}`,
          ].join(', '),
        },
        styles.center,
        style,
      ]}
    >
      <LinearGradient
        colors={[withAlpha(colors.white, 0.3), withAlpha(colors.white, 0)]}
        locations={[0, 0.6]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: r }, styles.noTouch]}
      />
      <Icon
        name={glyph ?? CATEGORY_ICONS[category]}
        size={Math.round(40 * k)}
        color={colors.white}
        strokeWidth={2.2}
        opacity={0.92}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------

export interface ProductThumbProps {
  item: Pick<Item, 'id' | 'name' | 'imageUri' | 'category'>;
  /** Default 48. */
  size?: number;
  /** Background behind a picture. Default cream200 (sunken). */
  background?: string;
  style?: StyleProp<ViewStyle>;
}

/** Small square thumbnail for lists (Saved "Melted away" rows): picture on a soft tile, or the category tile. */
export function ProductThumb({ item, size = 48, background = colors.bg.sunken, style }: ProductThumbProps) {
  const { source, onError } = useImageFallback(productImageFor(item));
  if (!source) return <ProductTile category={item.category} glyph={glyphForItem(item)} size={size} style={style} />;
  const isPhoto = typeof source !== 'number';
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: Math.min(radii.md, size * 0.33),
          backgroundColor: background,
          overflow: 'hidden',
        },
        styles.center,
        style,
      ]}
    >
      <Image
        source={source}
        contentFit={isPhoto ? 'cover' : 'contain'}
        style={isPhoto ? StyleSheet.absoluteFill : { width: size * 0.82, height: size * 0.82 }}
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
