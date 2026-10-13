import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components';
import { formatMoney } from '@/lib/money';
import { colors } from '@/theme/tokens';
import type { Item } from '@/types';

import { frozenAgo, moodLine } from './thawedCopy';

export interface ContextCardProps {
  item: Item;
  now: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * The decision's one line of context (v2): what you felt when you froze it — "Felt hyped ·
 * afternoon break" in quiet Body/M, centred under the question. No card, no mood badge; screen
 * readers also hear when it was frozen and the price.
 */
export function ContextCard({ item, now, style }: ContextCardProps) {
  const line = moodLine(item);
  const price = formatMoney(item.priceCents, item.currency);
  return (
    <View
      style={[styles.wrap, style]}
      accessible
      accessibilityLabel={`${frozenAgo(item, now)}. ${line}. ${price}.`}
      testID="thawed-context"
    >
      <AppText variant="bodyL" color={colors.text.secondary} align="center" numberOfLines={2}>
        {line}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', paddingHorizontal: 12 },
});
