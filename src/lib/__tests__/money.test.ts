import { currencySymbol, formatMoney, formatMoneyCompact, parseMoneyToCents } from '../money';

// Intl output uses non-breaking spaces in some locales; normalise for readable assertions.
const norm = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ');
const en = { locale: 'en-US' };

describe('formatMoney', () => {
  it('drops decimals for whole amounts', () => {
    expect(formatMoney(14000, 'USD', en)).toBe('$140');
    expect(formatMoney(100, 'USD', en)).toBe('$1');
    expect(formatMoney(0, 'USD', en)).toBe('$0');
  });

  it('shows two decimals otherwise', () => {
    expect(formatMoney(8950, 'USD', en)).toBe('$89.50');
    expect(formatMoney(1, 'USD', en)).toBe('$0.01');
    expect(formatMoney(99, 'USD', en)).toBe('$0.99');
    expect(formatMoney(123456789, 'USD', en)).toBe('$1,234,567.89');
  });

  it('groups thousands', () => {
    expect(formatMoney(123400, 'USD', en)).toBe('$1,234');
    expect(formatMoney(100000000, 'USD', en)).toBe('$1,000,000');
  });

  it('formats negative amounts', () => {
    expect(formatMoney(-500, 'USD', en)).toBe('-$5');
    expect(formatMoney(-8950, 'USD', en)).toBe('-$89.50');
  });

  it('defaults to USD', () => {
    expect(formatMoney(14000, undefined, en)).toBe('$140');
  });

  it('formats other currencies', () => {
    expect(formatMoney(14000, 'EUR', en)).toBe('€140');
    expect(formatMoney(8950, 'GBP', en)).toBe('£89.50');
    expect(norm(formatMoney(8950, 'EUR', { locale: 'de-DE' }))).toBe('89,50 €');
    expect(norm(formatMoney(123400, 'EUR', { locale: 'de-DE' }))).toBe('1.234 €');
  });

  it('treats priceCents as amount × 100 for zero-decimal currencies', () => {
    expect(formatMoney(150000, 'JPY', en)).toBe('¥1,500');
  });

  it('accepts lower-case and padded currency codes', () => {
    expect(formatMoney(14000, 'usd', en)).toBe('$140');
    expect(formatMoney(14000, ' eur ', en)).toBe('€140');
  });

  it('rounds fractional cents', () => {
    expect(formatMoney(8949.6, 'USD', en)).toBe('$89.50');
    expect(formatMoney(9999.5, 'USD', en)).toBe('$100');
  });

  it('formats non-finite amounts as zero', () => {
    expect(formatMoney(NaN, 'USD', en)).toBe('$0');
    expect(formatMoney(Infinity, 'USD', en)).toBe('$0');
  });

  it('does not throw for an unknown currency code', () => {
    expect(formatMoney(8950, 'NOPE', en)).toBe('NOPE 89.50');
    expect(formatMoney(14000, '', en)).toBe('$140');
  });

  it('falls back to the device locale for an invalid locale', () => {
    expect(() => formatMoney(14000, 'USD', { locale: 'not a locale!!' })).not.toThrow();
    expect(formatMoney(14000, 'USD', { locale: 'not a locale!!' })).toContain('140');
  });

  it('works with the device locale', () => {
    expect(formatMoney(8950, 'USD')).toMatch(/89[.,]50/);
  });

  it('supports decimals: always / never', () => {
    expect(formatMoney(14000, 'USD', { ...en, decimals: 'always' })).toBe('$140.00');
    expect(formatMoney(8950, 'USD', { ...en, decimals: 'always' })).toBe('$89.50');
    expect(formatMoney(8950, 'USD', { ...en, decimals: 'never' })).toBe('$90');
    expect(formatMoney(8949, 'USD', { ...en, decimals: 'never' })).toBe('$89');
    expect(formatMoney(14000, 'USD', { ...en, decimals: 'never' })).toBe('$140');
  });

  it('returns identical output on repeated calls (formatter cache)', () => {
    expect(formatMoney(8950, 'USD', en)).toBe(formatMoney(8950, 'USD', en));
  });
});

describe('formatMoneyCompact', () => {
  it.each<[number, string]>([
    [0, '$0'],
    [8950, '$89.50'],
    [14000, '$140'],
    [99999, '$999.99'],
    [100000, '$1k'],
    [120000, '$1.2k'],
    [123456, '$1.2k'],
    [125000, '$1.3k'],
    [1234500, '$12.3k'],
    [9999900, '$100k'],
    [25000000, '$250k'],
    [99994999, '$1M'],
    [99_990_000, '$1M'],
    [150_000_000, '$1.5M'],
    [2_000_000_000_00, '$2B'],
    [3_400_000_000_000_00, '$3.4T'],
  ])('formatMoneyCompact(%p) -> %p', (cents, label) => {
    expect(formatMoneyCompact(cents, 'USD', en)).toBe(label);
  });

  it('keeps the sign for negative amounts', () => {
    expect(formatMoneyCompact(-120000, 'USD', en)).toBe('-$1.2k');
    expect(formatMoneyCompact(-8950, 'USD', en)).toBe('-$89.50');
  });

  it('places the suffix after the number for suffix-symbol locales', () => {
    expect(norm(formatMoneyCompact(120000, 'EUR', { locale: 'de-DE' }))).toBe('1,2k €');
    expect(formatMoneyCompact(120000, 'EUR', en)).toBe('€1.2k');
  });

  it('adds the suffix in locales with non-Latin digits', () => {
    expect(formatMoneyCompact(120000, 'USD', { locale: 'ar-EG' })).toContain('\u0661\u066b\u0662k');
    expect(formatMoneyCompact(150000000, 'USD', { locale: 'mr-IN' })).toBe('$\u0967.\u096bM');
    expect(formatMoneyCompact(120000, 'USD', { locale: 'bn-BD' })).toContain('\u09e7.\u09e8k');
    expect(formatMoneyCompact(120000, 'USD', { locale: 'fa-IR' })).toContain('\u06f1\u066b\u06f2k');
  });

  it('falls back to a digit regex when formatToParts is missing or a stub', () => {
    const proto = Intl.NumberFormat.prototype;
    const original = proto.formatToParts;
    try {
      // Missing entirely.
      (proto as { formatToParts?: unknown }).formatToParts = undefined;
      expect(formatMoneyCompact(120000, 'USD', en)).toBe('$1.2k');
      expect(formatMoneyCompact(150000000, 'USD', { locale: 'mr-IN' })).toBe('$\u0967.\u096bM');
      expect(formatMoneyCompact(120000, 'USD', { locale: 'ar-EG' })).toContain('\u0661\u066b\u0662k');
      expect(currencySymbol('USD', 'bn-BD')).toBe('US$');
      expect(currencySymbol('USD', 'fa-IR')).toBe('$');
      // A stub that returns the whole string as one literal part.
      proto.formatToParts = function (this: Intl.NumberFormat, n?: unknown) {
        return [{ type: 'literal', value: this.format(n as number) }];
      } as typeof original;
      expect(norm(formatMoneyCompact(120000, 'EUR', { locale: 'de-DE' }))).toBe('1,2k €');
      expect(currencySymbol('USD', 'ar-EG')).toBe('US$');
      expect(currencySymbol('EUR', 'de-DE')).toBe('€');
    } finally {
      proto.formatToParts = original;
    }
  });

  it('does not crash on an unknown currency or bad numbers', () => {
    expect(formatMoneyCompact(120000, 'NOPE', en)).toBe('NOPE 1.2k');
    expect(formatMoneyCompact(NaN, 'USD', en)).toBe('$0');
  });
});

describe('currencySymbol', () => {
  it('returns the symbol for known currencies', () => {
    expect(currencySymbol('USD', 'en-US')).toBe('$');
    expect(currencySymbol('EUR', 'en-US')).toBe('€');
    expect(currencySymbol('GBP', 'en-US')).toBe('£');
    expect(currencySymbol('JPY', 'en-US')).toBe('¥');
    expect(currencySymbol('EUR', 'de-DE')).toBe('€');
  });

  it('strips non-Latin digits and bidi marks', () => {
    expect(currencySymbol('USD', 'bn-BD')).toBe('US$');
    expect(currencySymbol('USD', 'fa-IR')).toBe('$');
    expect(currencySymbol('USD', 'ar-EG')).toBe('US$');
    expect(currencySymbol('USD', 'mr-IN')).toBe('$');
  });

  it('defaults to USD and falls back to the code', () => {
    expect(currencySymbol(undefined, 'en-US')).toBe('$');
    expect(currencySymbol('nope', 'en-US')).toBe('NOPE');
  });
});

describe('parseMoneyToCents', () => {
  it.each<[string, number]>([
    ['0', 0],
    ['140', 14000],
    ['89.5', 8950],
    ['89.50', 8950],
    ['89,50', 8950],
    ['12,5', 1250],
    ['.99', 99],
    ['5.', 500],
    ['$1,234.56', 123456],
    ['1.234,56', 123456],
    ['1,234', 123400],
    ['1.234.567', 123456700],
    ['1 234', 123400],
    ['€ 12', 1200],
    ['  $89.50  ', 8950],
    ['1,000.999', 100100],
    ['1,234,567', 123456700],
    ['1,23,456', 12345600],
    ['1.2345', 123],
    ['1234.567', 123457],
    ['0.005', 1],
    ['0.004', 0],
    ['0,500', 50],
    ['0.99', 99],
    ['012', 1200],
  ])('parseMoneyToCents(%p) -> %p', (input, cents) => {
    expect(parseMoneyToCents(input)).toBe(cents);
  });

  it('returns null for empty or non-numeric input', () => {
    expect(parseMoneyToCents('')).toBeNull();
    expect(parseMoneyToCents('   ')).toBeNull();
    expect(parseMoneyToCents('abc')).toBeNull();
    expect(parseMoneyToCents('$')).toBeNull();
    expect(parseMoneyToCents('.')).toBeNull();
    expect(parseMoneyToCents('1.2.3')).toBeNull();
  });

  it('rejects negative amounts', () => {
    expect(parseMoneyToCents('-5')).toBeNull();
    expect(parseMoneyToCents('$-5')).toBeNull();
    expect(parseMoneyToCents('\u22125')).toBeNull();
  });

  it('rejects non-string input without throwing', () => {
    expect(parseMoneyToCents(undefined as unknown as string)).toBeNull();
    expect(parseMoneyToCents(12 as unknown as string)).toBeNull();
  });

  it('rejects amounts beyond safe integer precision', () => {
    expect(parseMoneyToCents('9'.repeat(20))).toBeNull();
  });

  it('round-trips with formatMoney', () => {
    for (const cents of [0, 1, 99, 8950, 14000, 123456]) {
      expect(parseMoneyToCents(formatMoney(cents, 'USD', en))).toBe(cents);
    }
  });
});
