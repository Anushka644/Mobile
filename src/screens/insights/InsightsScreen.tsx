// Insights (tab) — spec §4.8, v2 "frost minimal" (docs/DESIGN_SYSTEM_V2.md).
//
// Plain paper. Serif "Insights", then — once there are at least two decisions — the keep-rate hero
// (a huge Geist Light "75%" over a thin ice split bar, between hairlines), "When impulses strike" (thin
// weekday bars, the peak in ink), "What you were feeling" (thin ink mood bars), "By category" (a
// white grouped list) and the longest let-go streak (a white card with droplets). With fewer
// decisions it shows the half-frosted tile empty state. Charts replay their entrance each time the
// tab gains focus.

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
        <AppText variant="displayL" accessibilityRole="header" style={styles.title}>
          Insights
        </AppText>
        <AppText variant="bodyM" color={colors.text.secondary}>
          What your wants are telling you
        </AppText>
      </View>

      {model.enough ? (
        <>
          <KeepRateCard hero={model.hero} play={play} />
          <WeekdayChart bars={model.weekdays} caption={model.peakCaption} peakHour={model.peakHour} play={play} />
          <MoodBreakdown rows={model.moods} play={play} />
          {model.categories.length > 0 ? <CategoryGrid tiles={model.categories} /> : null}
          <StreakCard streak={model.streak} play={play} />
        </>
      ) : (
        <InsightsEmpty decided={model.decided} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 36 },
  // The serif title sits where Home's does (Home has a 14pt date caption + 10 above its title).
  header: { paddingTop: 8, marginBottom: -8 },
  title: { marginTop: 24, marginBottom: 4 },
});
