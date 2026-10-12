// Photo for the Freeze sheet's photo tile (spec §4.3), via expo-image-picker.
//
// - iOS / Android: the system photo picker (no permission prompt needed for the library) with a
//   square crop. The picker's cached file uri is stored on the item.
// - Web: a file input. The picker returns a `blob:` URL that dies with the page, so the photo is
//   centre-cropped to a square, downscaled to 512px and stored as a small JPEG data URI instead
//   (it persists in localStorage with the rest of the store).

import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

/** Longest side of a web photo after downscaling. */
const WEB_MAX_SIDE = 512;
const WEB_JPEG_QUALITY = 0.82;

/** Opens the photo library and resolves to an image uri, or null when cancelled / unavailable. */
export async function pickPhoto(): Promise<string | null> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: Platform.OS !== 'web',
      aspect: [1, 1],
      quality: 0.7,
      exif: false,
    });
    const asset = result.canceled ? null : result.assets?.[0];
    if (!asset?.uri) return null;
    return Platform.OS === 'web' ? await toSquareDataUri(asset.uri) : asset.uri;
  } catch {
    return null;
  }
}

/** Web: centre-crop + downscale an image URL into a JPEG data URI (falls back to the input). */
function toSquareDataUri(src: string): Promise<string> {
  if (typeof document === 'undefined') return Promise.resolve(src);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const out = Math.max(1, Math.min(WEB_MAX_SIDE, side));
        const canvas = document.createElement('canvas');
        canvas.width = out;
        canvas.height = out;
        const ctx = canvas.getContext('2d');
        if (!ctx || side <= 0) {
          resolve(src);
          return;
        }
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(
          img,
          (img.naturalWidth - side) / 2,
          (img.naturalHeight - side) / 2,
          side,
          side,
          0,
          0,
          out,
          out
        );
        const data = canvas.toDataURL('image/jpeg', WEB_JPEG_QUALITY);
        if (src.startsWith('blob:')) URL.revokeObjectURL(src);
        resolve(data);
      } catch {
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}
