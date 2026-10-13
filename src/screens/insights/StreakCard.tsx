import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { AppText, Icon, springPop, useReducedMotion } from '@/components';
import { colors, radius, shadow } from '@/theme/tokens';

import type { Streak } from './insightsModel';

export interface StreakCardProps {
  streak: Streak;
  play: number;
}

/** Flames shown before the cluster collapses into "+N". */
const MAX_FLAMES = 5;
const FLAME = 36;
const OVERLAP = 10;

/**
 * "Longest streak": "3 let-gos in a row" with a cluster of overlapping flame badges (one per
 * let-go, up to five) that pop in one by one on focus.
 */
export function StreakCard({ streak, play }: StreakCardProps) {
  const lit = Math.min(streak.longest, MAX_FLAMES);
  const extra = streak.longest - lit;
  const flames = Math.max(1, lit);

  return (
    <View style={styles.card} accessible accessibilityLabel={`Longest streak: ${streak.title}. ${streak.line}`} testID="insights-streak">
      <View style={styles.text}>
        <AppText variant="caption" color={colors.text.secondary}>
          Longest streak
        </AppText>
        <AppText variant="titleM">{streak.title}</AppText>
        <AppText variant="bodyS" color={colors.text.secondary}>
          {streak.line}
        </AppText>
      </View>
      <View style={[styles.cluster, { width: flames * FLAME - (flames - 1) * OVERLAP }]}>
        {Array.from({ length: flames }, (_, i) => (
          <Flame
            key={i}
            index={i}
            lit={streak.longest > 0}
            label={extra > 0 && i === flames - 1 ? `+${extra + 1}` : null}
            play={play}
          />
        ))}
      </View>
    </View>
  );
}

function Flame({ index, lit, label, play }: { index: number; lit: boolean; label: string | null; play: number }) {
  const reduced = useReducedMotion();
  const pop = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) {
      pop.set(1);
      return;
    }
    if (play === 0) return;
    pop.set(0);
    pop.set(withDelay(300 + index * 90, withSpring(1, springPop)));
  }, [play, index, reduced, pop]);

  const style = useAnimatedStyle(() => {
    const v = pop.get();
    return { opacity: Math.min(1, v * 3), transform: [{ scale: 0.4 + 0.6 * v }] };
  });

  return (
    <Animated.View
      style={[
        styles.flame,
        { left: index * (FLAME - OVERLAP), zIndex: 10 - index, backgroundColor: lit ? colors.coral100 : colors.plum100 },
        style,
      ]}
    >
      {label ? (
        <AppText variant="labelS" color={colors.coral500}>
          {label}
        </AppText>
      ) : (
        <Icon name="flame" size={19} color={lit ? colors.coral500 : colors.plum300} strokeWidth={2.2} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.surface,
    ...shadow('raised'),
  },
  text: { flex: 1, gap: 4 },
  cluster: { height: FLAME },
  flame: {
    position: 'absolute',
    top: 0,
    width: FLAME,
    height: FLAME,
    borderRadius: FLAME / 2,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
