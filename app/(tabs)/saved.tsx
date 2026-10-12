// Saved (tab) — PLACEHOLDER (spec §4.7, design/exports/05-saved@2x.png).
import { StyleSheet, View } from 'react-native';

import { AppText, Jar, jarLevel, ProgressBar, useTabBarScrollPadding } from '@/components';
import { formatMoney } from '@/lib/money';
import { RoutePlaceholder } from '@/dev/RoutePlaceholder';
import { selectGoalProgress, selectLetGo, selectSavedCents } from '@/store/selectors';
import { useChillStore } from '@/store/useChillStore';

export default function SavedScreen() {
  const items = useChillStore((s) => s.items);
  const settings = useChillStore((s) => s.settings);
  const saved = selectSavedCents({ items });
  const goal = selectGoalProgress({ items, settings });
  const letGo = selectLetGo({ items });
  const padding = useTabBarScrollPadding();

  return (
    <RoutePlaceholder title="Saved" spec="§4.7 Saved jar" glow="saved" bottomPadding={padding}>
      <View style={styles.hero}>
        <AppText variant="numericXL">{formatMoney(saved, settings.currency)}</AppText>
        <Jar level={jarLevel(goal ? goal.pct / 100 : null, letGo.length)} />
      </View>
      {goal ? <ProgressBar tone="mint" progress={goal.pct / 100} /> : null}
    </RoutePlaceholder>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 16 },
});
