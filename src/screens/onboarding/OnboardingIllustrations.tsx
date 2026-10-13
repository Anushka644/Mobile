// Hero illustrations for the three onboarding slides (spec §4.1, design/exports/08..10-onboarding-*@2x.png).
//
// Each illustration is laid out in its own design box (points at 393 wide) and scaled by `scale`
// so it fits shorter screens. `active` is true once the slide has been reached: slide 2's cubes melt
// to 0 / 50 / 75% and their time pills pop in, slide 3's jar fills as coins drop in.
//
// The art follows the Figma frames: category tiles (footprints, headphones, lamp) inside the ice
// rather than product photos, so the illustrations read as friendly icons, not as real listings.

import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { AppText, Coin, Cube, Icon, Jar, springPop, useReducedMotion } from '@/components';
import { colors, radius, shadow } from '@/theme/tokens';
import type { Category } from '@/types';
import type { IconName } from '@/components';

import type { SlideKey } from './slides';

export interface IllustrationProps {
  /** Scale applied to the design box (≤ 1 on short screens). */
  scale: number;
  /** The slide has been reached (plays its one-shot animation). */
  active: boolean;
}

/** Unscaled design box of each illustration. */
export const ILLUSTRATION_BOX: Record<SlideKey, { width: number; height: number }> = {
  melt: { width: 290, height: 290 },
  cool: { width: 393, height: 184 },
  grow: { width: 300, height: 372 },
};

// ---------------------------------------------------------------------------
// Slide 1 — one big frozen cube (sneakers)

const HERO_CUBE = 290;

/** Slide 1: a big frozen Cube with the sneakers tile; drops in with spring.pop on mount. */
export const FrozenHero = memo(function FrozenHero({ scale }: IllustrationProps) {
  const reduced = useReducedMotion();
  const enter = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      enter.set(1);
      return;
    }
    enter.set(withDelay(120, withSpring(1, springPop)));
  }, [enter, reduced]);

  const style = useAnimatedStyle(() => {
    const v = enter.get();
    return {
      opacity: Math.min(1, v * 1.5),
      transform: [{ translateY: (1 - v) * -36 }, { scale: 0.86 + 0.14 * v }],
    };
  });

  const size = HERO_CUBE * scale;
  return (
    <Animated.View style={[{ width: size, height: size }, style]}>
      <Cube
        progress={0}
        size={size}
        category="fashion"
        glyph="footprints"
        accessibilityLabel="A pair of sneakers frozen in an ice cube"
      />
    </Animated.View>
  );
});

// ---------------------------------------------------------------------------
// Slide 2 — three cubes at different melt stages, each with its time left

interface TrioCube {
  key: string;
  /** Box size (the Cube's 200 design box). */
  size: number;
  /** Left of the cube box in the 393-wide frame. */
  left: number;
  progress: number;
  category: Category;
  glyph: IconName;
  pill: string;
  label: string;
}

/** Ground line of the trio, in the design box. */
const TRIO_GROUND = 160;

// Measured from 09-onboarding-2: the middle cube is the 200 box at 50%, the side ones ~0.76×.
const TRIO: readonly TrioCube[] = [
  {
    key: 'headphones',
    size: 153,
    left: 7,
    progress: 0,
    category: 'tech',
    glyph: 'headphones',
    pill: '7d',
    label: 'Headphones, frozen solid, 7 days left',
  },
  {
    key: 'lamp',
    size: 152,
    left: 233,
    progress: 0.75,
    category: 'home',
    glyph: 'lamp',
    pill: '6h',
    label: 'A lamp, mostly melted, 6 hours left',
  },
  {
    key: 'sneakers',
    size: 200,
    left: 96,
    progress: 0.5,
    category: 'fashion',
    glyph: 'footprints',
    pill: '29h',
    label: 'Sneakers, half melted, 29 hours left',
  },
];

/**
 * Top of whatever pokes highest out of a cube (body or product), in the cube's 200 design box.
 * Mirrors the Cube geometry: body height 150 → 84 over progress 0 → 0.75 on the ground line
 * y = 176; the 92 product sits at top 55 (frozen) → 76 (from 50% melt).
 */
export function cubeTopAt(progress: number): number {
  const t = Math.min(1, Math.max(0, progress / 0.75));
  const bodyTop = 176 - (150 - 66 * t);
  const productTop = 55 + 21 * Math.min(1, Math.max(0, progress / 0.5));
  return Math.min(bodyTop, productTop);
}

/** Slide 2: three cubes (0 / 50 / 75% melted) with "7d", "29h", "6h" pills. */
export const CoolingTrio = memo(function CoolingTrio({ scale, active }: IllustrationProps) {
  const box = ILLUSTRATION_BOX.cool;
  return (
    <View style={{ width: box.width * scale, height: box.height * scale }}>
      {TRIO.map((cube, i) => {
        const k = cube.size / 200;
        const top = TRIO_GROUND - 176 * k;
        const pillBottom = top + cubeTopAt(cube.progress) * k - 10;
        return (
          <View key={cube.key} style={[StyleSheet.absoluteFill, styles.noTouch]}>
            <Cube
              progress={active ? cube.progress : 0}
              size={cube.size * scale}
              category={cube.category}
              glyph={cube.glyph}
              accessibilityLabel={cube.label}
              style={[styles.abs, { left: cube.left * scale, top: top * scale }]}
            />
            <TimePill
              label={cube.pill}
              active={active}
              delay={420 + i * 110}
              centerX={(cube.left + cube.size / 2) * scale}
              bottom={pillBottom * scale}
            />
          </View>
        );
      })}
    </View>
  );
});

const PILL_HEIGHT = 24;
/** A wide, centred slot so each pill hugs its label and still centres over its cube. */
const PILL_SLOT = 120;

function TimePill({
  label,
  active,
  delay,
  centerX,
  bottom,
}: {
  label: string;
  active: boolean;
  delay: number;
  centerX: number;
  bottom: number;
}) {
  const reduced = useReducedMotion();
  const shown = useSharedValue(0);

  useEffect(() => {
    if (!active) return;
    shown.set(reduced ? withTiming(1, { duration: 220 }) : withDelay(delay, withSpring(1, springPop)));
  }, [active, delay, reduced, shown]);

  const style = useAnimatedStyle(() => {
    const v = shown.get();
    return {
      opacity: Math.min(1, v * 1.4),
      transform: [{ translateY: (1 - v) * 8 }, { scale: reduced ? 1 : 0.6 + 0.4 * v }],
    };
  });

  return (
    <View style={[styles.pillSlot, { left: centerX - PILL_SLOT / 2, top: bottom - PILL_HEIGHT }]}>
      <Animated.View style={[styles.pill, style]}>
        <AppText variant="labelM" color={colors.ice800} tabular>
          {label}
        </AppText>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Slide 3 — the jar, half full, with coins hovering above it

const JAR_WIDTH = 245;
/** Jar box top in the design box (the floating coins live above it). */
const JAR_TOP = 80;

/** Floating coins above the jar (centres relative to the design box), from 10-onboarding-3. */
const FLOATING_COINS = [
  { cx: 136, cy: 25, d: 37, rotate: -8, delay: 0 },
  { cx: 106.5, cy: 53, d: 26, rotate: 12, delay: 380 },
  { cx: 185, cy: 44.5, d: 30, rotate: -14, delay: 760 },
] as const;

const SPARKLES = [
  { cx: 58.5, cy: 42.5, size: 22, delay: 0 },
  { cx: 252.5, cy: 72, size: 17, delay: 900 },
] as const;

/** The Figma jar's "Level Mid": four of the six coin rows (10-onboarding-3). */
const JAR_LEVEL = 4 / 6;

/** Slide 3: a Jar at level "Mid" whose coins drop in when the slide is reached, plus hovering coins. */
export const JarHero = memo(function JarHero({ scale, active }: IllustrationProps) {
  const box = ILLUSTRATION_BOX.grow;
  const jarWidth = JAR_WIDTH * scale;
  return (
    <View style={{ width: box.width * scale, height: box.height * scale }}>
      <Jar
        level={active ? JAR_LEVEL : 0}
        width={jarWidth}
        style={[styles.abs, { left: ((box.width - JAR_WIDTH) / 2) * scale, top: JAR_TOP * scale }]}
      />
      {FLOATING_COINS.map((coin, i) => (
        <FloatingCoin key={i} {...coin} scale={scale} />
      ))}
      {SPARKLES.map((s, i) => (
        <Twinkle key={i} {...s} scale={scale} />
      ))}
    </View>
  );
});

function FloatingCoin({
  cx,
  cy,
  d,
  rotate,
  delay,
  scale,
}: {
  cx: number;
  cy: number;
  d: number;
  rotate: number;
  delay: number;
  scale: number;
}) {
  const reduced = useReducedMotion();
  const bob = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    bob.set(
      withDelay(
        delay,
        withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true)
      )
    );
  }, [bob, delay, reduced]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: (bob.get() - 0.5) * 8 * scale }, { rotate: `${(bob.get() - 0.5) * 10}deg` }],
  }));

  const size = d * scale;
  return (
    <Animated.View style={[styles.abs, { left: cx * scale - size / 2, top: cy * scale - size / 2 }, style]}>
      <Coin size={size} rotate={rotate} />
    </Animated.View>
  );
}

function Twinkle({ cx, cy, size, delay, scale }: { cx: number; cy: number; size: number; delay: number; scale: number }) {
  const reduced = useReducedMotion();
  const tw = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    tw.set(
      withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
            withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) })
          ),
          -1
        )
      )
    );
  }, [tw, delay, reduced]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.75 + 0.25 * tw.get(),
    transform: [{ scale: 0.85 + 0.2 * tw.get() }, { rotate: `${tw.get() * 12}deg` }],
  }));

  const s = size * scale;
  return (
    <Animated.View style={[styles.abs, { left: cx * scale - s / 2, top: cy * scale - s / 2 }, style]}>
      <Icon name="sparkle" size={s} color={colors.butter500} strokeWidth={2.2} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  noTouch: { pointerEvents: 'none' },
  pillSlot: { position: 'absolute', width: PILL_SLOT, height: PILL_HEIGHT, alignItems: 'center' },
  pill: {
    height: PILL_HEIGHT,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow('soft'),
  },
});
