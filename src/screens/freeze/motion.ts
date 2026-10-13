// Spring configs for the Freeze sheet, pinned to mass 1.
//
// The kit's springPop / springCalm (src/components/motion.ts) leave `mass` unset, and Reanimated 4
// merges unset fields from its GentleSpringConfig, whose mass is 4. That makes spring.pop
// (damping 11, stiffness 180) wobble for ~3s instead of settling in ~0.7s with a single visible
// overshoot, which would leave the freezing moment's cube still bouncing when the sheet moves on.

import type { WithSpringConfig } from 'react-native-reanimated';

import { springCalm, springPop } from '@/components';

/** spring.pop as specified (damping 11, stiffness 180, mass 1). */
export const pop: WithSpringConfig = { ...springPop, mass: 1 };

/** springCalm with mass 1 (critically damped, no overshoot). */
export const calm: WithSpringConfig = { ...springCalm, mass: 1 };
