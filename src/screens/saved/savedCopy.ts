// Copy + small pure helpers for the Saved tab and the Let-go celebration (spec §4.6, §4.7).

import { formatDuration, formatShortDate } from '@/lib/format';
import { impulseTime } from '@/lib/insights';
import { formatMoney } from '@/lib/money';
import type { Goal, Item } from '@/types';

/** Goal percent for display: rounded, but never "100%" until the goal is actually reached. */
export function goalPercent(pct: number): number {
  if (!Number.isFinite(pct) || pct <= 0) return 0;
  if (pct >= 100) return 100;
  return Math.min(99, Math.round(pct));
}

/** "78%" */
export function goalPercentLabel(pct: number): string {
  return `${goalPercent(pct)}%`;
}

/** Count pill next to the jar: "8 wants let go" / "1 want let go". */
export function wantsLetGoLabel(count: number): string {
  return `${count} ${count === 1 ? 'want' : 'wants'} let go`;
}

/** Goal card caption: "$934 of $1,200". */
export function goalAmountCaption(savedCents: number, targetCents: number, currency: string): string {
  return `${formatMoney(savedCents, currency)} of ${formatMoney(targetCents, currency)}`;
}

/** Let-go card caption: "Weekend in Lisbon · $126 to go" (or "· goal reached!"). */
export function goalToGoCaption(goal: Goal, savedCents: number, currency: string): string {
  const left = goal.targetCents - savedCents;
  return left > 0 ? `${goal.name} · ${formatMoney(left, currency)} to go` : `${goal.name} · goal reached!`;
}

/** "by letting 8 wants melt away" (no-goal variant of the let-go card). */
export function meltedAwayCaption(count: number): string {
  return `by letting ${count} ${count === 1 ? 'want' : 'wants'} melt away`;
}

/** "$1,074 saved so far" */
export function savedSoFar(savedCents: number, currency: string): string {
  return `${formatMoney(savedCents, currency)} saved so far`;
}

/**
 * History row subtitle: "Let go Oct 11 · waited 3 days" / "Bought Oct 4 · waited 3 days".
 * "Waited" runs from the original impulse (first freeze) to the decision.
 */
export function historyLine(item: Pick<Item, 'decision' | 'decidedAt' | 'thawAt' | 'frozenAt' | 'firstFrozenAt'>) {
  const verb = item.decision === 'bought' ? 'Bought' : 'Let go';
  const decidedAt = item.decidedAt ?? item.thawAt;
  return `${verb} ${formatShortDate(decidedAt)} · waited ${formatDuration(decidedAt - impulseTime(item))}`;
}


