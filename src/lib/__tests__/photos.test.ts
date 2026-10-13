import { isPhotoRef, PHOTO_REF_PREFIX, photoFileName, photoRefName } from '../photoRef';

const copies: [string, string][] = [];
const deleted: string[] = [];

jest.mock('expo-file-system', () => {
  const join = (parts: unknown[]) =>
    parts.map((p) => (typeof p === 'string' ? p : (p as { uri: string }).uri)).join('/');
  class MockFile {
    uri: string;
    name: string;
    exists = true;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
      this.name = this.uri.split('/').pop() ?? '';
    }
    async copy(dest: { uri: string }) {
      copies.push([this.uri, dest.uri]);
    }
    delete() {
      deleted.push(this.uri);
    }
  }
  class MockDirectory {
    uri: string;
    exists = true;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    create() {}
    list() {
      return [new MockFile(this.uri, 'p-keep.jpg'), new MockFile(this.uri, 'p-orphan.jpg')];
    }
  }
  return { File: MockFile, Directory: MockDirectory, Paths: { document: { uri: 'file:///docs' } } };
});

// eslint-disable-next-line import/first
import { deletePhoto, persistPhoto, prunePhotos, resolvePhotoUri } from '../photos';

describe('photo refs', () => {
  it('recognises refs and extracts a safe file name', () => {
    expect(isPhotoRef(`${PHOTO_REF_PREFIX}p-a.jpg`)).toBe(true);
    expect(isPhotoRef('file:///cache/a.jpg')).toBe(false);
    expect(isPhotoRef('data:image/png;base64,AAA')).toBe(false);
    expect(photoRefName(`${PHOTO_REF_PREFIX}../../etc/x.jpg`)).toBe('.._.._etc_x.jpg');
  });

  it('names files uniquely and keeps the extension', () => {
    expect(photoFileName('file:///c/IMG_1.HEIC', () => 0.5)).toMatch(/^p-[0-9a-z]+\.heic$/);
    expect(photoFileName('file:///c/blob', () => 0.5)).toMatch(/\.jpg$/);
    expect(photoFileName('file:///c/a.png', () => 0.1)).not.toBe(photoFileName('file:///c/a.png', () => 0.2));
  });
});

describe('native photo store', () => {
  beforeEach(() => {
    copies.length = 0;
    deleted.length = 0;
  });

  it('copies a picked photo into the document directory and stores a relative ref', async () => {
    const ref = await persistPhoto('file:///cache/ImagePicker/abc.jpg');
    expect(isPhotoRef(ref)).toBe(true);
    expect(copies).toHaveLength(1);
    expect(copies[0][0]).toBe('file:///cache/ImagePicker/abc.jpg');
    expect(copies[0][1]).toBe(`file:///docs/photos/${photoRefName(ref)}`);
    // Resolved against the *current* document directory at render time.
    expect(resolvePhotoUri(ref)).toBe(`file:///docs/photos/${photoRefName(ref)}`);
  });

  it('leaves other uris alone', () => {
    expect(resolvePhotoUri('file:///old/abs.jpg')).toBe('file:///old/abs.jpg');
    deletePhoto('file:///old/abs.jpg');
    expect(deleted).toEqual([]);
  });

  it('deletes a ref and prunes unreferenced files', () => {
    deletePhoto(`${PHOTO_REF_PREFIX}p-x.jpg`);
    expect(deleted).toEqual(['file:///docs/photos/p-x.jpg']);
    deleted.length = 0;
    prunePhotos([`${PHOTO_REF_PREFIX}p-keep.jpg`, undefined, 'data:x']);
    expect(deleted).toEqual(['file:///docs/photos/p-orphan.jpg']);
  });
});
