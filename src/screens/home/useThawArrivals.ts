// "Thaw arrival" (spec §5): when an item turns ready while you're on Home, its card stays in the
// Cooling grid for a beat — flipping to the Ready variant with a mint flash while the cube's
// sparkles pop in — and only then moves to the Ready section (with a layout animation).

import { useEffect, useState } from 'react';

import type { Item } from '@/types';

/** How long a freshly thawed card lingers in the grid before it moves to "Ready to decide". */
export const ARRIVAL_HOLD_MS = 1500;

export interface FreezerSnapshot {
  items: readonly Item[];
  now: number;
}

/**
 * Ids of items that were cooling in `prev` and are ready (undecided, thawed) at `now`. Pure.
 * Items that are new since `prev`, decided, or were already ready are not arrivals.
 */
export function newlyThawedIds(prev: FreezerSnapshot, items: readonly Item[], now: number): string[] {
  const before = new Map(prev.items.map((i) => [i.id, i]));
  const ids: string[] = [];
  for (const item of items) {
    if (item.decision || now < item.thawAt) continue;
    const was = before.get(item.id);
    if (was && !was.decision && prev.now < was.thawAt) ids.push(item.id);
  }
  return ids;
}

/**
 * Tracks items that just thawed on screen. Returns the ids to keep in the grid (as Ready cards)
 * for ARRIVAL_HOLD_MS. Only items that thaw while `active` (Home focused) count, so a thaw that
 * happened elsewhere (thaw early, fast-forward on the You tab) doesn't replay on return.
 */
export function useThawArrivals(items: readonly Item[], now: number, active: boolean): ReadonlySet<string> {
  const [snapshot, setSnapshot] = useState<FreezerSnapshot>({ items, now });
  const [arriving, setArriving] = useState<readonly string[]>([]);

  // Derive from the previous render (React's "storing information from previous renders" pattern):
  // the card must never leave the grid for a frame, so this can't wait for an effect.
  if (snapshot.items !== items || snapshot.now !== now) {
    const fresh = active ? newlyThawedIds(snapshot, items, now).filter((id) => !arriving.includes(id)) : [];
    setSnapshot({ items, now });
    if (fresh.length > 0) setArriving([...arriving, ...fresh]);
  }

  useEffect(() => {
    if (arriving.length === 0) return;
    const timer = setTimeout(() => setArriving([]), ARRIVAL_HOLD_MS);
    return () => clearTimeout(timer);
  }, [arriving]);

  return new Set(arriving);
}
