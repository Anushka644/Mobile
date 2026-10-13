import { memo, useId } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors } from '@/theme/tokens';


export interface CoinProps {
  /** Diameter. Default 40. */
  size?: number;
  /** Rotation in degrees (Jar rows use ±14). */
  rotate?: number;
  /** Drop shadow. Default true. */
  shadowed?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * A saved drop (v2): what a let-go want melts into. An ice-blue droplet with a white highlight —
 * the "coin" of the app, used in bursts, the glass and small stacks. Name kept for API stability.
 */
export const Coin = memo(function Coin({ size = 40, rotate = 0, shadowed = true, style }: CoinProps) {
  const id = `drop${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <View
      style={[
        { width: size, height: size, transform: rotate ? [{ rotate: `${rotate}deg` }] : undefined },
        style,
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Defs>
          <LinearGradient id={`${id}f`} x1="0.2" y1="0" x2="0.8" y2="1">
            <Stop offset="0" stopColor={colors.ice300} />
            <Stop offset="1" stopColor={colors.ice600} />
          </LinearGradient>
        </Defs>
        {shadowed ? <Ellipse cx={20} cy={38} rx={9} ry={1.6} fill={colors.ice800} opacity={0.12} /> : null}
        <Path d="M20 2.5C20 2.5 33 17.5 33 25.5A13 13 0 0 1 7 25.5C7 17.5 20 2.5 20 2.5Z" fill={`url(#${id}f)`} />
        <Path
          d="M12.5 25.5A7.5 7.5 0 0 0 16.5 32"
          stroke={colors.white}
          strokeOpacity={0.85}
          strokeWidth={2.2}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </View>
  );
});
