import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { __resetClockForTests, timeOffsetMs } from '@/lib/clock';
import { DAY_MS } from '@/lib/melt';
import { useChillStore } from '@/store/useChillStore';

import { YouScreen } from '../YouScreen';

// Keep the real Reanimated (the router testing library swaps in a mock without the v4 APIs).
jest.mock('react-native-reanimated/mock', () => jest.requireActual('react-native-reanimated'));

const store = () => useChillStore.getState();

async function open() {
  const result = renderRouter(
    {
      _layout: () => <Stack screenOptions={{ headerShown: false }} />,
      index: () => <Text>home</Text>,
      you: YouScreen,
      'dev/kit': () => <Text>kit</Text>,
    },
    { initialUrl: '/you' }
  );
  await result;
  return { getPathname: () => result.getPathname() };
}

beforeEach(() => {
  store().resetAll();
  store().completeOnboarding();
  jest.clearAllMocks();
});

afterEach(() => __resetClockForTests());

describe('You', () => {
  it('shows the preferences with their current values', async () => {
    store().seedDemo();
    await open();
    expect(screen.getByText('Tune how your freezer works')).toBeTruthy();
    expect(screen.getByLabelText('Default cooldown, 3 days')).toBeTruthy();
    expect(screen.getByLabelText('Currency, USD $')).toBeTruthy();
    // The row shows the short goal name, screen readers get the full one.
    expect(screen.getByText('Lisbon')).toBeTruthy();
    expect(screen.getByLabelText('Savings goal, Weekend in Lisbon')).toBeTruthy();
    expect(screen.getByText('Chill v1 · made with care')).toBeTruthy();
  });

  it('invites a goal when there is none', async () => {
    await open();
    expect(screen.getByLabelText('Savings goal, Add one')).toBeTruthy();
  });

  it('changes the currency and default cooldown from their sheets', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('you-currency'));
    await fireEvent.press(screen.getByTestId('currency-EUR'));
    expect(store().settings.currency).toBe('EUR');

    await fireEvent.press(screen.getByTestId('you-cooldown'));
    await fireEvent.press(screen.getByText('week'));
    expect(store().settings.defaultCooldown).toBe('7d');
  });

  it('saves a savings goal', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('you-goal'));
    await fireEvent.changeText(screen.getByTestId('goal-name'), 'Trip to Japan');
    await fireEvent.changeText(screen.getByTestId('goal-amount'), '2,500');
    await fireEvent.press(screen.getByTestId('goal-save'));
    expect(store().settings.goal).toEqual({ name: 'Trip to Japan', targetCents: 250000 });
  });

  it('loads the sample freezer and fast-forwards a day', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('you-sample'));
    expect(store().items.length).toBeGreaterThan(0);
    expect(screen.getByText('Sample freezer loaded')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('you-fastforward'));
    expect(timeOffsetMs()).toBe(DAY_MS);
    // The sneakers (12h left) and the air fryer (18h left) thaw.
    expect(screen.getByText('+1 day · 2 wants thawed')).toBeTruthy();
    expect(screen.getByText('+1 day')).toBeTruthy();
  });

  it('turns thaw reminders on: asks permission, then schedules the cooling items', async () => {
    store().seedDemo();
    await open();
    await fireEvent.press(screen.getByTestId('you-reminders'));
    await waitFor(() => expect(store().settings.notificationsEnabled).toBe(true));
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
    const cooling = store().items.filter((i) => !i.decision && i.thawAt > Date.now());
    expect(cooling.length).toBeGreaterThan(0);
    for (const item of cooling) expect(item.notificationId).toBeTruthy();
  });

  it('asks before resetting everything', async () => {
    store().seedDemo();
    await open();
    await fireEvent.press(screen.getByTestId('you-reset'));
    expect(screen.getByText('Reset everything?')).toBeTruthy();

    await fireEvent.press(screen.getByText('Keep my stuff'));
    expect(store().items.length).toBeGreaterThan(0);

    await fireEvent.press(screen.getByTestId('you-reset'));
    const buttons = screen.getAllByText('Reset everything');
    await fireEvent.press(buttons[buttons.length - 1]);
    expect(store().items).toHaveLength(0);
    expect(store().settings.onboarded).toBe(false);
  });
});
