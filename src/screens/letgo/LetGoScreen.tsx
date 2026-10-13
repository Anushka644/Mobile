// Let-go celebration (spec §4.6, design/exports/04-let-go@2x.png).
//
// Glow preset `letGo`: mint100 → cream frame gradient, butter100 top glow and a very diffuse mint500
// glow behind the jar. Sequence (~2.4s):
//   0ms     the thawed product sits where it was on the decision screen; the jar starts rising from
//           the bottom (spring)
//   480ms   burst: the product fades and shrinks while 10 coins pop outward from its centre
//           (haptics.heavy); "+$140" pops in and counts up; sparkles twinkle in
//   ~1.9s   the coins drop into the jar mouth: the jar gulps (squash + spring), new coin rows drop
//           in, and the total / goal progress count from the old values to the new ones
// "Back to my freezer" (Primary) and "See my jar" (Ghost) sit 24pt above the bottom edge.
// Reduced motion: no burst, everything shows in its final state with fades (spec §5).

import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {
  AppText,
  Button,
  CoinBurst,
  GLOW_PRESETS,
  ItemCube,
  Jar,
  jarLevel,
  Screen,
  springPop,
  useReducedMotion,
} from '@/components';
import { haptics } from '@/lib/haptics';
import { formatMoney } from '@/lib/money';
import { selectItem, selectLetGo, selectSavedCents } from '@/store/selectors';
import { useChillStore } from '@/store/useChillStore';
import { colors } from '@/theme/tokens';
import type { Goal, Item } from '@/types';

import { GoalProgressCard } from '../saved/GoalProgressCard';
import { goalPercentLabel, goalToGoCaption, meltedAwayCaption, savedSoFar } from '../saved/savedCopy';
import { itemNoun } from '../thawed/thawedCopy';
import { Twinkle } from './Twinkle';
import { useCountUp } from './useCountUp';

/**
 * Glow overrides, matched to 04-let-go@2x.png by sampling pixels around the jar:
 * - frame gradient: mint100 → cream by 60% of the frame (Figma "via 60%"; the kit preset fades over
 *   the full height, which leaves the bottom third green).
 * - primary glow: Figma's export renders the mint500 "blur 300" glow as tight as a CSS
 *   blur(100px) (≈ 0.44 mint beside the jar; the preset's blur(150px) gives ≈ 0.23 and washes the
 *   lower screen green), so the same ellipse is drawn with blur 200.
 */
const LET_GO_GLOW = {
  gradient: { colors: [colors.mint100, colors.cream100], locations: [0, 0.6] },
  primary: { ...GLOW_PRESETS.letGo.primary, blur: 200 },
} as const;

const JAR_W = 220;
const JAR_H = 262;
const JAR_W_COMPACT = 180;
/** Figma stage: headline bottom (218) → jar bottom (562). */
const STAGE_H = 344;
const STAGE_H_COMPACT = 286;
const COMPACT_HEIGHT = 760;
/** Thawed product cube (its product's centre sits at 0.63 of the box). */
const CUBE = 160;
const CUBE_PRODUCT_CY = 0.63;
/**
 * The product (and the burst) centre, relative to the jar's top edge: about where the lid will be.
 * The jar is still below the screen while the product shows, then rises in under the coins.
 */
const PRODUCT_BELOW_JAR_TOP = 12;

const BURST_AT = 420;
/** The jar starts rising just before the burst and is in place before the coins start to fall. */
const JAR_RISE_AT = 340;
const JAR_RISE = { damping: 16, stiffness: 150, mass: 0.9 } as const;

type Phase = 'intro' | 'burst' | 'landed';

export interface LetGoScreenProps {
  id: string;
}

export function LetGoScreen({ id }: LetGoScreenProps) {
  const item = useChillStore((s) => selectItem(s, id));
  if (!item) return <Redirect href="/saved" />;
  if (item.decision !== 'let-go') return <Redirect href="/" />;
  return <LetGoCelebration item={item} />;
}

interface Numbers {
  currency: string;
  goal: Goal | undefined;
  prevSaved: number;
  saved: number;
  letGoCount: number;
  prevLevel: number;
  level: number;
}

/** Before / after values for the celebration, taken once when the screen opens. */
function readNumbers(item: Item): Numbers {
  const { items, settings } = useChillStore.getState();
  const saved = selectSavedCents({ items });
  const letGoCount = selectLetGo({ items }).length;
  const prevSaved = Math.max(0, saved - (Number.isFinite(item.priceCents) ? item.priceCents : 0));
  const goal = settings.goal && settings.goal.targetCents > 0 ? settings.goal : undefined;
  const pct01 = (cents: number) => (goal ? Math.min(1, cents / goal.targetCents) : null);
  return {
    currency: settings.currency,
    goal,
    prevSaved,
    saved,
    letGoCount,
    prevLevel: jarLevel(pct01(prevSaved), Math.max(0, letGoCount - 1)),
    level: jarLevel(pct01(saved), letGoCount),
  };
}

function LetGoCelebration({ item }: { item: Item }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const { height: windowH } = useWindowDimensions();
  const [n] = useState(() => readNumbers(item));
  const [timelinePhase, setPhase] = useState<Phase>('intro');
  // Reduced motion (even if it turns on mid-sequence): straight to the final state.
  const phase: Phase = reduced ? 'landed' : timelinePhase;
  const [stage, setStage] = useState<{ w: number; h: number } | null>(null);

  const compact = windowH > 0 && windowH < COMPACT_HEIGHT;
  const jarW = compact ? JAR_W_COMPACT : JAR_W;
  const jarH = (JAR_H * jarW) / JAR_W;

  // --- timeline --------------------------------------------------------------------------------
  const rise = useSharedValue(0);
  const product = useSharedValue(0);
  const gone = useSharedValue(0);
  const amount = useSharedValue(0);
  const gulp = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      rise.set(withTiming(1, { duration: 420 }));
      amount.set(withTiming(1, { duration: 220 }));
      return;
    }
    product.set(withSpring(1, springPop));
    rise.set(withDelay(JAR_RISE_AT, withSpring(1, JAR_RISE)));
    const id = setTimeout(() => setPhase('burst'), BURST_AT);
    return () => clearTimeout(id);
  }, [reduced, product, rise, amount]);

  useEffect(() => {
    if (phase !== 'burst') return;
    gone.set(withTiming(1, { duration: 320 }));
    amount.set(withSpring(1, springPop));
  }, [phase, gone, amount]);

  const landed = useRef(false);
  const onLanded = () => {
    if (landed.current) return;
    landed.current = true;
    haptics.tap();
    gulp.set(withSequence(withTiming(1, { duration: 90 }), withSpring(0, { damping: 9, stiffness: 260 })));
    setPhase('landed');
  };

  // --- numbers ---------------------------------------------------------------------------------
  const counted = useCountUp(item.priceCents, { start: phase !== 'intro', duration: 950 });
  const amountText = `+${formatMoney(counted, item.currency, counted === item.priceCents ? {} : { decimals: 'never' })}`;
  const total = useCountUp(n.saved, { from: n.prevSaved, start: phase === 'landed', duration: 700 });
  // Whole units while counting ("$994"), exact cents before and after.
  const totalCents = total === n.saved || total === n.prevSaved ? total : Math.round(total / 100) * 100;
  const pct = n.goal ? Math.min(100, (totalCents / n.goal.targetCents) * 100) : null;
  const totalText = savedSoFar(totalCents, n.currency);

  // --- geometry (stage coordinates) ----------------------------------------------------------
  const onStageLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setStage({ w: width, h: height });
  };
  const w = stage?.w ?? 353;
  const h = stage?.h ?? (compact ? STAGE_H_COMPACT : STAGE_H);
  const jarTop = h - jarH;
  const productCy = jarTop + PRODUCT_BELOW_JAR_TOP * (jarW / JAR_W);
  const origin = { x: w / 2, y: productCy };
  const target = { x: w / 2, y: jarTop + 34 * (jarW / JAR_W) };

  // --- animated styles -------------------------------------------------------------------------
  // The jar starts a full screen lower, so it rises in from below the bottom edge.
  const riseFrom = Math.max(windowH, 700) + 40;
  const jarStyle = useAnimatedStyle(() => {
    if (reduced) return { opacity: rise.get() };
    const g = gulp.get();
    return {
      transform: [{ translateY: (1 - rise.get()) * riseFrom }, { scaleX: 1 + 0.05 * g }, { scaleY: 1 - 0.06 * g }],
    };
  });
  const productStyle = useAnimatedStyle(() => {
    const p = product.get();
    const g = gone.get();
    return {
      opacity: Math.min(1, p * 1.5) * (1 - g),
      transform: [{ scale: (0.88 + 0.12 * p) * (1 - 0.65 * g) }],
    };
  });
  const amountStyle = useAnimatedStyle(() => {
    const a = amount.get();
    return { opacity: Math.min(1, a * 1.6), transform: [{ scale: 0.6 + 0.4 * a }] };
  });

  const enter = (delay: number) => (reduced ? FadeIn.duration(220) : FadeInDown.delay(delay).springify().damping(17));
  const sparklesOn = phase !== 'intro';

  return (
    <Screen scroll glow="letGo" glowProps={LET_GO_GLOW} contentStyle={styles.content}>
      <View style={styles.headline} testID="let-go-headline">
        <Animated.View entering={reduced ? FadeIn.duration(220) : FadeIn.duration(260)} style={styles.headText}>
          <AppText variant="caption" color={colors.text.success} align="center" numberOfLines={2}>
            You let go of the {itemNoun(item.name)}
          </AppText>
          <AppText variant="displayL" align="center" accessibilityRole="header">
            Let go. Nice.
          </AppText>
        </Animated.View>
        <Animated.View style={amountStyle}>
          <AppText
            variant="numericXL"
            color={colors.text.success}
            align="center"
            tabular
            accessibilityLabel={`Plus ${formatMoney(item.priceCents, item.currency)}`}
            testID="let-go-amount"
          >
            {amountText}
          </AppText>
        </Animated.View>
      </View>

      <View
        style={[styles.stage, { minHeight: compact ? STAGE_H_COMPACT : STAGE_H }]}
        onLayout={onStageLayout}
        testID="let-go-stage"
      >
        <Animated.View
          style={[styles.abs, styles.jarOrigin, { left: (w - jarW) / 2, top: jarTop, width: jarW }, jarStyle]}
        >
          <Jar level={phase === 'landed' ? n.level : n.prevLevel} width={jarW} />
        </Animated.View>

        {!reduced ? (
          <Animated.View
            style={[styles.abs, { left: w / 2 - CUBE / 2, top: productCy - CUBE * CUBE_PRODUCT_CY }, productStyle]}
          >
            <ItemCube item={item} progress={1} thawed size={CUBE} />
          </Animated.View>
        ) : null}

        <CoinBurst
          trigger={phase === 'intro' ? 0 : 1}
          origin={origin}
          target={target}
          count={10}
          coinSize={34}
          onBurst={() => haptics.heavy()}
          onLanded={onLanded}
        />

        {/* Figma sparkles: around the amount, offsets from the column centre. */}
        <Twinkle visible={sparklesOn} size={22} delay={60} style={{ left: w / 2 - 116.5, top: -30 }} />
        <Twinkle visible={sparklesOn} size={18} delay={160} style={{ left: w / 2 + 115.5, top: 12 }} />
        <Twinkle visible={sparklesOn} size={14} delay={260} style={{ left: w / 2 + 29.5, top: -44 }} />
      </View>

      <Animated.View entering={enter(reduced ? 0 : 700)} style={styles.card}>
        {n.goal ? (
          <GoalProgressCard
            title={totalText}
            titleVariant="labelL"
            trailing={pct != null ? goalPercentLabel(pct) : undefined}
            progress={pct != null ? pct / 100 : null}
            animated={phase === 'landed' && !reduced}
            caption={goalToGoCaption(n.goal, totalCents, n.currency)}
            elevation="soft"
            accessibilityLabel={`${savedSoFar(n.saved, n.currency)}. ${goalToGoCaption(n.goal, n.saved, n.currency)}`}
            testID="let-go-goal"
          />
        ) : (
          <GoalProgressCard
            title={totalText}
            titleVariant="labelL"
            progress={null}
            caption={meltedAwayCaption(n.letGoCount)}
            elevation="soft"
            accessibilityLabel={`${savedSoFar(n.saved, n.currency)}, ${meltedAwayCaption(n.letGoCount)}`}
            testID="let-go-goal"
          />
        )}
      </Animated.View>

      <Animated.View entering={enter(reduced ? 0 : 860)} style={styles.actions}>
        <Button label="Back to my freezer" onPress={() => router.dismissTo('/')} testID="let-go-home" />
        <Button label="See my jar" variant="ghost" fullWidth onPress={() => router.dismissTo('/saved')} />
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'stretch' },
  // Figma: headline at y 92 (status bar 54 + 38): caption, 4, Display/L, 4, Numeric/XL.
  headline: { marginTop: 38, alignItems: 'center', gap: 4, zIndex: 1 },
  headText: { alignItems: 'center', gap: 4, paddingHorizontal: 8 },
  // Grows on tall screens so the CTAs stay anchored 24pt above the bottom edge. Above the headline:
  // coins and sparkles fly over the amount (as in Figma's layer order).
  stage: { flexGrow: 1, zIndex: 2 },
  abs: { position: 'absolute' },
  jarOrigin: { transformOrigin: '50% 100%' },
  card: { marginTop: 24, zIndex: 3 },
  actions: { marginTop: 20, gap: 4, zIndex: 3 },
});
