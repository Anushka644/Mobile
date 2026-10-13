import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { Coin } from '@/components';
import { colors, withAlpha } from '@/theme/tokens';

/** Deterministic pseudo-random in [0, 1). */
function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** One droplet's fall, ms (accelerating from rest). */
export const DROP_FALL_MS = 560;
/** Gap between droplets, ms. */
export const DROP_STAGGER_MS = 150;
const RIPPLE_MS = 560;
const RIPPLE_W = 30;
const RIPPLE_H = 7;

/** When the first and the last droplet reach the water, ms after the fall starts. */
export function dropletTimeline(count: number): { firstLand: number; lastLand: number } {
  return { firstLand: DROP_FALL_MS, lastLand: Math.max(0, count - 1) * DROP_STAGGER_MS + DROP_FALL_MS };
}

export interface DropletFallProps {
  /** Starts the fall (once). */
  start: boolean;
  /** The spout in container px: droplets slip out from under this point (e.g. the tile's bottom edge). */
  fromX: number;
  fromY: number;
  /** Horizontal spread of the spout (± px around fromX). */
  spread: number;
  /** Where the first droplet meets the water, in container px. */
  landFirst: number;
  /** Where the last one does (the surface rises as they land); the others are spaced between. */
  landLast: number;
  /** Droplets. Default 7. */
  count?: number;
  /** Droplet height. Default 16. */
  size?: number;
}

/**
 * Let-go droplets (v2): one by one, ice-blue drops slip out from under the thawed tile, fall
 * (accelerating, stretching a little) into the savings glass and vanish into the water with a
 * faint ring. Absolute-fill and non-interactive: render it between the glass and the tile, so the
 * drops emerge from behind the tile. The caller times the water and haptics with dropletTimeline().
 * Render nothing under reduced motion.
 */
export const DropletFall = memo(function DropletFall({
  start,
  fromX,
  fromY,
  spread,
  landFirst,
  landLast,
  count = 7,
  size = 16,
}: DropletFallProps) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.noTouch]}>
      {start
        ? Array.from({ length: count }, (_, i) => {
            // Alternate sides of the spout so consecutive drops don't overlap, with jitter.
            const side = i % 2 === 0 ? -1 : 1;
            const x = fromX + side * spread * (0.15 + 0.85 * rand(i + 1));
            return (
              <Droplet
                key={i}
                x={x}
                y0={fromY}
                y1={landFirst + ((landLast - landFirst) * i) / Math.max(1, count - 1)}
                size={size * (0.85 + 0.3 * rand(i + 11))}
                delay={i * DROP_STAGGER_MS}
              />
            );
          })
        : null}
    </View>
  );
});

function Droplet({ x, y0, y1, size, delay }: { x: number; y0: number; y1: number; size: number; delay: number }) {
  const fall = useSharedValue(0);
  const ripple = useSharedValue(0);

  useEffect(() => {
    fall.set(withDelay(delay, withTiming(1, { duration: DROP_FALL_MS, easing: Easing.in(Easing.quad) })));
    ripple.set(
      withDelay(delay + DROP_FALL_MS, withTiming(1, { duration: RIPPLE_MS, easing: Easing.out(Easing.cubic) }))
    );
  }, [fall, ripple, delay]);

  const dropStyle = useAnimatedStyle(() => {
    const v = fall.get();
    return {
      opacity: v <= 0 || v >= 1 ? 0 : v < 0.12 ? v / 0.12 : 1,
      transform: [
        { translateX: x - size / 2 },
        // The droplet's tip leads: its bottom edge follows the path, from under the tile to the water.
        { translateY: y0 + (y1 - y0) * v - size },
        { scaleY: 1 + 0.2 * v },
        { scaleX: 1 - 0.1 * v },
      ],
    };
  });
  const rippleStyle = useAnimatedStyle(() => {
    const r = ripple.get();
    return {
      opacity: r <= 0 || r >= 1 ? 0 : 1 - r,
      transform: [
        { translateX: x - RIPPLE_W / 2 },
        { translateY: y1 - RIPPLE_H / 2 },
        { scaleX: 0.25 + 0.75 * r },
        { scaleY: 0.25 + 0.75 * r },
      ],
    };
  });

  return (
    <>
      <Animated.View style={[styles.ripple, rippleStyle]} />
      <Animated.View style={[styles.piece, dropStyle]}>
        <Coin size={size} shadowed={false} />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  noTouch: { pointerEvents: 'none', overflow: 'visible' },
  piece: { position: 'absolute', left: 0, top: 0 },
  ripple: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: RIPPLE_W,
    height: RIPPLE_H,
    borderRadius: RIPPLE_H,
    borderWidth: 1,
    borderColor: withAlpha(colors.white, 0.9),
  },
});
