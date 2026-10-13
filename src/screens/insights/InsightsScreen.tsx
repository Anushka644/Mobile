// Insights (tab) — spec §4.8, design/exports/06-insights@2x.png.
//
// Plain cream canvas (no glows). Header, then — once there are at least two decisions — the plum
// keep-rate card with its donut, "When impulses strike" (weekday bars + peak hour), "What you were
// feeling" (mood bars), "By category" tiles and the longest let-go streak. With fewer decisions it
// shows the half-melted cube empty state. Charts replay their entrance each time the tab gains focus.

import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Screen, useTabBarScrollPadding } from '@/components';
import { useChillStore } from '@/store/useChillStore';
import { colors } from '@/theme/tokens';

import { CategoryGrid } from './CategoryGrid';
import { InsightsEmpty } from './InsightsEmpty';
import { buildInsights } from './insightsModel';
import { KeepRateCard } from './KeepRateCard';
import { MoodBreakdown } from './MoodBreakdown';
import { StreakCard } from './StreakCard';
import { useFocusReplay } from './useReplay';
import { WeekdayChart } from './WeekdayChart';

export function InsightsScreen() {
  const bottomPadding = useTabBarScrollPadding();
  const items = useChillStore((s) => s.items);
  const currency = useChillStore((s) => s.settings.currency);
  const model = useMemo(() => buildInsights(items, currency), [items, currency]);
  const play = useFocusReplay();

  return (
    <Screen scroll bottomPadding={bottomPadding} contentStyle={styles.content} testID="insights">
      <View style={styles.header}>
        <AppText variant="displayL" accessibilityRole="header">
          Insights
        </AppText>
        <AppText variant="bodyM" color={colors.text.secondary}>
          What your wants are telling you
        </AppText>
      </View>

      {model.enough ? (
        <View style={styles.cards}>
          <KeepRateCard hero={model.hero} play={play} />
          <WeekdayChart bars={model.weekdays} caption={model.peakCaption} peakHour={model.peakHour} play={play} />
          <MoodBreakdown rows={model.moods} play={play} />
          {model.categories.length > 0 ? <CategoryGrid tiles={model.categories} /> : null}
          <StreakCard streak={model.streak} play={play} />
        </View>
      ) : (
        <InsightsEmpty decided={model.decided} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  header: { paddingTop: 8, gap: 4 },
  cards: { gap: 16 },
});
