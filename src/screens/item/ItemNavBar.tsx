import { StyleSheet, View } from 'react-native';

import { AppText, IconButton } from '@/components';
import { colors } from '@/theme/tokens';

export interface ItemNavBarProps {
  /** Centre label, e.g. "Frozen 2 days ago" (mono caption, upper-cased). */
  title: string;
  onBack: () => void;
  /** Opens the product page; the button is hidden without it. */
  onOpen?: () => void;
}

const BUTTON = 44;

/**
 * Item nav row (v2): glass back · a quiet mono caption · glass arrow-up-right (only with a url).
 * The glass circles sit on the frost wash, so they read as frosted rather than as white chips.
 */
export function ItemNavBar({ title, onBack, onOpen }: ItemNavBarProps) {
  return (
    <View style={styles.row}>
      <IconButton icon="chevron-left" variant="glass" size={BUTTON} accessibilityLabel="Back" onPress={onBack} />
      <AppText variant="caption" color={colors.text.secondary} align="center" numberOfLines={1} style={styles.title}>
        {title}
      </AppText>
      {onOpen ? (
        <IconButton
          icon="arrow-up-right"
          variant="glass"
          size={BUTTON}
          accessibilityLabel="Open the product page"
          onPress={onOpen}
        />
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, height: BUTTON },
  title: { flex: 1 },
  placeholder: { width: BUTTON, height: BUTTON },
});
