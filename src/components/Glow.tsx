// Background glow system (spec §2 "Background glows" — art-directed in Figma, follow exactly).
//
// - Tab screens (Freezer home, Empty freezer, Insights, You) are plain cream: preset 'none'.
// - Every other screen has ONE wide, very soft top glow: an ellipse 528 × 358 at (−67, −118) in the
//   393-wide design frame, solid accent, Figma layer blur 200 (CSS blur 100px).
// - Some screens add one primary glow behind the hero and/or a full-frame gradient (GLOW_PRESETS).
//
// Rendering: on web the ellipse is a real CSS `filter: blur()` (pixel-identical to the Figma export);
// on iOS/Android it is an SVG radial gradient whose stops follow the same Gaussian falloff.
// Geometry is in design-frame coordinates; the frame is centred horizontally on wider screens.

import { LinearGradient } from 'expo-linear-gradient';
import { memo, useId } from 'react';
import { Platform, StyleSheet, View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme/tokens';

/** Width of the design frame the glow geometry is expressed in (iPhone 15/16). */
export const DESIGN_FRAME_WIDTH = 393;

export interface GlowEllipseSpec {
  /** Solid accent color (a token, e.g. colors.lavender100). */
  color: string;
  /** Left edge of the un-blurred ellipse, in design-frame px. */
  x: number;
  /** Top edge of the un-blurred ellipse, in design-frame px. */
  y: number;
  width: number;
  height: number;
  /** Figma layer blur (CSS blur radius = blur / 2). */
  blur: number;
  /** Layer opacity. Default 1. */
  opacity?: number;
}

/** The shared top glow geometry: 528 × 358 at (−67, −118), blur 200. */
export const TOP_GLOW = { x: -67, y: -118, width: 528, height: 358, blur: 200 } as const;

/** A vertical full-frame gradient behind the glows. */
export interface FrameGradientSpec {
  colors: readonly [string, string, ...string[]];
  locations?: readonly [number, number, ...number[]];
  /** Height in px from the top (the last color continues below). Default: full height. */
  height?: number;
}

export interface GlowPresetSpec {
  /** Accent of the top glow (omit for none). */
  top?: string;
  /** Optional primary glow behind the hero object. */
  primary?: GlowEllipseSpec;
  /** Optional full-frame gradient, drawn first. */
  gradient?: FrameGradientSpec;
}


/**
 * v2 "frost minimal": no coloured glows. Every screen is plain paper; the few ice moments (an item
 * cooling, the freezing moment, letting go) get one quiet vertical frost wash at the top instead.
 */
const FROST_WASH: FrameGradientSpec = {
  colors: [colors.ice100, colors.cream100],
  locations: [0, 1],
  height: 420,
};

export const GLOW_PRESETS: Record<
  'none' | 'item' | 'thawed' | 'letGo' | 'saved' | 'onboarding1' | 'onboarding2' | 'onboarding3' | 'frozen',
  GlowPresetSpec
> = {
  none: {},
  item: { gradient: FROST_WASH },
  thawed: {},
  letGo: { gradient: FROST_WASH },
  saved: {},
  onboarding1: {},
  onboarding2: {},
  onboarding3: {},
  frozen: { gradient: { colors: [colors.ice200, colors.ice50, colors.cream100], locations: [0, 0.5, 1] } },
};

export type GlowPreset = keyof typeof GLOW_PRESETS;

// ---------------------------------------------------------------------------
// Gaussian falloff for the native radial-gradient approximation

/** Abramowitz–Stegun 7.1.26 erf approximation (|error| < 1.5e-7). */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

/** Intensity of a 1D box of half-width `half` blurred by `sigma`, at distance `d` from its centre. */
function boxBlur(half: number, sigma: number, d: number): number {
  const k = sigma * Math.SQRT2;
  return 0.5 * (erf((half - d) / k) + erf((half + d) / k));
}

const STOPS = 14;

/** Radial-gradient stops (offset 0..1 → opacity) approximating a blurred ellipse. Exported for tests. */
export function gaussianStops(
  halfW: number,
  halfH: number,
  sigma: number,
  pad: number
): { offset: number; opacity: number }[] {
  if (!(sigma > 0))
    return [
      { offset: 0, opacity: 1 },
      { offset: 1, opacity: 1 },
    ];
  const stops: { offset: number; opacity: number }[] = [];
  for (let i = 0; i <= STOPS; i++) {
    const t = i / STOPS;
    const vx = boxBlur(halfW, sigma, t * (halfW + pad));
    const vy = boxBlur(halfH, sigma, t * (halfH + pad));
    const v = Math.sqrt(Math.max(0, vx) * Math.max(0, vy));
    stops.push({ offset: t, opacity: i === STOPS ? 0 : Math.min(1, v) });
  }
  return stops;
}

// ---------------------------------------------------------------------------

export interface GlowEllipseProps extends GlowEllipseSpec {
  style?: StyleProp<ViewStyle>;
}

/**
 * One blurred ellipse, absolutely positioned in the parent (design-frame coordinates). Render it
 * inside GlowBackground / a 393-wide frame, or any absolutely positioned container.
 */
export const GlowEllipse = memo(function GlowEllipse({
  color,
  x,
  y,
  width,
  height,
  blur,
  opacity = 1,
  style,
}: GlowEllipseProps) {
  const id = `glow${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const sigma = blur / 2;

  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          styles.abs,
          {
            left: x,
            top: y,
            width,
            height,
            borderRadius: '50%',
            backgroundColor: color,
            opacity,
            filter: sigma > 0 ? `blur(${sigma}px)` : undefined,
          },
          style,
        ]}
      />
    );
  }

  const pad = Math.round(sigma * 2.6);
  const w = width + pad * 2;
  const h = height + pad * 2;
  const stops = gaussianStops(width / 2, height / 2, sigma, pad);
  return (
    <View style={[styles.abs, { left: x - pad, top: y - pad, width: w, height: h, opacity }, style]}>
      <Svg width={w} height={h}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            {stops.map((s) => (
              <Stop key={s.offset} offset={s.offset} stopColor={color} stopOpacity={s.opacity} />
            ))}
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={w} height={h} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
});

export interface TopGlowProps {
  /** Accent color (token). */
  color: string;
  opacity?: number;
}

/** The wide, very soft top glow shared by every non-tab screen (528 × 358 at −67, −118, blur 200). */
export function TopGlow({ color, opacity }: TopGlowProps) {
  return <GlowEllipse color={color} opacity={opacity} {...TOP_GLOW} />;
}

export type PrimaryGlowProps = GlowEllipseSpec;

/** A screen's primary glow behind the hero object (geometry from GLOW_PRESETS). */
export function PrimaryGlow(props: PrimaryGlowProps) {
  return <GlowEllipse {...props} />;
}

export interface GlowBackgroundProps extends GlowPresetSpec {
  /** A preset from the spec table. Explicit `top` / `primary` / `gradient` props override it. */
  preset?: GlowPreset;
  /** Base color under everything. Default bg.canvas (cream). Pass null for transparent. */
  background?: ColorValue | null;
  style?: StyleProp<ViewStyle>;
}

/**
 * Absolute-fill, non-interactive background layer: canvas color, optional frame gradient, top glow
 * and primary glow, in that order. `<Screen glow="thawed">` renders this for you.
 */
export const GlowBackground = memo(function GlowBackground({
  preset = 'none',
  top,
  primary,
  gradient,
  background = colors.bg.canvas,
  style,
}: GlowBackgroundProps) {
  const spec: GlowPresetSpec = GLOW_PRESETS[preset];
  const g = gradient ?? spec.gradient;
  const topColor = top ?? spec.top;
  const p = primary ?? spec.primary;

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.clip, background != null ? { backgroundColor: background } : null, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {g ? (
        <LinearGradient
          colors={g.colors}
          locations={g.locations}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.gradient, g.height != null ? { height: g.height } : styles.fullHeight]}
        />
      ) : null}
      <View style={styles.frame}>
        {topColor ? <TopGlow color={topColor} /> : null}
        {p ? <PrimaryGlow {...p} /> : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  clip: { overflow: 'hidden', pointerEvents: 'none' },
  gradient: { position: 'absolute', left: 0, right: 0, top: 0 },
  fullHeight: { bottom: 0 },
  frame: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: DESIGN_FRAME_WIDTH,
    marginLeft: -DESIGN_FRAME_WIDTH / 2,
  },
});
