import { StyleSheet, View } from 'react-native';

import { AppText, glyphForItem, ProductThumb, ProductTile, productImageFor } from '@/components';
import { formatMoney } from '@/lib/money';
import { colors, radius } from '@/theme/tokens';
import type { Item } from '@/types';

import { claySoft, thumbInset } from './clay';
import { historyLine } from './savedCopy';

export interface HistoryRowProps {
  item: Item;
  testID?: string;
}

/**
 * A decided want (Figma "History Row"): white r20 Clay/Soft row, 72 tall, padding 12, gap 12 —
 * a 48 product thumb, the name (Label/L) over "Let go Oct 11 · waited 3 days" (Body/S plum500),
 * and the amount: mint700 "+$95" for a let-go, a neutral plum500 "$49" for a buy (never judged).
 */
export function HistoryRow({ item, testID }: HistoryRowProps) {
  const letGo = item.decision !== 'bought';
  const amount = formatMoney(item.priceCents, item.currency);
  const line = historyLine(item);
  return (
    <View
      style={[styles.row, claySoft]}
      accessible
      accessibilityLabel={`${item.name}. ${line}. ${letGo ? `Saved ${amount}` : amount}.`}
      testID={testID}
    >
      <Thumb item={item} />
      <View style={styles.text}>
        <AppText variant="labelL" numberOfLines={1}>
          {item.name}
        </AppText>
        <AppText variant="bodyS" color={colors.text.secondary} numberOfLines={1}>
          {line}
        </AppText>
      </View>
      <AppText variant="labelM" color={letGo ? colors.text.success : colors.text.secondary} tabular>
        {letGo ? `+${amount}` : amount}
      </AppText>
    </View>
  );
}

/** 48 product thumb: the picture on a soft tile, or the clay category tile (r16, glyph 22). */
function Thumb({ item }: { item: Item }) {
  if (productImageFor(item)) return <ProductThumb item={item} size={48} style={styles.thumb} />;
  return (
    <ProductTile
      category={item.category}
      glyph={glyphForItem(item)}
      size={48}
      style={[styles.thumb, thumbInset]}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 72,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.bg.surface,
  },
  thumb: { borderRadius: 16 },
  text: { flex: 1, gap: 2 },
});
