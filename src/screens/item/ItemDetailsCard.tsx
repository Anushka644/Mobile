import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText, CATEGORY_ICONS, Chip, MOOD_ICONS } from '@/components';
import { formatMoney } from '@/lib/money';
import { colors, radius, shadow, typography } from '@/theme/tokens';
import { CATEGORY_NAMES, type Item } from '@/types';

import { MOOD_CHIP_LABELS } from './itemCopy';

export interface ItemDetailsCardProps {
  item: Item;
  style?: StyleProp<ViewStyle>;
}

/**
 * Details card (spec §4.4): name (Title/L) with the price (Numeric/M) on the right, chips for the
 * mood ("Felt hyped") and the category, and the optional note (Body/M plum500).
 */
export function ItemDetailsCard({ item, style }: ItemDetailsCardProps) {
  const price = formatMoney(item.priceCents, item.currency);
  return (
    <View style={[styles.card, style]} testID="item-details">
      <View style={styles.titleRow}>
        <AppText variant="titleL" numberOfLines={3} style={styles.name} accessibilityRole="header">
          {item.name}
        </AppText>
        <AppText variant="numericM" tabular style={styles.price}>
          {price}
        </AppText>
      </View>
      <View style={styles.chips}>
        {item.mood ? <Chip label={MOOD_CHIP_LABELS[item.mood]} icon={MOOD_ICONS[item.mood]} /> : null}
        <Chip label={CATEGORY_NAMES[item.category]} icon={CATEGORY_ICONS[item.category]} />
      </View>
      {item.note ? (
        <AppText variant="bodyM" color={colors.text.secondary} style={styles.note}>
          {item.note}
        </AppText>
      ) : null}
    </View>
  );
}

// Centre the price on the title's first line (Title/L 30 vs Numeric/M 26 line heights).
const PRICE_NUDGE = ((typography.titleL.lineHeight ?? 30) - (typography.numericM.lineHeight ?? 26)) / 2;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: 20,
    gap: 14,
    ...shadow('raised'),
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  name: { flex: 1 },
  price: { marginTop: PRICE_NUDGE },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  note: { marginTop: -2 },
});
