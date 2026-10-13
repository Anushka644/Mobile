// Clay surface styles shared by the Thawed, Let-go and Saved screens (Figma Clay/* effects).
// The kit's shadow('soft') carries only the drop shadow; Figma's Clay/Soft also has two inner
// shadows (a white top highlight and a faint bottom shade), which give rows and pills their
// "pillowy" edge. shadow('raised') already includes them.

import type { ViewStyle } from 'react-native';

import { colors, shadows, withAlpha } from '@/theme/tokens';

/** Figma Clay/Soft: soft drop + white top highlight + faint bottom shade. */
export const claySoft: ViewStyle = {
  boxShadow: [
    shadows.soft.boxShadow,
    `inset 0px 1.5px 1px 0px ${withAlpha(colors.white, 0.9)}`,
    `inset 0px -4px 10px 0px ${withAlpha(colors.plum900, 0.04)}`,
  ].join(', '),
};

/** Figma Clay/Raised (same as the kit token): cards. */
export const clayRaised: ViewStyle = { boxShadow: shadows.raised.boxShadow };

/** The inner shading Figma puts on small product tiles (History Row → Product Thumb). */
export const thumbInset: ViewStyle = {
  boxShadow: [
    `inset 0px -4px 6px 0px ${withAlpha(colors.plum900, 0.12)}`,
    `inset 0px 3px 4px 0px ${withAlpha(colors.white, 0.55)}`,
  ].join(', '),
};
