import { memo } from 'react';
import { StyleSheet, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';

import { ICONS, type IconName } from './icons';

export type { IconName } from './icons';
export { ICON_NAMES } from './icons';

export interface IconProps {
  /** Lucide glyph name (see ICON_NAMES). */
  name: IconName;
  /** Box size in px (the glyph is drawn on a 24 × 24 grid). Default 24. */
  size?: number;
  /** Stroke color. Default text.primary (plum900). */
  color?: ColorValue;
  /** Stroke width in grid units (scaled with size). Default 2. */
  strokeWidth?: number;
  /** Optional fill (e.g. a solid sparkle). Default none. */
  fill?: ColorValue;
  /** Whole-glyph opacity. */
  opacity?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** A Lucide-style line icon drawn with react-native-svg: 24 grid, round caps and joins. */
export const Icon = memo(function Icon({
  name,
  size = 24,
  color = colors.text.primary,
  strokeWidth = 2,
  fill = 'none',
  opacity,
  style,
  testID,
}: IconProps) {
  const shapes = ICONS[name];
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={[styles.icon, style]}
      opacity={opacity}
      testID={testID}
    >
      {shapes.map((shape, i) => {
        const common = {
          stroke: color,
          strokeWidth,
          strokeLinecap: 'round' as const,
          strokeLinejoin: 'round' as const,
          fill,
        };
        if ('d' in shape) return <Path key={i} d={shape.d} {...common} />;
        if ('c' in shape) return <Circle key={i} cx={shape.c[0]} cy={shape.c[1]} r={shape.c[2]} {...common} />;
        const [x, y, w, h, rx] = shape.r;
        return <Rect key={i} x={x} y={y} width={w} height={h} rx={rx} ry={rx} {...common} />;
      })}
    </Svg>
  );
});

const styles = StyleSheet.create({
  // Web: an <svg> is not positioned by default, so it would paint *under* absolutely positioned
  // siblings that come before it (e.g. IconButton's fill, the ProductTile highlight). Native: no-op.
  icon: { position: 'relative' },
});
