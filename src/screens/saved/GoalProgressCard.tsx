import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText, Icon, PressableScale, ProgressBar } from '@/components';
import { colors } from '@/theme/tokens';

export interface GoalProgressCardProps {
  /** Left of the top row: the goal name. */
  title: ReactNode;
  /** Label/L (default) or Title/S. */
  titleVariant?: 'labelL' | 'titleS';
  /** Right of the top row, e.g. "78%". */
  trailing?: string;
  /** Goal progress 0..1; null hides the bar. */
  progress: number | null;
  /** Animate the bar (and its first fill). Default true. */
  animated?: boolean;
  /** Body/S secondary line under the bar, e.g. "$934 of $1,200". */
  caption?: string;
  /** Makes the row pressable (spring.press) and shows a chevron. */
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * The savings goal on Saved (v2): no card — a quiet row between two hairlines with the goal name
 * and its percent, a thin ink bar, and "$934 of $1,200" with a chevron when it opens the goal sheet.
 */
export function GoalProgressCard({
  title,
  titleVariant = 'labelL',
  trailing,
  progress,
  animated = true,
  caption,
  onPress,
  accessibilityLabel,
  style,
  testID,
}: GoalProgressCardProps) {
  const body = (
    <>
      <View style={styles.top}>
        <AppText variant={titleVariant} numberOfLines={1} style={styles.shrink}>
          {title}
        </AppText>
        {trailing ? (
          <AppText variant="labelM" tabular>
            {trailing}
          </AppText>
        ) : null}
      </View>
      {progress != null ? (
        <ProgressBar tone="mint" height={4} progress={progress} animated={animated} style={styles.bar} />
      ) : null}
      {caption || onPress ? (
        <View style={styles.bottom}>
          <AppText variant="bodyS" color={colors.text.secondary} numberOfLines={1} style={styles.shrink}>
            {caption ?? ''}
          </AppText>
          {onPress ? <Icon name="chevron-right" size={16} color={colors.text.tertiary} /> : null}
        </View>
      ) : null}
    </>
  );
  if (!onPress) {
    return (
      <View style={[styles.row, style]} accessible accessibilityLabel={accessibilityLabel} testID={testID}>
        {body}
      </View>
    );
  }
  return (
    <PressableScale
      onPress={onPress}
      haptic="tap"
      style={[styles.row, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Edit your savings goal"
      testID={testID}
    >
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingVertical: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.strong,
  },
  top: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  shrink: { flexShrink: 1 },
  bar: { marginVertical: 4 },
});
