import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { formatTimeLeftShort } from '@/lib/format';
import { isReady, meltProgress, timeLeftMs } from '@/lib/melt';
import { formatMoney } from '@/lib/money';
import { colors } from '@/theme/tokens';
import type { Item } from '@/types';

import { AppText } from './AppText';
import { ItemCube } from './Cube';
import { PressableScale } from './PressableScale';

export interface ItemCardProps {
  item: Item;
  /** App time (useNow()); drives melt progress, the countdown and the Ready variant. */
  now: number;
  /** Default: router.push('/item/[id]'), or '/thawed/[id]' when ready. */
  onPress?: (item: Item) => void;
  /** Card width. Default 170 (two per row with a 13 gap in a 353 column). Pass a style with flex to stretch. */
  width?: number;
  /** Idle cube animation. Default true. */
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Freezer grid card (v2): the frost tile edge to edge, then the name and a quiet mono line — price on
 * the left, time left (ice blue) or "Ready" on the right. No card chrome; the tile is the card. Ready
 * items get an ink ring and a brief white flash when they turn ready while mounted.
 */
export function ItemCard({ item, now, onPress, width = 170, animated = true, style, testID }: ItemCardProps) {
  const router = useRouter();
  const ready = isReady(item, now);
  const progress = meltProgress(item, now);

  const flash = useSharedValue(0);
  const wasReady = useRef(ready);
  useEffect(() => {
    if (ready && !wasReady.current) {
      flash.set(withSequence(withTiming(1, { duration: 160 }), withTiming(0, { duration: 700 })));
    }
    wasReady.current = ready;
  }, [ready, flash]);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.get() * 0.8 }));

  const handlePress = () => {
    if (onPress) onPress(item);
    else router.push(ready ? `/thawed/${item.id}` : `/item/${item.id}`);
  };

  const price = formatMoney(item.priceCents, item.currency);
  const left = formatTimeLeftShort(timeLeftMs(item, now));
  const r = Math.round(width * 0.16);

  return (
    <PressableScale
      onPress={handlePress}
      haptic="tap"
      accessibilityLabel={`${item.name}, ${price}, ${ready ? 'ready to decide' : left}`}
      testID={testID}
      style={[styles.card, { width }, style]}
    >
      <View style={[styles.stage, { borderRadius: r }, ready ? styles.readyRing : null]}>
        <ItemCube item={item} progress={progress} thawed={ready} size={width} radius={r} animated={animated} />
        <Animated.View style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />
      </View>
      <View style={styles.text}>
        <AppText variant="labelM" numberOfLines={1}>
          {item.name}
        </AppText>
        <View style={styles.row}>
          <AppText variant="bodyS" color={colors.text.secondary} numberOfLines={1} style={styles.price} tabular>
            {price}
          </AppText>
          <AppText variant="labelS" color={ready ? colors.text.primary : colors.text.ice} numberOfLines={1} tabular>
            {ready ? 'Ready' : left}
          </AppText>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  stage: { overflow: 'hidden' },
  readyRing: { boxShadow: `0px 0px 0px 2px ${colors.plum900}` },
  flash: { backgroundColor: colors.white, pointerEvents: 'none' },
  text: { gap: 3, paddingHorizontal: 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  price: { flexShrink: 1 },
});
