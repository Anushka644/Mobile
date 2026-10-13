import { useEffect } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { colors } from '@/theme/tokens';

import { AppText } from './AppText';
import { Icon } from './Icon';
import { timingFade } from './motion';

export interface ReflectionCardProps {
  /** The question (e.g. reflectionPromptFor(item, now)). Cross-fades when it changes. */
  prompt: string;
  /** "Another question ›" link; hidden without a handler. */
  onNext?: () => void;
  /** Eyebrow text (Caption). Default "While it melts". */
  eyebrow?: string;
  /** 'night' for dark screens (white prompt, night hairline). Default 'day'. */
  tone?: 'day' | 'night';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Lavender reflection prompt card (spec §3 ReflectionCard). */
export function ReflectionCard({
  prompt,
  onNext,
  eyebrow = 'While it melts',
  tone = 'day',
  style,
  testID,
}: ReflectionCardProps) {
  const night = tone === 'night';
  const ink = night ? colors.white : colors.text.primary;
  const fade = useSharedValue(1);
  useEffect(() => {
    fade.set(0);
    fade.set(withTiming(1, timingFade));
  }, [prompt, fade]);
  const promptStyle = useAnimatedStyle(() => ({
    opacity: fade.get(),
    transform: [{ translateY: (1 - fade.get()) * 6 }],
  }));

  return (
    <View style={[styles.card, night ? styles.cardNight : null, style]} testID={testID}>
      <View style={styles.eyebrow}>
        <AppText variant="caption" color={night ? colors.night300 : colors.text.tertiary}>
          {eyebrow}
        </AppText>
      </View>
      <Animated.View style={promptStyle}>
        <AppText variant="displayItalic" color={ink} accessibilityLiveRegion="polite">
          {prompt}
        </AppText>
      </Animated.View>
      {onNext ? (
        <Pressable
          onPress={() => {
            haptics.selection();
            onNext();
          }}
          accessibilityRole="button"
          accessibilityLabel="Another question"
          hitSlop={10}
          style={styles.next}
        >
          <AppText variant="labelS" color={ink}>
            Another question
          </AppText>
          <Icon name="refresh" size={14} color={ink} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingTop: 20,
    paddingBottom: 4,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.strong,
  },
  cardNight: { borderColor: colors.night700 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  next: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
});
