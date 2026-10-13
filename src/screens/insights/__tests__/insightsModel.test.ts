import { buildDemoItems } from '@/store/demo';
import type { Item } from '@/types';

import {
  arcPath,
  BAR_MAX_HEIGHT,
  BAR_MIN_HEIGHT,
  barHeights,
  buildInsights,
  donutArcs,
  formatHourLabel,
  MIN_DECISIONS,
} from '../insightsModel';

const HOUR = 60 * 60 * 1000;
// A fixed Wednesday afternoon, local time.
const NOW = new Date(2026, 9, 14, 15, 0, 0).getTime();

let seq = 0;
function item(over: Partial<Item> = {}): Item {
  seq += 1;
  const frozenAt = over.frozenAt ?? NOW - 100 * HOUR;
  return {
    id: `t-${seq}`,
    name: `Thing ${seq}`,
    priceCents: 5000,
    currency: 'USD',
    category: 'other',
    cooldown: '24h',
    frozenAt,
    thawAt: frozenAt + 24 * HOUR,
    refreezeCount: 0,
    ...over,
  };
}

describe('formatHourLabel', () => {
  it('uses the Figma tooltip style', () => {
    expect(formatHourLabel(23)).toBe('11 PM');
    expect(formatHourLabel(0)).toBe('12 AM');
    expect(formatHourLabel(12)).toBe('12 PM');
    expect(formatHourLabel(9)).toBe('9 AM');
    expect(formatHourLabel(-1)).toBe('11 PM');
  });
});

describe('barHeights', () => {
  it('scales to the busiest day and keeps a stub for empty days', () => {
    expect(barHeights([0, 2, 4, 0, 1, 0, 0])).toEqual([
      BAR_MIN_HEIGHT,
      BAR_MAX_HEIGHT / 2,
      BAR_MAX_HEIGHT,
      BAR_MIN_HEIGHT,
      BAR_MAX_HEIGHT / 4,
      BAR_MIN_HEIGHT,
      BAR_MIN_HEIGHT,
    ]);
  });

  it('is all stubs with no data', () => {
    expect(barHeights([0, 0, 0, 0, 0, 0, 0])).toEqual(Array(7).fill(BAR_MIN_HEIGHT));
  });

  it('never draws a non-empty bar shorter than the stub', () => {
    const heights = barHeights([100, 1, 0, 0, 0, 0, 0]);
    expect(heights[1]).toBe(BAR_MIN_HEIGHT);
  });
});

describe('donutArcs', () => {
  it('splits the ring at the share, with a gap at each seam', () => {
    const { letGo, bought } = donutArcs(0.75, 4);
    expect(letGo).toEqual({ start: 2, sweep: 266 });
    expect(bought).toEqual({ start: 272, sweep: 86 });
  });

  it('draws one full ring at 0 or 1', () => {
    expect(donutArcs(1)).toEqual({ letGo: { start: 0, sweep: 360 }, bought: null });
    expect(donutArcs(0)).toEqual({ letGo: null, bought: { start: 0, sweep: 360 } });
  });

  it('clamps odd input', () => {
    expect(donutArcs(Number.NaN).letGo).toBeNull();
    expect(donutArcs(7).bought).toBeNull();
  });
});

describe('arcPath', () => {
  it('draws a quarter arc clockwise from 12 o’clock', () => {
    expect(arcPath(50, 40, { start: 0, sweep: 90 })).toBe('M 50 10 A 40 40 0 0 1 90 50');
  });

  it('uses the large-arc flag past 180°', () => {
    expect(arcPath(50, 40, { start: 0, sweep: 270 })).toContain('A 40 40 0 1 1');
  });

  it('draws a full circle as two halves', () => {
    expect(arcPath(50, 40, { start: 0, sweep: 360 })).toBe('M 50 10 A 40 40 0 1 1 50 90 A 40 40 0 1 1 50 10');
  });
});

describe('buildInsights', () => {
  it('needs two decisions before showing stats', () => {
    const one = [item({ decision: 'let-go', decidedAt: NOW - HOUR }), item()];
    const model = buildInsights(one, 'USD');
    expect(MIN_DECISIONS).toBe(2);
    expect(model.decided).toBe(1);
    expect(model.enough).toBe(false);
  });

  it('builds the demo freezer’s cards (6 of 8 let go, $934)', () => {
    const model = buildInsights(buildDemoItems(NOW), 'USD');
    expect(model.enough).toBe(true);
    expect(model.hero).toMatchObject({
      title: 'You let go of 6 of 8 wants',
      line: 'That’s $934 you didn’t spend.',
      percent: '75%',
      letGoShare: 0.75,
    });

    // The two 11pm freezes a week apart make a weekday + hour pattern.
    expect(model.peakHour).toBe('11 PM');
    expect(model.peakCaption).toMatch(/^Your peak: \w+day around 11 PM$/);
    expect(model.weekdays).toHaveLength(7);
    expect(model.weekdays.filter((d) => d.peak)).toHaveLength(1);
    expect(Math.max(...model.weekdays.map((d) => d.height))).toBe(BAR_MAX_HEIGHT);

    // Moods: busiest first, the longest bar leaves a sliver of track.
    expect(model.moods[0]).toMatchObject({ mood: 'hyped', countLabel: '4 wants' });
    expect(model.moods[0].fill).toBeCloseTo(0.9);
    for (const row of model.moods) {
      expect(row.fill).toBeGreaterThan(0);
      expect(row.fill).toBeLessThanOrEqual(0.9);
    }

    // Categories: biggest spend first, every tile has a count and a whole-unit amount.
    expect(model.categories.length).toBeGreaterThan(1);
    for (const tile of model.categories) expect(tile.detail).toMatch(/^\d+ wants? · \$[\d,]+$/);

    expect(model.streak).toMatchObject({ longest: 3, current: 3, title: '3 let-gos in a row' });
  });

  it('stays calm when nothing was let go', () => {
    const items = [
      item({ decision: 'bought', decidedAt: NOW - 2 * HOUR }),
      item({ decision: 'bought', decidedAt: NOW - HOUR }),
    ];
    const model = buildInsights(items, 'USD');
    expect(model.hero.title).toBe('You decided on 2 wants');
    expect(model.hero.line).toBe('Every yes was a considered one.');
    expect(model.hero.percent).toBe('0%');
    expect(model.streak.title).toBe('No let-go streak yet');
  });

  it('waits for a repeated slot before naming a peak', () => {
    const items = [
      item({ decision: 'let-go', decidedAt: NOW - 2 * HOUR, frozenAt: NOW - 50 * HOUR }),
      item({ decision: 'let-go', decidedAt: NOW - HOUR, frozenAt: NOW - 30 * HOUR }),
    ];
    const model = buildInsights(items, 'USD');
    expect(model.peakHour).toBeNull();
    expect(model.weekdays.some((d) => d.peak)).toBe(false);
    expect(model.peakCaption).toBe('Your peak shows up after a few more freezes');
  });

  it('describes a broken streak', () => {
    const items = [
      item({ decision: 'let-go', decidedAt: NOW - 5 * HOUR }),
      item({ decision: 'let-go', decidedAt: NOW - 4 * HOUR }),
      item({ decision: 'bought', decidedAt: NOW - 3 * HOUR }),
      item({ decision: 'let-go', decidedAt: NOW - 2 * HOUR }),
    ];
    expect(buildInsights(items, 'USD').streak).toMatchObject({
      longest: 2,
      current: 1,
      title: '2 let-gos in a row',
      line: 'You’re 1 let-go into a new run.',
    });
  });
});
