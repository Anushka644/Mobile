// Let-go celebration (spec §4.6). The screen lives in src/screens/letgo.
import { useLocalSearchParams } from 'expo-router';

import { LetGoScreen } from '@/screens/letgo/LetGoScreen';

export default function LetGoRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <LetGoScreen id={String(id)} />;
}
