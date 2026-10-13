// The You tab's "Thaw reminders" switch (spec §4.9: a toggle that calls ensurePermission).
//
// On:  ask for permission (iOS / Android), remember the choice in settings, and schedule the thaw
//      notification for every cooling item that doesn't have one yet.
// Off: cancel every scheduled thaw notification and forget the ids.
// Web has no local notifications: the preference is saved (it applies in the native app) and the
// caller tells the user so.

import { Platform } from 'react-native';

import { now } from '@/lib/clock';
import { cancelNotification, ensurePermission } from '@/lib/notifications';
import { scheduleItemThawNotification } from '@/lib/thawSchedule';
import { isDemoItem } from '@/store/demo';
import { useChillStore } from '@/store/useChillStore';

export type ReminderResult = 'on' | 'off' | 'denied' | 'web';

/** Schedules thaw notifications for undecided, still-cooling items without one. Returns how many. */
export async function scheduleMissingReminders(): Promise<number> {
  const appNow = now();
  const pending = useChillStore
    .getState()
    .items.filter((i) => !i.decision && i.thawAt > appNow && !i.notificationId);
  let scheduled = 0;
  for (const item of pending) {
    // The app clock may be fast-forwarded (demo); the OS fires on the device clock.
    const id = await scheduleItemThawNotification(item);
    if (id && useChillStore.getState().items.some((i) => i.id === item.id)) {
      useChillStore.getState().setNotificationId(item.id, id);
      scheduled++;
    }
  }
  return scheduled;
}

/** Cancels every item's scheduled thaw notification and clears the stored ids. */
export async function cancelAllReminders(): Promise<void> {
  const withIds = useChillStore.getState().items.filter((i) => i.notificationId);
  for (const item of withIds) {
    await cancelNotification(item.notificationId);
    useChillStore.getState().setNotificationId(item.id, undefined);
  }
}

/**
 * "Load sample freezer": replaces the sample items (seedDemo) without orphaning their reminders.
 * The old sample items' notifications are cancelled (seedDemo drops their ids, so nothing could
 * cancel them later), and the fresh sample items get reminders when they are switched on.
 * The store updates synchronously; the notification bookkeeping follows. Never throws.
 */
export async function loadSampleFreezer(): Promise<void> {
  const stale = useChillStore
    .getState()
    .items.filter((i) => isDemoItem(i) && i.notificationId)
    .map((i) => i.notificationId);
  useChillStore.getState().seedDemo();
  try {
    for (const id of stale) await cancelNotification(id);
    if (Platform.OS !== 'web' && useChillStore.getState().settings.notificationsEnabled) {
      await scheduleMissingReminders();
    }
  } catch {
    // Best effort: the freezer itself is already loaded.
  }
}

/** Turns thaw reminders on or off. Never throws. */
export async function setThawReminders(on: boolean): Promise<ReminderResult> {
  const { updateSettings } = useChillStore.getState();
  try {
    if (!on) {
      updateSettings({ notificationsEnabled: false });
      await cancelAllReminders();
      return 'off';
    }
    if (Platform.OS === 'web') {
      updateSettings({ notificationsEnabled: true });
      return 'web';
    }
    const granted = await ensurePermission();
    if (!granted) return 'denied';
    updateSettings({ notificationsEnabled: true });
    await scheduleMissingReminders();
    return 'on';
  } catch {
    return on ? 'denied' : 'off';
  }
}
