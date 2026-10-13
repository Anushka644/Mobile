import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText, ProgressBar } from '@/components';
import { formatHeroCountdown } from '@/lib/format';
import { colors } from '@/theme/tokens';

import { countdownA11y, meltReadout } from './itemCopy';

export interface CountdownHeroProps {
  /** Milliseconds until thaw. */
  timeLeft: number;
  /** Melt progress 0..1. */
  progress: number;
  thawAt: number;
  now: number;
  /** Thawed (or thawing early): the readout reads "Fully melted · Ready to decide". */
  thawed?: boolean;
  /** Width of the melt line and its readout (match the tile above). Default 260. */
  width?: number;
  style?: StyleProp<ViewStyle>;
}

/** The melt line: thin, ice blue (time is the one place colour lives on this screen). */
const LINE_H = 3;

/**
 * The countdown (v2): a mono "THAWS IN" caption, the time left in Geist Light (Numeric/XL), a thin
 * ice melt line as wide as the tile, and a two-ended readout under it — "83% MELTED" on the left,
 * "TOMORROW 3:46 AM" on the right — like the scale on an instrument.
 */
export function CountdownHero({
  timeLeft,
  progress,
  thawAt,
  now,
  thawed = false,
  width = 260,
  style,
}: CountdownHeroProps) {
  const [melted, when] = meltReadout(progress, thawAt, now, thawed);
  return (
    <View style={[styles.wrap, style]}>
      <AppText variant="caption" color={colors.text.secondary} align="center">
        {thawed ? 'Thawed' : 'Thaws in'}
      </AppText>
      <AppText
        variant="numericXL"
        align="center"
        numberOfLines={1}
        adjustsFontSizeToFit
        tabular
        accessibilityRole="timer"
        accessibilityLabel={countdownA11y(timeLeft)}
        testID="item-countdown"
        style={styles.count}
      >
        {formatHeroCountdown(timeLeft)}
      </AppText>
      <View style={[styles.scale, { width }]}>
        <ProgressBar progress={progress} height={LINE_H} accessibilityLabel="Melted" />
        <View style={styles.readout}>
          <AppText variant="caption" color={colors.text.ice} numberOfLines={1}>
            {melted}
          </AppText>
          <AppText variant="caption" color={colors.text.secondary} numberOfLines={1} style={styles.when}>
            {when}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', alignSelf: 'stretch' },
  count: { marginTop: 8, alignSelf: 'stretch' },
  scale: { marginTop: 18, maxWidth: '100%', gap: 10 },
  readout: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  when: { flexShrink: 1, textAlign: 'right' },
});
