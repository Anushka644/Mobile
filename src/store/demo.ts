// Demo data for Chill: a believable freezer + history so every screen has something to show.
// Pure — depends only on src/types.ts. The store loads it via `seedDemo(now)`.

import {
  COOLDOWN_HOURS,
  type Category,
  type CooldownKey,
  type Decision,
  type Goal,
  type Item,
  type Mood,
} from '../types';

const HOUR_MS = 60 * 60 * 1000;

/** Every demo item id starts with this prefix, so demo data can be replaced without touching real items. */
export const DEMO_ID_PREFIX = 'demo-';

/** Asset keys for the bundled demo illustrations (one per demo item). */
export type DemoImageKey =
  | 'sneakers'
  | 'airfryer'
  | 'headphones'
  | 'jacket'
  | 'lamp'
  | 'watch'
  | 'skincare'
  | 'lego'
  | 'espresso'
  | 'tee'
  | 'chair'
  | 'phonecase'
  | 'scarf';

/**
 * Demo item name -> illustration asset key. `Item` has no image-key field, so the UI looks a
 * demo item's picture up here by name (e.g. `DEMO_IMAGE_KEYS[item.name]`) when `imageUri` is unset.
 */
export const DEMO_IMAGE_KEYS: Record<string, DemoImageKey> = {
  'Chunky sneakers': 'sneakers',
  'Air fryer XL': 'airfryer',
  'Noise-cancelling headphones': 'headphones',
  'Puffer jacket': 'jacket',
  'Mushroom lamp': 'lamp',
  'Smart watch': 'watch',
  'Skincare set': 'skincare',
  'LEGO flower bouquet': 'lego',
  'Espresso machine': 'espresso',
  'Vintage tee': 'tee',
  'Gaming chair': 'chair',
  'Phone case': 'phonecase',
  'Cashmere scarf': 'scarf',
};

/** Savings goal applied by `seedDemo` when the user has no goal yet ($934 saved of $1,200 = ~78%). */
export const DEMO_GOAL: Goal = { name: 'Weekend in Lisbon', targetCents: 120000 };

export function isDemoItem(item: Pick<Item, 'id'>): boolean {
  return item.id.startsWith(DEMO_ID_PREFIX);
}

interface DemoBase {
  key: DemoImageKey;
  name: string;
  priceCents: number;
  category: Category;
  mood: Mood;
  cooldown: CooldownKey;
  note?: string;
  url?: string;
  refreezeCount?: number;
}

/** Still in the freezer: frozen `elapsedHours` ago, undecided. */
interface ActiveSpec extends DemoBase {
  elapsedHours: number;
}

/** History: frozen `daysAgo` calendar days ago at local `hour:minute`, decided `decideAfterHours` after thawing. */
interface HistorySpec extends DemoBase {
  daysAgo: number;
  hour: number;
  minute: number;
  decision: Decision;
  decideAfterHours: number;
}

// Melt stages (elapsed / cooldown): sneakers 83%, air fryer 25%, headphones 50%, jacket 7%.
// Mushroom lamp thawed 2h ago and is waiting for a decision.
const ACTIVE: ActiveSpec[] = [
  {
    key: 'sneakers',
    name: 'Chunky sneakers',
    priceCents: 14000,
    category: 'fashion',
    mood: 'hyped',
    cooldown: '72h',
    elapsedHours: 60,
    note: 'Saw them in a 1am haul video.',
  },
  {
    key: 'airfryer',
    name: 'Air fryer XL',
    priceCents: 8900,
    category: 'home',
    mood: 'bored',
    cooldown: '24h',
    elapsedHours: 6,
  },
  {
    key: 'headphones',
    name: 'Noise-cancelling headphones',
    priceCents: 24900,
    category: 'tech',
    mood: 'stressed',
    cooldown: '7d',
    elapsedHours: 84,
    note: 'Open office is loud. Is it the headphones or the job?',
  },
  {
    key: 'jacket',
    name: 'Puffer jacket',
    priceCents: 18000,
    category: 'fashion',
    mood: 'sad',
    cooldown: '30d',
    elapsedHours: 50,
    refreezeCount: 1,
  },
  {
    key: 'lamp',
    name: 'Mushroom lamp',
    priceCents: 6500,
    category: 'home',
    mood: 'hyped',
    cooldown: '72h',
    elapsedHours: 74,
  },
];

// 6 let go ($934 saved), 2 bought ($74). Late-night freezes dominate, on purpose: the smart watch and
// the skincare set are 7 days apart in the same 11pm hour, so peakImpulseWindow has a count of 2.
// The three most recent decisions are let-go, so letGoStreak shows a live streak of 3.
const HISTORY: HistorySpec[] = [
  {
    key: 'watch',
    name: 'Smart watch',
    priceCents: 19900,
    category: 'tech',
    mood: 'hyped',
    cooldown: '72h',
    daysAgo: 24,
    hour: 23,
    minute: 10,
    decision: 'let-go',
    decideAfterHours: 4,
  },
  {
    key: 'espresso',
    name: 'Espresso machine',
    priceCents: 32900,
    category: 'home',
    mood: 'bored',
    cooldown: '7d',
    daysAgo: 26,
    hour: 10,
    minute: 30,
    decision: 'let-go',
    decideAfterHours: 1,
    refreezeCount: 1,
  },
  {
    key: 'skincare',
    name: 'Skincare set',
    priceCents: 5400,
    category: 'beauty',
    mood: 'stressed',
    cooldown: '24h',
    daysAgo: 17,
    hour: 23,
    minute: 40,
    decision: 'let-go',
    decideAfterHours: 9,
  },
  {
    key: 'lego',
    name: 'LEGO flower bouquet',
    priceCents: 4900,
    category: 'fun',
    mood: 'sad',
    cooldown: '72h',
    daysAgo: 15,
    hour: 20,
    minute: 15,
    decision: 'bought',
    decideAfterHours: 2,
    note: "Mum's birthday — still a yes after three days.",
  },
  {
    key: 'chair',
    name: 'Gaming chair',
    priceCents: 21900,
    category: 'home',
    mood: 'bored',
    cooldown: '7d',
    daysAgo: 13,
    hour: 1,
    minute: 20,
    decision: 'let-go',
    decideAfterHours: 6,
  },
  {
    key: 'tee',
    name: 'Vintage tee',
    priceCents: 3800,
    category: 'fashion',
    mood: 'hyped',
    cooldown: '24h',
    daysAgo: 10,
    hour: 0,
    minute: 45,
    decision: 'let-go',
    decideAfterHours: 3,
  },
  {
    key: 'scarf',
    name: 'Cashmere scarf',
    priceCents: 9500,
    category: 'fashion',
    mood: 'sad',
    cooldown: '72h',
    daysAgo: 8,
    hour: 23,
    minute: 30,
    decision: 'let-go',
    decideAfterHours: 5,
  },
  {
    key: 'phonecase',
    name: 'Phone case',
    priceCents: 2500,
    category: 'tech',
    mood: 'need',
    cooldown: '24h',
    daysAgo: 11,
    hour: 12,
    minute: 5,
    decision: 'bought',
    decideAfterHours: 2,
    note: 'Old one cracked.',
  },
];

/** Local wall-clock time `hour:minute`, `daysAgo` calendar days before `now` (same weekday every 7 days, DST-safe). */
function atLocalTime(now: number, daysAgo: number, hour: number, minute: number): number {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}

function baseItem(spec: DemoBase, currency: string, frozenAt: number): Item {
  const item: Item = {
    id: DEMO_ID_PREFIX + spec.key,
    name: spec.name,
    priceCents: spec.priceCents,
    currency,
    category: spec.category,
    mood: spec.mood,
    frozenAt,
    thawAt: frozenAt + COOLDOWN_HOURS[spec.cooldown] * HOUR_MS,
    cooldown: spec.cooldown,
    refreezeCount: spec.refreezeCount ?? 0,
  };
  if (spec.note) item.note = spec.note;
  if (spec.url) item.url = spec.url;
  return item;
}

/**
 * Builds the demo freezer relative to `now`: 4 cooling items at different melt stages,
 * 1 ready item, and 8 decided history items spread over the last ~4 weeks. Covers all 5 moods
 * and 5 categories (fashion, tech, home, beauty, fun; no food or other).
 * Ids are stable (`demo-<key>`), so seeding twice yields the same items.
 */
export function buildDemoItems(now: number = Date.now(), currency: string = 'USD'): Item[] {
  const active = ACTIVE.map((spec) => baseItem(spec, currency, now - spec.elapsedHours * HOUR_MS));
  const history = HISTORY.map((spec) => {
    const item = baseItem(spec, currency, atLocalTime(now, spec.daysAgo, spec.hour, spec.minute));
    item.decision = spec.decision;
    item.decidedAt = item.thawAt + spec.decideAfterHours * HOUR_MS;
    return item;
  });
  return [...active, ...history];
}
