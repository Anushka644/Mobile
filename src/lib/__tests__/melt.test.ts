import { COOLDOWN_HOURS, COOLDOWN_KEYS, getItemStatus, type Item } from '../../types';
import {
  DAY_MS,
  HOUR_MS,
  MINUTE_MS,
  REFLECTION_PROMPTS,
  formatTimeLeft,
  isCooling,
  isReady,
  meltProgress,
  meltStage,
  reflectionPromptFor,
  thawAtFor,
  timeLeftMs,
} from '../melt';

const T0 = new Date(2026, 9, 12, 9, 0, 0).getTime(); // local 9:00, Mon 12 Oct 2026

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    name: 'Sneakers',
    priceCents: 14000,
    currency: 'USD',
    category: 'fashion',
    frozenAt: T0,
    thawAt: T0 + 24 * HOUR_MS,
    cooldown: '24h',
    refreezeCount: 0,
    ...overrides,
  };
}

describe('time constants', () => {
  it('are consistent', () => {
    expect(MINUTE_MS).toBe(60_000);
    expect(HOUR_MS).toBe(60 * MINUTE_MS);
    expect(DAY_MS).toBe(24 * HOUR_MS);
  });
});

describe('meltProgress', () => {
  const item = makeItem();

  it('is 0 at the moment of freezing', () => {
    expect(meltProgress(item, T0)).toBe(0);
  });

  it('is 0 before frozenAt (clock skew)', () => {
    expect(meltProgress(item, T0 - HOUR_MS)).toBe(0);
  });

  it('is linear between frozenAt and thawAt', () => {
    expect(meltProgress(item, T0 + 6 * HOUR_MS)).toBeCloseTo(0.25);
    expect(meltProgress(item, T0 + 12 * HOUR_MS)).toBeCloseTo(0.5);
    expect(meltProgress(item, T0 + 18 * HOUR_MS)).toBeCloseTo(0.75);
  });

  it('is just under 1 one millisecond before thaw', () => {
    const p = meltProgress(item, item.thawAt - 1);
    expect(p).toBeLessThan(1);
    expect(p).toBeGreaterThan(0.999);
  });

  it('is exactly 1 at the thaw moment', () => {
    expect(meltProgress(item, item.thawAt)).toBe(1);
  });

  it('clamps to 1 after thaw', () => {
    expect(meltProgress(item, item.thawAt + 10 * DAY_MS)).toBe(1);
  });

  it('treats a zero duration as fully melted', () => {
    const zero = makeItem({ thawAt: T0 });
    expect(meltProgress(zero, T0)).toBe(1);
    expect(meltProgress(zero, T0 - 1)).toBe(1);
    expect(meltProgress(zero, T0 + 1)).toBe(1);
  });

  it('treats a negative duration as fully melted', () => {
    const backwards = makeItem({ thawAt: T0 - HOUR_MS });
    expect(meltProgress(backwards, T0 - 2 * HOUR_MS)).toBe(1);
    expect(meltProgress(backwards, T0)).toBe(1);
  });

  it('never returns NaN for bad input', () => {
    expect(meltProgress(makeItem({ thawAt: NaN }), T0)).toBe(0);
    expect(meltProgress(item, NaN)).toBe(0);
    expect(meltProgress(makeItem({ frozenAt: NaN }), T0)).toBe(0);
  });

  it('ignores decisions (purely time-based)', () => {
    expect(meltProgress(makeItem({ decision: 'bought' }), T0 + 12 * HOUR_MS)).toBeCloseTo(0.5);
  });

  it('restarts for a refrozen item (frozenAt reset)', () => {
    const refreezeAt = item.thawAt + HOUR_MS;
    const refrozen = makeItem({
      frozenAt: refreezeAt,
      thawAt: thawAtFor(refreezeAt, '72h'),
      cooldown: '72h',
      refreezeCount: 1,
    });
    expect(meltProgress(refrozen, refreezeAt)).toBe(0);
    expect(meltProgress(refrozen, refreezeAt + 36 * HOUR_MS)).toBeCloseTo(0.5);
    expect(meltProgress(refrozen, refrozen.thawAt)).toBe(1);
  });

  it('drops below 1 for a refrozen item that kept its original frozenAt', () => {
    const refrozen = makeItem({ thawAt: T0 + 48 * HOUR_MS, refreezeCount: 1 });
    expect(meltProgress(refrozen, T0 + 24 * HOUR_MS)).toBeCloseTo(0.5);
  });
});

describe('isReady / isCooling', () => {
  const item = makeItem();

  it('is cooling before thaw', () => {
    expect(isCooling(item, item.thawAt - 1)).toBe(true);
    expect(isReady(item, item.thawAt - 1)).toBe(false);
  });

  it('is ready exactly at the thaw moment', () => {
    expect(isReady(item, item.thawAt)).toBe(true);
    expect(isCooling(item, item.thawAt)).toBe(false);
  });

  it('stays ready after thaw', () => {
    expect(isReady(item, item.thawAt + 30 * DAY_MS)).toBe(true);
    expect(isCooling(item, item.thawAt + 30 * DAY_MS)).toBe(false);
  });

  it('is neither once decided, before or after thaw', () => {
    for (const decision of ['bought', 'let-go'] as const) {
      const decided = makeItem({ decision, decidedAt: T0 + HOUR_MS });
      expect(isReady(decided, decided.thawAt)).toBe(false);
      expect(isCooling(decided, decided.thawAt)).toBe(false);
      expect(isReady(decided, T0)).toBe(false);
      expect(isCooling(decided, T0)).toBe(false);
    }
  });

  it('a zero-duration item is ready immediately', () => {
    const zero = makeItem({ thawAt: T0 });
    expect(isReady(zero, T0)).toBe(true);
    expect(isCooling(zero, T0)).toBe(false);
  });

  it('a refrozen item is cooling again', () => {
    const refreezeAt = item.thawAt + 5 * MINUTE_MS;
    const refrozen = makeItem({
      frozenAt: refreezeAt,
      thawAt: thawAtFor(refreezeAt, '24h'),
      refreezeCount: 2,
    });
    expect(isCooling(refrozen, refreezeAt)).toBe(true);
    expect(isReady(refrozen, refreezeAt)).toBe(false);
  });

  it('agrees with getItemStatus', () => {
    const decided = makeItem({ decision: 'let-go' });
    for (const it of [item, decided]) {
      for (const now of [T0, it.thawAt - 1, it.thawAt, it.thawAt + 1]) {
        const status = getItemStatus(it, now);
        expect(isReady(it, now)).toBe(status === 'ready');
        expect(isCooling(it, now)).toBe(status === 'cooling');
      }
    }
  });
});

describe('meltStage', () => {
  it.each([
    [0, 0],
    [0.1, 0],
    [0.2499, 0],
    [0.25, 25],
    [0.4999, 25],
    [0.5, 50],
    [0.7499, 50],
    [0.75, 75],
    [0.9, 75],
    [0.999999, 75],
    [1, 100],
    [1.5, 100],
  ])('meltStage(%p) -> %p', (progress, stage) => {
    expect(meltStage(progress)).toBe(stage);
  });

  it('maps negative and NaN progress to 0', () => {
    expect(meltStage(-0.5)).toBe(0);
    expect(meltStage(NaN)).toBe(0);
  });

  it('only reaches 100 at the exact thaw moment', () => {
    const item = makeItem();
    expect(meltStage(meltProgress(item, item.thawAt - 1))).toBe(75);
    expect(meltStage(meltProgress(item, item.thawAt))).toBe(100);
  });
});

describe('timeLeftMs', () => {
  const item = makeItem();

  it('counts down to thawAt', () => {
    expect(timeLeftMs(item, T0)).toBe(24 * HOUR_MS);
    expect(timeLeftMs(item, item.thawAt - 1)).toBe(1);
  });

  it('is 0 at and after thaw', () => {
    expect(timeLeftMs(item, item.thawAt)).toBe(0);
    expect(timeLeftMs(item, item.thawAt + DAY_MS)).toBe(0);
  });

  it('is never negative or NaN', () => {
    expect(timeLeftMs(makeItem({ thawAt: T0 - DAY_MS }), T0)).toBe(0);
    expect(timeLeftMs(makeItem({ thawAt: NaN }), T0)).toBe(0);
    expect(timeLeftMs(item, NaN)).toBe(0);
  });
});

describe('formatTimeLeft', () => {
  it.each<[number, string]>([
    [0, 'Ready'],
    [-1, 'Ready'],
    [-DAY_MS, 'Ready'],
    [1, '<1m left'],
    [59_999, '<1m left'],
    [MINUTE_MS, '1m left'],
    [MINUTE_MS + 59_999, '1m left'],
    [42 * MINUTE_MS + 30_000, '42m left'],
    [HOUR_MS - 1, '59m left'],
    [HOUR_MS, '1h left'],
    [HOUR_MS + 59_999, '1h left'],
    [HOUR_MS + MINUTE_MS, '1h 1m left'],
    [5 * HOUR_MS + 12 * MINUTE_MS, '5h 12m left'],
    [DAY_MS - 1, '23h 59m left'],
    [DAY_MS, '1d left'],
    [DAY_MS + HOUR_MS - 1, '1d left'],
    [DAY_MS + HOUR_MS, '1d 1h left'],
    [3 * DAY_MS + 4 * HOUR_MS + 59 * MINUTE_MS, '3d 4h left'],
    [72 * HOUR_MS, '3d left'],
    [7 * DAY_MS, '7d left'],
    [30 * DAY_MS - 1, '29d 23h left'],
    [30 * DAY_MS, '30d left'],
  ])('formatTimeLeft(%p) -> %p', (ms, label) => {
    expect(formatTimeLeft(ms)).toBe(label);
  });

  it('treats non-finite input as Ready', () => {
    expect(formatTimeLeft(NaN)).toBe('Ready');
    expect(formatTimeLeft(Infinity)).toBe('Ready');
  });

  it('composes with timeLeftMs', () => {
    const item = makeItem({ thawAt: thawAtFor(T0, '72h'), cooldown: '72h' });
    expect(formatTimeLeft(timeLeftMs(item, T0))).toBe('3d left');
    expect(formatTimeLeft(timeLeftMs(item, item.thawAt - 90 * MINUTE_MS))).toBe('1h 30m left');
    expect(formatTimeLeft(timeLeftMs(item, item.thawAt))).toBe('Ready');
  });
});

describe('thawAtFor', () => {
  it('adds the cooldown hours', () => {
    expect(thawAtFor(T0, '24h')).toBe(T0 + 24 * HOUR_MS);
    expect(thawAtFor(T0, '72h')).toBe(T0 + 72 * HOUR_MS);
    expect(thawAtFor(T0, '7d')).toBe(T0 + 7 * DAY_MS);
    expect(thawAtFor(T0, '30d')).toBe(T0 + 30 * DAY_MS);
  });

  it('uses COOLDOWN_HOURS for every key', () => {
    for (const key of COOLDOWN_KEYS) {
      expect(thawAtFor(0, key)).toBe(COOLDOWN_HOURS[key] * HOUR_MS);
    }
  });
});

describe('reflectionPromptFor', () => {
  const item = makeItem();

  it('has at least 12 distinct, non-empty prompts', () => {
    expect(REFLECTION_PROMPTS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(REFLECTION_PROMPTS).size).toBe(REFLECTION_PROMPTS.length);
    for (const prompt of REFLECTION_PROMPTS) {
      expect(prompt.trim().length).toBeGreaterThan(0);
      expect(prompt.endsWith('?')).toBe(true);
    }
  });

  it('includes the core prompts from the brief', () => {
    expect(REFLECTION_PROMPTS).toEqual(
      expect.arrayContaining([
        'Would you still want it at 2× the price?',
        'Where would it live in your home?',
        'What did you feel right before you froze it?',
      ])
    );
  });

  it('avoids shaming language', () => {
    const shaming = /\b(waste|wasteful|stupid|dumb|guilt|shame|irresponsible|bad|lazy|addict)/i;
    for (const prompt of REFLECTION_PROMPTS) expect(prompt).not.toMatch(shaming);
  });

  it('always returns a prompt from the list', () => {
    expect(REFLECTION_PROMPTS).toContain(reflectionPromptFor(item, T0));
    expect(REFLECTION_PROMPTS).toContain(reflectionPromptFor(makeItem({ id: '' }), T0));
  });

  it('is deterministic within a local day', () => {
    const morning = new Date(2026, 9, 12, 0, 0, 0).getTime();
    const night = new Date(2026, 9, 12, 23, 59, 59).getTime();
    const prompt = reflectionPromptFor(item, morning);
    expect(reflectionPromptFor(item, T0)).toBe(prompt);
    expect(reflectionPromptFor(item, night)).toBe(prompt);
    expect(reflectionPromptFor({ ...item }, T0)).toBe(prompt);
  });

  it('changes at local midnight', () => {
    const beforeMidnight = new Date(2026, 9, 12, 23, 59, 59).getTime();
    const afterMidnight = new Date(2026, 9, 13, 0, 0, 0).getTime();
    expect(reflectionPromptFor(item, afterMidnight)).not.toBe(
      reflectionPromptFor(item, beforeMidnight)
    );
  });

  it('cycles through every prompt over consecutive days', () => {
    const seen = new Set<string>();
    let previous: string | null = null;
    for (let d = 0; d < REFLECTION_PROMPTS.length; d++) {
      const prompt = reflectionPromptFor(item, new Date(2026, 9, 12 + d, 12).getTime());
      expect(prompt).not.toBe(previous);
      seen.add(prompt);
      previous = prompt;
    }
    expect(seen.size).toBe(REFLECTION_PROMPTS.length);
  });

  it('usually differs between items on the same day', () => {
    const prompts = new Set(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => reflectionPromptFor({ id }, T0))
    );
    expect(prompts.size).toBeGreaterThan(1);
  });

  it('does not depend on decision or refreeze state', () => {
    const prompt = reflectionPromptFor(item, T0);
    expect(reflectionPromptFor(makeItem({ refreezeCount: 3, decision: 'bought' }), T0)).toBe(
      prompt
    );
  });

  it('copes with timestamps far in the past and invalid input', () => {
    expect(REFLECTION_PROMPTS).toContain(reflectionPromptFor(item, 0));
    expect(REFLECTION_PROMPTS).toContain(reflectionPromptFor(item, -5 * DAY_MS));
    expect(reflectionPromptFor(item, NaN)).toBe(REFLECTION_PROMPTS[0]);
  });
});
