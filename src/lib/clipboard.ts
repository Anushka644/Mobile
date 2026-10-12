// Turn a product link on the clipboard into a draft item for the Freeze form.

import * as Clipboard from 'expo-clipboard';
import { Platform } from 'react-native';

import { extractUrl, guessNameFromUrl, parsePriceToCents, titleFromSharedText } from './parse';

export interface ClipboardSuggestion {
  url: string;
  name: string;
  priceCents?: number;
}

/**
 * Build a suggestion from copied / shared text. Null unless the text contains an http(s) URL.
 * The name comes from the text around the link ('Apple AirPods Pro https://a.co/d/x') when there
 * is one, else from the URL. A price is only taken when it has a currency mark ('$140').
 */
export function suggestionFromText(text: string | null | undefined): ClipboardSuggestion | null {
  const url = extractUrl(text);
  if (!text || !url) return null;
  const name = titleFromSharedText(text) ?? guessNameFromUrl(url);
  const priceCents = parsePriceToCents(text.replace(url, ' '), { requireCurrency: true });
  return priceCents !== null && priceCents > 0 ? { url, name, priceCents } : { url, name };
}

/**
 * Read the clipboard and suggest an item if it holds a link; null otherwise or on any error.
 * On iOS reading clipboard text shows the system paste banner, so call this on user intent
 * (opening the Freeze sheet / tapping "Paste link"), not in the background. On native the
 * cheap hasStringAsync() check runs first so an empty clipboard never triggers the banner.
 */
export async function readClipboardSuggestion(): Promise<ClipboardSuggestion | null> {
  try {
    if (Platform.OS !== 'web' && !(await Clipboard.hasStringAsync())) return null;
    const text = await Clipboard.getStringAsync();
    return suggestionFromText(text);
  } catch {
    return null; // permission denied (web) or clipboard unavailable
  }
}
