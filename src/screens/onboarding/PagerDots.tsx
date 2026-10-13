import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { colors } from '@/theme/tokens';

import { DOT_ACTIVE_WIDTH, DOT_GAP, DOT_SIZE } from './slides';

export interface PagerDotsProps {
  count: number;
  /** Continuous pager position (0 … count − 1), straight from the scroll offset. */
  position: SharedValue<number>;
  /** Current page, for screen readers. */
  index: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Page dots that follow the finger: the active dot is a 24 × 8 plum pill, the others 8 × 8 plum300
 * circles; width and color interpolate continuously with the scroll position.
 */
export function PagerDots({ count, position, index, style }: PagerDotsProps) {
  return (
    <View
      style={[styles.row, style]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`Page ${index + 1} of ${count}`}
    >
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} i={i} position={position} />
      ))}
    </View>
  );
}

function Dot({ i, position }: { i: number; position: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const near = Math.max(0, 1 - Math.abs(position.get() - i));
    return {
      width: DOT_SIZE + (DOT_ACTIVE_WIDTH - DOT_SIZE) * near,
      backgroundColor: interpolateColor(near, [0, 1], [colors.plum300, colors.plum900]),
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: DOT_GAP, height: DOT_SIZE },
  dot: { height: DOT_SIZE, borderRadius: DOT_SIZE / 2 },
});
