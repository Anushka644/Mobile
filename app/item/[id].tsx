// Item — cooling (spec §4.4). The screen lives in src/screens/item.
import { useLocalSearchParams } from 'expo-router';

import { ItemCoolingScreen } from '@/screens/item/ItemCoolingScreen';

export default function ItemRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ItemCoolingScreen id={String(id)} />;
}
