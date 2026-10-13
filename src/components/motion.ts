// Motion tokens (spec §2 "Motion tokens") shared by every animated component.
import { Easing, type WithSpringConfig, type WithTimingConfig } from 'react-native-reanimated';

export { useReducedMotion } from 'react-native-reanimated';

// Every spring pins `mass`: Reanimated 4 fills unset fields from its GentleSpringConfig, whose mass
// is 4 — that would turn spring.pop (damping ratio 0.41 at mass 1) into a ~0.2 wobble lasting ~3s.

/** spring.press — button and card press (scale 0.96, slight overshoot back to 1). */
export const springPress: WithSpringConfig = { damping: 15, stiffness: 260, mass: 0.6 };

/** spring.pop — appear / cube drop: one visible overshoot, settled in ~0.7s. */
export const springPop: WithSpringConfig = { damping: 11, stiffness: 180, mass: 1 };

/** Critically damped variant for reduced motion (no overshoot). */
export const springCalm: WithSpringConfig = { damping: 30, stiffness: 220, mass: 1, overshootClamping: true };

/** Bottom sheets: a soft landing (damping ratio ~0.65) with a small overshoot the panel's skirt hides. */
export const springSheet: WithSpringConfig = { damping: 18, stiffness: 190, mass: 1 };

/** timing.fade — 220ms ease-out. */
export const timingFade: WithTimingConfig = { duration: 220, easing: Easing.out(Easing.quad) };

/** melt — cube geometry follows meltProgress over 600ms when it changes. */
export const timingMelt: WithTimingConfig = { duration: 600, easing: Easing.out(Easing.cubic) };

/** The scale a pressable shrinks to (spring.press). */
export const PRESS_SCALE = 0.96;
