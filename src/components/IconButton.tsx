import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';

import { colors, shadow, withAlpha } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { PressableScale, type HapticKind } from './PressableScale';

export type IconButtonVariant = 'surface' | 'glass' | 'inverse';

export interface IconButtonProps {
  icon: IconName;
  /** Required for screen readers (there is no visible label). */
  accessibilityLabel: string;
  onPress?: () => void;
  /** surface = white + soft shadow, glass = frosted white 55%, inverse = plum with white icon. Default 'surface'. */
  variant?: IconButtonVariant;
  /** Circle diameter. Default 44 (icon 20). */
  size?: number;
  /** Icon color override. */
  color?: ColorValue;
  disabled?: boolean;
  /** Default 'tap'. */
  haptic?: HapticKind | false;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Blur is real on iOS and web; Android gets a denser white instead (expo-blur is experimental there). */
const CAN_BLUR = Platform.OS === 'ios' || Platform.OS === 'web';

/** 48 circular icon button (spec §3 IconButton): Surface, Glass or Inverse. */
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'surface',
  size = 44,
  color,
  disabled,
  haptic = 'tap',
  style,
  testID,
}: IconButtonProps) {
  const fg = color ?? (variant === 'inverse' ? colors.text.inverse : colors.text.primary);
  const bg =
    variant === 'inverse'
      ? colors.action.primary
      : variant === 'glass'
        ? withAlpha(colors.white, CAN_BLUR ? 0.55 : 0.82)
        : colors.bg.surface;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      haptic={haptic}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      hitSlop={size < 44 ? (44 - size) / 2 : undefined}
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        variant === 'inverse' ? shadow('button') : shadow('soft'),
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      {variant === 'glass' && CAN_BLUR ? (
        <BlurView intensity={30} tint="light" style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]} />
      ) : null}
      <View style={[StyleSheet.absoluteFill, styles.noTouch, { backgroundColor: bg, borderRadius: size / 2 }]} />
      <Icon name={icon} size={Math.round(size * 0.46)} color={fg} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  disabled: { opacity: 0.4 },
  noTouch: { pointerEvents: 'none' },
});
