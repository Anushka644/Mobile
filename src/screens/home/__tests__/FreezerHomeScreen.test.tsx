import { act, fireEvent, screen } from '@testing-library/react-native';
import { Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { __resetClockForTests } from '@/lib/clock';
import { HOUR_MS } from '@/lib/melt';
import { useChillStore } from '@/store/useChillStore';

import { FreezerHomeScreen } from '../FreezerHomeScreen';
import { ARRIVAL_HOLD_MS } from '../useThawArrivals';

// expo-router/testing-library swaps Reanimated for 'react-native-reanimated/mock', which lacks
// Reanimated 4 APIs (layout animations, LayoutAnimationConfig). Keep the real module (jest.setup.ts
// already mocks the worklets runtime). babel-jest hoists this above the imports.
jest.mock('react-native-reanimated/mock', () => jest.requireActual('react-native-reanimated'));

const routes = {
  _layout: () => <Stack screenOptions={{ headerShown: false }} />,
  index: FreezerHomeScreen,
  you: () => <Text>you</Text>,
  freeze: () => <Text>freeze</Text>,
  saved: () => <Text>saved</Text>,
  'item/[id]': () => <Text>item</Text>,
  'thawed/[id]': () => <Text>thawed</Text>,
};

async function open(): Promise<{ getPathname: () => string }> {
  const result = renderRouter(routes, { initialUrl: '/' });
  await result;
  // Not `return result`: it is a thenable, and an async function would unwrap it.
  return { getPathname: () => result.getPathname() };
}

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

const store = () => useChillStore.getState();

beforeEach(() => {
  store().resetAll();
  store().completeOnboarding();
});

afterEach(() => {
  __resetClockForTests();
  jest.useRealTimers();
});

describe('Freezer home', () => {
  it('shows the header, saved banner, ready section and cooling grid (soonest first)', async () => {
    store().seedDemo();
    await open();
    expect(screen.getByText('Your freezer')).toBeTruthy();
    expect(screen.getByText('4 wants cooling · 1 ready to decide')).toBeTruthy();
    expect(screen.getByText('$934 saved')).toBeTruthy();
    expect(screen.getByText('Ready to decide')).toBeTruthy();
    expect(screen.getByTestId('ready-demo-lamp')).toBeTruthy();
    expect(screen.getByText('Soonest first')).toBeTruthy();
    const cards = screen.getAllByTestId(/^card-/).map((c) => c.props.testID);
    expect(cards).toEqual(['card-demo-sneakers', 'card-demo-airfryer', 'card-demo-headphones', 'card-demo-jacket']);
  });

  it('opens notification settings from the bell', async () => {
    store().seedDemo();
    const router = await open();
    await fireEvent.press(screen.getByLabelText('Notification settings'));
    expect(router.getPathname()).toBe('/you');
  });

  it('shows the empty state and opens the freeze sheet', async () => {
    const router = await open();
    expect(screen.getByText('Nothing on ice yet')).toBeTruthy();
    expect(screen.getByText('Your freezer is empty')).toBeTruthy();
    expect(screen.queryByText('Cooling')).toBeNull();
    await fireEvent.press(screen.getByText('Freeze something'));
    expect(router.getPathname()).toBe('/freeze');
  });

  it('lets a thawed card linger in the grid, then moves it to Ready', async () => {
    store().seedDemo();
    const sneakers = store().items.find((i) => i.id === 'demo-sneakers');
    // 2 seconds before the sneakers thaw (inside the last hour, so Home ticks every second).
    store().fastForward((sneakers?.thawAt ?? 0) - Date.now() - 2000);
    await open();
    expect(screen.getByTestId('card-demo-sneakers')).toBeTruthy();
    expect(screen.queryByTestId('ready-demo-sneakers')).toBeNull();

    await advance(3000);
    // Thawed on screen: still in the grid, now as a Ready card; the counts update right away.
    expect(screen.getByTestId('card-demo-sneakers')).toBeTruthy();
    expect(screen.getByText('3 wants cooling · 2 ready to decide')).toBeTruthy();
    expect(screen.queryByTestId('ready-demo-sneakers')).toBeNull();

    await advance(ARRIVAL_HOLD_MS + 100);
    expect(screen.getByTestId('ready-demo-sneakers')).toBeTruthy();
    expect(screen.queryByTestId('card-demo-sneakers')).toBeNull();
  });

  it('collapses more than 3 ready items behind "+N more"', async () => {
    store().seedDemo();
    store().fastForward(100 * HOUR_MS); // sneakers, air fryer, headphones and lamp are ready
    await open();
    expect(screen.getAllByTestId(/^ready-/)).toHaveLength(3);
    await fireEvent.press(screen.getByText('+1 more'));
    expect(screen.getAllByTestId(/^ready-/)).toHaveLength(4);
    await fireEvent.press(screen.getByText('Show less'));
    expect(screen.getAllByTestId(/^ready-/)).toHaveLength(3);
  });
});
