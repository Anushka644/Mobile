// You (tab) — spec §4.9, v2 "frost minimal" (docs/DESIGN_SYSTEM_V2.md).
//
// Plain paper. The app clock as a mono caption (it moves with "Fast-forward 1 day"), a serif "You"
// and the subtitle, then two white grouped lists with hairline dividers and monochrome line icons:
//   PREFERENCES  Default cooldown (sheet) · Currency (sheet) · Thaw reminders (toggle) · Savings goal (sheet)
//   PLAY WITH IT Load sample freezer · Fast-forward 1 day · Reset everything (red, confirm)
// "Why waiting works" is the screen's editorial moment: a card with the idea in the serif and the
// urge curve (opens the sheet). The "Chill v1 · made with care" sign-off closes the page (in QA
// builds, long-press it for the component kit). Demo actions confirm with a small ink toast.

import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import {
  AppText,
  cooldownPhrase,
  ConfirmDialog,
  Headline,
  Icon,
  PressableScale,
  Screen,
  Toggle,
  useTabBarScrollPadding,
} from '@/components';
import { now, useNow, useTimeOffset } from '@/lib/clock';
import { formatDayCaption } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { DAY_MS } from '@/lib/melt';
import { cancelAllNotifications } from '@/lib/notifications';
import { prunePhotos } from '@/lib/photos';
import { QA_BUILD } from '@/lib/testHooks';
import { GoalSheet } from '@/screens/goal/GoalSheet';
import { selectReady, selectSavedCents } from '@/store/selectors';
import { useChillStore } from '@/store/useChillStore';
import { colors, radius, shadow } from '@/theme/tokens';

import { loadSampleFreezer, setThawReminders } from './reminders';
import { SettingsCard, SettingsRow } from './SettingsCard';
import { Toast, useToast } from './Toast';
import { UrgeCurve } from './UrgeCurve';
import { CooldownSheet, CurrencySheet, WhyWaitingSheet } from './YouSheets';
import { currencyLabel, fastForwardMessage, goalRowValue, offsetLabel } from './youModel';

type SheetName = 'cooldown' | 'currency' | 'goal' | 'why';

export function YouScreen() {
  const router = useRouter();
  const bottomPadding = useTabBarScrollPadding();
  const settings = useChillStore((s) => s.settings);
  const items = useChillStore((s) => s.items);
  const updateSettings = useChillStore((s) => s.updateSettings);
  const fastForward = useChillStore((s) => s.fastForward);
  const resetAll = useChillStore((s) => s.resetAll);
  const offset = useTimeOffset();
  const appNow = useNow(60_000);

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
    void loadSampleFreezer();
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
    prunePhotos([]);
  };

  return (
    <View style={styles.root}>
      <Screen scroll bottomPadding={bottomPadding} contentStyle={styles.content} testID="you">
        <View style={styles.header}>
          {/* The app's clock: it moves with "Fast-forward 1 day" below. */}
          <AppText variant="caption" color={colors.text.secondary} testID="you-date">
            {formatDayCaption(appNow)}
          </AppText>
          <Headline accessibilityRole="header" style={styles.title}>
            You
          </Headline>
          <AppText variant="bodyM" color={colors.text.secondary}>
            Tune how your freezer works
          </AppText>
        </View>

        <Section title="Preferences">
          <SettingsCard testID="you-preferences">
            <SettingsRow
              icon="hourglass"
              label="Default cooldown"
              value={cooldownPhrase(settings.defaultCooldown)}
              onPress={() => setSheet('cooldown')}
              testID="you-cooldown"
            />
            <SettingsRow
              icon="coins"
              label="Currency"
              value={currencyLabel(settings.currency)}
              onPress={() => setSheet('currency')}
              testID="you-currency"
            />
            <SettingsRow
              icon="bell"
              label="Thaw reminders"
              onPress={() => void toggleReminders(!remindersOn)}
              accessibilityRole="switch"
              accessibilityState={{ checked: remindersOn }}
              accessory={
                // Visual only: the whole row is the one switch (no switch nested in a switch).
                <Toggle value={remindersOn} accessibilityLabel="Thaw reminders" testID="you-reminders-toggle" />
              }
              testID="you-reminders"
            />
            <SettingsRow
              icon="target"
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
              icon="sparkles"
              label="Load sample freezer"
              chevron={false}
              onPress={loadSample}
              accessibilityHint="Adds example wants and history so every screen has something to show"
              testID="you-sample"
            />
            <SettingsRow
              icon="clock"
              label="Fast-forward 1 day"
              value={offsetLabel(offset)}
              chevron={false}
              onPress={jumpADay}
              accessibilityHint="Moves the app clock a day ahead so things melt and thaw"
              testID="you-fastforward"
            />
            <SettingsRow
              icon="trash"
              label="Reset everything"
              tone="destructive"
              chevron={false}
              onPress={() => {
                haptics.warning();
                setConfirmReset(true);
              }}
              testID="you-reset"
            />
          </SettingsCard>
        </Section>

        <WhyWaitingCard onPress={() => setSheet('why')} />

        <View style={styles.footer}>
          <Icon name="snowflake" size={16} color={colors.text.tertiary} strokeWidth={1.4} />
          <AppText
            variant="caption"
            color={colors.text.tertiary}
            align="center"
            onLongPress={QA_BUILD ? () => router.push('/dev/kit') : undefined}
            suppressHighlighting
            testID="you-about"
          >
            Chill v1 · made with care
          </AppText>
        </View>
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
      <AppText variant="caption" color={colors.text.secondary} accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </AppText>
      {children}
    </View>
  );
}

/**
 * "Why waiting works" as the screen's one editorial moment: the idea in the serif, the urge curve
 * under it. Opens the sheet with the longer explanation.
 */
function WhyWaitingCard({ onPress }: { onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      haptic="tap"
      scaleTo={0.98}
      accessibilityLabel="Why waiting works"
      style={styles.why}
      testID="you-why"
    >
      <View style={styles.whyHead}>
        <AppText variant="caption" color={colors.text.secondary}>
          Why waiting works
        </AppText>
        <Icon name="arrow-up-right" size={18} color={colors.text.primary} strokeWidth={1.6} />
      </View>
      <Headline style={styles.whyLine}>{'Impulse wants peak fast *and fade.*'}</Headline>
      <UrgeCurve height={96} style={styles.whyCurve} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { gap: 28 },
  header: { paddingTop: 8 },
  title: { marginTop: 10, marginBottom: 4 },
  section: { gap: 10 },
  sectionTitle: { paddingLeft: 4 },
  why: {
    borderRadius: radius.md,
    backgroundColor: colors.bg.surface,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 20,
    ...shadow('raised'),
  },
  whyHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  whyLine: { fontSize: 30, lineHeight: 33, marginTop: 14, maxWidth: 250 },
  whyCurve: { marginTop: 18 },
  footer: { alignItems: 'center', gap: 8, marginTop: -4 },
});
