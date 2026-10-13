// Chill design tokens — v2 "frost minimal" (docs/DESIGN_SYSTEM_V2.md).
// One quiet system: paper canvas, ink type and actions, a single ice-blue accent. Do not hand-tune
// colors in components; add a token instead.
import type { TextStyle, ViewStyle } from 'react-native';

// ---------------------------------------------------------------------------
// Colors

export const palette = {
  // v2 "frost minimal": the legacy family names are kept so every screen restyles at once, but the
  // values now form one quiet system — paper, ink, and a single ice-blue accent.
  /** Paper: canvas and quiet fills. */
  cream50: '#FBFBF9',
  cream100: '#F6F6F3',
  cream200: '#EEEEEA',
  cream300: '#E2E2DD',

  /** Ink: text, primary actions, hairlines. */
  plum900: '#111113',
  plum700: '#2E2E33',
  plum500: '#6F6F76',
  plum300: '#A9A9AF',
  plum100: '#E8E8E4',

  /** Destructive only. */
  coral500: '#E5484D',
  coral300: '#F2A3A5',
  coral100: '#FCECEC',

  /** Accent (ice blue). */
  lavender500: '#2B74E0',
  lavender300: '#A9C9F2',
  lavender100: '#EDF3FB',

  mint700: '#2B74E0',
  mint500: '#5B9BEF',
  mint300: '#B4D0F4',
  mint100: '#EDF3FB',

  butter700: '#1A4F9E',
  butter600: '#2B74E0',
  butter500: '#8AB6E6',
  butter300: '#C6DBF3',
  butter100: '#F0F5FB',

  ice50: '#F3F7FB',
  ice100: '#E9F0F7',
  ice200: '#D6E4F1',
  ice300: '#B9D1E8',
  ice400: '#8AB6E6',
  ice600: '#2B74E0',
  ice800: '#1A4F9E',

  white: '#FFFFFF',
} as const;

export const semantic = {
  bg: {
    canvas: palette.cream100,
    surface: palette.white,
    sunken: palette.cream200,
    elevated: palette.cream50,
    inverse: palette.plum900,
  },
  text: {
    primary: palette.plum900,
    secondary: palette.plum500,
    tertiary: palette.plum300,
    inverse: palette.white,
    ice: palette.ice600,
    success: palette.ice600,
  },
  border: {
    subtle: palette.plum100,
    strong: '#CFCFCA',
    ice: palette.ice300,
  },
  accent: {
    coral: palette.coral500,
    coralSoft: palette.coral100,
    lavender: palette.lavender500,
    lavenderSoft: palette.lavender100,
    mint: palette.mint500,
    mintSoft: palette.mint100,
    butter: palette.butter500,
    butterSoft: palette.butter100,
  },
  ice: {
    surface: palette.ice100,
    frost: palette.ice50,
    body: palette.ice200,
    edge: palette.ice300,
    glow: palette.ice400,
    deep: palette.ice600,
  },
  action: {
    primary: palette.plum900,
    secondary: palette.white,
  },
  status: {
    success: palette.ice600,
    warning: palette.ice400,
    danger: palette.coral500,
  },
} as const;

/** Primitives (colors.cream100) and semantic groups (colors.bg.canvas) in one object. */
export const colors = { ...palette, ...semantic } as const;

export type PaletteColor = keyof typeof palette;

// ---------------------------------------------------------------------------
// Spacing & radius

/** Spacing scale, keyed by its pixel value: `space[16]` === 16. */
export const space = {
  0: 0,
  2: 2,
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
  48: 48,
  64: 64,
} as const;

export type SpaceKey = keyof typeof space;

export const radius = {
  xs: 8,
  sm: 12,
  md: 20,
  lg: 28,
  xl: 36,
  '2xl': 48,
  /** alias of '2xl' */
  xxl: 48,
  full: 999,
} as const;

export type RadiusKey = keyof typeof radius;

// ---------------------------------------------------------------------------
// Typography
// Family names match the keys registered with useFonts (see ./fonts.ts), which
// are the @expo-google-fonts export names. Do not set fontWeight alongside these
// families — the weight is baked into each family (Android would fall back).

export const fontFamily = {
  /** Geist — the UI face. Legacy role names map onto its weights. */
  displaySemiBold: 'Geist_600SemiBold',
  displayBold: 'Geist_600SemiBold',
  displayExtraBold: 'Geist_600SemiBold',
  bodyMedium: 'Geist_400Regular',
  bodySemiBold: 'Geist_500Medium',
  bodyBold: 'Geist_500Medium',
  bodyExtraBold: 'Geist_600SemiBold',
  light: 'Geist_300Light',
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  /** Instrument Serif — editorial display moments (titles, questions, big feelings). */
  serif: 'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
  /** Geist Mono — captions, time, money in lists. */
  mono: 'GeistMono_400Regular',
  monoMedium: 'GeistMono_500Medium',
} as const;

export type FontFamilyKey = keyof typeof fontFamily;

/** Figma letter-spacing is a % of font size; RN wants px. */
const tracking = (fontSize: number, percent: number) =>
  Math.round(fontSize * (percent / 100) * 1000) / 1000;

const textStyle = (
  family: string,
  fontSize: number,
  lineHeight: number,
  letterSpacingPercent = 0
): TextStyle => ({
  fontFamily: family,
  fontSize,
  lineHeight,
  letterSpacing: tracking(fontSize, letterSpacingPercent),
});

export const typography = {
  /** Display/XL — Instrument Serif 56/56, -2% */
  displayXL: textStyle(fontFamily.serif, 56, 56, -2),
  /** Display/L — Instrument Serif 42/44, -1.5% (screen titles, big questions) */
  displayL: textStyle(fontFamily.serif, 42, 44, -1.5),
  /** Display/Italic — Instrument Serif Italic 28/32 (reflections, asides) */
  displayItalic: textStyle(fontFamily.serifItalic, 28, 32, -1),
  /** Title/L — Geist SemiBold 24/28, -3% */
  titleL: textStyle(fontFamily.displaySemiBold, 24, 28, -3),
  /** Title/M — Geist SemiBold 19/24, -2% */
  titleM: textStyle(fontFamily.displaySemiBold, 19, 24, -2),
  /** Title/S — Geist Medium 16/21, -1.5% */
  titleS: textStyle(fontFamily.medium, 16, 21, -1.5),
  /** Numeric/XL — Geist Light 72/72, -5% */
  numericXL: textStyle(fontFamily.light, 72, 72, -5),
  /** Numeric/L — Geist Light 44/48, -4% */
  numericL: textStyle(fontFamily.light, 44, 48, -4),
  /** Numeric/M — Geist Medium 20/24, -2% */
  numericM: textStyle(fontFamily.medium, 20, 24, -2),
  /** Body/L — Geist Regular 17/24, -1% */
  bodyL: textStyle(fontFamily.regular, 17, 24, -1),
  /** Body/M — Geist Regular 15/21, -0.5% */
  bodyM: textStyle(fontFamily.regular, 15, 21, -0.5),
  /** Body/S — Geist Regular 13/18 */
  bodyS: textStyle(fontFamily.regular, 13, 18, 0),
  /** Label/L — Geist Medium 16/20, -1% */
  labelL: textStyle(fontFamily.medium, 16, 20, -1),
  /** Label/M — Geist Medium 15/20, -0.5% */
  labelM: textStyle(fontFamily.medium, 15, 20, -0.5),
  /** Label/S — Geist Medium 13/16 */
  labelS: textStyle(fontFamily.medium, 13, 16, 0),
  /** Caption — Geist Mono Medium 11/14, +4%, uppercase */
  caption: textStyle(fontFamily.monoMedium, 11, 14, 4),
  /** Mono — Geist Mono 13/16 (time left, prices in lists) */
  mono: textStyle(fontFamily.mono, 13, 16, -1),
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

// ---------------------------------------------------------------------------
// Shadows (v2: hairline depth, no clay)
// `boxShadow` is the exact multi-layer Figma effect as a CSS string. RN 0.76+
// (New Architecture, which Expo SDK 57 always uses) and react-native-web both
// render it, including spread and inset layers. `native` is a single-layer
// approximation using legacy shadow props + Android elevation, for the rare case
// where boxShadow is unwanted. Never apply both to the same view.

const rgba = (hex: string, alpha: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

export interface ShadowToken {
  /** CSS box-shadow string (works on iOS, Android and web). */
  boxShadow: string;
  /** Legacy single-layer approximation (shadow* props + elevation). */
  native: ViewStyle;
}

export const shadows = {
  /** Raised — cards on the canvas: a hairline lift, nothing more. */
  raised: {
    boxShadow: [
      `0px 0px 0px 1px ${rgba(palette.plum900, 0.04)}`,
      `0px 1px 2px 0px ${rgba(palette.plum900, 0.04)}`,
      `0px 12px 32px -16px ${rgba(palette.plum900, 0.12)}`,
    ].join(', '),
    native: {
      shadowColor: palette.plum900,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 2,
    },
  },
  /** Soft — chips, inputs, small floating surfaces. */
  soft: {
    boxShadow: [
      `0px 0px 0px 1px ${rgba(palette.plum900, 0.05)}`,
      `0px 2px 6px -2px ${rgba(palette.plum900, 0.08)}`,
    ].join(', '),
    native: {
      shadowColor: palette.plum900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 1,
    },
  },
  /** Button — primary pressables sit flat; a whisper of depth. */
  button: {
    boxShadow: `0px 1px 2px 0px ${rgba(palette.plum900, 0.14)}`,
    native: {
      shadowColor: palette.plum900,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.14,
      shadowRadius: 1,
      elevation: 1,
    },
  },
  /** Ice — the frost tile. */
  iceGlow: {
    boxShadow: `0px 0px 0px 1px ${rgba(palette.ice800, 0.06)}`,
    native: {
      shadowColor: palette.ice800,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.06,
      shadowRadius: 1,
      elevation: 0,
    },
  },
} satisfies Record<string, ShadowToken>;

export type ShadowName = keyof typeof shadows;

/** Style fragment for a shadow token: `style={[styles.card, shadow('raised')]}`. */
export function shadow(name: ShadowName): ViewStyle {
  return { boxShadow: shadows[name].boxShadow };
}

/** Hex color with alpha, e.g. withAlpha(palette.plum900, 0.5) -> 'rgba(43, 33, 64, 0.5)'. */
export const withAlpha = rgba;

export const theme = {
  colors,
  palette,
  semantic,
  space,
  radius,
  fontFamily,
  typography,
  shadows,
} as const;

export type Theme = typeof theme;
