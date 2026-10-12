// The sheet frame around the Freeze form (spec §4.3: cream, top radius 36, 36 × 5 grabber).
//
// - iOS: the route is a native page sheet (presentation 'modal'), so the OS draws the backdrop,
//   the stacked card behind and the sheet edge; we only add the grabber.
// - Web / Android: the route is a plain full-screen page, so we draw the 11-freeze-sheet look
//   ourselves: plum backdrop, the dimmed card of the app peeking behind (web), and a cream panel
//   with top radius 36 that ends at the bottom edge (no home indicator).

import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SheetGrabber } from '@/components';
import { colors, radius, withAlpha } from '@/theme/tokens';

/** Web: the sheet's top edge, as in the Figma frame (the peeking card sits 30 above it). */
export const WEB_SHEET_TOP = 52;
/** Android: gap between the status bar and the sheet's top edge. */
const ANDROID_SHEET_GAP = 10;
/** Widest the panel gets on tablets / desktop browsers. */
const PANEL_MAX_WIDTH = 520;

/** Whether this platform draws its own sheet frame (everything but the native iOS page sheet). */
export const DRAWS_SHEET_FRAME = Platform.OS !== 'ios';

export interface SheetChromeProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SheetChrome({ children, style }: SheetChromeProps) {
  const insets = useSafeAreaInsets();

  if (!DRAWS_SHEET_FRAME) {
    return (
      <View style={[styles.fill, style]}>
        {children}
        <SheetGrabber />
      </View>
    );
  }

  const top = Platform.OS === 'web' ? WEB_SHEET_TOP : insets.top + ANDROID_SHEET_GAP;
  return (
    <View style={[styles.backdrop, style]}>
      {Platform.OS === 'web' ? (
        <View style={[styles.peekWrap, { top: top - 30 }]}>
          <View style={styles.peek} />
        </View>
      ) : null}
      <View style={[styles.panel, { marginTop: top }]}>
        {children}
        <SheetGrabber />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg.canvas },
  backdrop: { flex: 1, backgroundColor: colors.bg.inverse, alignItems: 'center' },
  peekWrap: {
    position: 'absolute',
    width: '100%',
    maxWidth: PANEL_MAX_WIDTH,
    height: 80,
    paddingHorizontal: 16,
    pointerEvents: 'none',
  },
  // The app behind the sheet, pushed back and dimmed (cream through the plum scrim).
  peek: {
    flex: 1,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: withAlpha(colors.cream100, 0.52),
  },
  panel: {
    flex: 1,
    width: '100%',
    maxWidth: PANEL_MAX_WIDTH,
    backgroundColor: colors.bg.canvas,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
});
