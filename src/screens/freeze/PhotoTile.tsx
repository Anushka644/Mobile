// The Freeze sheet's photo tile (v2 "frost minimal"): a 140 frost tile beside the name + price.
// - Nothing yet: frosted glass with a camera glyph and "Add photo".
// - Once there is a name (or a photo): the want itself behind clear glass, tinted by its category
//   (your photo, or the category glyph), as it will sit in the freezer before the frost rises over
//   it in the freezing moment. A small camera badge on the corner says the photo is still open.
// Tapping anywhere opens the image picker; a small × removes a picked photo.

import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import {
  AppText,
  CATEGORY_TINTS,
  Cube,
  glyphForItem,
  Icon,
  PressableScale,
  springCalm,
  useReducedMotion,
} from '@/components';
import { colors, shadow, tints, withAlpha } from '@/theme/tokens';
import type { Category } from '@/types';

/** Tile size: from the top of the name field to the bottom of the price field beside it. */
export const PHOTO_TILE_SIZE = 140;
/** Offset from the top of the details row: the "What is it?" caption + its gap. */
export const PHOTO_TILE_TOP = 22;
const TILE_RADIUS = 24;
const BADGE = 28;

/** A soft settle with a whisper of overshoot (spring.calm would be too flat for an arrival). */
const settle = { damping: 16, stiffness: 220, mass: 1 };

export interface PhotoTileProps {
  name: string;
  category: Category;
  photoUri: string | null;
  onPick: () => void;
  onRemove: () => void;
  /** True while the picker is open (dims the tile). */
  busy?: boolean;
}

export function PhotoTile({ name, category, photoUri, onPick, onRemove, busy = false }: PhotoTileProps) {
  const reduced = useReducedMotion();
  const trimmed = name.trim();
  const showWant = trimmed.length > 0 || photoUri != null;
  const shown = useSharedValue(showWant ? 1 : 0);

  useEffect(() => {
    const to = showWant ? 1 : 0;
    shown.set(reduced ? withTiming(to, { duration: 220 }) : withSpring(to, showWant ? settle : springCalm));
  }, [showWant, reduced, shown]);

  const wantStyle = useAnimatedStyle(() => {
    const v = shown.get();
    return { opacity: Math.min(1, Math.max(0, v * 1.4)), transform: [{ scale: 0.9 + 0.1 * v }] };
  });
  const emptyStyle = useAnimatedStyle(() => {
    const v = Math.min(1, Math.max(0, shown.get()));
    return { opacity: Math.max(0, 1 - v * 2) };
  });
  const badgeStyle = useAnimatedStyle(() => {
    const v = Math.min(1, Math.max(0, shown.get()));
    return { opacity: v, transform: [{ scale: 0.6 + 0.4 * v }] };
  });

  // Your photo, else the category glyph — the bundled renders are for the sample items only, so
  // typing a demo name doesn't borrow one.
  const glyph = glyphForItem({ name: trimmed, category });
  const tint = tints[CATEGORY_TINTS[category]];

  return (
    <View style={styles.root}>
      <PressableScale
        onPress={onPick}
        disabled={busy}
        haptic="tap"
        accessibilityLabel={photoUri ? 'Change photo' : 'Add photo'}
        accessibilityHint="Opens your photo library"
        style={[styles.tile, busy ? styles.busy : null]}
        testID="photo-tile"
      >
        {/* Empty: a frosted pane with the camera. */}
        <Animated.View style={[StyleSheet.absoluteFill, emptyStyle]}>
          <LinearGradient
            colors={[colors.ice50, colors.ice100]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            <Icon name="camera" size={26} color={colors.text.primary} strokeWidth={1.4} />
            <AppText variant="labelS" color={colors.text.secondary}>
              Add photo
            </AppText>
          </View>
        </Animated.View>
        {/* The want, behind clear tinted glass. */}
        <Animated.View style={[StyleSheet.absoluteFill, wantStyle]}>
          <Cube
            progress={1}
            thawed
            size={PHOTO_TILE_SIZE}
            radius={TILE_RADIUS}
            image={photoUri}
            photo
            category={category}
            glyph={glyph}
            tint={photoUri ? undefined : tint}
            animated={false}
            accessibilityLabel={trimmed || 'Photo'}
          />
        </Animated.View>
        <View style={styles.rim} />
      </PressableScale>

      {photoUri ? (
        <PressableScale
          onPress={onRemove}
          haptic="tap"
          hitSlop={10}
          accessibilityLabel="Remove photo"
          style={[styles.badge, styles.remove]}
          testID="photo-remove"
        >
          <Icon name="close" size={13} color={colors.text.primary} strokeWidth={2} />
        </PressableScale>
      ) : (
        <Animated.View style={[styles.badge, styles.camera, badgeStyle]}>
          <Icon name="camera" size={14} color={colors.text.primary} strokeWidth={1.7} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: PHOTO_TILE_SIZE, height: PHOTO_TILE_SIZE, marginTop: PHOTO_TILE_TOP },
  tile: {
    width: PHOTO_TILE_SIZE,
    height: PHOTO_TILE_SIZE,
    borderRadius: TILE_RADIUS,
    overflow: 'hidden',
    backgroundColor: colors.ice50,
    boxShadow: `0px 0px 0px 1px ${withAlpha(colors.ice800, 0.06)}`,
  },
  busy: { opacity: 0.6 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  // The glass rim: a bright inner hairline, as on the frost tile.
  rim: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: TILE_RADIUS,
    borderWidth: 1,
    borderColor: withAlpha(colors.white, 0.8),
    pointerEvents: 'none',
  },
  badge: {
    position: 'absolute',
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.surface,
    ...shadow('soft'),
  },
  remove: { top: -8, right: -8 },
  camera: { right: -6, bottom: -6, pointerEvents: 'none' },
});
