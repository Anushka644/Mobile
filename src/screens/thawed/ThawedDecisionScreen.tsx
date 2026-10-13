// Thawed decision (spec §4.5, design/exports/03-thawed-decision@2x.png).
//
// Glow preset `thawed` (butter100 top glow + mint100 primary glow behind the cube). Close button
// top right; "IT'S THAWED" eyebrow over "Still want the chunky sneakers?"; the thawed cube (250)
// with bobbing sparkles; the frosted context card (mood · time of day · price); and the three
// calm choices anchored 24pt above the bottom edge:
//   Mint "Let it go · save $140"  → decide let-go → /let-go/[id] (replace)
//   Secondary "Yes, I'll buy it"  → decide bought → confetti + "Enjoy it…" → open the url → home
//   Ghost "Refreeze for 3 more days" → refreeze → /item/[id] (replace)
// Once a choice is made the screen keeps rendering a snapshot of the item, so the decision landing
// in the store doesn't bounce it to the redirect while it animates away.

import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AppText, Button, Icon, IconButton, ItemCube, Screen, useReducedMotion } from '@/components';
import { now as clockNow, useNow } from '@/lib/clock';
import { haptics } from '@/lib/haptics';
import { selectItem } from '@/store/selectors';
import { useChillStore } from '@/store/useChillStore';
import { colors } from '@/theme/tokens';
import type { Item } from '@/types';

import { BuyCelebration } from './BuyCelebration';
import { ContextCard } from './ContextCard';
import { letGoLabel, openableUrl, refreezeLabel, thawedQuestion, urlHost } from './thawedCopy';
import { clearThawReminder, rescheduleThawReminder } from './thawReminder';

/** How long the "Enjoy it" moment plays before heading home (reduced motion: shorter). */
export const BUY_CELEBRATION_MS = 1900;
const BUY_CELEBRATION_REDUCED_MS = 1200;

/** Cube box on regular phones (Figma: 250); shorter screens get a smaller one so the CTAs fit. */
const CUBE_SIZE = 250;
const CUBE_SIZE_COMPACT = 196;
const COMPACT_HEIGHT = 760;

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
  const cubeSize = height > 0 && height < COMPACT_HEIGHT ? CUBE_SIZE_COMPACT : CUBE_SIZE;

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

  const enter = (delay: number) => (reduced ? FadeIn.duration(220) : FadeInDown.delay(delay).springify().damping(16));

  return (
    <View style={styles.fill} testID="thawed-decision">
      <Screen scroll glow="thawed" contentStyle={styles.content}>
        <View style={styles.nav}>
          {/* Figma renders this circle opaque white (the kit's Surface style), not 55% glass. */}
          <IconButton icon="close" variant="surface" accessibilityLabel="Close" onPress={close} disabled={busy} />
        </View>

        <Animated.View entering={enter(0)} style={styles.headline}>
          <View style={styles.eyebrow}>
            <Icon name="sparkle" size={16} color={colors.mint700} strokeWidth={2.6} />
            <AppText variant="caption" color={colors.text.success}>
              It’s thawed
            </AppText>
          </View>
          <AppText variant="displayL" align="center" accessibilityRole="header">
            {thawedQuestion(item.name)}
          </AppText>
        </Animated.View>

        <View style={[styles.hero, { marginTop: cubeSize === CUBE_SIZE ? 19 : 8 }]}>
          <ItemCube item={item} progress={1} thawed size={cubeSize} />
        </View>

        <Animated.View entering={enter(80)} style={styles.context}>
          <ContextCard item={item} now={now} />
        </Animated.View>

        <Animated.View entering={enter(160)} style={styles.actions}>
          <Button
            label={letGoLabel(item)}
            icon="coins"
            variant="mint"
            onPress={letGo}
            disabled={busy && choice !== 'let-go'}
            testID="thawed-let-go"
          />
          <Button
            label="Yes, I’ll buy it"
            icon="bag"
            variant="secondary"
            haptic={false}
            onPress={buy}
            disabled={busy && choice !== 'bought'}
            testID="thawed-buy"
          />
          <Button
            label={refreezeLabel(item.cooldown)}
            icon="refresh"
            variant="ghost"
            fullWidth
            onPress={refreezeIt}
            disabled={busy && choice !== 'refreeze'}
            testID="thawed-refreeze"
          />
          <AppText variant="bodyS" color={colors.text.tertiary} align="center">
            No wrong answer. Buying is allowed.
          </AppText>
        </Animated.View>
      </Screen>
      <BuyCelebration visible={choice === 'bought'} detail={url ? `Opening ${urlHost(url)}…` : undefined} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { alignItems: 'stretch' },
  // Figma: nav at y 58 (status bar 54 + 4), headline at 112.
  nav: { marginTop: 4, height: 48, flexDirection: 'row', justifyContent: 'flex-end' },
  headline: { marginTop: 6, alignItems: 'center', gap: 8 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 16 },
  hero: { alignItems: 'center' },
  // The context card tucks 8pt into the cube's box (its bottom edge is empty below the puddle).
  context: { marginTop: -8 },
  // Bottom-anchored: the spacer above grows, so the CTAs sit 24pt above the screen bottom (Screen's
  // default bottom padding) and the whole column scrolls on short screens.
  actions: { marginTop: 'auto', paddingTop: 32, gap: 12 },
});
