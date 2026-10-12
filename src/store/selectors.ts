// Pure selectors over the Chill store state.
//
// Every selector that returns an array/object returns the SAME reference for the same `items`
// array whenever the result is unchanged (including across different `now` values that don't cross
// a thaw time). That makes them safe to use directly in a zustand hook, which needs stable results:
//   const cooling = useChillStore((s) => selectCooling(s, now));

import { savedCents } from '../lib/insights';
import type { Item, Settings } from '../types';

type ItemsState = { items: Item[] };
type GoalState = { items: Item[]; settings: Pick<Settings, 'goal'> };

export interface GoalProgress {
  /** Sum of let-go prices, in cents. */
  saved: number;
  /** Goal target, in cents. */
  target: number;
  /** Percentage 0–100 (clamped at 100; not rounded). */
  pct: number;
}

// ---------------------------------------------------------------------------
// Reference stabilization

const MAX_RECENT = 8;

function sameItems(a: Item[], b: Item[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Returns a previously returned result (for this `items` array) equal to `next`, else caches `next`. */
function stabilize<R>(
  cache: WeakMap<Item[], R[]>,
  items: Item[],
  next: R,
  equal: (a: R, b: R) => boolean
): R {
  let recent = cache.get(items);
  if (!recent) {
    recent = [];
    cache.set(items, recent);
  }
  const hit = recent.find((r) => equal(r, next));
  if (hit !== undefined) return hit;
  recent.push(next);
  if (recent.length > MAX_RECENT) recent.shift();
  return next;
}

function listSelector(compute: (items: Item[], now: number) => Item[]) {
  const cache = new WeakMap<Item[], Item[][]>();
  return (items: Item[], now: number) => stabilize(cache, items, compute(items, now), sameItems);
}

const byThawAsc = (a: Item, b: Item) => a.thawAt - b.thawAt;
const byDecidedDesc = (a: Item, b: Item) => (b.decidedAt ?? 0) - (a.decidedAt ?? 0);

const cooling = listSelector((items, now) =>
  items.filter((i) => !i.decision && now < i.thawAt).sort(byThawAsc)
);
const ready = listSelector((items, now) =>
  items.filter((i) => !i.decision && now >= i.thawAt).sort(byThawAsc)
);
const decided = listSelector((items) => items.filter((i) => i.decision).sort(byDecidedDesc));
const letGo = listSelector((items) => items.filter((i) => i.decision === 'let-go').sort(byDecidedDesc));
const bought = listSelector((items) => items.filter((i) => i.decision === 'bought').sort(byDecidedDesc));

// ---------------------------------------------------------------------------
// Selectors

/** Undecided items still freezing (now < thawAt), soonest to thaw first. */
export function selectCooling(state: ItemsState, now: number = Date.now()): Item[] {
  return cooling(state.items, now);
}

/** Undecided items that have thawed (now >= thawAt) and await a decision, longest-waiting first. */
export function selectReady(state: ItemsState, now: number = Date.now()): Item[] {
  return ready(state.items, now);
}

/** All decided items (bought or let go), most recent decision first. */
export function selectDecided(state: ItemsState): Item[] {
  return decided(state.items, 0);
}

/** Items the user let go, most recent first. */
export function selectLetGo(state: ItemsState): Item[] {
  return letGo(state.items, 0);
}

/** Items the user bought, most recent first. */
export function selectBought(state: ItemsState): Item[] {
  return bought(state.items, 0);
}

/**
 * Total price of let-go items, in cents (summed as-is, regardless of each item's currency).
 * Same as insights' savedCents: a non-finite price is skipped instead of turning the total into NaN.
 */
export function selectSavedCents(state: ItemsState): number {
  return savedCents(state.items);
}

const goalCache = new WeakMap<Item[], GoalProgress[]>();
const sameProgress = (a: GoalProgress, b: GoalProgress) =>
  a.saved === b.saved && a.target === b.target && a.pct === b.pct;

/** Progress toward the savings goal, or null when there is no goal (or its target is not positive). */
export function selectGoalProgress(state: GoalState): GoalProgress | null {
  const goal = state.settings.goal;
  if (!goal || !(goal.targetCents > 0)) return null;
  const saved = selectSavedCents(state);
  const target = goal.targetCents;
  const pct = Math.min(100, (saved / target) * 100);
  return stabilize(goalCache, state.items, { saved, target, pct }, sameProgress);
}

/** The item with this id, if any. */
export function selectItem(state: ItemsState, id: string): Item | undefined {
  return state.items.find((i) => i.id === id);
}
