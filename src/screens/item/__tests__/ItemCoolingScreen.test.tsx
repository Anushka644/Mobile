// expo-router/testing-library swaps Reanimated for 'react-native-reanimated/mock', which lacks
// Reanimated 4 APIs (useReducedMotion, layout animations). Keep the real module (jest.setup.ts
// already mocks the worklets runtime).
jest.mock('react-native-reanimated/mock', () => jest.requireActual('react-native-reanimated'));

import { Stack, useLocalSearchParams } from 'expo-router';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { __resetClockForTests } from '@/lib/clock';
import { useChillStore } from '@/store/useChillStore';

import { ItemCoolingScreen } from '../ItemCoolingScreen';
import { promptAt } from '../useReflectionPrompt';

function ItemRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ItemCoolingScreen id={String(id)} />;
}

const routes = {
  _layout: () => <Stack screenOptions={{ headerShown: false }} />,
  index: () => <Text>home</Text>,
  'item/[id]': ItemRoute,
  'thawed/[id]': () => <Text>thawed</Text>,
};

beforeEach(() => {
  useChillStore.getState().resetAll();
  useChillStore.getState().seedDemo();
  useChillStore.getState().completeOnboarding();
});

afterEach(() => __resetClockForTests());

describe('Item — cooling', () => {
  it('shows the countdown, caption, details and reflection', () => {
    renderRouter(routes, { initialUrl: '/item/demo-sneakers' });
    expect(screen.getByText('Frozen 2 days ago')).toBeTruthy();
    expect(screen.getByTestId('item-countdown')).toHaveTextContent(/^1[12]h \d+m$/);
    expect(screen.getByText(/^83% melted · thaws /i)).toBeTruthy();
    expect(screen.getByText('Chunky sneakers')).toBeTruthy();
    expect(screen.getByText('$140')).toBeTruthy();
    expect(screen.getByText('Felt hyped')).toBeTruthy();
    expect(screen.getByText('Fashion')).toBeTruthy();
    expect(screen.getByText('Saw them in a 1am haul video.')).toBeTruthy();
    expect(screen.getByText('While it melts')).toBeTruthy();
    // No url on the demo item: no open-link button.
    expect(screen.queryByLabelText('Open the product page')).toBeNull();
  });

  it('cycles reflection prompts', () => {
    renderRouter(routes, { initialUrl: '/item/demo-sneakers' });
    const item = { id: 'demo-sneakers' };
    expect(screen.getByText(promptAt(item, Date.now(), 0))).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Another question'));
    expect(screen.getByText(promptAt(item, Date.now(), 1))).toBeTruthy();
  });

  it('thaws early after confirming, then opens the thawed decision', async () => {
    const router = renderRouter(routes, { initialUrl: '/item/demo-sneakers' });
    fireEvent.press(screen.getByText('Thaw it early'));
    expect(screen.getByText('Thaw it now?')).toBeTruthy();

    // "Keep it frozen" closes the dialog and changes nothing.
    fireEvent.press(screen.getByText('Keep it frozen'));
    const before = useChillStore.getState().items.find((i) => i.id === 'demo-sneakers');
    expect(before?.thawAt).toBeGreaterThan(Date.now());

    fireEvent.press(screen.getByText('Thaw it early'));
    fireEvent.press(screen.getByText('Thaw now'));
    const after = useChillStore.getState().items.find((i) => i.id === 'demo-sneakers');
    expect(after?.thawAt).toBeLessThanOrEqual(Date.now());
    await waitFor(() => expect(router.getPathname()).toBe('/thawed/demo-sneakers'), { timeout: 3000 });
  });

  it('goes straight to the decision when the item is already thawed', async () => {
    const router = renderRouter(routes, { initialUrl: '/item/demo-lamp' });
    await waitFor(() => expect(router.getPathname()).toBe('/thawed/demo-lamp'));
  });

  it('redirects home for unknown or decided items', async () => {
    const router = renderRouter(routes, { initialUrl: '/item/nope' });
    await waitFor(() => expect(router.getPathname()).toBe('/'));
  });
});
