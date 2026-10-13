import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { AppText, useReducedMotion } from '@/components';
import { colors } from '@/theme/tokens';

import { InsightCard } from './InsightCard';
import type { MoodRow } from './insightsModel';
import { MOOD_SWATCH } from './palette';

export interface MoodBreakdownProps {
  rows: MoodRow[];
  play: number;
}

const BAR_HEIGHT = 3;

/**
 * "What you were feeling" (v2): one row per mood on the paper — the name and its let-go share, the
 * count on the right, and a thin ink bar underneath. No badges, no hues: length does the talking.
 */
export function MoodBreakdown({ rows, play }: MoodBreakdownProps) {
  return (
    <InsightCard title="What you were feeling" testID="insights-moods">
      {rows.length === 0 ? (
        <AppText variant="bodyS" color={colors.text.secondary}>
          Tag a mood when you freeze something to see what drives your wants.
        </AppText>
      ) : (
        <View style={styles.rows}>
          {rows.map((row, i) => (
            <MoodBar key={row.mood} row={row} index={i} play={play} />
          ))}
        </View>
      )}
    </InsightCard>
  );
}

function MoodBar({ row, index, play }: { row: MoodRow; index: number; play: number }) {
  const reduced = useReducedMotion();
  const fill = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) {
      fill.set(1);
      return;
    }
    if (play === 0) return;
    fill.set(0);
    fill.set(withDelay(260 + index * 90, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) })));
  }, [play, index, reduced, fill]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${row.fill * 100 * fill.get()}%` }));
  const swatch = MOOD_SWATCH[row.mood];
  const letGo = row.letGoPct != null ? `${row.letGoPct}% let go` : null;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${row.name}: ${row.countLabel}${letGo ? `, ${letGo}` : ''}`}
      testID={`mood-${row.mood}`}
    >
      <View style={styles.line}>
        <View style={styles.name}>
          <AppText variant="labelM" numberOfLines={1}>
            {row.name}
          </AppText>
          {letGo ? (
            <AppText variant="bodyS" color={colors.text.tertiary} numberOfLines={1} tabular>
              {letGo}
            </AppText>
          ) : null}
        </View>
        <AppText variant="bodyS" color={colors.text.secondary} tabular>
          {row.countLabel}
        </AppText>
      </View>
      <View style={[styles.track, { backgroundColor: swatch.tint }]}>
        <Animated.View style={[styles.fill, { backgroundColor: swatch.bar }, fillStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rows: { gap: 18 },
  row: { gap: 9 },
  line: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  name: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexShrink: 1 },
  track: { height: BAR_HEIGHT, borderRadius: BAR_HEIGHT / 2, overflow: 'hidden' },
  fill: { height: BAR_HEIGHT, borderRadius: BAR_HEIGHT / 2 },
});
