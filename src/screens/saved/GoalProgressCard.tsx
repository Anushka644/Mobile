import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText, Icon, PressableScale, ProgressBar } from '@/components';
import { colors, radius, shadow } from '@/theme/tokens';

export interface GoalProgressCardProps {
  /** Left of the top row: the goal name (Saved) or "$1,074 saved so far" (Let-go). */
  title: ReactNode;
  /** Title/S for a goal name, Label/L for an amount line. Default 'titleS'. */
  titleVariant?: 'titleS' | 'labelL';
  /** Right of the top row, e.g. "78%". */
  trailing?: string;
  /** Goal progress 0..1; null hides the bar. */
  progress: number | null;
  /** Animate the bar (and its first fill). Default true. */
  animated?: boolean;
  /** Body/S secondary line under the bar. */
  caption?: string;
  /** Makes the card pressable (spring.press). */
  onPress?: () => void;
  accessibilityLabel?: string;
  /**
   * 'card' (default): a white card with a hairline (the Let-go screen).
   * 'row': no surface, a plain row between two hairlines on the paper (the Saved tab).
   */
  variant?: 'card' | 'row';
  /** Card depth: 'raised' (hairline + long faint drop) or 'soft' (hairline only). Default 'raised'. */
  elevation?: 'raised' | 'soft';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Goal progress (v2): the goal name with its percent, a thin ink bar and a "$934 of $1,200"
 * caption. On Saved it is a quiet row between hairlines (with a chevron when it opens the goal
 * sheet); on Let-go it is a white card.
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
  variant = 'card',
  elevation = 'raised',
  style,
  testID,
}: GoalProgressCardProps) {
  const row = variant === 'row';
  const body = (
    <>
      <View style={styles.top}>
        <AppText variant={titleVariant} numberOfLines={1} style={styles.title}>
          {title}
        </AppText>
        {trailing ? (
          <AppText variant="labelM" tabular>
            {trailing}
          </AppText>
        ) : null}
      </View>
      {progress != null ? (
        <ProgressBar tone="mint" height={row ? 4 : 6} progress={progress} animated={animated} style={styles.bar} />
      ) : null}
      {caption || (row && onPress) ? (
        <View style={styles.bottom}>
          {caption ? (
            <AppText variant="bodyS" color={colors.text.secondary} numberOfLines={1} style={styles.title}>
              {caption}
            </AppText>
          ) : (
            <View />
          )}
          {row && onPress ? <Icon name="chevron-right" size={16} color={colors.text.tertiary} /> : null}
        </View>
      ) : null}
    </>
  );
  const surface = [
    row ? styles.row : styles.card,
    row ? null : shadow(elevation === 'raised' ? 'raised' : 'soft'),
    style,
  ];
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
  row: {
    gap: 8,
    paddingVertical: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.strong,
  },
  top: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { flexShrink: 1 },
  bar: { marginVertical: 4 },
});
