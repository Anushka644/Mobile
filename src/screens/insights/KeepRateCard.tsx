import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components';
import { colors } from '@/theme/tokens';

import type { HeroStat } from './insightsModel';
import { CHART } from './palette';
import { useTween } from './useReplay';

export interface KeepRateCardProps {
  hero: HeroStat;
  /** Focus replay counter: the split bar fills and the percentage counts up each time it changes. */
  play: number;
}

const BAR_HEIGHT = 4;
/** Paper gap between the let-go and bought segments. */
const SPLIT_GAP = 3;

/**
 * The keep-rate hero (v2): no card. A mono "So far", the share let go as a huge Geist Light "75%",
 * a thin split bar (ice for what melted away, paper for what you bought), then "You let go of 6 of
 * 8 wants" and the money line — between two hairlines, like Home's saved line.
 */
export function KeepRateCard({ hero, play }: KeepRateCardProps) {
  const t = useTween(play, 1000, 120);
  const pct = Math.round(Math.min(1, Math.max(0, hero.letGoShare)) * 100 * t);
  return (
    <View
      style={styles.hero}
      accessible
      accessibilityLabel={`${hero.title}. ${hero.percent} let go. ${hero.line}`}
      testID="insights-hero"
    >
      <View style={styles.stat}>
        <AppText variant="caption" color={colors.text.secondary}>
          {hero.eyebrow}
        </AppText>
        <AppText variant="numericXL" tabular style={styles.number}>
          {pct}
          <AppText variant="numericL" color={colors.text.tertiary}>
            %
          </AppText>
        </AppText>
      </View>
      <KeepRateBar share={hero.letGoShare} progress={t} />
      <View style={styles.lines}>
        <AppText variant="bodyL">{hero.title}</AppText>
        <AppText variant="bodyS" color={colors.text.secondary}>
          {hero.line}
        </AppText>
      </View>
    </View>
  );
}

/** The let-go share as an ice segment, a paper gap, then the bought share; `progress` 0..1 fills it. */
export function KeepRateBar({ share, progress = 1 }: { share: number; progress?: number }) {
  const s = Number.isFinite(share) ? Math.min(1, Math.max(0, share)) : 0;
  const p = s * Math.min(1, Math.max(0, progress)) * 100;
  return (
    <View style={styles.bar} testID="insights-keep-bar">
      {p > 0 ? <View style={[styles.segment, styles.letGo, { width: `${p}%` }]} /> : null}
      {p < 100 ? <View style={[styles.segment, styles.rest, { left: `${p}%` }, p > 0 ? styles.split : null]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 18,
    paddingTop: 20,
    paddingBottom: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.strong,
  },
  stat: { gap: 6 },
  number: { marginLeft: -3 },
  bar: { height: BAR_HEIGHT },
  segment: { position: 'absolute', top: 0, bottom: 0, borderRadius: BAR_HEIGHT / 2 },
  letGo: { left: 0, backgroundColor: CHART.letGo },
  rest: { right: 0, backgroundColor: CHART.bought },
  split: { marginLeft: SPLIT_GAP },
  lines: { gap: 3 },
});
