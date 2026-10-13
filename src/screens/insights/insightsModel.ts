// View model for the Insights tab (spec §4.8, design/exports/06-insights@2x.png).
// Pure: turns the item list into the copy and numbers each card renders, on top of src/lib/insights.

import {
  byCategory,
  byMood,
  byWeekday,
  keepRate,
  letGoStreak,
  longestLetGoStreak,
  peakImpulseWindow,
  savedCents,
  WEEKDAY_NAMES,
} from '@/lib/insights';
import { formatMoney } from '@/lib/money';
import { CATEGORIES, CATEGORY_NAMES, MOODS, MOOD_NAMES, type Category, type Item, type Mood } from '@/types';

/** Decisions needed before the stats show (spec: empty state with fewer than 2). */
export const MIN_DECISIONS = 2;

/** One-letter weekday labels, Monday first (the chart columns). */
export const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

/** Tallest bar (the busiest weekday) and the stub drawn for an empty day (a dot as wide as a bar), in pt. */
export const BAR_MAX_HEIGHT = 104;
export const BAR_MIN_HEIGHT = 8;

export interface HeroStat {
  /** Caption above the title. */
  eyebrow: string;
  /** "You let go of 6 of 8 wants". */
  title: string;
  /** "That’s $934 you didn’t spend." */
  line: string;
  /** Share let go, 0..1 (the ring's ice arc). */
  letGoShare: number;
  /** "75%". */
  percent: string;
}

export interface WeekdayBar {
  /** 'M', 'T', … */
  letter: string;
  /** 'Monday', … (screen readers). */
  name: string;
  count: number;
  /** Bar height in pt (BAR_MIN_HEIGHT … BAR_MAX_HEIGHT). */
  height: number;
  /** The peak impulse weekday (peakImpulseWindow, count ≥ 2): the ink bar with the hour label. */
  peak: boolean;
}

export interface MoodRow {
  mood: Mood;
  name: string;
  count: number;
  /** "3 wants". */
  countLabel: string;
  /** Bar fill 0..1: share of the busiest mood, scaled so the longest bar leaves a little track. */
  fill: number;
  /** Share of this mood's decided wants that were let go (0..100), or null when none decided yet. */
  letGoPct: number | null;
}

export interface CategoryTile {
  category: Category;
  name: string;
  count: number;
  /** "3 wants · $412". */
  detail: string;
}

export interface Streak {
  /** Longest run of let-gos in a row. */
  longest: number;
  /** The run you're on now. */
  current: number;
  /** "3 let-gos in a row". */
  title: string;
  /** Supporting line under the title. */
  line: string;
}

export interface InsightsModel {
  decided: number;
  /** False while there are fewer than MIN_DECISIONS decisions (show the empty state). */
  enough: boolean;
  hero: HeroStat;
  weekdays: WeekdayBar[];
  /** "Your peak: Sunday around 11 PM", or a gentle placeholder until a weekday + hour repeats. */
  peakCaption: string;
  /** "11 PM" label over the peak bar; null until there's a pattern (a slot with 2+ freezes). */
  peakHour: string | null;
  moods: MoodRow[];
  categories: CategoryTile[];
  streak: Streak;
}

const plural = (n: number, one: string, many: string = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** '11 PM', '12 AM', '9 AM' (the Figma tooltip style). */
export function formatHourLabel(hour: number): string {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Bar heights for weekday counts: the busiest day is BAR_MAX_HEIGHT, empty days a BAR_MIN_HEIGHT stub. */
export function barHeights(counts: readonly number[]): number[] {
  const max = Math.max(0, ...counts);
  return counts.map((c) => (max > 0 && c > 0 ? Math.max(BAR_MIN_HEIGHT, (c / max) * BAR_MAX_HEIGHT) : BAR_MIN_HEIGHT));
}

/** The longest mood bar fills this much of its track (the PNG leaves a sliver of track showing). */
const MOOD_FILL_MAX = 0.9;

function heroStat(items: readonly Item[], currency: string): HeroStat {
  const rate = keepRate(items);
  const saved = savedCents(items);
  const share = rate.rate ?? 0;
  const title =
    rate.letGo > 0
      ? `You let go of ${rate.letGo} of ${plural(rate.decided, 'want')}`
      : `You decided on ${plural(rate.decided, 'want')}`;
  const line =
    saved > 0
      ? `That’s ${formatMoney(saved, currency)} you didn’t spend.`
      : 'Every yes was a considered one.';
  return { eyebrow: 'So far', title, line, letGoShare: share, percent: `${Math.round(share * 100)}%` };
}

function moodRows(items: readonly Item[]): MoodRow[] {
  const counts = byMood(items);
  const max = Math.max(0, ...MOODS.map((m) => counts[m]));
  return MOODS.filter((m) => counts[m] > 0)
    .map((mood) => {
      const decided = items.filter((i) => i.mood === mood && (i.decision === 'let-go' || i.decision === 'bought'));
      const letGo = decided.filter((i) => i.decision === 'let-go').length;
      return {
        mood,
        name: MOOD_NAMES[mood],
        count: counts[mood],
        countLabel: plural(counts[mood], 'want'),
        fill: max > 0 ? (counts[mood] / max) * MOOD_FILL_MAX : 0,
        letGoPct: decided.length > 0 ? Math.round((letGo / decided.length) * 100) : null,
      };
    })
    .sort((a, b) => b.count - a.count || MOODS.indexOf(a.mood) - MOODS.indexOf(b.mood));
}

function categoryTiles(items: readonly Item[], currency: string): CategoryTile[] {
  const totals = byCategory(items);
  return CATEGORIES.filter((c) => totals[c].count > 0)
    .map((category) => ({
      category,
      name: CATEGORY_NAMES[category],
      count: totals[category].count,
      detail: `${plural(totals[category].count, 'want')} · ${formatMoney(totals[category].cents, currency, { decimals: 'never' })}`,
      cents: totals[category].cents,
    }))
    .sort((a, b) => b.cents - a.cents || b.count - a.count || CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category))
    .map(({ cents: _cents, ...tile }) => tile);
}

function streak(items: readonly Item[]): Streak {
  const longest = longestLetGoStreak(items);
  const current = letGoStreak(items);
  if (longest === 0) {
    return {
      longest,
      current,
      title: 'No let-go streak yet',
      line: 'Your next let-go starts one.',
    };
  }
  const title = `${plural(longest, 'let-go')} in a row`;
  const line =
    current === longest
      ? current === 1
        ? 'And it’s your latest decision.'
        : 'You’re on it right now. Keep it cool.'
      : current > 0
        ? `You’re ${plural(current, 'let-go')} into a new run.`
        : 'Your next let-go starts a new run.';
  return { longest, current, title, line };
}

/** Everything the Insights screen shows, from the items and the display currency. */
export function buildInsights(items: readonly Item[], currency: string): InsightsModel {
  const { decided } = keepRate(items);
  const peak = peakImpulseWindow(items);
  const counts = byWeekday(items);
  const heights = barHeights(counts);
  const patterned = peak != null && peak.count >= 2;

  return {
    decided,
    enough: decided >= MIN_DECISIONS,
    hero: heroStat(items, currency),
    weekdays: counts.map((count, i) => ({
      letter: WEEKDAY_LETTERS[i],
      name: WEEKDAY_NAMES[i],
      count,
      height: heights[i],
      peak: patterned && peak.weekday === i,
    })),
    peakCaption: patterned
      ? `Your peak: ${WEEKDAY_NAMES[peak.weekday]} around ${formatHourLabel(peak.hour)}`
      : 'Your peak shows up after a few more freezes',
    peakHour: patterned ? formatHourLabel(peak.hour) : null,
    moods: moodRows(items),
    categories: categoryTiles(items, currency),
    streak: streak(items),
  };
}

// ---------------------------------------------------------------------------
// Donut geometry

export interface ArcSegment {
  /** Start angle in degrees, clockwise from 12 o'clock. */
  start: number;
  /** Sweep in degrees (> 0). */
  sweep: number;
}

/**
 * The keep-rate ring as two arcs from 12 o'clock, clockwise: let-go then bought,
 * each trimmed by half of `gapDeg` at both ends so a thin separator shows between them. A share of
 * 0 or 1 gives one full ring and no gaps. Null for an empty arc.
 */
export function donutArcs(letGoShare: number, gapDeg = 3): { letGo: ArcSegment | null; bought: ArcSegment | null } {
  const share = Number.isFinite(letGoShare) ? Math.min(1, Math.max(0, letGoShare)) : 0;
  if (share >= 1) return { letGo: { start: 0, sweep: 360 }, bought: null };
  if (share <= 0) return { letGo: null, bought: { start: 0, sweep: 360 } };
  const a = share * 360;
  const half = gapDeg / 2;
  const seg = (start: number, sweep: number): ArcSegment | null =>
    sweep - gapDeg > 0.5 ? { start: start + half, sweep: sweep - gapDeg } : { start, sweep: Math.max(0.5, sweep) };
  return { letGo: seg(0, a), bought: seg(a, 360 - a) };
}

/** SVG path for an arc of a circle centred at (c, c) with radius r (stroke it). */
export function arcPath(c: number, r: number, seg: ArcSegment): string {
  if (seg.sweep >= 359.99) {
    // A full circle as two half arcs (a single arc with equal endpoints draws nothing).
    return `M ${c} ${c - r} A ${r} ${r} 0 1 1 ${c} ${c + r} A ${r} ${r} 0 1 1 ${c} ${c - r}`;
  }
  const point = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return `${round(c + r * Math.cos(rad))} ${round(c + r * Math.sin(rad))}`;
  };
  const large = seg.sweep > 180 ? 1 : 0;
  return `M ${point(seg.start)} A ${r} ${r} 0 ${large} 1 ${point(seg.start + seg.sweep)}`;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
