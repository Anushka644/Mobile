import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { LinearGradient } from 'expo-linear-gradient';

import { haptics } from '@/lib/haptics';
import { colors, radius, shadow, withAlpha } from '@/theme/tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { bottomGap, TAB_BAR_FADE_HEIGHT, TAB_BAR_HEIGHT } from './layout';
import { springPop, useReducedMotion } from './motion';
import { PressableScale } from './PressableScale';

/** Icon + label per tab route (file name under app/(tabs)). Unknown routes fall back to options.title. */
export const TAB_META: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Freezer', icon: 'snowflake' },
  saved: { label: 'Saved', icon: 'coins' },
  insights: { label: 'Insights', icon: 'chart' },
  you: { label: 'You', icon: 'user-round' },
};

const CAN_BLUR = Platform.OS === 'ios' || Platform.OS === 'web';

export interface TabBarProps extends BottomTabBarProps {
  /** Cream fade (170pt, anchored to the screen bottom) so content dissolves under the bar. Default true. */
  fade?: boolean;
}

/**
 * Floating pill tab bar (spec §3 TabBar) for expo-router `<Tabs tabBar={(p) => <TabBar {...p} />}>`:
 * Freezer, Saved, [plum + FAB → /freeze], Insights, You. 353 × 76, its bottom edge 24pt above the
 * screen bottom (no safe-area inset, no home indicator). White 92% + backdrop blur (iOS/web),
 * active plum / inactive plum300, the active icon bounces 1 → 1.15 → 1. Tab screens pad their
 * scroll content with `useTabBarScrollPadding()` (178: the whole fade, so the last row can clear it).
 */
export function TabBar({ state, descriptors, navigation, insets, fade = true }: TabBarProps) {
  const router = useRouter();
  const routes = state.routes;
  const half = Math.ceil(routes.length / 2);

  const renderTab = (index: number) => {
    const route = routes[index];
    const options = descriptors[route.key]?.options;
    const meta = TAB_META[route.name] ?? {
      label: typeof options?.title === 'string' ? options.title : route.name,
      icon: 'sparkles' as IconName,
    };
    const focused = state.index === index;
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) {
        haptics.selection();
        navigation.navigate(route.name, route.params);
      }
    };
    const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });
    return (
      <TabItem
        key={route.key}
        label={meta.label}
        icon={meta.icon}
        focused={focused}
        onPress={onPress}
        onLongPress={onLongPress}
        testID={`tab-${route.name}`}
      />
    );
  };

  const gap = bottomGap(insets.bottom);
  return (
    <View style={[styles.root, { height: Math.max(TAB_BAR_FADE_HEIGHT, TAB_BAR_HEIGHT + gap) }]}>
      {fade ? (
        <LinearGradient
          colors={[withAlpha(colors.cream100, 0), withAlpha(colors.cream100, 0.88), colors.cream100]}
          locations={[0, 0.45, 0.72]}
          style={styles.fade}
        />
      ) : null}
      <View style={[styles.wrap, { bottom: gap }]} accessibilityRole="tablist">
        <View style={styles.bar}>
          <View style={[StyleSheet.absoluteFill, styles.clip]}>
            {CAN_BLUR ? <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} /> : null}
            <View style={[StyleSheet.absoluteFill, styles.tint]} />
          </View>
          {routes.slice(0, half).map((_, i) => renderTab(i))}
          <View style={styles.fabSlot}>
            <PressableScale
              onPress={() => router.push('/freeze')}
              haptic="tap"
              accessibilityLabel="Freeze something"
              testID="tab-fab"
              style={styles.fab}
            >
              <Icon name="plus" size={28} color={colors.text.inverse} strokeWidth={2.4} />
            </PressableScale>
          </View>
          {routes.slice(half).map((_, i) => renderTab(half + i))}
        </View>
      </View>
    </View>
  );
}

function TabItem({
  label,
  icon,
  focused,
  onPress,
  onLongPress,
  testID,
}: {
  label: string;
  icon: IconName;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  testID?: string;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (focused && !reduced) {
      scale.set(withSequence(withTiming(1.15, { duration: 120 }), withSpring(1, springPop)));
    }
  }, [focused, reduced, scale]);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const color = focused ? colors.plum900 : colors.plum300;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      aria-selected={focused}
      accessibilityLabel={label}
      testID={testID}
      style={styles.tab}
    >
      <Animated.View style={iconStyle}>
        <Icon name={icon} size={24} color={color} />
      </Animated.View>
      <AppText variant="caption" uppercase={false} color={color} numberOfLines={1} style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 0, right: 0, bottom: 0, pointerEvents: 'box-none' },
  fade: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, pointerEvents: 'none' },
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    pointerEvents: 'box-none',
  },
  // Geometry measured off the Figma tab bar: 14 + 4 × 63.5 tabs + a 71 FAB slot + 14 = 353, which
  // centres Freezer at 65.75 and the FAB at 196.5 on a 393 screen.
  bar: {
    width: '100%',
    maxWidth: 353,
    height: TAB_BAR_HEIGHT,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow('raised'),
  },
  clip: { borderRadius: radius.full, overflow: 'hidden', pointerEvents: 'none' },
  tint: { backgroundColor: withAlpha(colors.white, CAN_BLUR ? 0.92 : 0.97) },
  tab: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 4 },
  fabSlot: { width: 71, alignItems: 'center', justifyContent: 'center' },
  // Sentence-case labels drop Caption's +6% tracking (it is meant for UPPERCASE).
  label: { letterSpacing: 0 },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.action.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow('button'),
  },
});
