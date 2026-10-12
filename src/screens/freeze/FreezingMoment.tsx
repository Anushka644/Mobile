// The freezing moment (spec §4.3 "On submit", 12-frozen-solid): a ~1.6s full-sheet overlay.
//   1. The product drops in from above, trailing speed lines (gravity ease-in), and squashes on
//      landing (scaleY 0.85 / scaleX 1.08, then spring.pop back).
//   2. The ice body grows around it from 0.6 → 1 (spring.pop) while the frost fades in (400ms).
//   3. A white shock ring spreads over the puddle, snow dots burst outward, sparkles pop in.
//   4. haptics.success on landing; "Frozen solid." + "See you in 3 days." + the thaw-time pill rise in.
// Reduced motion: everything cross-fades into its final place.
//
// The cube is composed here (not the shared Cube) so the body and the product can move separately;
// its geometry, gradient, rim, frost, shine and bubbles mirror Cube at progress 0, scaled to 300.

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import {
  AppText,
  DESIGN_FRAME_WIDTH,
  GLOW_PRESETS,
  GlowBackground,
  GlowEllipse,
  glyphForItem,
  Icon,
  productImageFor,
  ProductTile,
  springPop,
  useReducedMotion,
} from '@/components';
import { haptics } from '@/lib/haptics';
import { colors, withAlpha } from '@/theme/tokens';
import type { Item } from '@/types';

/** How long the moment plays before the sheet moves on to the item. */
export const FREEZING_MOMENT_MS = 1600;

// Timeline (ms from mount).
const DROP_DELAY = 60;
const DROP_MS = 380;
const LAND = DROP_DELAY + DROP_MS;

// Hero geometry in a 393-wide frame (12-frozen-solid: the cube box top sits at y 201 of 852).
const HERO_H = 400;
const K = 1.5; // cube design box 200 → 300
const CUBE = 200 * K;
const CUBE_LEFT = (DESIGN_FRAME_WIDTH - CUBE) / 2;
const CUBE_TOP = 91;
const GROUND = CUBE_TOP + 176 * K; // 355
const BODY = 150 * K;
const BODY_LEFT = CUBE_LEFT + 25 * K;
const BODY_TOP = GROUND - BODY;
const PRODUCT = 92 * K;
const PRODUCT_LEFT = CUBE_LEFT + 54 * K;
const PRODUCT_TOP = CUBE_TOP + 55 * K;
const DROP = 340;
const RING_W = 299;
const RING_H = 50;
const TEXT_GAP = 80;
const TEXT_BLOCK_H = 40 + 10 + 24 + 10 + 32;

/** Speed lines above the product (x, top, height), from the Figma frame. */
const SPEED_LINES = [
  { x: 176, top: 36, h: 69 },
  { x: 200, top: 10, h: 95 },
  { x: 224, top: 46, h: 59 },
] as const;

/** Snow dots: final position + diameter (hero coordinates), burst from the cube's centre. */
const DOTS = [
  { x: 126, y: 71, d: 9 },
  { x: 198, y: 92, d: 4 },
  { x: 264, y: 85, d: 6 },
  { x: 337, y: 104, d: 8 },
  { x: 60, y: 166, d: 5 },
  { x: 339, y: 168, d: 9 },
  { x: 5, y: 211, d: 3 },
  { x: 348, y: 212, d: 3 },
  { x: 42, y: 268, d: 9 },
  { x: 357, y: 265, d: 5 },
  { x: 93, y: 298, d: 7 },
  { x: 337, y: 323, d: 8 },
  { x: 258, y: 325, d: 9 },
  { x: 124, y: 356, d: 6 },
  { x: 198, y: 349, d: 3 },
] as const;
const BURST_ORIGIN = { x: DESIGN_FRAME_WIDTH / 2, y: BODY_TOP + BODY / 2 };

/** Solid ice-blue four-point sparkles. */
const SPARKLES = [
  { x: 71, y: 101, size: 18 },
  { x: 310, y: 130, size: 16 },
  { x: 96, y: 309, size: 13 },
] as const;

const BUBBLES = [
  { left: '74%', top: '36%', d: 6 },
  { left: '20%', top: '64%', d: 8 },
  { left: '64%', top: '76%', d: 4.5 },
] as const;

export interface FreezingMomentProps {
  item: Item;
  /** "3 days" */
  cooldownLabel: string;
  /** "Fri 9:41 PM" */
  thawLabel: string;
  /** Adds "We’ll nudge you." when a thaw notification can be sent. */
  nudge: boolean;
}

export function FreezingMoment({ item, cooldownLabel, thawLabel, nudge }: FreezingMomentProps) {
  const reduced = useReducedMotion();
  const { height } = useWindowDimensions();

  const fade = useSharedValue(0);
  const drop = useSharedValue(reduced ? 0 : -DROP);
  const squash = useSharedValue(0);
  const body = useSharedValue(0);
  const frost = useSharedValue(0);
  const ring = useSharedValue(0);
  const burst = useSharedValue(0);
  const float = useSharedValue(0);
  const title = useSharedValue(0);
  const subtitle = useSharedValue(0);
  const pill = useSharedValue(0);

  useEffect(() => {
    const out = Easing.out(Easing.cubic);
    fade.set(withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) }));
    if (reduced) {
      const appear = (delay: number) => withDelay(delay, withTiming(1, { duration: 260 }));
      body.set(appear(80));
      frost.set(appear(80));
      ring.set(appear(120));
      burst.set(appear(160));
      title.set(appear(220));
      subtitle.set(appear(300));
      pill.set(appear(380));
    } else {
      drop.set(withDelay(DROP_DELAY, withTiming(0, { duration: DROP_MS, easing: Easing.in(Easing.quad) })));
      squash.set(
        withDelay(
          LAND,
          withSequence(
            withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) }),
            withSpring(0, springPop)
          )
        )
      );
      body.set(withDelay(LAND - 40, withSpring(1, springPop)));
      frost.set(withDelay(LAND, withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) })));
      ring.set(withDelay(LAND, withTiming(1, { duration: 700, easing: out })));
      burst.set(withDelay(LAND, withTiming(1, { duration: 900, easing: out })));
      float.set(withDelay(LAND + 900, withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true)));
      const rise = (delay: number) => withDelay(delay, withTiming(1, { duration: 420, easing: out }));
      title.set(rise(LAND + 120));
      subtitle.set(rise(LAND + 200));
      pill.set(rise(LAND + 280));
    }
    const timer = setTimeout(() => haptics.success(), reduced ? 120 : LAND);
    return () => clearTimeout(timer);
    // Runs once per mount: the moment plays a single time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fit the hero on short screens (and in the iOS page sheet on small phones).
  const scale = Math.min(1, Math.max(0.68, (height - TEXT_GAP - TEXT_BLOCK_H - 60) / HERO_H));

  const overlayStyle = useAnimatedStyle(() => ({ opacity: fade.get() }));
  const productStyle = useAnimatedStyle(() => {
    const s = squash.get();
    return {
      transform: [{ translateY: drop.get() }, { scaleX: 1 + 0.08 * s }, { scaleY: 1 - 0.15 * s }],
    };
  });
  const linesStyle = useAnimatedStyle(() => {
    const d = drop.get();
    return {
      opacity: interpolate(d, [-DROP, -DROP * 0.75, 0], [0, 0.95, 0.85], 'clamp'),
      transform: [{ translateY: d }, { scaleY: interpolate(d, [-DROP, 0], [1.6, 1], 'clamp') }],
    };
  });
  const bodyStyle = useAnimatedStyle(() => {
    const b = body.get();
    return { opacity: Math.min(1, Math.max(0, b * 2.5)), transform: [{ scale: 0.6 + 0.4 * b }] };
  });
  const frostStyle = useAnimatedStyle(() => ({ opacity: 0.38 * frost.get() }));
  const ringStyle = useAnimatedStyle(() => {
    const r = ring.get();
    return { opacity: Math.min(1, r * 3), transform: [{ scale: 0.55 + 0.45 * r }] };
  });
  const baseStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, body.get() * 1.5) }));

  const image = productImageFor(item);
  const glyph = glyphForItem(item);
  const subtitleText = `See you in ${cooldownLabel}.${nudge ? ' We’ll nudge you.' : ''}`;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, overlayStyle]}
      accessibilityViewIsModal
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Frozen solid. ${subtitleText} Thaws ${thawLabel}.`}
      testID="freezing-moment"
    >
      <GlowBackground preset="none" top={colors.lavender100} gradient={GLOW_PRESETS.frozen.gradient} />
      <View style={styles.spacerTop} />
      <View style={{ height: HERO_H * scale, width: DESIGN_FRAME_WIDTH }}>
        <View style={[styles.hero, { transform: [{ scale }] }]}>
          {/* ice400 glow under the cube */}
          <Animated.View style={[StyleSheet.absoluteFill, baseStyle]}>
            <GlowEllipse color={colors.ice400} x={66} y={GROUND - 25} width={260} height={120} blur={60} />
          </Animated.View>

          {/* Puddle + contact shade */}
          <Animated.View style={[styles.abs, styles.puddle, baseStyle]}>
            <Puddle />
          </Animated.View>
          <Animated.View style={[styles.abs, styles.contact, baseStyle]}>
            <GlowEllipse color={colors.ice800} x={0} y={0} width={190} height={22} blur={16} opacity={0.45} />
          </Animated.View>

          {/* Body (behind the product) */}
          <Animated.View style={[styles.abs, styles.body, styles.bodyFill, bodyStyle]}>
            <LinearGradient
              colors={[withAlpha(colors.ice50, 0.97), withAlpha(colors.ice200, 0.9), withAlpha(colors.ice400, 0.92)]}
              locations={[0, 0.55, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {/* Speed lines + the dropping product */}
          <Animated.View style={[styles.abs, styles.lines, linesStyle]}>
            {SPEED_LINES.map((l) => (
              <View key={l.x} style={[styles.line, { left: l.x, top: l.top, height: l.h }]} />
            ))}
          </Animated.View>
          <Animated.View style={[styles.abs, styles.product, productStyle]}>
            {image ? (
              <Image source={image} contentFit="contain" style={styles.productImage} accessibilityIgnoresInvertColors />
            ) : (
              <ProductTile category={item.category} glyph={glyph} size={PRODUCT} />
            )}
          </Animated.View>

          {/* Frost, rim, shine and bubbles (above the product) */}
          <Animated.View style={[styles.abs, styles.body, styles.rim, bodyStyle]}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.frost, frostStyle]} />
            <View style={styles.shineRow}>
              <View style={styles.shineBar} />
              <View style={styles.shineDot} />
            </View>
            {BUBBLES.map((b, i) => (
              <View
                key={i}
                style={[styles.bubble, { left: b.left, top: b.top, width: b.d * K, height: b.d * K, borderRadius: (b.d * K) / 2 }]}
              />
            ))}
          </Animated.View>

          {/* Shock ring on the puddle */}
          <Animated.View style={[styles.abs, styles.ring, ringStyle]}>
            <Svg width={RING_W} height={RING_H}>
              <Ellipse
                cx={RING_W / 2}
                cy={RING_H / 2}
                rx={RING_W / 2 - 2}
                ry={RING_H / 2 - 2}
                fill="none"
                stroke={colors.white}
                strokeOpacity={0.95}
                strokeWidth={3}
              />
            </Svg>
          </Animated.View>

          {DOTS.map((d, i) => (
            <SnowDot key={i} dot={d} index={i} burst={burst} float={float} />
          ))}
          {SPARKLES.map((s, i) => (
            <Sparkle key={i} {...s} delay={reduced ? 0 : LAND + 160 + i * 90} reduced={reduced} />
          ))}
        </View>
      </View>

      <View style={styles.text}>
        <Rise value={title}>
          <AppText variant="displayL" align="center" accessibilityRole="header">
            Frozen solid.
          </AppText>
        </Rise>
        <Rise value={subtitle}>
          <AppText variant="bodyL" color={colors.text.secondary} align="center">
            {subtitleText}
          </AppText>
        </Rise>
        <Rise value={pill}>
          <View style={styles.pill}>
            <Icon name="clock" size={18} color={colors.ice800} strokeWidth={2.4} />
            <AppText variant="labelM" color={colors.ice800} tabular>
              {`Thaws ${thawLabel}`}
            </AppText>
          </View>
        </Rise>
      </View>
      <View style={styles.spacerBottom} />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------

function Rise({ value, children }: { value: SharedValue<number>; children: ReactNode }) {
  const animated = useAnimatedStyle(() => {
    const v = value.get();
    return { opacity: v, transform: [{ translateY: (1 - v) * 14 }] };
  });
  return <Animated.View style={animated}>{children}</Animated.View>;
}

function SnowDot({
  dot,
  index,
  burst,
  float,
}: {
  dot: (typeof DOTS)[number];
  index: number;
  burst: SharedValue<number>;
  float: SharedValue<number>;
}) {
  const phase = index % 2 === 0 ? 1 : -1;
  const style = useAnimatedStyle(() => {
    const b = burst.get();
    const dx = (dot.x - BURST_ORIGIN.x) * (1 - b);
    const dy = (dot.y - BURST_ORIGIN.y) * (1 - b);
    return {
      opacity: Math.min(1, b * 4) * 0.95,
      transform: [
        { translateX: -dx },
        { translateY: -dy + phase * (float.get() * 2 - 1) * 3 },
        { scale: 0.3 + 0.7 * b },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.abs,
        styles.dot,
        { left: dot.x - dot.d / 2, top: dot.y - dot.d / 2, width: dot.d, height: dot.d, borderRadius: dot.d / 2 },
        style,
      ]}
    />
  );
}

function Sparkle({ x, y, size, delay, reduced }: { x: number; y: number; size: number; delay: number; reduced: boolean }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.set(withDelay(delay, reduced ? withTiming(1, { duration: 260 }) : withSpring(1, springPop)));
  }, [v, delay, reduced]);
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, v.get() * 2),
    transform: [{ scale: v.get() }, { rotate: `${(1 - v.get()) * -45}deg` }],
  }));
  return (
    <Animated.View style={[styles.abs, { left: x - size / 2, top: y - size / 2 }, style]}>
      <Icon name="sparkle" size={size} color={colors.ice600} fill={colors.ice600} strokeWidth={1.4} />
    </Animated.View>
  );
}

function Puddle() {
  const w = 96 * K;
  const h = 16 * K;
  return (
    <Svg width={w} height={h}>
      <Defs>
        <RadialGradient id="frozenPuddle" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor={colors.ice400} stopOpacity={1} />
          <Stop offset="0.55" stopColor={colors.ice300} stopOpacity={1} />
          <Stop offset="1" stopColor={colors.ice200} stopOpacity={1} />
        </RadialGradient>
      </Defs>
      <Ellipse
        cx={w / 2}
        cy={h / 2}
        rx={w / 2 - 1}
        ry={h / 2 - 1}
        fill="url(#frozenPuddle)"
        stroke={colors.white}
        strokeOpacity={0.9}
        strokeWidth={1.5}
        opacity={0.5}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', overflow: 'hidden', backgroundColor: colors.bg.canvas },
  spacerTop: { flexGrow: 44, flexShrink: 1 },
  spacerBottom: { flexGrow: 56, flexShrink: 1 },
  hero: { width: DESIGN_FRAME_WIDTH, height: HERO_H, transformOrigin: 'top' },
  abs: { position: 'absolute' },
  puddle: { left: (DESIGN_FRAME_WIDTH - 96 * K) / 2, top: GROUND - 8 * K },
  contact: { left: (DESIGN_FRAME_WIDTH - 190) / 2, top: GROUND - 9, width: 190, height: 22 },
  body: { left: BODY_LEFT, top: BODY_TOP, width: BODY, height: BODY, borderRadius: 40 * K, overflow: 'hidden' },
  bodyFill: { boxShadow: `0px ${16 * K}px ${32 * K}px ${-6 * K}px ${withAlpha(colors.ice400, 0.45)}` },
  rim: { borderWidth: 2 * K, borderColor: withAlpha(colors.white, 0.75) },
  frost: { backgroundColor: colors.white },
  shineRow: {
    position: 'absolute',
    left: 18 * K,
    top: 15 * K,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6 * K,
  },
  shineBar: { width: '30%', height: 9 * K, borderRadius: 5 * K, backgroundColor: withAlpha(colors.white, 0.95) },
  shineDot: { width: 9 * K, height: 9 * K, borderRadius: 4.5 * K, backgroundColor: withAlpha(colors.white, 0.95) },
  bubble: { position: 'absolute', backgroundColor: withAlpha(colors.white, 0.75) },
  lines: { left: 0, top: 0, width: DESIGN_FRAME_WIDTH, height: 110, transformOrigin: 'bottom' },
  line: { position: 'absolute', width: 6, borderRadius: 3, backgroundColor: withAlpha(colors.white, 0.9) },
  product: { left: PRODUCT_LEFT, top: PRODUCT_TOP, width: PRODUCT, height: PRODUCT, transformOrigin: 'bottom' },
  productImage: { width: PRODUCT, height: PRODUCT },
  ring: { left: (DESIGN_FRAME_WIDTH - RING_W) / 2, top: GROUND + 1 - RING_H / 2, width: RING_W, height: RING_H },
  dot: { backgroundColor: colors.white },
  text: { marginTop: TEXT_GAP, alignItems: 'center', paddingHorizontal: 24, gap: 10 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.ice100,
  },
});
