// Motion tokens (spec §2 "Motion tokens") shared by every animated component.
import { Easing, type WithSpringConfig, type WithTimingConfig } from 'react-native-reanimated';

export { useReducedMotion } from 'react-native-reanimated';

/** spring.press — button and card press (scale 0.96, slight overshoot back to 1). */
export const springPress: WithSpringConfig = { damping: 15, stiffness: 260, mass: 0.6 };

/** spring.pop — appear / cube drop, visible overshoot. */
export const springPop: WithSpringConfig = { damping: 11, stiffness: 180 };

/** Critically damped variant for reduced motion (no overshoot). */
export const springCalm: WithSpringConfig = { damping: 30, stiffness: 220, overshootClamping: true };

/** timing.fade — 220ms ease-out. */
export const timingFade: WithTimingConfig = { duration: 220, easing: Easing.out(Easing.quad) };

/** melt — cube geometry follows meltProgress over 600ms when it changes. */
export const timingMelt: WithTimingConfig = { duration: 600, easing: Easing.out(Easing.cubic) };

/** The scale a pressable shrinks to (spring.press). */
export const PRESS_SCALE = 0.96;
