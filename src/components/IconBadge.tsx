import { StyleSheet, View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';

export interface IconBadgeProps {
  icon: IconName;
  /** Background tint. Default paper (sunken). */
  tint?: ColorValue;
  /** Icon color. Default ink. */
  color?: ColorValue;
  /** Box size. Default 44. Icon is ~half of it. */
  size?: number;
  /** 'circle' (Thawed context card, Insights mood rows) or 'rounded' (You settings rows, r = size × 0.3). Default 'circle'. */
  shape?: 'circle' | 'rounded';
  /** Icon size override. */
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
}

/** A tinted icon chip: e.g. the 44 coral100 mood circle, the 36 tinted squares on the You tab. */
export function IconBadge({
  icon,
  tint = colors.bg.sunken,
  color = colors.text.primary,
  size = 44,
  shape = 'circle',
  iconSize,
  style,
}: IconBadgeProps) {
  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: shape === 'circle' ? size / 2 : Math.round(size * 0.3),
          backgroundColor: tint,
        },
        style,
      ]}
    >
      <Icon name={icon} size={iconSize ?? Math.round(size * 0.46)} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
