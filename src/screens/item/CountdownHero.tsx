import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText, ProgressBar } from '@/components';
import { formatHeroCountdown } from '@/lib/format';
import { colors } from '@/theme/tokens';

import { countdownA11y, meltCaption } from './itemCopy';

export interface CountdownHeroProps {
  /** Milliseconds until thaw. */
  timeLeft: number;
  /** Melt progress 0..1. */
  progress: number;
  thawAt: number;
  now: number;
  /** Thawed (or thawing early): the caption reads "Fully melted · ready to decide". */
  thawed?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The big countdown (spec §4.4): "29h 14m" in Numeric/XL, a 260 × 12 ice progress track at the melt
 * %, and "58% MELTED · THAWS THU 9:41 PM" (Caption, ice800).
 */
export function CountdownHero({ timeLeft, progress, thawAt, now, thawed = false, style }: CountdownHeroProps) {
  return (
    <View style={[styles.wrap, style]}>
      <AppText
        variant="numericXL"
        align="center"
        numberOfLines={1}
        adjustsFontSizeToFit
        accessibilityRole="timer"
        accessibilityLabel={countdownA11y(timeLeft)}
        testID="item-countdown"
      >
        {formatHeroCountdown(timeLeft)}
      </AppText>
      <ProgressBar progress={progress} width={260} style={styles.bar} accessibilityLabel="Melted" />
      <AppText variant="caption" color={colors.text.ice} align="center" style={styles.caption}>
        {meltCaption(progress, thawAt, now, thawed)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', alignSelf: 'stretch' },
  bar: { marginTop: 11 },
  caption: { marginTop: 11 },
});
