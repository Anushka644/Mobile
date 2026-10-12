import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadow } from '@/theme/tokens';
import { COOLDOWN_KEYS, COOLDOWN_LABELS, type CooldownKey } from '@/types';

import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

/** Value / unit shown on each option (spec §3 CooldownPicker). */
export const COOLDOWN_OPTION_TEXT: Record<CooldownKey, { value: string; unit: string }> = {
  '24h': { value: '24', unit: 'hours' },
  '72h': { value: '3', unit: 'days' },
  '7d': { value: '1', unit: 'week' },
  '30d': { value: '30', unit: 'days' },
};

/** Human cooldown for copy: "3 days", "1 week", "24 hours", "30 days". */
export function cooldownPhrase(key: CooldownKey): string {
  const t = COOLDOWN_OPTION_TEXT[key];
  return `${t.value} ${t.unit}`;
}

export interface CooldownPickerProps {
  value: CooldownKey;
  onChange: (value: CooldownKey) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Four cooldown options (80 × 84, gap 11): "24 / hours", "3 / days", "1 / week", "30 / days".
 * Selected = ice200 + iceGlow + 2px ice300 border with ice800 text; unselected = white + soft.
 * Options flex to fill narrower columns. Plays the `selection` haptic.
 */
export function CooldownPicker({ value, onChange, style, testID }: CooldownPickerProps) {
  return (
    <View style={[styles.row, style]} accessibilityRole="radiogroup" testID={testID}>
      {COOLDOWN_KEYS.map((key) => {
        const selected = key === value;
        const t = COOLDOWN_OPTION_TEXT[key];
        return (
          <PressableScale
            key={key}
            onPress={() => onChange(key)}
            haptic="selection"
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={COOLDOWN_LABELS[key]}
            testID={testID ? `${testID}-${key}` : undefined}
            style={[styles.option, selected ? styles.selected : styles.unselected]}
          >
            <AppText variant="numericM" color={selected ? colors.ice800 : colors.text.primary} tabular>
              {t.value}
            </AppText>
            <AppText variant="labelS" color={selected ? colors.ice800 : colors.text.secondary}>
              {t.unit}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 11 },
  option: {
    flex: 1,
    maxWidth: 80,
    height: 84,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 2,
  },
  selected: { backgroundColor: colors.ice200, borderColor: colors.ice300, ...shadow('iceGlow') },
  unselected: { backgroundColor: colors.bg.surface, borderColor: 'transparent', ...shadow('soft') },
});
