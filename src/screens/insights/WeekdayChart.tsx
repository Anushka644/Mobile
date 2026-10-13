import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';

import { AppText, springPop, useReducedMotion } from '@/components';
import { colors, radius } from '@/theme/tokens';

import { InsightCard } from './InsightCard';
import { BAR_MAX_HEIGHT, type WeekdayBar } from './insightsModel';

export interface WeekdayChartProps {
  bars: WeekdayBar[];
  caption: string;
  /** "11 PM" over the peak bar. */
  peakHour: string | null;
  play: number;
}

const BAR_WIDTH = 28;
/** Corner radius of a bar (short bars become pills). */
const BAR_RADIUS = 12;
const TOOLTIP_HEIGHT = 24;
const TOOLTIP_GAP = 6;
/** Bars grow with a soft spring (a little overshoot, then settle). */
const GROW = { damping: 13, stiffness: 150, mass: 0.9 } as const;

/**
 * "When impulses strike" (06-insights): seven weekday bars (ice300; the peak is lavender500 with an
 * hour tooltip), letters underneath. The peak's column is as wide as its tooltip and the columns are
 * spread edge to edge, as in the Figma auto-layout. Bars spring up from the baseline on focus.
 */
export function WeekdayChart({ bars, caption, peakHour, play }: WeekdayChartProps) {
  const summary = bars.map((b) => `${b.name} ${b.count}`).join(', ');
  return (
    <InsightCard title="When impulses strike" subtitle={caption} testID="insights-weekdays">
      <View style={styles.chart} accessible accessibilityRole="image" accessibilityLabel={`Wants frozen by weekday: ${summary}`}>
        {bars.map((bar, i) => (
          <Column key={i} bar={bar} index={i} tooltip={bar.peak ? peakHour : null} play={play} />
        ))}
      </View>
    </InsightCard>
  );
}

function Column({ bar, index, tooltip, play }: { bar: WeekdayBar; index: number; tooltip: string | null; play: number }) {
  const reduced = useReducedMotion();
  const grow = useSharedValue(reduced ? 1 : 0);
  const pop = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      grow.set(1);
      pop.set(1);
      return;
    }
    if (play === 0) return;
    grow.set(0);
    pop.set(0);
    grow.set(withDelay(140 + index * 55, withSpring(1, GROW)));
    pop.set(withDelay(620, withSpring(1, springPop)));
  }, [play, index, reduced, grow, pop]);

  const barStyle = useAnimatedStyle(() => ({ height: Math.max(0, bar.height * grow.get()) }));
  const tipStyle = useAnimatedStyle(() => {
    const v = pop.get();
    return { opacity: Math.min(1, v * 1.5), transform: [{ translateY: (1 - v) * 10 }, { scale: 0.7 + 0.3 * v }] };
  });

  const color = bar.peak ? colors.lavender500 : colors.ice300;
  return (
    <View style={styles.column}>
      <View style={styles.plot}>
        {tooltip ? (
          <Animated.View style={[styles.tooltip, tipStyle]}>
            <AppText variant="labelM" color={colors.text.inverse} numberOfLines={1}>
              {tooltip}
            </AppText>
          </Animated.View>
        ) : null}
        <Animated.View
          style={[styles.bar, { backgroundColor: color, borderRadius: Math.min(BAR_RADIUS, bar.height / 2) }, barStyle]}
        />
      </View>
      <AppText variant="labelM" color={bar.peak ? colors.text.primary : colors.text.tertiary} style={styles.letter}>
        {bar.letter}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    marginTop: 19,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  column: { alignItems: 'center', minWidth: BAR_WIDTH },
  plot: {
    height: TOOLTIP_HEIGHT + TOOLTIP_GAP + BAR_MAX_HEIGHT,
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: TOOLTIP_GAP,
  },
  bar: { width: BAR_WIDTH },
  tooltip: {
    height: TOOLTIP_HEIGHT,
    paddingHorizontal: 9,
    borderRadius: radius.full,
    backgroundColor: colors.lavender500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: { marginTop: 4 },
});
