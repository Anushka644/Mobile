// Let-go celebration (spec §4.6, restyled per docs/DESIGN_SYSTEM_V2.md "Let go").
//
// Frost wash (glow preset `letGo`). "YOU LET GO OF THE MUSHROOM LAMP" over a serif "Let go. Nice.",
// then the stage: the clear tile, and below it the savings glass at the level it had before.
// Sequence (~2.2s):
//   0ms      the headline, the tile and the glass settle in
//   480ms    droplets start to slip out from under the tile, one by one (haptics.heavy), and fall
//            into the glass; the tile eases back a little as it gives up its water
//   +560ms   the first drop lands: the water starts to rise and "+$65" counts up in Geist Light
//   +1460ms  the last drop lands (haptics.tap): the total and the goal line count to the new values
// One ink "Done" button sits 24pt above the bottom edge.
// Reduced motion: no droplets, everything shows in its final state with fades (spec §5).

import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { AppText, Button, ItemCube, Jar, jarLevel, Screen, timingFade, useReducedMotion } from '@/components';
import { haptics } from '@/lib/haptics';
import { formatMoney } from '@/lib/money';
import { selectItem, selectLetGo, selectSavedCents } from '@/store/selectors';
import { useChillStore } from '@/store/useChillStore';
import { colors } from '@/theme/tokens';
import type { Goal, Item } from '@/types';

import { goalPercentLabel, goalToGoCaption, meltedAwayCaption, savedSoFar } from '../saved/savedCopy';
import { itemNoun } from '../thawed/thawedCopy';
import { DropletFall, dropletTimeline, DROP_STAGGER_MS } from './DropletFall';
import { LetGoTotal } from './LetGoTotal';
import { useCountUp } from './useCountUp';

/** Stage geometry, regular and compact (screens under 760pt). */
const STAGE = {
  regular: { tile: 104, gap: 44, glass: 188, drop: 16, drops: 7 },
  compact: { tile: 76, gap: 30, glass: 140, drop: 13, drops: 6 },
} as const;
const COMPACT_HEIGHT = 760;

// The glass's design box (see Jar): 220 × 262, the glass 250 tall from 6pt down, water up to 90%.
const JAR_BOX_W = 220;
const JAR_BOX_H = 262;
const JAR_GLASS_TOP = 6;
const JAR_GLASS_H = 250;
const JAR_MAX_FILL = 0.9;

/** When the droplets start, after the screen opens. */
const DRIP_AT = 480;

type Phase = 'intro' | 'drip' | 'rising' | 'landed';

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

  const compact = windowH > 0 && windowH < COMPACT_HEIGHT;
  const g = compact ? STAGE.compact : STAGE.regular;
  const k = g.glass / JAR_BOX_W;
  const glassH = JAR_BOX_H * k;
  const glassTop = g.tile + g.gap;
  const stageH = glassTop + glassH;
  const { firstLand, lastLand } = dropletTimeline(g.drops);

  // --- timeline --------------------------------------------------------------------------------
  useEffect(() => {
    if (reduced) return;
    const ids = [
      setTimeout(() => setPhase('drip'), DRIP_AT),
      setTimeout(() => setPhase('rising'), DRIP_AT + firstLand),
      setTimeout(() => setPhase('landed'), DRIP_AT + lastLand),
    ];
    return () => ids.forEach(clearTimeout);
  }, [reduced, firstLand, lastLand]);

  const hapticsDone = useRef<Phase | null>(null);
  useEffect(() => {
    if (reduced || hapticsDone.current === phase) return;
    hapticsDone.current = phase;
    if (phase === 'drip') haptics.heavy();
    if (phase === 'landed') haptics.tap();
  }, [phase, reduced]);

  // The tile gives up its water: it eases back while the drops fall.
  const give = useSharedValue(0);
  const amountIn = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) {
      amountIn.set(withTiming(1, timingFade));
      return;
    }
    if (phase === 'drip') {
      give.set(withTiming(1, { duration: lastLand, easing: Easing.inOut(Easing.quad) }));
    }
    if (phase === 'rising') amountIn.set(withTiming(1, { duration: 260 }));
  }, [phase, reduced, give, amountIn]);

  const tileStyle = useAnimatedStyle(() => {
    const v = give.get();
    return { transform: [{ translateY: -4 * v }, { scale: 1 - 0.08 * v }] };
  });
  const amountStyle = useAnimatedStyle(() => {
    const a = amountIn.get();
    return { opacity: a, transform: [{ translateY: (1 - a) * 8 }] };
  });

  // --- numbers ---------------------------------------------------------------------------------
  const rising = phase === 'rising' || phase === 'landed';
  const counted = useCountUp(item.priceCents, { start: rising, duration: lastLand - firstLand + 200 });
  const amountText = `+${formatMoney(counted, item.currency, counted === item.priceCents ? {} : { decimals: 'never' })}`;
  const total = useCountUp(n.saved, { from: n.prevSaved, start: phase === 'landed', duration: 700 });
  // Whole units while counting ("$994"), exact cents before and after.
  const totalCents = total === n.saved || total === n.prevSaved ? total : Math.round(total / 100) * 100;
  const pct = n.goal ? Math.min(100, (totalCents / n.goal.targetCents) * 100) : null;

  // --- geometry (stage px) -----------------------------------------------------------------------
  const [stageW, setStageW] = useState(353);
  const cx = stageW / 2;
  /** The water surface in stage px at a level 0..1. */
  const surfaceY = (level: number) => glassTop + (JAR_GLASS_TOP + JAR_GLASS_H * (1 - level * JAR_MAX_FILL)) * k;
  // The water starts rising as the first drop lands; later drops meet it a little higher.
  const landY = (i: number) => {
    const t = Math.min(1, (i * DROP_STAGGER_MS) / (lastLand - firstLand || 1));
    return surfaceY(n.prevLevel + (n.level - n.prevLevel) * t) + 2;
  };

  const enter = (delay: number) =>
    reduced ? FadeIn.duration(220) : FadeInDown.delay(delay).springify().damping(20).stiffness(170);

  return (
    <Screen
      scroll
      glow="letGo"
      contentStyle={styles.content}
      testID="let-go"
      footer={
        <Animated.View entering={enter(reduced ? 0 : DRIP_AT + lastLand - 200)}>
          <Button label="Done" onPress={() => router.dismissTo('/')} testID="let-go-home" />
        </Animated.View>
      }
    >
      <Animated.View
        entering={FadeIn.duration(reduced ? 220 : 320)}
        style={[styles.headline, compact ? styles.headlineCompact : null]}
        testID="let-go-headline"
      >
        <AppText variant="caption" color={colors.text.secondary} align="center" numberOfLines={2}>
          You let go of the {itemNoun(item.name)}
        </AppText>
        <AppText variant="displayL" align="center" accessibilityRole="header">
          Let go. Nice.
        </AppText>
      </Animated.View>

      <Animated.View
        entering={FadeIn.duration(reduced ? 220 : 420)}
        style={[styles.stage, { height: stageH, marginTop: compact ? 20 : 36 }]}
        onLayout={(e) => setStageW(e.nativeEvent.layout.width)}
        testID="let-go-stage"
      >
        <View style={[styles.abs, { left: cx - g.glass / 2, top: glassTop }]}>
          <Jar level={rising ? n.level : n.prevLevel} width={g.glass} />
        </View>

        {!reduced ? (
          <DropletFall
            start={phase !== 'intro'}
            from={{ x: cx, y: g.tile - 6 }}
            spread={g.tile * 0.2}
            landY={landY}
            count={g.drops}
            size={g.drop}
          />
        ) : null}

        <Animated.View style={[styles.abs, { left: cx - g.tile / 2, top: 0 }, tileStyle]}>
          <ItemCube
            item={item}
            progress={1}
            thawed
            size={g.tile}
            radius={Math.round(g.tile * 0.2)}
            animated={false}
          />
        </Animated.View>
      </Animated.View>

      <Animated.View style={[styles.amount, amountStyle]}>
        <AppText
          variant={compact ? 'numericL' : 'numericXL'}
          align="center"
          tabular
          accessibilityLabel={`Plus ${formatMoney(item.priceCents, item.currency)}`}
          testID="let-go-amount"
        >
          {amountText}
        </AppText>
      </Animated.View>

      <Animated.View entering={enter(reduced ? 0 : 240)} style={compact ? styles.totalCompact : styles.total}>
        <LetGoTotal
          title={savedSoFar(totalCents, n.currency)}
          trailing={pct != null ? goalPercentLabel(pct) : undefined}
          progress={pct != null ? pct / 100 : null}
          animated={phase === 'landed' && !reduced}
          caption={n.goal ? goalToGoCaption(n.goal, totalCents, n.currency) : meltedAwayCaption(n.letGoCount)}
          accessibilityLabel={`${savedSoFar(n.saved, n.currency)}. ${
            n.goal ? goalToGoCaption(n.goal, n.saved, n.currency) : meltedAwayCaption(n.letGoCount)
          }`}
          testID="let-go-goal"
        />
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'stretch' },
  headline: { marginTop: 28, alignItems: 'center', gap: 10, paddingHorizontal: 8 },
  headlineCompact: { marginTop: 12, gap: 6 },
  stage: { alignSelf: 'stretch' },
  abs: { position: 'absolute' },
  amount: { marginTop: 14 },
  total: { marginTop: 28 },
  totalCompact: { marginTop: 16 },
});
