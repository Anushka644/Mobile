// Pure helpers for the You tab (spec §4.9): currency options, row values, demo-control copy.

import { DAY_MS } from '@/lib/melt';
import { parseMoneyToCents } from '@/lib/money';
import type { Goal } from '@/types';

export interface CurrencyOption {
  code: string;
  /** Display symbol (fixed here so it reads the same on every platform and locale). */
  symbol: string;
  name: string;
}

/** The currencies offered in the picker (spec: USD/EUR/GBP/INR/JPY…). */
export const CURRENCIES: readonly CurrencyOption[] = [
  { code: 'USD', symbol: '$', name: 'US dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British pound' },
  { code: 'INR', symbol: '₹', name: 'Indian rupee' },
  { code: 'JPY', symbol: '¥', name: 'Japanese yen' },
  { code: 'CAD', symbol: '$', name: 'Canadian dollar' },
  { code: 'AUD', symbol: '$', name: 'Australian dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss franc' },
];

/** "USD $" — the Currency row's value. Unknown codes show as the code alone. */
export function currencyLabel(code: string): string {
  const upper = (code || 'USD').toUpperCase();
  const option = CURRENCIES.find((c) => c.code === upper);
  return option ? `${option.code} ${option.symbol}` : upper;
}

/** The symbol for a TextField prefix ("$"), falling back to the code. */
export function currencyPrefix(code: string): string {
  const upper = (code || 'USD').toUpperCase();
  return CURRENCIES.find((c) => c.code === upper)?.symbol ?? upper;
}

/** The Fast-forward row's value: '' at real time, then '+1 day', '+3 days', '+12h'. */
export function offsetLabel(offsetMs: number): string {
  if (!Number.isFinite(offsetMs) || offsetMs <= 0) return '';
  const days = offsetMs / DAY_MS;
  if (Number.isInteger(days)) return `+${days} ${days === 1 ? 'day' : 'days'}`;
  const hours = Math.round(offsetMs / (60 * 60 * 1000));
  return hours >= 24 ? `+${Math.floor(days)}d ${hours % 24}h` : `+${hours}h`;
}

/** Toast after a fast-forward, e.g. "Jumped ahead a day · 2 wants thawed". */
export function fastForwardMessage(newlyThawed: number): string {
  if (newlyThawed <= 0) return 'Jumped ahead a day';
  return `Jumped ahead a day · ${newlyThawed} ${newlyThawed === 1 ? 'want' : 'wants'} thawed`;
}

/** Longest goal name accepted by the goal sheet. */
export const GOAL_NAME_MAX = 40;

export interface GoalDraft {
  name: string;
  amount: string;
}

/** A valid Goal from the sheet's fields, or null (empty name, no positive amount). */
export function parseGoalDraft(draft: GoalDraft): Goal | null {
  const name = draft.name.trim().slice(0, GOAL_NAME_MAX);
  const cents = parseMoneyToCents(draft.amount);
  if (!name || cents == null || cents <= 0) return null;
  return { name, targetCents: cents };
}

/** The amount field's initial text for an existing goal: '1200', '89.5'. */
export function goalAmountText(goal: Goal | undefined): string {
  if (!goal || !(goal.targetCents > 0)) return '';
  const units = goal.targetCents / 100;
  return Number.isInteger(units) ? String(units) : units.toFixed(2);
}
