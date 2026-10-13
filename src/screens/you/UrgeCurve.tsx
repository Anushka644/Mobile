// "The urge over time" (Why waiting works): a thin ink line that spikes right after you see the
// thing and fades. The time it spends in the freezer is a pale ice band; the thaw is a dashed ice
// marker with a dot where the (by then calm) urge crosses it.

import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { AppText } from '@/components';
import { colors } from '@/theme/tokens';

type Point = readonly [number, number];
/** A cubic segment: two control points and the end point (unit coordinates, y down). */
type Segment = readonly [Point, Point, Point];

const START: Point = [0, 0.9];
const SEGMENTS: readonly Segment[] = [
  [[0.045, 0.86], [0.085, 0.06], [0.16, 0.06]],
  [[0.235, 0.06], [0.34, 0.5], [0.52, 0.66]],
  [[0.7, 0.82], [0.86, 0.82], [1, 0.84]],
];
/** Where the thaw falls along the time axis. */
const THAW_U = 0.62;
const PEAK: Point = SEGMENTS[0][2];

function bezier(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const s = 1 - t;
  return s * s * s * p0 + 3 * s * s * t * p1 + 3 * s * t * t * p2 + t * t * t * p3;
}

/** The curve's height (unit y) at a unit x, by bisection on the segment that spans it. */
export function urgeAt(u: number): number {
  let from = START;
  for (const [c1, c2, to] of SEGMENTS) {
    if (u <= to[0]) {
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        if (bezier(from[0], c1[0], c2[0], to[0], mid) < u) lo = mid;
        else hi = mid;
      }
      return bezier(from[1], c1[1], c2[1], to[1], (lo + hi) / 2);
    }
    from = to;
  }
  return from[1];
}

export interface UrgeCurveProps {
  /** Total height, labels included. */
  height: number;
  style?: StyleProp<ViewStyle>;
}

/** Space above the plot for the thaw label (two caption lines). */
const LABEL_SPACE = 30;

export function UrgeCurve({ height, style }: UrgeCurveProps) {
  const [width, setWidth] = useState(0);
  const plotTop = LABEL_SPACE;
  const plotH = height - plotTop - 1;
  const x = (u: number) => u * width;
  const y = (v: number) => plotTop + v * plotH;
  const pt = ([u, v]: Point) => `${x(u).toFixed(1)} ${y(v).toFixed(1)}`;
  const d = `M ${pt(START)} ${SEGMENTS.map(([c1, c2, to]) => `C ${pt(c1)}, ${pt(c2)}, ${pt(to)}`).join(' ')}`;
  const thawX = x(THAW_U);
  const thawY = y(urgeAt(THAW_U));

  return (
    <View
      style={[{ height }, style]}
      onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}
      accessible
      accessibilityRole="image"
      accessibilityLabel="The urge to buy spikes right away and fades by the time it thaws"
    >
      {width > 0 ? (
        <>
          <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
            {/* Time in the freezer. */}
            <Rect x={0} y={0} width={thawX} height={height} fill={colors.ice50} />
            <Line x1={0} y1={height - 0.5} x2={width} y2={height - 0.5} stroke={colors.border.strong} strokeWidth={1} />
            <Path d={d} stroke={colors.text.primary} strokeWidth={1.75} fill="none" strokeLinecap="round" />
            <Line
              x1={thawX}
              y1={0}
              x2={thawX}
              y2={height}
              stroke={colors.ice600}
              strokeWidth={1}
              strokeDasharray="3 4"
            />
            <Circle cx={thawX} cy={thawY} r={4.5} fill={colors.ice600} stroke={colors.white} strokeWidth={2} />
          </Svg>
          <AppText
            variant="caption"
            color={colors.text.secondary}
            style={[styles.label, { left: x(PEAK[0]) - 12, top: y(PEAK[1]) - 22 }]}
          >
            The urge
          </AppText>
          <View style={[styles.label, { left: thawX + 8, top: 0 }]}>
            <AppText variant="caption" color={colors.ice600}>
              Thaws
            </AppText>
            <AppText variant="caption" color={colors.text.tertiary}>
              You decide
            </AppText>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { position: 'absolute' },
});
