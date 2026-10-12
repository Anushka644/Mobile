// Chill domain model — shared contract for the whole app.
// All data lives on device; timestamps are epoch milliseconds.

export type CooldownKey = '24h' | '72h' | '7d' | '30d';

export const COOLDOWN_HOURS: Record<CooldownKey, number> = {
  '24h': 24,
  '72h': 72,
  '7d': 168,
  '30d': 720,
};

/** Ordered list of cooldowns, shortest first. */
export const COOLDOWN_KEYS: CooldownKey[] = ['24h', '72h', '7d', '30d'];

export const COOLDOWN_LABELS: Record<CooldownKey, string> = {
  '24h': '24 hours',
  '72h': '72 hours',
  '7d': '7 days',
  '30d': '30 days',
};

export type Mood = 'bored' | 'sad' | 'hyped' | 'stressed' | 'need';

export type Category = 'fashion' | 'tech' | 'home' | 'beauty' | 'food' | 'fun' | 'other';

export type Decision = 'bought' | 'let-go';

export interface Item {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
  url?: string;
  imageUri?: string;
  category: Category;
  mood?: Mood;
  note?: string;
  /**
   * epoch ms — start of the current cooldown. A refreeze resets it (melt progress is measured from it).
   */
  frozenAt: number;
  /**
   * epoch ms — when the item was first frozen (the original impulse moment). Set by `freeze`,
   * preserved by `refreeze`. Optional for items stored before it existed: read it as
   * `firstFrozenAt ?? frozenAt`.
   */
  firstFrozenAt?: number;
  /** epoch ms */
  thawAt: number;
  cooldown: CooldownKey;
  refreezeCount: number;
  decision?: Decision;
  decidedAt?: number;
  notificationId?: string;
}

export interface Goal {
  name: string;
  targetCents: number;
}

export interface Settings {
  /** ISO 4217, default 'USD' */
  currency: string;
  /** default '72h' */
  defaultCooldown: CooldownKey;
  onboarded: boolean;
  notificationsEnabled: boolean;
  goal?: Goal;
  /**
   * Demo "fast-forward" offset added to the device clock, in ms (see src/lib/clock.ts).
   * Optional; a missing value means 0. Persisted, and cleared by `resetAll`.
   */
  timeOffsetMs?: number;
}

export const DEFAULT_SETTINGS: Settings = {
  currency: 'USD',
  defaultCooldown: '72h',
  onboarded: false,
  notificationsEnabled: false,
};

// ---------------------------------------------------------------------------
// Labels

export const MOODS: Mood[] = ['bored', 'sad', 'hyped', 'stressed', 'need'];

export const MOOD_EMOJI: Record<Mood, string> = {
  bored: '😐',
  sad: '😢',
  hyped: '🤩',
  stressed: '😮‍💨',
  need: '✅',
};

export const MOOD_NAMES: Record<Mood, string> = {
  bored: 'Bored',
  sad: 'Sad',
  hyped: 'Hyped',
  stressed: 'Stressed',
  need: 'Need it',
};

/** Emoji + name, e.g. "😐 Bored". */
export const MOOD_LABELS: Record<Mood, string> = {
  bored: '😐 Bored',
  sad: '😢 Sad',
  hyped: '🤩 Hyped',
  stressed: '😮‍💨 Stressed',
  need: '✅ Need it',
};

export const CATEGORIES: Category[] = ['fashion', 'tech', 'home', 'beauty', 'food', 'fun', 'other'];

export const CATEGORY_EMOJI: Record<Category, string> = {
  fashion: '👗',
  tech: '🎧',
  home: '🪴',
  beauty: '💄',
  food: '🍜',
  fun: '🎮',
  other: '📦',
};

export const CATEGORY_NAMES: Record<Category, string> = {
  fashion: 'Fashion',
  tech: 'Tech',
  home: 'Home',
  beauty: 'Beauty',
  food: 'Food',
  fun: 'Fun',
  other: 'Other',
};

/** Emoji + name, e.g. "👗 Fashion". */
export const CATEGORY_LABELS: Record<Category, string> = {
  fashion: '👗 Fashion',
  tech: '🎧 Tech',
  home: '🪴 Home',
  beauty: '💄 Beauty',
  food: '🍜 Food',
  fun: '🎮 Fun',
  other: '📦 Other',
};

// ---------------------------------------------------------------------------
// Derived state (never stored)

/**
 * 'cooling' — undecided and now < thawAt
 * 'ready'   — undecided and now >= thawAt (thawed, awaiting a decision)
 * otherwise the item's decision.
 */
export type ItemStatus = 'cooling' | 'ready' | Decision;

export function getItemStatus(item: Item, now: number = Date.now()): ItemStatus {
  if (item.decision) return item.decision;
  return now >= item.thawAt ? 'ready' : 'cooling';
}
