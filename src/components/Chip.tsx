import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme/tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

export interface ChipProps {
  label: string;
  /** Optional 18px leading icon (see MOOD_ICONS / CATEGORY_ICONS in ./glyphs). */
  icon?: IconName;
  /** Plum fill + white text + button shadow. */
  selected?: boolean;
  /**
   * 'md' (default): padding 16/12, 44 high. 'sm': padding 14/8, 36 high (the tap target stays 44
   * via hitSlop) — for secondary rows such as the Freeze sheet's auto-guessed category.
   */
  size?: 'md' | 'sm';
  /** Without onPress the chip renders as a static (non-pressable) tag. */
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * Pill chip (spec §3 Chip): padding 16/12, gap 8, Label/M. Unselected white + soft shadow;
 * selected plum + white + button shadow. Pressable chips play the `selection` haptic.
 */
export function Chip({
  label,
  icon,
  selected = false,
  size = 'md',
  onPress,
  disabled,
  style,
  accessibilityLabel,
  testID,
}: ChipProps) {
  const fg = selected ? colors.text.inverse : colors.text.primary;
  const surface = [
    styles.base,
    selected ? styles.selected : styles.unselected,
    size === 'sm' ? styles.small : null,
    disabled ? styles.disabled : null,
    style,
  ];
  const content = (
    <>
      {icon ? <Icon name={icon} size={16} color={fg} strokeWidth={1.7} /> : null}
      <AppText variant="labelS" color={fg} numberOfLines={1}>
        {label}
      </AppText>
    </>
  );

  if (!onPress) {
    return (
      <View style={surface} accessibilityLabel={accessibilityLabel} testID={testID}>
        {content}
      </View>
    );
  }
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      haptic="selection"
      hitSlop={size === 'sm' ? 4 : undefined}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      testID={testID}
      style={surface}
    >
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.full,
    minHeight: 40,
  },
  small: { paddingHorizontal: 12, paddingVertical: 7, minHeight: 34 },
  unselected: {
    backgroundColor: colors.bg.surface,
    boxShadow: `inset 0px 0px 0px 1px ${colors.border.subtle}`,
  },
  selected: { backgroundColor: colors.action.primary },
  disabled: { opacity: 0.4 },
});
