// The hero object: an ice cube that melts continuously with `progress` (spec §3 Cube).
//
// Geometry is defined on a 200 × 200 box (ground line y = 176) and scaled by size / 200, so the cube
// stays crisp at every size (no transform scaling). Layers, bottom to top:
//   puddle → contact shadow → [breathing group: body → product → overlay (frost, rim, shine, bubbles)]
//   → droplets → drip → sparkles
// Everything melt-related is driven by Reanimated shared values: progress animates over 600ms when the
// prop changes, the thawed state cross-fades the ice away and pops the sparkles in.

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useId } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { meltProgress } from '@/lib/melt';
import { colors, withAlpha } from '@/theme/tokens';
import type { Category, Item } from '@/types';

import { GlowEllipse } from './Glow';
import { glyphForItem } from './glyphs';
import { Icon, type IconName } from './Icon';
import { timingMelt, useReducedMotion } from './motion';
import { productImageFor, ProductTile, toImageSource, type ProductImageSource } from './ProductImage';

export interface CubeProps {
  /** Melt progress 0..1 (continuous; use meltProgress(item, now)). */
  progress: number;
  /** Thawed state (also implied by progress >= 1): ice gone, product on a puddle, bobbing sparkles. */
  thawed?: boolean;
  /** Rendered box size in px (the cube's 200 × 200 design box). Default 200. */
  size?: number;
  /** Product picture: a bundled asset, `{ uri }` or a uri string. Without one, the category tile is used. */
  image?: ProductImageSource | string | null;
  /** Fallback tile accent + glyph. Default 'other'. */
  category?: Category;
  /** Fallback glyph override (e.g. 'footprints' for sneakers). */
  glyph?: IconName;
  /** Idle animation (breathing + drip while cooling, bobbing sparkles when thawed). Default true. */
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

// Design-box constants (spec §3 Cube).
const GROUND = 176;
const PRODUCT = 92;
const PRODUCT_TOP_FROZEN = 55; // progress 0: centred in the 150-tall body (Figma Onboarding 1 / Empty)
const PRODUCT_TOP_COOLING = 76; // progress ≥ 0.5: bottom at 168, resting near the bottom of the body
const PRODUCT_TOP_THAWED = 80; // bottom at 172: sits on the puddle
const PUDDLE_W = 176;
const PUDDLE_H = 32;
const CONTACT_W = 140;
const CONTACT_H = 16;

const BUBBLES = [
  { left: '74%', top: '36%', d: 6 },
  { left: '20%', top: '64%', d: 8 },
  { left: '64%', top: '76%', d: 4.5 },
] as const;

/** Body size at a progress value (design units). Width 150→138, height 150→84, radius 40→44 over 0→0.75. */
function bodyGeometry(progress: number): { w: number; h: number; r: number } {
  'worklet';
  const t = Math.min(1, Math.max(0, progress / 0.75));
  return { w: 150 - 12 * t, h: 150 - 66 * t, r: 40 + 4 * t };
}

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

/** The ice cube hero with a continuous melt (see file header). */
export const Cube = memo(function Cube({
  progress,
  thawed = false,
  size = 200,
  image,
  category = 'other',
  glyph,
  animated = true,
  style,
  accessibilityLabel,
  testID,
}: CubeProps) {
  const k = size / 200;
  const target = clamp01(progress);
  const isThawed = thawed || target >= 1;
  const reduced = useReducedMotion();
  const source = toImageSource(image);
  const gradientId = `puddle${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const p = useSharedValue(target);
  const th = useSharedValue(isThawed ? 1 : 0);
  const breathe = useSharedValue(0);
  const drip = useSharedValue(0);
  const bob = useSharedValue(0);

  useEffect(() => {
    p.set(withTiming(target, timingMelt));
  }, [p, target]);

  useEffect(() => {
    th.set(withTiming(isThawed ? 1 : 0, { duration: reduced ? 220 : 650, easing: Easing.out(Easing.cubic) }));
  }, [th, isThawed, reduced]);

  const idle = animated && !reduced;
  useEffect(() => {
    if (!idle) return;
    if (isThawed) {
      bob.set(withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }), -1, true));
    } else {
      breathe.set(withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }), -1, true));
      drip.set(
        withRepeat(
          withSequence(
            withTiming(0, { duration: 0 }),
            withDelay(4800, withTiming(1, { duration: 1300, easing: Easing.in(Easing.quad) }))
          ),
          -1
        )
      );
    }
    return () => {
      cancelAnimation(bob);
      cancelAnimation(breathe);
      cancelAnimation(drip);
      bob.set(0);
      breathe.set(0);
      drip.set(0);
    };
  }, [idle, isThawed, bob, breathe, drip]);

  // --- animated styles -------------------------------------------------------

  const contactStyle = useAnimatedStyle(() => {
    const g = bodyGeometry(p.get());
    return { opacity: 1 - th.get(), transform: [{ scaleX: (g.w * 0.9) / CONTACT_W }] };
  });

  const groupStyle = useAnimatedStyle(() => {
    // Breathing: scaleY 1 ↔ 1.01 around the ground line.
    const s = 1 + 0.01 * breathe.get();
    return { transform: [{ translateY: (GROUND - 100) * k * (1 - s) }, { scaleY: s }] };
  });

  const bodyStyle = useAnimatedStyle(() => {
    const g = bodyGeometry(p.get());
    return {
      left: (100 - g.w / 2) * k,
      top: (GROUND - g.h) * k,
      width: g.w * k,
      height: g.h * k,
      borderRadius: g.r * k,
      opacity: 1 - th.get(),
    };
  });

  const overlayStyle = useAnimatedStyle(() => {
    const g = bodyGeometry(p.get());
    return {
      left: (100 - g.w / 2) * k,
      top: (GROUND - g.h) * k,
      width: g.w * k,
      height: g.h * k,
      borderRadius: g.r * k,
      opacity: 1 - th.get(),
    };
  });

  const frostStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.get(), [0, 0.75], [0.38, 0.16], 'clamp'),
  }));

  const productStyle = useAnimatedStyle(() => ({
    // Product y: centred while solid, settles to the bottom as the body melts, then onto the puddle.
    top:
      interpolate(
        th.get(),
        [0, 1],
        [interpolate(p.get(), [0, 0.5], [PRODUCT_TOP_FROZEN, PRODUCT_TOP_COOLING], 'clamp'), PRODUCT_TOP_THAWED]
      ) * k,
  }));

  const puddleStyle = useAnimatedStyle(() => {
    const pv = p.get();
    const tv = th.get();
    const w = interpolate(tv, [0, 1], [96 + 74 * pv, PUDDLE_W]);
    const h = interpolate(tv, [0, 1], [16 + 14 * pv, PUDDLE_H]);
    return {
      opacity: interpolate(tv, [0, 1], [0.35 + 0.5 * pv, 0.9]),
      transform: [{ scaleX: w / PUDDLE_W }, { scaleY: h / PUDDLE_H }],
    };
  });

  return (
    <View
      style={[{ width: size, height: size }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? (isThawed ? 'Thawed' : `${Math.round(target * 100)}% melted`)}
      testID={testID}
    >
      {/* Puddle */}
      <Animated.View
        style={[
          styles.abs,
          {
            left: (100 - PUDDLE_W / 2) * k,
            top: (GROUND - PUDDLE_H / 2) * k,
            width: PUDDLE_W * k,
            height: PUDDLE_H * k,
          },
          puddleStyle,
        ]}
      >
        <Svg width={PUDDLE_W * k} height={PUDDLE_H * k}>
          <Defs>
            <RadialGradient id={gradientId} cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor={colors.ice400} stopOpacity={1} />
              <Stop offset="0.55" stopColor={colors.ice300} stopOpacity={1} />
              <Stop offset="1" stopColor={colors.ice200} stopOpacity={1} />
            </RadialGradient>
          </Defs>
          <Ellipse
            cx={(PUDDLE_W / 2) * k}
            cy={(PUDDLE_H / 2) * k}
            rx={(PUDDLE_W / 2 - 1) * k}
            ry={(PUDDLE_H / 2 - 1) * k}
            fill={`url(#${gradientId})`}
            stroke={colors.white}
            strokeOpacity={0.9}
            strokeWidth={Math.max(1, 1.5 * k)}
          />
          <Ellipse
            cx={PUDDLE_W * 0.27 * k}
            cy={PUDDLE_H * 0.36 * k}
            rx={PUDDLE_W * 0.1 * k}
            ry={PUDDLE_H * 0.11 * k}
            fill={colors.white}
            opacity={0.85}
          />
        </Svg>
      </Animated.View>

      {/* Contact shadow: the soft blue-grey shade where the ice meets the puddle */}
      <Animated.View
        style={[
          styles.abs,
          {
            left: (100 - CONTACT_W / 2) * k,
            top: (GROUND - CONTACT_H / 2 + 3) * k,
            width: CONTACT_W * k,
            height: CONTACT_H * k,
          },
          contactStyle,
        ]}
      >
        <GlowEllipse
          color={colors.ice800}
          x={0}
          y={0}
          width={CONTACT_W * k}
          height={CONTACT_H * k}
          blur={10 * k}
          opacity={0.42}
        />
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, groupStyle]}>
        {/* Body */}
        <Animated.View
          style={[
            styles.abs,
            styles.clip,
            { boxShadow: `0px ${16 * k}px ${32 * k}px ${-6 * k}px ${withAlpha(colors.ice400, 0.45)}` },
            bodyStyle,
          ]}
        >
          <LinearGradient
            colors={[withAlpha(colors.ice50, 0.97), withAlpha(colors.ice200, 0.9), withAlpha(colors.ice400, 0.92)]}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Product */}
        <Animated.View
          style={[styles.abs, { left: (100 - PRODUCT / 2) * k, width: PRODUCT * k, height: PRODUCT * k }, productStyle]}
        >
          {source ? (
            <Image
              source={source}
              contentFit="contain"
              style={{ width: PRODUCT * k, height: PRODUCT * k }}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <ProductTile category={category} glyph={glyph} size={PRODUCT * k} />
          )}
        </Animated.View>

        {/* Frost, rim, shine and bubbles */}
        <Animated.View
          style={[
            styles.abs,
            styles.clip,
            { borderWidth: Math.max(1, 2 * k), borderColor: withAlpha(colors.white, 0.75) },
            overlayStyle,
          ]}
        >
          <Animated.View style={[StyleSheet.absoluteFill, styles.frost, frostStyle]} />
          <View style={[styles.shineRow, { left: 18 * k, top: 15 * k, gap: 6 * k }]}>
            <View style={[styles.shine, { width: '30%', height: 9 * k, borderRadius: 5 * k }]} />
            <View style={[styles.shine, { width: 9 * k, height: 9 * k, borderRadius: 4.5 * k }]} />
          </View>
          {BUBBLES.map((b, i) => (
            <View
              key={i}
              style={[
                styles.bubble,
                { left: b.left, top: b.top, width: b.d * k, height: b.d * k, borderRadius: (b.d * k) / 2 },
              ]}
            />
          ))}
        </Animated.View>
      </Animated.View>

      <Droplet side="left" k={k} p={p} th={th} />
      <Droplet side="right" k={k} p={p} th={th} />
      {idle && !isThawed ? <Drip k={k} p={p} th={th} drip={drip} /> : null}

      <Sparkle k={k} th={th} bob={bob} x={30} y={40} size={22} phase={1} />
      <Sparkle k={k} th={th} bob={bob} x={150} y={26} size={18} phase={-1} />
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
 * The Cube for an item: resolves its picture (imageUri / demo render), category accent and a
 * name-specific fallback glyph, and derives progress / thawed from `now`.
 */
export function ItemCube({ item, now, progress, thawed, ...rest }: ItemCubeProps) {
  const p = progress ?? (now != null ? meltProgress(item, now) : 0);
  const t = thawed ?? (now != null ? now >= item.thawAt : p >= 1);
  return (
    <Cube
      progress={p}
      thawed={t}
      image={productImageFor(item)}
      category={item.category}
      glyph={glyphForItem(item)}
      accessibilityLabel={`${item.name}, ${t ? 'thawed' : `${Math.round(p * 100)}% melted`}`}
      {...rest}
    />
  );
}

// ---------------------------------------------------------------------------

interface LayerProps {
  k: number;
  p: SharedValue<number>;
  th: SharedValue<number>;
}

/** 11 × 14 ice300 bead at the body's edge, visible once progress ≥ 0.25. */
function Droplet({ side, k, p, th }: LayerProps & { side: 'left' | 'right' }) {
  const style = useAnimatedStyle(() => {
    const pv = p.get();
    const g = bodyGeometry(pv);
    const edge = side === 'left' ? 100 - g.w / 2 - 2 : 100 + g.w / 2 + 2;
    return {
      left: (edge - 5.5) * k,
      opacity: interpolate(pv, [0.2, 0.25], [0, 1], 'clamp') * (1 - th.get()),
    };
  });
  return (
    <Animated.View
      style={[
        styles.abs,
        styles.droplet,
        {
          top: (GROUND - 18) * k,
          width: 11 * k,
          height: 14 * k,
          borderRadius: 5.5 * k,
          borderWidth: Math.max(1, 1.5 * k),
        },
        style,
      ]}
    />
  );
}

/** A drop that runs down the right edge every ~6s while cooling. */
function Drip({ k, p, th, drip }: LayerProps & { drip: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const g = bodyGeometry(p.get());
    const d = drip.get();
    const y0 = GROUND - g.h * 0.62;
    const y1 = GROUND - 12;
    const fade = d < 0.12 ? d / 0.12 : d > 0.82 ? Math.max(0, (1 - d) / 0.18) : 1;
    return {
      left: (100 + g.w / 2 - 6) * k,
      top: (y0 + (y1 - y0) * d) * k,
      opacity: fade * (1 - th.get()),
      transform: [{ scaleY: 1 + 0.25 * d }],
    };
  });
  return (
    <Animated.View style={[styles.abs, styles.drip, { width: 7 * k, height: 9 * k, borderRadius: 3.5 * k }, style]} />
  );
}

/** Thawed sparkle: pops in with the thaw, bobs ±4 over a 2.4s loop. */
function Sparkle({
  k,
  th,
  bob,
  x,
  y,
  size,
  phase,
}: {
  k: number;
  th: SharedValue<number>;
  bob: SharedValue<number>;
  x: number;
  y: number;
  size: number;
  phase: 1 | -1;
}) {
  const style = useAnimatedStyle(() => {
    const tv = th.get();
    return {
      opacity: interpolate(tv, [0.4, 1], [0, 1], 'clamp'),
      transform: [
        { translateY: phase * (bob.get() * 2 - 1) * 4 * k },
        { scale: interpolate(tv, [0, 0.7, 1], [0.3, 1.18, 1], 'clamp') },
      ],
    };
  });
  return (
    <Animated.View style={[styles.abs, { left: x * k, top: y * k }, style]}>
      <Icon name="sparkle" size={size * k} color={colors.butter500} strokeWidth={2.6} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  clip: { overflow: 'hidden' },
  frost: { backgroundColor: colors.white },
  shineRow: { position: 'absolute', width: '100%', flexDirection: 'row', alignItems: 'center' },
  shine: { backgroundColor: withAlpha(colors.white, 0.95) },
  bubble: { position: 'absolute', backgroundColor: withAlpha(colors.white, 0.75) },
  droplet: {
    backgroundColor: colors.ice300,
    borderColor: withAlpha(colors.white, 0.85),
    boxShadow: `0px 2px 4px 0px ${withAlpha(colors.ice600, 0.25)}`,
  },
  drip: { backgroundColor: colors.ice300 },
});
