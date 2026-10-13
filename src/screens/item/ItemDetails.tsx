import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText, cooldownPhrase } from '@/components';
import { formatMoney } from '@/lib/money';
import { colors } from '@/theme/tokens';
import { CATEGORY_NAMES, type Item } from '@/types';

import { MOOD_CHIP_LABELS } from './itemCopy';

export interface ItemTitleProps {
  item: Item;
  style?: StyleProp<ViewStyle>;
}

/** The item's name (Title/L) with its price on the right (tabular). */
export function ItemTitle({ item, style }: ItemTitleProps) {
  return (
    <View style={[styles.titleRow, style]}>
      <AppText variant="titleL" numberOfLines={3} style={styles.name} accessibilityRole="header">
        {item.name}
      </AppText>
      <AppText variant="numericM" tabular style={styles.price}>
        {formatMoney(item.priceCents, item.currency)}
      </AppText>
    </View>
  );
}

export interface ItemDetailsProps {
  item: Item;
  style?: StyleProp<ViewStyle>;
}

/**
 * Details (v2): plain key / value rows on the paper, separated by hairlines — mood, category,
 * cooldown and the optional note. No card, no chips.
 */
export function ItemDetails({ item, style }: ItemDetailsProps) {
  const rows: { key: string; value: string }[] = [
    ...(item.mood ? [{ key: 'Mood', value: MOOD_CHIP_LABELS[item.mood] }] : []),
    { key: 'Category', value: CATEGORY_NAMES[item.category] },
    { key: 'Cooldown', value: cooldownPhrase(item.cooldown) },
    ...(item.note ? [{ key: 'Note', value: item.note }] : []),
  ];
  return (
    <View style={[styles.list, style]} testID="item-details">
      {rows.map((row) => (
        <View key={row.key} style={styles.row} accessible accessibilityLabel={`${row.key}: ${row.value}`}>
          <AppText variant="bodyM" color={colors.text.secondary} style={styles.key}>
            {row.key}
          </AppText>
          <AppText variant="bodyM" style={styles.value}>
            {row.value}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 16 },
  name: { flex: 1 },
  price: {},
  list: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border.strong },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.strong,
  },
  key: { width: 96 },
  value: { flex: 1 },
});
