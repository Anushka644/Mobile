import { Tabs } from 'expo-router';

import { TabBar } from '@/components';
import { colors } from '@/theme/tokens';

/** Freezer · Saved · [+ → /freeze] · Insights · You — with the floating custom TabBar (spec §3, §4). */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Tab change: cross-fade 180ms (spec §5).
        animation: 'fade',
        transitionSpec: { animation: 'timing', config: { duration: 180 } },
        sceneStyle: { backgroundColor: colors.bg.canvas },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Freezer' }} />
      <Tabs.Screen name="saved" options={{ title: 'Saved' }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
      <Tabs.Screen name="you" options={{ title: 'You' }} />
    </Tabs>
  );
}
