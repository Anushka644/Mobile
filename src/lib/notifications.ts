// Local "your item has thawed" notifications, wrapped around expo-notifications.
// Safe to import on web: every call checks Platform.OS first and no-ops there
// (expo-notifications has no local scheduling on web).

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Item } from '@/types';

/** Android notification channel for thaw reminders (Android 8+ needs one before scheduling). */
export const THAW_CHANNEL_ID = 'thaw';

export const THAW_NOTIFICATION_BODY = 'Still want it? Tap to decide.';

export function thawNotificationTitle(name: string): string {
  return `Your ${name.trim() || 'item'} has thawed 🧊`;
}

/** Data attached to every thaw notification. */
export interface ThawNotificationData extends Record<string, unknown> {
  itemId: string;
}

function isSupported(): boolean {
  return Platform.OS !== 'web';
}

let handlerConfigured = false;

/**
 * Show thaw notifications as a banner with sound while the app is in the foreground.
 * Idempotent; runs on import, and is exported so the root layout can call it explicitly.
 */
export function configureNotifications(): void {
  if (handlerConfigured || !isSupported()) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerConfigured = true;
  } catch {
    // Native module unavailable (e.g. a stripped-down client): leave notifications off.
  }
}

configureNotifications();

let channelReady: Promise<void> | null = null;

/** Create the Android channel once. Must exist before the Android 13+ permission prompt can show. */
function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();
  channelReady ??= Notifications.setNotificationChannelAsync(THAW_CHANNEL_ID, {
    name: 'Thaw reminders',
    description: 'Tells you when a frozen item is ready to decide on.',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#4FA9E6',
    vibrationPattern: [0, 180, 120, 180],
  }).then(
    () => undefined,
    () => {
      channelReady = null; // retry next time
    }
  );
  return channelReady;
}

function isGranted(permissions: Notifications.NotificationPermissionsStatus): boolean {
  return (
    permissions.granted ||
    permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    permissions.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}

/**
 * True when thaw notifications may be shown, asking the user if they haven't decided yet.
 * Never asks again after a denial (the OS wouldn't show the prompt); returns false on web.
 */
export async function ensurePermission(): Promise<boolean> {
  if (!isSupported()) return false;
  try {
    configureNotifications();
    await ensureAndroidChannel();
    const current = await Notifications.getPermissionsAsync();
    if (isGranted(current)) return true;
    if (!current.canAskAgain) return false;
    const requested = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    return isGranted(requested);
  } catch {
    return false;
  }
}

/**
 * Schedule the "has thawed" notification for `item.thawAt`.
 * Returns the notification id (store it on the item to cancel later), or null on web,
 * when thawAt is not in the future, or if scheduling fails. Doesn't prompt for permission:
 * call ensurePermission() first when the user turns notifications on.
 */
export async function scheduleThawNotification(
  item: Pick<Item, 'id' | 'name' | 'thawAt'>,
  now: number = Date.now()
): Promise<string | null> {
  if (!isSupported() || !Number.isFinite(item.thawAt) || item.thawAt <= now) return null;
  try {
    configureNotifications();
    await ensureAndroidChannel();
    const data: ThawNotificationData = { itemId: item.id };
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: thawNotificationTitle(item.name),
        body: THAW_NOTIFICATION_BODY,
        data,
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(item.thawAt),
        ...(Platform.OS === 'android' ? { channelId: THAW_CHANNEL_ID } : {}),
      },
    });
  } catch {
    return null;
  }
}

/** Cancel a scheduled notification. No-op for a missing id or on web; never throws. */
export async function cancelNotification(id: string | null | undefined): Promise<void> {
  if (!id || !isSupported()) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Already delivered or unknown id: nothing to cancel.
  }
}

/** Cancel every scheduled notification (e.g. when the user wipes their data). Never throws. */
export async function cancelAllNotifications(): Promise<void> {
  if (!isSupported()) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}

function itemIdFromResponse(response: Notifications.NotificationResponse | null | undefined): {
  itemId: string;
  key: string;
} | null {
  const request = response?.notification?.request;
  const itemId = request?.content?.data?.itemId;
  if (!request || typeof itemId !== 'string' || itemId.length === 0) return null;
  return { itemId, key: request.identifier };
}

/**
 * Call `onTap(itemId)` when the user taps a thaw notification, including the tap that launched
 * the app from a killed state. Each notification is handled once. Returns an unsubscribe function.
 * No-op on web.
 */
export function subscribeToThawTaps(onTap: (itemId: string) => void): () => void {
  if (!isSupported()) return () => {};
  const handled = new Set<string>();
  const handle = (response: Notifications.NotificationResponse | null | undefined) => {
    const hit = itemIdFromResponse(response);
    if (!hit || handled.has(hit.key)) return;
    handled.add(hit.key);
    try {
      Notifications.clearLastNotificationResponse();
    } catch {
      // ignore: only prevents re-handling the launch tap after a remount
    }
    onTap(hit.itemId);
  };

  let subscription: { remove: () => void } | null = null;
  try {
    subscription = Notifications.addNotificationResponseReceivedListener(handle);
    handle(Notifications.getLastNotificationResponse());
  } catch {
    // Native module unavailable.
  }
  return () => subscription?.remove();
}
