// Small building blocks of the Freeze form: section captions, mood chips and category chips.

import { useEffect, useRef, type ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppText, CATEGORY_ICONS, Chip, GUTTER, Icon, MOOD_ICONS } from '@/components';
import { colors } from '@/theme/tokens';
import { CATEGORIES, CATEGORY_NAMES, MOOD_NAMES, MOODS, type Category, type Mood } from '@/types';

// ---------------------------------------------------------------------------

export interface FieldCaptionProps {
  /** Caption text (upper-cased by AppText), e.g. "Why do you want it?". */
  label: string;
  /** Right-aligned accessory (e.g. "Thaws Fri 9:41 PM"). */
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Caption row above a group of controls: plum500 Caption on the left, optional accessory right. */
export function FieldCaption({ label, trailing, style }: FieldCaptionProps) {
  return (
    <View style={[styles.captionRow, style]}>
      <AppText variant="caption" color={colors.text.secondary} accessibilityRole="header">
        {label}
      </AppText>
      {trailing}
    </View>
  );
}

/** Ice-blue accessory text with an optional leading icon, for FieldCaption's trailing slot. */
export function CaptionNote({ text, icon }: { text: string; icon?: 'sparkles' | 'clock' }) {
  return (
    <View style={styles.note}>
      {icon ? <Icon name={icon} size={15} color={colors.ice800} strokeWidth={2.2} /> : null}
      <AppText variant="labelM" color={colors.ice800} numberOfLines={1} tabular>
        {text}
      </AppText>
    </View>
  );
}

// ---------------------------------------------------------------------------

export interface MoodChipsProps {
  value: Mood | undefined;
  /** Tapping the selected chip again clears it (the mood is optional). */
  onChange: (mood: Mood | undefined) => void;
}

/** "Why do you want it?" — optional single-select mood chips in a wrap row (spec §3 Chip icons). */
export function MoodChips({ value, onChange }: MoodChipsProps) {
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup">
      {MOODS.map((mood) => (
        <Chip
          key={mood}
          label={MOOD_NAMES[mood]}
          icon={MOOD_ICONS[mood]}
          selected={value === mood}
          onPress={() => onChange(value === mood ? undefined : mood)}
          testID={`mood-${mood}`}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------

export interface CategoryChipsProps {
  value: Category;
  onChange: (category: Category) => void;
}

/** Room for the chips' soft shadow inside the horizontal scroller (it clips its content). */
const SHADOW_ROOM = 14;

/**
 * Category chips in one horizontally scrolling row that bleeds to the screen edges. When the value
 * changes (e.g. the auto-guess updates while typing) the selected chip scrolls into view.
 */
export function CategoryChips({ value, onChange }: CategoryChipsProps) {
  const scrollRef = useRef<ScrollView>(null);
  const chipBoxes = useRef<Partial<Record<Category, { x: number; width: number }>>>({});
  const viewportWidth = useRef(0);
  const scrollX = useRef(0);

  useEffect(() => {
    const box = chipBoxes.current[value];
    const width = viewportWidth.current;
    if (!box || width === 0) return;
    const left = box.x - GUTTER;
    const right = box.x + box.width + GUTTER - width;
    if (left < scrollX.current) scrollRef.current?.scrollTo({ x: Math.max(0, left), animated: true });
    else if (right > scrollX.current) scrollRef.current?.scrollTo({ x: right, animated: true });
  }, [value]);

  const onChipLayout = (category: Category, e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    chipBoxes.current[category] = { x, width };
  };

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.bleed}
      contentContainerStyle={styles.scrollRow}
      onLayout={(e) => {
        viewportWidth.current = e.nativeEvent.layout.width;
      }}
      onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollX.current = e.nativeEvent.contentOffset.x;
      }}
      scrollEventThrottle={32}
      keyboardShouldPersistTaps="handled"
      accessibilityRole="radiogroup"
    >
      {CATEGORIES.map((category) => (
        <View key={category} onLayout={(e) => onChipLayout(category, e)}>
          <Chip
            label={CATEGORY_NAMES[category]}
            icon={CATEGORY_ICONS[category]}
            selected={value === category}
            onPress={() => onChange(category)}
            testID={`category-${category}`}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 20,
  },
  note: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 10 },
  bleed: { marginHorizontal: -GUTTER, marginVertical: -SHADOW_ROOM, flexGrow: 0 },
  scrollRow: { gap: 8, paddingHorizontal: GUTTER, paddingVertical: SHADOW_ROOM },
});
