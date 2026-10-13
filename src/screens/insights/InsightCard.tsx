import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components';
import { colors, radius, shadow } from '@/theme/tokens';

export interface InsightCardProps {
  /** Title/M heading inside the card, e.g. "When impulses strike". */
  title?: string;
  /** Body/M plum500 line under the title. */
  subtitle?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** White r28 Clay/Raised card with an optional title + subtitle (the Insights sections). */
export function InsightCard({ title, subtitle, children, style, testID }: InsightCardProps) {
  return (
    <View style={[styles.card, style]} testID={testID}>
      {title ? (
        <View style={styles.head}>
          <AppText variant="titleM" accessibilityRole="header">
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="bodyM" color={colors.text.secondary}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    ...shadow('raised'),
  },
  head: { gap: 2 },
});
