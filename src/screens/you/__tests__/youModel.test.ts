import { DAY_MS } from '@/lib/melt';

import {
  CURRENCIES,
  currencyLabel,
  currencyPrefix,
  fastForwardMessage,
  goalRowValue,
  offsetLabel,
} from '../youModel';

const HOUR = 60 * 60 * 1000;

describe('currency', () => {
  it('labels the row like the Figma ("USD $")', () => {
    expect(currencyLabel('USD')).toBe('USD $');
    expect(currencyLabel('eur')).toBe('EUR €');
    expect(currencyLabel('INR')).toBe('INR ₹');
    expect(currencyLabel('XYZ')).toBe('XYZ');
    expect(currencyLabel('')).toBe('USD $');
  });

  it('gives a field prefix, falling back to the code', () => {
    expect(currencyPrefix('GBP')).toBe('£');
    expect(currencyPrefix('JPY')).toBe('¥');
    expect(currencyPrefix('SEK')).toBe('SEK');
  });

  it('offers the spec’s currencies, each once', () => {
    const codes = CURRENCIES.map((c) => c.code);
    expect(codes.slice(0, 5)).toEqual(['USD', 'EUR', 'GBP', 'INR', 'JPY']);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('offsetLabel', () => {
  it('is empty at real time', () => {
    expect(offsetLabel(0)).toBe('');
    expect(offsetLabel(-DAY_MS)).toBe('');
    expect(offsetLabel(Number.NaN)).toBe('');
  });

  it('counts whole days, then days + hours, then hours', () => {
    expect(offsetLabel(DAY_MS)).toBe('+1 day');
    expect(offsetLabel(3 * DAY_MS)).toBe('+3 days');
    expect(offsetLabel(DAY_MS + 5 * HOUR)).toBe('+1d 5h');
    expect(offsetLabel(12 * HOUR)).toBe('+12h');
  });
});

describe('fastForwardMessage', () => {
  it('mentions what thawed', () => {
    expect(fastForwardMessage(0)).toBe('Jumped ahead a day');
    expect(fastForwardMessage(1)).toBe('+1 day · 1 want thawed');
    expect(fastForwardMessage(3)).toBe('+1 day · 3 wants thawed');
  });
});

describe('goalRowValue', () => {
  it('keeps short names', () => {
    expect(goalRowValue('Lisbon')).toBe('Lisbon');
    expect(goalRowValue('  New bike ')).toBe('New bike');
  });

  it('trims long names to their destination, like the Figma row', () => {
    expect(goalRowValue('Weekend in Lisbon')).toBe('Lisbon');
    expect(goalRowValue('Trip to Japan')).toBe('Japan');
    expect(goalRowValue('Saving for a new bike')).toBe('New bike');
  });

  it('leaves other long names for the row to ellipsize', () => {
    expect(goalRowValue('Emergency fund cushion')).toBe('Emergency fund cushion');
  });
});


