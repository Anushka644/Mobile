// How much of a view the software keyboard covers, so a sheet can lift its sticky CTA and shrink
// its scroll area above the keyboard. Measured in window coordinates, which is right for the iOS
// page sheet (offset from the top of the screen) and for Android edge-to-edge (no window resize).
// When the OS already resized the window, the view ends above the keyboard and this stays 0.

import { useEffect, useRef, useState, type RefObject } from 'react';
import { Keyboard, LayoutAnimation, Platform, type KeyboardEvent, type View } from 'react-native';

/** Height (pt) of the keyboard overlap with `ref`'s bottom edge; always 0 on web. */
export function useKeyboardOverlap(ref: RefObject<View | null>): number {
  const [overlap, setOverlap] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const apply = (next: number, e: KeyboardEvent | undefined) => {
      if (next === current.current) return;
      current.current = next;
      // iOS: move in step with the keyboard (same curve as KeyboardAvoidingView).
      if (Platform.OS === 'ios' && e?.duration) {
        LayoutAnimation.configureNext({
          duration: e.duration,
          update: { duration: e.duration, type: LayoutAnimation.Types.keyboard },
        });
      }
      setOverlap(next);
    };

    const onShow = (e: KeyboardEvent) => {
      const node = ref.current;
      if (!node) return;
      const keyboardTop = e.endCoordinates.screenY;
      node.measureInWindow((_x, y, _w, h) => apply(Math.max(0, Math.round(y + h - keyboardTop)), e));
    };
    const onHide = (e: KeyboardEvent) => apply(0, e);

    const subs = [Keyboard.addListener(showEvent, onShow), Keyboard.addListener(hideEvent, onHide)];
    return () => subs.forEach((s) => s.remove());
  }, [ref]);

  return overlap;
}
