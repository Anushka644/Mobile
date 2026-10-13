// Item — cooling (spec §4.4, design/exports/02-item-cooling@2x.png).
//
// Backdrop: glow preset `item` (lavender100 top glow over the ice gradient) + drifting snow dots.
// Nav: Glass back · "Frozen 2 days ago" · Glass open-link (hidden without a url). Hero: the melting
// Cube (230, idle breathing). Countdown + melt bar + caption. Details card, ReflectionCard, and a
// Ghost "Thaw it early" (with a confirm dialog) resting 24pt above the bottom edge.
// When the item thaws while this screen is open, the cube thaws in place and the screen replaces
// itself with /thawed/[id].

import { Redirect, useIsFocused, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { Button, ConfirmDialog, ItemCube, ReflectionCard, Screen, SnowField } from '@/components';
import { useNow } from '@/lib/clock';
import { haptics } from '@/lib/haptics';
import { isReady, meltProgress, timeLeftMs } from '@/lib/melt';
import { cancelNotification } from '@/lib/notifications';
import { selectItem } from '@/store/selectors';
import { useChillStore } from '@/store/useChillStore';
import type { Item } from '@/types';

import { CountdownHero } from './CountdownHero';
import { ItemDetailsCard } from './ItemDetailsCard';
import { ItemNavBar } from './ItemNavBar';
import { frozenLabel, openableUrl } from './itemCopy';
import { useReflectionPrompt } from './useReflectionPrompt';

/** Hero cube box (the Figma body is ~164 wide at 58% melted). */
const CUBE_SIZE = 230;
/** Let the cube's thaw (ice fades, sparkles pop: ~650ms) play before the thawed screen takes over. */
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

  return (
    <Screen
      glow="item"
      scroll
      testID="item-cooling"
      // Ghost "Thaw it early" rests 24pt above the bottom edge; longer content scrolls under a cream fade.
      footerFade
      footer={
        <Button
          label="Thaw it early"
          icon="hourglass"
          variant="ghost"
          disabled={thawed}
          onPress={() => setConfirming(true)}
          testID="item-thaw-early"
        />
      }
    >
      <SnowField height={420} count={10} seed={5} style={styles.snow} />

      <ItemNavBar
        title={frozenLabel(item, now)}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        onOpen={url ? () => void Linking.openURL(url).catch(() => {}) : undefined}
      />

      <View style={styles.hero}>
        <ItemCube item={item} progress={progress} thawed={thawed} size={CUBE_SIZE} />
      </View>

      <CountdownHero
        timeLeft={thawed ? 0 : timeLeftMs(item, now)}
        progress={progress}
        thawAt={item.thawAt}
        now={now}
        thawed={thawed}
        style={styles.countdown}
      />

      <Animated.View entering={FadeInDown.delay(60).springify().damping(18).stiffness(180)} style={styles.details}>
        <ItemDetailsCard item={item} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).springify().damping(18).stiffness(180)} style={styles.reflection}>
        <ReflectionCard prompt={reflection.prompt} onNext={reflection.next} testID="item-reflection" />
      </Animated.View>


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
  // The cube box starts just under the nav (its top quarter is empty at mid-melt).
  hero: { alignItems: 'center', marginTop: -4 },
  countdown: { marginTop: -10 },
  details: { marginTop: 18 },
  reflection: { marginTop: 15 },
  snow: { top: 40 },
});
