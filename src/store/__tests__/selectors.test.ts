import { act, renderHook } from '@testing-library/react-native';

import { DEFAULT_SETTINGS, type Item, type Settings } from '../../types';
import {
  selectBought,
  selectCooling,
  selectDecided,
  selectGoalProgress,
  selectItem,
  selectLetGo,
  selectReady,
  selectSavedCents,
} from '../selectors';
import { useChillStore } from '../useChillStore';

const HOUR = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 12, 12, 0, 0);

function makeItem(id: string, overrides: Partial<Item> = {}): Item {
  return {
    id,
    name: id,
    priceCents: 1000,
    currency: 'USD',
    category: 'other',
    frozenAt: NOW - 10 * HOUR,
    thawAt: NOW + HOUR,
    cooldown: '24h',
    refreezeCount: 0,
    ...overrides,
  };
}

// cooling: c1 (thaws in 5h), c2 (in 1h), c3 (in 30h)
// ready: r1 (thawed 1h ago), r2 (thawed 10h ago), rEdge (thawAt === NOW)
// decided: l1, l2 let go; b1 bought
const c1 = makeItem('c1', { thawAt: NOW + 5 * HOUR });
const c2 = makeItem('c2', { thawAt: NOW + HOUR });
const c3 = makeItem('c3', { thawAt: NOW + 30 * HOUR });
const r1 = makeItem('r1', { thawAt: NOW - HOUR });
const r2 = makeItem('r2', { thawAt: NOW - 10 * HOUR });
const rEdge = makeItem('rEdge', { thawAt: NOW });
const l1 = makeItem('l1', { priceCents: 14000, thawAt: NOW + 50 * HOUR, decision: 'let-go', decidedAt: NOW - 48 * HOUR });
const l2 = makeItem('l2', { priceCents: 2500, thawAt: NOW - 3 * HOUR, decision: 'let-go', decidedAt: NOW - 2 * HOUR });
const b1 = makeItem('b1', { priceCents: 9900, thawAt: NOW - 20 * HOUR, decision: 'bought', decidedAt: NOW - 5 * HOUR });

const items = [c1, l1, r1, c2, b1, rEdge, c3, r2, l2];

function state(list: Item[] = items, settings: Settings = DEFAULT_SETTINGS) {
  return { items: list, settings };
}

describe('selectCooling', () => {
  it('returns undecided items before thawAt, soonest first', () => {
    expect(selectCooling(state(), NOW)).toEqual([c2, c1, c3]);
  });

  it('excludes decided items even if their thawAt is in the future', () => {
    expect(selectCooling(state(), NOW)).not.toContain(l1);
  });

  it('defaults now to Date.now()', () => {
    const spy = jest.spyOn(Date, 'now').mockReturnValue(NOW + 2 * HOUR);
    try {
      expect(selectCooling(state())).toEqual([c1, c3]);
    } finally {
      spy.mockRestore();
    }
  });

  it('does not mutate the input array', () => {
    const list = [...items];
    selectCooling(state(list), NOW);
    expect(list).toEqual(items);
  });
});

describe('selectReady', () => {
  it('returns undecided items with now >= thawAt, longest waiting first', () => {
    expect(selectReady(state(), NOW)).toEqual([r2, r1, rEdge]);
  });

  it('treats now === thawAt as ready, not cooling', () => {
    expect(selectReady(state([rEdge]), NOW)).toEqual([rEdge]);
    expect(selectCooling(state([rEdge]), NOW)).toEqual([]);
    expect(selectCooling(state([rEdge]), NOW - 1)).toEqual([rEdge]);
  });

  it('defaults now to Date.now()', () => {
    const spy = jest.spyOn(Date, 'now').mockReturnValue(NOW + 2 * HOUR);
    try {
      expect(selectReady(state())).toEqual([r2, r1, rEdge, c2]);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('decided selectors', () => {
  it('selectDecided returns decided items, most recent decision first', () => {
    expect(selectDecided(state())).toEqual([l2, b1, l1]);
  });

  it('selectLetGo returns let-go items, most recent first', () => {
    expect(selectLetGo(state())).toEqual([l2, l1]);
  });

  it('selectBought returns bought items', () => {
    expect(selectBought(state())).toEqual([b1]);
  });

  it('return empty arrays when nothing is decided', () => {
    expect(selectDecided(state([c1]))).toEqual([]);
    expect(selectLetGo(state([c1]))).toEqual([]);
    expect(selectBought(state([c1]))).toEqual([]);
  });
});

describe('selectSavedCents', () => {
  it('sums the prices of let-go items only', () => {
    expect(selectSavedCents(state())).toBe(14000 + 2500);
    expect(selectSavedCents(state([c1, b1]))).toBe(0);
  });

  it('skips non-finite or missing prices instead of returning NaN', () => {
    const bad = makeItem('bad', { priceCents: NaN, decision: 'let-go', decidedAt: NOW });
    const { priceCents: _missing, ...noPrice } = makeItem('noPrice', { decision: 'let-go', decidedAt: NOW });
    const list = [l1, bad, noPrice as Item, l2];
    expect(selectSavedCents(state(list))).toBe(14000 + 2500);
    const progress = selectGoalProgress(state(list, { ...DEFAULT_SETTINGS, goal: { name: 'Trip', targetCents: 100000 } }));
    expect(progress).toEqual({ saved: 16500, target: 100000, pct: 16.5 });
  });
});

describe('selectGoalProgress', () => {
  const withGoal = (targetCents: number, list: Item[] = items) =>
    state(list, { ...DEFAULT_SETTINGS, goal: { name: 'Trip', targetCents } });

  it('is null without a goal or with a non-positive target', () => {
    expect(selectGoalProgress(state())).toBeNull();
    expect(selectGoalProgress(withGoal(0))).toBeNull();
    expect(selectGoalProgress(withGoal(-100))).toBeNull();
  });

  it('reports saved, target and percentage', () => {
    expect(selectGoalProgress(withGoal(66000))).toEqual({ saved: 16500, target: 66000, pct: 25 });
    expect(selectGoalProgress(withGoal(10000, [c1]))).toEqual({ saved: 0, target: 10000, pct: 0 });
  });

  it('clamps the percentage at 100', () => {
    expect(selectGoalProgress(withGoal(1000))).toEqual({ saved: 16500, target: 1000, pct: 100 });
  });

  it('returns a stable object for unchanged inputs', () => {
    const s = withGoal(66000);
    expect(selectGoalProgress(s)).toBe(selectGoalProgress({ ...s }));
  });
});

describe('selectItem', () => {
  it('finds an item by id', () => {
    expect(selectItem(state(), 'b1')).toBe(b1);
    expect(selectItem(state(), 'nope')).toBeUndefined();
  });
});

describe('reference stability', () => {
  it('returns the same array while the partition is unchanged', () => {
    const s = state();
    const first = selectCooling(s, NOW);
    expect(selectCooling(s, NOW)).toBe(first);
    expect(selectCooling(s, NOW + 30 * 60 * 1000)).toBe(first); // still c2, c1, c3
    const crossed = selectCooling(s, NOW + 2 * HOUR); // c2 thawed
    expect(crossed).not.toBe(first);
    expect(crossed).toEqual([c1, c3]);
    expect(selectCooling(s, NOW)).toBe(first); // earlier result still cached
    expect(selectReady(s, NOW)).toBe(selectReady(s, NOW + 1));
    expect(selectDecided(s)).toBe(selectDecided({ ...s }));
    expect(selectLetGo(s)).toBe(selectLetGo(s));
    expect(selectBought(s)).toBe(selectBought(s));
  });

  it('recomputes when the items array changes', () => {
    const first = selectDecided(state());
    const next = selectDecided(state([...items]));
    expect(next).not.toBe(first);
    expect(next).toEqual(first);
  });

  it('can be used directly as a zustand hook selector', async () => {
    useChillStore.setState({ items });
    const { result } = await renderHook(() => ({
      cooling: useChillStore((s) => selectCooling(s, NOW)),
      ready: useChillStore((s) => selectReady(s, NOW)),
      decided: useChillStore(selectDecided),
      goal: useChillStore(selectGoalProgress),
    }));
    expect(result.current.cooling).toEqual([c2, c1, c3]);
    expect(result.current.ready).toEqual([r2, r1, rEdge]);
    expect(result.current.decided).toEqual([l2, b1, l1]);
    expect(result.current.goal).toBeNull();

    // A store update that doesn't change the partition keeps the same references.
    const before = result.current;
    await act(() => useChillStore.getState().updateSettings({ currency: 'EUR' }));
    expect(result.current.cooling).toBe(before.cooling);
    expect(result.current.decided).toBe(before.decided);

    await act(() => useChillStore.getState().resetAll());
    expect(result.current.cooling).toEqual([]);
  });
});
