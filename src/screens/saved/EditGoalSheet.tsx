import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Sheet, TextField } from '@/components';
import { currencySymbol } from '@/lib/money';
import { useChillStore } from '@/store/useChillStore';
import type { Goal } from '@/types';

import { goalAmountText, parseGoalInput } from './savedCopy';

export interface EditGoalSheetProps {
  visible: boolean;
  onClose: () => void;
  goal: Goal | undefined;
  currency: string;
}

/**
 * Edit-goal sheet (spec §4.7): name + amount, "Save goal" (disabled until both are valid) and,
 * for an existing goal, a Ghost "Remove goal". Writes through `setGoal`.
 */
export function EditGoalSheet({ visible, onClose, goal, currency }: EditGoalSheetProps) {
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
      subtitle="What are your let-gos adding up to?"
      testID="edit-goal-sheet"
    >
      <GoalForm key={session} goal={goal} currency={currency} onDone={onClose} />
    </Sheet>
  );
}

function GoalForm({ goal, currency, onDone }: { goal: Goal | undefined; currency: string; onDone: () => void }) {
  const setGoal = useChillStore((s) => s.setGoal);
  const [name, setName] = useState(goal?.name ?? '');
  const [amount, setAmount] = useState(goalAmountText(goal?.targetCents));
  const parsed = parseGoalInput(name, amount);
  const amountError = amount.trim() !== '' && parseGoalInput('x', amount) == null;

  const save = () => {
    if (!parsed) return;
    setGoal(parsed);
    onDone();
  };

  return (
    <View style={styles.form}>
      <TextField
        label="Saving for"
        icon="target"
        placeholder="Weekend in Lisbon"
        value={name}
        onChangeText={setName}
        maxLength={60}
        returnKeyType="next"
        autoCapitalize="sentences"
        testID="goal-name"
      />
      <TextField
        label="Amount"
        prefix={currencySymbol(currency)}
        placeholder="1,200"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        returnKeyType="done"
        onSubmitEditing={save}
        error={amountError}
        hint={amountError ? 'Enter an amount above zero.' : undefined}
        testID="goal-amount"
      />
      <View style={styles.actions}>
        <Button label="Save goal" icon="check" onPress={save} disabled={!parsed} testID="goal-save" />
        {goal ? (
          <Button
            label="Remove goal"
            variant="ghost"
            fullWidth
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
  actions: { gap: 4, marginTop: 8 },
});
