// "Paste from clipboard?" suggestion (spec §4.3, 11-freeze-sheet): an ice100 card with a 2px ice300
// border, a link glyph, the shortened URL (+ price when the copied text had one) and a mini Ice
// "Paste" button. It expands in when a suggestion arrives and folds away after pasting.

import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText, Icon, PressableScale, springCalm, useReducedMotion } from '@/components';
import type { ClipboardSuggestion } from '@/lib/clipboard';
import { formatMoney } from '@/lib/money';
import { colors, radius, shadow, withAlpha } from '@/theme/tokens';

import { displayUrl } from './formLogic';

export interface ClipboardCardProps {
  suggestion: ClipboardSuggestion;
  currency: string;
  onPaste: () => void;
}

export function ClipboardCard({ suggestion, currency, onPaste }: ClipboardCardProps) {
  const price = suggestion.priceCents ? formatMoney(suggestion.priceCents, currency) : null;
  return (
    <View style={styles.card} testID="clipboard-card">
      <Icon name="link" size={22} color={colors.ice800} strokeWidth={2.2} />
      <View style={styles.text}>
        <AppText variant="labelM" numberOfLines={1}>
          Paste from clipboard?
        </AppText>
        <View style={styles.urlRow}>
          <AppText variant="bodyS" color={colors.ice800} numberOfLines={1} style={styles.url}>
            {displayUrl(suggestion.url)}
          </AppText>
          {price ? (
            <AppText variant="bodyS" color={colors.ice800} numberOfLines={1} style={styles.price}>
              {` · ${price}`}
            </AppText>
          ) : null}
        </View>
      </View>
      <MiniIceButton label="Paste" onPress={onPaste} accessibilityHint="Fills in the name, price and link" />
    </View>
  );
}

/** Compact Ice pill (32 high, 44pt touch area via hitSlop) for use inside cards. */
export function MiniIceButton({
  label,
  onPress,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  accessibilityHint?: string;
}) {
  return (
    <PressableScale
      onPress={onPress}
      haptic="tap"
      hitSlop={8}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={styles.mini}
    >
      <LinearGradient
        colors={[colors.ice100, colors.ice200]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.miniFill]}
      />
      <AppText variant="labelM" color={colors.ice800}>
        {label}
      </AppText>
    </PressableScale>
  );
}

// ---------------------------------------------------------------------------

export interface CollapsibleProps {
  open: boolean;
  children: ReactNode;
}

/**
 * Height + fade reveal for content that comes and goes above other content (no layout jump):
 * springs open to the content's measured height, folds to 0 and unmounts when closed.
 */
export function Collapsible({ open, children }: CollapsibleProps) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  const height = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (open) {
      progress.set(reduced ? withTiming(1, { duration: 220 }) : withSpring(1, springCalm));
    } else {
      progress.set(
        withTiming(0, { duration: reduced ? 180 : 280, easing: Easing.inOut(Easing.cubic) }, (finished) => {
          if (finished) scheduleOnRN(setMounted, false);
        })
      );
    }
  }, [open, reduced, progress]);

  const outer = useAnimatedStyle(() => ({ height: height.get() * progress.get() }));
  const inner = useAnimatedStyle(() => {
    const p = progress.get();
    return { opacity: Math.min(1, p * 1.4), transform: [{ translateY: (1 - p) * -10 }, { scale: 0.97 + 0.03 * p }] };
  });

  if (!mounted && !open) return null;
  return (
    <Animated.View style={[styles.clip, outer, open ? null : styles.closed]}>
      <Animated.View style={[styles.measure, inner]} onLayout={(e) => height.set(e.nativeEvent.layout.height)}>
        {children}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 64,
    paddingLeft: 16,
    paddingRight: 14,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.ice300,
    backgroundColor: colors.ice100,
  },
  text: { flex: 1, minWidth: 0, gap: 3 },
  urlRow: { flexDirection: 'row', alignItems: 'baseline' },
  url: { flexShrink: 1 },
  price: { flexShrink: 0 },
  mini: {
    height: 32,
    paddingHorizontal: 13,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: withAlpha(colors.white, 0.7),
    ...shadow('iceGlow'),
  },
  miniFill: { borderRadius: radius.full },
  clip: { overflow: 'hidden' },
  closed: { pointerEvents: 'none' },
  measure: { position: 'absolute', left: 0, right: 0, top: 0 },
});
