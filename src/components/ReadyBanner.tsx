import { useRouter } from 'expo-router';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { formatAgo } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import { colors, radius, shadow } from '@/theme/tokens';
import type { Item } from '@/types';

import { AppText } from './AppText';
import { Button } from './Button';
import { ItemCube } from './Cube';
import { PressableScale } from './PressableScale';

export interface ReadyBannerProps {
  item: Item;
  /** App time (useNow()) for "thawed 2h ago". */
  now: number;
  /** Default: router.push('/thawed/[id]'). Both the card and the Decide button call it. */
  onDecide?: (item: Item) => void;
  /** Idle sparkle bobbing. Default true. */
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * "Ready to decide" row (v2): a white card with a hairline, the clear tile, the name, a mono
 * "$65 · thawed 2h ago" and a small ink Decide button.
 */
export function ReadyBanner({ item, now, onDecide, animated = true, style, testID }: ReadyBannerProps) {
  const router = useRouter();
  const decide = () => (onDecide ? onDecide(item) : router.push(`/thawed/${item.id}`));
  const price = formatMoney(item.priceCents, item.currency);
  const meta = `${price} · thawed ${formatAgo(now - item.thawAt)}`;

  return (
    <PressableScale
      onPress={decide}
      haptic="tap"
      accessibilityLabel={`${item.name}, ${meta}. Decide.`}
      testID={testID}
      style={[styles.card, style]}
    >
      <ItemCube item={item} progress={1} thawed size={56} radius={14} animated={animated} />
      <View style={styles.text}>
        <AppText variant="labelM" numberOfLines={1}>
          {item.name}
        </AppText>
        <AppText variant="bodyS" color={colors.text.secondary} numberOfLines={1}>
          {meta}
        </AppText>
      </View>
      <Button
        label="Decide"
        size="xs"
        onPress={decide}
        accessibilityLabel={`Decide on ${item.name}`}
        style={styles.decide}
      />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 10,
    paddingRight: 12,
    borderRadius: radius.md,
    backgroundColor: colors.bg.surface,
    ...shadow('raised'),
  },
  text: { flex: 1, gap: 3 },
  decide: { alignSelf: 'center' },
});
