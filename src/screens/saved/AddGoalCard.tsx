import { StyleSheet, View } from 'react-native';

import { AppText, Icon, IconBadge, PressableScale } from '@/components';
import { colors, radius, withAlpha } from '@/theme/tokens';

export interface AddGoalCardProps {
  onPress: () => void;
}

/** No goal yet (spec §4.7): a dashed card, "Saving for something? Add a goal". Opens the goal sheet. */
export function AddGoalCard({ onPress }: AddGoalCardProps) {
  return (
    <PressableScale
      onPress={onPress}
      haptic="tap"
      style={styles.card}
      accessibilityLabel="Saving for something? Add a goal"
      testID="saved-add-goal"
    >
      <IconBadge icon="target" tint={colors.mint100} color={colors.mint700} size={44} />
      <View style={styles.text}>
        <AppText variant="titleS">Saving for something?</AppText>
        <AppText variant="bodyS" color={colors.text.secondary}>
          Add a goal and watch the jar fill up.
        </AppText>
      </View>
      <View style={styles.plus}>
        <Icon name="plus" size={18} color={colors.mint700} strokeWidth={2.4} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.plum300,
    backgroundColor: withAlpha(colors.white, 0.5),
  },
  text: { flex: 1, gap: 2 },
  plus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mint100,
  },
});
