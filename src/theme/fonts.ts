// Font map for expo-font's useFonts(). Keys are the family names used in
// tokens.ts (`fontFamily`), so `typography.*` styles resolve to these files.
// Per-weight subpath imports keep unused weights out of the bundle.
import { BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque/600SemiBold';
import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque/700Bold';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';
import { Nunito_500Medium } from '@expo-google-fonts/nunito/500Medium';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';

import { fontFamily } from './tokens';

export const fonts = {
  [fontFamily.displaySemiBold]: BricolageGrotesque_600SemiBold,
  [fontFamily.displayBold]: BricolageGrotesque_700Bold,
  [fontFamily.displayExtraBold]: BricolageGrotesque_800ExtraBold,
  [fontFamily.bodyMedium]: Nunito_500Medium,
  [fontFamily.bodySemiBold]: Nunito_600SemiBold,
  [fontFamily.bodyBold]: Nunito_700Bold,
  [fontFamily.bodyExtraBold]: Nunito_800ExtraBold,
};
