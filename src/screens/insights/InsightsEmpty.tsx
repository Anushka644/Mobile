import { StyleSheet, View } from 'react-native';

import { AppText, Cube } from '@/components';
import { colors } from '@/theme/tokens';

import { MIN_DECISIONS } from './insightsModel';

export interface InsightsEmptyProps {
  /** Decisions made so far (0 or 1). */
  decided: number;
}

/**
 * Fewer than two decisions (spec §4.8, v2): a half-frosted tile, a serif line, a quiet body line, and
 * the decisions so far as thin ink dashes with a mono count.
 */
export function InsightsEmpty({ decided }: InsightsEmptyProps) {
  return (
    <View style={styles.wrap} testID="insights-empty">
      <Cube progress={0.5} size={168} category="other" glyph="chart" accessibilityLabel="A half-melted ice cube" />
      <View style={styles.text}>
        <AppText variant="displayL" align="center" style={styles.line}>
          Insights appear after a few decisions.
        </AppText>
        <AppText variant="bodyM" color={colors.text.secondary} align="center">
          When a want thaws, keep it or let it go. Your patterns show up here.
        </AppText>
      </View>
      <View style={styles.progress} accessible accessibilityLabel={`${decided} of ${MIN_DECISIONS} decisions so far`}>
        <View style={styles.dashes}>
          {Array.from({ length: MIN_DECISIONS }, (_, i) => (
            <View key={i} style={[styles.dash, i < decided ? styles.dashOn : null]} />
          ))}
        </View>
        <AppText variant="caption" color={colors.text.secondary}>
          {decided} of {MIN_DECISIONS} decisions
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28, paddingHorizontal: 12, paddingTop: 12 },
  text: { gap: 10, maxWidth: 300, alignItems: 'center' },
  // Display/L is the screen title's size; the empty line steps down so the title stays the lead.
  line: { fontSize: 32, lineHeight: 34 },
  progress: { alignItems: 'center', gap: 10 },
  dashes: { flexDirection: 'row', gap: 6 },
  dash: { width: 20, height: 3, borderRadius: 1.5, backgroundColor: colors.cream300 },
  dashOn: { backgroundColor: colors.text.primary },
});
