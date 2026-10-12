// Visual QA: every component (spec §3) and the Cube at each melt stage, with an image and with the
// category fallback tile. Open /dev/kit on web, or shoot it: `node scripts/shoot.mjs --full /dev/kit`.
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Chip,
  Coin,
  CoinBurst,
  CoinStack,
  Confetti,
  ConfirmDialog,
  CooldownPicker,
  Cube,
  GLOW_PRESETS,
  GlowBackground,
  Icon,
  ICON_NAMES,
  IconBadge,
  IconButton,
  ItemCard,
  Jar,
  MOOD_ICONS,
  CATEGORY_ICONS,
  Pill,
  PRODUCT_IMAGES,
  ProductThumb,
  ProgressBar,
  ReadyBanner,
  ReflectionCard,
  SavedBanner,
  Screen,
  SectionHeader,
  Sheet,
  TextField,
  Toggle,
  type GlowPreset,
} from '@/components';
import { useNow } from '@/lib/clock';
import { REFLECTION_PROMPTS } from '@/lib/melt';
import { buildDemoItems } from '@/store/demo';
import { colors, typography, type TypographyVariant } from '@/theme/tokens';
import { CATEGORIES, CATEGORY_NAMES, MOOD_NAMES, MOODS, type CooldownKey } from '@/types';

const STAGES = [0, 0.25, 0.5, 0.75, 1] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="caption" color={colors.text.secondary}>
        {title}
      </AppText>
      {children}
    </View>
  );
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.labeled}>
      {children}
      <AppText variant="labelS" color={colors.text.secondary} align="center">
        {label}
      </AppText>
    </View>
  );
}

export default function DevKit() {
  const router = useRouter();
  const now = useNow();
  const demo = buildDemoItems(now);
  const cooling = demo.filter((i) => !i.decision && i.thawAt > now);
  const ready = demo.find((i) => !i.decision && i.thawAt <= now);
  const [chip, setChip] = useState(2);
  const [cooldown, setCooldown] = useState<CooldownKey>('72h');
  const [prompt, setPrompt] = useState(0);
  const [toggle, setToggle] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [burst, setBurst] = useState(0);
  const [jarLevel, setJarLevel] = useState(0.5);

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.headerRow}>
        <AppText variant="displayL">Component kit</AppText>
        <IconButton
          icon="close"
          accessibilityLabel="Close"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
      </View>

      <Section title="Cube · image (sneakers)">
        <View style={styles.grid}>
          {STAGES.map((p) => (
            <Labeled key={p} label={p === 1 ? 'thawed' : `${p * 100}%`}>
              <Cube progress={p} size={104} image={PRODUCT_IMAGES.sneakers} />
            </Labeled>
          ))}
        </View>
      </Section>

      <Section title="Cube · fallback tile (fashion, footprints)">
        <View style={styles.grid}>
          {STAGES.map((p) => (
            <Labeled key={p} label={p === 1 ? 'thawed' : `${p * 100}%`}>
              <Cube progress={p} size={104} category="fashion" glyph="footprints" />
            </Labeled>
          ))}
        </View>
      </Section>

      <Section title="Cube · hero sizes">
        <View style={styles.row}>
          <Cube progress={0.58} size={200} category="fashion" glyph="footprints" />
          <Cube progress={0.25} size={150} image={PRODUCT_IMAGES.headphones} />
        </View>
        <View style={styles.row}>
          <Cube progress={0} size={150} category="other" glyph="bag" />
          <Cube progress={1} thawed size={150} image={PRODUCT_IMAGES.lamp} />
        </View>
        <View style={styles.grid}>
          {CATEGORIES.map((c) => (
            <Labeled key={c} label={CATEGORY_NAMES[c]}>
              <Cube progress={0.5} size={80} category={c} animated={false} />
            </Labeled>
          ))}
        </View>
      </Section>

      <Section title="Item cards">
        <View style={styles.cards}>
          {cooling.map((item) => (
            <ItemCard key={item.id} item={item} now={now} onPress={() => undefined} />
          ))}
          {ready ? <ItemCard item={ready} now={now} onPress={() => undefined} /> : null}
        </View>
        {ready ? <ReadyBanner item={ready} now={now} onDecide={() => undefined} /> : null}
        <SavedBanner savedCents={93400} letGoCount={8} onPress={() => undefined} />
      </Section>

      <Section title="Typography">
        {(Object.keys(typography) as TypographyVariant[]).map((v) => (
          <AppText key={v} variant={v} numberOfLines={1}>
            {v} · Your freezer
          </AppText>
        ))}
      </Section>

      <Section title={`Icons (${ICON_NAMES.length})`}>
        <View style={styles.iconGrid}>
          {ICON_NAMES.map((name) => (
            <View key={name} style={styles.iconCell}>
              <Icon name={name} />
              <AppText variant="caption" uppercase={false} color={colors.text.secondary} numberOfLines={1}>
                {name}
              </AppText>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Buttons">
        <Button label="Primary" icon="plus" />
        <Button label="Secondary" icon="bag" variant="secondary" />
        <Button label="Freeze it for 3 days" icon="snowflake" variant="ice" />
        <Button label="Let it go · save $140" icon="coins" variant="mint" />
        <Button label="Refreeze for 3 more days" icon="refresh" variant="ghost" fullWidth />
        <Button label="Disabled" variant="ice" disabled />
        <View style={styles.row}>
          <Button label="Small" size="sm" />
          <Button label="Small" size="sm" variant="secondary" />
          <Button label="Decide" size="xs" />
        </View>
        <View style={styles.row}>
          <IconButton icon="bell" accessibilityLabel="Surface" />
          <IconButton icon="chevron-left" variant="glass" accessibilityLabel="Glass" />
          <IconButton icon="plus" variant="inverse" accessibilityLabel="Inverse" />
          <IconBadge icon="flame" tint={colors.coral100} color={colors.coral500} />
          <IconBadge icon="hourglass" shape="rounded" size={36} />
          <Toggle value={toggle} onValueChange={setToggle} accessibilityLabel="Toggle" />
        </View>
      </Section>

      <Section title="Chips & pills">
        <View style={styles.wrap}>
          {MOODS.map((m, i) => (
            <Chip key={m} label={MOOD_NAMES[m]} icon={MOOD_ICONS[m]} selected={i === chip} onPress={() => setChip(i)} />
          ))}
        </View>
        <View style={styles.wrap}>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={CATEGORY_NAMES[c]} icon={CATEGORY_ICONS[c]} />
          ))}
        </View>
        <View style={styles.row}>
          <Pill label="29h left" />
          <Pill label="Ready" tone="ready" />
          <Pill label="Bought" tone="neutral" />
        </View>
      </Section>

      <Section title="Inputs">
        <TextField label="What is it?" placeholder="Chunky sneakers" />
        <TextField label="Price" prefix="$" value="140" />
        <TextField label="Link (optional)" icon="link" placeholder="nike.com/…" />
        <CooldownPicker value={cooldown} onChange={setCooldown} />
      </Section>

      <Section title="Reflection">
        <ReflectionCard
          prompt={REFLECTION_PROMPTS[prompt % REFLECTION_PROMPTS.length]}
          onNext={() => setPrompt((p) => p + 1)}
        />
      </Section>

      <Section title="Coins, jar, progress">
        <View style={styles.row}>
          <Coin size={40} />
          <Coin size={36} rotate={-14} />
          <Coin size={28} rotate={14} />
          <CoinStack />
          <ProductThumb item={demo[0]} />
          <ProductThumb item={demo[demo.length - 1]} />
        </View>
        <View style={styles.row}>
          <Jar level={0} width={100} animated={false} />
          <Jar level={0.5} width={100} animated={false} />
          <Jar level={1} width={100} animated={false} />
        </View>
        <View style={styles.center}>
          <Jar level={jarLevel} />
          <View style={styles.row}>
            <Button
              label="−"
              size="sm"
              variant="secondary"
              onPress={() => setJarLevel((l) => Math.max(0, l - 1 / 6))}
            />
            <Button
              label="+"
              size="sm"
              variant="secondary"
              onPress={() => setJarLevel((l) => Math.min(1, l + 1 / 6))}
            />
          </View>
        </View>
        <ProgressBar progress={0.58} width={260} style={styles.centerSelf} />
        <ProgressBar progress={0.78} tone="mint" />
        <SectionHeader title="Ready to decide" dotColor={colors.mint500} />
        <SectionHeader title="Cooling" trailing="Soonest first" />
      </Section>

      <Section title="Glow presets">
        <View style={styles.wrap}>
          {(Object.keys(GLOW_PRESETS) as GlowPreset[]).map((p) => (
            <View key={p} style={styles.glowTile}>
              <GlowBackground preset={p} />
              <AppText variant="labelS">{p}</AppText>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Overlays">
        <View style={styles.wrap}>
          <Button label="Sheet" size="sm" variant="secondary" onPress={() => setSheet(true)} />
          <Button label="Confirm" size="sm" variant="secondary" onPress={() => setDialog(true)} />
          <Button label="Confetti" size="sm" variant="secondary" onPress={() => setConfetti((n) => n + 1)} />
          <Button label="Coin burst" size="sm" variant="secondary" onPress={() => setBurst((n) => n + 1)} />
        </View>
        <View style={styles.burstStage}>
          <CoinBurst trigger={burst} origin={{ x: 176, y: 60 }} target={{ x: 176, y: 200 }} />
          <Confetti trigger={confetti} />
        </View>
      </Section>

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Why waiting works" subtitle="A short sheet">
        <AppText variant="bodyL" color={colors.text.secondary}>
          Impulse wants peak fast and fade. A cooling-off period lets the calmer you decide.
        </AppText>
        <Button label="Got it" onPress={() => setSheet(false)} />
      </Sheet>
      <ConfirmDialog
        visible={dialog}
        icon="hourglass"
        title="Thaw it now?"
        message="Waiting is the whole trick — but it’s your call."
        primary={{ label: 'Keep it frozen', onPress: () => setDialog(false) }}
        secondary={{ label: 'Thaw now', onPress: () => setDialog(false) }}
        onDismiss={() => setDialog(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 28, paddingTop: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  section: { gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' },
  labeled: { alignItems: 'center', gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 13 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  iconCell: { width: 84, alignItems: 'center', gap: 4, paddingVertical: 6 },
  center: { alignItems: 'center', gap: 10 },
  centerSelf: { alignSelf: 'center' },
  glowTile: {
    width: 170,
    height: 150,
    borderRadius: 20,
    overflow: 'hidden',
    padding: 10,
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: colors.plum100,
  },
  burstStage: { height: 240, borderRadius: 20, backgroundColor: colors.bg.sunken, overflow: 'hidden' },
});
