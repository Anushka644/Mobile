// You (tab) — PLACEHOLDER (spec §4.9, design/exports/07-you@2x.png). Demo controls work already.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, ConfirmDialog, useTabBarScrollPadding } from '@/components';
import { RoutePlaceholder } from '@/dev/RoutePlaceholder';
import { DAY_MS } from '@/lib/melt';
import { cancelAllNotifications } from '@/lib/notifications';
import { useChillStore } from '@/store/useChillStore';

export default function YouScreen() {
  const router = useRouter();
  const seedDemo = useChillStore((s) => s.seedDemo);
  const fastForward = useChillStore((s) => s.fastForward);
  const resetAll = useChillStore((s) => s.resetAll);
  const [confirmReset, setConfirmReset] = useState(false);
  const padding = useTabBarScrollPadding();

  return (
    <RoutePlaceholder title="You" spec="§4.9 You / settings" bottomPadding={padding}>
      <View style={styles.actions}>
        <Button label="Load sample freezer" icon="sparkles" variant="secondary" onPress={() => seedDemo()} />
        <Button label="Fast-forward 1 day" icon="refresh" variant="secondary" onPress={() => fastForward(DAY_MS)} />
        <Button label="Reset everything" icon="close" variant="ghost" onPress={() => setConfirmReset(true)} />
        <Button label="Component kit" icon="settings" variant="ghost" onPress={() => router.push('/dev/kit')} />
      </View>
      <ConfirmDialog
        visible={confirmReset}
        icon="refresh"
        title="Reset everything?"
        message="This clears your freezer, your jar and your settings."
        primary={{ label: 'Keep my stuff', onPress: () => setConfirmReset(false) }}
        secondary={{
          label: 'Reset',
          onPress: () => {
            setConfirmReset(false);
            void cancelAllNotifications();
            resetAll();
          },
        }}
        onDismiss={() => setConfirmReset(false)}
      />
    </RoutePlaceholder>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 12 },
});
