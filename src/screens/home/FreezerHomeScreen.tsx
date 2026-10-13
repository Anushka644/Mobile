// Freezer — home (spec §4.2, design/exports/01-freezer-home@2x.png + 13-freezer-empty@2x.png).
//
// Plain cream canvas (no glows). Header with the date caption, "Your freezer" and the counts; the
// plum SavedBanner; "Ready to decide" ReadyBanners (max 3, then "+N more"); the "Cooling" 2-column
// ItemCard grid, soonest first; or the empty state. Content scrolls under the floating tab bar
// (bottom padding 178 so the last row can clear the tab bar's 170pt cream fade; the centred empty
// state keeps the spec's 130).
//
// Live: re-renders every 30s, every second while something thaws within the hour. When an item
// thaws while Home is focused, its card flips to Ready in place (mint flash + sparkles, both built
// into ItemCard / Cube), lingers ARRIVAL_HOLD_MS, then moves to the Ready section with layout
// animations (spec §5 "Thaw arrival").

import { useIsFocused, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  LayoutAnimationConfig,
  LinearTransition,
} from 'react-native-reanimated';

import {
  AppText,
  Button,
  Headline,
  IconButton,
  ItemCard,
  ReadyBanner,
  SavedBanner,
  Screen,
  SectionHeader,
  useTabBarScrollPadding,
} from '@/components';
import { formatDayCaption } from '@/lib/format';
import { selectCooling, selectLetGo, selectReady, selectSavedCents } from '@/store/selectors';
import { useChillStore } from '@/store/useChillStore';
import { colors } from '@/theme/tokens';
import type { Item } from '@/types';

import { EmptyFreezer } from './EmptyFreezer';
import { NextThawCard } from './NextThawCard';
import { freezerSubtitle, GRID_GAP, gridCardWidth, MAX_READY, useFreezerNow } from './homeLayout';
import { useThawArrivals } from './useThawArrivals';

// Layout motion: a calm spring for things that slide to make room, a livelier one for arrivals.
const MOVE = LinearTransition.springify().damping(20).stiffness(190);
// Thaw-arrival choreography, in three beats so nothing crosses over anything else:
//   1. the Ready card dissolves out of the grid (CARD_EXIT, quick, before the reflow builds speed),
//   2. the Cooling header and grid glide down / reflow (MOVE),
//   3. the Ready header and the new banner land in the space that opened up (SECTION_ENTER, BANNER_ENTER).
// (A delayed layout transition would stage 1 and 2 more cleanly, but on web Reanimated jumps the
// element to its new spot for the length of the delay.)
const CARD_EXIT = FadeOut.duration(120);
const CARD_ENTER = FadeInDown.springify().damping(14).stiffness(170);
const ARRIVE_DELAY = 240;
const SECTION_ENTER = FadeIn.delay(ARRIVE_DELAY).duration(260);
const BANNER_ENTER = FadeInDown.delay(ARRIVE_DELAY + 60).springify().damping(13).stiffness(170);
const SECTION_EXIT = FadeOut.duration(160);
const SAVED_ENTER = FadeIn.duration(220);
// Containers whose height changes (the sections) animate their layout on iOS/Android only: on web
// Reanimated animates layout with a FLIP scale transform, which would squash their contents. On
// web the fixed-size leaves (headers, banners, cards) carry MOVE and glide on their own.
const SECTION_MOVE = Platform.OS === 'web' ? undefined : MOVE;

const byThawAt = (a: Item, b: Item) => a.thawAt - b.thawAt;

export function FreezerHomeScreen() {
  const router = useRouter();
  const focused = useIsFocused();
  const { width } = useWindowDimensions();
  const scrollPadding = useTabBarScrollPadding();
  const centeredPadding = useTabBarScrollPadding(true);

  const items = useChillStore((s) => s.items);
  const currency = useChillStore((s) => s.settings.currency);
  const now = useFreezerNow(items);
  const arriving = useThawArrivals(items, now, focused);
  const [showAllReady, setShowAllReady] = useState(false);

  const cooling = selectCooling({ items }, now);
  const ready = selectReady({ items }, now);
  const saved = selectSavedCents({ items });
  const letGoCount = selectLetGo({ items }).length;

  // Freshly thawed cards stay in the grid (as Ready cards) until their arrival beat is over.
  const grid = arriving.size > 0 ? [...cooling, ...ready.filter((i) => arriving.has(i.id))].sort(byThawAt) : cooling;
  const readyList = arriving.size > 0 ? ready.filter((i) => !arriving.has(i.id)) : ready;
  const readyVisible = showAllReady ? readyList : readyList.slice(0, MAX_READY);
  const hiddenReady = readyList.length - readyVisible.length;
  const empty = grid.length === 0 && readyList.length === 0;
  const cardWidth = gridCardWidth(width);
  const nextThaw = [...cooling].sort(byThawAt)[0];
  const bottomPadding = empty ? centeredPadding : scrollPadding;

  return (
    <Screen scroll bottomPadding={bottomPadding} contentStyle={styles.content} testID="freezer-home">
      <LayoutAnimationConfig skipEntering>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <AppText variant="caption" color={colors.text.secondary}>
              {formatDayCaption(now)}
            </AppText>
            <Headline accessibilityRole="header" style={styles.title}>
              {'Your *freezer*'}
            </Headline>
            <AppText variant="bodyM" color={colors.text.secondary}>
              {freezerSubtitle(cooling.length, ready.length, items.length > 0)}
            </AppText>
          </View>
          <IconButton
            icon="bell"
            accessibilityLabel="Notification settings"
            onPress={() => router.navigate('/you')}
            size={40}
            style={styles.bell}
          />
        </View>

        {nextThaw ? (
          <Animated.View key={`next-${nextThaw.id}`} layout={MOVE} entering={SAVED_ENTER} exiting={SECTION_EXIT}>
            <NextThawCard item={nextThaw} />
          </Animated.View>
        ) : null}

        {saved > 0 ? (
          <Animated.View layout={MOVE} entering={SAVED_ENTER}>
            <SavedBanner savedCents={saved} letGoCount={letGoCount} currency={currency} />
          </Animated.View>
        ) : null}

        {readyList.length > 0 ? (
          <Animated.View
            key="ready"
            layout={SECTION_MOVE}
            entering={SECTION_ENTER}
            exiting={SECTION_EXIT}
            style={styles.section}
            testID="freezer-ready"
          >
            <Animated.View layout={MOVE}>
              <SectionHeader title="Ready to decide" variant="titleS" dotColor={colors.ice600} />
            </Animated.View>
            {readyVisible.map((item) => (
              <Animated.View key={item.id} layout={MOVE} entering={BANNER_ENTER} exiting={SECTION_EXIT}>
                <ReadyBanner item={item} now={now} testID={`ready-${item.id}`} />
              </Animated.View>
            ))}
            {hiddenReady > 0 || showAllReady ? (
              <Animated.View layout={MOVE} style={styles.more}>
                <Button
                  label={showAllReady ? 'Show less' : `+${hiddenReady} more`}
                  variant="ghost"
                  size="xs"
                  onPress={() => setShowAllReady(!showAllReady)}
                  style={styles.moreButton}
                />
              </Animated.View>
            ) : null}
          </Animated.View>
        ) : null}

        {grid.length > 0 ? (
          <Animated.View
            key="cooling"
            layout={SECTION_MOVE}
            entering={SECTION_ENTER}
            exiting={SECTION_EXIT}
            style={styles.section}
            testID="freezer-cooling"
          >
            <Animated.View layout={MOVE}>
              <SectionHeader title="Cooling" variant="titleS" trailing="Soonest first" />
            </Animated.View>
            <View style={styles.grid}>
              {grid.map((item) => (
                <Animated.View key={item.id} layout={MOVE} entering={CARD_ENTER} exiting={CARD_EXIT}>
                  <ItemCard item={item} now={now} width={cardWidth} testID={`card-${item.id}`} />
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        ) : null}

        {empty ? <EmptyFreezer onFreeze={() => router.push('/freeze')} showTip={items.length === 0} /> : null}
      </LayoutAnimationConfig>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 28 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingTop: 8 },
  headerText: { flex: 1 },
  title: { marginTop: 10, marginBottom: 4 },
  bell: { marginTop: 0 },
  section: { gap: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  more: { alignItems: 'center', marginTop: -4 },
  moreButton: { alignSelf: 'center' },
});
