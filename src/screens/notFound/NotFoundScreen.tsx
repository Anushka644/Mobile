// Unknown URL (app/+not-found.tsx): an on-brand dead end instead of expo-router's developer
// screen. Cream canvas with the soft lavender top glow, a half-melted cube, calm copy and a
// Primary "Back to my freezer" 24pt above the bottom edge.

import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AppText, Button, Cube, Screen } from '@/components';
import { colors } from '@/theme/tokens';

export function NotFoundScreen() {
  const router = useRouter();
  return (
    <Screen
      glowProps={{ top: colors.lavender100 }}
      footer={
        <Button
          label="Back to my freezer"
          icon="snowflake"
          onPress={() => router.replace('/')}
          testID="not-found-home"
        />
      }
      testID="not-found"
    >
      <View style={styles.center}>
        <Animated.View entering={FadeIn.duration(320)}>
          <Cube progress={0.5} size={180} category="other" glyph="bag" accessibilityLabel="A half-melted ice cube" />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(60).duration(320)} style={styles.copy}>
          <AppText variant="titleL" align="center" accessibilityRole="header">
            Nothing in this freezer
          </AppText>
          <AppText variant="bodyM" color={colors.text.secondary} align="center">
            This link doesn’t lead anywhere — whatever was here has melted away.
          </AppText>
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 24 },
  copy: { marginTop: 20, gap: 8, alignItems: 'center', maxWidth: 320 },
});
