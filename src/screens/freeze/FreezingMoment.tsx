// The freezing moment (spec §4.3 "On submit", v2 "frost minimal"): a full-screen overlay that plays
// once after Freeze, then hands over to the item screen.
//   1. The want's tile settles in, clear: the product (or its glyph) behind tinted glass.
//   2. The frost rises from the bottom over it (the reverse of melting) and the tile locks with a
//      tiny contraction and the success haptic; a glint crosses the fresh frost.
//   3. A freezer label with the thaw time is stuck on the corner, and "On ice." rises in with
//      "See you in 3 days." under it.
//   4. An ink "See it" button continues right away; its pill fills quietly until the sheet moves on
//      by itself (FREEZING_MOMENT_MS).
// Reduced motion: the tile is frosted from the start and everything cross-fades in.

import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import {
  AppText,
  GlowBackground,
  Grain,
  Headline,
  ItemCube,
  PressableScale,
  springCalm,
  useBottomGap,
  useReducedMotion,
} from '@/components';
import { haptics } from '@/lib/haptics';
import { colors, radius, shadow, withAlpha } from '@/theme/tokens';
import type { Item } from '@/types';

/** How long the moment plays before the sheet moves on to the item by itself. */
export const FREEZING_MOMENT_MS = 2600;

// Timeline (ms from mount).
const FROST_AT = 320;
/** Cube's frost follows timingMelt (600ms) when its progress changes. */
const FROZEN_AT = FROST_AT + 600;
const GLINT_AT = FROZEN_AT - 40;
const GLINT_MS = 700;
const LABEL_AT = FROZEN_AT + 120;
const TITLE_AT = FROZEN_AT + 60;
const LINE_AT = TITLE_AT + 90;
const BUTTON_AT = LINE_AT + 120;

const TILE = 248;
const TILE_MIN = 176;
const TILE_RADIUS_RATIO = 0.16;
/** Everything under the tile (gap, title, line, button area), for fitting short screens. */
const BELOW_TILE = 44 + 56 + 10 + 24 + 56 + 120;

export interface FreezingMomentProps {
  item: Item;
  /** "3 days" */
  cooldownLabel: string;
  /** "Fri 9:41 PM" */
  thawLabel: string;
  /** Adds "We’ll nudge you." when a thaw notification can be sent. */
  nudge: boolean;
  /** "See it": continue to the item now instead of waiting. */
  onContinue?: () => void;
}

export function FreezingMoment({ item, cooldownLabel, thawLabel, nudge, onContinue }: FreezingMomentProps) {
  const reduced = useReducedMotion();
  const { height } = useWindowDimensions();
  const gap = useBottomGap();
  // Clear glass first; the frost rises when this flips (reduced motion: frosted from the start).
  const [frozen, setFrozen] = useState(reduced);
  const [continued, setContinued] = useState(false);

  const fade = useSharedValue(0);
  const tileIn = useSharedValue(0);
  const lock = useSharedValue(0);
  const glint = useSharedValue(0);
  const label = useSharedValue(0);
  const title = useSharedValue(0);
  const line = useSharedValue(0);
  const button = useSharedValue(0);
  const fill = useSharedValue(0);

  useEffect(() => {
    const out = Easing.out(Easing.cubic);
    fade.set(withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) }));
    if (reduced) {
      const appear = (delay: number) => withDelay(delay, withTiming(1, { duration: 260 }));
      tileIn.set(appear(60));
      label.set(appear(160));
      title.set(appear(200));
      line.set(appear(260));
      button.set(appear(320));
    } else {
      tileIn.set(withDelay(40, withSpring(1, springCalm)));
      lock.set(
        withDelay(
          FROZEN_AT - 60,
          withSequence(withTiming(1, { duration: 110, easing: Easing.out(Easing.quad) }), withSpring(0, springCalm))
        )
      );
      glint.set(withDelay(GLINT_AT, withTiming(1, { duration: GLINT_MS, easing: Easing.inOut(Easing.cubic) })));
      label.set(withDelay(LABEL_AT, withSpring(1, { damping: 16, stiffness: 240, mass: 1 })));
      const rise = (delay: number) => withDelay(delay, withTiming(1, { duration: 460, easing: out }));
      title.set(rise(TITLE_AT));
      line.set(rise(LINE_AT));
      button.set(rise(BUTTON_AT));
    }
    // The button's pill fills until the sheet moves on by itself.
    const fillFrom = reduced ? 320 : BUTTON_AT;
    fill.set(withDelay(fillFrom, withTiming(1, { duration: FREEZING_MOMENT_MS - fillFrom, easing: Easing.linear })));

    const frost = reduced ? null : setTimeout(() => setFrozen(true), FROST_AT);
    const buzz = setTimeout(() => haptics.success(), reduced ? 120 : FROZEN_AT - 60);
    return () => {
      if (frost) clearTimeout(frost);
      clearTimeout(buzz);
    };
    // Runs once per mount: the moment plays a single time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fit the tile on short screens (and in the iOS page sheet on small phones).
  const tile = Math.round(Math.min(TILE, Math.max(TILE_MIN, height - BELOW_TILE - 140)));
  const r = Math.round(tile * TILE_RADIUS_RATIO);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: fade.get() }));
  const tileStyle = useAnimatedStyle(() => {
    const v = tileIn.get();
    return {
      opacity: Math.min(1, v * 1.6),
      transform: [{ translateY: (1 - v) * 16 }, { scale: (0.94 + 0.06 * v) * (1 - 0.018 * lock.get()) }],
    };
  });
  const glintStyle = useAnimatedStyle(() => ({
    opacity: glint.get() > 0 && glint.get() < 1 ? 1 : 0,
    transform: [{ translateX: -tile * 0.7 + glint.get() * tile * 2.1 }, { rotate: '22deg' }],
  }));
  const labelStyle = useAnimatedStyle(() => {
    const v = label.get();
    return { opacity: Math.min(1, v * 2), transform: [{ rotate: '-5deg' }, { scale: 1.18 - 0.18 * v }] };
  });
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));

  const subtitleText = `See you in ${cooldownLabel}.${nudge ? ' We’ll nudge you.' : ''}`;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, overlayStyle]}
      accessibilityViewIsModal
      accessibilityLiveRegion="polite"
      accessibilityLabel={`On ice. ${subtitleText} Thaws ${thawLabel}.`}
      testID="freezing-moment"
    >
      <GlowBackground preset="frozen" />
      <Grain />

      <View style={styles.center}>
        <Animated.View style={[styles.tileWrap, { borderRadius: r }, tileStyle]}>
          <ItemCube
            item={item}
            progress={frozen ? 0 : 1}
            thawed={!frozen}
            size={tile}
            radius={r}
            animated={false}
          />
          {/* The glint: one pass of light across the fresh frost. */}
          <View style={[StyleSheet.absoluteFill, styles.glintClip, { borderRadius: r }]}>
            <Animated.View style={[styles.glint, { width: tile * 0.34, height: tile * 2, top: -tile * 0.5 }, glintStyle]}>
              <LinearGradient
                colors={[withAlpha(colors.white, 0), withAlpha(colors.white, 0.75), withAlpha(colors.white, 0)]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
          {/* The freezer label, stuck on the corner. */}
          <Animated.View style={[styles.label, labelStyle]} testID="freezing-label">
            <AppText variant="caption" color={colors.text.tertiary}>
              Thaws
            </AppText>
            <AppText variant="mono" color={colors.text.primary} uppercase tabular numberOfLines={1}>
              {thawLabel}
            </AppText>
          </Animated.View>
        </Animated.View>

        <View style={styles.text}>
          <Rise value={title}>
            <Headline variant="displayXL" align="center" accessibilityRole="header">
              {'On *ice.*'}
            </Headline>
          </Rise>
          <Rise value={line}>
            <AppText variant="bodyL" color={colors.text.secondary} align="center">
              {subtitleText}
            </AppText>
          </Rise>
        </View>
      </View>

      <Rise value={button} style={[styles.footer, { paddingBottom: gap }]}>
        <PressableScale
          onPress={() => {
            if (continued) return;
            setContinued(true);
            onContinue?.();
          }}
          disabled={continued}
          haptic="tap"
          accessibilityLabel="See it"
          accessibilityHint="Opens the item now"
          style={styles.button}
          testID="freezing-continue"
        >
          <Animated.View style={[styles.buttonFill, fillStyle]} />
          <AppText variant="labelL" color={colors.text.inverse}>
            See it
          </AppText>
        </PressableScale>
      </Rise>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------

function Rise({
  value,
  children,
  style,
}: {
  value: SharedValue<number>;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const animated = useAnimatedStyle(() => {
    const v = value.get();
    return { opacity: v, transform: [{ translateY: (1 - v) * 14 }] };
  });
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden', backgroundColor: colors.bg.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingTop: 24 },
  tileWrap: { ...shadow('raised') },
  glintClip: { overflow: 'hidden', pointerEvents: 'none' },
  glint: { position: 'absolute', left: 0 },
  label: {
    position: 'absolute',
    right: -14,
    bottom: 22,
    paddingHorizontal: 12,
    paddingTop: 7,
    paddingBottom: 8,
    gap: 2,
    borderRadius: 4,
    backgroundColor: colors.bg.surface,
    ...shadow('soft'),
  },
  text: { marginTop: 44, alignItems: 'center', gap: 10, maxWidth: 340 },
  footer: { paddingHorizontal: 20, width: '100%', maxWidth: 393, alignSelf: 'center' },
  button: {
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.action.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadow('button'),
  },
  buttonFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: withAlpha(colors.white, 0.07),
  },
});
