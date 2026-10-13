// Font map for expo-font's useFonts(). Keys are the family names used in
// tokens.ts (`fontFamily`), so `typography.*` styles resolve to these files.
// Per-weight subpath imports keep unused weights out of the bundle.
import { Geist_300Light } from '@expo-google-fonts/geist/300Light';
import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_500Medium } from '@expo-google-fonts/geist/500Medium';
import { Geist_600SemiBold } from '@expo-google-fonts/geist/600SemiBold';
import { GeistMono_400Regular } from '@expo-google-fonts/geist-mono/400Regular';
import { GeistMono_500Medium } from '@expo-google-fonts/geist-mono/500Medium';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif/400Regular';
import { InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif/400Regular_Italic';

import { fontFamily } from './tokens';

export const fonts = {
  [fontFamily.light]: Geist_300Light,
  [fontFamily.regular]: Geist_400Regular,
  [fontFamily.medium]: Geist_500Medium,
  [fontFamily.displaySemiBold]: Geist_600SemiBold,
  [fontFamily.serif]: InstrumentSerif_400Regular,
  [fontFamily.serifItalic]: InstrumentSerif_400Regular_Italic,
  [fontFamily.mono]: GeistMono_400Regular,
  [fontFamily.monoMedium]: GeistMono_500Medium,
};
