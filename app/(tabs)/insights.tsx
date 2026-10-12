// Insights (tab) — PLACEHOLDER (spec §4.8, design/exports/06-insights@2x.png).
import { AppText, useTabBarScrollPadding } from '@/components';
import { RoutePlaceholder } from '@/dev/RoutePlaceholder';
import { keepRate } from '@/lib/insights';
import { useChillStore } from '@/store/useChillStore';

export default function InsightsScreen() {
  const items = useChillStore((s) => s.items);
  const rate = keepRate(items);
  const padding = useTabBarScrollPadding();
  return (
    <RoutePlaceholder title="Insights" spec="§4.8 Insights" bottomPadding={padding}>
      <AppText variant="titleM">
        You let go of {rate.letGo} of {rate.decided} wants
      </AppText>
    </RoutePlaceholder>
  );
}
