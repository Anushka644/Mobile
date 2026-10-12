// Pure helpers for the Freeze sheet (spec §4.3): input clean-up, validation, auto category and copy.
// No React Native imports, so everything here is unit-tested in __tests__/formLogic.test.ts.

import { formatShortDate, formatWeekdayTime } from '@/lib/format';
import { DAY_MS } from '@/lib/melt';
import { parseMoneyToCents } from '@/lib/money';
import { extractUrl, guessCategory } from '@/lib/parse';
import { isDemoItem } from '@/store/demo';
import type { Category, Item } from '@/types';

/** Longest name the field accepts (titles from links are capped at 40, people type a bit more). */
export const NAME_MAX_LENGTH = 60;
/** Longest price string the field accepts ('1 234 567,89' fits). */
export const PRICE_MAX_LENGTH = 14;
/** 10 million in the currency's major unit — anything above is a typo. */
export const PRICE_MAX_CENTS = 10_000_000 * 100;

export const PRICE_ERRORS = {
  invalid: 'That doesn’t look like a price',
  zero: 'Add a price above zero',
  tooLarge: 'That’s a lot of zeros — check the amount',
} as const;

export const LINK_ERROR = 'That link doesn’t look right';

/** Keeps only what a price can contain: digits, '.', ',' and spaces ('$140' → '140'). */
export function sanitizePriceInput(text: string): string {
  return text
    .replace(/[^\d.,\s]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^\s+/, '')
    .slice(0, PRICE_MAX_LENGTH);
}

/** Cents as price-field text: 14000 → '140', 8950 → '89.50'. */
export function centsToPriceInput(cents: number): string {
  if (!Number.isFinite(cents) || cents <= 0) return '';
  const whole = Math.round(cents);
  return whole % 100 === 0 ? String(whole / 100) : (whole / 100).toFixed(2);
}

/** Whole cents for a valid price (> 0 and not absurd), else null. */
export function validPriceCents(text: string): number | null {
  const cents = parseMoneyToCents(text);
  return cents != null && cents > 0 && cents <= PRICE_MAX_CENTS ? cents : null;
}

/** Error copy for the price field, or null when it is empty or valid. */
export function priceError(text: string): string | null {
  if (!text.trim()) return null;
  const cents = parseMoneyToCents(text);
  if (cents == null) return PRICE_ERRORS.invalid;
  if (cents <= 0) return PRICE_ERRORS.zero;
  if (cents > PRICE_MAX_CENTS) return PRICE_ERRORS.tooLarge;
  return null;
}

/**
 * A typed or pasted link as a full http(s) URL, or null when it isn't one. A missing scheme gets
 * https ('nike.com/t/x' → 'https://nike.com/t/x'); the host needs a dot and a 2+ letter TLD.
 */
export function normalizeUrl(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed);
  if (hasScheme && !/^https?:\/\//i.test(trimmed)) return null; // mailto:, javascript:, ftp:…
  const url = extractUrl(hasScheme ? trimmed : `https://${trimmed}`);
  if (!url) return null;
  const host = /^https?:\/\/([^/?#:]+)/i.exec(url)?.[1] ?? '';
  return /^[^.]+(\.[^.]+)*\.[a-z]{2,}$/i.test(host) || host === 'localhost' ? url : null;
}

/** Error copy for the link field, or null when it is empty or valid. */
export function linkError(text: string): string | null {
  return text.trim() && !normalizeUrl(text) ? LINK_ERROR : null;
}

/** A link for display: no scheme, no 'www.', no trailing slash ('nike.com/t/chunky-sneakers'). */
export function displayUrl(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '');
}

export interface FreezeDraft {
  name: string;
  price: string;
  link: string;
}

/** Name and price are required (price > 0); the link is optional but must be valid when set. */
export function isDraftValid(draft: FreezeDraft): boolean {
  return draft.name.trim().length > 0 && validPriceCents(draft.price) != null && linkError(draft.link) == null;
}

/** The auto-guessed category for the current name and link ('Chunky sneakers' → fashion). */
export function autoCategory(name: string, link: string): Category {
  const fromName = guessCategory(name);
  if (fromName !== 'other') return fromName;
  const url = normalizeUrl(link);
  return url ? guessCategory(url) : 'other';
}

/** True when the user has never frozen anything of their own (demo items don't count): spec §4.3 asks for notification permission then. */
export function isFirstOwnFreeze(items: readonly Pick<Item, 'id'>[]): boolean {
  return !items.some((item) => !isDemoItem(item));
}

/**
 * When an item frozen now would thaw, for the cooldown header and the freezing moment:
 * 'Fri 9:41 PM' within the coming week, else 'Nov 11, 9:41 PM'.
 */
export function formatThawMoment(thawAt: number, now: number): string {
  const weekdayTime = formatWeekdayTime(thawAt);
  if (thawAt - now < 6 * DAY_MS) return weekdayTime;
  return `${formatShortDate(thawAt)}, ${weekdayTime.replace(/^\S+\s/, '')}`;
}
