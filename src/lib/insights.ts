// Insights over the user's items: decisions, money, moods, categories, timing, streaks.
// Pure functions only (no React, no stores).
//
// Money totals assume a single currency (the app's setting) and simply sum
// `priceCents`; items in other currencies are summed as-is rather than converted.
// Non-finite prices or timestamps (bad input) are skipped instead of producing NaN.
// Time buckets use the device's local time zone.

import { CATEGORIES, MOODS, type Category, type Decision, type Item, type Mood } from '../types';

// ---------------------------------------------------------------------------
// Decisions and money

export interface KeepRate {
  /** Items decided 'bought'. */
  bought: number;
  /** Items decided 'let-go'. */
  letGo: number;
  /** bought + letGo. */
  decided: number;
  /**
   * Share of decisions where the money was kept, i.e. letGo / decided, in [0, 1].
   * null when nothing has been decided yet.
   */
  rate: number | null;
}

/** Counts decisions; `rate` is the share of decided items the user let go (kept the money). */
export function keepRate(items: readonly Item[]): KeepRate {
  let bought = 0;
  let letGo = 0;
  for (const item of items) {
    if (item.decision === 'bought') bought++;
    else if (item.decision === 'let-go') letGo++;
  }
  const decided = bought + letGo;
  return { bought, letGo, decided, rate: decided > 0 ? letGo / decided : null };
}

function hasOwn(obj: object, key: unknown): boolean {
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(obj, key);
}

function priceOf(item: Item): number {
  return Number.isFinite(item.priceCents) ? item.priceCents : 0;
}

function sumCentsWhere(items: readonly Item[], decision: Decision): number {
  let total = 0;
  for (const item of items) if (item.decision === decision) total += priceOf(item);
  return total;
}

/** Sum of priceCents over items the user let go: the "Saved" total. */
export function savedCents(items: readonly Item[]): number {
  return sumCentsWhere(items, 'let-go');
}

/** Sum of priceCents over items the user bought. */
export function spentCents(items: readonly Item[]): number {
  return sumCentsWhere(items, 'bought');
}

// ---------------------------------------------------------------------------
// Moods and categories

/** How many items were frozen in each mood (every mood key present; items without a mood are skipped). */
export function byMood(items: readonly Item[]): Record<Mood, number> {
  const counts = Object.fromEntries(MOODS.map((m) => [m, 0])) as Record<Mood, number>;
  for (const item of items) {
    if (item.mood && hasOwn(counts, item.mood)) counts[item.mood]++;
  }
  return counts;
}

export interface CategoryTotal {
  count: number;
  /** Sum of priceCents of every item in the category, whatever its status. */
  cents: number;
}

/** Item count and total cents per category (every category key present; unknown categories count as 'other'). */
export function byCategory(items: readonly Item[]): Record<Category, CategoryTotal> {
  const totals = Object.fromEntries(CATEGORIES.map((c) => [c, { count: 0, cents: 0 }])) as Record<
    Category,
    CategoryTotal
  >;
  for (const item of items) {
    const bucket = totals[hasOwn(totals, item.category) ? item.category : 'other'];
    bucket.count++;
    bucket.cents += priceOf(item);
  }
  return totals;
}

// ---------------------------------------------------------------------------
// Timing (when do impulses strike?)
//
// Buckets by `frozenAt`. A refreeze resets frozenAt to the refreeze time (melt progress is measured
// from it), so a refrozen item counts at its latest (re)freeze, not at the original impulse moment,
// which is not stored. Keeping that would need a new optional Item field such as `firstFrozenAt`.

/** Short weekday labels, Monday first (index matches byWeekday / peakImpulseWindow). */
export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
/** Full weekday names, Monday first. */
export const WEEKDAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

/** 0 = Monday … 6 = Sunday, in local time; null for an invalid timestamp. */
export function weekdayIndex(epochMs: number): number | null {
  const day = new Date(epochMs).getDay();
  return Number.isNaN(day) ? null : (day + 6) % 7;
}

/** Local hour 0–23; null for an invalid timestamp. */
function hourOf(epochMs: number): number | null {
  const hour = new Date(epochMs).getHours();
  return Number.isNaN(hour) ? null : hour;
}

/** 24 buckets: how many items were frozen in each local hour of the day (index = hour). */
export function byHourOfDay(items: readonly Item[]): number[] {
  const buckets = new Array<number>(24).fill(0);
  for (const item of items) {
    const hour = hourOf(item.frozenAt);
    if (hour !== null) buckets[hour]++;
  }
  return buckets;
}

/** 7 buckets, Monday first: how many items were frozen on each local weekday. */
export function byWeekday(items: readonly Item[]): number[] {
  const buckets = new Array<number>(7).fill(0);
  for (const item of items) {
    const day = weekdayIndex(item.frozenAt);
    if (day !== null) buckets[day]++;
  }
  return buckets;
}

export interface ImpulseWindow {
  /** 0 = Monday … 6 = Sunday (see WEEKDAY_SHORT / WEEKDAY_NAMES). */
  weekday: number;
  /** Local hour 0–23 (see formatHour). */
  hour: number;
  /** Items frozen in that weekday + hour slot. */
  count: number;
}

/**
 * The weekday + hour slot in which the most items were frozen, or null when there are
 * none. Ties go to the slot whose weekday and hour are busiest overall, then to the
 * earliest slot in the week (Monday 0:00 first). Callers may want to hide it until
 * `count` >= 2.
 */
export function peakImpulseWindow(items: readonly Item[]): ImpulseWindow | null {
  const grid = new Map<number, number>();
  const weekdays = new Array<number>(7).fill(0);
  const hours = new Array<number>(24).fill(0);
  for (const item of items) {
    const weekday = weekdayIndex(item.frozenAt);
    const hour = hourOf(item.frozenAt);
    if (weekday === null || hour === null) continue;
    const slot = weekday * 24 + hour;
    grid.set(slot, (grid.get(slot) ?? 0) + 1);
    weekdays[weekday]++;
    hours[hour]++;
  }
  let best: ImpulseWindow | null = null;
  let bestTieScore = -1;
  const slots = [...grid.keys()].sort((a, b) => a - b);
  for (const slot of slots) {
    const count = grid.get(slot)!;
    const weekday = Math.floor(slot / 24);
    const hour = slot % 24;
    const tieScore = weekdays[weekday] + hours[hour];
    if (!best || count > best.count || (count === best.count && tieScore > bestTieScore)) {
      best = { weekday, hour, count };
      bestTieScore = tieScore;
    }
  }
  return best;
}

/** '12am', '9am', '12pm', '10pm'. */
export function formatHour(hour: number): string {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  const suffix = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${suffix}`;
}

// ---------------------------------------------------------------------------
// Streaks

/** When a decision happened, for ordering: decidedAt, falling back to thawAt then frozenAt. */
function decisionTime(item: Item): number {
  for (const t of [item.decidedAt, item.thawAt, item.frozenAt]) {
    if (typeof t === 'number' && Number.isFinite(t)) return t;
  }
  return 0;
}

/** Decided items, most recent decision first (stable for equal times). */
export function decisionsNewestFirst(items: readonly Item[]): Item[] {
  return items
    .filter((item) => item.decision === 'bought' || item.decision === 'let-go')
    .map((item, index) => ({ item, index, time: decisionTime(item) }))
    .sort((a, b) => b.time - a.time || a.index - b.index)
    .map(({ item }) => item);
}

/**
 * Current streak: how many of the most recent decisions in a row were 'let-go',
 * counting back from the newest until the first 'bought'. Undecided items don't break it.
 */
export function letGoStreak(items: readonly Item[]): number {
  let streak = 0;
  for (const item of decisionsNewestFirst(items)) {
    if (item.decision !== 'let-go') break;
    streak++;
  }
  return streak;
}

/** Longest run of consecutive 'let-go' decisions ever. */
export function longestLetGoStreak(items: readonly Item[]): number {
  let longest = 0;
  let run = 0;
  for (const item of decisionsNewestFirst(items)) {
    run = item.decision === 'let-go' ? run + 1 : 0;
    if (run > longest) longest = run;
  }
  return longest;
}
