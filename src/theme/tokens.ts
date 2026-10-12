// Chill design tokens — mirrored from the Figma design system.
// Keep values in sync with Figma; do not hand-tune in components.
import type { TextStyle, ViewStyle } from 'react-native';

// ---------------------------------------------------------------------------
// Colors

export const palette = {
  cream50: '#FFFBF7',
  cream100: '#FFF4EC',
  cream200: '#FBE8D9',
  cream300: '#F3D9C4',

  plum900: '#2B2140',
  plum700: '#4A3D63',
  plum500: '#7A6E8F',
  plum300: '#B5ACC4',
  plum100: '#ECE7F2',

  coral500: '#FF8A65',
  coral300: '#FFB59C',
  coral100: '#FFE5DB',

  lavender500: '#9B8CFF',
  lavender300: '#C7BEFF',
  lavender100: '#ECE9FF',

  mint700: '#2E9C7E',
  mint500: '#6FD6B8',
  mint300: '#A9E8D5',
  mint100: '#DDF6EE',

  /** Coin edge shade (Coin: bottom rim, used at 0.45 alpha). */
  butter700: '#C9861A',
  /** Coin embossed snowflake. */
  butter600: '#D99A2B',
  butter500: '#FFD36E',
  butter300: '#FFE4A3',
  butter100: '#FFF4D6',

  ice50: '#F3FAFF',
  ice100: '#EAF6FF',
  ice200: '#CDEBFF',
  ice300: '#A8DCFF',
  ice400: '#8FD3FF',
  ice600: '#4FA9E6',
  ice800: '#2A6FA3',

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
    ice: palette.ice800,
    success: palette.mint700,
  },
  border: {
    subtle: palette.plum100,
    strong: palette.plum300,
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
    success: palette.mint500,
    warning: palette.butter500,
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
  displaySemiBold: 'BricolageGrotesque_600SemiBold',
  displayBold: 'BricolageGrotesque_700Bold',
  displayExtraBold: 'BricolageGrotesque_800ExtraBold',
  bodyMedium: 'Nunito_500Medium',
  bodySemiBold: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyExtraBold: 'Nunito_800ExtraBold',
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
  /** Display/XL — Bricolage Grotesque ExtraBold 48/50, -3% */
  displayXL: textStyle(fontFamily.displayExtraBold, 48, 50, -3),
  /** Display/L — Bricolage Grotesque ExtraBold 36/40, -2.5% */
  displayL: textStyle(fontFamily.displayExtraBold, 36, 40, -2.5),
  /** Title/L — Bricolage Grotesque Bold 26/30, -1.5% */
  titleL: textStyle(fontFamily.displayBold, 26, 30, -1.5),
  /** Title/M — Bricolage Grotesque Bold 20/24, -1% */
  titleM: textStyle(fontFamily.displayBold, 20, 24, -1),
  /** Title/S — Bricolage Grotesque SemiBold 17/22, -0.5% */
  titleS: textStyle(fontFamily.displaySemiBold, 17, 22, -0.5),
  /** Numeric/XL — Bricolage Grotesque ExtraBold 64/64, -4% */
  numericXL: textStyle(fontFamily.displayExtraBold, 64, 64, -4),
  /** Numeric/L — Bricolage Grotesque ExtraBold 40/44, -3% */
  numericL: textStyle(fontFamily.displayExtraBold, 40, 44, -3),
  /** Numeric/M — Bricolage Grotesque Bold 22/26, -1% */
  numericM: textStyle(fontFamily.displayBold, 22, 26, -1),
  /** Body/L — Nunito SemiBold 17/24 */
  bodyL: textStyle(fontFamily.bodySemiBold, 17, 24),
  /** Body/M — Nunito Medium 15/22 */
  bodyM: textStyle(fontFamily.bodyMedium, 15, 22),
  /** Body/S — Nunito SemiBold 13/18 */
  bodyS: textStyle(fontFamily.bodySemiBold, 13, 18),
  /** Label/L — Nunito ExtraBold 17/22 */
  labelL: textStyle(fontFamily.bodyExtraBold, 17, 22),
  /** Label/M — Nunito Bold 15/20 */
  labelM: textStyle(fontFamily.bodyBold, 15, 20),
  /** Label/S — Nunito Bold 13/16 */
  labelS: textStyle(fontFamily.bodyBold, 13, 16),
  /** Caption — Nunito ExtraBold 11/14, +6% */
  caption: textStyle(fontFamily.bodyExtraBold, 11, 14, 6),
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

// ---------------------------------------------------------------------------
// Shadows ("clay")
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
  /** Clay/Raised — cards and tiles that sit on the canvas. */
  raised: {
    boxShadow: [
      `0px 14px 28px -6px ${rgba(palette.plum900, 0.1)}`,
      `0px 3px 6px 0px ${rgba(palette.plum900, 0.06)}`,
      `inset 0px 2px 2px 0px ${rgba(palette.white, 0.9)}`,
      `inset 0px -6px 12px 0px ${rgba(palette.plum900, 0.06)}`,
    ].join(', '),
    native: {
      shadowColor: palette.plum900,
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.1,
      shadowRadius: 14,
      elevation: 6,
    },
  },
  /** Clay/Soft — subtle lift for chips, inputs, small surfaces. */
  soft: {
    boxShadow: `0px 8px 20px -4px ${rgba(palette.plum900, 0.07)}`,
    native: {
      shadowColor: palette.plum900,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.07,
      shadowRadius: 10,
      elevation: 3,
    },
  },
  /** Clay/Button — primary pressables. */
  button: {
    boxShadow: [
      `0px 10px 18px -4px ${rgba(palette.plum900, 0.22)}`,
      `0px 2px 3px 0px ${rgba(palette.plum900, 0.12)}`,
    ].join(', '),
    native: {
      shadowColor: palette.plum900,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.22,
      shadowRadius: 9,
      elevation: 8,
    },
  },
  /** Ice/Glow — the frozen ice cube. */
  iceGlow: {
    boxShadow: `0px 16px 32px -6px ${rgba(palette.ice400, 0.45)}`,
    native: {
      shadowColor: palette.ice400,
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.45,
      shadowRadius: 16,
      elevation: 8,
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
