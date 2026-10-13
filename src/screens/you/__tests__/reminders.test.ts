// Thaw-reminder bookkeeping across the three schedulers, with the demo clock fast-forwarded,
// and the sample-freezer reseed.
import * as Notifications from 'expo-notifications';

import { now } from '@/lib/clock';
import { HOUR_MS } from '@/lib/melt';
import { scheduleReminder } from '@/screens/freeze/scheduleReminder';
import { rescheduleThawReminder } from '@/screens/thawed/thawReminder';
import { isDemoItem } from '@/store/demo';
import { useChillStore } from '@/store/useChillStore';

import { cancelAllReminders, loadSampleFreezer, scheduleMissingReminders } from '../reminders';

const store = () => useChillStore.getState();
const schedule = jest.mocked(Notifications.scheduleNotificationAsync);
const cancel = jest.mocked(Notifications.cancelScheduledNotificationAsync);

/** The device-clock fire time of the n-th scheduled notification (0-based). */
function firedAt(n: number): number {
  const request = schedule.mock.calls[n]?.[0] as { trigger: { date: Date } } | undefined;
  if (!request) throw new Error(`no scheduled notification #${n}`);
  return request.trigger.date.getTime();
}

beforeEach(() => {
  store().resetAll();
  store().completeOnboarding();
  store().updateSettings({ notificationsEnabled: true });
  jest.clearAllMocks();
});

describe('thaw reminders with the demo clock fast-forwarded', () => {
  const OFFSET = 24 * HOUR_MS;

  /** Device time at which an item frozen now (app time) with a 24h cooldown turns Ready. */
  const readyOnDevice = (thawAt: number) => thawAt - OFFSET;

  beforeEach(() => store().fastForward(OFFSET));

  it('a fresh freeze fires when the item turns Ready, not a day late', async () => {
    const item = store().freeze({ name: 'Retro camera', priceCents: 12000, category: 'tech', cooldown: '24h' });
    await scheduleReminder(item, false);
    expect(firedAt(0)).toBe(readyOnDevice(item.thawAt));
    expect(item.thawAt - now()).toBeGreaterThan(23 * HOUR_MS);
  });

  it('a refreeze fires when the item turns Ready', async () => {
    const first = store().freeze({ name: 'Lamp', priceCents: 6500, category: 'home', cooldown: '24h' });
    const again = store().refreeze(first.id);
    if (!again) throw new Error('refreeze failed');
    await rescheduleThawReminder(again);
    expect(firedAt(0)).toBe(readyOnDevice(again.thawAt));
  });

  it('turning reminders on schedules every cooling item on the device clock', async () => {
    const item = store().freeze({ name: 'Jacket', priceCents: 9000, category: 'fashion', cooldown: '24h' });
    expect(await scheduleMissingReminders()).toBe(1);
    expect(firedAt(0)).toBe(readyOnDevice(item.thawAt));
  });
});

describe('Load sample freezer', () => {
  it('cancels the replaced sample items’ reminders and schedules the new ones', async () => {
    store().seedDemo();
    await scheduleMissingReminders();
    const firstIds = store()
      .items.filter((i) => isDemoItem(i) && i.notificationId)
      .map((i) => i.notificationId);
    expect(firstIds.length).toBeGreaterThan(0);
    jest.clearAllMocks();

    await loadSampleFreezer();

    expect(cancel.mock.calls.map((c) => c[0]).sort()).toEqual([...firstIds].sort());
    const fresh = store().items.filter((i) => isDemoItem(i) && !i.decision && i.thawAt > now());
    expect(fresh.length).toBeGreaterThan(0);
    expect(fresh.every((i) => i.notificationId)).toBe(true);
    expect(schedule).toHaveBeenCalledTimes(fresh.length);

    // Nothing is orphaned: switching reminders off can cancel every one of them.
    jest.clearAllMocks();
    await cancelAllReminders();
    expect(cancel).toHaveBeenCalledTimes(fresh.length);
  });

  it('keeps your own items’ reminders and schedules nothing when reminders are off', async () => {
    const mine = store().freeze({ name: 'Mine', priceCents: 100, category: 'other', cooldown: '24h' });
    store().setNotificationId(mine.id, 'mine-id');
    store().updateSettings({ notificationsEnabled: false });
    await loadSampleFreezer();
    expect(cancel).not.toHaveBeenCalled();
    expect(schedule).not.toHaveBeenCalled();
    expect(store().items.find((i) => i.id === mine.id)?.notificationId).toBe('mine-id');
  });
});
