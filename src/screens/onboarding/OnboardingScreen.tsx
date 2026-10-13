// Onboarding — a 3-slide pager (spec §4.1, design/exports/08..10-onboarding-*@2x.png).
//
// Layers, back to front:
//   1. The three glow presets (onboarding1..3), cross-faded by the scroll position.
//   2. A horizontal paging ScrollView: per slide, the hero illustration (with a gentle parallax)
//      over the Display/L title and Body/L copy.
//   3. Fixed chrome: "Skip" (top right, slides 1–2) and the bottom controls — page dots, the
//      Primary button ("Next" → "Start my freezer") and, on the last slide, the Ghost
//      "Try it with a sample freezer". The controls morph with the scroll position: they rise by
//      68pt as the Ghost button fades in, so everything stays 24pt above the bottom edge
//      (no home indicator).
//
// Finishing calls `completeOnboarding()` (plus `seedDemo()` for the sample); the root layout's
// Stack.Protected guard then swaps to the tabs. Notification permission is asked on the first
// freeze, not here.

import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import {
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import {
  AppText,
  Button,
  FRAME_WIDTH,
  GlowBackground,
  GUTTER,
  Icon,
  PressableScale,
  SnowField,
  topInset,
  useBottomGap,
  useReducedMotion,
} from '@/components';
import { useChillStore } from '@/store/useChillStore';
import { colors, radius, shadow } from '@/theme/tokens';

import { CoolingTrio, FrozenHero, ILLUSTRATION_BOX, JarHero, type IllustrationProps } from './OnboardingIllustrations';
import { PagerDots } from './PagerDots';
import {
  BUTTON_GAP,
  BUTTON_HEIGHT,
  clampSlide,
  copyBottomInset,
  DOTS_TO_BUTTON,
  DOTS_TO_BUTTON_LAST,
  LAST_SLIDE,
  LAST_SLIDE_RISE,
  SLIDES,
  type OnboardingSlide,
  type SlideKey,
} from './slides';

/** Height of the row that holds "Skip" under the status bar. */
const SKIP_ROW = 44;

/** Fine vertical placement of each illustration in its hero area (design pt), matched to the PNGs. */
const HERO_NUDGE: Record<SlideKey, number> = { melt: 22, cool: 26, grow: 0 };

const ILLUSTRATIONS: Record<SlideKey, ComponentType<IllustrationProps>> = {
  melt: FrozenHero,
  cool: CoolingTrio,
  grow: JarHero,
};

export function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const top = topInset(insets.top);
  const gap = useBottomGap();
  const reduced = useReducedMotion();
  const completeOnboarding = useChillStore((s) => s.completeOnboarding);
  const seedDemo = useChillStore((s) => s.seedDemo);

  // The window size until the root has been measured, so the first frame already shows slide 1.
  const win = useWindowDimensions();
  const [measured, setFrame] = useState<{ width: number; height: number } | null>(null);
  const frame = measured ?? { width: win.width, height: win.height };
  const pageW = frame.width;
  const onRootLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setFrame((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
  };

  // --- pager state -----------------------------------------------------------
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const offsetX = useSharedValue(0);
  const pageWidth = useSharedValue(1);
  useEffect(() => {
    if (pageW > 0) pageWidth.set(pageW);
  }, [pageW, pageWidth]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      offsetX.set(e.contentOffset.x);
    },
  });
  const position = useDerivedValue(() => offsetX.get() / Math.max(1, pageWidth.get()));

  const [index, setIndex] = useState(0);
  const [reached, setReached] = useState(0);
  const target = useRef(0);
  const onIndex = useCallback((next: number) => {
    setIndex(next);
    setReached((r) => Math.max(r, next));
    target.current = next;
  }, []);
  useAnimatedReaction(
    () => Math.min(LAST_SLIDE, Math.max(0, Math.round(position.get()))),
    (cur, prev) => {
      // The first run (prev null) compares against the initial slide: a first echo of slide 1 is
      // ignored (it must not rewind a page the user already asked for), but a scroll that landed
      // before the reaction's first frame (e.g. straight to slide 3) is honoured.
      if (cur !== (prev ?? 0)) scheduleOnRN(onIndex, cur);
    }
  );

  const goTo = useCallback(
    (i: number) => {
      const next = clampSlide(i);
      target.current = next;
      scrollRef.current?.scrollTo({ x: next * pageW, y: 0, animated: !reduced });
    },
    [pageW, reduced, scrollRef]
  );

  // Keep the current page in view when the window is resized or rotated.
  useEffect(() => {
    if (pageW > 0) scrollRef.current?.scrollTo({ x: target.current * pageW, y: 0, animated: false });
  }, [pageW, scrollRef]);

  // Android back steps back through the slides before leaving.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (target.current === 0) return false;
      goTo(target.current - 1);
      return true;
    });
    return () => sub.remove();
  }, [goTo]);

  const isLast = index === LAST_SLIDE;
  const onPrimary = () => {
    if (target.current < LAST_SLIDE) goTo(target.current + 1);
    else completeOnboarding();
  };
  const onSample = () => {
    seedDemo();
    completeOnboarding();
  };

  // --- chrome animation ------------------------------------------------------
  /** 0 on slides 1–2 → 1 on the last slide. */
  const lastness = useDerivedValue(() => Math.min(1, Math.max(0, position.get() - (LAST_SLIDE - 1))));

  const controlsStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: LAST_SLIDE_RISE * (1 - lastness.get()) }],
  }));
  const dotsStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (DOTS_TO_BUTTON - DOTS_TO_BUTTON_LAST) * lastness.get() }],
  }));
  const ghostStyle = useAnimatedStyle(() => {
    const v = lastness.get();
    return { opacity: v * v, transform: [{ translateY: (1 - v) * 12 }] };
  });
  const skipStyle = useAnimatedStyle(() => ({ opacity: 1 - lastness.get() }));
  const nextLabelStyle = useAnimatedStyle(() => ({ opacity: Math.max(0, 1 - lastness.get() * 2) }));
  const startLabelStyle = useAnimatedStyle(() => ({ opacity: Math.max(0, lastness.get() * 2 - 1) }));

  return (
    <View style={styles.root} onLayout={onRootLayout} testID="onboarding">
      {SLIDES.map((slide, i) => (
        <GlowLayer key={slide.key} slide={slide} index={i} position={position} />
      ))}

      {pageW > 0 ? (
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          bounces={false}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={onScroll}
          style={StyleSheet.absoluteFill}
          testID="onboarding-pager"
        >
          {SLIDES.map((slide, i) => (
            <Slide
              key={slide.key}
              slide={slide}
              index={i}
              width={frame.width}
              height={frame.height}
              top={top}
              bottomGap={gap}
              position={position}
              current={i === index}
              reached={i <= reached}
              reduced={reduced}
            />
          ))}
        </Animated.ScrollView>
      ) : null}

      {/* Skip — slides 1–2 */}
      <View style={[styles.chromeRow, styles.passThrough, { top }]}>
        <Animated.View style={[skipStyle, isLast ? styles.noTouch : null]}>
          <Pressable
            onPress={() => goTo(LAST_SLIDE)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Skip to the last page"
            accessibilityElementsHidden={isLast}
            importantForAccessibility={isLast ? 'no-hide-descendants' : 'auto'}
            style={({ pressed }) => [styles.skip, pressed ? styles.skipPressed : null]}
            testID="onboarding-skip"
          >
            <AppText variant="labelL" color={colors.text.secondary}>
              Skip
            </AppText>
          </Pressable>
        </Animated.View>
      </View>

      {/* Bottom controls */}
      <View style={[styles.controlsWrap, styles.passThrough, { bottom: gap }]}>
        <Animated.View style={[styles.controls, styles.passThrough, controlsStyle]}>
          <Animated.View style={dotsStyle}>
            <PagerDots count={SLIDES.length} position={position} index={index} />
          </Animated.View>
          <PressableScale
            onPress={onPrimary}
            haptic="tap"
            accessibilityLabel={isLast ? 'Start my freezer' : 'Next'}
            style={[styles.primary, shadow('button')]}
            testID="onboarding-primary"
          >
            <Animated.View style={[styles.primaryLabel, nextLabelStyle]}>
              <AppText variant="labelL" color={colors.text.inverse}>
                Next
              </AppText>
            </Animated.View>
            <Animated.View style={[styles.primaryLabel, startLabelStyle]}>
              <Icon name="snowflake" size={22} color={colors.text.inverse} strokeWidth={2.2} />
              <AppText variant="labelL" color={colors.text.inverse}>
                Start my freezer
              </AppText>
            </Animated.View>
          </PressableScale>
          <Animated.View
            style={[styles.ghost, isLast ? null : styles.noTouch, ghostStyle]}
            accessibilityElementsHidden={!isLast}
            importantForAccessibility={isLast ? 'auto' : 'no-hide-descendants'}
          >
            <Button
              label="Try it with a sample freezer"
              icon="sparkle"
              variant="ghost"
              fullWidth
              onPress={onSample}
              testID="onboarding-sample"
            />
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------

function GlowLayer({ slide, index, position }: { slide: OnboardingSlide; index: number; position: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: index === 0 ? 1 : Math.min(1, Math.max(0, position.get() - (index - 1))),
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.noTouch, style]}>
      <GlowBackground preset={slide.glow} />
    </Animated.View>
  );
}

interface SlideProps {
  slide: OnboardingSlide;
  index: number;
  width: number;
  height: number;
  top: number;
  bottomGap: number;
  position: SharedValue<number>;
  /** The page currently in view. */
  current: boolean;
  /** The page has been in view at least once. */
  reached: boolean;
  reduced: boolean;
}

function Slide({ slide, index, width, height, top, bottomGap, position, current, reached, reduced }: SlideProps) {
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  const onHeroLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setArea((prev) => (prev && prev.width === w && prev.height === h ? prev : { width: w, height: h }));
  };

  const box = ILLUSTRATION_BOX[slide.key];
  const nudge = HERO_NUDGE[slide.key];
  const scale = area ? Math.min(1, (area.height - nudge) / (box.height + 16), area.width / box.width) : 1;
  const Illustration = ILLUSTRATIONS[slide.key];

  // Parallax: the art leads its page a little (it sits "in front"), shrinks and fades as it leaves,
  // so a neighbour's art never peeks in at rest.
  const shown = useSharedValue(0);
  useEffect(() => {
    if (area) shown.set(withTiming(1, { duration: 260 }));
  }, [area, shown]);
  const parallaxStyle = useAnimatedStyle(() => {
    const rel = index - position.get();
    const away = Math.min(1, Math.abs(rel));
    return reduced
      ? { opacity: shown.get() * (1 - away) }
      : {
          opacity: shown.get() * (1 - away * 0.8),
          transform: [{ translateX: rel * width * 0.32 }, { scale: 1 - away * 0.08 }],
        };
  });

  return (
    <View
      style={{ width, height }}
      accessibilityElementsHidden={!current}
      importantForAccessibility={current ? 'auto' : 'no-hide-descendants'}
      testID={`onboarding-slide-${index + 1}`}
    >
      {slide.key === 'melt' ? <SnowField count={11} seed={5} height={Math.max(200, height * 0.6)} /> : null}
      <View
        style={[
          styles.column,
          { paddingTop: top + SKIP_ROW, paddingBottom: copyBottomInset(index, bottomGap) },
        ]}
      >
        <View style={styles.hero} onLayout={onHeroLayout}>
          {area ? (
            <Animated.View style={[{ marginTop: nudge * scale * 2 }, parallaxStyle]}>
              <Illustration scale={scale} active={reached} />
            </Animated.View>
          ) : null}
        </View>
        <View style={styles.copy}>
          <AppText variant="displayL" accessibilityRole="header">
            {slide.title}
          </AppText>
          <AppText variant="bodyL" color={colors.text.secondary}>
            {slide.body}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.canvas, overflow: 'hidden' },
  noTouch: { pointerEvents: 'none' },
  passThrough: { pointerEvents: 'box-none' },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: FRAME_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: GUTTER,
  },
  hero: {
    flex: 1,
    marginHorizontal: -GUTTER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Title → body is 12 (the Display/L line box adds its own air), matching 08–10-onboarding. The 8pt
  // of top padding keeps the block's height, so the hero art above stays exactly where it was.
  copy: { gap: 12, paddingTop: 8 },
  chromeRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: SKIP_ROW,
    width: '100%',
    maxWidth: FRAME_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: GUTTER - 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  skip: { height: SKIP_ROW, paddingHorizontal: 8, justifyContent: 'center', borderRadius: radius.full },
  skipPressed: { opacity: 0.6 },
  controlsWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  controls: {
    width: '100%',
    maxWidth: FRAME_WIDTH,
    paddingHorizontal: GUTTER,
  },
  primary: {
    marginTop: DOTS_TO_BUTTON,
    height: BUTTON_HEIGHT,
    borderRadius: radius.full,
    backgroundColor: colors.action.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ghost: { marginTop: BUTTON_GAP, height: BUTTON_HEIGHT },
});

