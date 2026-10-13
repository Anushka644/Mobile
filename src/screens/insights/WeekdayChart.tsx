import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { AppText, springCalm, useReducedMotion } from '@/components';
import { colors } from '@/theme/tokens';

import { InsightCard } from './InsightCard';
import { BAR_MAX_HEIGHT, BAR_MIN_HEIGHT, type WeekdayBar } from './insightsModel';
import { CHART } from './palette';

export interface WeekdayChartProps {
  bars: WeekdayBar[];
  caption: string;
  /** "11 PM" over the peak bar. */
  peakHour: string | null;
  play: number;
}

/** Thin rounded bars: an empty day is a dot as wide as a bar. */
const BAR_WIDTH = BAR_MIN_HEIGHT;
const LABEL_HEIGHT = 14;
const LABEL_GAP = 8;
/** Bars grow with a calm spring (no big overshoot). */
const GROW = { damping: 18, stiffness: 140, mass: 0.9 } as const;

/**
 * "When impulses strike" (v2): seven thin paper bars standing on a hairline baseline, the peak day
 * in ink with its hour in mono above it, mono day letters underneath. Bars rise on focus.
 */
export function WeekdayChart({ bars, caption, peakHour, play }: WeekdayChartProps) {
  const summary = bars.map((b) => `${b.name} ${b.count}`).join(', ');
  return (
    <InsightCard title="When impulses strike" subtitle={caption} testID="insights-weekdays">
      <View accessible accessibilityRole="image" accessibilityLabel={`Wants frozen by weekday: ${summary}`}>
        <View style={styles.plot}>
          {bars.map((bar, i) => (
            <Column key={i} bar={bar} index={i} label={bar.peak ? peakHour : null} play={play} />
          ))}
        </View>
        <View style={styles.baseline} />
        <View style={styles.letters}>
          {bars.map((bar, i) => (
            <View key={i} style={styles.cell}>
              <AppText variant="caption" color={bar.peak ? colors.text.primary : colors.text.tertiary}>
                {bar.letter}
              </AppText>
            </View>
          ))}
        </View>
      </View>
    </InsightCard>
  );
}

function Column({ bar, index, label, play }: { bar: WeekdayBar; index: number; label: string | null; play: number }) {
  const reduced = useReducedMotion();
  const grow = useSharedValue(reduced ? 1 : 0);
  const reveal = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      grow.set(1);
      reveal.set(1);
      return;
    }
    if (play === 0) return;
    grow.set(0);
    reveal.set(0);
    grow.set(withDelay(140 + index * 55, withSpring(1, GROW)));
    reveal.set(withDelay(640, withSpring(1, springCalm)));
  }, [play, index, reduced, grow, reveal]);

  // The bar grows from a dot, so it never collapses below its own width.
  const barStyle = useAnimatedStyle(() => ({
    height: Math.max(BAR_WIDTH, BAR_WIDTH + (bar.height - BAR_WIDTH) * grow.get()),
    opacity: Math.min(1, grow.get() * 4),
  }));
  const labelStyle = useAnimatedStyle(() => {
    const v = reveal.get();
    return { opacity: Math.min(1, v), transform: [{ translateY: (1 - v) * 6 }] };
  });

  return (
    <View style={styles.cell}>
      {label ? (
        <Animated.View style={[styles.label, labelStyle]}>
          <AppText variant="caption" color={CHART.peak} numberOfLines={1}>
            {label}
          </AppText>
        </Animated.View>
      ) : null}
      <Animated.View style={[styles.bar, { backgroundColor: bar.peak ? CHART.peak : CHART.bar }, barStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  plot: {
    height: LABEL_HEIGHT + LABEL_GAP + BAR_MAX_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  label: { height: LABEL_HEIGHT, marginBottom: LABEL_GAP, justifyContent: 'center' },
  bar: { width: BAR_WIDTH, borderRadius: BAR_WIDTH / 2 },
  baseline: { height: StyleSheet.hairlineWidth, backgroundColor: CHART.rule, marginTop: 8 },
  letters: { flexDirection: 'row', marginTop: 10 },
});
