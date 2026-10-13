import { memo, useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
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
import { scheduleOnRN } from 'react-native-worklets';

import { colors } from '@/theme/tokens';

import { Coin } from './Coin';
import { springPop, useReducedMotion } from './motion';

/** Anything that changes to fire again; falsy values never fire. */
export type BurstTrigger = number | string | boolean | null | undefined;

/** Deterministic pseudo-random in [0, 1). */
function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function triggerSeed(trigger: BurstTrigger): number {
  if (typeof trigger === 'number') return trigger;
  if (typeof trigger === 'string') return trigger.length * 31 + trigger.charCodeAt(0);
  return 1;
}

// ---------------------------------------------------------------------------
// Confetti

const CONFETTI_COLORS = [colors.plum900, colors.ice600, colors.ice400, colors.ice300] as const;
const GRAVITY = 1100; // px/s²

export interface ConfettiProps {
  /** Fires a burst whenever this changes to a truthy value (e.g. a counter). */
  trigger: BurstTrigger;
  /** Pieces. Default 24 (spec §5). */
  count?: number;
  /** Origin as fractions of the container. Default { x: 0.5, y: 0.4 }. */
  origin?: { x: number; y: number };
  /** Duration in ms. Default 1200. */
  duration?: number;
  /** Called when the burst finishes (also called, quickly, under reduced motion — which shows nothing). */
  onDone?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Celebration confetti (spec §5 Buy): 24 coral / mint / butter / lavender pieces shot up from an
 * origin, tumbling down under gravity and fading over ~1.2s. Absolute-fill and non-interactive:
 * put it last inside the screen.
 */
export const Confetti = memo(function Confetti({
  trigger,
  count = 24,
  origin = { x: 0.5, y: 0.4 },
  duration = 1200,
  onDone,
  style,
}: ConfettiProps) {
  const reduced = useReducedMotion();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const t = useSharedValue(0);
  const seed = triggerSeed(trigger);
  const active = !!trigger;

  useEffect(() => {
    if (!active) return;
    if (reduced) {
      const id = setTimeout(() => onDone?.(), 300);
      return () => clearTimeout(id);
    }
    t.set(0);
    t.set(
      withTiming(1, { duration, easing: Easing.linear }, (finished) => {
        if (finished && onDone) scheduleOnRN(onDone);
      })
    );
    // onDone is intentionally not a dependency: a new callback identity must not refire the burst.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, active, reduced, duration, t]);

  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const show = active && !reduced && size.w > 0;

  return (
    <View style={[StyleSheet.absoluteFill, styles.noTouch, style]} onLayout={onLayout}>
      {show
        ? Array.from({ length: count }, (_, i) => (
            <ConfettiPiece
              key={`${seed}-${i}`}
              t={t}
              duration={duration}
              x0={origin.x * size.w}
              y0={origin.y * size.h}
              seed={seed * 97 + i}
              index={i}
            />
          ))
        : null}
    </View>
  );
});

function ConfettiPiece({
  t,
  duration,
  x0,
  y0,
  seed,
  index,
}: {
  t: SharedValue<number>;
  duration: number;
  x0: number;
  y0: number;
  seed: number;
  index: number;
}) {
  const angle = (-90 + (rand(seed) - 0.5) * 130) * (Math.PI / 180);
  const speed = 380 + rand(seed + 1) * 420;
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;
  const spin = (rand(seed + 2) - 0.5) * 1440;
  const round = index % 3 === 0;
  const w = round ? 8 : 7 + rand(seed + 3) * 4;
  const h = round ? 8 : 11 + rand(seed + 4) * 6;
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];

  const style = useAnimatedStyle(() => {
    const p = t.get();
    const s = (p * duration) / 1000;
    return {
      opacity: p <= 0 || p >= 1 ? 0 : p > 0.72 ? (1 - p) / 0.28 : 1,
      transform: [
        { translateX: x0 - w / 2 + vx * s * 0.9 },
        { translateY: y0 - h / 2 + vy * s + 0.5 * GRAVITY * s * s },
        { rotate: `${spin * s}deg` },
        { scaleX: Math.cos(s * 9 + seed) },
      ],
    };
  });

  return (
    <Animated.View
      style={[styles.piece, { width: w, height: h, borderRadius: round ? w / 2 : 2, backgroundColor: color }, style]}
    />
  );
}

// ---------------------------------------------------------------------------
// CoinBurst

export interface CoinBurstProps {
  /** Fires a burst whenever this changes to a truthy value. */
  trigger: BurstTrigger;
  /** Burst centre in px, relative to the container (e.g. the product tile's centre). */
  origin: { x: number; y: number };
  /** Where coins fall to in px (e.g. the jar mouth). Omit to burst and fade in place. */
  target?: { x: number; y: number };
  /** Coins. Default 9 (spec: 8–10). */
  count?: number;
  /** Coin diameter. Default 34. */
  coinSize?: number;
  /** Called at the burst moment — play haptics.heavy here. */
  onBurst?: () => void;
  /** Called after the last coin lands (or right away under reduced motion, which shows no coins). */
  onLanded?: () => void;
  style?: StyleProp<ViewStyle>;
}

const BURST_HANG_MS = 380;
const FALL_MS = 560;
const FALL_STAGGER_MS = 55;

/**
 * Let-go coin burst (spec §4.6): coins pop outward from `origin` on random arcs with rotation
 * (spring.pop), hang for a beat, then drop one by one into `target`, shrinking as they land.
 * Absolute-fill and non-interactive.
 */
export const CoinBurst = memo(function CoinBurst({
  trigger,
  origin,
  target,
  count = 9,
  coinSize = 34,
  onBurst,
  onLanded,
  style,
}: CoinBurstProps) {
  const reduced = useReducedMotion();
  const active = !!trigger;
  const seed = triggerSeed(trigger);

  useEffect(() => {
    if (!active) return;
    onBurst?.();
    const total = reduced ? 0 : BURST_HANG_MS + (count - 1) * FALL_STAGGER_MS + FALL_MS;
    const id = setTimeout(() => onLanded?.(), total);
    return () => clearTimeout(id);
    // Callbacks are intentionally not dependencies: new identities must not refire the burst.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, active, reduced, count]);

  return (
    <View style={[StyleSheet.absoluteFill, styles.noTouch, style]}>
      {active && !reduced
        ? Array.from({ length: count }, (_, i) => (
            <BurstCoin
              key={`${seed}-${i}`}
              index={i}
              count={count}
              seed={seed * 31 + i}
              origin={origin}
              target={target}
              size={coinSize}
            />
          ))
        : null}
    </View>
  );
});

function BurstCoin({
  index,
  count,
  seed,
  origin,
  target,
  size,
}: {
  index: number;
  count: number;
  seed: number;
  origin: { x: number; y: number };
  target?: { x: number; y: number };
  size: number;
}) {
  const burst = useSharedValue(0);
  const fall = useSharedValue(0);

  // Spread evenly around an upward-biased arc, with jitter.
  const base = -200 + (index / Math.max(1, count - 1)) * 220;
  const angle = (base + (rand(seed) - 0.5) * 24) * (Math.PI / 180);
  const dist = 90 + rand(seed + 1) * 70;
  const bx = origin.x + Math.cos(angle) * dist;
  const by = origin.y + Math.sin(angle) * dist * 0.85 - 20;
  const rot = (rand(seed + 2) - 0.5) * 120;
  const scale = 0.75 + rand(seed + 3) * 0.45;
  const tx = target ? target.x + (rand(seed + 4) - 0.5) * 60 : bx;
  const ty = target ? target.y : by + 40;

  useEffect(() => {
    burst.set(withDelay(index * 12, withSpring(1, springPop)));
    fall.set(
      withDelay(
        BURST_HANG_MS + index * FALL_STAGGER_MS,
        withSequence(withTiming(1, { duration: FALL_MS, easing: Easing.in(Easing.quad) }))
      )
    );
  }, [burst, fall, index]);

  const style = useAnimatedStyle(() => {
    const b = burst.get();
    const f = fall.get();
    const x = origin.x + (bx - origin.x) * b;
    const y = origin.y + (by - origin.y) * b;
    return {
      opacity: f >= 1 ? 0 : f > 0.8 ? (1 - f) / 0.2 : Math.min(1, b * 2),
      transform: [
        { translateX: x + (tx - x) * f - size / 2 },
        { translateY: y + (ty - y) * f - size / 2 },
        { rotate: `${rot * b + 180 * f}deg` },
        { scale: scale * Math.max(0.2, b) * (1 - 0.3 * f) },
      ],
    };
  });

  return (
    <Animated.View style={[styles.piece, style]}>
      <Coin size={size} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  noTouch: { pointerEvents: 'none', overflow: 'visible' },
  piece: { position: 'absolute', left: 0, top: 0 },
});
