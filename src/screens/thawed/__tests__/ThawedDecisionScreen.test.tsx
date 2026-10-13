import { act, fireEvent, screen } from '@testing-library/react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Linking, Text } from 'react-native';

import { __resetClockForTests } from '@/lib/clock';
import { useChillStore } from '@/store/useChillStore';

import { BUY_CELEBRATION_MS, ThawedDecisionScreen } from '../ThawedDecisionScreen';

// Keep the real Reanimated (expo-router/testing-library swaps in a mock lacking Reanimated 4 APIs).
jest.mock('react-native-reanimated/mock', () => jest.requireActual('react-native-reanimated'));

function ThawedRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ThawedDecisionScreen id={String(id)} />;
}

const routes = {
  _layout: () => <Stack screenOptions={{ headerShown: false }} />,
  index: () => <Text>home</Text>,
  'thawed/[id]': ThawedRoute,
  'let-go/[id]': () => <Text>let-go</Text>,
  'item/[id]': () => <Text>item</Text>,
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

const lamp = () => useChillStore.getState().items.find((i) => i.id === 'demo-lamp');

beforeEach(() => {
  useChillStore.getState().resetAll();
  useChillStore.getState().seedDemo();
  useChillStore.getState().completeOnboarding();
});

afterEach(() => {
  __resetClockForTests();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('Thawed decision', () => {
  it('asks the question with context and the three choices', async () => {
    await open('/thawed/demo-lamp');
    expect(screen.getByText('Thawed · waited 3 days')).toBeTruthy();
    expect(screen.getByText('Still want the mushroom lamp?')).toBeTruthy();
    expect(screen.getByText(/^Felt hyped · /)).toBeTruthy();
    // The one visible context line; screen readers also hear when it was frozen and the price.
    expect(screen.getByTestId('thawed-context').props.accessibilityLabel).toMatch(
      /^Frozen 3 days ago\. Felt hyped · [a-z -]+\. \$65\.$/
    );
    expect(screen.getByText('Let it go · save $65')).toBeTruthy();
    expect(screen.getByText('Yes, I’ll buy it')).toBeTruthy();
    expect(screen.getByText('Refreeze for 3 more days')).toBeTruthy();
    expect(screen.getByText('No wrong answer. Buying is allowed.')).toBeTruthy();
  });

  it('lets it go and opens the celebration', async () => {
    const router = await open('/thawed/demo-lamp');
    await fireEvent.press(screen.getByTestId('thawed-let-go'));
    await advance(500);
    expect(lamp()?.decision).toBe('let-go');
    expect(router.getPathname()).toBe('/let-go/demo-lamp');
  });

  it('buys it: records the decision, celebrates, opens the link, then goes home', async () => {
    useChillStore.getState().updateItem('demo-lamp', { url: 'etsy.com/listing/lamp' });
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const router = await open('/thawed/demo-lamp');
    await fireEvent.press(screen.getByTestId('thawed-buy'));
    expect(lamp()?.decision).toBe('bought');
    // The screen stays up (no redirect) while the celebration plays.
    expect(screen.getByText('Enjoy it.')).toBeTruthy();
    expect(screen.getByText('You earned the certainty.')).toBeTruthy();
    expect(screen.getByText('Opening etsy.com…')).toBeTruthy();
    expect(router.getPathname()).toBe('/thawed/demo-lamp');
    await advance(BUY_CELEBRATION_MS + 100);
    expect(openURL).toHaveBeenCalledWith('https://etsy.com/listing/lamp');
    expect(router.getPathname()).toBe('/');
  });

  it('refreezes for another cooldown', async () => {
    const before = lamp();
    const router = await open('/thawed/demo-lamp');
    await fireEvent.press(screen.getByTestId('thawed-refreeze'));
    await advance(500);
    const after = lamp();
    expect(after?.decision).toBeUndefined();
    expect(after?.refreezeCount).toBe((before?.refreezeCount ?? 0) + 1);
    expect(after?.thawAt).toBeGreaterThan(Date.now());
    expect(router.getPathname()).toBe('/item/demo-lamp');
  });

  it('sends a still-cooling item to its cooling screen, and a decided one home', async () => {
    const router = await open('/thawed/demo-sneakers');
    expect(router.getPathname()).toBe('/item/demo-sneakers');
    useChillStore.getState().decide('demo-lamp', 'bought');
    const again = await open('/thawed/demo-lamp');
    expect(again.getPathname()).toBe('/');
  });
});
