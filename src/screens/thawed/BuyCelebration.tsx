import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';

import { AppText, Confetti, ItemCube, springCalm, timingFade, useReducedMotion } from '@/components';
import { colors, withAlpha } from '@/theme/tokens';
import type { Item } from '@/types';

export interface BuyCelebrationProps {
  /** Shows the overlay and fires the confetti (once). */
  visible: boolean;
  /** The item being bought: shown as a small clear tile above the line. */
  item?: Item;
  /** Optional status line under the copy, e.g. "Opening nike.com…". */
  detail?: string;
}

const TILE = 96;

/**
 * "Yes, I'll buy it" moment (v2): the decision fades under a paper veil, a calm ink / ice confetti
 * burst, the clear tile, a serif "Enjoy it." and a no-guilt line, then a mono status line while
 * the shop opens. No card, no badge. Reduced motion: a plain fade.
 */
export function BuyCelebration({ visible, item, detail }: BuyCelebrationProps) {
  const reduced = useReducedMotion();
  const veil = useSharedValue(0);
  const rise = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    veil.set(withTiming(1, timingFade));
    rise.set(reduced ? withTiming(1, timingFade) : withDelay(80, withSpring(1, springCalm)));
  }, [visible, reduced, veil, rise]);

  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.get() }));
  const copyStyle = useAnimatedStyle(() => {
    const v = rise.get();
    return reduced ? { opacity: v } : { opacity: v, transform: [{ translateY: (1 - v) * 16 }] };
  });

  if (!visible) return null;
  return (
    <View style={[StyleSheet.absoluteFill, styles.root]} accessibilityViewIsModal testID="buy-celebration">
      <Animated.View style={[StyleSheet.absoluteFill, styles.veil, veilStyle]} />
      <Confetti trigger={visible ? 1 : 0} origin={{ x: 0.5, y: 0.4 }} />
      <View style={styles.center}>
        <Animated.View style={[styles.copy, copyStyle]} accessibilityRole="alert">
          {item ? (
            <ItemCube item={item} progress={1} thawed size={TILE} radius={Math.round(TILE * 0.16)} animated={false} />
          ) : null}
          <AppText variant="displayXL" align="center" style={styles.title}>
            Enjoy it.
          </AppText>
          <AppText variant="bodyL" color={colors.text.secondary} align="center">
            You earned the certainty.
          </AppText>
          {detail ? (
            <AppText variant="caption" color={colors.text.tertiary} align="center" style={styles.detail}>
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
  veil: { backgroundColor: withAlpha(colors.cream100, 0.96) },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  copy: { alignItems: 'center', maxWidth: 320 },
  title: { marginTop: 28, marginBottom: 8 },
  detail: { marginTop: 28 },
});
