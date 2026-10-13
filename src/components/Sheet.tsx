import { useEffect, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { colors, radius, shadow, withAlpha } from '@/theme/tokens';

import { AppText } from './AppText';
import { Button, type ButtonVariant } from './Button';
import { Icon, type IconName } from './Icon';
import { IconButton } from './IconButton';
import { bottomGap, FRAME_WIDTH, GUTTER } from './layout';
import { springCalm, springPop, springSheet, timingFade, useReducedMotion } from './motion';

const BACKDROP = withAlpha(colors.plum900, 0.42);

/**
 * Cream panel that continues below the screen's bottom edge, so the sheet's spring overshoot
 * (it lifts ~40pt at the top of its bounce) never exposes a band of scrim under the panel.
 */
const SHEET_SKIRT = 120;

/**
 * Keeps a Modal mounted while its exit animation plays. `progress` animates 0 → 1 on show and
 * 1 → 0 on hide; the Modal unmounts when the hide finishes.
 */
function useModalPresence(visible: boolean, reduced: boolean, enterSpring: boolean) {
  const [mounted, setMounted] = useState(visible);
  // Mount as soon as it becomes visible (state derived during render, not in an effect).
  if (visible && !mounted) setMounted(true);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      progress.set(
        reduced || !enterSpring ? withTiming(1, timingFade) : withSpring(1, springSheet)
      );
    } else {
      progress.set(
        withTiming(0, { duration: 200 }, (finished) => {
          if (finished) scheduleOnRN(setMounted, false);
        })
      );
    }
  }, [visible, reduced, enterSpring, progress]);

  return { mounted: mounted || visible, progress };
}

// ---------------------------------------------------------------------------
// Sheet

export interface SheetProps {
  visible: boolean;
  /** Called on backdrop tap, the close button, and Android back. */
  onClose: () => void;
  /** Title/L heading; with it, a Glass close button shows on the right. */
  title?: string;
  /** Body/M line under the title. */
  subtitle?: string;
  children?: ReactNode;
  /** Style of the content area under the header. */
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * In-screen bottom sheet (edit goal, default cooldown, "Why waiting works"): plum backdrop, cream
 * panel with top radius 36 and a 36 × 5 grabber, springs up from the bottom (reduced motion: fade).
 * Content ends 24pt above the screen bottom (no home-indicator inset). Route sheets such as
 * /freeze are stack screens instead — reuse `SheetGrabber` there.
 */
export function Sheet({ visible, onClose, title, subtitle, children, contentStyle, testID }: SheetProps) {
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { mounted, progress } = useModalPresence(visible, reduced, true);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, progress.get()) }));
  const panelStyle = useAnimatedStyle(() => {
    const v = progress.get();
    // Start fully below the screen whatever the panel's height (the skirt is already off-screen).
    return reduced ? { opacity: v } : { transform: [{ translateY: (1 - v) * windowHeight }] };
  });

  if (!mounted) return null;
  return (
    <Modal
      transparent
      visible
      statusBarTranslucent
      navigationBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityLabel="Close"
            accessibilityRole="button"
          />
        </Animated.View>
        <View style={styles.sheetWrap}>
          <Animated.View
            style={[
              styles.panel,
              {
                paddingBottom: bottomGap(insets.bottom) + SHEET_SKIRT,
                marginBottom: -SHEET_SKIRT,
                maxHeight: windowHeight * 0.92 + SHEET_SKIRT,
              },
              panelStyle,
            ]}
            accessibilityViewIsModal
            testID={testID}
          >
            <SheetGrabber />
            {title ? (
              <View style={styles.header}>
                <View style={styles.headerText}>
                  <AppText variant="titleL">{title}</AppText>
                  {subtitle ? (
                    <AppText variant="bodyM" color={colors.text.secondary}>
                      {subtitle}
                    </AppText>
                  ) : null}
                </View>
                <IconButton icon="close" variant="glass" accessibilityLabel="Close" onPress={onClose} />
              </View>
            ) : null}
            <View style={[styles.content, contentStyle]}>{children}</View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** The 36 × 5 sheet grabber (plum300), centred, 10 from the top edge. */
export function SheetGrabber({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.grabber, style]} />;
}

// ---------------------------------------------------------------------------
// ConfirmDialog

export interface ConfirmDialogAction {
  label: string;
  onPress: () => void;
  /** Default: 'primary' for the first action, 'ghost' for the second. */
  variant?: ButtonVariant;
  icon?: IconName;
}

export interface ConfirmDialogProps {
  visible: boolean;
  /** Title/L, centred. e.g. "Thaw it now?" */
  title: string;
  /** Body/M plum500, centred. e.g. "Waiting is the whole trick — but it’s your call." */
  message?: string;
  /** Optional glyph in a 56 ice100 circle above the title (e.g. 'hourglass'). */
  icon?: IconName;
  /** Top button (Primary by default) — usually the calm, recommended choice ("Keep it frozen"). */
  primary: ConfirmDialogAction;
  /** Second button (Ghost by default), e.g. "Thaw now". */
  secondary?: ConfirmDialogAction;
  /** Backdrop tap / Android back (neither action's onPress is called). */
  onDismiss: () => void;
  testID?: string;
}

/**
 * Centred confirm card (spec §4.4 "Thaw it now?"): white r28 card with an optional icon, title,
 * message and two stacked buttons; pops in with spring.pop over a plum backdrop.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  icon,
  primary,
  secondary,
  onDismiss,
  testID,
}: ConfirmDialogProps) {
  const reduced = useReducedMotion();
  const { mounted, progress } = useModalPresence(visible, reduced, false);
  const pop = useSharedValue(0.9);

  useEffect(() => {
    if (visible) {
      pop.set(0.9);
      pop.set(reduced ? withTiming(1, timingFade) : withSpring(1, springPop));
    } else {
      pop.set(withSpring(0.96, springCalm));
    }
  }, [visible, reduced, pop]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const cardStyle = useAnimatedStyle(() => ({ opacity: progress.get(), transform: [{ scale: pop.get() }] }));

  if (!mounted) return null;
  return (
    <Modal
      transparent
      visible
      statusBarTranslucent
      navigationBarTranslucent
      animationType="none"
      onRequestClose={onDismiss}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onDismiss}
          accessibilityLabel="Dismiss"
          accessibilityRole="button"
        />
      </Animated.View>
      <View style={styles.dialogWrap}>
        <Animated.View
          style={[styles.dialog, cardStyle]}
          accessibilityViewIsModal
          accessibilityRole="alert"
          testID={testID}
        >
          {icon ? (
            <View style={styles.dialogIcon}>
              <Icon name={icon} size={26} color={colors.ice800} />
            </View>
          ) : null}
          <AppText variant="titleL" align="center">
            {title}
          </AppText>
          {message ? (
            <AppText variant="bodyM" color={colors.text.secondary} align="center">
              {message}
            </AppText>
          ) : null}
          <View style={styles.actions}>
            <Button
              label={primary.label}
              icon={primary.icon}
              variant={primary.variant ?? 'primary'}
              onPress={primary.onPress}
            />
            {secondary ? (
              <Button
                label={secondary.label}
                icon={secondary.icon}
                variant={secondary.variant ?? 'ghost'}
                onPress={secondary.onPress}
              />
            ) : null}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { backgroundColor: BACKDROP },
  sheetWrap: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', pointerEvents: 'box-none' },
  panel: {
    width: '100%',
    maxWidth: FRAME_WIDTH + 80,
    backgroundColor: colors.bg.canvas,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: 26,
    paddingHorizontal: GUTTER,
    ...shadow('raised'),
  },
  grabber: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.plum300,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  headerText: { flex: 1, gap: 4, paddingTop: 4 },
  content: { gap: 16 },
  dialogWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: GUTTER, pointerEvents: 'box-none' },
  dialog: {
    width: '100%',
    maxWidth: 353,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    gap: 10,
    alignItems: 'center',
    ...shadow('raised'),
  },
  dialogIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.ice100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  actions: { alignSelf: 'stretch', gap: 8, marginTop: 12 },
});
