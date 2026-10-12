// Money formatting and parsing. Pure functions only.
//
// Convention: `priceCents` is always the amount × 100, whatever the currency's minor
// unit (so ¥1,500 is stored as 150000). Formatting divides by 100.
//
// Uses Intl.NumberFormat with plain currency style only (no `notation: 'compact'`),
// which Hermes supports on iOS and Android. The compact variant is built by hand.
// formatToParts is used when it returns real parts; otherwise a regex over every
// numbering system's digits is the fallback (some runtimes stub formatToParts).

export type DecimalsMode =
  /** Show cents only when the amount is not whole: $140, $89.50. (default) */
  | 'auto'
  /** Always show two decimals: $140.00. */
  | 'always'
  /** Round to whole units: $90. */
  | 'never';

export interface FormatMoneyOptions {
  /** BCP 47 locale; defaults to the device locale. */
  locale?: string;
  decimals?: DecimalsMode;
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(
  locale: string | undefined,
  currency: string,
  minFraction: number,
  maxFraction: number
): Intl.NumberFormat | null {
  const key = `${locale ?? ''}|${currency}|${minFraction}|${maxFraction}`;
  const cached = formatterCache.get(key);
  if (cached) return cached;
  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: minFraction,
      maximumFractionDigits: maxFraction,
    });
    formatterCache.set(key, formatter);
    return formatter;
  } catch {
    return null; // invalid currency code or locale
  }
}

function currencyCode(currency: string): string {
  return (currency || 'USD').trim().toUpperCase();
}

/** Currency formatter for `locale`, else the device locale; null if Intl rejects the currency. */
function currencyFormatter(
  code: string,
  locale: string | undefined,
  minFraction: number,
  maxFraction: number
): Intl.NumberFormat | null {
  return getFormatter(locale, code, minFraction, maxFraction) ?? getFormatter(undefined, code, minFraction, maxFraction);
}

/** formatToParts output, or null where it is missing, throws, or only returns one literal part. */
function partsOf(formatter: Intl.NumberFormat, units: number): Intl.NumberFormatPart[] | null {
  if (typeof formatter.formatToParts !== 'function') return null;
  try {
    const parts = formatter.formatToParts(units);
    return parts.some((p) => p.type === 'integer') ? parts : null;
  } catch {
    return null;
  }
}

/**
 * Decimal digits of the numbering systems locales use by default: Latin, Arabic-Indic (ar-EG),
 * Persian (fa-IR), Devanagari (mr-IN), Bengali (bn-BD), Myanmar, Thai and the other BMP scripts.
 * JS `\d` only matches ASCII 0-9.
 */
const DIGITS =
  '0-9\\u0660-\\u0669\\u06F0-\\u06F9\\u07C0-\\u07C9\\u0966-\\u096F\\u09E6-\\u09EF\\u0A66-\\u0A6F\\u0AE6-\\u0AEF' +
  '\\u0B66-\\u0B6F\\u0BE6-\\u0BEF\\u0C66-\\u0C6F\\u0CE6-\\u0CEF\\u0D66-\\u0D6F\\u0DE6-\\u0DEF\\u0E50-\\u0E59\\u0ED0-\\u0ED9' +
  '\\u0F20-\\u0F29\\u1040-\\u1049\\u1090-\\u1099\\u17E0-\\u17E9\\u1810-\\u1819\\u1946-\\u194F\\u19D0-\\u19D9' +
  '\\u1A80-\\u1A89\\u1A90-\\u1A99\\u1B50-\\u1B59\\u1BB0-\\u1BB9\\u1C40-\\u1C49\\u1C50-\\u1C59\\uA620-\\uA629' +
  '\\uA8D0-\\uA8D9\\uA900-\\uA909\\uA9D0-\\uA9D9\\uA9F0-\\uA9F9\\uAA50-\\uAA59\\uABF0-\\uABF9\\uFF10-\\uFF19';
/** The last digit of a string, in any of DIGITS. */
const LAST_DIGIT = new RegExp(`([${DIGITS}])(?![\\s\\S]*[${DIGITS}])`);
/** Everything in a formatted amount that isn't the currency symbol: digits, spaces, separators, signs, bidi marks. */
const NOT_SYMBOL = new RegExp(`[${DIGITS}\\s.,'\\u2019\\u066B\\u066C\\u200E\\u200F\\u061C+\\-\\u2212]`, 'g');

/** Formats an amount (in units, not cents). Falls back to "CODE 1,234.5" if Intl rejects the currency. */
function formatUnits(
  units: number,
  currency: string,
  locale: string | undefined,
  minFraction: number,
  maxFraction: number
): string {
  const code = currencyCode(currency);
  const formatter = currencyFormatter(code, locale, minFraction, maxFraction);
  if (formatter) return formatter.format(units);
  let plain: string;
  try {
    plain = units.toLocaleString(locale, {
      minimumFractionDigits: minFraction,
      maximumFractionDigits: maxFraction,
    });
  } catch {
    plain = units.toFixed(maxFraction);
  }
  return code ? `${code} ${plain}` : plain;
}

function toWholeCents(cents: number): number {
  return Number.isFinite(cents) ? Math.round(cents) : 0;
}

/**
 * Format cents as currency, e.g. formatMoney(14000, 'USD') -> '$140',
 * formatMoney(8950, 'USD') -> '$89.50'. Never throws: an unknown currency code is shown
 * as a prefix ('ABC 12.50') and a non-finite amount formats as 0.
 */
export function formatMoney(
  cents: number,
  currency: string = 'USD',
  opts: FormatMoneyOptions = {}
): string {
  const whole = toWholeCents(cents);
  const mode = opts.decimals ?? 'auto';
  if (mode === 'never') {
    return formatUnits(Math.round(whole / 100), currency, opts.locale, 0, 0);
  }
  const showCents = mode === 'always' || whole % 100 !== 0;
  return showCents
    ? formatUnits(whole / 100, currency, opts.locale, 2, 2)
    : formatUnits(whole / 100, currency, opts.locale, 0, 0);
}

const COMPACT_UNITS = [
  { value: 1e12, suffix: 'T' },
  { value: 1e9, suffix: 'B' },
  { value: 1e6, suffix: 'M' },
  { value: 1e3, suffix: 'k' },
] as const;

/**
 * Short form for tight spaces: under 1,000 units it is formatMoney (e.g. '$89.50');
 * from 1,000 up it scales to k/M/B/T with at most one decimal below 100 of the unit:
 * '$1k', '$1.2k', '$12.5k', '$250k', '$1.5M'. Negative amounts keep their sign ('-$1.2k').
 */
export function formatMoneyCompact(
  cents: number,
  currency: string = 'USD',
  opts: Omit<FormatMoneyOptions, 'decimals'> = {}
): string {
  const units = toWholeCents(cents) / 100;
  const abs = Math.abs(units);
  if (abs < 1000) return formatMoney(cents, currency, opts);

  let unitIndex = COMPACT_UNITS.findIndex((u) => abs >= u.value);
  let scaled = abs / COMPACT_UNITS[unitIndex].value;
  let maxFraction = scaled < 100 ? 1 : 0;
  // 999,950 -> "1000k"? Bump to the next unit instead ("1M").
  const rounded = Number(scaled.toFixed(maxFraction));
  if (rounded >= 1000 && unitIndex > 0) {
    unitIndex -= 1;
    scaled = abs / COMPACT_UNITS[unitIndex].value;
    maxFraction = scaled < 100 ? 1 : 0;
  }
  const signed = units < 0 ? -scaled : scaled;
  const suffix = COMPACT_UNITS[unitIndex].suffix;
  // Put the suffix right after the number so it works for '$1.2', '1,2 €' and '١٫٢ US$' alike.
  const formatter = currencyFormatter(currencyCode(currency), opts.locale, 0, maxFraction);
  const parts = formatter && partsOf(formatter, signed);
  if (parts) {
    let last = -1;
    parts.forEach((p, i) => {
      if (p.type === 'integer' || p.type === 'fraction') last = i;
    });
    return parts.map((p, i) => (i === last ? p.value + suffix : p.value)).join('');
  }
  const text = formatUnits(signed, currency, opts.locale, 0, maxFraction);
  return text.replace(LAST_DIGIT, `$1${suffix}`);
}

/**
 * The currency's symbol in the given locale ('$', '€', '¥', 'CHF'). Falls back to the
 * upper-cased code when Intl does not know it.
 */
export function currencySymbol(currency: string = 'USD', locale?: string): string {
  const code = currencyCode(currency);
  const formatter = currencyFormatter(code, locale, 0, 0);
  if (!formatter) return code;
  const fromParts = partsOf(formatter, 0)?.find((p) => p.type === 'currency')?.value.trim();
  if (fromParts) return fromParts;
  const symbol = formatter.format(0).replace(NOT_SYMBOL, '').trim();
  return symbol || code;
}

/**
 * Parse user input into whole cents. Accepts '89.5', '89,50', '$1,234.56', '1.234,56',
 * '1 234', '€ 12'. With both '.' and ',' present, the last one is the decimal mark.
 * With only one kind, it is read as digit grouping when it forms a valid grouping
 * ('1,234', '1.234.567', '1,23,456'), otherwise as the decimal mark ('12,5', '0.50', '1.2345').
 * Extra decimals are rounded half-up to the cent. Returns null for input with no number,
 * a negative sign, an ambiguous mix ('1.2.3'), or an amount too large to store exactly.
 */
export function parseMoneyToCents(input: string): number | null {
  if (typeof input !== 'string') return null;
  if (/[-\u2212]/.test(input)) return null; // prices are never negative
  const cleaned = input.replace(/[^\d.,]/g, '');
  if (!/\d/.test(cleaned)) return null;

  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');
  let decimalIndex = -1;
  if (lastDot >= 0 && lastComma >= 0) {
    decimalIndex = Math.max(lastDot, lastComma);
  } else if (lastDot >= 0 || lastComma >= 0) {
    const sep = lastDot >= 0 ? '.' : ',';
    const groups = cleaned.split(sep);
    // Thousands ('1,234,567') or Indian lakh grouping ('1,23,456').
    const isGrouping =
      /^[1-9]\d{0,2}$/.test(groups[0]) &&
      /^\d{3}$/.test(groups[groups.length - 1]) &&
      groups.slice(1, -1).every((g) => /^\d{2,3}$/.test(g));
    if (!isGrouping) {
      if (groups.length > 2) return null; // e.g. '1.2.3'
      decimalIndex = cleaned.indexOf(sep);
    }
  }

  const intDigits = (decimalIndex >= 0 ? cleaned.slice(0, decimalIndex) : cleaned).replace(/\D/g, '');
  const fracDigits = decimalIndex >= 0 ? cleaned.slice(decimalIndex + 1).replace(/\D/g, '') : '';
  const frac = fracDigits.padEnd(3, '0');
  const fracCents = Number(frac.slice(0, 2)) + (Number(frac[2]) >= 5 ? 1 : 0);
  const cents = Number(intDigits || '0') * 100 + fracCents;
  return Number.isSafeInteger(cents) ? cents : null;
}
