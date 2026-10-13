// User photos on iOS / Android (web: ./photos.web.ts).
//
// The image picker hands back a file in the app's cache, which the OS may purge, and on iOS the
// app container's absolute path changes across updates — so an absolute `file://` uri stored on an
// item eventually stops resolving. Picked photos are therefore copied into the document directory
// and items store a *relative* reference (`chill-photo://<file>`), resolved to an absolute uri only
// when rendering. Older items holding absolute uris still render as before.

import { Directory, File, Paths } from 'expo-file-system';

import { isPhotoRef, PHOTO_DIR, PHOTO_REF_PREFIX, photoFileName, photoRefName } from './photoRef';

export { isPhotoRef } from './photoRef';

function photoDir(): Directory {
  return new Directory(Paths.document, PHOTO_DIR);
}

/** The uri to render for a stored image reference (a photo ref, a file / data / https uri). */
export function resolvePhotoUri(uri: string): string {
  if (!isPhotoRef(uri)) return uri;
  try {
    return new File(photoDir(), photoRefName(uri)).uri;
  } catch {
    return uri;
  }
}

/**
 * Copies a freshly picked photo into the app's document directory and resolves to its photo ref.
 * Falls back to the original uri if the copy fails (it still renders until the cache is purged).
 */
export async function persistPhoto(tempUri: string): Promise<string> {
  try {
    const dir = photoDir();
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    const name = photoFileName(tempUri);
    await new File(tempUri).copy(new File(dir, name));
    return `${PHOTO_REF_PREFIX}${name}`;
  } catch {
    return tempUri;
  }
}

/** Deletes a stored photo (no-op for anything that isn't a photo ref). Never throws. */
export function deletePhoto(uri: string | null | undefined): void {
  if (!uri || !isPhotoRef(uri)) return;
  try {
    const file = new File(photoDir(), photoRefName(uri));
    if (file.exists) file.delete();
  } catch {
    // Already gone.
  }
}

/** Deletes stored photos no item references any more (e.g. after a reset). Never throws. */
export function prunePhotos(keep: readonly (string | null | undefined)[]): void {
  try {
    const dir = photoDir();
    if (!dir.exists) return;
    const referenced = new Set(keep.filter((u): u is string => !!u && isPhotoRef(u)).map(photoRefName));
    for (const entry of dir.list()) {
      if (entry instanceof File && !referenced.has(entry.name)) entry.delete();
    }
  } catch {
    // Best effort.
  }
}
