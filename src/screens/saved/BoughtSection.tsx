import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { AppText, Icon, springCalm, springPress, useReducedMotion } from '@/components';
import { formatMoney } from '@/lib/money';
import { colors } from '@/theme/tokens';
import type { Item } from '@/types';

import { HistoryRow } from './HistoryRow';

export interface BoughtSectionProps {
  items: Item[];
  currency: string;
  /** Start expanded. Default false. */
  initiallyOpen?: boolean;
}

/**
 * "You bought" (spec §4.7): a collapsible, neutral list of the wants you decided to buy, newest
 * first. The header shows the count and total spent in plain plum — no judgement, no red.
 */
export function BoughtSection({ items, currency, initiallyOpen = false }: BoughtSectionProps) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(initiallyOpen);
  const turn = useSharedValue(initiallyOpen ? 1 : 0);

  useEffect(() => {
    turn.set(withSpring(open ? 1 : 0, reduced ? springCalm : springPress));
  }, [open, reduced, turn]);

  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get() * 180}deg` }] }));

  if (items.length === 0) return null;
  const spent = items.reduce((sum, i) => sum + (Number.isFinite(i.priceCents) ? i.priceCents : 0), 0);
  const summary = `${items.length} ${items.length === 1 ? 'want' : 'wants'} · ${formatMoney(spent, currency)}`;

  return (
    <View style={styles.section} testID="saved-bought">
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={styles.header}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`You bought, ${summary}`}
        testID="saved-bought-toggle"
      >
        <AppText variant="titleM">You bought</AppText>
        <View style={styles.trailing}>
          <AppText variant="labelS" color={colors.text.secondary}>
            {summary}
          </AppText>
          <Animated.View style={chevronStyle}>
            <Icon name="chevron-down" size={18} color={colors.text.secondary} />
          </Animated.View>
        </View>
      </Pressable>
      {open ? (
        <View style={styles.list}>
          {items.map((item, i) => (
            <Animated.View
              key={item.id}
              entering={reduced ? FadeIn.duration(180) : FadeInDown.delay(i * 40).springify().damping(18)}
              exiting={FadeOut.duration(140)}
            >
              <HistoryRow item={item} testID={`bought-${item.id}`} />
            </Animated.View>
          ))}
          <AppText variant="bodyS" color={colors.text.tertiary} align="center" style={styles.note}>
            Still wanted after the wait — that’s a good buy.
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 44 },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  list: { gap: 10 },
  note: { marginTop: 4 },
});
