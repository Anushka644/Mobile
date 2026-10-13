// Thawed decision (spec §4.5, restyled per docs/DESIGN_SYSTEM_V2.md "Thawed decision").
//
// Plain paper. A close button top right; the clear tile (240); the mono caption "THAWED · WAITED
// 3 DAYS"; the serif question "Still want the chunky sneakers?"; one line of context (what you felt
// when you froze it); and the three calm choices stacked 24pt above the bottom edge:
//   Ink "Let it go · save $140"       → decide let-go → /let-go/[id] (replace)
//   White "Yes, I'll buy it"           → decide bought → confetti + "Enjoy it." → open the url → home
//   Ghost "Refreeze for 3 more days"   → refreeze → /item/[id] (replace)
// Once a choice is made the screen keeps rendering a snapshot of the item, so the decision landing
// in the store doesn't bounce it to the redirect while it animates away.

import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AppText, Button, IconButton, ItemCube, Screen, useReducedMotion } from '@/components';
import { now as clockNow, useNow } from '@/lib/clock';
import { haptics } from '@/lib/haptics';
import { openableUrl } from '@/lib/url';
import { selectItem } from '@/store/selectors';
import { useChillStore } from '@/store/useChillStore';
import { colors } from '@/theme/tokens';
import type { Item } from '@/types';

import { BuyCelebration } from './BuyCelebration';
import { ContextCard } from './ContextCard';
import { letGoLabel, refreezeLabel, thawedCaption, thawedQuestion, urlHost } from './thawedCopy';
import { clearThawReminder, rescheduleThawReminder } from './thawReminder';

/** How long the "Enjoy it" moment plays before heading home (reduced motion: shorter). */
export const BUY_CELEBRATION_MS = 1900;
const BUY_CELEBRATION_REDUCED_MS = 1200;

/** Clear tile on regular phones; shorter screens get a smaller one so the choices fit. */
const TILE = 240;
const TILE_COMPACT = 176;
const COMPACT_HEIGHT = 760;
/** Same corner ratio as the freezer grid tiles. */
const TILE_RADIUS_RATIO = 0.16;

type Choice = 'let-go' | 'bought' | 'refreeze';

export interface ThawedDecisionScreenProps {
  id: string;
}

export function ThawedDecisionScreen({ id }: ThawedDecisionScreenProps) {
  const live = useChillStore((s) => selectItem(s, id));
  // A snapshot taken when the user chooses: the screen keeps showing it while it leaves.
  const [snapshot, setSnapshot] = useState<{ item: Item; choice: Choice } | null>(null);

  if (snapshot) return <ThawedDecision item={snapshot.item} choice={snapshot.choice} onChoose={setSnapshot} />;
  if (!live || live.decision) return <Redirect href="/" />;
  // Opened for an item that is still cooling (e.g. a stale link): show the cooling screen instead.
  if (clockNow() < live.thawAt) return <Redirect href={`/item/${live.id}`} />;
  return <ThawedDecision item={live} choice={null} onChoose={setSnapshot} />;
}

function ThawedDecision({
  item,
  choice,
  onChoose,
}: {
  item: Item;
  choice: Choice | null;
  onChoose: (snapshot: { item: Item; choice: Choice }) => void;
}) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const { height } = useWindowDimensions();
  const now = useNow();
  const decide = useChillStore((s) => s.decide);
  const refreeze = useChillStore((s) => s.refreeze);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const url = openableUrl(item.url);
  const busy = choice !== null;
  const compact = height > 0 && height < COMPACT_HEIGHT;
  const tile = compact ? TILE_COMPACT : TILE;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const letGo = () => {
    if (busy) return;
    onChoose({ item, choice: 'let-go' });
    decide(item.id, 'let-go');
    clearThawReminder(item);
    router.replace(`/let-go/${item.id}`);
  };

  const buy = () => {
    if (busy) return;
    onChoose({ item, choice: 'bought' });
    decide(item.id, 'bought');
    clearThawReminder(item);
    haptics.success();
    const open = () => {
      if (url) Linking.openURL(url).catch(() => undefined);
    };
    // Web: open the shop now, inside the click (a later window.open is popup-blocked). Native: let
    // the celebration play first, then hand over to the browser.
    if (Platform.OS === 'web') open();
    timer.current = setTimeout(
      () => {
        if (Platform.OS !== 'web') open();
        router.dismissTo('/');
      },
      reduced ? BUY_CELEBRATION_REDUCED_MS : BUY_CELEBRATION_MS
    );
  };

  const refreezeIt = () => {
    if (busy) return;
    onChoose({ item, choice: 'refreeze' });
    const next = refreeze(item.id);
    if (next) void rescheduleThawReminder(next);
    router.replace(`/item/${item.id}`);
  };

  const enter = (delay: number) =>
    reduced ? FadeIn.duration(220) : FadeInDown.delay(delay).springify().damping(20).stiffness(170);

  return (
    <View style={styles.fill} testID="thawed-decision">
      <Screen scroll glow="thawed" contentStyle={styles.content}>
        <View style={styles.nav}>
          <IconButton icon="close" accessibilityLabel="Close" onPress={close} disabled={busy} />
        </View>

        <Animated.View entering={reduced ? FadeIn.duration(220) : FadeIn.duration(360)} style={styles.hero}>
          <ItemCube item={item} progress={1} thawed size={tile} radius={Math.round(tile * TILE_RADIUS_RATIO)} />
        </Animated.View>

        <Animated.View entering={enter(60)} style={[styles.headline, compact ? styles.headlineCompact : null]}>
          <AppText variant="caption" color={colors.text.secondary} align="center">
            {thawedCaption(item, now)}
          </AppText>
          <AppText variant="displayL" align="center" accessibilityRole="header" style={styles.question}>
            {thawedQuestion(item.name)}
          </AppText>
          <ContextCard item={item} now={now} />
        </Animated.View>

        <Animated.View entering={enter(140)} style={styles.actions}>
          <Button
            label={letGoLabel(item)}
            onPress={letGo}
            disabled={busy && choice !== 'let-go'}
            testID="thawed-let-go"
          />
          <Button
            label="Yes, I’ll buy it"
            variant="secondary"
            haptic={false}
            onPress={buy}
            disabled={busy && choice !== 'bought'}
            testID="thawed-buy"
          />
          <Button
            label={refreezeLabel(item.cooldown)}
            variant="ghost"
            fullWidth
            onPress={refreezeIt}
            disabled={busy && choice !== 'refreeze'}
            testID="thawed-refreeze"
          />
          <AppText variant="bodyS" color={colors.text.tertiary} align="center" style={styles.footnote}>
            No wrong answer. Buying is allowed.
          </AppText>
        </Animated.View>
      </Screen>
      <BuyCelebration
        visible={choice === 'bought'}
        item={item}
        detail={url ? `Opening ${urlHost(url)}…` : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { alignItems: 'stretch' },
  nav: { height: 44, flexDirection: 'row', justifyContent: 'flex-end' },
  hero: { alignItems: 'center', marginTop: 8 },
  headline: { marginTop: 32, alignItems: 'center', gap: 12 },
  headlineCompact: { marginTop: 20, gap: 8 },
  question: { paddingHorizontal: 8 },
  // Bottom-anchored: the spacer above grows, so the choices sit 24pt above the screen bottom (Screen's
  // default bottom padding) and the whole column scrolls on short screens.
  actions: { marginTop: 'auto', paddingTop: 32, gap: 10 },
  footnote: { marginTop: 2 },
});
