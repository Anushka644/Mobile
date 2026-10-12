// Chill app store: items in the freezer + settings, persisted on device with AsyncStorage.
//
// Notifications are NOT handled here. Actions that change an item's thaw time
// (freeze / refreeze / thawEarly / decide / removeItem / resetAll) leave `notificationId`
// alone, so the caller can cancel the old notification and store the new one with
// `setNotificationId`. Actions that change one item return the updated item for that purpose.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  COOLDOWN_HOURS,
  DEFAULT_SETTINGS,
  type Category,
  type CooldownKey,
  type Decision,
  type Goal,
  type Item,
  type Mood,
  type Settings,
} from '../types';
import { buildDemoItems, DEMO_GOAL, isDemoItem } from './demo';

export const STORAGE_KEY = 'chill-store';
export const STORE_VERSION = 1;

const HOUR_MS = 60 * 60 * 1000;

/** The persisted slice of the store (what ends up in AsyncStorage). */
export interface ChillData {
  items: Item[];
  settings: Settings;
}

export interface FreezeInput {
  name: string;
  priceCents: number;
  /** Defaults to `settings.currency`. */
  currency?: string;
  url?: string;
  imageUri?: string;
  category: Category;
  mood?: Mood;
  note?: string;
  /** Defaults to `settings.defaultCooldown`. */
  cooldown?: CooldownKey;
}

/**
 * Any item field except `id`. Optional keys set to `undefined` are removed from the item;
 * `undefined` for a required key (see REQUIRED_ITEM_KEYS) is ignored.
 */
export type ItemPatch = Partial<Omit<Item, 'id'>>;

/** Item fields that must always be present; `updateItem` never deletes them. */
export const REQUIRED_ITEM_KEYS = [
  'name',
  'priceCents',
  'currency',
  'category',
  'frozenAt',
  'thawAt',
  'cooldown',
  'refreezeCount',
] as const satisfies readonly (keyof Omit<Item, 'id'>)[];

export interface ChillActions {
  /** Puts a new item in the freezer and returns it. */
  freeze: (input: FreezeInput, now?: number) => Item;
  /**
   * Freezes an item again: frozenAt = now, new thawAt, refreezeCount + 1, decision cleared.
   * `cooldown` defaults to the item's current cooldown. Returns the updated item.
   * The previous frozenAt is not kept, so timing insights count the item at its refreeze time.
   */
  refreeze: (id: string, cooldown?: CooldownKey, now?: number) => Item | undefined;
  /** Thaws a still-cooling, undecided item right away (thawAt = now). No-op otherwise. */
  thawEarly: (id: string, now?: number) => Item | undefined;
  /** Records the decision for an undecided item (cooling or ready). No-op if already decided. */
  decide: (id: string, decision: Decision, now?: number) => Item | undefined;
  /**
   * Shallow-merges `patch` into the item. Changing `cooldown` (to a different value) on an
   * undecided item without also passing `thawAt` recomputes thawAt = frozenAt + cooldown.
   * `priceCents` is rounded and clamped at 0 like in `freeze`; a non-finite price is ignored.
   */
  updateItem: (id: string, patch: ItemPatch) => Item | undefined;
  /** Deletes the item and returns it (so its notification can be cancelled). */
  removeItem: (id: string) => Item | undefined;
  /** Stores (or clears, with `undefined`) the scheduled notification id for an item. */
  setNotificationId: (id: string, notificationId: string | undefined) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  /** Sets the savings goal, or removes it with `undefined`. */
  setGoal: (goal: Goal | undefined) => void;
  completeOnboarding: () => void;
  /** Deletes every item and restores default settings (onboarded = false). */
  resetAll: () => void;
  /**
   * Loads demo data relative to `now`: replaces any previous demo items (ids `demo-*`), keeps the
   * user's own items, and sets the demo savings goal if no goal exists. Settings are otherwise untouched.
   */
  seedDemo: (now?: number) => void;
}

export type ChillState = ChillData & ChillActions;

// ---------------------------------------------------------------------------
// Helpers

/** Random RFC 4122 v4-style id. Uses crypto.randomUUID when the runtime has it. */
export function createId(): string {
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function thawAtFor(cooldown: CooldownKey, from: number): number {
  return from + COOLDOWN_HOURS[cooldown] * HOUR_MS;
}

/** Copy of `obj` without keys whose value is `undefined` (keeps persisted JSON and equality checks clean). */
function compact<T extends object>(obj: T): T {
  const out = {} as T;
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (obj[key] !== undefined) out[key] = obj[key];
  }
  return out;
}

/** Whole, non-negative cents, or undefined for a non-finite value (NaN from bad input). */
function cleanPrice(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : undefined;
}

/** Trimmed string, or undefined when empty / missing. */
function cleanText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function defaultData(): ChillData {
  return { items: [], settings: { ...DEFAULT_SETTINGS } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Persist `migrate` hook. Version 1 is the first schema, so this only normalizes whatever was stored
 * (missing / malformed fields fall back to defaults). Add `if (version < 2) { ... }` steps here later.
 */
export function migrateChillState(persistedState: unknown, version: number): ChillData {
  const data = isRecord(persistedState) ? persistedState : {};
  // version 0 -> 1: no structural changes.
  void version;
  return {
    items: Array.isArray(data.items) ? (data.items as Item[]) : [],
    settings: { ...DEFAULT_SETTINGS, ...(isRecord(data.settings) ? (data.settings as Partial<Settings>) : {}) },
  };
}

/** Persist `merge` hook: stored settings are layered over defaults so new settings fields get a value. */
function mergePersisted(persistedState: unknown, currentState: ChillState): ChillState {
  if (!isRecord(persistedState)) return currentState;
  const persisted = persistedState as Partial<ChillData>;
  return {
    ...currentState,
    items: Array.isArray(persisted.items) ? persisted.items : currentState.items,
    settings: { ...currentState.settings, ...(isRecord(persisted.settings) ? persisted.settings : {}) },
  };
}

// ---------------------------------------------------------------------------
// Store

export const useChillStore = create<ChillState>()(
  persist(
    (set, get) => {
      /** Applies `fn` to one item; `fn` returns the next item or undefined to skip. */
      const updateOne = (id: string, fn: (item: Item) => Item | undefined): Item | undefined => {
        const current = get().items.find((i) => i.id === id);
        if (!current) return undefined;
        const next = fn(current);
        if (!next) return undefined;
        set((s) => ({ items: s.items.map((i) => (i.id === id ? next : i)) }));
        return next;
      };

      return {
        ...defaultData(),

        freeze: (input, now = Date.now()) => {
          const { settings } = get();
          const cooldown = input.cooldown ?? settings.defaultCooldown;
          const item: Item = compact({
            id: createId(),
            name: input.name.trim(),
            priceCents: cleanPrice(input.priceCents) ?? 0,
            currency: input.currency ?? settings.currency,
            url: cleanText(input.url),
            imageUri: input.imageUri || undefined,
            category: input.category,
            mood: input.mood,
            note: cleanText(input.note),
            frozenAt: now,
            thawAt: thawAtFor(cooldown, now),
            cooldown,
            refreezeCount: 0,
          });
          set((s) => ({ items: [...s.items, item] }));
          return item;
        },

        refreeze: (id, cooldown, now = Date.now()) =>
          updateOne(id, (item) => {
            const { decision: _decision, decidedAt: _decidedAt, ...rest } = item;
            const nextCooldown = cooldown ?? item.cooldown;
            return {
              ...rest,
              cooldown: nextCooldown,
              frozenAt: now,
              thawAt: thawAtFor(nextCooldown, now),
              refreezeCount: item.refreezeCount + 1,
            };
          }),

        thawEarly: (id, now = Date.now()) =>
          updateOne(id, (item) => (item.decision || now >= item.thawAt ? undefined : { ...item, thawAt: now })),

        decide: (id, decision, now = Date.now()) =>
          updateOne(id, (item) => (item.decision ? undefined : { ...item, decision, decidedAt: now })),

        updateItem: (id, patch) =>
          updateOne(id, (item) => {
            const { id: _ignored, ...safePatch } = patch as ItemPatch & { id?: string };
            for (const key of REQUIRED_ITEM_KEYS) {
              if (safePatch[key] === undefined) delete safePatch[key];
            }
            if ('priceCents' in safePatch) {
              const price = cleanPrice(safePatch.priceCents);
              if (price === undefined) delete safePatch.priceCents;
              else safePatch.priceCents = price;
            }
            const next = compact({ ...item, ...safePatch });
            const cooldownChanged = safePatch.cooldown !== undefined && safePatch.cooldown !== item.cooldown;
            if (cooldownChanged && safePatch.thawAt === undefined && !next.decision) {
              next.thawAt = thawAtFor(next.cooldown, next.frozenAt);
            }
            return next;
          }),

        removeItem: (id) => {
          const removed = get().items.find((i) => i.id === id);
          if (removed) set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
          return removed;
        },

        setNotificationId: (id, notificationId) => {
          updateOne(id, (item) => compact({ ...item, notificationId }));
        },

        updateSettings: (patch) => set((s) => ({ settings: compact({ ...s.settings, ...patch }) })),

        setGoal: (goal) => set((s) => ({ settings: compact({ ...s.settings, goal: goal ? { ...goal } : undefined }) })),

        completeOnboarding: () => set((s) => ({ settings: { ...s.settings, onboarded: true } })),

        resetAll: () => set(defaultData()),

        seedDemo: (now = Date.now()) =>
          set((s) => ({
            items: [...s.items.filter((i) => !isDemoItem(i)), ...buildDemoItems(now, s.settings.currency)],
            settings: s.settings.goal ? s.settings : { ...s.settings, goal: { ...DEMO_GOAL } },
          })),
      };
    },
    {
      name: STORAGE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s): ChillData => ({ items: s.items, settings: s.settings }),
      migrate: migrateChillState,
      merge: mergePersisted,
    }
  )
);

// ---------------------------------------------------------------------------
// Hydration

function subscribeHydration(onChange: () => void): () => void {
  const offStart = useChillStore.persist.onHydrate(onChange);
  const offFinish = useChillStore.persist.onFinishHydration(onChange);
  return () => {
    offStart();
    offFinish();
  };
}

function getHydrated(): boolean {
  return useChillStore.persist.hasHydrated();
}

/**
 * True once the stored state has been loaded from AsyncStorage. Gate screens (or the splash
 * screen) on this: writes made before hydration finishes are overwritten by the stored state.
 */
export function useHasHydrated(): boolean {
  return useSyncExternalStore(subscribeHydration, getHydrated, getHydrated);
}
