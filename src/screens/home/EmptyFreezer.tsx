// Empty freezer (spec §4.2 "Empty state", design/exports/13-freezer-empty@2x.png): a frozen cube
// with the bag glyph, calm copy, a "Freeze something" CTA and the clipboard tip.

import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AppText, Button, Cube, FRAME_WIDTH, Icon } from '@/components';
import { colors, radius } from '@/theme/tokens';

import { emptyLayout } from './homeLayout';

export interface EmptyFreezerProps {
  onFreeze: () => void;
  /**
   * Show the "copy a product link" tip. Default true. Home shows it only to people who have never
   * frozen anything: after a few decisions they know the flow, and the SavedBanner then takes the
   * room above the cube.
   */
  showTip?: boolean;
}

export function EmptyFreezer({ onFreeze, showTip = true }: EmptyFreezerProps) {
  const { width, height } = useWindowDimensions();
  const layout = emptyLayout(height);
  // Body/M runs ~340pt wide: on narrower phones break it at the comma rather than orphan "first."
  const body = `Next time something tempts you,${width < FRAME_WIDTH ? '\n' : ' '}freeze it here first.`;
  return (
    <View style={[styles.wrap, { paddingTop: showTip ? layout.top : 0 }]} testID="freezer-empty">
      <Animated.View entering={FadeIn.duration(320)} style={styles.cube}>
        <Cube progress={0} size={layout.cube} category="other" glyph="bag" accessibilityLabel="An empty ice cube" />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(320)} style={styles.copy}>
        <AppText variant="titleL" align="center" accessibilityRole="header">
          Your freezer is empty
        </AppText>
        <AppText variant="bodyM" color={colors.text.secondary} align="center">
          {body}
        </AppText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(320)} style={styles.cta}>
        <Button label="Freeze something" icon="plus" fullWidth={false} onPress={onFreeze} style={styles.button} />
      </Animated.View>

      {showTip ? (
        <Animated.View
          entering={FadeInDown.delay(180).duration(320)}
          style={[styles.tip, { marginTop: layout.tipGap }]}
          testID="freezer-empty-tip"
        >
          <Icon name="link" size={22} color={colors.text.ice} strokeWidth={2.2} />
          <AppText variant="bodyS" color={colors.text.ice} style={styles.tipText}>
            Tip: copy a product link, then tap + — we’ll fill in the name and price.
          </AppText>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Fills the space under the header; with the tip the block sits slightly below centre, like the
  // Figma frame (cube top 215, tip bottom 702 on an 852-tall screen, 20pt above the tab-bar padding).
  // Without the tip it is ~110pt shorter and drops the offset so it stays optically centred.
  wrap: { flex: 1, justifyContent: 'center' },
  cube: { alignItems: 'center' },
  copy: { marginTop: 19, gap: 8, alignItems: 'center' },
  cta: { marginTop: 24, alignItems: 'center' },
  // The Figma CTA hugs its label tighter than the kit's 24pt padding: 200pt wide, not 221.
  button: { alignSelf: 'center', paddingHorizontal: 15 },
  tip: {
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
