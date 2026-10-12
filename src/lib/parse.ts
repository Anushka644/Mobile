// Text heuristics for turning a pasted link / shared text into a draft item.
// Pure functions only: no React Native imports, safe on every platform.
// Regexes avoid `\p{…}` escapes and lookbehind so they behave the same on Hermes, JSC and web.

import type { Category } from '@/types';
import { parseMoneyToCents } from './money';

/** Letters in Latin, Greek, Cyrillic, kana, CJK and Hangul blocks (stand-in for `\p{L}`). */
const LETTER = 'A-Za-z\\u00C0-\\u024F\\u0370-\\u03FF\\u0400-\\u04FF\\u3040-\\u30FF\\u4E00-\\u9FFF\\uAC00-\\uD7AF';
const HAS_WORD = new RegExp(`[${LETTER}]{2,}`);
const NON_LETTERS = new RegExp(`[^${LETTER}]`, 'g');

/** All matches of a global regex (String.prototype.matchAll without relying on it). */
function allMatches(re: RegExp, text: string): RegExpExecArray[] {
  const global = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
  const out: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  while ((m = global.exec(text)) !== null) {
    out.push(m);
    if (m[0].length === 0) global.lastIndex += 1;
  }
  return out;
}

// ---------------------------------------------------------------------------
// URLs

const URL_RE = /\bhttps?:\/\/[^\s<>"'`{}|\\^[\]]+/i;
const TRAILING_PUNCTUATION = /[.,;:!?…'"*]$/;

function count(s: string, ch: string): number {
  return s.split(ch).length - 1;
}

/** Drop sentence punctuation stuck to the end of a URL; keep a balanced ')' (Wikipedia-style). */
function trimUrlEnd(url: string): string {
  let out = url;
  for (;;) {
    if (TRAILING_PUNCTUATION.test(out)) {
      out = out.slice(0, -1);
    } else if (out.endsWith(')') && count(out, '(') < count(out, ')')) {
      out = out.slice(0, -1);
    } else {
      return out;
    }
  }
}

/** First http(s) URL in `text`, without trailing sentence punctuation, or null. */
export function extractUrl(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = URL_RE.exec(text);
  if (!match) return null;
  const url = trimUrlEnd(match[0]);
  // Needs at least one host character after the scheme.
  return /^https?:\/\/[^/?#]*[a-z\d]/i.test(url) ? url : null;
}

// ---------------------------------------------------------------------------
// Prices

const CURRENCY_SYMBOLS = '$€£¥₹₩₽₺₪₫฿₱₦₴₸₡';
/** ISO codes and local abbreviations. Codes that are also common words ('try', 'rub', 'ft') are left out. */
const CURRENCY_WORDS = [
  'usd', 'eur', 'gbp', 'jpy', 'cad', 'aud', 'nzd', 'chf', 'sek', 'nok', 'dkk', 'pln', 'czk',
  'huf', 'inr', 'brl', 'mxn', 'cny', 'rmb', 'krw', 'sgd', 'hkd', 'twd', 'zar', 'aed', 'sar',
  'thb', 'idr', 'myr', 'vnd', 'ngn', 'uah', 'rs', 'kr', 'zł', 'zl', 'kč',
].join('|');

/**
 * A number that may use '.', ',', apostrophes (ASCII ' or the typographic ’ that Intl 'de-CH' prints)
 * or (narrow) no-break spaces as grouping/decimal marks.
 */
const NUM_TIGHT = String.raw`\d(?:[\d.,'\u2019\u00a0\u202f]*\d)?`;
/** Same, but a plain space may also group thousands ('1 299,00'). */
const NUM_SPACED = String.raw`\d(?:(?:[\d.,'\u2019\u00a0\u202f]| (?=\d{3}(?!\d)))*\d)?`;

const PRICE_BEFORE_NUMBER = new RegExp(
  String.raw`(?:[${CURRENCY_SYMBOLS}]|(?:^|[^a-z])(?:${CURRENCY_WORDS})\.?)\s*(${NUM_SPACED})`,
  'i'
);
const PRICE_AFTER_NUMBER = new RegExp(
  String.raw`(${NUM_SPACED})\s*(?:[${CURRENCY_SYMBOLS}]|(?:${CURRENCY_WORDS})(?![a-z]))`,
  'i'
);
const CURRENCY_MARK = new RegExp(
  String.raw`[${CURRENCY_SYMBOLS}]|(?:^|[^a-z])(?:${CURRENCY_WORDS})(?![a-z])\.?`,
  'gi'
);
const WHOLE_NUMBER = new RegExp(String.raw`^${NUM_SPACED}$`);
const ANY_NUMBER = new RegExp(NUM_TIGHT, 'g');

export interface ParsePriceOptions {
  /**
   * Only accept a number written next to a currency symbol or code ('$140', '89,50 €', 'USD 20').
   * Use for free text (clipboard, share sheet) where bare numbers are usually not prices.
   */
  requireCurrency?: boolean;
}

/** A matched number token in cents (grouping spaces and apostrophes removed). */
function toCents(token: string): number | null {
  return parseMoneyToCents(token.replace(/[\s  '’]/g, ''));
}

/**
 * One currency mark with a number on each side: 'PlayStation 5 $499', 'Pack of 3 €12,99',
 * 'iPhone 15 EUR 999', '12,99 € 3 items'. The number written tighter against the mark wins; on a
 * tie, the larger amount (the other number is usually a model number or a quantity).
 */
function pickAroundSharedMark(before: RegExpExecArray, after: RegExpExecArray): string {
  const gapBefore = /\s*$/.exec(before[0].slice(0, before[0].length - before[1].length))![0].length;
  const gapAfter = /^\s*/.exec(after[0].slice(after[1].length))![0].length;
  if (gapBefore !== gapAfter) return gapBefore < gapAfter ? before[1] : after[1];
  return (toCents(after[1]) ?? -1) > (toCents(before[1]) ?? -1) ? after[1] : before[1];
}

/** The number token that most likely is the price, or null. */
function findPriceToken(text: string, requireCurrency: boolean): string | null {
  const before = PRICE_BEFORE_NUMBER.exec(text);
  const after = PRICE_AFTER_NUMBER.exec(text);
  if (before && after) {
    const overlap =
      after.index < before.index + before[0].length && before.index < after.index + after[0].length;
    if (overlap) return pickAroundSharedMark(before, after);
    return before.index < after.index ? before[1] : after[1];
  }
  if (before) return before[1];
  if (after) return after[1];
  if (requireCurrency) return null;

  // The whole input is a number, possibly space-grouped: '1 299,00'.
  const bare = text.replace(CURRENCY_MARK, ' ').trim();
  if (WHOLE_NUMBER.test(bare)) return bare;

  // Otherwise the first number that isn't a percentage.
  for (const m of allMatches(ANY_NUMBER, text)) {
    if (!/^\s*%/.test(text.slice(m.index + m[0].length))) return m[0];
  }
  return null;
}

/**
 * Find a price in `text` and return it in cents.
 * Handles '$1,299.99', '1299', '€89,50', '£1.299,00', '89.5', '  $ 140 ', '1 299,00 kr', "CHF 1'299",
 * 'CHF 1’299.50'. A number next to a currency mark wins over bare numbers (the earliest such number if
 * several); when one mark has a number on each side ('PlayStation 5 $499') see pickAroundSharedMark.
 * With both '.' and ',' the last one is the decimal mark; a lone separator followed by exactly
 * three digits is digit grouping (see parseMoneyToCents). Returns null when there is no number, or,
 * with `requireCurrency`, no currency-marked number.
 */
export function parsePriceToCents(
  text: string | null | undefined,
  options: ParsePriceOptions = {}
): number | null {
  if (!text) return null;
  const token = findPriceToken(text, options.requireCurrency ?? false);
  if (!token) return null;
  return toCents(token);
}

// ---------------------------------------------------------------------------
// Names

export const MAX_NAME_LENGTH = 40;

/** Path segments / words that never name a product. */
const STOP_TOKENS = new Set([
  'p', 'dp', 'gp', 't', 'ip', 'pd', 'pdp', 'prd', 's', 'product', 'products', 'item', 'items',
  'itm', 'listing', 'listings', 'shop', 'store', 'buy', 'collections', 'collection', 'c',
  'category', 'categories', 'catalog', 'catalogue', 'detail', 'details', 'view', 'index', 'site',
  'sku', 'id', 'ref', 'goods', 'search', 'browse', 'all', 'www', 'amp', 'html', 'htm', 'php',
  'aspx',
]);

/** Connecting words kept lowercase in titles ('Lamp for Living Room'). */
const SMALL_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with',
]);

const LOCALE_SEGMENT = /^[a-z]{2}(?:[-_][a-z]{2})?$/i;

/** Tokens that look like SKUs, ASINs, hashes or database ids rather than words. */
function isIdToken(token: string): boolean {
  if (/^\d{5,}$/.test(token)) return true; // 80275887
  if (/\d/.test(token) && /[a-z]/i.test(token) && token.length >= 5) return true; // abc123, B0BDHWDR12
  return token.length > 24;
}

function isWord(token: string): boolean {
  return HAS_WORD.test(token) && !STOP_TOKENS.has(token.toLowerCase());
}

function titleCaseWord(word: string, index: number): string {
  const letters = word.replace(NON_LETTERS, '');
  if (letters === letters.toLowerCase()) {
    const lower = word.toLowerCase();
    if (index > 0 && SMALL_WORDS.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }
  if (letters === letters.toUpperCase()) {
    // Keep short acronyms (USB, LED, XL); soften shouty words (SNEAKERS -> Sneakers).
    return letters.length <= 4 ? word : word.charAt(0) + word.slice(1).toLowerCase();
  }
  return word; // Already mixed case: AirPods, iPhone.
}

const DANGLING_WORD = /^[&+\-–—|,:;]+$/;

/** Collapse whitespace and cut to `max` characters on a word boundary, without a dangling 'for' / '&'. */
export function capTitle(title: string, max: number = MAX_NAME_LENGTH): string {
  let out = title.replace(/\s+/g, ' ').trim();
  if (out.length > max) {
    const cut = out.slice(0, max + 1);
    const space = cut.lastIndexOf(' ');
    out = space >= max / 2 ? cut.slice(0, space) : out.slice(0, max);
  }
  const words = out.split(' ');
  while (words.length > 1) {
    const last = words[words.length - 1];
    if (!SMALL_WORDS.has(last.toLowerCase()) && !DANGLING_WORD.test(last)) break;
    words.pop();
  }
  return words.join(' ').replace(/[\s,:;\-–—|&+]+$/, '');
}

function toTitle(words: string[]): string {
  return capTitle(words.map(titleCaseWord).join(' '));
}

function safeDecode(segment: string): string {
  const spaced = segment.replace(/\+/g, ' ');
  try {
    return decodeURIComponent(spaced);
  } catch {
    return spaced;
  }
}

/** Words of a path segment if it reads like a product name, else null. */
function segmentWords(segment: string): string[] | null {
  if (/[=;]/.test(segment)) return null; // Amazon 'ref=sr_1_1', matrix params
  const withoutExt = segment.replace(/\.[a-z]{1,5}$/i, '');
  if (STOP_TOKENS.has(withoutExt.toLowerCase()) || LOCALE_SEGMENT.test(withoutExt)) return null;
  const words = withoutExt
    .split(/[\s\-_+.,~:;!*'"()[\]|]+/)
    .filter((w) => w.length > 0 && !isIdToken(w));
  return words.some(isWord) ? words : null;
}

/** Second-level labels under a ccTLD: amazon.co.uk, ebay.com.au. */
const SECOND_LEVEL = new Set(['co', 'com', 'org', 'net', 'ac', 'gov', 'edu', 'ne', 'or']);

/** Short links whose hostname doesn't say the store. */
const SHORT_LINK_HOSTS: Record<string, string> = {
  'a.co': 'Amazon',
  'amzn.to': 'Amazon',
  'amzn.eu': 'Amazon',
  'amzn.asia': 'Amazon',
  'etsy.me': 'Etsy',
  'ebay.us': 'eBay',
  'pin.it': 'Pinterest',
  'youtu.be': 'YouTube',
};
/** Brand spellings title-casing gets wrong. */
const BRAND_NAMES: Record<string, string> = {
  ebay: 'eBay',
  ikea: 'IKEA',
  asos: 'ASOS',
  hm: 'H&M',
  youtube: 'YouTube',
  tiktok: 'TikTok',
};

function nameFromHost(host: string): string {
  const bare = host.replace(/^www\d*\./, '');
  if (SHORT_LINK_HOSTS[bare]) return SHORT_LINK_HOSTS[bare];
  if (/^[\d.]+$/.test(bare)) return bare; // IP address
  const labels = bare.split('.').filter(Boolean);
  const n = labels.length;
  if (n === 0) return '';
  const main =
    n >= 3 && SECOND_LEVEL.has(labels[n - 2]) && labels[n - 1].length === 2
      ? labels[n - 3]
      : labels[Math.max(0, n - 2)];
  if (BRAND_NAMES[main]) return BRAND_NAMES[main];
  return toTitle(main.split(/[-_]+/).filter(Boolean));
}

/**
 * A human title for a product link, from its last meaningful path segment, else its site name.
 * 'https://www.nike.com/t/air-max-90-shoes-abc123' -> 'Air Max 90 Shoes';
 * 'https://www.amazon.com/dp/B0BDHWDR12' -> 'Amazon'.
 * Ids, query strings, fragments and file extensions are dropped; the result is title-cased and at
 * most 40 characters. Returns '' for empty input.
 */
export function guessNameFromUrl(url: string | null | undefined): string {
  if (!url) return '';
  const match = /^\s*(?:[a-z][a-z\d+.-]*:\/\/)?([^/?#\s]*)([^?#\s]*)/i.exec(url);
  if (!match) return '';
  const host = match[1].replace(/^.*@/, '').replace(/:\d*$/, '').toLowerCase();
  const segments = match[2].split('/').map(safeDecode).filter(Boolean);

  for (let i = segments.length - 1; i >= 0; i--) {
    const words = segmentWords(segments[i]);
    if (words) return toTitle(words);
  }
  return host ? nameFromHost(host) : '';
}

const SHARE_PREFIX =
  /^(?:check (?:this|it) out|check out(?: this)?|look at this|i want this|want this|wishlist)\b[\s:!.,-]*/i;
const EDGE_PUNCTUATION = /^[\s"'“”‘’:,.\-–—|]+|[\s"'“”‘’:,.\-–—|]+$/g;

/**
 * A product title from shared text such as 'Apple AirPods Pro (2nd Gen) https://a.co/d/xyz' or
 * 'Nike Air Max 90 | Nike.com'. URLs and currency-marked prices are removed and a site suffix
 * after ' | ' or ' - ' is dropped. Returns null when what's left doesn't read like a short title.
 */
export function titleFromSharedText(text: string | null | undefined): string | null {
  if (!text) return null;
  const rest = text
    .replace(new RegExp(URL_RE.source, 'gi'), ' ')
    .replace(new RegExp(PRICE_BEFORE_NUMBER.source, 'gi'), ' ')
    .replace(new RegExp(PRICE_AFTER_NUMBER.source, 'gi'), ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(SHARE_PREFIX, '');
  // 'Product | Store', 'Product - Amazon.com', 'Product • Etsy': keep the first part.
  const first = rest.split(/\s+[|•–—-]\s+|\s*\|\s*/)[0] ?? '';
  const title = first.replace(EDGE_PUNCTUATION, '');
  if (!HAS_WORD.test(title)) return null;
  if (title.split(' ').length > 12) return null; // a message, not a title
  return capTitle(title);
}

// ---------------------------------------------------------------------------
// Categories

/** Keywords per category, matched as whole words with an optional plural 's' / 'es'. */
export const CATEGORY_KEYWORDS: Record<Exclude<Category, 'other'>, readonly string[]> = {
  fashion: [
    'shoe', 'sneaker', 'trainer', 'boot', 'heel', 'sandal', 'loafer', 'slipper', 'air max',
    'jordan', 'jacket', 'coat', 'parka', 'puffer', 'blazer', 'dress', 'skirt', 'tee', 't-shirt',
    'tshirt', 'shirt', 'blouse', 'hoodie', 'sweater', 'sweatshirt', 'cardigan', 'jumper', 'jeans',
    'denim', 'pants', 'trousers', 'shorts', 'leggings', 'joggers', 'sock', 'hat', 'cap', 'beanie',
    'scarf', 'glove', 'bag', 'handbag', 'purse', 'tote', 'backpack', 'wallet', 'belt',
    'sunglasses', 'jewelry', 'jewellery', 'necklace', 'earring', 'bracelet', 'ring', 'outfit',
    'swimsuit', 'bikini', 'lingerie', 'bra', 'vest', 'suit', 'north face', 'nike', 'adidas',
    'zara', 'uniqlo', 'fashion', 'apparel', 'clothing',
  ],
  tech: [
    'headphone', 'earbud', 'airpods', 'headset', 'speaker', 'phone', 'iphone', 'smartphone',
    'android', 'laptop', 'macbook', 'ipad', 'tablet', 'computer', 'pc', 'monitor', 'keyboard',
    'mouse', 'watch', 'smartwatch', 'camera', 'lens', 'tv', 'television', 'projector', 'charger',
    'cable', 'usb', 'ssd', 'hard drive', 'gpu', 'graphics card', 'kindle', 'e-reader', 'drone',
    'router', 'gadget', 'airtag', 'doorbell', 'webcam', 'microphone', 'mic', 'tech',
  ],
  home: [
    'lamp', 'light', 'chair', 'sofa', 'couch', 'table', 'desk', 'shelf', 'shelves', 'bookcase',
    'rug', 'carpet', 'curtain', 'pillow', 'cushion', 'blanket', 'duvet', 'bedding', 'bed sheet',
    'mattress', 'bed', 'mirror', 'vase', 'candle', 'plant', 'planter', 'pot', 'mug', 'plate',
    'bowl', 'cup', 'glassware', 'cookware', 'pan', 'knife', 'knives', 'kitchen', 'fryer',
    'air fryer', 'blender', 'mixer', 'kettle', 'toaster', 'maker', 'coffee machine',
    'espresso machine', 'vacuum', 'dyson', 'storage', 'organizer', 'decor', 'furniture', 'ikea',
    'home',
  ],
  beauty: [
    'skincare', 'skin care', 'serum', 'makeup', 'make-up', 'lipstick', 'lip', 'gloss',
    'mascara', 'foundation', 'concealer', 'blush', 'bronzer', 'eyeshadow', 'eyeliner',
    'palette', 'moisturizer', 'moisturiser', 'cleanser', 'toner', 'sunscreen', 'spf', 'retinol',
    'perfume', 'fragrance', 'cologne', 'nail', 'nail polish', 'shampoo', 'conditioner', 'hair',
    'haircare', 'airwrap', 'straightener', 'face cream', 'face wash', 'facial', 'sephora', 'ulta',
    'glossier', 'beauty', 'cosmetic',
  ],
  food: [
    'food', 'snack', 'chocolate', 'candy', 'candies', 'sweets', 'coffee', 'espresso', 'tea',
    'matcha', 'boba', 'wine', 'beer', 'whisky', 'whiskey', 'pizza', 'sushi', 'burger', 'ramen',
    'noodles', 'takeout', 'takeaway', 'restaurant', 'dinner', 'lunch', 'brunch', 'cookie', 'cake',
    'pastry', 'pastries', 'chips', 'crisps', 'groceries', 'grocery', 'protein', 'ubereats',
    'doordash', 'deliveroo',
  ],
  fun: [
    'lego', 'game', 'gaming', 'video game', 'board game', 'toy', 'puzzle', 'nintendo',
    'playstation', 'ps5', 'xbox', 'console', 'controller', 'ticket', 'concert', 'festival',
    'plush', 'plushie', 'figure', 'figurine', 'collectible', 'funko', 'pokemon', 'pokémon',
    'trading card', 'vinyl', 'record', 'book', 'novel', 'comic', 'manga', 'kite', 'skateboard',
    'hobby',
  ],
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const CATEGORY_PATTERNS = (
  Object.keys(CATEGORY_KEYWORDS) as (keyof typeof CATEGORY_KEYWORDS)[]
).map((category) => {
  const alternatives = CATEGORY_KEYWORDS[category]
    .map((kw) => escapeRegExp(kw).replace(/[\s-]+/g, '[\\s-]?'))
    .join('|');
  return { category, pattern: new RegExp(String.raw`\b(?:${alternatives})(?:e?s)?\b`, 'g') };
});

/**
 * Keyword guess at a category from a name, URL or shared text. The category with the most keyword
 * hits wins; a tie goes to the hit that appears last, since the head noun usually comes last
 * ('coffee mug' -> home, 'gaming headset' -> tech). Falls back to 'other'.
 */
export function guessCategory(text: string | null | undefined): Category {
  if (!text) return 'other';
  const haystack = text.toLowerCase().replace(/[_+/.?=&#%:,;!()[\]|]+/g, ' ');
  let best: Category = 'other';
  let bestHits = 0;
  let bestLast = -1;
  for (const { category, pattern } of CATEGORY_PATTERNS) {
    const hits = allMatches(pattern, haystack);
    if (hits.length === 0) continue;
    const last = hits[hits.length - 1].index;
    if (hits.length > bestHits || (hits.length === bestHits && last > bestLast)) {
      best = category;
      bestHits = hits.length;
      bestLast = last;
    }
  }
  return best;
}
