import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming, Easing } from 'react-native-reanimated';

import { AppText, IconBadge, MOOD_ICONS, useReducedMotion } from '@/components';
import { colors } from '@/theme/tokens';

import { InsightCard } from './InsightCard';
import type { MoodRow } from './insightsModel';
import { MOOD_SWATCH } from './palette';

export interface MoodBreakdownProps {
  rows: MoodRow[];
  play: number;
}

/**
 * "What you were feeling" (06-insights): one row per mood — a 36 tinted circle with the mood icon,
 * the name, its share of let-gos, the count on the right and a horizontal bar underneath.
 */
export function MoodBreakdown({ rows, play }: MoodBreakdownProps) {
  return (
    <InsightCard title="What you were feeling" testID="insights-moods">
      {rows.length === 0 ? (
        <AppText variant="bodyM" color={colors.text.secondary} style={styles.none}>
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
      <IconBadge icon={MOOD_ICONS[row.mood]} tint={swatch.tint} color={swatch.ink} size={36} iconSize={19} />
      <View style={styles.body}>
        <View style={styles.line}>
          <View style={styles.name}>
            <AppText variant="titleS" numberOfLines={1}>
              {row.name}
            </AppText>
            {letGo ? (
              <AppText variant="bodyS" color={colors.text.tertiary} numberOfLines={1}>
                {letGo}
              </AppText>
            ) : null}
          </View>
          <AppText variant="bodyM" color={colors.text.secondary}>
            {row.countLabel}
          </AppText>
        </View>
        <View style={[styles.track, { backgroundColor: swatch.tint }]}>
          <Animated.View style={[styles.fill, { backgroundColor: swatch.bar }, fillStyle]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rows: { marginTop: 16, gap: 17 },
  none: { marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  body: { flex: 1, gap: 7 },
  line: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  name: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexShrink: 1 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
});
