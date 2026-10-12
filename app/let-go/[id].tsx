// Let-go celebration — PLACEHOLDER (spec §4.6, design/exports/04-let-go@2x.png).
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Jar, jarLevel } from '@/components';
import { RoutePlaceholder } from '@/dev/RoutePlaceholder';
import { formatMoney } from '@/lib/money';
import { selectGoalProgress, selectItem, selectLetGo, selectSavedCents } from '@/store/selectors';
import { useChillStore } from '@/store/useChillStore';
import { colors } from '@/theme/tokens';

export default function LetGoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const items = useChillStore((s) => s.items);
  const settings = useChillStore((s) => s.settings);
  const item = selectItem({ items }, String(id));
  const saved = selectSavedCents({ items });
  const goal = selectGoalProgress({ items, settings });
  const letGo = selectLetGo({ items });

  return (
    <RoutePlaceholder
      title="Let go. Nice."
      spec="§4.6 Let-go celebration"
      glow="letGo"
      footer={
        <View style={styles.actions}>
          <Button label="Back to my freezer" onPress={() => router.dismissTo('/')} />
          <Button label="See my jar" variant="ghost" fullWidth onPress={() => router.dismissTo('/saved')} />
        </View>
      }
    >
      <View style={styles.hero}>
        {item ? (
          <AppText variant="numericXL" color={colors.mint700}>
            +{formatMoney(item.priceCents, item.currency)}
          </AppText>
        ) : null}
        <AppText variant="bodyL" color={colors.text.secondary}>
          {formatMoney(saved, settings.currency)} saved so far
        </AppText>
        <Jar level={jarLevel(goal ? goal.pct / 100 : null, letGo.length)} dropInOnMount />
      </View>
    </RoutePlaceholder>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 12 },
  actions: { gap: 8 },
});
