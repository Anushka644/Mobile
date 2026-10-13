import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { AppText, Jar, useReducedMotion } from '@/components';
import { formatMoney } from '@/lib/money';
import { colors, radius } from '@/theme/tokens';

import { useCountUp } from '../letgo/useCountUp';
import { claySoft } from './clay';
import { wantsLetGoLabel } from './savedCopy';

export interface SavedHeroProps {
  savedCents: number;
  currency: string;
  /** Jar fill 0..1 (jarLevel: goal progress, or let-go count without a goal). */
  level: number;
  letGoCount: number;
}

/** Figma "05 Saved — Jar" hero: the Jar at 82% (180.4 × 214.84). */
const JAR_WIDTH = 180.4;
const JAR_K = JAR_WIDTH / 220;

/**
 * Saved hero (spec §4.7): the total ("$934", Numeric/XL) over the big Jar, with a white
 * "8 wants let go" pill resting on the jar's right shoulder. The total counts up from zero the
 * first time, and the coins drop in.
 */
export function SavedHero({ savedCents, currency, level, letGoCount }: SavedHeroProps) {
  const reduced = useReducedMotion();
  const shown = useCountUp(savedCents, { duration: 800 });
  const settled = Math.round(shown) === Math.round(savedCents);
  const total = formatMoney(settled ? savedCents : shown, currency, settled ? {} : { decimals: 'never' });

  return (
    <View style={styles.hero} testID="saved-hero">
      <AppText
        variant="numericXL"
        align="center"
        tabular
        accessibilityLabel={`${formatMoney(savedCents, currency)} saved`}
        testID="saved-total"
      >
        {total}
      </AppText>
      <View style={styles.jarWrap}>
        <Jar level={level} width={JAR_WIDTH} dropInOnMount={!reduced} />
        {letGoCount > 0 ? (
          <View style={styles.pillSlot}>
            <Animated.View
              entering={reduced ? FadeIn.duration(200) : ZoomIn.delay(500).springify().damping(13)}
              style={[styles.pill, claySoft]}
            >
              <AppText variant="labelS" color={colors.text.success} numberOfLines={1}>
                {wantsLetGoLabel(letGoCount)}
              </AppText>
            </Animated.View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Figma: total 0–64, jar from 70 (214.84 tall), hero box 300.
  hero: { height: 300, alignItems: 'center' },
  jarWrap: { marginTop: 6, width: JAR_WIDTH, height: 262 * JAR_K },
  // Figma: pill at (236, 180) in the 353 hero = (149.7, 110) from the jar's top-left. The slot is
  // wide so the pill sizes to its text instead of to the space left of the jar's edge.
  pillSlot: { position: 'absolute', left: 149.7, top: 110, width: 180, alignItems: 'flex-start', pointerEvents: 'none' },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
  },
});
