import { useEffect } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { colors, withAlpha } from '@/theme/tokens';

import { springPress, timingFade, useReducedMotion } from './motion';

export interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  /** Required for screen readers, e.g. "Thaw reminders". */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const TRACK_W = 52;
const TRACK_H = 32;
const KNOB = 26;
const INSET = (TRACK_H - KNOB) / 2;

/** Clay switch (You tab "Thaw reminders"): mint500 track when on, plum100 when off, white knob that springs across. */
export function Toggle({ value, onValueChange, disabled, accessibilityLabel, style, testID }: ToggleProps) {
  const reduced = useReducedMotion();
  const on = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    on.set(reduced ? withTiming(value ? 1 : 0, timingFade) : withSpring(value ? 1 : 0, springPress));
  }, [value, reduced, on]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.get(), [0, 1], [colors.plum100, colors.mint500]),
  }));
  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: on.get() * (TRACK_W - KNOB - INSET * 2) }] }));

  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onValueChange(!value);
      }}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      testID={testID}
      style={[disabled ? styles.disabled : null, style]}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.knob, knobStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    padding: INSET,
    boxShadow: `inset 0px 2px 3px 0px ${withAlpha(colors.plum900, 0.08)}`,
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: colors.white,
    boxShadow: `0px 2px 5px 0px ${withAlpha(colors.plum900, 0.2)}`,
  },
  disabled: { opacity: 0.4 },
});
