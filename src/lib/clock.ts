// The app clock: device time plus the persisted demo "fast-forward" offset (settings.timeOffsetMs).
//
// Every screen must read time through `now()` (event handlers, effects) or `useNow()` (render),
// never `Date.now()` directly, so the You tab's "Fast-forward 1 day" (store action `fastForward`)
// and the web test hook `?ff=<hours>` move the whole app forward consistently.
//
//   const t = useNow();                       // re-renders every 30s (and when the offset changes)
//   const t = useNow(anySoon ? 1000 : 30000); // tick faster when something thaws within the hour
//   freeze(input, now());                     // or just freeze(input): store actions default to now()

import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { useChillStore } from '../store/useChillStore';
import type { Settings } from '../types';

/** The offset (ms) stored in settings, or 0 when missing / invalid. */
export function offsetOf(settings: Pick<Settings, 'timeOffsetMs'> | undefined): number {
  const offset = settings?.timeOffsetMs;
  return typeof offset === 'number' && Number.isFinite(offset) ? offset : 0;
}

/** The current demo time offset in ms (0 unless fast-forwarded). */
export function timeOffsetMs(): number {
  return offsetOf(useChillStore.getState().settings);
}

/** App time in epoch ms: `Date.now() + settings.timeOffsetMs`. Use instead of Date.now(). */
export function now(): number {
  return Date.now() + timeOffsetMs();
}

// ---------------------------------------------------------------------------
// Shared tickers: one interval per distinct `intervalMs`, shared by every subscriber, so all
// components using the same interval update in the same frame.

interface Ticker {
  value: number;
  listeners: Set<() => void>;
  timer: ReturnType<typeof setInterval> | null;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => number;
}

const tickers = new Map<number, Ticker>();

function refresh(ticker: Ticker): void {
  ticker.value = Date.now();
  ticker.listeners.forEach((listener) => listener());
}

let appStateSubscribed = false;

/** Refresh every ticker when the app returns to the foreground (timers pause in the background). */
function ensureAppStateListener(): void {
  if (appStateSubscribed) return;
  appStateSubscribed = true;
  try {
    AppState.addEventListener('change', (state) => {
      if (state === 'active') tickers.forEach((t) => t.listeners.size > 0 && refresh(t));
    });
  } catch {
    // AppState unavailable (some test environments): ticking still works.
  }
}

function getTicker(intervalMs: number): Ticker {
  const existing = tickers.get(intervalMs);
  if (existing) return existing;
  const ticker: Ticker = {
    value: Date.now(),
    listeners: new Set(),
    timer: null,
    subscribe: (listener) => {
      if (ticker.listeners.size === 0) {
        // First subscriber after a pause: start fresh (React re-reads the snapshot after subscribing).
        ticker.value = Date.now();
        if (intervalMs > 0) ticker.timer = setInterval(() => refresh(ticker), intervalMs);
        ensureAppStateListener();
      }
      ticker.listeners.add(listener);
      return () => {
        ticker.listeners.delete(listener);
        if (ticker.listeners.size === 0 && ticker.timer !== null) {
          clearInterval(ticker.timer);
          ticker.timer = null;
        }
      };
    },
    getSnapshot: () => ticker.value,
  };
  tickers.set(intervalMs, ticker);
  return ticker;
}

/**
 * App time (`now()`) that re-renders the component every `intervalMs` (default 30s), and
 * immediately whenever the fast-forward offset changes. `intervalMs <= 0` never ticks (the value
 * only changes with the offset). Components sharing an interval tick together.
 */
export function useNow(intervalMs: number = 30_000): number {
  const ms = Number.isFinite(intervalMs) && intervalMs > 0 ? Math.max(16, Math.round(intervalMs)) : 0;
  const ticker = getTicker(ms);
  const deviceNow = useSyncExternalStore(ticker.subscribe, ticker.getSnapshot, ticker.getSnapshot);
  const offset = useChillStore((s) => offsetOf(s.settings));
  return deviceNow + offset;
}

/** The current fast-forward offset in ms, reactive (0 unless fast-forwarded). */
export function useTimeOffset(): number {
  return useChillStore((s) => offsetOf(s.settings));
}

/** Test helper: stops every ticker and forgets them. Not for app code. */
export function __resetClockForTests(): void {
  tickers.forEach((t) => {
    if (t.timer !== null) clearInterval(t.timer);
  });
  tickers.clear();
}
