// Global Jest setup (runs after the test framework is installed).
// (react-native-gesture-handler/jestSetup.js runs earlier via `setupFiles`.)

// AsyncStorage: in-memory mock shipped by the package.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Safe area: fixed 320x640 frame with zero insets so SafeAreaProvider renders children.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default
);

// expo-notifications is mocked automatically by __mocks__/expo-notifications.ts
// (root-level __mocks__ apply to node_modules packages without jest.mock()).
// Override per test, e.g.
//   jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce(...)

// Reanimated 4: the worklets native module doesn't exist in Jest, so use its JS mock,
// then install Reanimated's test helpers (custom matchers, timers integration).
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
require('react-native-reanimated').setUpTests();
