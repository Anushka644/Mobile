import { Pressable, StyleSheet, View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';

import { colors, typography } from '@/theme/tokens';

import { AppText } from './AppText';

export interface SectionHeaderProps {
  /** Title/M heading, e.g. "Cooling", "Melted away". */
  title: string;
  /** Optional Label/S plum500 text on the right, e.g. "Soonest first". */
  trailing?: string;
  /** Makes the trailing text a link. */
  onTrailingPress?: () => void;
  /** Small dot after the title (e.g. mint500 for "Ready to decide"). */
  dotColor?: ColorValue;
  /** Heading variant. Default 'titleM'. */
  variant?: 'titleM' | 'titleL' | 'titleS';
  style?: StyleProp<ViewStyle>;
}

/** Section title row (spec §4.2 "Cooling" / "Soonest first", "Ready to decide ●"). */
export function SectionHeader({
  title,
  trailing,
  onTrailingPress,
  dotColor,
  variant = 'titleM',
  style,
}: SectionHeaderProps) {
  const dotTop = Math.round((typography[variant].lineHeight ?? 24) / 2) - 3;
  return (
    <View style={[styles.row, style]} accessibilityRole="header">
      <View style={styles.title}>
        <AppText variant={variant} numberOfLines={1}>
          {title}
        </AppText>
        {dotColor ? <View style={[styles.dot, { backgroundColor: dotColor, marginTop: dotTop }]} /> : null}
      </View>
      {trailing ? (
        onTrailingPress ? (
          <Pressable onPress={onTrailingPress} hitSlop={10} accessibilityRole="button">
            <AppText variant="labelS" color={colors.text.secondary}>
              {trailing}
            </AppText>
          </Pressable>
        ) : (
          <AppText variant="caption" color={colors.text.tertiary}>
            {trailing}
          </AppText>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flexShrink: 1 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
