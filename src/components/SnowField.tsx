import { memo, useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, withAlpha } from '@/theme/tokens';

import { useReducedMotion } from './motion';

export interface SnowFieldProps {
  /** Number of dots. Default 12. */
  count?: number;
  /** Height of the band the dots live in, from the top of the container. Default 520. */
  height?: number;
  /** Seed for the (deterministic) layout. Default 1. */
  seed?: number;
  /** Slow drift loop. Default true (off under reduced motion). */
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
}

function rand(n: number): number {
  const x = Math.sin(n * 91.345 + 47.853) * 24634.6345;
  return x - Math.floor(x);
}

/**
 * Floating snow dots that drift slowly (Item cooling backdrop, Onboarding 1, Frozen solid):
 * 3–9px white dots at 0.55–0.95 opacity, each bobbing ~10pt on its own slow loop.
 * Absolute-fill and non-interactive; place it right after the glow layer.
 */
export const SnowField = memo(function SnowField({
  count = 12,
  height = 520,
  seed = 1,
  animated = true,
  style,
}: SnowFieldProps) {
  const reduced = useReducedMotion();
  return (
    <View style={[StyleSheet.absoluteFill, styles.noTouch, style]}>
      {Array.from({ length: count }, (_, i) => {
        const r = (k: number) => rand(seed * 1000 + i * 13 + k);
        return (
          <Dot
            key={i}
            left={`${4 + r(1) * 92}%`}
            top={16 + r(2) * (height - 32)}
            size={3 + Math.round(r(3) * 6)}
            opacity={0.55 + r(4) * 0.4}
            duration={5200 + r(5) * 4200}
            delay={r(6) * 2400}
            animated={animated && !reduced}
          />
        );
      })}
    </View>
  );
});

function Dot({
  left,
  top,
  size,
  opacity,
  duration,
  delay,
  animated,
}: {
  left: `${number}%`;
  top: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  animated: boolean;
}) {
  const drift = useSharedValue(0);
  useEffect(() => {
    if (!animated) return;
    drift.set(withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true)));
  }, [animated, delay, duration, drift]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: drift.get() * 10 }, { translateX: drift.get() * 3 }],
  }));
  return (
    <Animated.View
      style={[
        styles.dot,
        {
          left,
          top,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: withAlpha(colors.white, opacity),
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  noTouch: { pointerEvents: 'none' },
  dot: { position: 'absolute' },
});
