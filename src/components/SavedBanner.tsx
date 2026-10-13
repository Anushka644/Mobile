import { useRouter } from 'expo-router';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { formatMoney } from '@/lib/money';
import { colors, shadow } from '@/theme/tokens';

import { AppText } from './AppText';
import { Coin } from './Coin';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';

export interface SavedBannerProps {
  /** Total saved (sum of let-go prices), in cents. */
  savedCents: number;
  /** How many items were let go ("by letting 8 wants melt away"). */
  letGoCount: number;
  /** ISO currency for the amount. Default 'USD'. */
  currency?: string;
  /** Default: navigate to the Saved tab. */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Home's saved line (v2): no banner chrome — a big light "$934" over "saved by letting 6 wants melt",
 * between two hairlines, with a round arrow. Press → Saved tab.
 */
export function SavedBanner({ savedCents, letGoCount, currency = 'USD', onPress, style, testID }: SavedBannerProps) {
  const router = useRouter();
  const amount = formatMoney(savedCents, currency);
  const wants = `${letGoCount} ${letGoCount === 1 ? 'want' : 'wants'}`;
  return (
    <PressableScale
      onPress={onPress ?? (() => router.navigate('/saved'))}
      haptic="tap"
      accessibilityLabel={`${amount} saved by letting ${wants} melt away. Open your jar.`}
      testID={testID}
      style={[styles.banner, style]}
    >
      <View style={styles.text}>
        <AppText variant="numericL" numberOfLines={1} tabular>
          {amount}
        </AppText>
        <AppText variant="bodyS" color={colors.text.secondary} numberOfLines={1}>
          saved by letting {wants} melt away
        </AppText>
      </View>
      <View style={styles.arrow}>
        <Icon name="arrow-up-right" size={18} color={colors.text.primary} />
      </View>
    </PressableScale>
  );
}

/** Three small droplets, staggered (v2 stand-in for the old coin stack). */
export function CoinStack({ size = 36 }: { size?: number }) {
  const s = size / 36;
  return (
    <View style={{ width: 58 * s, height: 56 * s }}>
      <Coin size={size * 0.7} style={[styles.abs, { left: 28 * s, top: 4 * s }]} />
      <Coin size={size * 0.9} style={[styles.abs, { left: 0, top: 12 * s }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.strong,
  },
  text: { flex: 1, gap: 2 },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.surface,
    ...shadow('soft'),
  },
  abs: { position: 'absolute' },
});
