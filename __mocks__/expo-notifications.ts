// Manual Jest mock for expo-notifications. Root-level __mocks__ for node_modules
// packages apply to every test automatically (no jest.mock() call needed).
// Enums are the real JS objects so code can use e.g. SchedulableTriggerInputTypes.DATE.
// Override per test: jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce(...)
export * from 'expo-notifications/build/Notifications.types';
export * from 'expo-notifications/build/NotificationPermissions.types';
export * from 'expo-notifications/build/NotificationChannelManager.types';

const subscription = () => ({ remove: jest.fn() });

const grantedPermissions = {
  status: 'granted',
  granted: true,
  canAskAgain: true,
  expires: 'never',
};

let nextId = 0;

// Scheduling
export const scheduleNotificationAsync = jest.fn(async () => `mock-notification-${++nextId}`);
export const cancelScheduledNotificationAsync = jest.fn(async () => undefined);
export const cancelAllScheduledNotificationsAsync = jest.fn(async () => undefined);
export const getAllScheduledNotificationsAsync = jest.fn(async () => []);
export const getNextTriggerDateAsync = jest.fn(async () => null);
export const dismissNotificationAsync = jest.fn(async () => undefined);
export const dismissAllNotificationsAsync = jest.fn(async () => undefined);
export const getPresentedNotificationsAsync = jest.fn(async () => []);

// Permissions
export const getPermissionsAsync = jest.fn(async () => grantedPermissions);
export const requestPermissionsAsync = jest.fn(async () => grantedPermissions);

// Handler & listeners
export const setNotificationHandler = jest.fn();
export const addNotificationReceivedListener = jest.fn(subscription);
export const addNotificationResponseReceivedListener = jest.fn(subscription);
export const addNotificationResponseClearedListener = jest.fn(subscription);
export const addNotificationsDroppedListener = jest.fn(subscription);
export const addPushTokenListener = jest.fn(subscription);
export const getLastNotificationResponseAsync = jest.fn(async () => null);
export const getLastNotificationResponse = jest.fn(() => null);
export const clearLastNotificationResponseAsync = jest.fn(async () => undefined);
export const clearLastNotificationResponse = jest.fn();
export const useLastNotificationResponse = jest.fn(() => undefined);

// Android channels & categories
export const setNotificationChannelAsync = jest.fn(async () => null);
export const getNotificationChannelsAsync = jest.fn(async () => []);
export const getNotificationChannelAsync = jest.fn(async () => null);
export const deleteNotificationChannelAsync = jest.fn(async () => undefined);
export const setNotificationCategoryAsync = jest.fn(async () => null);
export const getNotificationCategoriesAsync = jest.fn(async () => []);
export const deleteNotificationCategoryAsync = jest.fn(async () => false);

// Badge
export const getBadgeCountAsync = jest.fn(async () => 0);
export const setBadgeCountAsync = jest.fn(async () => true);

// Push (unused by Chill; present so imports don't crash)
export const getExpoPushTokenAsync = jest.fn(async () => ({
  type: 'expo',
  data: 'ExponentPushToken[mock]',
}));
export const getDevicePushTokenAsync = jest.fn(async () => ({ type: 'ios', data: 'mock' }));
