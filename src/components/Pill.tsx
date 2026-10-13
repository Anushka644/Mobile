import { StyleSheet, View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme/tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export type PillTone = 'ice' | 'ready' | 'neutral';

export interface PillProps {
  label: string;
  /** ice = frost/ice800, ready = ink/white, neutral = paper/ink500. Default 'ice'. */
  tone?: PillTone;
  /** Override the tone's default icon; pass null for none. */
  icon?: IconName | null;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const TONES: Record<PillTone, { bg: ColorValue; fg: ColorValue; icon: IconName | null }> = {
  ice: { bg: colors.ice100, fg: colors.ice800, icon: null },
  ready: { bg: colors.plum900, fg: colors.white, icon: null },
  neutral: { bg: colors.bg.sunken, fg: colors.plum500, icon: null },
};

/** Small status pill (v2): padding 10/5, gap 4, 14px icon, Label/S. */
export function Pill({ label, tone = 'ice', icon, style, testID }: PillProps) {
  const t = TONES[tone];
  const glyph = icon === undefined ? t.icon : icon;
  return (
    <View style={[styles.base, { backgroundColor: t.bg }, style]} testID={testID}>
      {glyph ? <Icon name={glyph} size={14} color={t.fg} strokeWidth={2} /> : null}
      <AppText variant="labelS" color={t.fg} numberOfLines={1} tabular>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
});
