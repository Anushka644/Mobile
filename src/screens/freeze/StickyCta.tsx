// The Freeze sheet's sticky CTA (spec §4.3 "Sticky bottom"), rendered in <Screen footer>:
// - a cream fade that dissolves the form under the button, shown only while more of the form is
//   hidden below (at rest on a tall screen, and at the end of the scroll, nothing is faded);
// - an opaque cream pill behind the button, so the 40%-opacity disabled state never lets the
//   scrolled content show through it.

import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Button, GUTTER, timingFade, useBottomGap, type ButtonProps } from '@/components';
import { colors, radius, withAlpha } from '@/theme/tokens';

/** How far the fade reaches above the button. */
const FADE_ABOVE = 40;

export interface StickyCtaProps extends ButtonProps {
  /** Fade the content behind the button (true while more of the form is below the fold). */
  fade: boolean;
}

export function StickyCta({ fade, ...button }: StickyCtaProps) {
  const gap = useBottomGap();
  const shown = useSharedValue(fade ? 1 : 0);

  useEffect(() => {
    shown.set(withTiming(fade ? 1 : 0, timingFade));
  }, [fade, shown]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: shown.get() }));

  return (
    <View>
      <Animated.View style={[styles.fade, { bottom: -gap }, fadeStyle]}>
        <LinearGradient
          colors={[withAlpha(colors.cream100, 0), withAlpha(colors.cream100, 0.94), colors.cream100]}
          locations={[0, 0.35, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <View style={styles.backing}>
        <Button {...button} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', top: -FADE_ABOVE, left: -GUTTER, right: -GUTTER, pointerEvents: 'none' },
  backing: { borderRadius: radius.full, backgroundColor: colors.bg.canvas },
});
