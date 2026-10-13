import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText, Icon, PressableScale, type IconName } from '@/components';
import { colors, radius, shadow } from '@/theme/tokens';

// v2 grouped list (iOS settings style): 56pt rows on a white card, a monochrome 20pt line icon, the
// label, the value in secondary text and a quiet chevron. Hairline dividers start at the label.
const ROW_HEIGHT = 56;
const PAD = 16;
const ICON = 20;
const ICON_GAP = 14;

export interface SettingsCardProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** White card (hairline lift) that stacks SettingsRows with inset hairline dividers. */
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
  label: string;
  /** 'destructive' sets the icon and label in red (e.g. "Reset everything"). Default 'default'. */
  tone?: 'default' | 'destructive';
  /** Secondary value before the chevron, e.g. "3 days". */
  value?: string;
  /** Show the value in tertiary text (a placeholder such as "Add one"). */
  valueMuted?: boolean;
  /** What screen readers say for the value when the shown one is shortened (e.g. the full goal name). */
  accessibilityValue?: string;
  /** A trailing control (e.g. a Toggle) instead of the value + chevron. */
  accessory?: ReactNode;
  /** Show the chevron (rows that open something). Default true; actions pass false. */
  chevron?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityHint?: string;
  /** Screen-reader role. Default 'button' (pressable rows). */
  accessibilityRole?: 'button' | 'switch';
  accessibilityState?: { checked?: boolean };
  testID?: string;
}

/** A settings row: line icon, label, value + chevron (or an accessory such as a Toggle). */
export function SettingsRow({
  icon,
  label,
  tone = 'default',
  value,
  valueMuted,
  accessibilityValue,
  accessory,
  chevron = true,
  onPress,
  onLongPress,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityState,
  testID,
}: SettingsRowProps) {
  const ink = tone === 'destructive' ? colors.coral500 : colors.text.primary;
  const content = (
    <>
      <Icon name={icon} size={ICON} color={ink} strokeWidth={1.6} />
      <AppText variant="labelL" color={ink} numberOfLines={1} style={styles.label}>
        {label}
      </AppText>
      <View style={styles.trailing}>
        {accessory ?? (
          <>
            {value ? (
              <AppText
                variant="bodyM"
                color={valueMuted ? colors.text.tertiary : colors.text.secondary}
                numberOfLines={1}
                tabular
                style={styles.value}
              >
                {value}
              </AppText>
            ) : null}
            {chevron ? <Icon name="chevron-right" size={16} color={colors.text.tertiary} strokeWidth={1.8} /> : null}
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
      scaleTo={1}
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
    borderRadius: radius.md,
    backgroundColor: colors.bg.surface,
    ...shadow('raised'),
  },
  clip: { borderRadius: radius.md, overflow: 'hidden' },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: PAD + ICON + ICON_GAP,
    backgroundColor: colors.border.strong,
  },
  row: {
    minHeight: ROW_HEIGHT,
    paddingHorizontal: PAD,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ICON_GAP,
  },
  pressed: { backgroundColor: colors.bg.canvas },
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
    gap: 6,
  },
  value: { flexShrink: 1 },
});
