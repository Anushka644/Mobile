import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { colors, withAlpha } from '@/theme/tokens';

import { DASH_ACTIVE_WIDTH, DASH_GAP, DASH_HEIGHT, DASH_WIDTH } from './slides';

export interface PagerDotsProps {
  count: number;
  /** Continuous pager position (0 … count − 1), straight from the scroll offset. */
  position: SharedValue<number>;
  /** Current page, for screen readers. */
  index: number;
  style?: StyleProp<ViewStyle>;
}

const INACTIVE = withAlpha(colors.plum900, 0.16);
const ACTIVE = colors.plum900;

/**
 * Pager indicator (v2): thin ink dashes that follow the finger. The active dash is longer and
 * full ink, the others short and faint; width and colour interpolate with the scroll position.
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
        <Dash key={i} i={i} position={position} />
      ))}
    </View>
  );
}

function Dash({ i, position }: { i: number; position: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const near = Math.max(0, 1 - Math.abs(position.get() - i));
    return {
      width: DASH_WIDTH + (DASH_ACTIVE_WIDTH - DASH_WIDTH) * near,
      backgroundColor: interpolateColor(near, [0, 1], [INACTIVE, ACTIVE]),
    };
  });
  return <Animated.View style={[styles.dash, style]} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: DASH_GAP, height: DASH_HEIGHT },
  dash: { height: DASH_HEIGHT, borderRadius: DASH_HEIGHT / 2 },
});
