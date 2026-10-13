import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppText } from '@/components';
import { colors, radius, shadow, withAlpha } from '@/theme/tokens';

import { arcPath, donutArcs, type ArcSegment, type HeroStat } from './insightsModel';
import { useTween } from './useReplay';

export interface KeepRateCardProps {
  hero: HeroStat;
  /** Focus replay counter: the ring sweeps in and the percentage counts up each time it changes. */
  play: number;
}

const RING = 112;
const STROKE = 15;

/**
 * The plum hero stat (06-insights): eyebrow, "You let go of 6 of 8 wants", the money line, and the
 * keep-rate donut on the right — mint for let go, coral500 for bought (the PNG's coral; the spec
 * text says coral300), thin white separators.
 */
export function KeepRateCard({ hero, play }: KeepRateCardProps) {
  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`${hero.title}. ${hero.percent} let go. ${hero.line}`}
      testID="insights-hero"
    >
      <View style={styles.text}>
        <AppText variant="caption" color={colors.text.inverse}>
          {hero.eyebrow}
        </AppText>
        <AppText variant="titleM" color={colors.text.inverse} style={styles.title}>
          {hero.title}
        </AppText>
        <AppText variant="bodyS" color={withAlpha(colors.white, 0.86)}>
          {hero.line}
        </AppText>
      </View>
      <KeepRateDonut share={hero.letGoShare} play={play} />
    </View>
  );
}

/** A radial line across the ring's stroke at `deg` (clockwise from 12 o'clock). */
function seamPath(c: number, r: number, deg: number): string {
  const rad = ((deg - 90) * Math.PI) / 180;
  const inner = r - STROKE / 2 - 0.5;
  const outer = r + STROKE / 2 + 0.5;
  const x = (d: number) => (c + d * Math.cos(rad)).toFixed(2);
  const y = (d: number) => (c + d * Math.sin(rad)).toFixed(2);
  return `M ${x(inner)} ${y(inner)} L ${x(outer)} ${y(outer)}`;
}

/** Reveal only the part of `seg` before `limit` degrees (the clockwise sweep-in). */
function clip(seg: ArcSegment | null, limit: number): ArcSegment | null {
  if (!seg || limit <= seg.start) return null;
  const sweep = Math.min(seg.sweep, limit - seg.start);
  return sweep > 0.2 ? { start: seg.start, sweep } : null;
}

export function KeepRateDonut({ share, play, size = RING }: { share: number; play: number; size?: number }) {
  const t = useTween(play, 1000, 120);
  const c = size / 2;
  const r = c - STROKE / 2;
  const arcs = donutArcs(share, 0);
  const reveal = 360 * t;
  const letGo = clip(arcs.letGo, reveal);
  const bought = clip(arcs.bought, reveal);
  const pct = Math.round(Math.min(1, Math.max(0, share)) * 100 * t);
  // White hairline separators where the two arcs meet (12 o'clock and the let-go / bought boundary).
  const seams = arcs.letGo && arcs.bought ? [0, arcs.bought.start] : [];

  return (
    <View style={{ width: size, height: size }} testID="insights-donut">
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={r} stroke={withAlpha(colors.white, 0.1)} strokeWidth={STROKE} fill="none" />
        {bought ? (
          <Path d={arcPath(c, r, bought)} stroke={colors.coral500} strokeWidth={STROKE} fill="none" strokeLinecap="butt" />
        ) : null}
        {letGo ? (
          <Path d={arcPath(c, r, letGo)} stroke={colors.mint500} strokeWidth={STROKE} fill="none" strokeLinecap="butt" />
        ) : null}
        {seams.map((deg) =>
          reveal >= deg ? (
            <Path
              key={deg}
              d={seamPath(c, r, deg)}
              stroke={colors.white}
              strokeWidth={2.5}
              strokeLinecap="butt"
              opacity={Math.min(1, t * 1.4)}
            />
          ) : null
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <AppText variant="numericM" color={colors.text.inverse} tabular>
          {`${pct}%`}
        </AppText>
        <AppText variant="caption" color={colors.text.inverse}>
          Let go
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 150,
    paddingVertical: 19,
    paddingLeft: 20,
    paddingRight: 20,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.inverse,
    ...shadow('button'),
  },
  text: { flex: 1, gap: 6 },
  title: { marginBottom: 2 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 1 },
});
