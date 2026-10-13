import { screen } from '@testing-library/react-native';
import { Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';

import { __resetClockForTests } from '@/lib/clock';
import { useChillStore } from '@/store/useChillStore';

import { InsightsScreen } from '../InsightsScreen';

// Keep the real Reanimated (the router testing library swaps in a mock without the v4 APIs).
jest.mock('react-native-reanimated/mock', () => jest.requireActual('react-native-reanimated'));

const store = () => useChillStore.getState();

async function open() {
  await renderRouter(
    { _layout: () => <Stack screenOptions={{ headerShown: false }} />, insights: InsightsScreen },
    { initialUrl: '/insights' }
  );
}

beforeEach(() => {
  store().resetAll();
  store().completeOnboarding();
});

afterEach(() => __resetClockForTests());

describe('Insights', () => {
  it('shows every card for the sample freezer', async () => {
    store().seedDemo();
    await open();
    expect(screen.getByText('Insights')).toBeTruthy();
    expect(screen.getByText('You let go of 6 of 8 wants')).toBeTruthy();
    expect(screen.getByText('That’s $934 you didn’t spend.')).toBeTruthy();
    expect(screen.getByTestId('insights-donut')).toBeTruthy();
    expect(screen.getByText('When impulses strike')).toBeTruthy();
    expect(screen.getByText(/^Your peak: \w+day around 11 PM$/)).toBeTruthy();
    expect(screen.getByText('11 PM')).toBeTruthy();
    expect(screen.getByText('What you were feeling')).toBeTruthy();
    expect(screen.getByTestId('mood-hyped')).toBeTruthy();
    expect(screen.getByText('By category')).toBeTruthy();
    expect(screen.getByText('3 let-gos in a row')).toBeTruthy();
    expect(screen.queryByTestId('insights-empty')).toBeNull();
  });

  it('shows the half-melted empty state until there are two decisions', async () => {
    store().seedDemo();
    const decided = store().items.filter((i) => i.decision);
    for (const item of decided.slice(1)) store().removeItem(item.id);
    await open();
    expect(screen.getByTestId('insights-empty')).toBeTruthy();
    expect(screen.getByText('Insights appear after a few decisions.')).toBeTruthy();
    expect(screen.getByText('1 of 2 decisions')).toBeTruthy();
    expect(screen.queryByTestId('insights-hero')).toBeNull();
  });
});
