import { useRouter } from 'expo-router';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { formatMoney } from '@/lib/money';
import { colors, radius, shadow, withAlpha } from '@/theme/tokens';

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

/** Plum "$934 saved" banner with a coin stack (spec §3 SavedBanner). Press → Saved tab. */
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
      <CoinStack />
      <View style={styles.text}>
        <AppText variant="numericM" color={colors.text.inverse} numberOfLines={1} tabular>
          {amount} saved
        </AppText>
        <AppText variant="bodyS" color={withAlpha(colors.white, 0.7)} numberOfLines={1}>
          by letting {wants} melt away
        </AppText>
      </View>
      <Icon name="chevron-right" size={22} color={colors.text.inverse} strokeWidth={2.4} />
    </PressableScale>
  );
}

/** Three overlapping 36 coins: two at the back, one in front (bottom-left). */
export function CoinStack({ size = 36 }: { size?: number }) {
  const s = size / 36;
  return (
    <View style={{ width: 58 * s, height: 56 * s }}>
      <Coin size={size} rotate={12} style={[styles.abs, { left: 20 * s, top: 2 * s }]} />
      <Coin size={size} rotate={-8} style={[styles.abs, { left: 10 * s, top: -4 * s }]} />
      <Coin size={size} rotate={-18} style={[styles.abs, { left: 0, top: 20 * s }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.inverse,
    ...shadow('button'),
  },
  text: { flex: 1, gap: 2 },
  abs: { position: 'absolute' },
});
