// Temporary scaffold for routes that a screen agent has not built yet. Delete once every route is real.
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Screen, type GlowPreset } from '@/components';
import { colors } from '@/theme/tokens';

export interface RoutePlaceholderProps {
  /** Screen title (Display/L). */
  title: string;
  /** Which spec section / PNG this route implements. */
  spec: string;
  glow?: GlowPreset;
  /** Tab screens pass the tab-bar scroll padding. */
  bottomPadding?: number;
  /** Top-row accessory (e.g. a back / close IconButton). */
  nav?: ReactNode;
  /** Hero / demo content. */
  children?: ReactNode;
  /** Sticky bottom actions. */
  footer?: ReactNode;
}

export function RoutePlaceholder({ title, spec, glow, bottomPadding, nav, children, footer }: RoutePlaceholderProps) {
  return (
    <Screen scroll glow={glow} bottomPadding={bottomPadding} footer={footer} contentStyle={styles.content}>
      {nav ? <View style={styles.nav}>{nav}</View> : null}
      <View style={styles.head}>
        <AppText variant="displayL">{title}</AppText>
        <AppText variant="bodyM" color={colors.text.secondary}>
          Placeholder · {spec}
        </AppText>
      </View>
      {children}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 20, paddingTop: 8 },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  head: { gap: 6 },
});
