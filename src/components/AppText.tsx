import type { ReactNode } from 'react';
import { StyleSheet, Text, type ColorValue, type TextProps, type TextStyle } from 'react-native';

import { colors, typography, type TypographyVariant } from '@/theme/tokens';

export interface AppTextProps extends TextProps {
  /** Typography token (spec §2). Default 'bodyM'. */
  variant?: TypographyVariant;
  /** Text color. Default text.primary. */
  color?: ColorValue;
  align?: TextStyle['textAlign'];
  /**
   * Upper-case the text. Defaults to true for 'caption' (spec: Caption is UPPERCASE) and false
   * otherwise; pass false for sentence-case captions such as tab labels.
   */
  uppercase?: boolean;
  /** Tabular (fixed-width) digits, for countdowns and amounts that tick. */
  tabular?: boolean;
  children?: ReactNode;
}

/**
 * Text in one of the design-system typography variants. Font scaling is capped at 1.3× so
 * display sizes don't break layouts.
 */
export function AppText({
  variant = 'bodyM',
  color = colors.text.primary,
  align,
  uppercase,
  tabular,
  style,
  maxFontSizeMultiplier = 1.3,
  ...rest
}: AppTextProps) {
  const upper = uppercase ?? variant === 'caption';
  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        typography[variant],
        { color },
        align ? { textAlign: align } : null,
        upper ? styles.upper : null,
        tabular ? styles.tabular : null,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  upper: { textTransform: 'uppercase' },
  tabular: { fontVariant: ['tabular-nums'] },
});
