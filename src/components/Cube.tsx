// The hero object (v2 "frost minimal"): a square of frosted glass with the want inside.
//
// While an item cools, a frost layer covers the tile from the bottom up to the share of the cooldown
// that is left: at progress 0 the whole tile is frosted (the product is a soft blur behind it), and
// the frost line sinks as the want melts until, thawed, the glass is clear. A slow glint crosses the
// frost now and then. Everything melt-related runs on Reanimated shared values: progress animates
// over 600ms when the prop changes, the thawed state clears the frost.
//
// The frost blurs a second copy of the product (expo-image `blurRadius`), so it looks the same on
// iOS, Android and web without a native backdrop blur.

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { meltProgress } from '@/lib/melt';
import { colors, withAlpha } from '@/theme/tokens';
import type { Category, Item } from '@/types';

import { CATEGORY_ICONS, glyphForItem } from './glyphs';
import { Icon, type IconName } from './Icon';
import { timingMelt, useReducedMotion } from './motion';
import { productImageFor, toImageSource, useImageFallback, type ProductImageSource } from './ProductImage';

export interface CubeProps {
  /** Melt progress 0..1 (continuous; use meltProgress(item, now)). */
  progress: number;
  /** Thawed state (also implied by progress >= 1): the frost is gone and the glass is clear. */
  thawed?: boolean;
  /** Tile size in px (square). Default 200. */
  size?: number;
  /** Product picture: a bundled asset, `{ uri }` or a uri string. Without one, the category glyph is used. */
  image?: ProductImageSource | string | null;
  /** Fallback glyph's category. Default 'other'. */
  category?: Category;
  /** Fallback glyph override (e.g. 'footprints' for sneakers). */
  glyph?: IconName;
  /** Idle glint across the frost while cooling. Default true. */
  animated?: boolean;
  /** Corner radius. Default 22% of the size. */
  radius?: number;
  /**
   * The picture is a photo (fills the tile) rather than a transparent product render (sits inside it).
   * Default: true for a uri string. (On web a bundled asset is an object too, so it can't be inferred.)
   */
  photo?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

/** Product render size inside the tile (bundled cut-outs; photos fill the tile). */
const PRODUCT_SHARE = 0.6;

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

/** The frosted-glass tile (see file header). */
export const Cube = memo(function Cube({
  progress,
  thawed = false,
  size = 200,
  image,
  category = 'other',
  glyph,
  animated = true,
  radius,
  photo,
  style,
  accessibilityLabel,
  testID,
}: CubeProps) {
  const target = clamp01(progress);
  const isThawed = thawed || target >= 1;
  const reduced = useReducedMotion();
  // A photo that fails to load (e.g. its file is gone) falls back to the category glyph.
  const { source, onError: onImageError } = useImageFallback(toImageSource(image));
  const isPhoto = source != null && (photo ?? typeof image === 'string');
  const r = radius ?? Math.max(10, Math.round(size * 0.22));
  const blur = Math.max(5, Math.round(size * 0.09));

  // Frost cover 0..1 of the tile height.
  const cover = useSharedValue(isThawed ? 0 : 1 - target);
  const glint = useSharedValue(0);

  useEffect(() => {
    cover.set(withTiming(isThawed ? 0 : 1 - target, isThawed ? { duration: reduced ? 220 : 900 } : timingMelt));
  }, [cover, target, isThawed, reduced]);

  const idle = animated && !reduced && !isThawed;
  useEffect(() => {
    if (!idle) return;
    glint.set(
      withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withDelay(2600, withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.cubic) })),
          withDelay(3200, withTiming(1, { duration: 0 }))
        ),
        -1
      )
    );
    return () => {
      cancelAnimation(glint);
      glint.set(0);
    };
  }, [idle, glint]);

  const frostStyle = useAnimatedStyle(() => ({ height: cover.get() * size }));
  const edgeStyle = useAnimatedStyle(() => ({ opacity: cover.get() > 0.003 && cover.get() < 0.997 ? 1 : 0 }));
  const glintStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -size * 0.9 + glint.get() * size * 2.2 }, { rotate: '20deg' }],
  }));

  const product = (blurred: boolean) =>
    source ? (
      <Image
        source={source}
        contentFit={isPhoto ? 'cover' : 'contain'}
        blurRadius={blurred ? blur : 0}
        style={isPhoto ? StyleSheet.absoluteFill : { width: size * PRODUCT_SHARE, height: size * PRODUCT_SHARE }}
        onError={blurred ? undefined : onImageError}
        accessibilityIgnoresInvertColors
        testID={blurred ? undefined : 'product-photo'}
      />
    ) : (
      <Icon
        name={glyph ?? CATEGORY_ICONS[category]}
        size={Math.round(size * 0.3)}
        color={colors.plum900}
        strokeWidth={1.4}
        opacity={blurred ? 0.25 : 0.55}
      />
    );

  return (
    <View
      style={[styles.tile, { width: size, height: size, borderRadius: r }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? (isThawed ? 'Thawed' : `${Math.round(target * 100)}% melted`)}
      testID={testID}
    >
      <LinearGradient
        colors={isThawed ? [colors.white, colors.ice50] : [colors.ice50, colors.ice100]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, styles.center]}>{product(false)}</View>

      {/* Frost: anchored to the bottom, its height is the share of the cooldown still left. */}
      <Animated.View style={[styles.frost, frostStyle]}>
        <View style={[styles.frostContent, { width: size, height: size }]}>
          <LinearGradient colors={[colors.ice50, colors.ice100]} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.center]}>{product(true)}</View>
          <View style={[StyleSheet.absoluteFill, styles.frostTint]} />
        </View>
        <Animated.View style={[styles.glint, { width: size * 0.32, height: size * 2, top: -size * 0.5 }, glintStyle]}>
          <LinearGradient
            colors={[withAlpha(colors.white, 0), withAlpha(colors.white, 0.55), withAlpha(colors.white, 0)]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View style={[styles.edge, edgeStyle]} />
      </Animated.View>

      {/* Glass rim: a bright inner hairline and a faint outer one. */}
      <View style={[StyleSheet.absoluteFill, styles.rim, { borderRadius: r }]} />
    </View>
  );
});

// ---------------------------------------------------------------------------

export interface ItemCubeProps extends Omit<CubeProps, 'progress' | 'thawed' | 'image' | 'category' | 'glyph'> {
  item: Item;
  /** App time (useNow()); progress = meltProgress(item, now) and thawed = now >= thawAt. */
  now?: number;
  /** Explicit progress (overrides `now`). */
  progress?: number;
  /** Explicit thawed state (overrides `now`). */
  thawed?: boolean;
}

/**
 * The tile for an item: resolves its picture (imageUri / demo render) and a name-specific fallback
 * glyph, and derives progress / thawed from `now`.
 */
export function ItemCube({ item, now, progress, thawed, ...rest }: ItemCubeProps) {
  const p = progress ?? (now != null ? meltProgress(item, now) : 0);
  const t = thawed ?? (now != null ? now >= item.thawAt : p >= 1);
  return (
    <Cube
      progress={p}
      thawed={t}
      image={productImageFor(item)}
      photo={!!item.imageUri}
      category={item.category}
      glyph={glyphForItem(item)}
      accessibilityLabel={`${item.name}, ${t ? 'thawed' : `${Math.round(p * 100)}% melted`}`}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  tile: {
    overflow: 'hidden',
    backgroundColor: colors.ice50,
    boxShadow: `0px 0px 0px 1px ${withAlpha(colors.ice800, 0.06)}`,
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  frost: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  frostContent: { position: 'absolute', left: 0, bottom: 0 },
  frostTint: { backgroundColor: withAlpha(colors.ice50, 0.62) },
  glint: { position: 'absolute', left: 0, pointerEvents: 'none' },
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 1,
    backgroundColor: colors.white,
    boxShadow: `0px 1px 0px 0px ${withAlpha(colors.ice400, 0.35)}`,
  },
  rim: {
    borderWidth: 1,
    borderColor: withAlpha(colors.white, 0.8),
    pointerEvents: 'none',
  },
});
