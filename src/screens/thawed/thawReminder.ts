// Thaw-notification bookkeeping for the decision actions (spec §4.5). The store leaves
// `notificationId` alone on decide / refreeze, so the screen cancels the old reminder and, after a
// refreeze, schedules the next one. Never throws; a no-op on web.

import { Platform } from 'react-native';

import { now } from '@/lib/clock';
import { cancelNotification, scheduleThawNotification } from '@/lib/notifications';
import { useChillStore } from '@/store/useChillStore';
import type { Item } from '@/types';

/** Cancels the item's pending thaw notification (if any) and forgets its id. */
export function clearThawReminder(item: Pick<Item, 'id' | 'notificationId'>): void {
  if (!item.notificationId) return;
  void cancelNotification(item.notificationId);
  useChillStore.getState().setNotificationId(item.id, undefined);
}

/**
 * After a refreeze: cancels the previous reminder and, when notifications are on, schedules one for
 * the new thaw time and stores its id. Resolves to the new id, or null.
 */
export async function rescheduleThawReminder(item: Pick<Item, 'id' | 'name' | 'thawAt' | 'notificationId'>) {
  clearThawReminder(item);
  if (Platform.OS === 'web' || !useChillStore.getState().settings.notificationsEnabled) return null;
  try {
    const id = await scheduleThawNotification(item, now());
    const current = useChillStore.getState().items.find((i) => i.id === item.id);
    // Still the same cooldown (not decided or refrozen again while scheduling)?
    if (id && current && !current.decision && current.thawAt === item.thawAt) {
      useChillStore.getState().setNotificationId(item.id, id);
      return id;
    }
    if (id) void cancelNotification(id);
    return null;
  } catch {
    return null;
  }
}
