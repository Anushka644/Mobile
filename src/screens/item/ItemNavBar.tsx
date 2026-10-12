import { StyleSheet, View } from 'react-native';

import { AppText, IconButton } from '@/components';
import { colors } from '@/theme/tokens';

export interface ItemNavBarProps {
  /** Centre label, e.g. "Frozen 2 days ago" (Label/S, ice800). */
  title: string;
  onBack: () => void;
  /** Opens the product page; the button is hidden without it. */
  onOpen?: () => void;
}

const BUTTON = 48;

/** Item nav row (spec §4.4): Glass back · centred label · Glass arrow-up-right (optional). */
export function ItemNavBar({ title, onBack, onOpen }: ItemNavBarProps) {
  return (
    <View style={styles.row}>
      <IconButton icon="chevron-left" variant="glass" accessibilityLabel="Back" onPress={onBack} />
      <AppText variant="labelS" color={colors.text.ice} align="center" numberOfLines={1} style={styles.title}>
        {title}
      </AppText>
      {onOpen ? (
        <IconButton icon="arrow-up-right" variant="glass" accessibilityLabel="Open the product page" onPress={onOpen} />
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
