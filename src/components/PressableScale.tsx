import { useState, type ReactNode } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';

import { ariaState } from './a11y';
import { PRESS_SCALE, springPress, timingFade, useReducedMotion } from './motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Haptic played on press (see src/lib/haptics.ts). */
export type HapticKind = keyof typeof haptics;

export interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  /** Style of the pressable surface (it is the element that scales). */
  style?: StyleProp<ViewStyle>;
  /** Extra style applied while pressed (e.g. Ghost button's sunken fill). */
  pressedStyle?: StyleProp<ViewStyle>;
  /** Scale while pressed. Default 0.96 (spring.press). */
  scaleTo?: number;
  /** Haptic fired on press. Default none. */
  haptic?: HapticKind | false;
  children?: ReactNode;
}

/**
 * The squishy press primitive (spec §1.4, §5): shrinks to 0.96 on press-in and springs back
 * with a slight overshoot (spring.press). Reduced motion: a quick ease with no overshoot.
 * Disabled pressables don't animate and get `accessibilityState.disabled`. The accessibility state
 * is mirrored to aria-* props so it also reaches the DOM on web (see ./a11y.ts).
 */
export function PressableScale({
  style,
  pressedStyle,
  scaleTo = PRESS_SCALE,
  haptic = false,
  disabled,
  onPressIn,
  onPressOut,
  onPress,
  children,
  accessibilityRole = 'button',
  accessibilityState,
  ...rest
}: PressableScaleProps) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const [pressed, setPressed] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const handlePressIn = (e: GestureResponderEvent) => {
    if (!disabled) {
      scale.set(reduced ? withTiming(scaleTo, timingFade) : withSpring(scaleTo, springPress));
      if (pressedStyle) setPressed(true);
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    scale.set(reduced ? withTiming(1, timingFade) : withSpring(1, springPress));
    if (pressedStyle) setPressed(false);
    onPressOut?.(e);
  };

  const handlePress = (e: GestureResponderEvent) => {
    if (disabled) return;
    if (haptic) haptics[haptic]();
    onPress?.(e);
  };

  const a11yState = { ...accessibilityState, disabled: !!disabled };
  return (
    <AnimatedPressable
      accessibilityRole={accessibilityRole}
      accessibilityState={a11yState}
      {...ariaState(a11yState)}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[style, pressed ? pressedStyle : null, animatedStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
