import { useState } from 'react';

import { reflectionPromptFor, REFLECTION_PROMPTS } from '@/lib/melt';
import type { Item } from '@/types';

/** The prompt `step` places after the item's prompt of the day, wrapping around the list. Pure. */
export function promptAt(item: Pick<Item, 'id'>, now: number, step: number): string {
  const count = REFLECTION_PROMPTS.length;
  const start = Math.max(0, REFLECTION_PROMPTS.indexOf(reflectionPromptFor(item, now)));
  return REFLECTION_PROMPTS[(((start + step) % count) + count) % count];
}

/**
 * The reflection question for an item: `reflectionPromptFor(item, now)` (stable for the day), and
 * "Another question" steps through REFLECTION_PROMPTS from there (spec §4.4).
 */
export function useReflectionPrompt(item: Pick<Item, 'id'>, now: number): { prompt: string; next: () => void } {
  const [step, setStep] = useState(0);
  return { prompt: promptAt(item, now, step), next: () => setStep((s) => s + 1) };
}
