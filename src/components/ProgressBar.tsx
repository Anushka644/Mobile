import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  type DimensionValue,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors, radius, withAlpha } from '@/theme/tokens';

import { timingMelt } from './motion';

export type ProgressTone = 'ice' | 'mint';

export interface ProgressBarProps {
  /** Fill 0..1 (clamped). Animates over 600ms when it changes. */
  progress: number;
  /**
   * ice = ice100 inset track + ice300 → ice600 gradient fill (Item countdown, 260 × 12);
   * mint = mint100 track + mint500 fill (goal progress). Default 'ice'.
   */
  tone?: ProgressTone;
  /** Track height. Default 12. */
  height?: number;
  /** Track width. Default '100%'. */
  width?: DimensionValue;
  /** Animate changes (and the initial fill from 0). Default true. */
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

const TONES: Record<ProgressTone, { track: string; fill: readonly [string, string]; inset: boolean }> = {
  ice: { track: colors.ice100, fill: [colors.ice400, colors.ice600], inset: false },
  mint: { track: colors.plum100, fill: [colors.plum900, colors.plum900], inset: false },
};

/** A pill progress track with a gradient fill (spec §4.4 countdown, §4.6/§4.7 goal bars). */
export function ProgressBar({
  progress,
  tone = 'ice',
  height = 6,
  width = '100%',
  animated = true,
  style,
  accessibilityLabel,
  testID,
}: ProgressBarProps) {
  const p = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  const t = TONES[tone];
  const [trackWidth, setTrackWidth] = useState(0);
  const fill = useSharedValue(animated ? 0 : p);

  useEffect(() => {
    fill.set(animated ? withTiming(p, timingMelt) : p);
  }, [p, animated, fill]);

  const fillStyle = useAnimatedStyle(() => {
    const v = fill.get();
    // Never thinner than the bar is tall, so a tiny value still reads as a rounded nub.
    return { width: v <= 0 ? 0 : Math.max(height, v * trackWidth), opacity: v <= 0 ? 0 : 1 };
  });

  const onLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  return (
    <View
      onLayout={onLayout}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(p * 100) }}
      testID={testID}
      style={[
        styles.track,
        { width, height, borderRadius: radius.full, backgroundColor: t.track },
        t.inset ? styles.inset : null,
        style,
      ]}
    >
      <Animated.View style={[styles.fill, { borderRadius: radius.full }, fillStyle]}>
        <LinearGradient
          colors={t.fill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius.full }]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: 'hidden' },
  inset: {
    boxShadow: [
      `inset 0px 2px 3px 0px ${withAlpha(colors.ice800, 0.1)}`,
      `inset 0px -1px 0px 0px ${withAlpha(colors.white, 0.8)}`,
    ].join(', '),
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
});
