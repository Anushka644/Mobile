// Melt math for frozen items: progress, stages, countdowns, reflection prompts.
// Pure functions only (no React, no stores). All timestamps are epoch milliseconds.

import { COOLDOWN_HOURS, type CooldownKey, type Item } from '../types';

export const MINUTE_MS = 60 * 1000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** The ice cube's visual melt stage, in percent. 100 is reached only once fully thawed. */
export type MeltStage = 0 | 25 | 50 | 75 | 100;

/** The fields the melt timing helpers need; any full `Item` satisfies these. */
export type MeltTiming = Pick<Item, 'frozenAt' | 'thawAt'>;
export type MeltState = Pick<Item, 'thawAt' | 'decision'>;

/**
 * How far an item has melted, in [0, 1]:
 * clamp((now - frozenAt) / (thawAt - frozenAt)).
 * A zero or negative duration counts as fully melted (1). Never returns NaN.
 * Decisions are ignored: this is purely time-based.
 */
export function meltProgress(item: MeltTiming, now: number): number {
  const duration = item.thawAt - item.frozenAt;
  if (!(duration > 0)) return duration <= 0 ? 1 : 0; // NaN duration -> 0
  const progress = (now - item.frozenAt) / duration;
  if (!(progress > 0)) return 0; // also catches NaN
  return progress >= 1 ? 1 : progress;
}

/** Thawed and awaiting a decision: undecided && now >= thawAt. */
export function isReady(item: MeltState, now: number): boolean {
  return !item.decision && now >= item.thawAt;
}

/** Still freezing: undecided && now < thawAt. */
export function isCooling(item: MeltState, now: number): boolean {
  return !item.decision && now < item.thawAt;
}

/**
 * Quantize progress to a melt stage. 100 only when progress >= 1; otherwise floor to
 * the quarter: < .25 -> 0, < .5 -> 25, < .75 -> 50, else 75. NaN/negative -> 0.
 */
export function meltStage(progress: number): MeltStage {
  if (progress >= 1) return 100;
  if (progress >= 0.75) return 75;
  if (progress >= 0.5) return 50;
  if (progress >= 0.25) return 25;
  return 0;
}

/** Milliseconds until the item thaws, never negative (0 once thawed). */
export function timeLeftMs(item: Pick<Item, 'thawAt'>, now: number): number {
  const left = item.thawAt - now;
  return left > 0 ? left : 0; // also maps NaN to 0
}

/**
 * Human countdown, always rounded down:
 *   0 (or less)  -> 'Ready'
 *   < 1 minute   -> '<1m left'
 *   < 1 hour     -> '42m left'
 *   < 24 hours   -> '5h 12m left' ('5h left' when the minutes are 0)
 *   otherwise    -> '3d 4h left'  ('3d left' when the hours are 0)
 * Non-finite input is treated as 'Ready'.
 */
export function formatTimeLeft(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return 'Ready';
  if (ms < MINUTE_MS) return '<1m left';
  if (ms < HOUR_MS) return `${Math.floor(ms / MINUTE_MS)}m left`;
  if (ms < DAY_MS) {
    const hours = Math.floor(ms / HOUR_MS);
    const minutes = Math.floor((ms % HOUR_MS) / MINUTE_MS);
    return minutes > 0 ? `${hours}h ${minutes}m left` : `${hours}h left`;
  }
  const days = Math.floor(ms / DAY_MS);
  const hours = Math.floor((ms % DAY_MS) / HOUR_MS);
  return hours > 0 ? `${days}d ${hours}h left` : `${days}d left`;
}

/** The thaw moment for an item frozen at `frozenAt` with the given cooldown (fixed-length hours). */
export function thawAtFor(frozenAt: number, cooldown: CooldownKey): number {
  return frozenAt + COOLDOWN_HOURS[cooldown] * HOUR_MS;
}

/** Gentle, non-shaming questions shown while an item cools or when it thaws. */
export const REFLECTION_PROMPTS: readonly string[] = [
  'Would you still want it at 2× the price?',
  'Where would it live in your home?',
  'What did you feel right before you froze it?',
  'If it disappeared from the internet tomorrow, would you miss it?',
  'How often would you use it in the next month?',
  'Is there something you already own that does the same job?',
  'What else could this money do for you?',
  'How do you think you’ll feel about it a month from now?',
  'Is it the thing you want, or the feeling of getting it?',
  'What would it make easier in your everyday life?',
  'Would you still want it if nobody else ever saw it?',
  'Could you borrow it, rent it, or find it secondhand?',
  'If a friend were eyeing this, what would you tell them?',
  'Is now the right time, or just a convenient one?',
  'What would make this an easy yes?',
  'Does it fit the life you live day to day?',
];

/** Days since the epoch in the device's local time, so the value ticks over at local midnight. */
function localDayIndex(now: number): number {
  const offsetMs = new Date(now).getTimezoneOffset() * MINUTE_MS;
  return Math.floor((now - offsetMs) / DAY_MS);
}

/** Small stable 32-bit string hash (FNV-1a). */
function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * A reflection prompt for this item, deterministic for a given item and local day.
 * It rotates through the whole list one step per local day; the item id offsets the
 * starting point so different items usually show different prompts on the same day.
 */
export function reflectionPromptFor(item: Pick<Item, 'id'>, now: number): string {
  const count = REFLECTION_PROMPTS.length;
  const day = localDayIndex(now);
  const seed = hashString(String(item.id ?? ''));
  const raw = Number.isFinite(day) ? (day % count) + (seed % count) : 0;
  const index = ((raw % count) + count) % count;
  return REFLECTION_PROMPTS[index];
}
