import { useEffect } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Icon, springPop, useReducedMotion } from '@/components';
import { colors } from '@/theme/tokens';

export interface TwinkleProps {
  /** Pops in when true. */
  visible: boolean;
  size: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/** A butter500 sparkle that pops in (spring.pop) and then twinkles gently (scale + rotate, 1.8s). */
export function Twinkle({ visible, size, delay = 0, style }: TwinkleProps) {
  const reduced = useReducedMotion();
  const pop = useSharedValue(0);
  const glint = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    if (reduced) {
      pop.set(withTiming(1, { duration: 200 }));
      return;
    }
    pop.set(withDelay(delay, withSpring(1, springPop)));
    glint.set(
      withDelay(
        delay + 500,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
            withTiming(0, { duration: 900, easing: Easing.inOut(Easing.sin) })
          ),
          -1
        )
      )
    );
    return () => cancelAnimation(glint);
  }, [visible, reduced, delay, pop, glint]);

  const animated = useAnimatedStyle(() => {
    const g = glint.get();
    return {
      opacity: Math.min(1, pop.get()),
      transform: [{ scale: pop.get() * (0.86 + 0.18 * g) }, { rotate: `${g * 18}deg` }],
    };
  });

  return (
    <Animated.View style={[{ position: 'absolute', width: size, height: size }, style, animated]}>
      <Icon name="sparkle" size={size} color={colors.butter500} strokeWidth={2} />
    </Animated.View>
  );
}
