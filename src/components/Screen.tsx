import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode, type Ref } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type ColorValue,
  type LayoutChangeEvent,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, withAlpha } from '@/theme/tokens';

import { GlowBackground, type GlowBackgroundProps, type GlowPreset } from './Glow';
import { Grain } from './Grain';
import { FRAME_WIDTH, GUTTER, topInset, useBottomGap } from './layout';

export interface ScreenProps {
  children?: ReactNode;
  /** Background glow preset (spec "Background glows"). Default 'none' = plain cream (tab screens). */
  glow?: GlowPreset;
  /** Overrides for the glow layer (custom top / primary / gradient, or `background`). */
  glowProps?: Omit<GlowBackgroundProps, 'preset'>;
  /** Wrap the content in a vertical ScrollView. Default false (a flex: 1 column). */
  scroll?: boolean;
  /** Pad the top by the status-bar safe-area inset (20 on web, see topInset). Default true. */
  safeTop?: boolean;
  /** Horizontal gutter of the content column (max 393 wide, centred). Default 20. */
  gutter?: number;
  /**
   * Space below the content. Default 24 (BOTTOM_GAP). Tab screens pass `useTabBarScrollPadding()`.
   * When a `footer` is set, its measured height is added automatically.
   */
  bottomPadding?: number;
  /** Sticky bottom content (CTAs): absolutely positioned 24pt above the screen bottom, inside the gutters. */
  footer?: ReactNode;
  /** A cream fade behind the footer (40pt above it) so scrolling content dissolves under it. Default false. */
  footerFade?: boolean;
  /** Style of the content column (the ScrollView content container when `scroll`). */
  contentStyle?: StyleProp<ViewStyle>;
  /** Style of the outer screen view. */
  style?: StyleProp<ViewStyle>;
  /** Canvas color under the glows. Default bg.canvas. */
  background?: ColorValue;
  /** Paper grain over the canvas (v2.1). Default true. */
  grain?: boolean;
  /** Ref to the ScrollView (scroll screens). */
  scrollRef?: Ref<ScrollView>;
  /** Extra ScrollView props (scroll screens). */
  scrollProps?: Omit<ScrollViewProps, 'children' | 'contentContainerStyle' | 'style'>;
  testID?: string;
}

/**
 * Screen scaffold: cream canvas + the glow preset, status-bar inset at the top, a centred content
 * column with 20pt gutters, and an optional sticky footer 24pt above the bottom edge.
 * There is never a home indicator and no bottom safe-area inset (spec §2).
 */
export function Screen({
  children,
  glow = 'none',
  glowProps,
  scroll = false,
  safeTop = true,
  gutter = GUTTER,
  bottomPadding,
  footer,
  footerFade = false,
  contentStyle,
  style,
  background = colors.bg.canvas,
  grain = true,
  scrollRef,
  scrollProps,
  testID,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const gap = useBottomGap();
  const [footerHeight, setFooterHeight] = useState(0);
  const onFooterLayout = (e: LayoutChangeEvent) => setFooterHeight(Math.ceil(e.nativeEvent.layout.height));

  const padBottom = (bottomPadding ?? gap) + (footer ? footerHeight + gap : 0);
  // The footer fade dissolves into the canvas colour (a hex token; anything else fades to paper).
  const fadeBase = typeof background === 'string' && background.startsWith('#') ? background : colors.cream100;
  const column: StyleProp<ViewStyle> = [
    styles.column,
    { paddingTop: safeTop ? topInset(insets.top) : 0, paddingHorizontal: gutter, paddingBottom: padBottom },
    contentStyle,
  ];

  return (
    <View style={[styles.root, { backgroundColor: background }, style]} testID={testID}>
      <GlowBackground preset={glow} background={background} {...glowProps} />
      {grain ? <Grain /> : null}
      {scroll ? (
        <ScrollView
          ref={scrollRef}
          style={styles.fill}
          contentContainerStyle={[styles.scrollContent, column]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          {...scrollProps}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, column]}>{children}</View>
      )}
      {footer ? (
        <View style={[styles.footerWrap, { paddingBottom: gap }]}>
          {footerFade ? (
            <LinearGradient
              colors={[withAlpha(fadeBase, 0), withAlpha(fadeBase, 0.94), fadeBase]}
              locations={[0, 0.35, 1]}
              style={styles.footerFade}
            />
          ) : null}
          <View style={[styles.footer, { paddingHorizontal: gutter }]} onLayout={onFooterLayout}>
            {footer}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  fill: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  column: { width: '100%', maxWidth: FRAME_WIDTH, alignSelf: 'center' },
  footerWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', pointerEvents: 'box-none' },
  footerFade: { position: 'absolute', left: 0, right: 0, bottom: 0, top: -40, pointerEvents: 'none' },
  footer: { width: '100%', maxWidth: FRAME_WIDTH },
});
