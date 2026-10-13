import { countUpValue, easeOutCubic } from '../../letgo/useCountUp';
import {
  goalAmountCaption,
  goalAmountText,
  goalPercent,
  goalPercentLabel,
  goalToGoCaption,
  historyLine,
  meltedAwayCaption,
  parseGoalInput,
  savedSoFar,
  wantsLetGoLabel,
} from '../savedCopy';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe('goal percent', () => {
  it('rounds, but only says 100% once the goal is reached', () => {
    expect(goalPercent((934 / 1200) * 100)).toBe(78);
    expect(goalPercent(99.6)).toBe(99);
    expect(goalPercent(100)).toBe(100);
    expect(goalPercent(0)).toBe(0);
    expect(goalPercent(Number.NaN)).toBe(0);
    expect(goalPercentLabel(83.25)).toBe('83%');
  });
});

describe('saved copy', () => {
  it('formats counts and amounts', () => {
    expect(wantsLetGoLabel(8)).toBe('8 wants let go');
    expect(wantsLetGoLabel(1)).toBe('1 want let go');
    expect(goalAmountCaption(93400, 120000, 'USD')).toBe('$934 of $1,200');
    expect(savedSoFar(107400, 'USD')).toBe('$1,074 saved so far');
    expect(meltedAwayCaption(1)).toBe('by letting 1 want melt away');
    expect(meltedAwayCaption(9)).toBe('by letting 9 wants melt away');
  });

  it('says how far the goal is', () => {
    const goal = { name: 'Weekend in Lisbon', targetCents: 120000 };
    expect(goalToGoCaption(goal, 107400, 'USD')).toBe('Weekend in Lisbon · $126 to go');
    expect(goalToGoCaption(goal, 130000, 'USD')).toBe('Weekend in Lisbon · goal reached!');
  });

  it('describes a decision with its date and the wait from the first freeze', () => {
    const frozenAt = new Date(2026, 9, 3, 23, 30).getTime();
    const thawAt = frozenAt + 72 * HOUR;
    const letGo = { frozenAt, thawAt, decision: 'let-go' as const, decidedAt: thawAt + 5 * HOUR };
    expect(historyLine(letGo)).toBe('Let go Oct 7 · waited 3 days');
    expect(historyLine({ ...letGo, decision: 'bought' })).toBe('Bought Oct 7 · waited 3 days');
    expect(historyLine({ ...letGo, firstFrozenAt: frozenAt - 7 * DAY })).toBe('Let go Oct 7 · waited 10 days');
    // Missing decidedAt: fall back to the thaw time.
    expect(historyLine({ frozenAt, thawAt, decision: 'let-go' })).toBe('Let go Oct 6 · waited 3 days');
  });
});

describe('goal input', () => {
  it('needs a name and a positive amount', () => {
    expect(parseGoalInput(' Tokyo   trip ', '2,500')).toEqual({ name: 'Tokyo trip', targetCents: 250000 });
    expect(parseGoalInput('Bike', '899.99')).toEqual({ name: 'Bike', targetCents: 89999 });
    expect(parseGoalInput('', '100')).toBeNull();
    expect(parseGoalInput('Bike', '0')).toBeNull();
    expect(parseGoalInput('Bike', 'abc')).toBeNull();
  });

  it('prefills the amount field', () => {
    expect(goalAmountText(120000)).toBe('1200');
    expect(goalAmountText(120050)).toBe('1200.50');
    expect(goalAmountText(undefined)).toBe('');
  });
});

describe('count-up curve', () => {
  it('eases out from → to over the duration', () => {
    expect(countUpValue(0, 100, 0, 900)).toBe(0);
    expect(countUpValue(0, 100, 900, 900)).toBe(100);
    expect(countUpValue(0, 100, 2000, 900)).toBe(100);
    expect(countUpValue(50, 100, 450, 900)).toBeCloseTo(50 + 50 * easeOutCubic(0.5));
    expect(countUpValue(0, 100, 100, 0)).toBe(100);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});
