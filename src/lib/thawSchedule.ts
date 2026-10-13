// The one place that turns an item's thaw time into an OS notification time.
//
// `item.thawAt` is in *app* time (device clock + the demo fast-forward offset, see ./clock.ts), but
// the OS fires notifications on the device clock. Every scheduler goes through here so a
// fast-forwarded app never schedules a reminder `offset` too late (after the item already shows
// Ready).

import type { Item } from '../types';

import { now, timeOffsetMs } from './clock';
import { scheduleThawNotification } from './notifications';

/** Device-clock time at which an item's thaw notification should fire. Pure. */
export function deviceThawAt(thawAt: number, offsetMs: number): number {
  return thawAt - offsetMs;
}

/** Schedules the thaw notification for `item` (app-time thawAt). Resolves to its id, or null. */
export function scheduleItemThawNotification(item: Pick<Item, 'id' | 'name' | 'thawAt'>): Promise<string | null> {
  const offset = timeOffsetMs();
  return scheduleThawNotification(
    { id: item.id, name: item.name, thawAt: deviceThawAt(item.thawAt, offset) },
    now() - offset
  );
}
