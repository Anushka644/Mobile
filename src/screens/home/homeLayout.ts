// Home (Freezer) layout + live-update helpers (spec §4.2).

import { FRAME_WIDTH, GUTTER } from '@/components';
import { useNow } from '@/lib/clock';
import { HOUR_MS } from '@/lib/melt';
import type { Item } from '@/types';

/** Gap between the two ItemCard columns, and between rows. */
export const GRID_GAP = 13;
/** ReadyBanners shown before the "+N more" toggle. */
export const MAX_READY = 3;

/** ItemCard width for a 2-column grid: 170 on a 393 frame, narrower on smaller phones. */
export function gridCardWidth(windowWidth: number): number {
  const column = Math.min(windowWidth, FRAME_WIDTH) - GUTTER * 2;
  return Math.floor((column - GRID_GAP) / 2);
}

/** True when an undecided item thaws within the next hour (the countdown pills then tick in minutes). */
export function anyThawingWithinHour(items: readonly Item[], now: number): boolean {
  return items.some((i) => !i.decision && i.thawAt > now && i.thawAt - now <= HOUR_MS);
}

/**
 * App time for Home: re-renders every 30s, or every second while something thaws within the hour,
 * so a card turns Ready on the second it thaws (spec §4.2 "Live updates").
 */
export function useFreezerNow(items: readonly Item[]): number {
  const coarse = useNow(30_000);
  return useNow(anyThawingWithinHour(items, coarse) ? 1000 : 30_000);
}

/** "4 wants cooling · 1 ready to decide" (parts with a zero count are left out). */
export function freezerSubtitle(coolingCount: number, readyCount: number, hasHistory: boolean): string {
  if (coolingCount === 0 && readyCount === 0) return hasHistory ? 'Nothing on ice right now' : 'Nothing on ice yet';
  const parts: string[] = [];
  if (coolingCount > 0) parts.push(`${coolingCount} ${coolingCount === 1 ? 'want' : 'wants'} cooling`);
  if (readyCount > 0) parts.push(`${readyCount} ready to decide`);
  return parts.join(' · ');
}
