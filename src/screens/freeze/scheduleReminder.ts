// The thaw reminder for a freshly frozen item (spec §4.3, "Before navigating"):
// on the user's first own freeze, ask for notification permission; then, if notifications are on,
// schedule the "has thawed" notification and store its id on the item. Never throws; a no-op on web.

import { Platform } from 'react-native';

import { ensurePermission } from '@/lib/notifications';
import { scheduleItemThawNotification } from '@/lib/thawSchedule';
import { useChillStore } from '@/store/useChillStore';
import type { Item } from '@/types';

/** Whether the freezing moment can promise a nudge ("We’ll nudge you."). */
export function willNudge(notificationsEnabled: boolean, firstOwnFreeze: boolean): boolean {
  return Platform.OS !== 'web' && (notificationsEnabled || firstOwnFreeze);
}

/**
 * Asks for permission when `askPermission` (first own freeze) and notifications are still off,
 * remembers a grant in settings, then schedules the thaw notification. Resolves to the scheduled
 * notification id, or null.
 */
export async function scheduleReminder(
  item: Pick<Item, 'id' | 'name' | 'thawAt'>,
  askPermission: boolean
): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const store = useChillStore.getState();
    let enabled = store.settings.notificationsEnabled;
    if (!enabled && askPermission) {
      enabled = await ensurePermission();
      if (enabled) useChillStore.getState().updateSettings({ notificationsEnabled: true });
    }
    if (!enabled) return null;
    // thawAt is app time (maybe fast-forwarded); the OS fires on the device clock.
    const id = await scheduleItemThawNotification(item);
    // The item may have been removed while the prompt was up.
    if (id && useChillStore.getState().items.some((i) => i.id === item.id)) {
      useChillStore.getState().setNotificationId(item.id, id);
    }
    return id;
  } catch {
    return null;
  }
}
