// The You tab's "Thaw reminders" switch (spec §4.9: a toggle that calls ensurePermission).
//
// On:  ask for permission (iOS / Android), remember the choice in settings, and schedule the thaw
//      notification for every cooling item that doesn't have one yet.
// Off: cancel every scheduled thaw notification and forget the ids.
// Web has no local notifications: the preference is saved (it applies in the native app) and the
// caller tells the user so.

import { Platform } from 'react-native';

import { now, timeOffsetMs } from '@/lib/clock';
import { cancelNotification, ensurePermission, scheduleThawNotification } from '@/lib/notifications';
import { useChillStore } from '@/store/useChillStore';

export type ReminderResult = 'on' | 'off' | 'denied' | 'web';

/** Schedules thaw notifications for undecided, still-cooling items without one. Returns how many. */
export async function scheduleMissingReminders(): Promise<number> {
  const offset = timeOffsetMs();
  const appNow = now();
  const pending = useChillStore
    .getState()
    .items.filter((i) => !i.decision && i.thawAt > appNow && !i.notificationId);
  let scheduled = 0;
  for (const item of pending) {
    // The app clock may be fast-forwarded (demo); the OS fires on the device clock.
    const id = await scheduleThawNotification(
      { id: item.id, name: item.name, thawAt: item.thawAt - offset },
      appNow - offset
    );
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
