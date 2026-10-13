import { memo } from 'react';
import { Image, StyleSheet, type StyleProp, type ImageStyle } from 'react-native';

const GRAIN = require('../../assets/textures/grain.png') as number;

export interface GrainProps {
  /** Overall strength. Default 0.35 on paper; dark surfaces take ~0.7. */
  opacity?: number;
  style?: StyleProp<ImageStyle>;
}

/**
 * A barely-there paper grain (v2.1), tiled over the canvas so flat surfaces feel tactile. Absolute
 * fill and non-interactive; render it right after the background layer.
 */
export const Grain = memo(function Grain({ opacity = 0.35, style }: GrainProps) {
  return (
    <Image
      source={GRAIN}
      resizeMode="repeat"
      style={[StyleSheet.absoluteFill, styles.grain, { opacity }, style]}
      accessibilityIgnoresInvertColors
    />
  );
});

const styles = StyleSheet.create({
  grain: { width: '100%', height: '100%', pointerEvents: 'none' },
});
