// Photo for the Freeze sheet's photo tile (spec §4.3), via expo-image-picker.
//
// - iOS / Android: the system photo picker (no permission prompt needed for the library) with a
//   square crop. The picked file lives in the cache (which the OS may purge), so it is copied into
//   the document directory and the item stores a relative photo ref (see src/lib/photos.ts).
// - Web: a file input. The picker returns a `blob:` URL that dies with the page, so the picture is
//   centre-cropped to a square and stored as a small data URI instead (it persists in localStorage
//   with the rest of the store): photos as a 512px JPEG, transparent cut-outs as a 320px PNG.

import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { persistPhoto } from '@/lib/photos';

/** Side of a web photo after downscaling (JPEG, ~40KB). */
const WEB_PHOTO_SIDE = 512;
/** Side of a web cut-out (PNG keeps the alpha but is ~4x heavier, so it is kept smaller). */
const WEB_CUTOUT_SIDE = 320;
const WEB_JPEG_QUALITY = 0.82;

/**
 * Opens the photo library and resolves to the image to store on the item (a photo ref on native, a
 * data URI on web), or null when cancelled / unavailable.
 */
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
    return Platform.OS === 'web' ? await toSquareDataUri(asset.uri) : await persistPhoto(asset.uri);
  } catch {
    return null;
  }
}

/** Web: centre-crop + downscale an image URL into a data URI (falls back to the input). */
function toSquareDataUri(src: string): Promise<string> {
  if (typeof document === 'undefined') return Promise.resolve(src);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const crop = { x: (img.naturalWidth - side) / 2, y: (img.naturalHeight - side) / 2, side };
        const photo = side > 0 ? drawSquare(img, crop, Math.min(WEB_PHOTO_SIDE, side)) : null;
        if (!photo) {
          resolve(src);
          return;
        }
        // Cut-outs (transparent PNGs) stay PNG so they float in the ice like the bundled renders.
        let data: string;
        if (hasTransparency(photo.ctx, photo.canvas.width)) {
          const small = drawSquare(img, crop, Math.min(WEB_CUTOUT_SIDE, side));
          data = (small ?? photo).canvas.toDataURL('image/png');
        } else {
          data = photo.canvas.toDataURL('image/jpeg', WEB_JPEG_QUALITY);
        }
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

/** Draws the square `crop` of `img` onto a new `out` × `out` canvas. */
function drawSquare(
  img: HTMLImageElement,
  crop: { x: number; y: number; side: number },
  out: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(out));
  canvas.height = canvas.width;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, crop.x, crop.y, crop.side, crop.side, 0, 0, canvas.width, canvas.height);
  return { canvas, ctx };
}

/** True when any pixel of the square canvas is not fully opaque (sampled on a 4px grid). */
function hasTransparency(ctx: CanvasRenderingContext2D, side: number): boolean {
  try {
    const { data } = ctx.getImageData(0, 0, side, side);
    for (let y = 0; y < side; y += 4) {
      for (let x = 0; x < side; x += 4) {
        if (data[(y * side + x) * 4 + 3] < 250) return true;
      }
    }
    return false;
  } catch {
    return false; // tainted canvas: treat as a photo
  }
}
