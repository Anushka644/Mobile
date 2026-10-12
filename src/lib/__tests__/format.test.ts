import {
  formatAgo,
  formatCountdown,
  formatDayCaption,
  formatDuration,
  formatHeroCountdown,
  formatShortDate,
  formatTimeLeftShort,
  formatWeekdayTime,
  timeOfDayPhrase,
} from '../format';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('formatDuration', () => {
  it.each<[number, string]>([
    [0, 'a moment'],
    [59_999, 'a moment'],
    [MIN, '1 minute'],
    [12 * MIN, '12 minutes'],
    [HOUR, '1 hour'],
    [5 * HOUR + 59 * MIN, '5 hours'],
    [DAY, '1 day'],
    [3 * DAY + 23 * HOUR, '3 days'],
    [NaN, 'a moment'],
    [-5, 'a moment'],
  ])('%p -> %p', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});

describe('formatAgo', () => {
  it.each<[number, string]>([
    [0, 'just now'],
    [12 * MIN, '12m ago'],
    [2 * HOUR + 5 * MIN, '2h ago'],
    [3 * DAY, '3d ago'],
    [Infinity, 'just now'],
  ])('%p -> %p', (ms, expected) => {
    expect(formatAgo(ms)).toBe(expected);
  });
});

describe('formatCountdown', () => {
  it('drops the " left" suffix', () => {
    expect(formatCountdown('29h 14m left')).toBe('29h 14m');
    expect(formatCountdown('Ready')).toBe('Ready');
  });
});

describe('timeOfDayPhrase', () => {
  const at = (h: number, m = 0) => new Date(2026, 9, 14, h, m).getTime();
  it.each<[number, number, string]>([
    [22, 0, 'late-night scroll'],
    [23, 59, 'late-night scroll'],
    [0, 30, 'late-night scroll'],
    [4, 59, 'late-night scroll'],
    [5, 0, 'morning browse'],
    [11, 59, 'morning browse'],
    [12, 0, 'afternoon break'],
    [17, 59, 'afternoon break'],
    [18, 0, 'evening wind-down'],
    [21, 59, 'evening wind-down'],
  ])('%p:%p -> %p', (h, m, expected) => {
    expect(timeOfDayPhrase(at(h, m))).toBe(expected);
  });
});

describe('dates', () => {
  const tue = new Date(2026, 9, 13, 21, 41).getTime(); // Tue 13 Oct 2026, 9:41 PM
  it('formats the day caption', () => {
    expect(formatDayCaption(tue)).toBe('Tuesday, Oct 13');
    expect(formatDayCaption(NaN)).toBe('');
  });
  it('formats a short date', () => {
    expect(formatShortDate(tue)).toBe('Oct 13');
  });
  it('formats weekday + time', () => {
    expect(formatWeekdayTime(tue)).toBe('Tue 9:41 PM');
    expect(formatWeekdayTime(new Date(2026, 9, 15, 0, 5).getTime())).toBe('Thu 12:05 AM');
    expect(formatWeekdayTime(new Date(2026, 9, 15, 12, 0).getTime())).toBe('Thu 12:00 PM');
  });
});

describe('formatTimeLeftShort', () => {
  it.each<[number, string]>([
    [0, 'Ready'],
    [-1, 'Ready'],
    [NaN, 'Ready'],
    [30_000, '<1m left'],
    [42 * MIN, '42m left'],
    [6 * HOUR, '6h left'],
    [29 * HOUR + 14 * MIN, '29h left'],
    [71 * HOUR + 59 * MIN, '71h left'],
    [72 * HOUR, '3d left'],
    [9 * DAY + 5 * HOUR, '9d left'],
  ])('%p -> %p', (ms, expected) => {
    expect(formatTimeLeftShort(ms)).toBe(expected);
  });
});

describe('formatHeroCountdown', () => {
  it.each<[number, string]>([
    [0, 'Ready'],
    [Infinity, 'Ready'],
    [59_000, '<1m'],
    [42 * MIN + 5000, '42m'],
    [29 * HOUR + 14 * MIN, '29h 14m'],
    [5 * HOUR, '5h 0m'],
    [72 * HOUR + 3 * HOUR, '3d 3h'],
  ])('%p -> %p', (ms, expected) => {
    expect(formatHeroCountdown(ms)).toBe(expected);
  });
});
