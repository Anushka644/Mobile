import { StyleSheet, View } from 'react-native';

import { AppText, Cube } from '@/components';
import { colors, withAlpha } from '@/theme/tokens';

import { MIN_DECISIONS } from './insightsModel';

export interface InsightsEmptyProps {
  /** Decisions made so far (0 or 1). */
  decided: number;
}

/** Fewer than two decisions (spec §4.8): a half-melted cube and a calm "come back later". */
export function InsightsEmpty({ decided }: InsightsEmptyProps) {
  return (
    <View style={styles.wrap} testID="insights-empty">
      <Cube progress={0.5} size={190} category="other" glyph="chart" accessibilityLabel="A half-melted ice cube" />
      <View style={styles.text}>
        <AppText variant="titleL" align="center">
          Insights appear after a few decisions.
        </AppText>
        <AppText variant="bodyM" color={colors.text.secondary} align="center">
          When a want thaws, keep it or let it go. Your patterns show up here.
        </AppText>
      </View>
      <View style={styles.progress} accessible accessibilityLabel={`${decided} of ${MIN_DECISIONS} decisions so far`}>
        {Array.from({ length: MIN_DECISIONS }, (_, i) => (
          <View key={i} style={[styles.dot, i < decided ? styles.dotOn : null]} />
        ))}
        <AppText variant="labelS" color={colors.text.secondary} style={styles.count}>
          {decided} of {MIN_DECISIONS} decisions
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 12, paddingTop: 12 },
  text: { gap: 8, maxWidth: 300 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: withAlpha(colors.plum300, 0.55) },
  dotOn: { backgroundColor: colors.mint500 },
  count: { marginLeft: 4 },
});
