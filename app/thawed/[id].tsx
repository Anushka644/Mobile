// Thawed decision — PLACEHOLDER (spec §4.5, design/exports/03-thawed-decision@2x.png).
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, cooldownPhrase, IconButton, ItemCube } from '@/components';
import { RoutePlaceholder } from '@/dev/RoutePlaceholder';
import { formatMoney } from '@/lib/money';
import { selectItem } from '@/store/selectors';
import { useChillStore } from '@/store/useChillStore';

export default function ThawedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const item = useChillStore((s) => selectItem(s, String(id)));
  const decide = useChillStore((s) => s.decide);
  const refreeze = useChillStore((s) => s.refreeze);

  if (!item || item.decision) return <Redirect href="/" />;
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <RoutePlaceholder
      title={`Still want the ${item.name.toLowerCase()}?`}
      spec="§4.5 Thawed decision"
      glow="thawed"
      nav={
        <>
          <View />
          <IconButton icon="close" variant="glass" accessibilityLabel="Close" onPress={close} />
        </>
      }
      footer={
        <View style={styles.actions}>
          <Button
            label={`Let it go · save ${formatMoney(item.priceCents, item.currency)}`}
            icon="coins"
            variant="mint"
            onPress={() => {
              decide(item.id, 'let-go');
              router.replace(`/let-go/${item.id}`);
            }}
          />
          <Button
            label="Yes, I’ll buy it"
            icon="bag"
            variant="secondary"
            onPress={() => {
              decide(item.id, 'bought');
              router.dismissTo('/');
            }}
          />
          <Button
            label={`Refreeze for ${cooldownPhrase(item.cooldown)}`}
            icon="refresh"
            variant="ghost"
            fullWidth
            onPress={() => {
              refreeze(item.id);
              router.replace(`/item/${item.id}`);
            }}
          />
        </View>
      }
    >
      <View style={styles.hero}>
        <ItemCube item={item} thawed progress={1} size={250} />
      </View>
    </RoutePlaceholder>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center' },
  actions: { gap: 12 },
});
