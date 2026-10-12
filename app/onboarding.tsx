// Onboarding — PLACEHOLDER (spec §4.1, design/exports/08..10-onboarding-*@2x.png).
// Completing onboarding flips the root layout's Stack.Protected guard, which swaps to the tabs.
import { StyleSheet, View } from 'react-native';

import { Button, Cube } from '@/components';
import { RoutePlaceholder } from '@/dev/RoutePlaceholder';
import { PRODUCT_IMAGES } from '@/components/ProductImage';
import { useChillStore } from '@/store/useChillStore';

export default function OnboardingScreen() {
  const completeOnboarding = useChillStore((s) => s.completeOnboarding);
  const seedDemo = useChillStore((s) => s.seedDemo);

  return (
    <RoutePlaceholder
      title="Wants melt. Money doesn’t."
      spec="§4.1 Onboarding"
      glow="onboarding1"
      footer={
        <View style={styles.footer}>
          <Button label="Start my freezer" icon="snowflake" onPress={completeOnboarding} />
          <Button
            label="Try it with a sample freezer"
            icon="sparkles"
            variant="ghost"
            fullWidth
            onPress={() => {
              seedDemo();
              completeOnboarding();
            }}
          />
        </View>
      }
    >
      <View style={styles.hero}>
        <Cube progress={0} size={260} image={PRODUCT_IMAGES.sneakers} />
      </View>
    </RoutePlaceholder>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: 24 },
  footer: { gap: 8 },
});
