import { useEffect, useRef, useState } from 'react';

import { useReducedMotion } from '@/components';

export interface CountUpOptions {
  /** Value shown before the count starts. Default 0. */
  from?: number;
  /** Duration in ms. Default 900. */
  duration?: number;
  /** Start counting (false keeps showing `from`). Default true. */
  start?: boolean;
}

/** ease-out cubic: fast start, gentle landing. */
export function easeOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 - (1 - c) ** 3;
}

/** The counted value at `elapsed` ms. Pure (exported for tests). */
export function countUpValue(from: number, to: number, elapsed: number, duration: number): number {
  if (!(duration > 0) || elapsed >= duration) return to;
  if (elapsed <= 0) return from;
  return from + (to - from) * easeOutCubic(elapsed / duration);
}

const HAS_RAF = typeof requestAnimationFrame === 'function';

/**
 * A number that counts from `from` to `target` once `start` is true (requestAnimationFrame,
 * ease-out cubic). A later target change counts on from the value on screen. Reduced motion: no
 * count, the target shows right away.
 */
export function useCountUp(target: number, { from = 0, duration = 900, start = true }: CountUpOptions = {}): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(from);
  const shown = useRef(from);
  const instant = reduced || !HAS_RAF;

  useEffect(() => {
    if (!start || instant) return;
    const origin = shown.current;
    if (origin === target) return;
    let frame = 0;
    let t0: number | null = null;
    const step = (ts: number) => {
      if (t0 == null) t0 = ts;
      const next = countUpValue(origin, target, ts - t0, duration);
      shown.current = next;
      setValue(next);
      if (next !== target) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, start, instant, duration]);

  if (!start) return from;
  return instant ? target : value;
}
