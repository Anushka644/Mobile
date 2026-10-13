import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText, ProgressBar } from '@/components';
import { colors } from '@/theme/tokens';

export interface LetGoTotalProps {
  /** "$934 saved so far" */
  title: string;
  /** Right of the title, e.g. "78%" (goal only). */
  trailing?: string;
  /** Goal progress 0..1; null hides the line. */
  progress: number | null;
  /** Animate the line's changes. */
  animated?: boolean;
  /** Body/S line under it: "Weekend in Lisbon · $266 to go" / "by letting 6 wants melt away". */
  caption: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * The running total under the celebration (v2): plain text between two hairlines — the total and
 * the goal percent on one row, a thin ink goal line, and a quiet caption. No card.
 */
export function LetGoTotal({
  title,
  trailing,
  progress,
  animated = true,
  caption,
  accessibilityLabel,
  style,
  testID,
}: LetGoTotalProps) {
  return (
    <View style={[styles.wrap, style]} accessible accessibilityLabel={accessibilityLabel} testID={testID}>
      <View style={styles.row}>
        <AppText variant="labelL" numberOfLines={1} style={styles.title} tabular>
          {title}
        </AppText>
        {trailing ? (
          <AppText variant="labelM" tabular>
            {trailing}
          </AppText>
        ) : null}
      </View>
      {progress != null ? <ProgressBar tone="mint" height={4} progress={progress} animated={animated} /> : null}
      <AppText variant="bodyS" color={colors.text.secondary} numberOfLines={1}>
        {caption}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.strong,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { flexShrink: 1 },
});
