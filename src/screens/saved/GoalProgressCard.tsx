import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText, PressableScale, ProgressBar } from '@/components';
import { colors, radius } from '@/theme/tokens';

import { claySoft, clayRaised } from './clay';

export interface GoalProgressCardProps {
  /** Left of the top row: the goal name (Saved) or "$1,074 saved so far" (Let-go). */
  title: ReactNode;
  /** Title/S for a goal name, Label/L for an amount line. Default 'titleS'. */
  titleVariant?: 'titleS' | 'labelL';
  /** Right of the top row, mint700 Label/M, e.g. "78%". */
  trailing?: string;
  /** Goal progress 0..1; null hides the bar. */
  progress: number | null;
  /** Animate the bar (and its first fill). Default true. */
  animated?: boolean;
  /** Body/S plum500 line under the bar. */
  caption?: string;
  /** Makes the card pressable (spring.press). */
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Saved uses Clay/Raised; the Let-go card over its gradient uses Clay/Soft. Default 'raised'. */
  elevation?: 'raised' | 'soft';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Goal progress card (Figma "Goal" on Saved, "Total & Goal" on Let-go): white r28, padding 20/16,
 * gap 8 — a title row with the mint percent, a 10pt mint progress bar, and a caption.
 */
export function GoalProgressCard({
  title,
  titleVariant = 'titleS',
  trailing,
  progress,
  animated = true,
  caption,
  onPress,
  accessibilityLabel,
  elevation = 'raised',
  style,
  testID,
}: GoalProgressCardProps) {
  const body = (
    <>
      <View style={styles.row}>
        <AppText variant={titleVariant} numberOfLines={1} style={styles.title}>
          {title}
        </AppText>
        {trailing ? (
          <AppText variant="labelM" color={colors.text.success} tabular>
            {trailing}
          </AppText>
        ) : null}
      </View>
      {progress != null ? <ProgressBar tone="mint" height={10} progress={progress} animated={animated} /> : null}
      {caption ? (
        <AppText variant="bodyS" color={colors.text.secondary} numberOfLines={1}>
          {caption}
        </AppText>
      ) : null}
    </>
  );
  const surface = [styles.card, elevation === 'raised' ? clayRaised : claySoft, style];
  if (!onPress) {
    return (
      <View style={surface} accessible accessibilityLabel={accessibilityLabel} testID={testID}>
        {body}
      </View>
    );
  }
  return (
    <PressableScale
      onPress={onPress}
      haptic="tap"
      style={surface}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Edit your savings goal"
      testID={testID}
    >
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.surface,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { flexShrink: 1 },
});
