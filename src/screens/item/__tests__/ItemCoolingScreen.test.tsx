import { act, fireEvent, screen } from '@testing-library/react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { __resetClockForTests } from '@/lib/clock';
import { useChillStore } from '@/store/useChillStore';

import { ItemCoolingScreen } from '../ItemCoolingScreen';
import { promptAt } from '../useReflectionPrompt';

// expo-router/testing-library swaps Reanimated for 'react-native-reanimated/mock', which lacks
// Reanimated 4 APIs (useReducedMotion, layout animations). Keep the real module (jest.setup.ts
// already mocks the worklets runtime). babel-jest hoists this above the imports.
jest.mock('react-native-reanimated/mock', () => jest.requireActual('react-native-reanimated'));

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

/** renderRouter (which switches to fake timers), then wait for RNTL 14's async render. */
async function open(url: string): Promise<{ getPathname: () => string }> {
  const result = renderRouter(routes, { initialUrl: url });
  await result;
  // Not `return result`: it is a thenable, and an async function would unwrap it.
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

describe('Item — cooling', () => {
  it('shows the countdown, caption, details and reflection', async () => {
    await open('/item/demo-sneakers');
    expect(screen.getByText('Frozen 2 days ago')).toBeTruthy();
    expect(screen.getByTestId('item-countdown')).toHaveTextContent(/^1[12]h \d+m$/);
    expect(screen.getByText(/^83% melted · thaws /i)).toBeTruthy();
    expect(screen.getByText('Chunky sneakers')).toBeTruthy();
    expect(screen.getByText('$140')).toBeTruthy();
    expect(screen.getByText('Felt hyped')).toBeTruthy();
    expect(screen.getByText('Fashion')).toBeTruthy();
    expect(screen.getByText('Saw them in a 1am haul video.')).toBeTruthy();
    expect(screen.getByText('While it melts')).toBeTruthy();
    // The demo item has no url: no open-link button.
    expect(screen.queryByLabelText('Open the product page')).toBeNull();
  });

  it('shows the open-link button for items with a url', async () => {
    useChillStore.getState().updateItem('demo-sneakers', { url: 'nike.com/chunky' });
    await open('/item/demo-sneakers');
    expect(screen.getByLabelText('Open the product page')).toBeTruthy();
  });

  it('cycles reflection prompts', async () => {
    await open('/item/demo-sneakers');
    const item = { id: 'demo-sneakers' };
    expect(screen.getByText(promptAt(item, Date.now(), 0))).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Another question'));
    expect(screen.getByText(promptAt(item, Date.now(), 1))).toBeTruthy();
  });

  it('thaws early only after confirming, then opens the thawed decision', async () => {
    const router = await open('/item/demo-sneakers');
    await fireEvent.press(screen.getByText('Thaw it early'));
    expect(screen.getByText('Thaw it now?')).toBeTruthy();

    // "Keep it frozen" closes the dialog and changes nothing.
    await fireEvent.press(screen.getByText('Keep it frozen'));
    const before = useChillStore.getState().items.find((i) => i.id === 'demo-sneakers');
    expect(before?.thawAt).toBeGreaterThan(Date.now());
    expect(router.getPathname()).toBe('/item/demo-sneakers');

    await fireEvent.press(screen.getByText('Thaw it early'));
    await fireEvent.press(screen.getByText('Thaw now'));
    const after = useChillStore.getState().items.find((i) => i.id === 'demo-sneakers');
    expect(after?.thawAt).toBeLessThanOrEqual(Date.now());
    expect(after?.decision).toBeUndefined();
    await advance(1000);
    expect(router.getPathname()).toBe('/thawed/demo-sneakers');
  });

  it('hands over to the decision when the item thaws while open', async () => {
    const fryer = useChillStore.getState().items.find((i) => i.id === 'demo-airfryer');
    // Air fryer: 18h left. Move the app clock to 3 seconds before it thaws.
    useChillStore.getState().fastForward((fryer?.thawAt ?? 0) - Date.now() - 3000);
    const router = await open('/item/demo-airfryer');
    expect(router.getPathname()).toBe('/item/demo-airfryer');
    await advance(5000);
    expect(router.getPathname()).toBe('/thawed/demo-airfryer');
  });

  it('goes straight to the decision when opened already thawed', async () => {
    const router = await open('/item/demo-lamp');
    await advance(100);
    expect(router.getPathname()).toBe('/thawed/demo-lamp');
  });

  it('redirects home for unknown items', async () => {
    const router = await open('/item/nope');
    await advance(100);
    expect(router.getPathname()).toBe('/');
  });
});
