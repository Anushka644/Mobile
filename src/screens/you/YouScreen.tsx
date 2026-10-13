// You (tab) — spec §4.9, design/exports/07-you@2x.png.
//
// Plain cream canvas (no glows). "You" + subtitle, then three white cards of settings rows:
//   PREFERENCES  Default cooldown (sheet) · Currency (sheet) · Thaw reminders (toggle) · Savings goal (sheet)
//   PLAY WITH IT Load sample freezer · Fast-forward 1 day · Reset everything (confirm)
//   Why waiting works (sheet)
// and the "Chill v1 · made with care" footer (long-press it for the component kit).
// Demo actions confirm with a small toast above the tab bar.

import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { AppText, cooldownPhrase, ConfirmDialog, Screen, Toggle, useTabBarScrollPadding } from '@/components';
import { now, useTimeOffset } from '@/lib/clock';
import { haptics } from '@/lib/haptics';
import { DAY_MS } from '@/lib/melt';
import { cancelAllNotifications } from '@/lib/notifications';
import { selectReady, selectSavedCents } from '@/store/selectors';
import { useChillStore } from '@/store/useChillStore';
import { colors } from '@/theme/tokens';

import { setThawReminders } from './reminders';
import { SettingsCard, SettingsRow } from './SettingsCard';
import { Toast, useToast } from './Toast';
import { CooldownSheet, CurrencySheet, GoalSheet, WhyWaitingSheet } from './YouSheets';
import { currencyLabel, fastForwardMessage, goalRowValue, offsetLabel } from './youModel';

type SheetName = 'cooldown' | 'currency' | 'goal' | 'why';

export function YouScreen() {
  const router = useRouter();
  const bottomPadding = useTabBarScrollPadding();
  const settings = useChillStore((s) => s.settings);
  const items = useChillStore((s) => s.items);
  const updateSettings = useChillStore((s) => s.updateSettings);
  const setGoal = useChillStore((s) => s.setGoal);
  const seedDemo = useChillStore((s) => s.seedDemo);
  const fastForward = useChillStore((s) => s.fastForward);
  const resetAll = useChillStore((s) => s.resetAll);
  const offset = useTimeOffset();

  const [sheet, setSheet] = useState<SheetName | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  /** Optimistic switch position while the permission prompt is up. */
  const [pendingReminders, setPendingReminders] = useState<boolean | null>(null);
  const { toast, show, hide } = useToast();
  const close = () => setSheet(null);

  const remindersOn = pendingReminders ?? settings.notificationsEnabled;

  const toggleReminders = async (on: boolean) => {
    setPendingReminders(on);
    const result = await setThawReminders(on);
    setPendingReminders(null);
    if (result === 'on') {
      haptics.success();
      show({ text: 'We’ll nudge you when things thaw', icon: 'bell' });
    } else if (result === 'web') {
      show({ text: 'Reminders ring in the phone app', icon: 'bell' });
    } else if (result === 'denied') {
      show({
        text: 'Notifications are off for Chill',
        icon: 'bell',
        action: Platform.OS === 'web' ? undefined : { label: 'Settings', onPress: () => void Linking.openSettings() },
      });
    }
  };

  const loadSample = () => {
    seedDemo();
    haptics.success();
    show({ text: 'Sample freezer loaded', icon: 'sparkle', action: { label: 'See it', onPress: () => router.navigate('/') } });
  };

  const jumpADay = () => {
    const before = selectReady({ items: useChillStore.getState().items }, now()).length;
    fastForward(DAY_MS);
    const after = selectReady({ items: useChillStore.getState().items }, now()).length;
    const thawed = after - before;
    show({
      text: fastForwardMessage(thawed),
      icon: 'refresh',
      action: thawed > 0 ? { label: 'Decide', onPress: () => router.navigate('/') } : undefined,
    });
  };

  const reset = () => {
    setConfirmReset(false);
    hide();
    void cancelAllNotifications();
    // Flips settings.onboarded off: the root layout's guard swaps to onboarding.
    resetAll();
  };

  return (
    <View style={styles.root}>
      <Screen scroll bottomPadding={bottomPadding} contentStyle={styles.content} testID="you">
        <View style={styles.header}>
          <AppText variant="displayL" accessibilityRole="header">
            You
          </AppText>
          <AppText variant="bodyM" color={colors.text.secondary}>
            Tune how your freezer works
          </AppText>
        </View>

        <Section title="Preferences">
          <SettingsCard testID="you-preferences">
            <SettingsRow
              icon="hourglass"
              tint={colors.ice100}
              ink={colors.ice800}
              label="Default cooldown"
              value={cooldownPhrase(settings.defaultCooldown)}
              onPress={() => setSheet('cooldown')}
              testID="you-cooldown"
            />
            <SettingsRow
              icon="coins"
              tint={colors.butter100}
              ink={colors.butter600}
              label="Currency"
              value={currencyLabel(settings.currency)}
              onPress={() => setSheet('currency')}
              testID="you-currency"
            />
            <SettingsRow
              icon="bell"
              tint={colors.mint100}
              ink={colors.mint700}
              label="Thaw reminders"
              onPress={() => void toggleReminders(!remindersOn)}
              accessibilityRole="switch"
              accessibilityState={{ checked: remindersOn }}
              accessory={
                <Toggle
                  value={remindersOn}
                  onValueChange={(v) => void toggleReminders(v)}
                  accessibilityLabel="Thaw reminders"
                  testID="you-reminders-toggle"
                />
              }
              testID="you-reminders"
            />
            <SettingsRow
              icon="heart"
              tint={colors.coral100}
              ink={colors.coral500}
              label="Savings goal"
              value={settings.goal ? goalRowValue(settings.goal.name) : 'Add one'}
              accessibilityValue={settings.goal?.name}
              valueMuted={!settings.goal}
              onPress={() => setSheet('goal')}
              testID="you-goal"
            />
          </SettingsCard>
        </Section>

        <Section title="Play with it">
          <SettingsCard testID="you-demo">
            <SettingsRow
              icon="sparkle"
              tint={colors.lavender100}
              ink={colors.lavender500}
              label="Load sample freezer"
              onPress={loadSample}
              accessibilityHint="Adds example wants and history so every screen has something to show"
              testID="you-sample"
            />
            <SettingsRow
              icon="refresh"
              tint={colors.ice100}
              ink={colors.ice800}
              label="Fast-forward 1 day"
              value={offsetLabel(offset)}
              onPress={jumpADay}
              accessibilityHint="Moves the app clock a day ahead so things melt and thaw"
              testID="you-fastforward"
            />
            <SettingsRow
              icon="close"
              tint={colors.coral100}
              ink={colors.coral500}
              label="Reset everything"
              labelColor={colors.coral500}
              onPress={() => {
                haptics.warning();
                setConfirmReset(true);
              }}
              testID="you-reset"
            />
          </SettingsCard>
        </Section>

        <SettingsCard>
          <SettingsRow
            icon="droplet"
            tint={colors.ice100}
            ink={colors.ice600}
            label="Why waiting works"
            onPress={() => setSheet('why')}
            testID="you-why"
          />
        </SettingsCard>

        <AppText
          variant="bodyS"
          color={colors.text.tertiary}
          align="center"
          style={styles.footer}
          onLongPress={() => router.push('/dev/kit')}
          suppressHighlighting
          testID="you-about"
        >
          Chill v1 · made with care
        </AppText>
      </Screen>

      <Toast toast={toast} onHide={hide} />

      <CooldownSheet
        visible={sheet === 'cooldown'}
        value={settings.defaultCooldown}
        onChange={(defaultCooldown) => updateSettings({ defaultCooldown })}
        onClose={close}
      />
      <CurrencySheet
        visible={sheet === 'currency'}
        value={settings.currency}
        onChange={(currency) => updateSettings({ currency })}
        onClose={close}
      />
      <GoalSheet
        visible={sheet === 'goal'}
        goal={settings.goal}
        currency={settings.currency}
        savedCents={selectSavedCents({ items })}
        onSave={(goal) => {
          setGoal(goal);
          haptics.success();
          close();
        }}
        onRemove={() => {
          setGoal(undefined);
          close();
        }}
        onClose={close}
      />
      <WhyWaitingSheet visible={sheet === 'why'} onClose={close} />
      <ConfirmDialog
        visible={confirmReset}
        icon="refresh"
        title="Reset everything?"
        message="This clears your freezer, your jar and your settings. It can’t be undone."
        primary={{ label: 'Keep my stuff', onPress: () => setConfirmReset(false) }}
        secondary={{ label: 'Reset everything', onPress: reset }}
        onDismiss={() => setConfirmReset(false)}
        testID="you-reset-dialog"
      />
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="caption" color={colors.text.secondary} accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { gap: 16 },
  header: { paddingTop: 8, gap: 4 },
  section: { gap: 16 },
  footer: { marginTop: 4 },
});
