// Small, pure date/time copy helpers shared by screens (spec §4 copy). Local time zone, en-US words.

import { DAY_MS, HOUR_MS, MINUTE_MS } from './melt';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;

/**
 * Elapsed time in words, rounded down: 'a moment' (< 1 min), '12 minutes', '1 hour', '5 hours',
 * '1 day', '3 days'. Use as "Frozen {formatDuration(now - frozenAt)} ago".
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < MINUTE_MS) return 'a moment';
  if (ms < HOUR_MS) return plural(Math.floor(ms / MINUTE_MS), 'minute');
  if (ms < DAY_MS) return plural(Math.floor(ms / HOUR_MS), 'hour');
  return plural(Math.floor(ms / DAY_MS), 'day');
}

/** Compact "ago": 'just now', '12m ago', '2h ago', '3d ago'. */
export function formatAgo(ms: number): string {
  if (!Number.isFinite(ms) || ms < MINUTE_MS) return 'just now';
  if (ms < HOUR_MS) return `${Math.floor(ms / MINUTE_MS)}m ago`;
  if (ms < DAY_MS) return `${Math.floor(ms / HOUR_MS)}h ago`;
  return `${Math.floor(ms / DAY_MS)}d ago`;
}

/** Countdown without the " left" suffix, for the big Item timer: '29h 14m', '3d 4h', '42m', '<1m', 'Ready'. */
export function formatCountdown(timeLeft: string): string {
  return timeLeft.replace(/ left$/, '');
}

/**
 * Compact time left for the ItemCard pill (the Figma shows "6h left", "29h left"): hours up to 72h,
 * then days. 'Ready' (≤ 0), '<1m left', '42m left', '29h left', '4d left'. Rounded down.
 */
export function formatTimeLeftShort(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return 'Ready';
  if (ms < MINUTE_MS) return '<1m left';
  if (ms < HOUR_MS) return `${Math.floor(ms / MINUTE_MS)}m left`;
  if (ms < 72 * HOUR_MS) return `${Math.floor(ms / HOUR_MS)}h left`;
  return `${Math.floor(ms / DAY_MS)}d left`;
}

/**
 * The big Item countdown (Figma "29h 14m"): '42m', '29h 14m' (hours up to 72h), then '4d 6h'.
 * '<1m' under a minute, 'Ready' at ≤ 0. Rounded down.
 */
export function formatHeroCountdown(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return 'Ready';
  if (ms < MINUTE_MS) return '<1m';
  if (ms < HOUR_MS) return `${Math.floor(ms / MINUTE_MS)}m`;
  if (ms < 72 * HOUR_MS) return `${Math.floor(ms / HOUR_MS)}h ${Math.floor((ms % HOUR_MS) / MINUTE_MS)}m`;
  return `${Math.floor(ms / DAY_MS)}d ${Math.floor((ms % DAY_MS) / HOUR_MS)}h`;
}

export type TimeOfDayPhrase = 'late-night scroll' | 'morning browse' | 'afternoon break' | 'evening wind-down';

/** Spec §4.5: 22:00–04:59 late-night scroll, 05–11:59 morning browse, 12–17:59 afternoon break, 18–21:59 evening wind-down. */
export function timeOfDayPhrase(epochMs: number): TimeOfDayPhrase {
  const hour = new Date(epochMs).getHours();
  if (Number.isNaN(hour) || hour >= 22 || hour < 5) return 'late-night scroll';
  if (hour < 12) return 'morning browse';
  if (hour < 18) return 'afternoon break';
  return 'evening wind-down';
}

/** 'Tuesday, Oct 14' (render it as a Caption, which upper-cases it). */
export function formatDayCaption(epochMs: number): string {
  const d = new Date(epochMs);
  if (Number.isNaN(d.getTime())) return '';
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** 'Oct 12' */
export function formatShortDate(epochMs: number): string {
  const d = new Date(epochMs);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** 'Thu 9:41 PM' (render as Caption for "THAWS THU 9:41 PM"). */
export function formatWeekdayTime(epochMs: number): string {
  const d = new Date(epochMs);
  if (Number.isNaN(d.getTime())) return '';
  const h = d.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${WEEKDAYS[d.getDay()].slice(0, 3)} ${h12}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
}
