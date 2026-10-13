import type { Item } from '@/types';

import {
  frozenAgo,
  itemNoun,
  letGoLabel,
  moodLine,
  openableUrl,
  refreezeLabel,
  thawedQuestion,
  urlHost,
} from '../thawedCopy';

const HOUR = 60 * 60 * 1000;

/** Local time today at hh:mm (time-of-day phrases are local). */
function at(hour: number, minute = 0): number {
  const d = new Date(2026, 9, 10);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}

describe('itemNoun', () => {
  it('lower-cases sentence-case names', () => {
    expect(itemNoun('Chunky sneakers')).toBe('chunky sneakers');
    expect(itemNoun('Mushroom lamp')).toBe('mushroom lamp');
    expect(itemNoun('Noise-cancelling headphones')).toBe('noise-cancelling headphones');
    expect(itemNoun('Air fryer XL')).toBe('air fryer XL');
    expect(itemNoun('lamp')).toBe('lamp');
  });

  it('keeps proper names, acronyms and brand casing', () => {
    expect(itemNoun('Nike Dunk Low')).toBe('Nike Dunk Low');
    expect(itemNoun('LEGO flower bouquet')).toBe('LEGO flower bouquet');
    expect(itemNoun('iPad mini')).toBe('iPad mini');
    expect(itemNoun('Dyson Airwrap')).toBe('Dyson Airwrap');
  });

  it('drops a leading article and tidies whitespace', () => {
    expect(itemNoun('The perfect tote')).toBe('perfect tote');
    expect(itemNoun('  A   new phone ')).toBe('new phone');
    expect(itemNoun('   ')).toBe('it');
  });
});

describe('thawedQuestion', () => {
  it('asks about the item', () => {
    expect(thawedQuestion('Chunky sneakers')).toBe('Still want the chunky sneakers?');
    expect(thawedQuestion('')).toBe('Still want it?');
  });
});

describe('context card copy', () => {
  const base = { frozenAt: at(23, 30), mood: 'hyped' as const };

  it('measures "frozen ago" from the first freeze', () => {
    expect(frozenAgo(base, base.frozenAt + 74 * HOUR)).toBe('Frozen 3 days ago');
    expect(frozenAgo({ frozenAt: at(9), firstFrozenAt: at(9) - 5 * 24 * HOUR }, at(9) + HOUR)).toBe(
      'Frozen 5 days ago'
    );
    expect(frozenAgo(base, base.frozenAt + 5 * HOUR)).toBe('Frozen 5 hours ago');
  });

  it('pairs the mood with the time-of-day phrase of the impulse', () => {
    expect(moodLine(base)).toBe('Felt hyped · late-night scroll');
    expect(moodLine({ frozenAt: at(8), mood: 'bored' })).toBe('Felt bored · morning browse');
    expect(moodLine({ frozenAt: at(13), mood: 'need' })).toBe('Felt like a need · afternoon break');
    expect(moodLine({ frozenAt: at(19) })).toBe('Evening wind-down');
    // A refreeze keeps the original moment.
    expect(moodLine({ frozenAt: at(13), firstFrozenAt: at(2), mood: 'sad' })).toBe('Felt sad · late-night scroll');
  });
});

describe('action labels', () => {
  it('shows the saving on the let-go button', () => {
    expect(letGoLabel({ priceCents: 14000, currency: 'USD' } satisfies Pick<Item, 'priceCents' | 'currency'>)).toBe(
      'Let it go · save $140'
    );
    expect(letGoLabel({ priceCents: 8950, currency: 'USD' })).toBe('Let it go · save $89.50');
  });

  it('names the refreeze in "more" time', () => {
    expect(refreezeLabel('72h')).toBe('Refreeze for 3 more days');
    expect(refreezeLabel('24h')).toBe('Refreeze for 24 more hours');
    expect(refreezeLabel('7d')).toBe('Refreeze for 1 more week');
    expect(refreezeLabel('30d')).toBe('Refreeze for 30 more days');
  });
});

describe('openableUrl / urlHost', () => {
  it('accepts http(s) and bare domains only', () => {
    expect(openableUrl('https://nike.com/t/dunk')).toBe('https://nike.com/t/dunk');
    expect(openableUrl(' nike.com/t/dunk ')).toBe('https://nike.com/t/dunk');
    expect(openableUrl('javascript:alert(1)')).toBeNull();
    expect(openableUrl('not a link')).toBeNull();
    expect(openableUrl(undefined)).toBeNull();
  });

  it('shows a short host', () => {
    expect(urlHost('https://www.etsy.com/listing/1')).toBe('etsy.com');
    expect(urlHost('http://shop.example.co.uk:8080/x')).toBe('shop.example.co.uk');
  });
});
