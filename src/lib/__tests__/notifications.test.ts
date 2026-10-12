import type * as NotificationsModule from 'expo-notifications';
import type * as ReactNative from 'react-native';

import type * as Lib from '../notifications';

// Uses the shared manual mock in /__mocks__/expo-notifications.ts (all jest.fn, real enums).
jest.mock('expo-notifications');

type OS = typeof ReactNative.Platform.OS;

/**
 * Fresh copies of the module under test and its mock, with Platform.OS set before import
 * (the foreground handler is configured at import time and some state is cached per module).
 * Uses resetModules rather than isolateModules: react-native's index resolves `Platform` lazily,
 * so the override must live in the registry that stays active for the rest of the test.
 */
/* eslint-disable @typescript-eslint/no-require-imports -- re-import after resetModules */
function load(os: OS = 'ios') {
  jest.resetModules();
  const { Platform } = require('react-native') as typeof ReactNative;
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
  const N = require('expo-notifications') as jest.Mocked<typeof NotificationsModule>;
  const lib = require('../notifications') as typeof Lib;
  return { lib, N };
}
/* eslint-enable @typescript-eslint/no-require-imports */

const NOW = Date.UTC(2026, 9, 12, 12, 0, 0);
const HOUR = 60 * 60 * 1000;
const item = { id: 'item-1', name: 'Air Max 90', thawAt: NOW + 72 * HOUR };

type Permissions = Awaited<ReturnType<typeof NotificationsModule.getPermissionsAsync>>;
function permissions(granted: boolean, canAskAgain = true, iosStatus?: number): Permissions {
  return {
    status: granted ? 'granted' : canAskAgain ? 'undetermined' : 'denied',
    granted,
    canAskAgain,
    expires: 'never',
    ...(iosStatus === undefined ? {} : { ios: { status: iosStatus } }),
  } as Permissions;
}

function tapResponse(data: Record<string, unknown>, identifier = 'n-1') {
  return {
    actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
    notification: { request: { identifier, content: { data } } },
  } as unknown as NotificationsModule.NotificationResponse;
}

describe('foreground handler', () => {
  it('is configured once on import, showing a banner with sound', async () => {
    const { lib, N } = load('ios');
    lib.configureNotifications();
    lib.configureNotifications();
    expect(N.setNotificationHandler).toHaveBeenCalledTimes(1);

    const handler = N.setNotificationHandler.mock.calls[0][0]!;
    await expect(handler.handleNotification({} as never)).resolves.toEqual({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    });
  });

  it('is not configured on web', () => {
    const { lib, N } = load('web');
    lib.configureNotifications();
    expect(N.setNotificationHandler).not.toHaveBeenCalled();
  });
});

describe('ensurePermission', () => {
  it('returns true when already granted, without prompting', async () => {
    const { lib, N } = load();
    await expect(lib.ensurePermission()).resolves.toBe(true);
    expect(N.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('prompts when undecided and returns the answer', async () => {
    const { lib, N } = load();
    N.getPermissionsAsync.mockResolvedValueOnce(permissions(false));
    N.requestPermissionsAsync.mockResolvedValueOnce(permissions(true));
    await expect(lib.ensurePermission()).resolves.toBe(true);
    expect(N.requestPermissionsAsync).toHaveBeenCalledWith({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });

    N.getPermissionsAsync.mockResolvedValueOnce(permissions(false));
    N.requestPermissionsAsync.mockResolvedValueOnce(permissions(false, false));
    await expect(lib.ensurePermission()).resolves.toBe(false);
  });

  it('does not prompt again after a denial', async () => {
    const { lib, N } = load();
    N.getPermissionsAsync.mockResolvedValueOnce(permissions(false, false));
    await expect(lib.ensurePermission()).resolves.toBe(false);
    expect(N.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('treats iOS provisional authorization as granted', async () => {
    const { lib, N } = load();
    N.getPermissionsAsync.mockResolvedValueOnce(
      permissions(false, true, N.IosAuthorizationStatus.PROVISIONAL)
    );
    await expect(lib.ensurePermission()).resolves.toBe(true);
    expect(N.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('creates the Android channel before asking', async () => {
    const { lib, N } = load('android');
    N.getPermissionsAsync.mockResolvedValueOnce(permissions(false));
    await lib.ensurePermission();
    expect(N.setNotificationChannelAsync).toHaveBeenCalledWith(
      lib.THAW_CHANNEL_ID,
      expect.objectContaining({ importance: N.AndroidImportance.HIGH })
    );
    expect(N.setNotificationChannelAsync.mock.invocationCallOrder[0]).toBeLessThan(
      N.requestPermissionsAsync.mock.invocationCallOrder[0]
    );
  });

  it('returns false on web and when the native call fails', async () => {
    const web = load('web');
    await expect(web.lib.ensurePermission()).resolves.toBe(false);
    expect(web.N.getPermissionsAsync).not.toHaveBeenCalled();

    const { lib, N } = load();
    N.getPermissionsAsync.mockRejectedValueOnce(new Error('boom'));
    await expect(lib.ensurePermission()).resolves.toBe(false);
  });
});

describe('scheduleThawNotification', () => {
  it('schedules a date trigger at thawAt and returns the id', async () => {
    const { lib, N } = load('ios');
    const id = await lib.scheduleThawNotification(item, NOW);
    expect(id).toMatch(/^mock-notification-\d+$/);
    expect(N.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(N.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        title: 'Your Air Max 90 has thawed 🧊',
        body: 'Still want it? Tap to decide.',
        data: { itemId: 'item-1' },
        sound: 'default',
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DATE,
        date: new Date(item.thawAt),
      },
    });
    expect(N.setNotificationChannelAsync).not.toHaveBeenCalled();
  });

  it('uses the thaw channel on Android, creating it once', async () => {
    const { lib, N } = load('android');
    await lib.scheduleThawNotification(item, NOW);
    await lib.scheduleThawNotification({ ...item, id: 'item-2' }, NOW);
    expect(N.setNotificationChannelAsync).toHaveBeenCalledTimes(1);
    expect(N.scheduleNotificationAsync.mock.calls[0][0].trigger).toEqual({
      type: N.SchedulableTriggerInputTypes.DATE,
      date: new Date(item.thawAt),
      channelId: 'thaw',
    });
  });

  it('still schedules if creating the Android channel fails, and retries it next time', async () => {
    const { lib, N } = load('android');
    N.setNotificationChannelAsync.mockRejectedValueOnce(new Error('channel'));
    await expect(lib.scheduleThawNotification(item, NOW)).resolves.toEqual(expect.any(String));
    await lib.scheduleThawNotification(item, NOW);
    expect(N.setNotificationChannelAsync).toHaveBeenCalledTimes(2);
  });

  it('returns null and does nothing when thawAt is not in the future', async () => {
    const { lib, N } = load();
    await expect(lib.scheduleThawNotification({ ...item, thawAt: NOW }, NOW)).resolves.toBeNull();
    await expect(
      lib.scheduleThawNotification({ ...item, thawAt: NOW - HOUR }, NOW)
    ).resolves.toBeNull();
    await expect(lib.scheduleThawNotification({ ...item, thawAt: NaN }, NOW)).resolves.toBeNull();
    expect(N.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('defaults `now` to the current time', async () => {
    const { lib, N } = load();
    await expect(
      lib.scheduleThawNotification({ ...item, thawAt: Date.now() - 1000 })
    ).resolves.toBeNull();
    await expect(
      lib.scheduleThawNotification({ ...item, thawAt: Date.now() + HOUR })
    ).resolves.toEqual(expect.any(String));
    expect(N.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });

  it('returns null and does nothing on web', async () => {
    const { lib, N } = load('web');
    await expect(lib.scheduleThawNotification(item, NOW)).resolves.toBeNull();
    expect(N.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('returns null when scheduling fails', async () => {
    const { lib, N } = load();
    N.scheduleNotificationAsync.mockRejectedValueOnce(new Error('denied'));
    await expect(lib.scheduleThawNotification(item, NOW)).resolves.toBeNull();
  });

  it('falls back to "item" for a blank name', async () => {
    const { lib, N } = load();
    await lib.scheduleThawNotification({ ...item, name: '   ' }, NOW);
    expect(N.scheduleNotificationAsync.mock.calls[0][0].content.title).toBe(
      'Your item has thawed 🧊'
    );
  });
});

describe('cancelNotification / cancelAllNotifications', () => {
  it('cancels by id', async () => {
    const { lib, N } = load();
    await lib.cancelNotification('mock-notification-7');
    expect(N.cancelScheduledNotificationAsync).toHaveBeenCalledWith('mock-notification-7');
    await lib.cancelAllNotifications();
    expect(N.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  });

  it('ignores missing ids and native errors', async () => {
    const { lib, N } = load();
    await lib.cancelNotification(undefined);
    await lib.cancelNotification(null);
    await lib.cancelNotification('');
    expect(N.cancelScheduledNotificationAsync).not.toHaveBeenCalled();

    N.cancelScheduledNotificationAsync.mockRejectedValueOnce(new Error('gone'));
    await expect(lib.cancelNotification('x')).resolves.toBeUndefined();
  });

  it('does nothing on web', async () => {
    const { lib, N } = load('web');
    await lib.cancelNotification('x');
    await lib.cancelAllNotifications();
    expect(N.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
    expect(N.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
  });
});

describe('subscribeToThawTaps', () => {
  it('calls back with the item id once per notification and unsubscribes', () => {
    const { lib, N } = load();
    const onTap = jest.fn();
    const unsubscribe = lib.subscribeToThawTaps(onTap);
    const listener = N.addNotificationResponseReceivedListener.mock.calls[0][0];

    listener(tapResponse({ itemId: 'item-1' }, 'n-1'));
    listener(tapResponse({ itemId: 'item-1' }, 'n-1')); // duplicate delivery
    listener(tapResponse({ itemId: 'item-2' }, 'n-2'));
    listener(tapResponse({}, 'n-3')); // not ours
    expect(onTap.mock.calls).toEqual([['item-1'], ['item-2']]);
    expect(N.clearLastNotificationResponse).toHaveBeenCalled();

    const subscription = N.addNotificationResponseReceivedListener.mock.results[0].value;
    unsubscribe();
    expect(subscription.remove).toHaveBeenCalledTimes(1);
  });

  it('handles the tap that launched the app', () => {
    const { lib, N } = load();
    N.getLastNotificationResponse.mockReturnValueOnce(tapResponse({ itemId: 'item-9' }, 'n-9'));
    const onTap = jest.fn();
    lib.subscribeToThawTaps(onTap);
    expect(onTap).toHaveBeenCalledWith('item-9');

    // The same response arriving through the listener is not handled twice.
    N.addNotificationResponseReceivedListener.mock.calls[0][0](tapResponse({ itemId: 'item-9' }, 'n-9'));
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('is a no-op on web', () => {
    const { lib, N } = load('web');
    const unsubscribe = lib.subscribeToThawTaps(jest.fn());
    expect(N.addNotificationResponseReceivedListener).not.toHaveBeenCalled();
    expect(() => unsubscribe()).not.toThrow();
  });
});
