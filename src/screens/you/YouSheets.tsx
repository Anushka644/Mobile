// The You tab's bottom sheets: default cooldown, currency and "Why waiting works" (the savings
// goal sheet is shared with the Saved tab: src/screens/goal/GoalSheet.tsx).

import { StyleSheet, View } from 'react-native';

import { AppText, Button, CooldownPicker, PressableScale, Sheet } from '@/components';
import { colors, fontFamily, radius, withAlpha } from '@/theme/tokens';
import type { CooldownKey } from '@/types';

import { UrgeCurve } from './UrgeCurve';
import { CURRENCIES } from './youModel';

// ---------------------------------------------------------------------------
// Default cooldown

export interface CooldownSheetProps {
  visible: boolean;
  value: CooldownKey;
  onChange: (value: CooldownKey) => void;
  onClose: () => void;
}

export function CooldownSheet({ visible, value, onChange, onClose }: CooldownSheetProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Default cooldown"
      subtitle="New wants start with this. You can still pick per item."
      testID="sheet-cooldown"
    >
      <CooldownPicker value={value} onChange={onChange} style={styles.picker} testID="default-cooldown" />
      <Button label="Done" onPress={onClose} />
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Currency

export interface CurrencySheetProps {
  visible: boolean;
  value: string;
  onChange: (code: string) => void;
  onClose: () => void;
}

/** Two columns of white hairline tiles; the selected currency is ink, its symbol set in the serif. */
export function CurrencySheet({ visible, value, onChange, onClose }: CurrencySheetProps) {
  const current = value.toUpperCase();
  return (
    <Sheet visible={visible} onClose={onClose} title="Currency" testID="sheet-currency">
      <View style={styles.grid} accessibilityRole="radiogroup">
        {CURRENCIES.map((c) => {
          const selected = c.code === current;
          const fg = selected ? colors.text.inverse : colors.text.primary;
          return (
            <PressableScale
              key={c.code}
              onPress={() => onChange(c.code)}
              haptic="selection"
              accessibilityRole="radio"
              accessibilityState={{ selected, checked: selected }}
              accessibilityLabel={`${c.name}, ${c.code}`}
              style={[styles.currency, selected ? styles.currencyOn : styles.currencyOff]}
              testID={`currency-${c.code}`}
            >
              <AppText variant="displayItalic" color={fg} style={styles.symbol} numberOfLines={1}>
                {c.symbol}
              </AppText>
              <View style={styles.currencyText}>
                <AppText variant="labelM" color={fg}>
                  {c.code}
                </AppText>
                <AppText
                  variant="bodyS"
                  color={selected ? withAlpha(colors.white, 0.6) : colors.text.secondary}
                  numberOfLines={1}
                >
                  {c.name}
                </AppText>
              </View>
            </PressableScale>
          );
        })}
      </View>
      <AppText variant="bodyS" color={colors.text.secondary}>
        Prices you’ve already frozen keep their amounts.
      </AppText>
      <Button label="Done" onPress={onClose} />
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Why waiting works

export interface WhyWaitingSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function WhyWaitingSheet({ visible, onClose }: WhyWaitingSheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Why waiting works" testID="sheet-why">
      <UrgeCurve height={150} style={styles.curve} />
      <AppText variant="bodyL" color={colors.text.secondary}>
        Impulse wants peak fast and fade. A cooling-off period lets the calmer you decide.
      </AppText>
      <Button label="Got it" onPress={onClose} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  picker: { justifyContent: 'space-between', marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  currency: {
    flexGrow: 1,
    flexBasis: '45%',
    height: 60,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currencyOff: {
    backgroundColor: colors.bg.surface,
    boxShadow: `inset 0px 0px 0px 1px ${colors.border.subtle}`,
  },
  currencyOn: { backgroundColor: colors.action.primary },
  // The serif symbol sits in a fixed column so the codes line up down the grid.
  symbol: { width: 26, fontFamily: fontFamily.serif, textAlign: 'center' },
  currencyText: { flex: 1 },
  curve: { marginTop: 4, marginBottom: 4 },
});
