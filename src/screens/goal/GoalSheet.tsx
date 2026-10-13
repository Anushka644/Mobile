// The savings-goal sheet (spec §4.7 "Tap → an edit-goal sheet (name + amount)", §4.9 "Savings
// goal"). One sheet for both the Saved tab's goal card and the You tab's row, so the rules (name
// length, amount validation) can never drift apart. Writes through `setGoal`.

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, ProgressBar, Sheet, TextField } from '@/components';
import { haptics } from '@/lib/haptics';
import { currencySymbol, formatMoney } from '@/lib/money';
import { useChillStore } from '@/store/useChillStore';
import { colors } from '@/theme/tokens';
import type { Goal } from '@/types';

import { GOAL_NAME_MAX, goalAmountInvalid, goalAmountText, parseGoalInput } from './goalModel';

export interface GoalSheetProps {
  visible: boolean;
  onClose: () => void;
  goal: Goal | undefined;
  currency: string;
  /** Total let go so far, for the progress line under the fields. */
  savedCents: number;
}

export function GoalSheet({ visible, onClose, goal, currency, savedCents }: GoalSheetProps) {
  // A fresh form on every open (so it starts from the saved goal), kept mounted while the sheet
  // slides away so the panel doesn't collapse mid-exit.
  const [session, setSession] = useState(0);
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setSession((s) => s + 1);
  }
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={goal ? 'Your goal' : 'Add a goal'}
      subtitle="Give your jar something to fill up for."
      testID="goal-sheet"
    >
      <GoalForm key={session} goal={goal} currency={currency} savedCents={savedCents} onDone={onClose} />
    </Sheet>
  );
}

interface GoalFormProps {
  goal: Goal | undefined;
  currency: string;
  savedCents: number;
  onDone: () => void;
}

function GoalForm({ goal, currency, savedCents, onDone }: GoalFormProps) {
  const setGoal = useChillStore((s) => s.setGoal);
  const [name, setName] = useState(goal?.name ?? '');
  const [amount, setAmount] = useState(goalAmountText(goal?.targetCents));
  const parsed = parseGoalInput(name, amount);
  const amountError = goalAmountInvalid(amount);
  const progress = parsed ? Math.min(1, savedCents / parsed.targetCents) : null;

  const save = () => {
    if (!parsed) return;
    setGoal(parsed);
    haptics.success();
    onDone();
  };

  return (
    <View style={styles.form}>
      <TextField
        label="What are you saving for?"
        icon="target"
        placeholder="Weekend in Lisbon"
        value={name}
        onChangeText={setName}
        maxLength={GOAL_NAME_MAX}
        returnKeyType="next"
        autoCapitalize="sentences"
        testID="goal-name"
      />
      <TextField
        label="Target"
        prefix={currencySymbol(currency)}
        placeholder="1,200"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        inputMode="decimal"
        returnKeyType="done"
        onSubmitEditing={save}
        error={amountError}
        hint={amountError ? 'Enter an amount above zero.' : undefined}
        testID="goal-amount"
      />
      {progress != null && savedCents > 0 ? (
        <View style={styles.progress}>
          <ProgressBar progress={progress} tone="mint" height={4} />
          <AppText variant="bodyS" color={colors.text.secondary} tabular>
            {formatMoney(savedCents, currency)} saved · {Math.round(progress * 100)}% of the way
          </AppText>
        </View>
      ) : null}
      <View style={styles.actions}>
        <Button
          label={goal ? 'Save goal' : 'Set goal'}
          onPress={save}
          disabled={!parsed}
          testID="goal-save"
        />
        {goal ? (
          <Button
            label="Remove goal"
            variant="ghost"
            onPress={() => {
              setGoal(undefined);
              onDone();
            }}
            testID="goal-remove"
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  progress: { gap: 10, paddingTop: 4 },
  actions: { gap: 4, marginTop: 8 },
});
