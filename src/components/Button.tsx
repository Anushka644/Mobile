import { ActivityIndicator, StyleSheet, View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadow, typography } from '@/theme/tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale, type HapticKind } from './PressableScale';

export type ButtonVariant = 'primary' | 'secondary' | 'ice' | 'mint' | 'ghost' | 'light' | 'ghostLight';
/** md = 56 high (Label/L), sm = 46 (Label/M), xs = 36 compact pill (Label/S, padding 14). */
export type ButtonSize = 'md' | 'sm' | 'xs';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  /** Default 'primary'. */
  variant?: ButtonVariant;
  /** Default 'md'. */
  size?: ButtonSize;
  /** Optional leading icon (22 at md). */
  icon?: IconName;
  disabled?: boolean;
  /** Shows a spinner instead of the label and blocks presses. */
  loading?: boolean;
  /** Stretch to the parent's width (default true for md, false otherwise). */
  fullWidth?: boolean;
  /** Haptic on press. Default 'tap'. */
  haptic?: HapticKind | false;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

const VARIANTS: Record<ButtonVariant, { bg: ColorValue | undefined; fg: ColorValue; surface: ViewStyle }> = {
  primary: { bg: colors.action.primary, fg: colors.text.inverse, surface: shadow('button') },
  secondary: { bg: colors.bg.surface, fg: colors.plum900, surface: shadow('soft') },
  ice: { bg: colors.ice100, fg: colors.ice800, surface: {} },
  mint: { bg: colors.ice600, fg: colors.white, surface: shadow('button') },
  ghost: { bg: undefined, fg: colors.plum500, surface: {} },
  /** On night surfaces: a white pill with ink text. */
  light: { bg: colors.white, fg: colors.plum900, surface: {} },
  /** On night surfaces: text only, soft white. */
  ghostLight: { bg: undefined, fg: colors.night300, surface: {} },
};

const SIZES: Record<ButtonSize, { height: number; padding: number; icon: number; text: keyof typeof typography }> = {
  md: { height: 56, padding: 24, icon: 20, text: 'labelL' },
  sm: { height: 46, padding: 20, icon: 18, text: 'labelM' },
  xs: { height: 36, padding: 14, icon: 16, text: 'labelS' },
};

/**
 * Pill button (v2): Primary (ink), Secondary (white + hairline), Ice (frost), Mint (ice-blue accent),
 * Ghost (text); on night surfaces, Light (white pill) and GhostLight (soft white text). Press = spring.press; Ghost turns sunken while pressed; disabled = 40% opacity.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  loading = false,
  fullWidth,
  haptic = 'tap',
  style,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const v = VARIANTS[variant];
  const s = SIZES[size];
  const stretch = fullWidth ?? size === 'md';
  const inactive = disabled || loading;

  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      haptic={haptic}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ busy: loading }}
      testID={testID}
      pressedStyle={variant === 'ghost' ? styles.ghostPressed : variant === 'ghostLight' ? styles.ghostLightPressed : undefined}
      style={[
        styles.base,
        { height: s.height, paddingHorizontal: s.padding, backgroundColor: v.bg },
        v.surface,
        stretch ? styles.stretch : styles.hug,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={s.icon} color={v.fg} strokeWidth={1.9} /> : null}
          <AppText variant={s.text} color={v.fg} numberOfLines={1}>
            {label}
          </AppText>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stretch: { alignSelf: 'stretch' },
  hug: { alignSelf: 'flex-start' },
  disabled: { opacity: 0.4 },
  ghostPressed: { backgroundColor: colors.bg.sunken },
  ghostLightPressed: { backgroundColor: colors.night700 },
});
