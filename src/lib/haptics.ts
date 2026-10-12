// Fire-and-forget haptic feedback. No-ops on web and never throws or rejects,
// so call sites can use them inline: onPress={() => { haptics.tap(); freeze(); }}.

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

function run(feedback: () => Promise<void>): void {
  if (Platform.OS === 'web') return;
  try {
    feedback().catch(() => undefined);
  } catch {
    // Haptics unavailable (simulator, missing native module): stay silent.
  }
}

/** Light tap: buttons, chips, toggles. */
export function tap(): void {
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** Selection tick: moving through pickers / segmented options. */
export function selection(): void {
  run(() => Haptics.selectionAsync());
}

/** Success: item frozen, let go (money saved), goal reached. */
export function success(): void {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** Warning: destructive confirmations, "Buy it". */
export function warning(): void {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

/** Heavy thud: the ice cube cracking / drop into the freezer. */
export function heavy(): void {
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
}

export const haptics = { tap, selection, success, warning, heavy } as const;
