import { Text, type TextStyle } from 'react-native';

import { colors, fontFamily, type TypographyVariant } from '@/theme/tokens';

import { AppText, type AppTextProps } from './AppText';

export interface HeadlineProps extends Omit<AppTextProps, 'children' | 'variant'> {
  /** The text; words wrapped in *asterisks* are set in the serif italic ("Still want *it?*"). */
  children: string;
  /** A serif display variant. Default 'displayL'. */
  variant?: Extract<TypographyVariant, 'displayXL' | 'displayL' | 'displayItalic'>;
  /** Colour of the italic accent. Default: the text colour. */
  accentColor?: TextStyle['color'];
}

/** Splits "Still want *it?*" into runs: [['Still want ', false], ['it?', true]]. Exported for tests. */
export function headlineRuns(text: string): [string, boolean][] {
  return text
    .split('*')
    .map((part, i): [string, boolean] => [part, i % 2 === 1])
    .filter(([part]) => part.length > 0);
}

/**
 * A serif headline with italic accents (v2.1): the expressive moment on a screen. Accessibility
 * reads the plain text (asterisks removed).
 */
export function Headline({
  children,
  variant = 'displayL',
  color = colors.text.primary,
  accentColor,
  accessibilityLabel,
  ...rest
}: HeadlineProps) {
  const runs = headlineRuns(children);
  const plain = runs.map(([t]) => t).join('');
  return (
    <AppText variant={variant} color={color} accessibilityLabel={accessibilityLabel ?? plain} {...rest}>
      {runs.map(([t, italic], i) =>
        italic ? (
          <Text key={i} style={{ fontFamily: fontFamily.serifItalic, color: accentColor ?? color }}>
            {t}
          </Text>
        ) : (
          t
        )
      )}
    </AppText>
  );
}
