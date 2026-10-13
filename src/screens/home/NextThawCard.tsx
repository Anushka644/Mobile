// "Next to thaw" (v2.1): the one dark moment on Home, a window into the freezer. The soonest want
// sits in its tinted frost tile under a cold blue light, with a live hh:mm:ss countdown that ticks
// every second and a thin melt line. Press → the item.

import { useRouter } from 'expo-router';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { AppText, Grain, ItemCube, PressableScale, ProgressBar } from '@/components';
import { useNow } from '@/lib/clock';
import { meltProgress, timeLeftMs } from '@/lib/melt';
import { formatMoney } from '@/lib/money';
import { colors, radius, withAlpha } from '@/theme/tokens';
import type { Item } from '@/types';

const TILE = 118;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const pad = (n: number) => String(n).padStart(2, '0');

/** "11:42:08", or "2d 04:12:33" past a day. Exported for tests. */
export function formatTicking(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86_400);
  const h = Math.floor((total % 86_400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const clock = `${pad(h)}:${pad(m)}:${pad(s)}`;
  return d > 0 ? `${d}d ${clock}` : clock;
}

export interface NextThawCardProps {
  item: Item;
  style?: StyleProp<ViewStyle>;
}

export function NextThawCard({ item, style }: NextThawCardProps) {
  const router = useRouter();
  const now = useNow(1000);
  const left = timeLeftMs(item, now);
  const progress = meltProgress(item, now);
  const price = formatMoney(item.priceCents, item.currency);
  const spoken = left > DAY ? `${Math.floor(left / DAY)} days ${Math.floor((left % DAY) / HOUR)} hours` : formatTicking(left);

  return (
    <PressableScale
      onPress={() => router.push(`/item/${item.id}`)}
      haptic="tap"
      accessibilityLabel={`Next to thaw: ${item.name}, ${price}, thaws in ${spoken}`}
      testID="next-thaw"
      style={[styles.card, style]}
    >
      {/* Cold light behind the tile. */}
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="nextThawLight" cx="78%" cy="44%" rx="55%" ry="70%">
            <Stop offset="0" stopColor={colors.ice600} stopOpacity={0.55} />
            <Stop offset="0.55" stopColor={colors.ice800} stopOpacity={0.18} />
            <Stop offset="1" stopColor={colors.night900} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx="78%" cy="44%" rx="60%" ry="80%" fill="url(#nextThawLight)" />
      </Svg>
      <Grain opacity={0.7} />

      <View style={styles.row}>
        <View style={styles.text}>
          <AppText variant="caption" color={colors.night300}>
            Next to thaw
          </AppText>
          <AppText variant="displayItalic" color={colors.white} numberOfLines={2} style={styles.name}>
            {item.name}
          </AppText>
          <AppText variant="bodyS" color={colors.night300} tabular>
            {price}
          </AppText>
        </View>
        <View style={styles.tileWrap}>
          <ItemCube item={item} progress={progress} size={TILE} radius={28} />
        </View>
      </View>

      <View style={styles.bottom}>
        <AppText variant="numericL" color={colors.white} tabular numberOfLines={1} style={styles.count}>
          {formatTicking(left)}
        </AppText>
        <ProgressBar progress={progress} height={3} animated={false} style={styles.line} />
        <View style={styles.readout}>
          <AppText variant="caption" color={colors.ice400}>
            {Math.round(progress * 100)}% melted
          </AppText>
          <AppText variant="caption" color={colors.night300}>
            Hrs · Min · Sec
          </AppText>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.night900,
    padding: 20,
    paddingBottom: 18,
    overflow: 'hidden',
    gap: 14,
    boxShadow: `0px 24px 48px -24px ${withAlpha(colors.night900, 0.55)}`,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  text: { flex: 1, gap: 6, paddingTop: 2 },
  name: { marginTop: 4 },
  tileWrap: {
    transform: [{ rotate: '6deg' }],
    borderRadius: 28,
    boxShadow: `0px 18px 30px -12px ${withAlpha(colors.ice600, 0.6)}`,
  },
  bottom: { gap: 8 },
  count: { letterSpacing: -1.5 },
  line: { backgroundColor: colors.night700 },
  readout: { flexDirection: 'row', justifyContent: 'space-between' },
});
