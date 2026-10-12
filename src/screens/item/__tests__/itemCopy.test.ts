import { DAY_MS, HOUR_MS, MINUTE_MS, REFLECTION_PROMPTS, reflectionPromptFor } from '@/lib/melt';

import {
  countdownA11y,
  frozenLabel,
  localDaysBetween,
  meltCaption,
  meltedPercent,
  openableUrl,
  thawMoment,
} from '../itemCopy';
import { promptAt } from '../useReflectionPrompt';

// Tuesday Oct 14 2025, 9:41 AM local time.
const NOW = new Date(2025, 9, 14, 9, 41).getTime();

describe('frozenLabel', () => {
  it('reads "Frozen 2 days ago", or "Refrozen" after a refreeze', () => {
    expect(frozenLabel({ frozenAt: NOW - 2 * DAY_MS - HOUR_MS, refreezeCount: 0 }, NOW)).toBe('Frozen 2 days ago');
    expect(frozenLabel({ frozenAt: NOW - 3 * HOUR_MS, refreezeCount: 1 }, NOW)).toBe('Refrozen 3 hours ago');
    expect(frozenLabel({ frozenAt: NOW, refreezeCount: 0 }, NOW)).toBe('Frozen a moment ago');
  });
});

describe('thawMoment', () => {
  it('uses today / tomorrow / weekday / date', () => {
    expect(thawMoment(new Date(2025, 9, 14, 21, 41).getTime(), NOW)).toBe('today 9:41 PM');
    expect(thawMoment(new Date(2025, 9, 15, 0, 5).getTime(), NOW)).toBe('tomorrow 12:05 AM');
    expect(thawMoment(new Date(2025, 9, 16, 21, 41).getTime(), NOW)).toBe('Thu 9:41 PM');
    expect(thawMoment(new Date(2025, 10, 11, 8, 0).getTime(), NOW)).toBe('Nov 11');
  });

  it('counts local calendar days', () => {
    expect(localDaysBetween(NOW, new Date(2025, 9, 14, 23, 59).getTime())).toBe(0);
    expect(localDaysBetween(NOW, new Date(2025, 9, 21, 0, 1).getTime())).toBe(7);
  });
});

describe('meltCaption', () => {
  it('floors the percent and never shows 100 while cooling', () => {
    expect(meltedPercent(0.589)).toBe(58);
    expect(meltedPercent(0.9999)).toBe(99);
    expect(meltedPercent(Number.NaN)).toBe(0);
  });

  it('matches the Figma caption shape', () => {
    const thawAt = new Date(2025, 9, 16, 21, 41).getTime();
    expect(meltCaption(0.58, thawAt, NOW)).toBe('58% melted · thaws Thu 9:41 PM');
  });

  it('switches to a ready line once thawed', () => {
    expect(meltCaption(1, NOW, NOW)).toBe('Fully melted · ready to decide');
    expect(meltCaption(0.4, NOW + DAY_MS, NOW, true)).toBe('Fully melted · ready to decide');
  });
});

describe('countdownA11y', () => {
  it('speaks the time left', () => {
    expect(countdownA11y(29 * HOUR_MS + 14 * MINUTE_MS)).toBe('1 day 5 hours left');
    expect(countdownA11y(5 * HOUR_MS + MINUTE_MS)).toBe('5 hours 1 minute left');
    expect(countdownA11y(42 * MINUTE_MS)).toBe('42 minutes left');
    expect(countdownA11y(30_000)).toBe('Less than a minute left');
    expect(countdownA11y(0)).toBe('Ready to decide');
  });
});

describe('openableUrl', () => {
  it('keeps http(s) links and adds https to bare domains', () => {
    expect(openableUrl('https://nike.com/p/1')).toBe('https://nike.com/p/1');
    expect(openableUrl('  http://a.co ')).toBe('http://a.co');
    expect(openableUrl('nike.com/p/1?x=2')).toBe('https://nike.com/p/1?x=2');
  });

  it('rejects anything else', () => {
    expect(openableUrl(undefined)).toBeNull();
    expect(openableUrl('')).toBeNull();
    expect(openableUrl('javascript:alert(1)')).toBeNull();
    expect(openableUrl('mailto:a@b.co')).toBeNull();
    expect(openableUrl('not a link')).toBeNull();
  });
});

describe('promptAt', () => {
  const item = { id: 'demo-sneakers' };

  it('starts at the prompt of the day and cycles through every prompt', () => {
    expect(promptAt(item, NOW, 0)).toBe(reflectionPromptFor(item, NOW));
    const seen = new Set(REFLECTION_PROMPTS.map((_, i) => promptAt(item, NOW, i)));
    expect(seen.size).toBe(REFLECTION_PROMPTS.length);
    expect(promptAt(item, NOW, REFLECTION_PROMPTS.length)).toBe(promptAt(item, NOW, 0));
  });
});
