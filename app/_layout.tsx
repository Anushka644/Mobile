import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { now } from '@/lib/clock';
import { isReady } from '@/lib/melt';
import { subscribeToThawTaps } from '@/lib/notifications';
import { installWebTestHooks } from '@/lib/testHooks';
import { useChillStore, useHasHydrated } from '@/store/useChillStore';
import { fonts } from '@/theme/fonts';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden (e.g. fast refresh) — nothing to do.
});

// Web: ?reset=1 / ?seed=demo / ?ff=<hours> run once, right when the store finishes hydrating.
installWebTestHooks();

/** Thaw notification taps → the thawed decision (or the cooling item if it was thawed early elsewhere). */
function useThawNotificationRouting(enabled: boolean) {
  const router = useRouter();
  useEffect(() => {
    if (!enabled) return;
    return subscribeToThawTaps((itemId) => {
      const item = useChillStore.getState().items.find((i) => i.id === itemId);
      if (!item || item.decision) return;
      router.push(isReady(item, now()) ? `/thawed/${itemId}` : `/item/${itemId}`);
    });
  }, [enabled, router]);
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fonts);
  const hydrated = useHasHydrated();
  const onboarded = useChillStore((s) => s.settings.onboarded);
  const ready = (fontsLoaded || fontError != null) && hydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  useThawNotificationRouting(ready && onboarded);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg.canvas },
          }}
        >
          {/* Onboarded: the app. Until then these routes redirect to /onboarding. */}
          <Stack.Protected guard={onboarded}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="freeze"
              options={{
                // iOS: a page sheet over the dimmed app (the screen draws its own grabber).
                // Android: slides up full screen. Web: a stacked card.
                presentation: 'modal',
                animation: Platform.OS === 'android' ? 'slide_from_bottom' : 'default',
              }}
            />
            <Stack.Screen name="item/[id]" />
            <Stack.Screen name="thawed/[id]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
            <Stack.Screen
              name="let-go/[id]"
              options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }}
            />
          </Stack.Protected>
          <Stack.Protected guard={!onboarded}>
            <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
          </Stack.Protected>
          {/* Visual QA: always reachable. */}
          <Stack.Screen name="dev/kit" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.canvas },
});
