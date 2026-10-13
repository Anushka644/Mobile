import { StyleSheet, View } from 'react-native';

import { AppText, CATEGORY_ICONS, Icon } from '@/components';
import { colors } from '@/theme/tokens';

import { InsightCard } from './InsightCard';
import type { CategoryTile } from './insightsModel';
import { CATEGORY_SWATCH } from './palette';

export interface CategoryGridProps {
  tiles: CategoryTile[];
}

/** Icon column width; separators start where the text does (iOS grouped-list style). */
const ICON = 20;
const PAD = 16;
const ICON_GAP = 14;

/**
 * "By category" (v2): a quiet white card listing each kind — a monochrome line icon, the name, and
 * "3 wants · $412" on the right (every want in that category, whatever its status) — with hairline
 * separators. Biggest spend first.
 */
export function CategoryGrid({ tiles }: CategoryGridProps) {
  return (
    <InsightCard title="By category" subtitle="Everything you froze, by kind" surface="card" testID="insights-categories">
      {tiles.map((tile, i) => (
        <View
          key={tile.category}
          style={styles.row}
          accessible
          accessibilityLabel={`${tile.name}: ${tile.detail}`}
          testID={`category-${tile.category}`}
        >
          <Icon name={CATEGORY_ICONS[tile.category]} size={ICON} color={CATEGORY_SWATCH[tile.category].ink} />
          <View style={[styles.body, i > 0 ? styles.separator : null]}>
            <AppText variant="labelM" numberOfLines={1} style={styles.name}>
              {tile.name}
            </AppText>
            <AppText variant="bodyS" color={colors.text.secondary} numberOfLines={1} tabular>
              {tile.detail}
            </AppText>
          </View>
        </View>
      ))}
    </InsightCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: ICON_GAP, paddingLeft: PAD },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 52,
    paddingRight: PAD,
  },
  separator: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.strong },
  name: { flexShrink: 1 },
});
