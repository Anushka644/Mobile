import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/theme/tokens';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chill</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.canvas,
  },
  title: {
    ...typography.displayXL,
    color: colors.text.primary,
  },
});
