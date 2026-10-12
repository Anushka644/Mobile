import * as Clipboard from 'expo-clipboard';
import { Platform } from 'react-native';

import { readClipboardSuggestion, suggestionFromText } from '../clipboard';

jest.mock('expo-clipboard', () => ({
  hasStringAsync: jest.fn(async () => true),
  getStringAsync: jest.fn(async () => ''),
}));

const mocked = jest.mocked(Clipboard);

function setClipboard(text: string) {
  mocked.hasStringAsync.mockResolvedValue(text.length > 0);
  mocked.getStringAsync.mockResolvedValue(text);
}

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe('suggestionFromText', () => {
  it('names a bare link from its URL', () => {
    expect(suggestionFromText('https://www.nike.com/t/air-max-90-shoes-abc123')).toEqual({
      url: 'https://www.nike.com/t/air-max-90-shoes-abc123',
      name: 'Air Max 90 Shoes',
    });
  });

  it('prefers the shared title around the link and picks up a marked price', () => {
    expect(suggestionFromText('Apple AirPods Pro (2nd Gen) $249 https://a.co/d/7xYz9')).toEqual({
      url: 'https://a.co/d/7xYz9',
      name: 'Apple AirPods Pro (2nd Gen)',
      priceCents: 24900,
    });
    expect(suggestionFromText('Check out this: Linen Shirt | Uniqlo 39,90 € https://u.com/x')).toEqual({
      url: 'https://u.com/x',
      name: 'Linen Shirt',
      priceCents: 3990,
    });
  });

  it('ignores numbers that only appear in the URL or without a currency', () => {
    expect(
      suggestionFromText('https://www.ikea.com/us/en/p/kallax-shelf-unit-white-80275887/')
    ).toEqual({
      url: 'https://www.ikea.com/us/en/p/kallax-shelf-unit-white-80275887/',
      name: 'Kallax Shelf Unit White',
    });
    expect(suggestionFromText('Air Max 90 https://nike.com/t/x')?.priceCents).toBeUndefined();
    expect(suggestionFromText('Lamp $0 https://shop.com/lamp')?.priceCents).toBeUndefined();
  });

  it('falls back to the site name for id-only links', () => {
    expect(suggestionFromText('https://www.amazon.com/dp/B0BDHWDR12')).toEqual({
      url: 'https://www.amazon.com/dp/B0BDHWDR12',
      name: 'Amazon',
    });
  });

  it('returns null without a URL', () => {
    expect(suggestionFromText('just some notes $40')).toBeNull();
    expect(suggestionFromText('')).toBeNull();
    expect(suggestionFromText(null)).toBeNull();
  });
});

describe('readClipboardSuggestion', () => {
  it('suggests an item when the clipboard holds a link', async () => {
    setClipboard('https://shop.example.com/products/ceramic-table-lamp?variant=42');
    await expect(readClipboardSuggestion()).resolves.toEqual({
      url: 'https://shop.example.com/products/ceramic-table-lamp?variant=42',
      name: 'Ceramic Table Lamp',
    });
  });

  it('returns null when the clipboard has no link', async () => {
    setClipboard('call mum back');
    await expect(readClipboardSuggestion()).resolves.toBeNull();
  });

  it('does not read (or trigger the iOS paste banner) when the clipboard is empty', async () => {
    setClipboard('');
    await expect(readClipboardSuggestion()).resolves.toBeNull();
    expect(mocked.getStringAsync).not.toHaveBeenCalled();
  });

  it('returns null when the clipboard is unavailable', async () => {
    mocked.hasStringAsync.mockRejectedValueOnce(new Error('unavailable'));
    await expect(readClipboardSuggestion()).resolves.toBeNull();
    mocked.hasStringAsync.mockResolvedValueOnce(true);
    mocked.getStringAsync.mockRejectedValueOnce(new Error('denied'));
    await expect(readClipboardSuggestion()).resolves.toBeNull();
  });

  it('reads directly on web, where hasStringAsync would prompt too', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    setClipboard('https://www.nike.com/t/air-max-90-shoes-abc123');
    await expect(readClipboardSuggestion()).resolves.toMatchObject({ name: 'Air Max 90 Shoes' });
    expect(mocked.hasStringAsync).not.toHaveBeenCalled();
  });
});
