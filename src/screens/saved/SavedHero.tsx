import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AppText, Jar, useReducedMotion } from '@/components';
import { formatMoney } from '@/lib/money';
import { colors } from '@/theme/tokens';

import { useCountUp } from '../letgo/useCountUp';
import { wantsLetGoLabel } from './savedCopy';

export interface SavedHeroProps {
  savedCents: number;
  currency: string;
  /** Glass fill 0..1 (jarLevel: goal progress, or let-go count without a goal). */
  level: number;
  letGoCount: number;
}

/** The savings glass, drawn at 84% of its 220 × 262 design box. */
const GLASS_WIDTH = 184;

/**
 * Saved hero (v2): the total in Geist Light ("$934", Numeric/XL) with a mono "6 wants let go"
 * under it, then the savings glass. The total counts up from zero the first time and the water
 * rises.
 */
export function SavedHero({ savedCents, currency, level, letGoCount }: SavedHeroProps) {
  const reduced = useReducedMotion();
  const shown = useCountUp(savedCents, { duration: 800 });
  const settled = Math.round(shown) === Math.round(savedCents);
  const total = formatMoney(settled ? savedCents : shown, currency, settled ? {} : { decimals: 'never' });

  return (
    <View style={styles.hero} testID="saved-hero">
      <View style={styles.total}>
        <AppText
          variant="numericXL"
          align="center"
          tabular
          numberOfLines={1}
          adjustsFontSizeToFit
          accessibilityLabel={`${formatMoney(savedCents, currency)} saved`}
          testID="saved-total"
        >
          {total}
        </AppText>
        {letGoCount > 0 ? (
          <Animated.View entering={FadeIn.delay(reduced ? 0 : 400).duration(360)}>
            <AppText variant="caption" color={colors.text.secondary} align="center">
              {wantsLetGoLabel(letGoCount)}
            </AppText>
          </Animated.View>
        ) : null}
      </View>
      <Jar level={level} width={GLASS_WIDTH} dropInOnMount={!reduced} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 28 },
  total: { alignItems: 'center', gap: 6, alignSelf: 'stretch' },
});
