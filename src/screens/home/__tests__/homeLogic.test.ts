import { HOUR_MS } from '@/lib/melt';
import type { Item } from '@/types';

import { anyThawingWithinHour, freezerSubtitle, gridCardWidth } from '../homeLayout';
import { newlyThawedIds } from '../useThawArrivals';

const item = (id: string, thawAt: number, extra: Partial<Item> = {}): Item => ({
  id,
  name: id,
  priceCents: 1000,
  currency: 'USD',
  category: 'other',
  frozenAt: 0,
  thawAt,
  cooldown: '24h',
  refreezeCount: 0,
  ...extra,
});

describe('newlyThawedIds', () => {
  const a = item('a', 100);
  const b = item('b', 200);

  it('reports items that were cooling and are now ready', () => {
    expect(newlyThawedIds({ items: [a, b], now: 50 }, [a, b], 150)).toEqual(['a']);
    expect(newlyThawedIds({ items: [a, b], now: 50 }, [a, b], 250)).toEqual(['a', 'b']);
  });

  it('ignores items that were already ready, are new, or got decided', () => {
    expect(newlyThawedIds({ items: [a], now: 120 }, [a], 150)).toEqual([]);
    expect(newlyThawedIds({ items: [], now: 50 }, [a], 150)).toEqual([]);
    expect(newlyThawedIds({ items: [a], now: 50 }, [{ ...a, decision: 'let-go' }], 150)).toEqual([]);
  });

  it('counts a thaw-early (thawAt moved to now) as an arrival', () => {
    const early = { ...b, thawAt: 60 };
    expect(newlyThawedIds({ items: [b], now: 50 }, [early], 60)).toEqual(['b']);
  });

  it('is empty while nothing crosses its thaw time', () => {
    expect(newlyThawedIds({ items: [a, b], now: 10 }, [a, b], 99)).toEqual([]);
  });
});

describe('freezerSubtitle', () => {
  it('matches the Figma copy', () => {
    expect(freezerSubtitle(4, 1, true)).toBe('4 wants cooling · 1 ready to decide');
  });

  it('pluralizes and drops zero parts', () => {
    expect(freezerSubtitle(1, 0, true)).toBe('1 want cooling');
    expect(freezerSubtitle(0, 2, true)).toBe('2 ready to decide');
  });

  it('describes an empty freezer', () => {
    expect(freezerSubtitle(0, 0, false)).toBe('Nothing on ice yet');
    expect(freezerSubtitle(0, 0, true)).toBe('Nothing on ice right now');
  });
});

describe('gridCardWidth', () => {
  it('is 170 on the 393 design frame and on wider screens', () => {
    expect(gridCardWidth(393)).toBe(170);
    expect(gridCardWidth(1280)).toBe(170);
  });

  it('shrinks on smaller phones', () => {
    expect(gridCardWidth(375)).toBe(161);
  });
});

describe('anyThawingWithinHour', () => {
  it('is true only for undecided items thawing in the next hour', () => {
    const now = 1_000_000;
    expect(anyThawingWithinHour([item('a', now + HOUR_MS)], now)).toBe(true);
    expect(anyThawingWithinHour([item('a', now + HOUR_MS + 1)], now)).toBe(false);
    expect(anyThawingWithinHour([item('a', now - 1)], now)).toBe(false);
    expect(anyThawingWithinHour([item('a', now + 10, { decision: 'bought' })], now)).toBe(false);
  });
});
