// The savings glass (v2 "frost minimal"): every want you let go melts into water, and the water
// collects here. A clear glass with a hairline rim, measuring ticks, and ice-blue water whose surface
// is a slow travelling wave. The level animates when it changes (and fills from empty on mount when
// asked). The name `Jar` and its helpers are kept for API stability.

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
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { colors, withAlpha } from '@/theme/tokens';

import { useReducedMotion } from './motion';

/** Steps of a full glass (kept from the coin-row jar: a goal-less glass fills one step per let-go). */
export const JAR_MAX_ROWS = 6;

/** Whole steps for a fill level 0..1: round(level × 6). */
export function jarRows(level: number): number {
  const l = Number.isFinite(level) ? Math.min(1, Math.max(0, level)) : 0;
  return Math.round(l * JAR_MAX_ROWS);
}

/**
 * Glass level for the Saved screen: goal progress (0..1) when there is a goal, otherwise
 * min(6, letGoCount) / 6.
 */
export function jarLevel(goalProgress01: number | null | undefined, letGoCount: number): number {
  if (goalProgress01 != null && Number.isFinite(goalProgress01)) return Math.min(1, Math.max(0, goalProgress01));
  return Math.min(JAR_MAX_ROWS, Math.max(0, letGoCount)) / JAR_MAX_ROWS;
}

export interface JarProps {
  /** Fill level 0..1. */
  level: number;
  /** Rendered width; the glass box is 220 × 262 at 220 and scales proportionally. Default 220. */
  width?: number;
  /** Animate level changes and the wave. Default true. */
  animated?: boolean;
  /** Fill up from empty on mount instead of showing the level settled. Default false. */
  dropInOnMount?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// Design box: 220 × 262. The glass is 172 wide and 250 tall, centred, 6 from the top.
const W = 220;
const H = 262;
const GLASS_W = 172;
const GLASS_H = 250;
const GLASS_TOP = 6;
const RADIUS = 40;
/** Water never quite reaches the rim. */
const MAX_FILL = 0.9;
const WAVE_H = 10;

/** One wave period (glass width) drawn twice so it can loop by translating one period. */
function wavePath(w: number, h: number): string {
  const q = w / 4;
  let d = `M0 ${h / 2}`;
  for (let i = 0; i < 2; i++) {
    const x = i * w;
    d += ` Q${x + q} 0 ${x + 2 * q} ${h / 2} T${x + 4 * q} ${h / 2}`;
  }
  return `${d} L${2 * w} ${h} L0 ${h} Z`;
}

/** The savings glass (see file header). */
export const Jar = memo(function Jar({
  level,
  width = W,
  animated = true,
  dropInOnMount = false,
  style,
  testID,
}: JarProps) {
  const reduced = useReducedMotion();
  const k = width / W;
  const gw = GLASS_W * k;
  const gh = GLASS_H * k;
  const target = Number.isFinite(level) ? Math.min(1, Math.max(0, level)) : 0;
  const motion = animated && !reduced;

  const fill = useSharedValue(dropInOnMount && motion ? 0 : target);
  const wave = useSharedValue(0);

  useEffect(() => {
    if (!motion) {
      fill.set(target);
      return;
    }
    fill.set(withDelay(dropInOnMount ? 200 : 0, withTiming(target, { duration: 1100, easing: Easing.out(Easing.cubic) })));
  }, [fill, target, motion, dropInOnMount]);

  useEffect(() => {
    if (!motion) return;
    wave.set(withRepeat(withTiming(1, { duration: 3200, easing: Easing.linear }), -1));
    return () => {
      cancelAnimation(wave);
      wave.set(0);
    };
  }, [motion, wave]);

  const waterStyle = useAnimatedStyle(() => ({ height: fill.get() * MAX_FILL * gh }));
  const waveStyle = useAnimatedStyle(() => ({
    opacity: fill.get() > 0.005 ? 1 : 0,
    transform: [{ translateX: -wave.get() * gw }],
  }));
  const backWaveStyle = useAnimatedStyle(() => ({
    opacity: fill.get() > 0.005 ? 0.5 : 0,
    transform: [{ translateX: -gw + wave.get() * gw }],
  }));

  const waveH = WAVE_H * k;
  const ticks = [0.25, 0.5, 0.75];

  return (
    <View
      style={[{ width, height: H * k }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Savings glass, ${Math.round(target * 100)}% full`}
      testID={testID}
    >
      <View
        style={[
          styles.glass,
          { left: ((W - GLASS_W) / 2) * k, top: GLASS_TOP * k, width: gw, height: gh, borderRadius: RADIUS * k },
        ]}
      >
        {/* Water: anchored to the bottom, a gradient body under two travelling waves. */}
        <Animated.View style={[styles.water, waterStyle]}>
          <Animated.View style={[styles.wave, { top: -waveH + 1, height: waveH, width: gw * 2 }, backWaveStyle]}>
            <Svg width={gw * 2} height={waveH}>
              <Path d={wavePath(gw, waveH)} fill={colors.ice300} />
            </Svg>
          </Animated.View>
          <Animated.View style={[styles.wave, { top: -waveH + 2, height: waveH, width: gw * 2 }, waveStyle]}>
            <Svg width={gw * 2} height={waveH}>
              <Path d={wavePath(gw, waveH)} fill={colors.ice400} />
            </Svg>
          </Animated.View>
          <LinearGradient colors={[colors.ice400, colors.ice600]} style={StyleSheet.absoluteFill} />
        </Animated.View>

        {/* A few bubbles drift up through the water. */}
        {motion
          ? BUBBLES.map((b, i) => (
              <Bubble key={i} index={i} x={b.x * gw} size={b.size * k} delay={b.delay} fill={fill} gh={gh} />
            ))
          : null}

        {/* Measuring ticks on the right, a long reflection on the left. */}
        {ticks.map((t) => (
          <View
            key={t}
            style={[
              styles.tick,
              { right: 14 * k, bottom: t * MAX_FILL * gh, width: (t === 0.5 ? 18 : 10) * k },
            ]}
          />
        ))}
        <LinearGradient
          colors={[withAlpha(colors.white, 0.85), withAlpha(colors.white, 0)]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.reflection, { left: 12 * k, top: 22 * k, width: 10 * k, height: gh * 0.62, borderRadius: 5 * k }]}
        />
        <View style={[StyleSheet.absoluteFill, styles.rim, { borderRadius: RADIUS * k }]} />
      </View>
    </View>
  );
});

/** Bubble lanes: x as a share of the glass width, size in design px, start delay in ms. */
const BUBBLES = [
  { x: 0.28, size: 6, delay: 0 },
  { x: 0.62, size: 4, delay: 1400 },
  { x: 0.46, size: 5, delay: 2600 },
  { x: 0.74, size: 3.5, delay: 3700 },
] as const;

/** One bubble rising from the bottom to the water line on a slow loop. */
function Bubble({
  index,
  x,
  size,
  delay,
  fill,
  gh,
}: {
  index: number;
  x: number;
  size: number;
  delay: number;
  fill: SharedValue<number>;
  gh: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(delay, withRepeat(withTiming(1, { duration: 4200 + index * 500, easing: Easing.in(Easing.quad) }), -1)));
    return () => cancelAnimation(t);
  }, [t, delay, index]);
  const style = useAnimatedStyle(() => {
    const top = fill.get() * MAX_FILL * gh;
    const rise = t.get() * Math.max(0, top - size * 2);
    return {
      opacity: top > size * 4 ? (1 - t.get()) * 0.9 : 0,
      transform: [{ translateY: -rise }, { translateX: Math.sin(t.get() * Math.PI * 3 + index) * 3 }],
    };
  });
  return (
    <Animated.View
      style={[styles.bubble, { left: x, bottom: 6, width: size, height: size, borderRadius: size / 2 }, style]}
    />
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: withAlpha(colors.white, 0.85),
    backgroundColor: withAlpha(colors.white, 0.25),
    pointerEvents: 'none',
  },
  glass: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: withAlpha(colors.white, 0.6),
    boxShadow: `0px 0px 0px 1px ${withAlpha(colors.plum900, 0.08)}, 0px 24px 40px -24px ${withAlpha(colors.ice800, 0.35)}`,
  },
  water: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  wave: { position: 'absolute', left: 0 },
  tick: { position: 'absolute', height: 1.5, borderRadius: 1, backgroundColor: withAlpha(colors.plum900, 0.18) },
  reflection: { position: 'absolute', pointerEvents: 'none' },
  rim: { borderWidth: 1.5, borderColor: withAlpha(colors.white, 0.9), pointerEvents: 'none' },
});
