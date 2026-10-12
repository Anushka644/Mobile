import { memo, useId } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors, withAlpha } from '@/theme/tokens';

import { ICONS } from './icons';

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
 * A savings coin (spec §3 Coin): butter500 rim, butter300 face (28/40), white top highlight,
 * butter700 bottom shade, embossed butter600 snowflake and a soft drop shadow.
 */
export const Coin = memo(function Coin({ size = 40, rotate = 0, shadowed = true, style }: CoinProps) {
  const id = `coin${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const s = size / 40;
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: rotate ? [{ rotate: `${rotate}deg` }] : undefined,
          boxShadow: shadowed ? `0px ${3 * s}px ${6 * s}px ${-1 * s}px ${withAlpha(colors.plum900, 0.28)}` : undefined,
        },
        style,
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Defs>
          <LinearGradient id={`${id}rim`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.butter300} />
            <Stop offset="0.45" stopColor={colors.butter500} />
            <Stop offset="1" stopColor={colors.butter500} />
          </LinearGradient>
          <LinearGradient id={`${id}face`} x1="0.2" y1="0" x2="0.8" y2="1">
            <Stop offset="0" stopColor={colors.butter100} />
            <Stop offset="0.5" stopColor={colors.butter300} />
            <Stop offset="1" stopColor={colors.butter500} />
          </LinearGradient>
        </Defs>
        {/* rim + bottom edge shade */}
        <Circle cx={20} cy={20} r={20} fill={`url(#${id}rim)`} />
        <Path d="M0.4 24A20 20 0 0 0 39.6 24A21 21 0 0 1 0.4 24Z" fill={colors.butter700} opacity={0.45} />
        {/* top highlight */}
        <Path
          d="M8 11.5A15 15 0 0 1 28 6"
          stroke={colors.white}
          strokeOpacity={0.85}
          strokeWidth={2.4}
          strokeLinecap="round"
          fill="none"
        />
        {/* face */}
        <Circle cx={20} cy={20} r={14} fill={`url(#${id}face)`} />
        <Circle cx={20} cy={20} r={14} stroke={colors.butter600} strokeOpacity={0.35} strokeWidth={1} fill="none" />
        {/* embossed snowflake (light offset first, then the glyph) */}
        <G transform="translate(12.2 12.6) scale(0.65)">
          {ICONS.snowflake.map((shape, i) =>
            'd' in shape ? (
              <Path
                key={`h${i}`}
                d={shape.d}
                stroke={colors.white}
                strokeOpacity={0.6}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ) : null
          )}
        </G>
        <G transform="translate(12.2 12.2) scale(0.65)">
          {ICONS.snowflake.map((shape, i) =>
            'd' in shape ? (
              <Path
                key={`g${i}`}
                d={shape.d}
                stroke={colors.butter600}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ) : null
          )}
        </G>
      </Svg>
    </View>
  );
});
