import { StyleSheet, View } from 'react-native';

import { AppText, Icon, PressableScale } from '@/components';
import { colors, shadow } from '@/theme/tokens';

export interface AddGoalCardProps {
  onPress: () => void;
}

/**
 * No goal yet (spec §4.7, v2): a quiet row between hairlines — "Saving for something?" over "Add a
 * goal and watch the jar fill up." with a round white "+" on the right. Opens the goal sheet.
 */
export function AddGoalCard({ onPress }: AddGoalCardProps) {
  return (
    <PressableScale
      onPress={onPress}
      haptic="tap"
      style={styles.row}
      accessibilityLabel="Saving for something? Add a goal"
      testID="saved-add-goal"
    >
      <View style={styles.text}>
        <AppText variant="labelL">Saving for something?</AppText>
        <AppText variant="bodyS" color={colors.text.secondary}>
          Add a goal and watch the jar fill up.
        </AppText>
      </View>
      <View style={styles.plus}>
        <Icon name="plus" size={18} color={colors.text.primary} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.strong,
  },
  text: { flex: 1, gap: 3 },
  plus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.surface,
    ...shadow('soft'),
  },
});
