// Copy helpers for the Thawed decision and the Let-go celebration (spec §4.5, §4.6). Pure.

import { COOLDOWN_OPTION_TEXT } from '@/components/CooldownPicker';
import { formatDuration, timeOfDayPhrase } from '@/lib/format';
import { impulseTime } from '@/lib/insights';
import { formatMoney } from '@/lib/money';
import type { CooldownKey, Item, Mood } from '@/types';

/** A word that reads as part of a proper name ("Nike", "Air"): capitalised, then lower-case letters. */
const PROPER_WORD = /^[A-Z][a-z]/;
/** A plain capitalised word that sentence case produced ("Chunky", "Noise-cancelling"). */
const SENTENCE_CASE_WORD = /^[A-Z][a-z]+(?:[-'’][a-z]+)*$/;
const ARTICLES = new Set(['a', 'an', 'the']);

/**
 * The item as a noun for running copy ("Still want the {noun}?", "You let go of the {noun}"):
 * the name lower-cased unless it looks like a proper name (spec §4.5).
 *   'Chunky sneakers' → 'chunky sneakers', 'Air fryer XL' → 'air fryer XL',
 *   'Nike Dunk Low' → 'Nike Dunk Low', 'LEGO flower bouquet' → 'LEGO flower bouquet', 'iPad' → 'iPad'.
 * A leading article is dropped so the copy never reads "the the …".
 */
export function itemNoun(name: string): string {
  let words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1 && ARTICLES.has(words[0].toLowerCase())) words = words.slice(1);
  if (words.length === 0) return 'it';
  const [first, ...rest] = words;
  const looksProper = rest.some((w) => PROPER_WORD.test(w));
  if (!looksProper && SENTENCE_CASE_WORD.test(first)) words = [first.toLowerCase(), ...rest];
  return words.join(' ');
}

/** Headline: "Still want the chunky sneakers?" */
export function thawedQuestion(name: string): string {
  const noun = itemNoun(name);
  return noun === 'it' ? 'Still want it?' : `Still want the ${noun}?`;
}

/** Mood line opener, e.g. "Felt hyped" (spec §4.5 context card). */
export const MOOD_FELT: Record<Mood, string> = {
  bored: 'Felt bored',
  sad: 'Felt sad',
  hyped: 'Felt hyped',
  stressed: 'Felt stressed',
  need: 'Felt like a need',
};

/** "Frozen 3 days ago" — measured from the original impulse (first freeze), so refreezes add up. */
export function frozenAgo(item: Pick<Item, 'frozenAt' | 'firstFrozenAt'>, now: number): string {
  return `Frozen ${formatDuration(now - impulseTime(item))} ago`;
}

/** "Felt hyped · late-night scroll" (or "Late-night scroll" without a mood). */
export function moodLine(item: Pick<Item, 'mood' | 'frozenAt' | 'firstFrozenAt'>): string {
  const phrase = timeOfDayPhrase(impulseTime(item));
  if (!item.mood) return phrase.charAt(0).toUpperCase() + phrase.slice(1);
  return `${MOOD_FELT[item.mood]} · ${phrase}`;
}

/** Mint CTA: "Let it go · save $140". */
export function letGoLabel(item: Pick<Item, 'priceCents' | 'currency'>): string {
  return `Let it go · save ${formatMoney(item.priceCents, item.currency)}`;
}

/** Ghost CTA: "Refreeze for 3 more days" / "24 more hours" / "1 more week" / "30 more days". */
export function refreezeLabel(cooldown: CooldownKey): string {
  const t = COOLDOWN_OPTION_TEXT[cooldown];
  return `Refreeze for ${t.value} more ${t.unit}`;
}

/** The host for "Opening nike.com…", without a leading www. */
export function urlHost(url: string): string {
  const match = /^https?:\/\/([^/?#:]+)/i.exec(url);
  return (match?.[1] ?? url).replace(/^www\./i, '');
}
