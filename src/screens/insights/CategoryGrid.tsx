import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText, CATEGORY_ICONS, FRAME_WIDTH, GUTTER, Icon } from '@/components';
import { colors, radius, withAlpha } from '@/theme/tokens';

import { InsightCard } from './InsightCard';
import type { CategoryTile } from './insightsModel';
import { CATEGORY_SWATCH } from './palette';

export interface CategoryGridProps {
  tiles: CategoryTile[];
}

const GAP = 11;
/** InsightCard horizontal padding. */
const CARD_PADDING = 20;

/**
 * "By category": a 2-column grid of soft tinted tiles — the category icon in a white disc, the
 * name, then "3 wants · $412" (every want in that category, whatever its status).
 */
export function CategoryGrid({ tiles }: CategoryGridProps) {
  const { width } = useWindowDimensions();
  const inner = Math.min(width, FRAME_WIDTH) - GUTTER * 2 - CARD_PADDING * 2;
  const tileWidth = Math.floor((inner - GAP) / 2);
  return (
    <InsightCard title="By category" subtitle="Everything you froze, by kind" testID="insights-categories">
      <View style={styles.grid}>
        {tiles.map((tile) => {
          const swatch = CATEGORY_SWATCH[tile.category];
          return (
            <View
              key={tile.category}
              style={[styles.tile, { width: tileWidth, backgroundColor: swatch.tint }]}
              accessible
              accessibilityLabel={`${tile.name}: ${tile.detail}`}
              testID={`category-${tile.category}`}
            >
              <View style={styles.disc}>
                <Icon name={CATEGORY_ICONS[tile.category]} size={20} color={swatch.ink} strokeWidth={2.2} />
              </View>
              <View style={styles.text}>
                <AppText variant="titleS" numberOfLines={1}>
                  {tile.name}
                </AppText>
                <AppText variant="bodyS" color={colors.text.secondary} numberOfLines={1}>
                  {tile.detail}
                </AppText>
              </View>
            </View>
          );
        })}
      </View>
    </InsightCard>
  );
}

const styles = StyleSheet.create({
  grid: { marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  tile: {
    borderRadius: radius.md,
    padding: 14,
    gap: 12,
  },
  disc: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0px 4px 10px -4px ${withAlpha(colors.plum900, 0.12)}`,
  },
  text: { gap: 1 },
});
