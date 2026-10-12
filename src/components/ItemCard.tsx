import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { formatTimeLeftShort } from '@/lib/format';
import { isReady, meltProgress, timeLeftMs } from '@/lib/melt';
import { formatMoney } from '@/lib/money';
import { colors, radius, shadow } from '@/theme/tokens';
import type { Item } from '@/types';

import { AppText } from './AppText';
import { ItemCube } from './Cube';
import { Pill } from './Pill';
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

const BORDER = 2.5;

/**
 * Freezer grid card (spec §3 ItemCard): stage with the melting Cube, name, price and a time-left
 * pill. Ready items get a 2.5px mint border, mint stage and a Ready pill — and a mint flash when
 * they turn ready while mounted.
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
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.get() * 0.7 }));

  const handlePress = () => {
    if (onPress) onPress(item);
    else router.push(ready ? `/thawed/${item.id}` : `/item/${item.id}`);
  };

  const price = formatMoney(item.priceCents, item.currency);
  const left = formatTimeLeftShort(timeLeftMs(item, now));

  return (
    <PressableScale
      onPress={handlePress}
      haptic="tap"
      accessibilityLabel={`${item.name}, ${price}, ${ready ? 'ready to decide' : left}`}
      testID={testID}
      style={[styles.card, { width, borderColor: ready ? colors.mint500 : 'transparent' }, style]}
    >
      <View style={[styles.stage, { backgroundColor: ready ? colors.mint100 : colors.ice50 }]}>
        <ItemCube item={item} progress={progress} thawed={ready} size={128} animated={animated} />
        <Animated.View style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />
      </View>
      <AppText variant="titleS" numberOfLines={1}>
        {item.name}
      </AppText>
      <View style={styles.row}>
        <AppText variant="labelM" color={colors.text.secondary} numberOfLines={1} style={styles.price}>
          {price}
        </AppText>
        {ready ? <Pill tone="ready" label="Ready" /> : <Pill tone="ice" label={left} />}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12 - BORDER,
    gap: 8,
    borderWidth: BORDER,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.surface,
    ...shadow('raised'),
  },
  stage: {
    height: 128,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  flash: { backgroundColor: colors.mint300, pointerEvents: 'none' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  price: { flexShrink: 1 },
});
