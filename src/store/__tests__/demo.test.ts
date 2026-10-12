import { letGoStreak, peakImpulseWindow } from '../../lib/insights';
import { CATEGORIES, getItemStatus, MOODS } from '../../types';
import { buildDemoItems, DEMO_GOAL, DEMO_ID_PREFIX, DEMO_IMAGE_KEYS, isDemoItem } from '../demo';
import { selectCooling, selectGoalProgress, selectReady, selectSavedCents } from '../selectors';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = Date.UTC(2026, 9, 12, 12, 0, 0);

describe('buildDemoItems', () => {
  const items = buildDemoItems(NOW);

  it('builds 13 items with stable, unique demo ids', () => {
    expect(items).toHaveLength(13);
    expect(new Set(items.map((i) => i.id)).size).toBe(13);
    expect(items.every((i) => i.id.startsWith(DEMO_ID_PREFIX) && isDemoItem(i))).toBe(true);
    expect(buildDemoItems(NOW)).toEqual(items);
  });

  it('has 4 cooling items at different melt stages and 1 ready item', () => {
    const cooling = selectCooling({ items }, NOW);
    expect(cooling.map((i) => i.name).sort()).toEqual(
      ['Air fryer XL', 'Chunky sneakers', 'Noise-cancelling headphones', 'Puffer jacket'].sort()
    );
    const melted = cooling.map((i) => (NOW - i.frozenAt) / (i.thawAt - i.frozenAt));
    expect(new Set(melted.map((m) => Math.round(m * 10))).size).toBe(4);
    for (const m of melted) {
      expect(m).toBeGreaterThan(0);
      expect(m).toBeLessThan(1);
    }
    expect(selectReady({ items }, NOW).map((i) => i.name)).toEqual(['Mushroom lamp']);
  });

  it('uses the specified names, prices, categories and moods for the active items', () => {
    const byName = Object.fromEntries(items.map((i) => [i.name, i]));
    expect(byName['Chunky sneakers']).toMatchObject({ priceCents: 14000, category: 'fashion', mood: 'hyped' });
    expect(byName['Air fryer XL']).toMatchObject({ priceCents: 8900, category: 'home', mood: 'bored' });
    expect(byName['Noise-cancelling headphones']).toMatchObject({ priceCents: 24900, category: 'tech', mood: 'stressed' });
    expect(byName['Puffer jacket']).toMatchObject({ priceCents: 18000, category: 'fashion', mood: 'sad' });
    expect(byName['Mushroom lamp']).toMatchObject({ priceCents: 6500, category: 'home', mood: 'hyped' });
  });

  it('has 8 decided history items, mostly let go, spread over the last few weeks', () => {
    const decided = items.filter((i) => i.decision);
    expect(decided.map((i) => i.name).sort()).toEqual(
      [
        'Cashmere scarf',
        'Espresso machine',
        'Gaming chair',
        'LEGO flower bouquet',
        'Phone case',
        'Skincare set',
        'Smart watch',
        'Vintage tee',
      ].sort()
    );
    expect(decided.filter((i) => i.decision === 'let-go')).toHaveLength(6);
    for (const i of decided) {
      expect(i.decidedAt).toBeGreaterThanOrEqual(i.thawAt);
      expect(i.decidedAt).toBeLessThan(NOW);
      expect(i.frozenAt).toBeGreaterThan(NOW - 30 * DAY);
      expect(getItemStatus(i, NOW)).toBe(i.decision);
    }
    const days = new Set(decided.map((i) => Math.floor((NOW - i.frozenAt) / DAY)));
    expect(days.size).toBeGreaterThanOrEqual(6);
    const hours = new Set(decided.map((i) => new Date(i.frozenAt).getHours()));
    expect(hours.size).toBeGreaterThanOrEqual(5);
  });

  it('varies moods and categories', () => {
    expect(new Set(items.map((i) => i.mood)).size).toBe(MOODS.length);
    expect([...new Set(items.map((i) => i.category))].sort()).toEqual(
      ['beauty', 'fashion', 'fun', 'home', 'tech'].sort()
    );
    for (const i of items) expect(CATEGORIES).toContain(i.category);
  });

  it('shows a live let-go streak and a late-night peak window', () => {
    expect(letGoStreak(items)).toBe(3);
    expect(peakImpulseWindow(items)!.count).toBeGreaterThanOrEqual(2);
    // Smart watch and Skincare set always share a weekday + 11pm slot (calendar days, DST-safe).
    const byName = Object.fromEntries(items.map((i) => [i.name, new Date(i.frozenAt)]));
    const watch = byName['Smart watch'];
    const skincare = byName['Skincare set'];
    expect([watch.getDay(), watch.getHours()]).toEqual([skincare.getDay(), 23]);
    expect(skincare.getHours()).toBe(23);
  });

  it('computes thawAt from the cooldown and keeps every timestamp in the past or near future', () => {
    const hours = { '24h': 24, '72h': 72, '7d': 168, '30d': 720 } as const;
    for (const i of items) {
      expect(i.thawAt - i.frozenAt).toBe(hours[i.cooldown] * HOUR);
      expect(i.frozenAt).toBeLessThan(NOW);
      expect(i.currency).toBe('USD');
    }
  });

  it('saves $934 toward the demo goal', () => {
    expect(selectSavedCents({ items })).toBe(93400);
    const progress = selectGoalProgress({ items, settings: { goal: DEMO_GOAL } });
    expect(progress).toEqual({ saved: 93400, target: 120000, pct: (93400 / 120000) * 100 });
  });

  it('uses the given currency', () => {
    expect(buildDemoItems(NOW, 'EUR').every((i) => i.currency === 'EUR')).toBe(true);
  });
});

describe('DEMO_IMAGE_KEYS', () => {
  it('maps every demo item name to an image key', () => {
    const names = buildDemoItems(NOW).map((i) => i.name);
    expect(Object.keys(DEMO_IMAGE_KEYS).sort()).toEqual([...names].sort());
    expect(DEMO_IMAGE_KEYS['Chunky sneakers']).toBe('sneakers');
    expect(DEMO_IMAGE_KEYS['Air fryer XL']).toBe('airfryer');
    expect(DEMO_IMAGE_KEYS['Noise-cancelling headphones']).toBe('headphones');
    expect(DEMO_IMAGE_KEYS['Puffer jacket']).toBe('jacket');
    expect(DEMO_IMAGE_KEYS['Mushroom lamp']).toBe('lamp');
    expect(new Set(Object.values(DEMO_IMAGE_KEYS)).size).toBe(names.length);
  });
});

describe('isDemoItem', () => {
  it('detects demo ids', () => {
    expect(isDemoItem({ id: 'demo-lamp' })).toBe(true);
    expect(isDemoItem({ id: '3f2a-demo' })).toBe(false);
  });
});
