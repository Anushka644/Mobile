// Web-only URL test hooks for screenshots and demos (applied once per page load by app/_layout.tsx):
//
//   ?reset=1     resetAll()                         — wipe items + settings (back to onboarding)
//   ?seed=demo   seedDemo() + completeOnboarding()  — the sample freezer, straight to home
//   ?ff=<hours>  fastForward(hours × 1h)            — move the app clock forward (negative rewinds)
//
// They combine and run in that order: `/?reset=1&seed=demo&ff=24`. Ignored on iOS / Android.
//
// QA builds (`__DEV__`, or an export with EXPO_PUBLIC_QA=1 such as scripts/shoot.mjs) honour all
// three. A public production build only honours `?seed=demo`, and only for a visitor who hasn't
// onboarded yet — so a shared portfolio link opens straight into the sample freezer, while no link
// can wipe a returning visitor's freezer or move their clock.
// Once read, the hook params are stripped from the address bar, so a reload never re-applies them.

import { Platform } from 'react-native';

import { useChillStore } from '../store/useChillStore';

const HOUR_MS = 60 * 60 * 1000;

/** QA surfaces (all URL hooks, /dev/kit) are on in dev and in exports built with EXPO_PUBLIC_QA=1. */
export const QA_BUILD: boolean = __DEV__ || process.env.EXPO_PUBLIC_QA === '1';

/** The query params the hooks read (stripped from the URL once applied). */
export const TEST_HOOK_PARAMS = ['reset', 'seed', 'ff'] as const;

export interface TestHooks {
  reset: boolean;
  seed: boolean;
  /** Hours to fast-forward, or null when absent / not a finite number. */
  ffHours: number | null;
}

const NO_HOOKS: TestHooks = { reset: false, seed: false, ffHours: null };

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

/**
 * The hooks a build may run. QA builds: all of them. Public builds: only `seed`, and only for a
 * visitor who hasn't onboarded (a fresh visit from a shared `?seed=demo` link). Pure.
 */
export function allowedTestHooks(hooks: TestHooks, qa: boolean, onboarded: boolean): TestHooks {
  if (qa) return hooks;
  return { ...NO_HOOKS, seed: hooks.seed && !onboarded };
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

/** `search` without the hook params ('?seed=demo&x=1' → '?x=1', '?ff=2' → ''). Pure. */
export function stripTestHookParams(search: string): string {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  for (const key of TEST_HOOK_PARAMS) params.delete(key);
  const rest = params.toString();
  return rest ? `?${rest}` : '';
}

/** Whether a query string carries any hook param. Pure. */
export function hasTestHookParams(search: string): boolean {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return TEST_HOOK_PARAMS.some((key) => params.has(key));
}

let pending: TestHooks | null = null;
let applied = false;

/**
 * Web only: reads the hooks from the address bar (once per page load) and strips them from it with
 * history.replaceState, so a reload — or the router re-serialising the URL — can't run them again.
 */
function captureWebTestHooks(): void {
  if (pending || Platform.OS !== 'web' || typeof window === 'undefined' || !window.location) return;
  const { pathname, search, hash } = window.location;
  pending = parseTestHooks(search ?? '');
  if (hasTestHookParams(search ?? '')) {
    try {
      window.history?.replaceState(window.history.state, '', `${pathname}${stripTestHookParams(search)}${hash}`);
    } catch {
      // Sandboxed frames can refuse replaceState; the hooks still run once for this page load.
    }
  }
}

/**
 * Web only: applies the hooks captured from the URL once per page load. Call after the store has
 * hydrated (writes made before hydration are overwritten). Returns the hooks that ran, or null.
 */
export function applyWebTestHooks(): TestHooks | null {
  if (applied || Platform.OS !== 'web' || typeof window === 'undefined') return null;
  captureWebTestHooks();
  applied = true;
  const hooks = allowedTestHooks(pending ?? NO_HOOKS, QA_BUILD, useChillStore.getState().settings.onboarded);
  return runTestHooks(hooks) ? hooks : null;
}

/**
 * Web only: captures the URL hooks right away (and cleans the address bar), then applies them as
 * soon as the store has hydrated — synchronously inside zustand's hydration callback, so the first
 * render that sees `hydrated === true` already sees the hooked state (no flash of onboarding).
 * Call once at module level in app/_layout.tsx. No-op on native.
 */
export function installWebTestHooks(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  captureWebTestHooks();
  if (useChillStore.persist.hasHydrated()) applyWebTestHooks();
  else {
    const off = useChillStore.persist.onFinishHydration(() => {
      off();
      applyWebTestHooks();
    });
  }
}

/** Test helper: lets the hooks be captured and applied again. */
export function __resetTestHooksForTests(): void {
  applied = false;
  pending = null;
}
