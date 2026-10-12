// The Freeze sheet's photo tile (spec §4.3, 11-freeze-sheet): a 108 dashed ice tile.
// - Nothing yet: camera glyph + "Add photo".
// - Once there is a name (or a photo): a live preview of the frozen cube — the photo, the bundled
//   render for a demo name, or the category tile + glyph — with a "Photo" pill on the bottom edge.
// Tapping anywhere opens the image picker; a small × removes a picked photo.

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import {
  AppText,
  Cube,
  glyphForItem,
  Icon,
  PressableScale,
  productImageFor,
  springCalm,
  springPop,
  useReducedMotion,
} from '@/components';
import { colors, radius, shadow } from '@/theme/tokens';
import type { Category } from '@/types';

/** Tile size (the Figma frame: 108, so the tile lines up with the name + price column). */
export const PHOTO_TILE_SIZE = 108;
const CUBE_SIZE = 100;
const PILL_HEIGHT = 26;

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
  const showCube = trimmed.length > 0 || photoUri != null;
  const shown = useSharedValue(showCube ? 1 : 0);

  useEffect(() => {
    const to = showCube ? 1 : 0;
    shown.set(reduced ? withTiming(to, { duration: 220 }) : withSpring(to, showCube ? springPop : springCalm));
  }, [showCube, reduced, shown]);

  const cubeStyle = useAnimatedStyle(() => {
    const v = shown.get();
    return { opacity: Math.min(1, Math.max(0, v)), transform: [{ scale: 0.6 + 0.4 * v }] };
  });
  const emptyStyle = useAnimatedStyle(() => {
    const v = Math.min(1, Math.max(0, shown.get()));
    return { opacity: 1 - v, transform: [{ scale: 1 - 0.15 * v }] };
  });

  const image = photoUri ?? productImageFor({ name: trimmed, imageUri: undefined });
  const glyph = glyphForItem({ name: trimmed, category });

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
        <Animated.View style={[styles.center, emptyStyle]}>
          <Icon name="camera" size={26} color={colors.ice600} strokeWidth={2} />
          <AppText variant="labelS" color={colors.ice800}>
            Add photo
          </AppText>
        </Animated.View>
        <Animated.View style={[styles.cube, cubeStyle]}>
          <Cube progress={0} size={CUBE_SIZE} image={image} category={category} glyph={glyph} />
        </Animated.View>
        <Animated.View style={[styles.pill, cubeStyle]}>
          <Icon name="camera" size={16} color={colors.text.secondary} strokeWidth={2.2} />
          <AppText variant="labelM" color={colors.text.secondary}>
            {photoUri ? 'Change' : 'Photo'}
          </AppText>
        </Animated.View>
      </PressableScale>
      {photoUri ? (
        <PressableScale
          onPress={onRemove}
          haptic="tap"
          hitSlop={10}
          accessibilityLabel="Remove photo"
          style={styles.remove}
          testID="photo-remove"
        >
          <Icon name="close" size={14} color={colors.text.primary} strokeWidth={2.6} />
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: PHOTO_TILE_SIZE, height: PHOTO_TILE_SIZE + PILL_HEIGHT / 2 },
  tile: {
    width: PHOTO_TILE_SIZE,
    height: PHOTO_TILE_SIZE,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.ice300,
    backgroundColor: colors.ice50,
  },
  busy: { opacity: 0.6 },
  center: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  // The 100 cube box sits at the top of the tile; its body (75) is centred horizontally.
  cube: { position: 'absolute', left: (PHOTO_TILE_SIZE - 4 - CUBE_SIZE) / 2, top: -2 },
  pill: {
    position: 'absolute',
    alignSelf: 'center',
    top: PHOTO_TILE_SIZE - 2 - PILL_HEIGHT / 2 - 2,
    height: PILL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    ...shadow('soft'),
  },
  remove: {
    position: 'absolute',
    top: -7,
    right: -7,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.surface,
    ...shadow('soft'),
  },
});
