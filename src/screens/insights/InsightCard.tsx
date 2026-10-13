import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components';
import { colors, radius, shadow } from '@/theme/tokens';

export interface InsightCardProps {
  /** Title/S heading, e.g. "When impulses strike". */
  title?: string;
  /** Body/S secondary line under the title. */
  subtitle?: string;
  /**
   * 'plain' (default): the content sits on the paper under the heading.
   * 'card': the content sits in a quiet white card (hairline depth) under the heading.
   */
  surface?: 'plain' | 'card';
  children?: ReactNode;
  /** Style of the content wrapper (the card when surface is 'card'). */
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** An Insights section (v2): a Geist heading with an optional quiet subtitle, then its content. */
export function InsightCard({ title, subtitle, surface = 'plain', children, contentStyle, style, testID }: InsightCardProps) {
  return (
    <View style={[styles.section, style]} testID={testID}>
      {title ? (
        <View style={styles.head}>
          <AppText variant="titleS" accessibilityRole="header">
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="bodyS" color={colors.text.secondary}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      ) : null}
      <View style={[surface === 'card' ? styles.card : null, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 16 },
  head: { gap: 3 },
  card: {
    borderRadius: radius.md,
    backgroundColor: colors.bg.surface,
    ...shadow('raised'),
  },
});
