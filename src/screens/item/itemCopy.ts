// Copy helpers for the Item — cooling screen (spec §4.4). Pure; local time zone, en-US words.

import { formatDuration, formatShortDate, formatWeekdayTime } from '@/lib/format';
import { DAY_MS } from '@/lib/melt';
import type { Item, Mood } from '@/types';

/** Nav title: "Frozen 2 days ago" ("Refrozen …" after a refreeze, measured from the current cooldown). */
export function frozenLabel(item: Pick<Item, 'frozenAt' | 'refreezeCount'>, now: number): string {
  return `${item.refreezeCount > 0 ? 'Refrozen' : 'Frozen'} ${formatDuration(now - item.frozenAt)} ago`;
}

/** Mood chip text: "Felt hyped" (and "Felt like a need" for need). */
export const MOOD_CHIP_LABELS: Record<Mood, string> = {
  bored: 'Felt bored',
  sad: 'Felt sad',
  hyped: 'Felt hyped',
  stressed: 'Felt stressed',
  need: 'Felt like a need',
};

function startOfLocalDay(epochMs: number): number {
  const d = new Date(epochMs);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Calendar days from `now` to `then` in local time (0 = same day, 1 = tomorrow). DST-safe. */
export function localDaysBetween(now: number, then: number): number {
  return Math.round((startOfLocalDay(then) - startOfLocalDay(now)) / DAY_MS);
}

/**
 * When it thaws, for the caption: "today 9:41 PM", "tomorrow 9:41 PM", "Thu 9:41 PM" (within a
 * week), else "Nov 11". Render as a Caption (upper-cased).
 */
export function thawMoment(thawAt: number, now: number): string {
  const days = localDaysBetween(now, thawAt);
  const weekdayTime = formatWeekdayTime(thawAt); // 'Thu 9:41 PM'
  const time = weekdayTime.slice(weekdayTime.indexOf(' ') + 1);
  if (days <= 0) return `today ${time}`;
  if (days === 1) return `tomorrow ${time}`;
  if (days < 7) return weekdayTime;
  return formatShortDate(thawAt);
}

/** Melted percent for the caption: floored, and never 100 while still cooling. */
export function meltedPercent(progress: number): number {
  if (!Number.isFinite(progress) || progress <= 0) return 0;
  return Math.min(99, Math.floor(progress * 100 + 1e-9)); // epsilon: 0.58 * 100 = 57.999…
}

/** "58% melted · thaws Thu 9:41 PM" (Caption upper-cases it); "Fully melted · ready to decide" once thawed. */
export function meltCaption(progress: number, thawAt: number, now: number, thawed = false): string {
  if (thawed || now >= thawAt) return 'Fully melted · ready to decide';
  return `${meltedPercent(progress)}% melted · thaws ${thawMoment(thawAt, now)}`;
}

/** Spoken countdown for screen readers: "29 hours 14 minutes left". */
export function countdownA11y(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return 'Ready to decide';
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return 'Less than a minute left';
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const parts = d > 0 ? [unit(d, 'day'), h > 0 ? unit(h, 'hour') : ''] : [h > 0 ? unit(h, 'hour') : '', unit(m, 'minute')];
  return `${parts.filter(Boolean).join(' ')} left`;
}
