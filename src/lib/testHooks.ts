// Web-only URL test hooks for screenshots and demos (applied once per page load by app/_layout.tsx):
//
//   ?reset=1     resetAll()                         — wipe items + settings (back to onboarding)
//   ?seed=demo   seedDemo() + completeOnboarding()  — the sample freezer, straight to home
//   ?ff=<hours>  fastForward(hours × 1h)            — move the app clock forward (negative rewinds)
//
// They combine and run in that order: `/?reset=1&seed=demo&ff=24`. Ignored on iOS / Android.

import { Platform } from 'react-native';

import { useChillStore } from '../store/useChillStore';

const HOUR_MS = 60 * 60 * 1000;

export interface TestHooks {
  reset: boolean;
  seed: boolean;
  /** Hours to fast-forward, or null when absent / not a finite number. */
  ffHours: number | null;
}

/** Parses the hook params from a query string ('?seed=demo&ff=24' or 'seed=demo'). Pure. */
export function parseTestHooks(search: string): TestHooks {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const reset = params.get('reset');
  const ff = params.get('ff');
  const ffHours = ff != null && ff.trim() !== '' ? Number(ff) : NaN;
  return {
    reset: reset === '1' || reset === 'true',
    seed: params.get('seed') === 'demo',
    ffHours: Number.isFinite(ffHours) && ffHours !== 0 ? ffHours : null,
  };
}

/** Runs parsed hooks against the store (reset → seed → fast-forward). Returns true if anything ran. */
export function runTestHooks(hooks: TestHooks): boolean {
  const store = useChillStore.getState();
  if (hooks.reset) store.resetAll();
  if (hooks.seed) {
    useChillStore.getState().seedDemo();
    useChillStore.getState().completeOnboarding();
  }
  if (hooks.ffHours != null) useChillStore.getState().fastForward(hooks.ffHours * HOUR_MS);
  return hooks.reset || hooks.seed || hooks.ffHours != null;
}

let applied = false;

/**
 * Web only: applies the hooks in `window.location.search` once per page load. Call after the store
 * has hydrated (writes made before hydration are overwritten). Returns the hooks that ran, or null.
 */
export function applyWebTestHooks(): TestHooks | null {
  if (applied || Platform.OS !== 'web' || typeof window === 'undefined') return null;
  applied = true;
  const hooks = parseTestHooks(window.location?.search ?? '');
  return runTestHooks(hooks) ? hooks : null;
}

/**
 * Web only: applies the URL hooks as soon as the store has hydrated — synchronously inside zustand's
 * hydration callback, so the first render that sees `hydrated === true` already sees the hooked
 * state (no flash of onboarding). Call once at module level in app/_layout.tsx. No-op on native.
 */
export function installWebTestHooks(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  if (useChillStore.persist.hasHydrated()) applyWebTestHooks();
  else {
    const off = useChillStore.persist.onFinishHydration(() => {
      off();
      applyWebTestHooks();
    });
  }
}

/** Test helper: lets applyWebTestHooks run again. */
export function __resetTestHooksForTests(): void {
  applied = false;
}
