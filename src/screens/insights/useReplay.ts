import { useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { useReducedMotion } from '@/components';

/**
 * A counter that increments each time the screen gains focus, so charts can replay their
 * entrance (bars grow, the keep-rate bar fills) whenever you come back to the tab.
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
 * state, for the few values Reanimated can't drive on every platform (a counting label and the
 * bar it moves with). Stays 0 until the first focus; reduced motion: always 1.
 */
export function useTween(play: number, duration = 900, delay = 0): number {
  const reduced = useReducedMotion();
  // `t` belongs to one replay: a new `play` starts it again from 0 (reset during render, so the
  // final value never flashes before the sweep).
  const [tween, setTween] = useState({ play, t: 0 });
  if (tween.play !== play) setTween({ play, t: 0 });

  useEffect(() => {
    if (reduced || play === 0) return;
    let frame = 0;
    let start: number | null = null;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      const elapsed = ts - start - delay;
      const v = elapsed <= 0 ? 0 : Math.min(1, elapsed / duration);
      setTween({ play, t: easeOutCubic(v) });
      if (v < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [play, duration, delay, reduced]);

  return reduced ? 1 : tween.play === play ? tween.t : 0;
}
