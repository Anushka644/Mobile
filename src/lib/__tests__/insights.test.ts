import { CATEGORIES, MOODS, type Category, type Item, type Mood } from '../../types';
import {
  WEEKDAY_NAMES,
  WEEKDAY_SHORT,
  byCategory,
  byHourOfDay,
  byMood,
  byWeekday,
  decisionsNewestFirst,
  formatHour,
  keepRate,
  letGoStreak,
  longestLetGoStreak,
  peakImpulseWindow,
  savedCents,
  spentCents,
  weekdayIndex,
} from '../insights';

const HOUR = 3_600_000;

/** Local-time timestamp; 12 Oct 2026 is a Monday. */
const at = (day: number, hour: number, minute = 0) =>
  new Date(2026, 9, day, hour, minute).getTime();
const MON = 12;
const TUE = 13;
const WED = 14;
const SAT = 17;
const SUN = 18;

let seq = 0;
function makeItem(overrides: Partial<Item> = {}): Item {
  const frozenAt = overrides.frozenAt ?? at(MON, 9);
  return {
    id: `item-${++seq}`,
    name: 'Thing',
    priceCents: 1000,
    currency: 'USD',
    category: 'other',
    frozenAt,
    thawAt: frozenAt + 24 * HOUR,
    cooldown: '24h',
    refreezeCount: 0,
    ...overrides,
  };
}

const decided = (decision: Item['decision'], decidedAt: number, extra: Partial<Item> = {}) =>
  makeItem({ decision, decidedAt, ...extra });

describe('keepRate', () => {
  it('returns zeros and a null rate for an empty list', () => {
    expect(keepRate([])).toEqual({ bought: 0, letGo: 0, decided: 0, rate: null });
  });

  it('returns a null rate when nothing is decided yet', () => {
    expect(keepRate([makeItem(), makeItem()])).toEqual({
      bought: 0,
      letGo: 0,
      decided: 0,
      rate: null,
    });
  });

  it('counts decisions and the let-go share', () => {
    const items = [
      decided('let-go', 1),
      decided('let-go', 2),
      decided('let-go', 3),
      decided('bought', 4),
      makeItem(), // cooling / ready items are ignored
    ];
    expect(keepRate(items)).toEqual({ bought: 1, letGo: 3, decided: 4, rate: 0.75 });
  });

  it('is 1 when everything was let go and 0 when everything was bought', () => {
    expect(keepRate([decided('let-go', 1)]).rate).toBe(1);
    expect(keepRate([decided('bought', 1), decided('bought', 2)]).rate).toBe(0);
  });

  it('ignores unknown decision values', () => {
    const weird = makeItem({ decision: 'maybe' as Item['decision'] });
    expect(keepRate([weird])).toEqual({ bought: 0, letGo: 0, decided: 0, rate: null });
  });
});

describe('savedCents / spentCents', () => {
  const items = [
    decided('let-go', 1, { priceCents: 14000 }),
    decided('let-go', 2, { priceCents: 8950 }),
    decided('bought', 3, { priceCents: 2500 }),
    decided('bought', 4, { priceCents: 1 }),
    makeItem({ priceCents: 99999 }), // undecided
  ];

  it('sums let-go prices into saved', () => {
    expect(savedCents(items)).toBe(22950);
  });

  it('sums bought prices into spent', () => {
    expect(spentCents(items)).toBe(2501);
  });

  it('is 0 for an empty list or no matching decisions', () => {
    expect(savedCents([])).toBe(0);
    expect(spentCents([])).toBe(0);
    expect(savedCents([makeItem()])).toBe(0);
    expect(spentCents([decided('let-go', 1)])).toBe(0);
  });

  it('counts a refrozen item once by its final decision', () => {
    const refrozen = decided('let-go', 5, { priceCents: 5000, refreezeCount: 3 });
    expect(savedCents([refrozen])).toBe(5000);
    expect(spentCents([refrozen])).toBe(0);
  });

  it('sums mixed currencies without crashing (single currency assumed)', () => {
    const mixed = [
      decided('let-go', 1, { priceCents: 1000, currency: 'USD' }),
      decided('let-go', 2, { priceCents: 2000, currency: 'EUR' }),
      decided('let-go', 3, { priceCents: 300000, currency: 'JPY' }),
      decided('let-go', 4, { priceCents: 500, currency: '' }),
    ];
    expect(savedCents(mixed)).toBe(303500);
  });

  it('skips non-finite prices instead of returning NaN', () => {
    const bad = [
      decided('let-go', 1, { priceCents: NaN }),
      decided('let-go', 2, { priceCents: Infinity }),
      decided('let-go', 3, { priceCents: 700 }),
    ];
    expect(savedCents(bad)).toBe(700);
  });

  it('handles zero-priced items', () => {
    expect(savedCents([decided('let-go', 1, { priceCents: 0 })])).toBe(0);
  });
});

describe('byMood', () => {
  it('has every mood key at 0 for an empty list', () => {
    const counts = byMood([]);
    expect(Object.keys(counts).sort()).toEqual([...MOODS].sort());
    for (const mood of MOODS) expect(counts[mood]).toBe(0);
  });

  it('counts items per mood and skips items without one', () => {
    const items = [
      makeItem({ mood: 'bored' }),
      makeItem({ mood: 'bored' }),
      makeItem({ mood: 'stressed' }),
      makeItem({ mood: 'need', decision: 'bought', decidedAt: 1 }),
      makeItem(),
    ];
    expect(byMood(items)).toEqual({ bored: 2, sad: 0, hyped: 0, stressed: 1, need: 1 });
  });

  it('ignores unknown or prototype-named moods', () => {
    const items = [
      makeItem({ mood: 'angry' as Mood }),
      makeItem({ mood: 'toString' as Mood }),
      makeItem({ mood: 'constructor' as Mood }),
    ];
    expect(byMood(items)).toEqual({ bored: 0, sad: 0, hyped: 0, stressed: 0, need: 0 });
  });
});

describe('byCategory', () => {
  it('has every category key with zero totals for an empty list', () => {
    const totals = byCategory([]);
    expect(Object.keys(totals).sort()).toEqual([...CATEGORIES].sort());
    for (const category of CATEGORIES) expect(totals[category]).toEqual({ count: 0, cents: 0 });
  });

  it('counts items and sums cents per category, whatever the status', () => {
    const items = [
      makeItem({ category: 'tech', priceCents: 19900 }),
      makeItem({ category: 'tech', priceCents: 4999, decision: 'let-go', decidedAt: 1 }),
      makeItem({ category: 'fashion', priceCents: 14000, decision: 'bought', decidedAt: 2 }),
      makeItem({ category: 'food', priceCents: 0 }),
    ];
    const totals = byCategory(items);
    expect(totals.tech).toEqual({ count: 2, cents: 24899 });
    expect(totals.fashion).toEqual({ count: 1, cents: 14000 });
    expect(totals.food).toEqual({ count: 1, cents: 0 });
    expect(totals.home).toEqual({ count: 0, cents: 0 });
  });

  it('files unknown categories under other', () => {
    const items = [
      makeItem({ category: 'cars' as Category, priceCents: 500 }),
      makeItem({ category: 'constructor' as Category, priceCents: 100 }),
      makeItem({ category: undefined as unknown as Category, priceCents: 1 }),
      makeItem({ category: 'other', priceCents: 1000 }),
    ];
    expect(byCategory(items).other).toEqual({ count: 4, cents: 1601 });
  });

  it('counts but does not sum non-finite prices', () => {
    expect(byCategory([makeItem({ category: 'fun', priceCents: NaN })]).fun).toEqual({
      count: 1,
      cents: 0,
    });
  });

  it('returns a fresh object each call', () => {
    const a = byCategory([]);
    a.tech.count = 99;
    expect(byCategory([]).tech.count).toBe(0);
  });
});

describe('weekdayIndex', () => {
  it('is 0 for Monday and 6 for Sunday', () => {
    expect(weekdayIndex(at(MON, 12))).toBe(0);
    expect(weekdayIndex(at(TUE, 12))).toBe(1);
    expect(weekdayIndex(at(SAT, 12))).toBe(5);
    expect(weekdayIndex(at(SUN, 12))).toBe(6);
    expect(weekdayIndex(at(SUN + 1, 0))).toBe(0);
  });

  it('is null for an invalid timestamp', () => {
    expect(weekdayIndex(NaN)).toBeNull();
  });

  it('lines up with the label arrays', () => {
    expect(WEEKDAY_SHORT[weekdayIndex(at(MON, 12))!]).toBe('Mon');
    expect(WEEKDAY_NAMES[weekdayIndex(at(SUN, 12))!]).toBe('Sunday');
    expect(WEEKDAY_SHORT).toHaveLength(7);
    expect(WEEKDAY_NAMES).toHaveLength(7);
  });
});

describe('byHourOfDay', () => {
  it('returns 24 zero buckets for an empty list', () => {
    expect(byHourOfDay([])).toEqual(new Array(24).fill(0));
  });

  it('buckets by local hour of frozenAt', () => {
    const items = [
      makeItem({ frozenAt: at(MON, 0, 0) }),
      makeItem({ frozenAt: at(TUE, 0, 59) }),
      makeItem({ frozenAt: at(WED, 13, 30) }),
      makeItem({ frozenAt: at(SAT, 23, 59) }),
      makeItem({ frozenAt: at(SUN, 23, 0) }),
    ];
    const buckets = byHourOfDay(items);
    expect(buckets).toHaveLength(24);
    expect(buckets[0]).toBe(2);
    expect(buckets[13]).toBe(1);
    expect(buckets[23]).toBe(2);
    expect(buckets.reduce((a, b) => a + b, 0)).toBe(5);
  });

  it('skips invalid timestamps', () => {
    expect(byHourOfDay([makeItem({ frozenAt: NaN })]).reduce((a, b) => a + b, 0)).toBe(0);
  });
});

describe('byWeekday', () => {
  it('returns 7 zero buckets for an empty list', () => {
    expect(byWeekday([])).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it('buckets by local weekday, Monday first', () => {
    const items = [
      makeItem({ frozenAt: at(MON, 0, 0) }),
      makeItem({ frozenAt: at(MON, 23, 59) }),
      makeItem({ frozenAt: at(WED, 12) }),
      makeItem({ frozenAt: at(SUN, 22) }),
      makeItem({ frozenAt: at(SUN + 7, 1) }), // the following Sunday
    ];
    expect(byWeekday(items)).toEqual([2, 0, 1, 0, 0, 0, 2]);
  });

  it('skips invalid timestamps', () => {
    expect(byWeekday([makeItem({ frozenAt: NaN })])).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
});

describe('peakImpulseWindow', () => {
  it('is null for an empty list or only invalid timestamps', () => {
    expect(peakImpulseWindow([])).toBeNull();
    expect(peakImpulseWindow([makeItem({ frozenAt: NaN })])).toBeNull();
  });

  it('returns the only slot for a single item', () => {
    expect(peakImpulseWindow([makeItem({ frozenAt: at(SUN, 22, 15) })])).toEqual({
      weekday: 6,
      hour: 22,
      count: 1,
    });
  });

  it('picks the busiest weekday + hour slot', () => {
    const items = [
      makeItem({ frozenAt: at(MON, 9) }),
      makeItem({ frozenAt: at(MON + 7, 9, 45) }), // another Monday, same hour
      makeItem({ frozenAt: at(SUN, 22) }),
      makeItem({ frozenAt: at(SUN, 23) }),
      makeItem({ frozenAt: at(SUN, 21) }),
    ];
    // Sunday is the busiest day overall, but no Sunday hour repeats: Monday 9am wins.
    expect(peakImpulseWindow(items)).toEqual({ weekday: 0, hour: 9, count: 2 });
  });

  it('breaks ties by the busiest weekday and hour overall', () => {
    const items = [
      makeItem({ frozenAt: at(MON, 8) }),
      makeItem({ frozenAt: at(SAT, 22) }),
      makeItem({ frozenAt: at(SAT, 10) }), // Saturday has 2, hour 22 has 2
      makeItem({ frozenAt: at(TUE, 22) }),
    ];
    expect(peakImpulseWindow(items)).toEqual({ weekday: 5, hour: 22, count: 1 });
  });

  it('breaks complete ties by the earliest slot in the week', () => {
    const items = [makeItem({ frozenAt: at(SUN, 1) }), makeItem({ frozenAt: at(TUE, 5) })];
    expect(peakImpulseWindow(items)).toEqual({ weekday: 1, hour: 5, count: 1 });
  });

  it('is independent of input order', () => {
    const items = [
      makeItem({ frozenAt: at(WED, 20) }),
      makeItem({ frozenAt: at(WED + 7, 20, 30) }),
      makeItem({ frozenAt: at(TUE, 7) }),
      makeItem({ frozenAt: at(TUE + 7, 7) }),
      makeItem({ frozenAt: at(SAT, 7) }),
    ];
    const expected = { weekday: 1, hour: 7, count: 2 };
    expect(peakImpulseWindow(items)).toEqual(expected);
    expect(peakImpulseWindow([...items].reverse())).toEqual(expected);
  });
});

describe('formatHour', () => {
  it.each<[number, string]>([
    [0, '12am'],
    [1, '1am'],
    [9, '9am'],
    [11, '11am'],
    [12, '12pm'],
    [13, '1pm'],
    [22, '10pm'],
    [23, '11pm'],
    [24, '12am'],
    [-1, '11pm'],
  ])('formatHour(%p) -> %p', (hour, label) => {
    expect(formatHour(hour)).toBe(label);
  });
});

describe('decisionsNewestFirst', () => {
  it('keeps only decided items, newest decision first', () => {
    const a = decided('let-go', at(MON, 9));
    const b = decided('bought', at(WED, 9));
    const c = makeItem();
    const d = decided('let-go', at(TUE, 9));
    expect(decisionsNewestFirst([a, b, c, d])).toEqual([b, d, a]);
  });

  it('falls back to thawAt when decidedAt is missing', () => {
    const early = makeItem({ decision: 'let-go', frozenAt: at(MON, 9) }); // thaws Tue 9:00
    const late = decided('bought', at(WED, 9));
    expect(decisionsNewestFirst([early, late])).toEqual([late, early]);
  });

  it('keeps input order for equal times and does not mutate the input', () => {
    const a = decided('let-go', 100);
    const b = decided('bought', 100);
    const input = [a, b];
    expect(decisionsNewestFirst(input)).toEqual([a, b]);
    expect(input).toEqual([a, b]);
  });
});

describe('letGoStreak', () => {
  it('is 0 for an empty list or no decisions', () => {
    expect(letGoStreak([])).toBe(0);
    expect(letGoStreak([makeItem(), makeItem()])).toBe(0);
  });

  it('counts let-go decisions back from the most recent until a purchase', () => {
    const items = [
      decided('let-go', at(MON, 9)),
      decided('bought', at(TUE, 9)),
      decided('let-go', at(WED, 9)),
      decided('let-go', at(SAT, 9)),
      decided('let-go', at(SUN, 9)),
    ];
    expect(letGoStreak(items)).toBe(3);
  });

  it('is 0 when the most recent decision was a purchase', () => {
    expect(letGoStreak([decided('let-go', 1), decided('let-go', 2), decided('bought', 3)])).toBe(0);
  });

  it('orders by decision time, not array order', () => {
    const items = [
      decided('let-go', at(SUN, 9)),
      decided('bought', at(MON, 9)),
      decided('let-go', at(WED, 9)),
    ];
    expect(letGoStreak(items)).toBe(2);
  });

  it('is not broken by cooling, ready or refrozen items', () => {
    const items = [
      decided('let-go', at(MON, 9)),
      makeItem({ refreezeCount: 2, frozenAt: at(TUE, 9) }),
      decided('let-go', at(WED, 9), { refreezeCount: 1 }),
      makeItem({ frozenAt: at(SUN, 9) }),
    ];
    expect(letGoStreak(items)).toBe(2);
  });

  it('counts every decision when all were let go', () => {
    expect(letGoStreak([decided('let-go', 1), decided('let-go', 2)])).toBe(2);
  });
});

describe('longestLetGoStreak', () => {
  it('is 0 for an empty list or only purchases', () => {
    expect(longestLetGoStreak([])).toBe(0);
    expect(longestLetGoStreak([decided('bought', 1)])).toBe(0);
  });

  it('finds the longest run anywhere in history', () => {
    const items = [
      decided('let-go', 1),
      decided('let-go', 2),
      decided('let-go', 3),
      decided('bought', 4),
      decided('let-go', 5),
    ];
    expect(longestLetGoStreak(items)).toBe(3);
    expect(letGoStreak(items)).toBe(1);
  });
});
