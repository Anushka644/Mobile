import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';

import { AppText, Confetti, IconBadge, springPop, timingFade, useReducedMotion } from '@/components';
import { colors, radius, withAlpha } from '@/theme/tokens';

import { clayRaised } from '../saved/clay';

export interface BuyCelebrationProps {
  /** Shows the overlay and fires the confetti (once). */
  visible: boolean;
  /** Optional line under the headline, e.g. "Opening nike.com…". */
  detail?: string;
}

/**
 * "Yes, I'll buy it" moment (spec §4.5, §5 Buy): a cream veil over the decision, a white clay card
 * that pops in with "Enjoy it — you earned the certainty.", and 24 pieces of confetti bursting
 * from behind it. Calm and celebratory, never judgemental. Reduced motion: a plain fade.
 */
export function BuyCelebration({ visible, detail }: BuyCelebrationProps) {
  const reduced = useReducedMotion();
  const veil = useSharedValue(0);
  const pop = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    veil.set(withTiming(1, timingFade));
    pop.set(reduced ? withTiming(1, timingFade) : withDelay(60, withSpring(1, springPop)));
  }, [visible, reduced, veil, pop]);

  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.get() }));
  const cardStyle = useAnimatedStyle(() => {
    const v = pop.get();
    return reduced
      ? { opacity: v }
      : { opacity: Math.min(1, v * 2), transform: [{ scale: 0.82 + 0.18 * v }, { translateY: (1 - v) * 24 }] };
  });

  if (!visible) return null;
  return (
    <View style={[StyleSheet.absoluteFill, styles.root]} accessibilityViewIsModal testID="buy-celebration">
      <Animated.View style={[StyleSheet.absoluteFill, styles.veil, veilStyle]} />
      <Confetti trigger={visible ? 1 : 0} origin={{ x: 0.5, y: 0.44 }} />
      <View style={styles.center}>
        <Animated.View style={[styles.card, clayRaised, cardStyle]} accessibilityRole="alert">
          <IconBadge icon="heart" tint={colors.coral100} color={colors.coral500} size={64} iconSize={30} />
          <AppText variant="titleL" align="center">
            Enjoy it — you earned the certainty.
          </AppText>
          {detail ? (
            <AppText variant="bodyM" color={colors.text.secondary} align="center">
              {detail}
            </AppText>
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 10 },
  veil: { backgroundColor: withAlpha(colors.cream100, 0.9) },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  card: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 26,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.surface,
  },
});
