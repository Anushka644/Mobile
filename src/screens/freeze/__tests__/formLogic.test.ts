import {
  autoCategory,
  centsToPriceInput,
  displayUrl,
  formatThawMoment,
  isDraftValid,
  isFirstOwnFreeze,
  LINK_ERROR,
  linkError,
  normalizeUrl,
  PRICE_ERRORS,
  PRICE_MAX_CENTS,
  priceError,
  sanitizePriceInput,
  validPriceCents,
} from '../formLogic';

const HOUR = 60 * 60 * 1000;

describe('sanitizePriceInput', () => {
  it('drops currency marks and letters', () => {
    expect(sanitizePriceInput('$140')).toBe('140');
    expect(sanitizePriceInput('€ 89,50')).toBe('89,50');
    expect(sanitizePriceInput('abc')).toBe('');
  });

  it('collapses spaces and trims the start', () => {
    expect(sanitizePriceInput('  1  234')).toBe('1 234');
  });

  it('caps the length', () => {
    expect(sanitizePriceInput('1'.repeat(40))).toHaveLength(14);
  });
});

describe('centsToPriceInput', () => {
  it('prints whole amounts without decimals', () => {
    expect(centsToPriceInput(14000)).toBe('140');
    expect(centsToPriceInput(8950)).toBe('89.50');
    expect(centsToPriceInput(0)).toBe('');
    expect(centsToPriceInput(Number.NaN)).toBe('');
  });

  it('round-trips through validPriceCents', () => {
    for (const cents of [1, 99, 14000, 8950, 123456]) expect(validPriceCents(centsToPriceInput(cents))).toBe(cents);
  });
});

describe('price validation', () => {
  it('accepts positive amounts', () => {
    expect(validPriceCents('140')).toBe(14000);
    expect(validPriceCents('89,50')).toBe(8950);
    expect(validPriceCents('1,234.56')).toBe(123456);
    expect(priceError('140')).toBeNull();
  });

  it('treats empty as not-an-error but not valid', () => {
    expect(priceError('')).toBeNull();
    expect(priceError('   ')).toBeNull();
    expect(validPriceCents('')).toBeNull();
  });

  it('explains what is wrong', () => {
    expect(priceError('1.2.3')).toBe(PRICE_ERRORS.invalid);
    expect(priceError('0')).toBe(PRICE_ERRORS.zero);
    expect(priceError('0.00')).toBe(PRICE_ERRORS.zero);
    expect(priceError(String(PRICE_MAX_CENTS))).toBe(PRICE_ERRORS.tooLarge);
    expect(validPriceCents('0')).toBeNull();
  });
});

describe('normalizeUrl', () => {
  it('keeps full links', () => {
    expect(normalizeUrl('https://www.nike.com/t/chunky-sneakers')).toBe('https://www.nike.com/t/chunky-sneakers');
    expect(normalizeUrl(' http://ikea.com ')).toBe('http://ikea.com');
  });

  it('adds https to bare links', () => {
    expect(normalizeUrl('nike.com/t/chunky-sneakers')).toBe('https://nike.com/t/chunky-sneakers');
    expect(normalizeUrl('amazon.co.uk/dp/B0BDHWDR12')).toBe('https://amazon.co.uk/dp/B0BDHWDR12');
  });

  it('rejects things that are not web links', () => {
    expect(normalizeUrl('')).toBeNull();
    expect(normalizeUrl('sneakers')).toBeNull();
    expect(normalizeUrl('nike com')).toBeNull();
    expect(normalizeUrl('mailto:hi@example.com')).toBeNull();
    expect(normalizeUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeUrl('https://nike')).toBeNull();
  });

  it('reports errors only for non-empty bad input', () => {
    expect(linkError('')).toBeNull();
    expect(linkError('nike.com')).toBeNull();
    expect(linkError('not a link')).toBe(LINK_ERROR);
  });
});

describe('displayUrl', () => {
  it('shortens a link for the clipboard card', () => {
    expect(displayUrl('https://www.nike.com/t/chunky-sneakers/')).toBe('nike.com/t/chunky-sneakers');
    expect(displayUrl('http://shop.example.com/p/lamp?ref=abc#top')).toBe('shop.example.com/p/lamp');
  });
});

describe('isDraftValid', () => {
  it('needs a name and a price above zero', () => {
    expect(isDraftValid({ name: 'Chunky sneakers', price: '140', link: '' })).toBe(true);
    expect(isDraftValid({ name: '  ', price: '140', link: '' })).toBe(false);
    expect(isDraftValid({ name: 'Lamp', price: '', link: '' })).toBe(false);
    expect(isDraftValid({ name: 'Lamp', price: '0', link: '' })).toBe(false);
  });

  it('rejects an invalid optional link', () => {
    expect(isDraftValid({ name: 'Lamp', price: '89', link: 'nike.com' })).toBe(true);
    expect(isDraftValid({ name: 'Lamp', price: '89', link: 'oops' })).toBe(false);
  });
});

describe('autoCategory', () => {
  it('guesses from the name first', () => {
    expect(autoCategory('Chunky sneakers', '')).toBe('fashion');
    expect(autoCategory('Gaming headset', '')).toBe('tech');
  });

  it('falls back to the link', () => {
    expect(autoCategory('Gift for mum', 'ikea.com/p/lamp-123')).toBe('home');
    expect(autoCategory('', 'https://www.sephora.com/product/serum')).toBe('beauty');
  });

  it('is other when nothing matches', () => {
    expect(autoCategory('Thing', '')).toBe('other');
    expect(autoCategory('Thing', 'not a link')).toBe('other');
  });
});

describe('isFirstOwnFreeze', () => {
  it('ignores demo items', () => {
    expect(isFirstOwnFreeze([])).toBe(true);
    expect(isFirstOwnFreeze([{ id: 'demo-1' }, { id: 'demo-2' }])).toBe(true);
    expect(isFirstOwnFreeze([{ id: 'demo-1' }, { id: 'a1b2' }])).toBe(false);
  });
});

describe('formatThawMoment', () => {
  // Tue Oct 14 2025, 9:41 PM local time.
  const now = new Date(2025, 9, 14, 21, 41).getTime();

  it('uses the weekday within the coming week', () => {
    expect(formatThawMoment(now + 72 * HOUR, now)).toBe('Fri 9:41 PM');
    expect(formatThawMoment(now + 24 * HOUR, now)).toBe('Wed 9:41 PM');
  });

  it('uses the date further out', () => {
    expect(formatThawMoment(now + 7 * 24 * HOUR, now)).toBe('Oct 21, 9:41 PM');
    expect(formatThawMoment(now + 30 * 24 * HOUR, now)).toBe('Nov 13, 9:41 PM');
  });
});
