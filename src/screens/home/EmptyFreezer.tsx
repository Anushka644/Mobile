// Empty freezer (spec §4.2 "Empty state", design/exports/13-freezer-empty@2x.png): a frozen cube
// with the bag glyph, calm copy, a "Freeze something" CTA and the clipboard tip.

import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AppText, Button, Cube, Icon } from '@/components';
import { colors, radius } from '@/theme/tokens';

export interface EmptyFreezerProps {
  onFreeze: () => void;
}

/** Cube box size: the Figma body is 162 wide (150 × 216/200). */
const CUBE_SIZE = 216;

export function EmptyFreezer({ onFreeze }: EmptyFreezerProps) {
  return (
    <View style={styles.wrap} testID="freezer-empty">
      <Animated.View entering={FadeIn.duration(320)} style={styles.cube}>
        <Cube progress={0} size={CUBE_SIZE} category="other" glyph="bag" accessibilityLabel="An empty ice cube" />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(320)} style={styles.copy}>
        <AppText variant="titleL" align="center" accessibilityRole="header">
          Your freezer is empty
        </AppText>
        <AppText variant="bodyM" color={colors.text.secondary} align="center">
          Next time something tempts you, freeze it here first.
        </AppText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(320)} style={styles.cta}>
        <Button label="Freeze something" icon="plus" fullWidth={false} onPress={onFreeze} style={styles.button} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(180).duration(320)} style={styles.tip}>
        <Icon name="link" size={22} color={colors.text.ice} strokeWidth={2.2} />
        <AppText variant="bodyS" color={colors.text.ice} style={styles.tipText}>
          Tip: copy a product link, then tap + — we’ll fill in the name and price.
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Fills the space under the header; the block sits slightly below centre, like the Figma frame
  // (cube top 215, tip bottom 702 on an 852-tall screen, 20pt above the tab-bar padding).
  wrap: { flex: 1, justifyContent: 'center', paddingTop: 27 },
  cube: { alignItems: 'center' },
  copy: { marginTop: 19, gap: 8, alignItems: 'center' },
  cta: { marginTop: 24, alignItems: 'center' },
  button: { alignSelf: 'center' },
  tip: {
    marginTop: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 16,
    paddingRight: 18,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.ice300,
    backgroundColor: colors.ice100,
  },
  tipText: { flex: 1 },
});
