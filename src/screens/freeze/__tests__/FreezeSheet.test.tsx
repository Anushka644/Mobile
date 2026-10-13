import { act, fireEvent, screen } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { Stack, useLocalSearchParams } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { __resetClockForTests } from '@/lib/clock';
import { readClipboardSuggestion, type ClipboardSuggestion } from '@/lib/clipboard';
import { useChillStore } from '@/store/useChillStore';

import { FreezeSheet } from '../FreezeSheet';
import { FREEZING_MOMENT_MS } from '../FreezingMoment';
import { pickPhoto } from '../pickPhoto';

// Keep the real Reanimated 4 (see ItemCoolingScreen.test.tsx).
jest.mock('react-native-reanimated/mock', () => jest.requireActual('react-native-reanimated'));
jest.mock('@/lib/clipboard', () => ({
  ...jest.requireActual('@/lib/clipboard'),
  readClipboardSuggestion: jest.fn(),
}));
jest.mock('../pickPhoto', () => ({ pickPhoto: jest.fn() }));

const readClipboard = jest.mocked(readClipboardSuggestion);
const pick = jest.mocked(pickPhoto);

function ItemRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Text>{`item ${String(id)}`}</Text>;
}

const routes = {
  _layout: () => <Stack screenOptions={{ headerShown: false }} />,
  index: () => <Text>home</Text>,
  freeze: FreezeSheet,
  'item/[id]': ItemRoute,
};

async function open(): Promise<{ getPathname: () => string }> {
  const result = renderRouter(routes, { initialUrl: '/freeze' });
  await result;
  // Let the clipboard read settle.
  await advance(300);
  return { getPathname: () => result.getPathname() };
}

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

async function type(testID: string, text: string) {
  await fireEvent.changeText(screen.getByTestId(testID), text);
}

function submitDisabled(): boolean {
  return screen.getByTestId('freeze-submit').props.accessibilityState?.disabled === true;
}

beforeEach(() => {
  useChillStore.getState().resetAll();
  useChillStore.getState().completeOnboarding();
  readClipboard.mockResolvedValue(null);
  pick.mockResolvedValue(null);
  jest.mocked(Notifications.scheduleNotificationAsync).mockClear();
  jest.mocked(Notifications.requestPermissionsAsync).mockClear();
});

afterEach(() => {
  __resetClockForTests();
  jest.useRealTimers();
});

describe('Freeze sheet', () => {
  it('needs a name and a valid price before it can freeze', async () => {
    await open();
    expect(screen.getByText('Freeze it')).toBeTruthy();
    expect(submitDisabled()).toBe(true);

    await type('freeze-name', 'Chunky sneakers');
    expect(submitDisabled()).toBe(true);
    await type('freeze-price', '0');
    expect(submitDisabled()).toBe(true);
    await fireEvent(screen.getByTestId('freeze-price'), 'blur');
    expect(screen.getByText('Add a price above zero')).toBeTruthy();

    await type('freeze-price', '$140');
    expect(screen.getByTestId('freeze-price').props.value).toBe('140');
    expect(submitDisabled()).toBe(false);

    // An optional link must still be a link.
    await type('freeze-link', 'not a link');
    expect(submitDisabled()).toBe(true);
    await fireEvent(screen.getByTestId('freeze-link'), 'blur');
    expect(screen.getByText('That link doesn’t look right')).toBeTruthy();
    await type('freeze-link', 'nike.com/t/chunky-sneakers');
    expect(submitDisabled()).toBe(false);
  });

  it('guesses the category from the name and lets you change it', async () => {
    await open();
    expect(screen.queryByText('Guessed for you')).toBeNull();
    await type('freeze-name', 'Noise-cancelling headphones');
    expect(screen.getByText('Guessed for you')).toBeTruthy();
    expect(screen.getByTestId('category-tech').props.accessibilityState?.selected).toBe(true);

    await fireEvent.press(screen.getByTestId('category-fun'));
    expect(screen.getByTestId('category-fun').props.accessibilityState?.selected).toBe(true);
    expect(screen.queryByText('Guessed for you')).toBeNull();
  });

  it('starts on the default cooldown from settings', async () => {
    useChillStore.getState().updateSettings({ defaultCooldown: '7d' });
    await open();
    expect(screen.getByText('Freeze it for 1 week')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('freeze-cooldown-24h'));
    expect(screen.getByText('Freeze it for 24 hours')).toBeTruthy();
  });

  it('offers a copied link and pastes it into the form', async () => {
    const suggestion: ClipboardSuggestion = {
      url: 'https://www.nike.com/t/chunky-sneakers',
      name: 'Chunky Sneakers',
      priceCents: 14000,
    };
    readClipboard.mockResolvedValue(suggestion);
    await open();
    expect(screen.getByText('Paste from clipboard?')).toBeTruthy();
    expect(screen.getByText('nike.com/t/chunky-sneakers')).toBeTruthy();
    expect(screen.queryByTestId('freeze-link')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Paste'));
    await advance(400);
    expect(screen.getByTestId('freeze-name').props.value).toBe('Chunky Sneakers');
    expect(screen.getByTestId('freeze-price').props.value).toBe('140');
    expect(screen.getByTestId('freeze-link').props.value).toBe(suggestion.url);
    expect(screen.queryByText('Paste from clipboard?')).toBeNull();
    expect(submitDisabled()).toBe(false);
  });

  it('never overwrites what you already typed when pasting', async () => {
    readClipboard.mockResolvedValue({ url: 'https://ikea.com/p/lamp', name: 'Lamp', priceCents: 3999 });
    await open();
    await type('freeze-name', 'Mushroom lamp');
    await type('freeze-price', '65');
    await fireEvent.press(screen.getByLabelText('Paste'));
    expect(screen.getByTestId('freeze-name').props.value).toBe('Mushroom lamp');
    expect(screen.getByTestId('freeze-price').props.value).toBe('65');
  });

  it('keeps a typed link when the clipboard answers late', async () => {
    let answer: (s: ClipboardSuggestion | null) => void = () => {};
    readClipboard.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    await open();
    expect(screen.getByTestId('freeze-link')).toBeTruthy();
    await type('freeze-link', 'ikea.com/p/lamp');
    await act(async () => answer({ url: 'https://www.nike.com/t/chunky-sneakers', name: 'Chunky Sneakers' }));
    await advance(400);
    expect(screen.queryByText('Paste from clipboard?')).toBeNull();
    expect(screen.getByTestId('freeze-link').props.value).toBe('ikea.com/p/lamp');
  });

  it('hides the suggestion for a link that is already in the freezer', async () => {
    useChillStore.getState().freeze({
      name: 'Lamp',
      priceCents: 3999,
      url: 'https://ikea.com/p/lamp',
      category: 'home',
      cooldown: '72h',
    });
    readClipboard.mockResolvedValue({ url: 'https://ikea.com/p/lamp', name: 'Lamp' });
    await open();
    expect(screen.queryByText('Paste from clipboard?')).toBeNull();
    expect(screen.getByTestId('freeze-link')).toBeTruthy();
  });

  it('adds a photo from the picker', async () => {
    pick.mockResolvedValue('file:///photo.jpg');
    await open();
    await fireEvent.press(screen.getByTestId('photo-tile'));
    await advance(0);
    expect(pick).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Change photo')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('photo-remove'));
    expect(screen.getByLabelText('Add photo')).toBeTruthy();
  });

  it('freezes, plays the freezing moment, sets the reminder and opens the item', async () => {
    pick.mockResolvedValue('file:///sneakers.jpg');
    const router = await open();
    await type('freeze-name', '  Chunky sneakers ');
    await type('freeze-price', '140');
    await type('freeze-link', 'nike.com/t/chunky-sneakers');
    await fireEvent.press(screen.getByTestId('mood-hyped'));
    await fireEvent.press(screen.getByTestId('photo-tile'));
    await advance(0);
    await fireEvent.press(screen.getByTestId('freeze-submit'));

    const items = useChillStore.getState().items;
    expect(items).toHaveLength(1);
    const item = items[0];
    expect(item).toMatchObject({
      name: 'Chunky sneakers',
      priceCents: 14000,
      url: 'https://nike.com/t/chunky-sneakers',
      imageUri: 'file:///sneakers.jpg',
      category: 'fashion',
      mood: 'hyped',
      cooldown: '72h',
    });

    expect(screen.getByTestId('freezing-moment')).toBeTruthy();
    expect(screen.getByText('Frozen solid.')).toBeTruthy();
    expect(screen.getByText('See you in 3 days. We’ll nudge you.')).toBeTruthy();
    // The overlay is modal for screen readers; a second tap on the CTA underneath does nothing.
    await fireEvent.press(screen.getByTestId('freeze-submit', { includeHiddenElements: true }));
    expect(useChillStore.getState().items).toHaveLength(1);
    expect(router.getPathname()).toBe('/freeze');

    await advance(FREEZING_MOMENT_MS + 50);
    await advance(0);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(useChillStore.getState().settings.notificationsEnabled).toBe(true);
    expect(useChillStore.getState().items[0].notificationId).toMatch(/^mock-notification-/);
    expect(router.getPathname()).toBe(`/item/${item.id}`);
    expect(screen.getByText(`item ${item.id}`)).toBeTruthy();
  });

  it('does not ask again or schedule when notifications are off after the first freeze', async () => {
    useChillStore.getState().freeze({ name: 'Lamp', priceCents: 3999, category: 'home', cooldown: '72h' });
    const router = await open();
    await type('freeze-name', 'Desk fan');
    await type('freeze-price', '30');
    await fireEvent.press(screen.getByTestId('freeze-submit'));
    expect(screen.getByText('See you in 3 days.')).toBeTruthy();
    await advance(FREEZING_MOMENT_MS + 50);
    await advance(0);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(router.getPathname()).toMatch(/^\/item\//);
  });
});
