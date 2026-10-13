import { act, fireEvent, screen } from '@testing-library/react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { __resetClockForTests } from '@/lib/clock';
import { useChillStore } from '@/store/useChillStore';

import { LetGoScreen } from '../../letgo/LetGoScreen';
import { SavedScreen } from '../SavedScreen';

jest.mock('react-native-reanimated/mock', () => jest.requireActual('react-native-reanimated'));

function LetGoRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <LetGoScreen id={String(id)} />;
}

const routes = {
  _layout: () => <Stack screenOptions={{ headerShown: false }} />,
  index: () => <Text>home</Text>,
  saved: SavedScreen,
  'let-go/[id]': LetGoRoute,
};

async function open(url: string): Promise<{ getPathname: () => string }> {
  const result = renderRouter(routes, { initialUrl: url });
  await result;
  return { getPathname: () => result.getPathname() };
}

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  useChillStore.getState().resetAll();
  useChillStore.getState().seedDemo();
  useChillStore.getState().completeOnboarding();
});

afterEach(() => {
  __resetClockForTests();
  jest.useRealTimers();
});

describe('Saved', () => {
  it('shows the total, the goal and the melted-away history newest first', async () => {
    await open('/saved');
    await advance(1500);
    expect(screen.getByTestId('saved-total')).toHaveTextContent('$934');
    expect(screen.getByText('6 wants let go')).toBeTruthy();
    expect(screen.getByText('Weekend in Lisbon')).toBeTruthy();
    expect(screen.getByText('78%')).toBeTruthy();
    expect(screen.getByText('$934 of $1,200')).toBeTruthy();
    const rows = screen.getAllByTestId(/^melted-/).map((r) => r.props.testID);
    expect(rows).toEqual([
      'melted-demo-scarf',
      'melted-demo-chair',
      'melted-demo-tee',
      'melted-demo-skincare',
      'melted-demo-espresso',
      'melted-demo-watch',
    ]);
    expect(screen.getByText('+$95')).toBeTruthy();
  });

  it('keeps "You bought" collapsed until asked', async () => {
    await open('/saved');
    expect(screen.queryByTestId('bought-demo-lego')).toBeNull();
    await fireEvent.press(screen.getByTestId('saved-bought-toggle'));
    expect(screen.getByTestId('bought-demo-lego')).toBeTruthy();
    expect(screen.getByText('$49')).toBeTruthy();
  });

  it('edits the goal from its card', async () => {
    await open('/saved');
    await fireEvent.press(screen.getByTestId('saved-goal'));
    await fireEvent.changeText(screen.getByTestId('goal-name'), 'Tokyo trip');
    await fireEvent.changeText(screen.getByTestId('goal-amount'), '2500');
    await fireEvent.press(screen.getByTestId('goal-save'));
    expect(useChillStore.getState().settings.goal).toEqual({ name: 'Tokyo trip', targetCents: 250000 });
    await advance(600);
    expect(screen.getByText('Tokyo trip')).toBeTruthy();
    expect(screen.getByText('37%')).toBeTruthy();
  });

  it('offers to add a goal when there is none, and shows an empty history', async () => {
    useChillStore.getState().setGoal(undefined);
    useChillStore.setState({ items: [] });
    await open('/saved');
    expect(screen.getByTestId('saved-add-goal')).toBeTruthy();
    expect(screen.getByText('Nothing has melted yet')).toBeTruthy();
    expect(screen.queryByTestId('saved-bought')).toBeNull();
  });
});

describe('Let-go celebration', () => {
  // React Native's Jest preset runs requestAnimationFrame callbacks after 0ms with a frozen
  // timestamp, so a count-up never advances; give frames a real 16ms cadence under fake timers.
  const realRaf = globalThis.requestAnimationFrame;
  beforeEach(() => {
    globalThis.requestAnimationFrame = (cb: FrameRequestCallback) =>
      setTimeout(() => cb(jest.now()), 16) as unknown as number;
  });
  afterEach(() => {
    globalThis.requestAnimationFrame = realRaf;
  });

  it('counts up the amount and lands on the new total and goal progress', async () => {
    await open('/let-go/demo-scarf');
    expect(screen.getByText('You let go of the cashmere scarf')).toBeTruthy();
    expect(screen.getByText('Let go. Nice.')).toBeTruthy();
    // Before the coins land, the card shows the total without this let-go.
    expect(screen.getByText('$839 saved so far')).toBeTruthy();
    // Step the clock so effects scheduled by each phase change get to run in between.
    for (let i = 0; i < 25; i++) await advance(200);
    expect(screen.getByTestId('let-go-amount')).toHaveTextContent('+$95');
    expect(screen.getByText('$934 saved so far')).toBeTruthy();
    expect(screen.getByText('78%')).toBeTruthy();
    expect(screen.getByText('Weekend in Lisbon · $266 to go')).toBeTruthy();
  });

  it('redirects when the item was not let go', async () => {
    const router = await open('/let-go/demo-sneakers');
    expect(router.getPathname()).toBe('/');
  });
});
