import { forwardRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { colors, radius, typography, withAlpha } from '@/theme/tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  /** Caption label above the field (rendered uppercase), e.g. "What is it?". */
  label?: string;
  /** Optional 20px leading icon (e.g. 'link'). */
  icon?: IconName;
  /** Optional leading text, e.g. the currency symbol for a price. */
  prefix?: string;
  /** Helper / error line under the field. */
  hint?: string;
  /** Shows the hint in coral and an error border. */
  error?: boolean;
  /** Style of the outer container (label + field). */
  style?: StyleProp<ViewStyle>;
}

/**
 * Sunken input (spec §3 TextField): Caption label (plum500) 8 above a 56-high cream200 field,
 * r20, inset shadow, Body/L value, plum300 placeholder, optional leading icon or prefix.
 * Focus adds a 2px ice300 ring.
 */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, icon, prefix, hint, error, style, onFocus, onBlur, editable = true, ...inputProps },
  ref
) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.container, style]}>
      {label ? (
        <AppText variant="caption" color={colors.text.secondary}>
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.field,
          focused ? styles.focused : null,
          error ? styles.error : null,
          !editable ? styles.disabled : null,
        ]}
      >
        {icon ? <Icon name={icon} size={20} color={colors.text.secondary} /> : null}
        {prefix ? (
          <AppText variant="bodyL" color={colors.text.secondary}>
            {prefix}
          </AppText>
        ) : null}
        <TextInput
          ref={ref}
          editable={editable}
          placeholderTextColor={colors.text.tertiary}
          selectionColor={colors.ice600}
          cursorColor={colors.ice600}
          accessibilityLabel={inputProps.accessibilityLabel ?? label}
          maxFontSizeMultiplier={1.3}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={styles.input}
          {...inputProps}
        />
      </View>
      {hint ? (
        <AppText variant="bodyS" color={error ? colors.coral500 : colors.text.tertiary}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: 8 },
  field: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: colors.bg.sunken,
    borderWidth: 2,
    borderColor: 'transparent',
    boxShadow: [
      `inset 0px 2px 4px 0px ${withAlpha(colors.plum900, 0.08)}`,
      `inset 0px -1px 0px 0px ${withAlpha(colors.white, 0.6)}`,
    ].join(', '),
  },
  focused: { borderColor: colors.ice300, backgroundColor: colors.cream100 },
  error: { borderColor: colors.coral300 },
  disabled: { opacity: 0.5 },
  input: {
    flex: 1,
    height: '100%',
    ...typography.bodyL,
    color: colors.text.primary,
    paddingVertical: 0,
    // Hide the browser focus ring on web (the field draws its own ice300 focus border).
    ...(Platform.OS === 'web' ? { outlineWidth: 0 } : null),
  },
});
