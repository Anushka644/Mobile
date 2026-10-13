import { useEffect } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { colors, withAlpha } from '@/theme/tokens';

import { ariaState } from './a11y';
import { springPress, timingFade, useReducedMotion } from './motion';

export interface ToggleProps {
  value: boolean;
  /**
   * Without it the Toggle is purely visual and hidden from assistive tech — for a row that is
   * itself the switch (e.g. You → "Thaw reminders"), so there is never a switch inside a switch.
   */
  onValueChange?: (value: boolean) => void;
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

/**
 * Clay switch (You tab "Thaw reminders"): mint500 track when on, plum100 when off, white knob that
 * springs across. Interactive with `onValueChange`; otherwise a visual for a row that is the switch.
 */
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

  const track = (
    <Animated.View style={[styles.track, trackStyle]}>
      <Animated.View style={[styles.knob, knobStyle]} />
    </Animated.View>
  );

  if (!onValueChange) {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        aria-hidden
        testID={testID}
        style={[disabled ? styles.disabled : null, styles.noTouch, style]}
      >
        {track}
      </View>
    );
  }

  const state = { checked: value, disabled: !!disabled };
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
      accessibilityState={state}
      {...ariaState(state)}
      testID={testID}
      style={[disabled ? styles.disabled : null, style]}
    >
      {track}
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
  noTouch: { pointerEvents: 'none' },
});
