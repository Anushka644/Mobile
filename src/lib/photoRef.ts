// Stored-photo references (pure; shared by ./photos.ts and ./photos.web.ts).

/** Items store picked photos as `chill-photo://<file>`, relative to the document directory. */
export const PHOTO_REF_PREFIX = 'chill-photo://';

/** Folder inside the document directory that holds picked photos. */
export const PHOTO_DIR = 'photos';

export function isPhotoRef(uri: string): boolean {
  return uri.startsWith(PHOTO_REF_PREFIX);
}

/** The file name inside PHOTO_DIR ('chill-photo://a.jpg' → 'a.jpg'); never escapes the folder. */
export function photoRefName(ref: string): string {
  const name = ref.slice(PHOTO_REF_PREFIX.length);
  return name.replace(/[/\\]/g, '_');
}

/** A unique file name for a picked photo, keeping its extension ('…/IMG_1.HEIC' → 'p-<id>.heic'). */
export function photoFileName(sourceUri: string, random: () => number = Math.random): string {
  const match = /\.([a-zA-Z0-9]{2,5})(?:[?#].*)?$/.exec(sourceUri);
  const ext = match ? match[1].toLowerCase() : 'jpg';
  const id = Array.from({ length: 3 }, () => Math.floor(random() * 0x100000).toString(36)).join('');
  return `p-${id}.${ext}`;
}
