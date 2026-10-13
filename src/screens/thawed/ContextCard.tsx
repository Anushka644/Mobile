import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View } from 'react-native';

import { AppText, Icon, MOOD_ICONS, MOOD_INK, MOOD_TINT } from '@/components';
import { formatMoney } from '@/lib/money';
import { colors, radius, withAlpha } from '@/theme/tokens';
import type { Item } from '@/types';

import { claySoft } from '../saved/clay';
import { frozenAgo, moodLine } from './thawedCopy';

const CAN_BLUR = Platform.OS === 'ios' || Platform.OS === 'web';

export interface ContextCardProps {
  item: Item;
  now: number;
}

/**
 * Thawed context card (spec §4.5, Figma "Context"): frosted white pill-card, r28, padding 16, gap 12.
 * A 44 mood circle, "Frozen 3 days ago" (Label/M) over "Felt hyped · late-night scroll" (Body/S
 * plum500), and the price (Numeric/M) on the right.
 */
export function ContextCard({ item, now }: ContextCardProps) {
  const frozen = frozenAgo(item, now);
  const line = moodLine(item);
  const price = formatMoney(item.priceCents, item.currency);
  return (
    <View
      style={[styles.card, claySoft]}
      accessible
      accessibilityLabel={`${frozen}. ${line}. ${price}.`}
      testID="thawed-context"
    >
      <View style={[StyleSheet.absoluteFill, styles.clip]}>
        {CAN_BLUR ? <BlurView intensity={24} tint="light" style={StyleSheet.absoluteFill} /> : null}
        <View style={[StyleSheet.absoluteFill, styles.fill]} />
      </View>
      <View style={[styles.mood, { backgroundColor: item.mood ? MOOD_TINT[item.mood] : colors.ice100 }]}>
        <Icon
          name={item.mood ? MOOD_ICONS[item.mood] : 'clock'}
          size={22}
          color={item.mood ? MOOD_INK[item.mood] : colors.ice800}
        />
      </View>
      <View style={styles.text}>
        <AppText variant="labelM" numberOfLines={1}>
          {frozen}
        </AppText>
        <AppText variant="bodyS" color={colors.text.secondary} numberOfLines={1}>
          {line}
        </AppText>
      </View>
      <AppText variant="numericM" style={styles.price}>
        {price}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 60,
    borderRadius: radius.lg,
  },
  clip: { borderRadius: radius.lg, overflow: 'hidden' },
  fill: { backgroundColor: withAlpha(colors.white, CAN_BLUR ? 0.82 : 0.94) },
  mood: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  price: { marginLeft: 4 },
});
