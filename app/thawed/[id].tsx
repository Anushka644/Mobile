// Thawed decision (spec §4.5). The screen lives in src/screens/thawed.
import { useLocalSearchParams } from 'expo-router';

import { ThawedDecisionScreen } from '@/screens/thawed/ThawedDecisionScreen';

export default function ThawedRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ThawedDecisionScreen id={String(id)} />;
}
