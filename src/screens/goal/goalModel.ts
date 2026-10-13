// The savings goal's form rules, shared by the Saved tab and the You tab (one sheet, one parser).

import { parseMoneyToCents } from '@/lib/money';
import type { Goal } from '@/types';

/** Longest goal name the sheet accepts (and the parser keeps). */
export const GOAL_NAME_MAX = 60;

/** A valid Goal from the sheet's fields, or null (needs a name and an amount above zero). Pure. */
export function parseGoalInput(name: string, amount: string): Goal | null {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  const cents = parseMoneyToCents(amount);
  if (!trimmed || cents == null || cents <= 0) return null;
  return { name: trimmed.slice(0, GOAL_NAME_MAX), targetCents: cents };
}

/** Whether the amount field holds something that isn't a positive amount (empty is fine). Pure. */
export function goalAmountInvalid(amount: string): boolean {
  if (amount.trim() === '') return false;
  const cents = parseMoneyToCents(amount);
  return cents == null || cents <= 0;
}

/** The amount field's initial text for an existing goal: '1200' or '1200.50'. Pure. */
export function goalAmountText(targetCents: number | undefined): string {
  if (targetCents == null || !(targetCents > 0)) return '';
  return targetCents % 100 === 0 ? String(targetCents / 100) : (targetCents / 100).toFixed(2);
}
