import { useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { useReducedMotion } from '@/components';

/**
 * A counter that increments each time the screen gains focus, so charts can replay their
 * entrance (bars grow, the ring sweeps) whenever you come back to the tab.
 */
export function useFocusReplay(): number {
  const focused = useIsFocused();
  const [play, setPlay] = useState(0);
  const wasFocused = useRef(false);
  useEffect(() => {
    if (focused && !wasFocused.current) setPlay((p) => p + 1);
    wasFocused.current = focused;
  }, [focused]);
  return play;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * 0 → 1 over `duration` ms (ease-out cubic), restarting whenever `play` changes. Frame-driven React
 * state, for the few values Reanimated can't drive on every platform (SVG arc geometry, a
 * counting label). Stays 0 until the first focus; reduced motion: always 1.
 */
export function useTween(play: number, duration = 900, delay = 0): number {
  const reduced = useReducedMotion();
  // Starts at 0 and waits for the first focus (play 1), so nothing flashes at its final value.
  const [t, setT] = useState(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      setT(1);
      return;
    }
    if (play === 0) return;
    setT(0);
    let frame = 0;
    let start: number | null = null;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      const elapsed = ts - start - delay;
      const v = elapsed <= 0 ? 0 : Math.min(1, elapsed / duration);
      setT(easeOutCubic(v));
      if (v < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [play, duration, delay, reduced]);

  return t;
}
