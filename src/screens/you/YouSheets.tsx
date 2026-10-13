// The You tab's bottom sheets: default cooldown, currency, savings goal and "Why waiting works".

import { useId, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { AppText, Button, CooldownPicker, Icon, PressableScale, ProgressBar, Sheet, TextField } from '@/components';
import { formatMoney } from '@/lib/money';
import { colors, radius, shadow, withAlpha } from '@/theme/tokens';
import type { CooldownKey, Goal } from '@/types';

import {
  CURRENCIES,
  currencyPrefix,
  GOAL_NAME_MAX,
  goalAmountText,
  parseGoalDraft,
  type GoalDraft,
} from './youModel';

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

export function CurrencySheet({ visible, value, onChange, onClose }: CurrencySheetProps) {
  const current = value.toUpperCase();
  return (
    <Sheet visible={visible} onClose={onClose} title="Currency" testID="sheet-currency">
      <View style={styles.grid} accessibilityRole="radiogroup">
        {CURRENCIES.map((c) => {
          const selected = c.code === current;
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
              <View style={[styles.symbol, selected ? styles.symbolOn : null]}>
                <AppText variant="titleS" color={selected ? colors.ice800 : colors.text.primary}>
                  {c.symbol}
                </AppText>
              </View>
              <View style={styles.currencyText}>
                <AppText variant="labelL" color={selected ? colors.ice800 : colors.text.primary}>
                  {c.code}
                </AppText>
                <AppText variant="bodyS" color={selected ? colors.ice800 : colors.text.secondary} numberOfLines={1}>
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
// Savings goal

export interface GoalSheetProps {
  visible: boolean;
  goal: Goal | undefined;
  currency: string;
  /** Total let go so far, for the progress line. */
  savedCents: number;
  onSave: (goal: Goal) => void;
  onRemove: () => void;
  onClose: () => void;
}

export function GoalSheet(props: GoalSheetProps) {
  // Remount the form each time the sheet opens so it starts from the stored goal.
  const [openCount, setOpenCount] = useState(0);
  const [wasVisible, setWasVisible] = useState(props.visible);
  if (props.visible !== wasVisible) {
    setWasVisible(props.visible);
    if (props.visible) setOpenCount((n) => n + 1);
  }
  return (
    <Sheet
      visible={props.visible}
      onClose={props.onClose}
      title="Savings goal"
      subtitle="Give your jar something to fill up for."
      testID="sheet-goal"
    >
      <GoalForm key={openCount} {...props} />
    </Sheet>
  );
}

function GoalForm({ goal, currency, savedCents, onSave, onRemove }: GoalSheetProps) {
  const [draft, setDraft] = useState<GoalDraft>({ name: goal?.name ?? '', amount: goalAmountText(goal) });
  const parsed = parseGoalDraft(draft);
  const progress = parsed ? Math.min(1, savedCents / parsed.targetCents) : null;

  return (
    <>
      <TextField
        label="What are you saving for?"
        placeholder="Weekend in Lisbon"
        value={draft.name}
        onChangeText={(name) => setDraft((d) => ({ ...d, name }))}
        maxLength={GOAL_NAME_MAX}
        autoCapitalize="sentences"
        returnKeyType="next"
        testID="goal-name"
      />
      <TextField
        label="Target"
        prefix={currencyPrefix(currency)}
        placeholder="1,200"
        value={draft.amount}
        onChangeText={(amount) => setDraft((d) => ({ ...d, amount }))}
        keyboardType="decimal-pad"
        returnKeyType="done"
        testID="goal-amount"
      />
      {progress != null && savedCents > 0 ? (
        <View style={styles.progress}>
          <ProgressBar progress={progress} tone="mint" height={10} />
          <AppText variant="bodyS" color={colors.text.secondary}>
            {formatMoney(savedCents, currency)} saved · {Math.round(progress * 100)}% of the way
          </AppText>
        </View>
      ) : null}
      <View style={styles.actions}>
        <Button
          label={goal ? 'Save goal' : 'Set goal'}
          icon="heart"
          disabled={!parsed}
          onPress={() => parsed && onSave(parsed)}
          testID="goal-save"
        />
        {goal ? <Button label="Remove goal" variant="ghost" onPress={onRemove} testID="goal-remove" /> : null}
      </View>
    </>
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
      <UrgeCurve />
      <AppText variant="bodyL" color={colors.text.secondary}>
        Impulse wants peak fast and fade. A cooling-off period lets the calmer you decide.
      </AppText>
      <Button label="Got it" onPress={onClose} />
    </Sheet>
  );
}

const CURVE_W = 313;
const CURVE_H = 118;
const THAW_X = 228;

/**
 * "The urge over time": a coral curve that spikes right after the freeze and fades, with the thaw
 * marked on the ice line, where the calmer you decides.
 */
function UrgeCurve() {
  const fillId = `urge${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  // Peak early (x ≈ 46), long decay to the right.
  const d = `M 0 ${CURVE_H - 14} C 18 ${CURVE_H - 30}, 30 14, 52 14 S 110 62, 170 82 S 260 98, ${CURVE_W} 100`;
  const thawY = 92;
  return (
    <View style={styles.curveCard} accessible accessibilityRole="image" accessibilityLabel="The urge to buy spikes right away and fades by the time it thaws">
      <Svg width="100%" height={CURVE_H} viewBox={`0 0 ${CURVE_W} ${CURVE_H}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.coral300} stopOpacity={0.55} />
            <Stop offset="1" stopColor={colors.coral100} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={`${d} L ${CURVE_W} ${CURVE_H} L 0 ${CURVE_H} Z`} fill={`url(#${fillId})`} />
        <Path d={d} stroke={colors.coral500} strokeWidth={3} fill="none" strokeLinecap="round" />
        <Line x1={THAW_X} y1={8} x2={THAW_X} y2={CURVE_H} stroke={colors.ice600} strokeWidth={2} strokeDasharray="4 5" strokeLinecap="round" />
        <Circle cx={THAW_X} cy={thawY} r={7} fill={colors.mint500} stroke={colors.white} strokeWidth={3} />
      </Svg>
      <View style={[styles.curveTag, { left: 12, top: 10 }]}>
        <Icon name="flame" size={14} color={colors.coral500} strokeWidth={2.4} />
        <AppText variant="labelS" color={colors.coral500}>
          The urge
        </AppText>
      </View>
      <View style={[styles.curveTag, { right: 12, top: 10 }]}>
        <Icon name="snowflake" size={14} color={colors.ice800} strokeWidth={2.4} />
        <AppText variant="labelS" color={colors.ice800}>
          Thaws · you decide
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  picker: { justifyContent: 'space-between', marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  currency: {
    flexGrow: 1,
    flexBasis: '45%',
    height: 60,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
  },
  currencyOff: { backgroundColor: colors.bg.surface, borderColor: 'transparent', ...shadow('soft') },
  currencyOn: { backgroundColor: colors.ice200, borderColor: colors.ice300, ...shadow('iceGlow') },
  symbol: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolOn: { backgroundColor: withAlpha(colors.white, 0.7) },
  currencyText: { flex: 1 },
  progress: { gap: 8 },
  actions: { gap: 6, marginTop: 4 },
  curveCard: {
    borderRadius: radius.md,
    backgroundColor: colors.bg.surface,
    paddingTop: 34,
    overflow: 'hidden',
    ...shadow('soft'),
  },
  curveTag: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 4 },
});
