// Saved (tab) — spec §4.7, v2 "frost minimal" (docs/DESIGN_SYSTEM_V2.md).
//
// Plain paper. Serif "Saved" / "by letting things melt"; the total in Geist Light over the savings
// glass (fill = goal progress, or the let-go count without a goal); the
// goal as a quiet row with a thin ink bar between hairlines (tap → goal sheet), or an "Add a goal"
// row; "Melted away" (let-go history, newest first) as plain hairline rows; and a collapsible,
// neutral "You bought" with the same rows. Scrolls under the floating tab bar.

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LayoutAnimationConfig } from 'react-native-reanimated';

import { AppText, jarLevel, Screen, SectionHeader, useReducedMotion, useTabBarScrollPadding } from '@/components';
import { selectBought, selectGoalProgress, selectLetGo, selectSavedCents } from '@/store/selectors';
import { useChillStore } from '@/store/useChillStore';
import { colors } from '@/theme/tokens';
import { GoalSheet } from '@/screens/goal/GoalSheet';

import { AddGoalCard } from './AddGoalCard';
import { BoughtSection } from './BoughtSection';
import { GoalProgressCard } from './GoalProgressCard';
import { HistoryRow } from './HistoryRow';
import { SavedHero } from './SavedHero';
import { goalAmountCaption, goalPercentLabel } from './savedCopy';

export function SavedScreen() {
  const reduced = useReducedMotion();
  const bottomPadding = useTabBarScrollPadding();
  const items = useChillStore((s) => s.items);
  const settings = useChillStore((s) => s.settings);
  const [editingGoal, setEditingGoal] = useState(false);

  const saved = selectSavedCents({ items });
  const letGo = selectLetGo({ items });
  const bought = selectBought({ items });
  const goal = selectGoalProgress({ items, settings });
  const currency = settings.currency;
  const level = jarLevel(goal ? goal.pct / 100 : null, letGo.length);

  const rise = (i: number) => (reduced ? undefined : FadeInDown.delay(80 + i * 50).springify().damping(18));

  return (
    <Screen scroll bottomPadding={bottomPadding} contentStyle={styles.content} testID="saved-screen">
      <LayoutAnimationConfig skipExiting>
        <View style={styles.header}>
          <AppText variant="displayL" accessibilityRole="header" style={styles.title}>
            Saved
          </AppText>
          <AppText variant="bodyM" color={colors.text.secondary}>
            by letting things melt
          </AppText>
        </View>

        <SavedHero savedCents={saved} currency={currency} level={level} letGoCount={letGo.length} />

        <Animated.View entering={rise(0)}>
          {goal && settings.goal ? (
            <GoalProgressCard
              variant="row"
              title={settings.goal.name}
              titleVariant="labelL"
              trailing={goalPercentLabel(goal.pct)}
              progress={goal.pct / 100}
              caption={goalAmountCaption(goal.saved, goal.target, currency)}
              onPress={() => setEditingGoal(true)}
              accessibilityLabel={`${settings.goal.name}, ${goalPercentLabel(goal.pct)}, ${goalAmountCaption(
                goal.saved,
                goal.target,
                currency
              )}`}
              testID="saved-goal"
            />
          ) : (
            <AddGoalCard onPress={() => setEditingGoal(true)} />
          )}
        </Animated.View>

        <Animated.View entering={rise(1)} style={styles.section}>
          <SectionHeader title="Melted away" variant="titleS" trailing={letGo.length > 1 ? 'Newest first' : undefined} />
          {letGo.length > 0 ? (
            <View style={styles.list}>
              {letGo.map((item) => (
                <HistoryRow key={item.id} item={item} testID={`melted-${item.id}`} />
              ))}
            </View>
          ) : (
            <View style={styles.empty} testID="saved-empty">
              <AppText variant="labelM">Nothing has melted yet</AppText>
              <AppText variant="bodyS" color={colors.text.secondary}>
                When a want thaws and you let it go, its price drops into the jar.
              </AppText>
            </View>
          )}
        </Animated.View>

        {bought.length > 0 ? (
          <Animated.View entering={rise(2)}>
            <BoughtSection items={bought} currency={currency} />
          </Animated.View>
        ) : null}
      </LayoutAnimationConfig>

      <GoalSheet
        visible={editingGoal}
        onClose={() => setEditingGoal(false)}
        goal={settings.goal}
        currency={currency}
        savedCents={saved}
      />
    </Screen>
  );
}

const hairline = { borderColor: colors.border.strong } as const;

const styles = StyleSheet.create({
  content: { gap: 32 },
  // The serif title sits where Home's does (Home has a 14pt date caption + 10 above its title).
  header: { paddingTop: 8 },
  title: { marginTop: 24, marginBottom: 4 },
  section: { gap: 10 },
  list: { ...hairline, borderBottomWidth: StyleSheet.hairlineWidth },
  empty: {
    ...hairline,
    gap: 3,
    paddingVertical: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
