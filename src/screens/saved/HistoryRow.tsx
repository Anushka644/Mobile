import { StyleSheet, View } from 'react-native';

import { AppText, glyphForItem, ItemCube, ProductTile, productImageFor } from '@/components';
import { formatMoney } from '@/lib/money';
import { colors } from '@/theme/tokens';
import type { Item } from '@/types';

import { historyLine } from './savedCopy';

export interface HistoryRowProps {
  item: Item;
  /** Draw the hairline above the row. Default true (the list closes itself with a bottom hairline). */
  divider?: boolean;
  testID?: string;
}

/** Thumb size and corner (the clear frost tile, as on Home's ready rows). */
const THUMB = 44;
const THUMB_RADIUS = 12;

/**
 * A decided want (v2): a plain row on paper under a hairline — a 44 thumb, the name over
 * "Let go Oct 11 · waited 3 days", and the amount: ink "+$95" for a let-go, a quiet "$49" for a buy
 * (never judged).
 */
export function HistoryRow({ item, divider = true, testID }: HistoryRowProps) {
  const letGo = item.decision !== 'bought';
  const amount = formatMoney(item.priceCents, item.currency);
  const line = historyLine(item);
  return (
    <View
      style={[styles.row, divider ? styles.divider : null]}
      accessible
      accessibilityLabel={`${item.name}. ${line}. ${letGo ? `Saved ${amount}` : amount}.`}
      testID={testID}
    >
      <Thumb item={item} />
      <View style={styles.text}>
        <AppText variant="labelM" numberOfLines={1}>
          {item.name}
        </AppText>
        <AppText variant="bodyS" color={colors.text.secondary} numberOfLines={1}>
          {line}
        </AppText>
      </View>
      <AppText variant="labelM" color={letGo ? colors.text.primary : colors.text.secondary} tabular>
        {letGo ? `+${amount}` : amount}
      </AppText>
    </View>
  );
}

/** The clear frost tile around the product picture, or a quiet paper tile with the glyph. */
function Thumb({ item }: { item: Item }) {
  if (productImageFor(item)) {
    return <ItemCube item={item} progress={1} thawed size={THUMB} radius={THUMB_RADIUS} animated={false} />;
  }
  return <ProductTile category={item.category} glyph={glyphForItem(item)} size={THUMB} style={styles.tile} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 72,
    paddingVertical: 14,
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.strong },
  text: { flex: 1, gap: 3 },
  tile: { borderRadius: THUMB_RADIUS },
});
