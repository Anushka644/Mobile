import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { AppText, Coin, springCalm, useReducedMotion } from '@/components';
import { colors, radius, shadow } from '@/theme/tokens';

import type { Streak } from './insightsModel';

export interface StreakCardProps {
  streak: Streak;
  play: number;
}

/** Droplets shown before the row ends in "+N". */
const MAX_DROPS = 5;
const DROP = 18;

/**
 * "Longest streak" (v2): a quiet white card — mono eyebrow, "3 let-gos in a row", the supporting
 * line — and a row of small ice droplets, one per let-go in the run (up to five, then "+N"), that
 * fall into place on focus. No streak yet: one faint droplet.
 */
export function StreakCard({ streak, play }: StreakCardProps) {
  const lit = Math.min(streak.longest, MAX_DROPS);
  const extra = streak.longest - lit;
  const drops = Math.max(1, lit);

  return (
    <View style={styles.card} accessible accessibilityLabel={`Longest streak: ${streak.title}. ${streak.line}`} testID="insights-streak">
      <View style={styles.text}>
        <AppText variant="caption" color={colors.text.secondary}>
          Longest streak
        </AppText>
        <AppText variant="titleM" style={styles.title}>
          {streak.title}
        </AppText>
        <AppText variant="bodyS" color={colors.text.secondary}>
          {streak.line}
        </AppText>
      </View>
      <View style={styles.drops}>
        {Array.from({ length: drops }, (_, i) => (
          <Drop key={i} index={i} lit={streak.longest > 0} play={play} />
        ))}
        {extra > 0 ? (
          <AppText variant="caption" color={colors.text.secondary} style={styles.extra}>
            {`+${extra}`}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

function Drop({ index, lit, play }: { index: number; lit: boolean; play: number }) {
  const reduced = useReducedMotion();
  const fall = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) {
      fall.set(1);
      return;
    }
    if (play === 0) return;
    fall.set(0);
    fall.set(withDelay(300 + index * 90, withSpring(1, springCalm)));
  }, [play, index, reduced, fall]);

  const style = useAnimatedStyle(() => {
    const v = fall.get();
    return { opacity: Math.min(1, v * 2) * (lit ? 1 : 0.3), transform: [{ translateY: (1 - v) * -10 }] };
  });

  return (
    <Animated.View style={style}>
      <Coin size={DROP} shadowed={false} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    borderRadius: radius.md,
    backgroundColor: colors.bg.surface,
    ...shadow('raised'),
  },
  text: { flex: 1, gap: 3 },
  title: { marginTop: 6 },
  drops: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  extra: { marginLeft: 4 },
});
