// User photos on web (native: ./photos.ts). The web picker already stores a self-contained data
// URI on the item (see src/screens/freeze/pickPhoto.ts), so there is nothing to copy or resolve.

export { isPhotoRef } from './photoRef';

export function resolvePhotoUri(uri: string): string {
  return uri;
}

export async function persistPhoto(tempUri: string): Promise<string> {
  return tempUri;
}

export function deletePhoto(_uri: string | null | undefined): void {}

export function prunePhotos(_keep: readonly (string | null | undefined)[]): void {}
