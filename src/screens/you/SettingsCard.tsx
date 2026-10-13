import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { StyleSheet, View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';

import { AppText, Icon, IconBadge, PressableScale, type IconName } from '@/components';
import { colors, radius, shadow } from '@/theme/tokens';

// Row geometry from 07-you@2x.png: 60 tall, 16 side padding, a 36 rounded badge, 12 to the label;
// hairline dividers start at the label and run to the card's right edge.
const ROW_HEIGHT = 60;
const PAD = 16;
const BADGE = 36;
const BADGE_GAP = 12;

export interface SettingsCardProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** White r28 Clay/Raised card that stacks SettingsRows with inset hairline dividers. */
export function SettingsCard({ children, style, testID }: SettingsCardProps) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[styles.card, style]} testID={testID}>
      <View style={styles.clip}>
        {rows.map((row, i) => (
          <Fragment key={row.key ?? i}>
            {i > 0 ? <View style={styles.divider} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

export interface SettingsRowProps {
  icon: IconName;
  /** Badge background (soft tint). */
  tint: ColorValue;
  /** Badge glyph colour. */
  ink: ColorValue;
  label: string;
  /** Label colour (e.g. coral for "Reset everything"). Default text.primary. */
  labelColor?: ColorValue;
  /** Body/L plum500 value before the chevron, e.g. "3 days". */
  value?: string;
  /** Show the value in plum300 (a placeholder such as "Add one"). */
  valueMuted?: boolean;
  /** What screen readers say for the value when the shown one is shortened (e.g. the full goal name). */
  accessibilityValue?: string;
  /** A trailing control (e.g. a Toggle) instead of the value + chevron. */
  accessory?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityHint?: string;
  /** Screen-reader role. Default 'button' (pressable rows). */
  accessibilityRole?: 'button' | 'switch';
  accessibilityState?: { checked?: boolean };
  testID?: string;
}

/** A settings row: tinted badge, label, value + chevron (or an accessory such as a Toggle). */
export function SettingsRow({
  icon,
  tint,
  ink,
  label,
  labelColor = colors.text.primary,
  value,
  valueMuted,
  accessibilityValue,
  accessory,
  onPress,
  onLongPress,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityState,
  testID,
}: SettingsRowProps) {
  const content = (
    <>
      <IconBadge icon={icon} tint={tint} color={ink} size={BADGE} iconSize={20} shape="rounded" />
      <AppText variant="labelL" color={labelColor} numberOfLines={1} style={styles.label}>
        {label}
      </AppText>
      <View style={styles.trailing}>
        {accessory ?? (
          <>
            {value ? (
              <AppText
                variant="bodyL"
                color={valueMuted ? colors.text.tertiary : colors.text.secondary}
                numberOfLines={1}
                style={styles.value}
              >
                {value}
              </AppText>
            ) : null}
            <Icon name="chevron-right" size={20} color={colors.text.tertiary} strokeWidth={2.2} />
          </>
        )}
      </View>
    </>
  );

  const spokenValue = accessibilityValue ?? value;
  if (!onPress && !onLongPress) {
    return (
      <View style={styles.row} testID={testID}>
        {content}
      </View>
    );
  }
  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      haptic={onPress ? 'tap' : false}
      scaleTo={0.98}
      pressedStyle={styles.pressed}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={spokenValue ? `${label}, ${spokenValue}` : label}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState}
      style={styles.row}
      testID={testID}
    >
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.bg.surface,
    ...shadow('raised'),
  },
  clip: { borderRadius: radius.lg, overflow: 'hidden', paddingVertical: 4 },
  divider: {
    height: 1,
    marginLeft: PAD + BADGE + BADGE_GAP,
    backgroundColor: colors.border.subtle,
  },
  row: {
    minHeight: ROW_HEIGHT,
    paddingHorizontal: PAD,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: BADGE_GAP,
  },
  pressed: { backgroundColor: colors.bg.elevated },
  // Labels are short and fixed, so they keep their width (up to 72% at large text sizes) and a long
  // value (a goal name) ellipsizes instead; the trailing group fills the rest, right-aligned.
  label: { flexShrink: 0, maxWidth: '72%' },
  trailing: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  value: { flexShrink: 1 },
});
