// Saved (tab) — spec §4.7, design/exports/05-saved@2x.png.
//
// Glow preset `saved` (mint100 top glow + lavender100 primary glow behind the jar). Header "Saved" /
// "by letting things melt"; the hero total over the big Jar (fill = goal progress, or the let-go
// count without a goal) with the "8 wants let go" pill; the goal card (tap → edit-goal sheet) or a
// dashed "Add a goal" card; "Melted away" (let-go history, newest first); and a collapsible,
// neutral "You bought". Scrolls under the floating tab bar (bottom padding 130, the tab bar draws
// the 170pt cream fade).

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LayoutAnimationConfig } from 'react-native-reanimated';

import { AppText, jarLevel, Screen, SectionHeader, useReducedMotion, useTabBarScrollPadding } from '@/components';
import { selectBought, selectGoalProgress, selectLetGo, selectSavedCents } from '@/store/selectors';
import { useChillStore } from '@/store/useChillStore';
import { colors, radius, withAlpha } from '@/theme/tokens';

import { AddGoalCard } from './AddGoalCard';
import { BoughtSection } from './BoughtSection';
import { EditGoalSheet } from './EditGoalSheet';
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
    <Screen scroll glow="saved" bottomPadding={bottomPadding} contentStyle={styles.content} testID="saved-screen">
      <LayoutAnimationConfig skipExiting>
        <View style={styles.header}>
          <AppText variant="displayL" accessibilityRole="header">
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
              title={settings.goal.name}
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
          <SectionHeader title="Melted away" trailing={letGo.length > 1 ? 'Newest first' : undefined} />
          {letGo.length > 0 ? (
            <View style={styles.list}>
              {letGo.map((item) => (
                <HistoryRow key={item.id} item={item} testID={`melted-${item.id}`} />
              ))}
            </View>
          ) : (
            <View style={styles.empty} testID="saved-empty">
              <AppText variant="titleS" align="center">
                Nothing has melted yet
              </AppText>
              <AppText variant="bodyS" color={colors.text.secondary} align="center">
                When a want thaws and you let it go, its price drops into the jar.
              </AppText>
            </View>
          )}
        </Animated.View>

        {bought.length > 0 ? (
          <Animated.View entering={rise(2)} style={styles.bought}>
            <BoughtSection items={bought} currency={currency} />
          </Animated.View>
        ) : null}
      </LayoutAnimationConfig>

      <EditGoalSheet
        visible={editingGoal}
        onClose={() => setEditingGoal(false)}
        goal={settings.goal}
        currency={currency}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Figma: content at y 62 (status bar 54 + 8), sections 16 apart.
  content: { gap: 16 },
  header: { marginTop: 8, gap: 4 },
  section: { gap: 16 },
  list: { gap: 10 },
  bought: { marginTop: 12 },
  empty: {
    gap: 4,
    paddingHorizontal: 24,
    paddingVertical: 22,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.plum300,
    backgroundColor: withAlpha(colors.white, 0.45),
  },
});
