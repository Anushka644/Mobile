import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { AppText, Icon, springPress, useReducedMotion, useTopInset, type IconName } from '@/components';
import { colors, radius, shadow } from '@/theme/tokens';

export interface ToastMessage {
  text: string;
  icon?: IconName;
  /** Optional trailing action, e.g. "See it". */
  action?: { label: string; onPress: () => void };
}

const SHOW_MS = 2800;

/** A tiny toast queue of one: `show()` replaces whatever is up and restarts the timer. */
export function useToast() {
  const [toast, setToast] = useState<(ToastMessage & { key: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counter = useRef(0);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  const show = useCallback((message: ToastMessage) => {
    if (timer.current) clearTimeout(timer.current);
    counter.current += 1;
    setToast({ ...message, key: counter.current });
    AccessibilityInfo.announceForAccessibility?.(message.text);
    timer.current = setTimeout(() => {
      timer.current = null;
      setToast(null);
    }, SHOW_MS);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return { toast, show, hide };
}

export interface ToastProps {
  toast: (ToastMessage & { key: number }) | null;
  onHide: () => void;
}

/**
 * A plum pill that drops in under the status bar to confirm demo actions ("Sample freezer loaded")
 * and fades out on its own. It lives at the top because the tab bar's 170pt cream fade would wash
 * out anything floating just above the bar.
 */
export function Toast({ toast, onHide }: ToastProps) {
  const top = useTopInset();
  const reduced = useReducedMotion();
  const shown = useSharedValue(0);
  const [last, setLast] = useState(toast);
  // Keep the last message on screen while it animates out.
  if (toast && toast !== last) setLast(toast);

  useEffect(() => {
    if (toast) {
      shown.set(0);
      // spring.press (damping ratio ~0.6): a quick drop that settles in ~350ms, so the action button
      // holds still for nearly all of the time the toast is up.
      shown.set(reduced ? withTiming(1, { duration: 200 }) : withSpring(1, springPress));
    } else {
      shown.set(withTiming(0, { duration: 180 }));
    }
  }, [toast, reduced, shown]);

  const style = useAnimatedStyle(() => {
    const v = shown.get();
    return { opacity: Math.min(1, v * 1.5), transform: [{ translateY: (1 - v) * -18 }, { scale: 0.94 + 0.06 * v }] };
  });

  const message = toast ?? last;
  if (!message) return null;
  return (
    <View style={[styles.wrap, { top: top + 6 }]}>
      <Animated.View
        style={[styles.toast, toast ? null : styles.noTouch, style]}
        accessibilityLiveRegion="polite"
        testID="you-toast"
      >
        {message.icon ? <Icon name={message.icon} size={18} color={colors.mint500} strokeWidth={2.4} /> : null}
        <AppText variant="labelM" color={colors.text.inverse} style={styles.text} numberOfLines={2}>
          {message.text}
        </AppText>
        {message.action ? (
          <Pressable
            onPress={() => {
              message.action?.onPress();
              onHide();
            }}
            hitSlop={10}
            accessibilityRole="button"
            style={({ pressed }) => [styles.action, pressed ? styles.actionPressed : null]}
          >
            <AppText variant="labelM" color={colors.mint500}>
              {message.action.label}
            </AppText>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 20, pointerEvents: 'box-none' },
  toast: {
    maxWidth: 353,
    minHeight: 48,
    paddingLeft: 18,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.bg.inverse,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...shadow('button'),
  },
  noTouch: { pointerEvents: 'none' },
  text: { flexShrink: 1, paddingRight: 10 },
  action: { paddingHorizontal: 12, height: 32, borderRadius: radius.full, justifyContent: 'center' },
  actionPressed: { opacity: 0.6 },
});
