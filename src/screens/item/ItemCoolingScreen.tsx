// Item — cooling (spec §4.4, restyled per docs/DESIGN_SYSTEM_V2.md "Item cooling").
//
// Frost wash at the top (glow preset `item`). Nav: glass back · "FROZEN 2 DAYS AGO" · glass
// open-link (hidden without a url). Hero: the frost tile (260), its frost line sinking as the want
// melts. Countdown: mono "THAWS IN", the time left in Geist Light, a thin ice melt line as wide as
// the tile and its two-ended readout. Then the name and price, the reflection, the details as
// hairline key / value rows, and a quiet ghost "Thaw it early" (with a confirm dialog) at the end of
// the page. When the item thaws while this screen is open, the tile clears in place and the
// screen replaces itself with /thawed/[id].

import { Redirect, useIsFocused, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { Button, ConfirmDialog, ItemCube, ReflectionCard, Screen } from '@/components';
import { useNow } from '@/lib/clock';
import { haptics } from '@/lib/haptics';
import { isReady, meltProgress, timeLeftMs } from '@/lib/melt';
import { cancelNotification } from '@/lib/notifications';
import { openableUrl } from '@/lib/url';
import { selectItem } from '@/store/selectors';
import { useChillStore } from '@/store/useChillStore';
import type { Item } from '@/types';

import { CountdownHero } from './CountdownHero';
import { ItemDetails, ItemTitle } from './ItemDetails';
import { ItemNavBar } from './ItemNavBar';
import { frozenLabel } from './itemCopy';
import { useReflectionPrompt } from './useReflectionPrompt';

/** Hero tile (square); shorter screens get a smaller one so the countdown stays above the fold. */
const TILE = 260;
const TILE_COMPACT = 216;
const COMPACT_HEIGHT = 760;
/** Same corner ratio as the freezer grid tiles (ItemCard: 16% of the width). */
const TILE_RADIUS_RATIO = 0.16;
/** Let the tile's thaw (the frost clears: ~900ms) play before the thawed screen takes over. */
const THAW_BEAT_MS = 750;

export interface ItemCoolingScreenProps {
  id: string;
}

export function ItemCoolingScreen({ id }: ItemCoolingScreenProps) {
  const item = useChillStore((s) => selectItem(s, id));
  if (!item || item.decision) return <Redirect href="/" />;
  return <ItemCooling item={item} />;
}

function ItemCooling({ item }: { item: Item }) {
  const router = useRouter();
  const focused = useIsFocused();
  const reduced = useReducedMotion();
  const { height } = useWindowDimensions();
  const thawEarly = useChillStore((s) => s.thawEarly);
  const setNotificationId = useChillStore((s) => s.setNotificationId);
  const now = useNow(1000);

  const [confirming, setConfirming] = useState(false);
  const [thawing, setThawing] = useState(false);
  const leaving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const reflection = useReflectionPrompt(item, now);
  const ready = isReady(item, now);
  const thawed = thawing || ready;
  const progress = thawed ? 1 : meltProgress(item, now);
  const url = openableUrl(item.url);
  const tile = height > 0 && height < COMPACT_HEIGHT ? TILE_COMPACT : TILE;

  /** Replace this screen with the thawed decision, after an optional beat for the thaw animation. */
  const goThawed = (delay: number) => {
    if (leaving.current) return;
    leaving.current = true;
    const go = () => router.replace(`/thawed/${item.id}`);
    if (delay > 0) timer.current = setTimeout(go, delay);
    else go();
  };

  // Thawed while open (or opened already thawed): hand over to the decision screen.
  const openedReady = useRef(ready);
  useEffect(() => {
    if (ready && focused) goThawed(openedReady.current || reduced ? 0 : THAW_BEAT_MS);
  });

  const thawNow = () => {
    haptics.warning();
    setConfirming(false);
    setThawing(true);
    const updated = thawEarly(item.id);
    if (updated?.notificationId) {
      void cancelNotification(updated.notificationId);
      setNotificationId(item.id, undefined);
    }
    goThawed(reduced ? 250 : THAW_BEAT_MS);
  };

  const enter = (delay: number) =>
    reduced ? FadeIn.duration(220) : FadeInDown.delay(delay).springify().damping(20).stiffness(170);

  return (
    <Screen glow="item" scroll testID="item-cooling">
      <ItemNavBar
        title={frozenLabel(item, now)}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        onOpen={url ? () => void Linking.openURL(url).catch(() => {}) : undefined}
      />

      <View style={styles.hero}>
        <ItemCube
          item={item}
          progress={progress}
          thawed={thawed}
          size={tile}
          radius={Math.round(tile * TILE_RADIUS_RATIO)}
        />
      </View>

      <CountdownHero
        timeLeft={thawed ? 0 : timeLeftMs(item, now)}
        progress={progress}
        thawAt={item.thawAt}
        now={now}
        thawed={thawed}
        width={tile}
        style={styles.countdown}
      />

      <Animated.View entering={enter(40)} style={styles.title}>
        <ItemTitle item={item} />
      </Animated.View>

      <Animated.View entering={enter(90)} style={styles.reflection}>
        <ReflectionCard prompt={reflection.prompt} onNext={reflection.next} testID="item-reflection" />
      </Animated.View>

      <Animated.View entering={enter(140)} style={styles.details}>
        <ItemDetails item={item} />
      </Animated.View>

      {/* Quiet, and at the end of the page: waiting is the whole trick. */}
      <Button
        label="Thaw it early"
        variant="ghost"
        disabled={thawed}
        onPress={() => setConfirming(true)}
        style={styles.thawEarly}
        testID="item-thaw-early"
      />

      <ConfirmDialog
        visible={confirming}
        icon="hourglass"
        title="Thaw it now?"
        // Break after the dash: the message wraps as two balanced lines instead of orphaning "call."
        message={'Waiting is the whole trick —\nbut it’s your call.'}
        primary={{ label: 'Keep it frozen', onPress: () => setConfirming(false) }}
        secondary={{ label: 'Thaw now', onPress: thawNow }}
        onDismiss={() => setConfirming(false)}
        testID="item-thaw-confirm"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginTop: 20 },
  countdown: { marginTop: 32 },
  title: { marginTop: 44 },
  reflection: { marginTop: 24 },
  details: { marginTop: 32 },
  thawEarly: { marginTop: 20 },
});
