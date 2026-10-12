import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { colors, shadow, withAlpha } from '@/theme/tokens';

import { Coin } from './Coin';
import { springCalm, springPop, useReducedMotion } from './motion';

/** Maximum coin rows (a full jar). */
export const JAR_MAX_ROWS = 6;

/** Coin rows for a fill level 0..1: round(level × 6) (spec §3 Jar). */
export function jarRows(level: number): number {
  const l = Number.isFinite(level) ? Math.min(1, Math.max(0, level)) : 0;
  return Math.round(l * JAR_MAX_ROWS);
}

/**
 * Jar level for the Saved screen: goal progress (0..1) when there is a goal, otherwise
 * min(6, letGoCount) rows (spec §3 Jar).
 */
export function jarLevel(goalProgress01: number | null | undefined, letGoCount: number): number {
  if (goalProgress01 != null && Number.isFinite(goalProgress01)) return Math.min(1, Math.max(0, goalProgress01));
  return Math.min(JAR_MAX_ROWS, Math.max(0, letGoCount)) / JAR_MAX_ROWS;
}

export interface JarProps {
  /** Fill level 0..1 → round(level × 6) staggered coin rows. */
  level: number;
  /** Rendered width; the jar is 220 × 262 at 220 and scales proportionally. Default 220. */
  width?: number;
  /** Animate coins dropping in when rows are added (and on mount when true). Default true. */
  animated?: boolean;
  /** Drop the initial coins in on mount instead of showing them settled. Default false. */
  dropInOnMount?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// Design box (spec §3 Jar): 220 × 262. Lid 150 × 38 r16 on top; glass 210 × 214 r68 below it.
const W = 220;
const H = 262;
const LID_W = 150;
const LID_H = 38;
const GLASS_W = 210;
const GLASS_H = 214;
const GLASS_TOP = 36; // the lid (0..38) overlaps the glass neck by 2; 12 below the glass for its shadow
const COIN = 38;
const ROW_STEP = 26;
const COL_STEP = 36;

interface CoinSlot {
  row: number;
  left: number;
  top: number;
  rotate: number;
}

/** Deterministic pseudo-random in [-1, 1] (stable layout across renders). */
function jitter(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

/** Staggered rows of 6 from the bottom of the glass (coordinates inside the glass box). */
const SLOTS: CoinSlot[] = Array.from({ length: JAR_MAX_ROWS * 6 }, (_, i) => {
  const row = Math.floor(i / 6);
  const col = i % 6;
  const offset = row % 2 === 0 ? -6 : 12;
  return {
    row,
    left: offset + col * COL_STEP + jitter(i) * 2.5,
    top: GLASS_H - 4 - COIN - row * ROW_STEP + jitter(i + 99) * 2,
    rotate: (col + row) % 2 === 0 ? 14 - Math.abs(jitter(i + 7)) * 6 : -14 + Math.abs(jitter(i + 3)) * 6,
  };
});

/**
 * The savings jar (spec §3 Jar): mint lid, frosted glass (white 45%, 3px white border, ice tint,
 * soft shadow) clipping staggered rows of rotated coins, and two shine bars on the left.
 * New rows drop in with spring.pop (reduced motion: fade).
 */
export const Jar = memo(function Jar({
  level,
  width = W,
  animated = true,
  dropInOnMount = false,
  style,
  testID,
}: JarProps) {
  const k = width / W;
  const rows = jarRows(level);
  const reduced = useReducedMotion();

  return (
    <View
      style={[{ width: W * k, height: H * k }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Savings jar, ${Math.round((rows / JAR_MAX_ROWS) * 100)}% full`}
      testID={testID}
    >
      {/* Glass */}
      <View
        style={[
          styles.glass,
          {
            left: ((W - GLASS_W) / 2) * k,
            top: GLASS_TOP * k,
            width: GLASS_W * k,
            height: GLASS_H * k,
            borderRadius: 68 * k,
            borderWidth: 3 * k,
          },
        ]}
      >
        <LinearGradient
          colors={[withAlpha(colors.ice100, 0.25), withAlpha(colors.ice200, 0.45)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {SLOTS.map((slot, i) => (
          <JarCoin
            key={i}
            slot={slot}
            k={k}
            visible={slot.row < rows}
            animated={animated && !reduced}
            dropInOnMount={dropInOnMount}
            delay={(i % 6) * 45 + (slot.row % 2) * 20}
          />
        ))}
        {/* Shine bars */}
        <View
          style={[styles.shine, { left: 18 * k, top: 30 * k, width: 12 * k, height: 92 * k, borderRadius: 6 * k }]}
        />
        <View
          style={[
            styles.shine,
            styles.shineSoft,
            { left: 18 * k, top: 130 * k, width: 12 * k, height: 18 * k, borderRadius: 6 * k },
          ]}
        />
      </View>
      {/* Lid */}
      <View
        style={[
          styles.lid,
          { left: ((W - LID_W) / 2) * k, top: 0, width: LID_W * k, height: LID_H * k, borderRadius: 16 * k },
        ]}
      >
        <LinearGradient
          colors={[withAlpha(colors.white, 0.28), withAlpha(colors.white, 0)]}
          locations={[0, 0.7]}
          style={[StyleSheet.absoluteFill, { borderRadius: 16 * k }]}
        />
      </View>
    </View>
  );
});

function JarCoin({
  slot,
  k,
  visible,
  animated,
  dropInOnMount,
  delay,
}: {
  slot: CoinSlot;
  k: number;
  visible: boolean;
  animated: boolean;
  dropInOnMount: boolean;
  delay: number;
}) {
  const shown = useSharedValue(visible && !dropInOnMount ? 1 : 0);
  useEffect(() => {
    const target = visible ? 1 : 0;
    if (!animated) {
      shown.set(withTiming(target, { duration: 220 }));
    } else if (target === 1) {
      shown.set(withDelay(delay, withSpring(1, springPop)));
    } else {
      shown.set(withSpring(0, springCalm));
    }
  }, [visible, animated, delay, shown]);
  const style = useCoinStyle(shown, k, animated);
  return (
    <Animated.View style={[styles.coin, { left: slot.left * k, top: slot.top * k }, style]}>
      <Coin size={COIN * k} rotate={slot.rotate} />
    </Animated.View>
  );
}

function useCoinStyle(shown: SharedValue<number>, k: number, animated: boolean) {
  return useAnimatedStyle(() => {
    const v = shown.get();
    return {
      opacity: Math.min(1, v * 1.6),
      transform: animated ? [{ translateY: (1 - v) * -120 * k }] : [],
    };
  });
}

const styles = StyleSheet.create({
  glass: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: withAlpha(colors.white, 0.45),
    borderColor: colors.white,
    boxShadow: [
      `0px 18px 30px -10px ${withAlpha(colors.plum900, 0.14)}`,
      `inset 0px -10px 24px 0px ${withAlpha(colors.ice300, 0.35)}`,
    ].join(', '),
  },
  coin: { position: 'absolute' },
  shine: { position: 'absolute', backgroundColor: withAlpha(colors.white, 0.75) },
  shineSoft: { backgroundColor: withAlpha(colors.white, 0.6) },
  lid: {
    position: 'absolute',
    backgroundColor: colors.mint500,
    ...shadow('raised'),
  },
});
