// Web build of ./notifications.ts: the same API with no-op bodies. Web has no local notification
// scheduling, and importing expo-notifications there only logs a push-token warning on every page
// load — so the web bundle resolves this file instead and never loads the package.
// The `satisfies` check below keeps this API in step with the native module.

import type * as Native from './notifications';

export type { ThawNotificationData } from './notifications';

export const THAW_CHANNEL_ID = 'thaw';

export const THAW_NOTIFICATION_BODY = 'Still want it? Tap to decide.';

export function thawNotificationTitle(name: string): string {
  return `Your ${name.trim() || 'item'} has thawed 🧊`;
}

export function configureNotifications(): void {}

export async function ensurePermission(): Promise<boolean> {
  return false;
}

export async function scheduleThawNotification(): Promise<string | null> {
  return null;
}

export async function cancelNotification(): Promise<void> {}

export async function cancelAllNotifications(): Promise<void> {}

export function subscribeToThawTaps(): () => void {
  return () => {};
}

// Compile-time check: every native export exists here with a compatible signature.
({
  THAW_CHANNEL_ID,
  THAW_NOTIFICATION_BODY,
  thawNotificationTitle,
  configureNotifications,
  ensurePermission,
  scheduleThawNotification,
  cancelNotification,
  cancelAllNotifications,
  subscribeToThawTaps,
}) satisfies typeof Native;
