import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';

import { DEFAULT_SETTINGS, getItemStatus, type Item } from '../../types';
import { DEMO_GOAL, isDemoItem } from '../demo';
import {
  createId,
  migrateChillState,
  STORAGE_KEY,
  STORE_VERSION,
  useChillStore,
  useHasHydrated,
  type FreezeInput,
} from '../useChillStore';

const HOUR = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 12, 12, 0, 0);

const store = () => useChillStore.getState();

const sneakers: FreezeInput = { name: 'Chunky sneakers', priceCents: 14000, category: 'fashion', mood: 'hyped' };

async function readStored(): Promise<{ state: Record<string, unknown>; version: number } | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

beforeAll(async () => {
  // Let the initial (empty) hydration finish so it can't race the tests.
  await useChillStore.persist.rehydrate();
});

beforeEach(async () => {
  store().resetAll();
  await AsyncStorage.clear();
});

describe('initial state', () => {
  it('starts empty with default settings', () => {
    expect(store().items).toEqual([]);
    expect(store().settings).toEqual({
      currency: 'USD',
      defaultCooldown: '72h',
      onboarded: false,
      notificationsEnabled: false,
    });
  });
});

describe('createId', () => {
  it('returns unique uuid-shaped ids', () => {
    const ids = new Set(Array.from({ length: 200 }, createId));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('falls back to Math.random when crypto.randomUUID is unavailable', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true, writable: true });
    try {
      expect(createId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    } finally {
      if (original) Object.defineProperty(globalThis, 'crypto', original);
      else delete (globalThis as { crypto?: unknown }).crypto;
    }
  });
});

describe('freeze', () => {
  it('creates a cooling item using the settings defaults', () => {
    const item = store().freeze(sneakers, NOW);
    expect(item).toEqual({
      id: expect.any(String),
      name: 'Chunky sneakers',
      priceCents: 14000,
      currency: 'USD',
      category: 'fashion',
      mood: 'hyped',
      frozenAt: NOW,
      firstFrozenAt: NOW,
      thawAt: NOW + 72 * HOUR,
      cooldown: '72h',
      refreezeCount: 0,
    });
    expect(store().items).toEqual([item]);
    expect(getItemStatus(item, NOW)).toBe('cooling');
  });

  it.each([
    ['24h', 24],
    ['72h', 72],
    ['7d', 168],
    ['30d', 720],
  ] as const)('computes thawAt for a %s cooldown', (cooldown, hours) => {
    const item = store().freeze({ ...sneakers, cooldown }, NOW);
    expect(item.cooldown).toBe(cooldown);
    expect(item.thawAt).toBe(NOW + hours * HOUR);
  });

  it('keeps optional fields and cleans text input', () => {
    const item = store().freeze(
      {
        name: '  Air fryer XL ',
        priceCents: 8899.6,
        currency: 'EUR',
        url: ' https://example.com/fryer ',
        imageUri: 'file:///fryer.jpg',
        category: 'home',
        mood: 'bored',
        note: '  rainy sunday  ',
        cooldown: '24h',
      },
      NOW
    );
    expect(item).toMatchObject({
      name: 'Air fryer XL',
      priceCents: 8900,
      currency: 'EUR',
      url: 'https://example.com/fryer',
      imageUri: 'file:///fryer.jpg',
      note: 'rainy sunday',
      cooldown: '24h',
      thawAt: NOW + 24 * HOUR,
    });
  });

  it('drops empty optional fields and clamps negative prices', () => {
    const item = store().freeze({ ...sneakers, mood: undefined, url: '  ', note: '', imageUri: '', priceCents: -5 }, NOW);
    expect('mood' in item).toBe(false);
    expect('url' in item).toBe(false);
    expect('note' in item).toBe(false);
    expect('imageUri' in item).toBe(false);
    expect(item.priceCents).toBe(0);
  });

  it('rounds the price and stores 0 for a non-finite price', () => {
    expect(store().freeze({ ...sneakers, priceCents: 1234.6 }, NOW).priceCents).toBe(1235);
    expect(store().freeze({ ...sneakers, priceCents: Number('abc') }, NOW).priceCents).toBe(0);
    expect(store().freeze({ ...sneakers, priceCents: Infinity }, NOW).priceCents).toBe(0);
  });

  it('follows updated settings for currency and default cooldown', () => {
    store().updateSettings({ currency: 'GBP', defaultCooldown: '7d' });
    const item = store().freeze(sneakers, NOW);
    expect(item.currency).toBe('GBP');
    expect(item.cooldown).toBe('7d');
    expect(item.thawAt).toBe(NOW + 168 * HOUR);
  });

  it('appends items with unique ids and defaults now to Date.now()', () => {
    const spy = jest.spyOn(Date, 'now').mockReturnValue(NOW + 5);
    try {
      const a = store().freeze(sneakers);
      const b = store().freeze({ ...sneakers, name: 'Second' });
      expect(a.id).not.toBe(b.id);
      expect(a.frozenAt).toBe(NOW + 5);
      expect(store().items.map((i) => i.name)).toEqual(['Chunky sneakers', 'Second']);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('refreeze', () => {
  it('starts a new cooldown on a ready item', () => {
    const item = store().freeze({ ...sneakers, cooldown: '24h' }, NOW);
    store().setNotificationId(item.id, 'n-1');
    const later = NOW + 30 * HOUR;
    const updated = store().refreeze(item.id, '7d', later);
    expect(updated).toEqual({
      ...item,
      notificationId: 'n-1',
      cooldown: '7d',
      frozenAt: later,
      thawAt: later + 168 * HOUR,
      refreezeCount: 1,
    });
    expect(store().items[0]).toEqual(updated);
    expect(getItemStatus(updated!, later)).toBe('cooling');
  });

  it('clears a previous decision and keeps the item cooldown by default', () => {
    const item = store().freeze(sneakers, NOW);
    store().decide(item.id, 'let-go', NOW + 80 * HOUR);
    const later = NOW + 100 * HOUR;
    const updated = store().refreeze(item.id, undefined, later)!;
    expect(updated.decision).toBeUndefined();
    expect(updated.decidedAt).toBeUndefined();
    expect('decision' in updated).toBe(false);
    expect('decidedAt' in updated).toBe(false);
    expect(updated.cooldown).toBe('72h');
    expect(updated.thawAt).toBe(later + 72 * HOUR);
    expect(store().refreeze(item.id, '24h', later)!.refreezeCount).toBe(2);
  });

  it('returns undefined for an unknown id', () => {
    store().freeze(sneakers, NOW);
    const before = store().items;
    expect(store().refreeze('nope', '24h', NOW)).toBeUndefined();
    expect(store().items).toBe(before);
  });

  it('preserves firstFrozenAt across refreezes', () => {
    const item = store().freeze({ ...sneakers, cooldown: '24h' }, NOW);
    const once = store().refreeze(item.id, undefined, NOW + 30 * HOUR)!;
    const twice = store().refreeze(item.id, undefined, NOW + 60 * HOUR)!;
    expect(once.firstFrozenAt).toBe(NOW);
    expect(twice.firstFrozenAt).toBe(NOW);
    expect(twice.frozenAt).toBe(NOW + 60 * HOUR);
  });

  it('backfills firstFrozenAt from frozenAt for items stored without it', () => {
    const item = store().freeze({ ...sneakers, cooldown: '24h' }, NOW);
    useChillStore.setState({ items: [{ ...item, firstFrozenAt: undefined }] });
    const updated = store().refreeze(item.id, undefined, NOW + 30 * HOUR)!;
    expect(updated.firstFrozenAt).toBe(NOW);
    expect(updated.frozenAt).toBe(NOW + 30 * HOUR);
  });
});

describe('thawEarly', () => {
  it('makes a cooling item ready now', () => {
    const item = store().freeze(sneakers, NOW);
    const now = NOW + 2 * HOUR;
    const updated = store().thawEarly(item.id, now)!;
    expect(updated.thawAt).toBe(now);
    expect(updated.frozenAt).toBe(NOW);
    expect(getItemStatus(store().items[0], now)).toBe('ready');
  });

  it('does nothing to ready, decided or unknown items', () => {
    const item = store().freeze(sneakers, NOW);
    const thawAt = item.thawAt;
    expect(store().thawEarly(item.id, thawAt + HOUR)).toBeUndefined();
    expect(store().items[0].thawAt).toBe(thawAt);

    const other = store().freeze(sneakers, NOW);
    store().decide(other.id, 'bought', NOW + HOUR);
    expect(store().thawEarly(other.id, NOW + 2 * HOUR)).toBeUndefined();
    expect(store().items[1].thawAt).toBe(other.thawAt);

    expect(store().thawEarly('nope', NOW)).toBeUndefined();
  });
});

describe('decide', () => {
  it.each(['bought', 'let-go'] as const)('records %s with decidedAt', (decision) => {
    const item = store().freeze(sneakers, NOW);
    const at = NOW + 73 * HOUR;
    const updated = store().decide(item.id, decision, at)!;
    expect(updated).toEqual({ ...item, decision, decidedAt: at });
    expect(store().items[0]).toEqual(updated);
    expect(getItemStatus(updated, at)).toBe(decision);
  });

  it('only decides undecided items', () => {
    const item = store().freeze(sneakers, NOW);
    store().decide(item.id, 'let-go', NOW + 80 * HOUR);
    expect(store().decide(item.id, 'bought', NOW + 90 * HOUR)).toBeUndefined();
    expect(store().items[0]).toMatchObject({ decision: 'let-go', decidedAt: NOW + 80 * HOUR });
    expect(store().decide('nope', 'bought', NOW)).toBeUndefined();
  });

  it('can decide an item that is still cooling', () => {
    const item = store().freeze(sneakers, NOW);
    expect(store().decide(item.id, 'let-go', NOW + HOUR)?.decision).toBe('let-go');
  });

  it('defaults decidedAt to Date.now()', () => {
    const item = store().freeze(sneakers, NOW);
    const spy = jest.spyOn(Date, 'now').mockReturnValue(NOW + 99);
    try {
      expect(store().decide(item.id, 'bought')!.decidedAt).toBe(NOW + 99);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('updateItem', () => {
  it('merges a patch into one item', () => {
    const a = store().freeze(sneakers, NOW);
    const b = store().freeze({ ...sneakers, name: 'Other' }, NOW);
    const updated = store().updateItem(a.id, { name: 'Chunkier sneakers', priceCents: 15000, note: 'size 42' })!;
    expect(updated).toEqual({ ...a, name: 'Chunkier sneakers', priceCents: 15000, note: 'size 42' });
    expect(store().items).toEqual([updated, b]);
  });

  it('removes keys patched to undefined and never changes the id', () => {
    const a = store().freeze({ ...sneakers, note: 'hi' }, NOW);
    const updated = store().updateItem(a.id, { note: undefined, id: 'hacked' } as never)!;
    expect(updated.id).toBe(a.id);
    expect('note' in updated).toBe(false);
  });

  it('recomputes thawAt from frozenAt when the cooldown of an undecided item changes', () => {
    const a = store().freeze(sneakers, NOW);
    expect(store().updateItem(a.id, { cooldown: '30d' })!.thawAt).toBe(NOW + 720 * HOUR);
    expect(store().updateItem(a.id, { cooldown: '24h', thawAt: NOW + 5 })!.thawAt).toBe(NOW + 5);
  });

  it('keeps an early-thawed item ready when the patch repeats its cooldown', () => {
    const a = store().freeze({ ...sneakers, cooldown: '72h' }, NOW);
    store().thawEarly(a.id, NOW + HOUR);
    const updated = store().updateItem(a.id, { name: 'Mushroom lamp', cooldown: '72h' })!;
    expect(updated.thawAt).toBe(NOW + HOUR);
    expect(getItemStatus(updated, NOW + 2 * HOUR)).toBe('ready');
  });

  it('ignores undefined for required fields and non-finite prices', () => {
    const a = store().freeze(sneakers, NOW);
    const updated = store().updateItem(a.id, {
      name: undefined,
      priceCents: undefined,
      currency: undefined,
      category: undefined,
      frozenAt: undefined,
      thawAt: undefined,
      cooldown: undefined,
      refreezeCount: undefined,
    })!;
    expect(updated).toEqual(a);
    expect(store().updateItem(a.id, { priceCents: NaN })!.priceCents).toBe(14000);
    expect(store().updateItem(a.id, { priceCents: 99.6 })!.priceCents).toBe(100);
    expect(store().updateItem(a.id, { priceCents: -5 })!.priceCents).toBe(0);
  });

  it('keeps thawAt of a decided item when the patch clears it', () => {
    const a = store().freeze(sneakers, NOW);
    store().decide(a.id, 'let-go', NOW + HOUR);
    const updated = store().updateItem(a.id, { thawAt: undefined, cooldown: '7d' })!;
    expect(updated.thawAt).toBe(a.thawAt);
    expect(updated.cooldown).toBe('7d');
  });

  it('does not move thawAt of a decided item', () => {
    const a = store().freeze(sneakers, NOW);
    store().decide(a.id, 'let-go', NOW + 80 * HOUR);
    expect(store().updateItem(a.id, { cooldown: '30d' })!.thawAt).toBe(a.thawAt);
  });

  it('returns undefined for an unknown id', () => {
    expect(store().updateItem('nope', { name: 'x' })).toBeUndefined();
  });
});

describe('removeItem', () => {
  it('deletes the item and returns it', () => {
    const a = store().freeze(sneakers, NOW);
    const b = store().freeze({ ...sneakers, name: 'Keep' }, NOW);
    expect(store().removeItem(a.id)).toEqual(a);
    expect(store().items).toEqual([b]);
    expect(store().removeItem(a.id)).toBeUndefined();
    expect(store().items).toEqual([b]);
  });
});

describe('setNotificationId', () => {
  it('stores and clears the notification id', () => {
    const a = store().freeze(sneakers, NOW);
    store().setNotificationId(a.id, 'mock-notification-1');
    expect(store().items[0].notificationId).toBe('mock-notification-1');
    store().setNotificationId(a.id, undefined);
    expect('notificationId' in store().items[0]).toBe(false);
    expect(() => store().setNotificationId('nope', 'x')).not.toThrow();
  });
});

describe('settings', () => {
  it('updateSettings merges a patch', () => {
    store().updateSettings({ currency: 'EUR', notificationsEnabled: true });
    expect(store().settings).toEqual({ ...DEFAULT_SETTINGS, currency: 'EUR', notificationsEnabled: true });
  });

  it('setGoal sets and removes the goal', () => {
    const goal = { name: 'New bike', targetCents: 50000 };
    store().setGoal(goal);
    expect(store().settings.goal).toEqual(goal);
    expect(store().settings.goal).not.toBe(goal);
    store().setGoal(undefined);
    expect(store().settings.goal).toBeUndefined();
    expect('goal' in store().settings).toBe(false);
  });

  it('completeOnboarding marks the user onboarded', () => {
    store().completeOnboarding();
    expect(store().settings.onboarded).toBe(true);
  });

  it('does not mutate DEFAULT_SETTINGS', () => {
    store().updateSettings({ currency: 'JPY' });
    store().completeOnboarding();
    expect(DEFAULT_SETTINGS).toEqual({
      currency: 'USD',
      defaultCooldown: '72h',
      onboarded: false,
      notificationsEnabled: false,
    });
  });
});

describe('resetAll', () => {
  it('clears items and restores default settings', () => {
    store().freeze(sneakers, NOW);
    store().updateSettings({ currency: 'EUR', notificationsEnabled: true });
    store().setGoal({ name: 'Trip', targetCents: 1000 });
    store().completeOnboarding();
    store().fastForward(24 * HOUR);
    store().resetAll();
    expect(store().items).toEqual([]);
    expect(store().settings).toEqual(DEFAULT_SETTINGS);
    expect(store().settings.timeOffsetMs).toBeUndefined();
  });
});

describe('fastForward', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('accumulates a persisted time offset', async () => {
    store().fastForward(24 * HOUR);
    store().fastForward(2 * HOUR);
    expect(store().settings.timeOffsetMs).toBe(26 * HOUR);
    const stored = await readStored();
    expect((stored!.state.settings as { timeOffsetMs?: number }).timeOffsetMs).toBe(26 * HOUR);
  });

  it('ignores zero and non-finite amounts', () => {
    const before = store().settings;
    store().fastForward(0);
    store().fastForward(NaN);
    store().fastForward(Infinity);
    expect(store().settings).toBe(before);
  });

  it('can rewind with a negative amount', () => {
    store().fastForward(5 * HOUR);
    store().fastForward(-2 * HOUR);
    expect(store().settings.timeOffsetMs).toBe(3 * HOUR);
  });

  it('shifts the default `now` of time-based actions', () => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    store().fastForward(10 * HOUR);
    const item = store().freeze({ ...sneakers, cooldown: '24h' });
    expect(item.frozenAt).toBe(NOW + 10 * HOUR);
    expect(item.thawAt).toBe(NOW + 34 * HOUR);
    store().fastForward(30 * HOUR); // past thawAt
    const decided = store().decide(item.id, 'let-go')!;
    expect(decided.decidedAt).toBe(NOW + 40 * HOUR);
    const refrozen = store().refreeze(item.id)!;
    expect(refrozen.frozenAt).toBe(NOW + 40 * HOUR);
    store().seedDemo();
    expect(store().items.find((i) => i.id === 'demo-sneakers')!.frozenAt).toBe(NOW + 40 * HOUR - 60 * HOUR);
  });
});

describe('seedDemo', () => {
  it('loads 4 cooling, 1 ready and 8 decided items plus a demo goal', () => {
    store().seedDemo(NOW);
    const { items, settings } = store();
    const count = (status: string) => items.filter((i) => getItemStatus(i, NOW) === status).length;
    expect(items).toHaveLength(13);
    expect(count('cooling')).toBe(4);
    expect(count('ready')).toBe(1);
    expect(count('let-go') + count('bought')).toBe(8);
    expect(count('let-go')).toBeGreaterThan(count('bought'));
    expect(settings.goal).toEqual(DEMO_GOAL);
    expect(items.every((i) => i.currency === 'USD')).toBe(true);
  });

  it('is idempotent and keeps the user’s own items', () => {
    const mine = store().freeze(sneakers, NOW);
    store().seedDemo(NOW);
    store().seedDemo(NOW + HOUR);
    const { items } = store();
    expect(items).toHaveLength(14);
    expect(items[0]).toEqual(mine);
    expect(items.filter(isDemoItem)).toHaveLength(13);
    expect(items.find((i) => i.id === 'demo-sneakers')!.frozenAt).toBe(NOW + HOUR - 60 * HOUR);
  });

  it('keeps an existing goal and uses the settings currency', () => {
    store().updateSettings({ currency: 'EUR' });
    store().setGoal({ name: 'Mine', targetCents: 100 });
    store().seedDemo(NOW);
    expect(store().settings.goal).toEqual({ name: 'Mine', targetCents: 100 });
    expect(store().items.every((i) => i.currency === 'EUR')).toBe(true);
  });
});

describe('persistence', () => {
  it('writes only items and settings to AsyncStorage with the store version', async () => {
    const item = store().freeze(sneakers, NOW);
    store().completeOnboarding();
    const stored = await readStored();
    expect(stored).toEqual({
      version: STORE_VERSION,
      state: { items: [item], settings: { ...DEFAULT_SETTINGS, onboarded: true } },
    });
    expect(STORE_VERSION).toBe(1);
  });

  it('rehydrates stored state and fills missing settings with defaults', async () => {
    const item: Item = {
      id: 'stored-1',
      name: 'Mushroom lamp',
      priceCents: 6500,
      currency: 'USD',
      category: 'home',
      frozenAt: NOW,
      thawAt: NOW + 72 * HOUR,
      cooldown: '72h',
      refreezeCount: 0,
    };
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, state: { items: [item], settings: { currency: 'EUR', onboarded: true } } })
    );
    await useChillStore.persist.rehydrate();
    expect(store().items).toEqual([item]);
    expect(store().settings).toEqual({ ...DEFAULT_SETTINGS, currency: 'EUR', onboarded: true });
    expect(typeof store().freeze).toBe('function');
  });

  it('keeps the current state when nothing is stored', async () => {
    const item = store().freeze(sneakers, NOW);
    await AsyncStorage.clear();
    await useChillStore.persist.rehydrate();
    expect(store().items).toEqual([item]);
  });

  it('migrates an older version and writes it back as the current version', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 0, state: { items: 'corrupt', settings: { currency: 'CAD' } } })
    );
    await useChillStore.persist.rehydrate();
    expect(store().items).toEqual([]);
    expect(store().settings).toEqual({ ...DEFAULT_SETTINGS, currency: 'CAD' });
    expect((await readStored())?.version).toBe(1);
  });
});

describe('migrateChillState', () => {
  it('normalizes missing or malformed data to defaults', () => {
    expect(migrateChillState(undefined, 0)).toEqual({ items: [], settings: DEFAULT_SETTINGS });
    expect(migrateChillState('nope', 0)).toEqual({ items: [], settings: DEFAULT_SETTINGS });
    expect(migrateChillState({ items: {}, settings: [] }, 0)).toEqual({ items: [], settings: DEFAULT_SETTINGS });
  });

  it('keeps valid data', () => {
    const settings = { ...DEFAULT_SETTINGS, onboarded: true, goal: { name: 'Trip', targetCents: 9000 } };
    const items = [{ id: 'x' }] as Item[];
    expect(migrateChillState({ items, settings }, 0)).toEqual({ items, settings });
  });
});

describe('useHasHydrated', () => {
  it('is false while stored state loads, then true', async () => {
    const { result } = await renderHook(() => useHasHydrated());
    expect(result.current).toBe(true);

    // Hold AsyncStorage.getItem open so the in-flight state is observable.
    let release: (value: string | null) => void = () => {};
    jest
      .mocked(AsyncStorage.getItem)
      .mockImplementationOnce(() => new Promise<string | null>((resolve) => (release = resolve)));

    let pending: Promise<void> | void = undefined;
    await act(() => {
      pending = useChillStore.persist.rehydrate();
    });
    expect(useChillStore.persist.hasHydrated()).toBe(false);
    expect(result.current).toBe(false);

    await act(async () => {
      release(null);
      await pending;
    });
    expect(useChillStore.persist.hasHydrated()).toBe(true);
    expect(result.current).toBe(true);
  });
});
