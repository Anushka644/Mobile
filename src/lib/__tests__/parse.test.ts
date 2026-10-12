import {
  capTitle,
  extractUrl,
  guessCategory,
  guessNameFromUrl,
  parsePriceToCents,
  titleFromSharedText,
} from '../parse';

describe('extractUrl', () => {
  it('finds the first http(s) URL', () => {
    expect(extractUrl('look https://www.nike.com/t/air-max-90 and http://b.com')).toBe(
      'https://www.nike.com/t/air-max-90'
    );
    expect(extractUrl('http://example.com/a?b=1#c')).toBe('http://example.com/a?b=1#c');
    expect(extractUrl('HTTPS://EXAMPLE.COM')).toBe('HTTPS://EXAMPLE.COM');
  });

  it('drops sentence punctuation and unbalanced closing brackets', () => {
    expect(extractUrl('Want this: https://shop.com/p/lamp.')).toBe('https://shop.com/p/lamp');
    expect(extractUrl('(see https://shop.com/item)!')).toBe('https://shop.com/item');
    expect(extractUrl('"https://shop.com/x",')).toBe('https://shop.com/x');
    expect(extractUrl('https://en.wikipedia.org/wiki/Lamp_(furniture)')).toBe(
      'https://en.wikipedia.org/wiki/Lamp_(furniture)'
    );
  });

  it('returns null without a usable URL', () => {
    expect(extractUrl('no link here')).toBeNull();
    expect(extractUrl('ftp://files.com/x')).toBeNull();
    expect(extractUrl('https://')).toBeNull();
    expect(extractUrl('')).toBeNull();
    expect(extractUrl(null)).toBeNull();
    expect(extractUrl(undefined)).toBeNull();
  });
});

describe('parsePriceToCents', () => {
  it.each([
    ['$1,299.99', 129999],
    ['1299', 129900],
    ['€89,50', 8950],
    ['£1.299,00', 129900],
    ['89.5', 8950],
    ['  $ 140 ', 14000],
    ['0.99', 99],
    ['$0', 0],
    ['1,299', 129900],
    ['1.299', 129900],
    ['1 299,00', 129900],
    ['1 299,00 kr', 129900],
    ["CHF 1'299.50", 129950],
    ['USD 20', 2000],
    ['20 EUR', 2000],
    ['Rs. 2,499', 249900],
    ['¥12,800', 1280000],
    ['1 299,00 €', 129900],
  ])('%p -> %p', (input, cents) => {
    expect(parsePriceToCents(input)).toBe(cents);
  });

  it('prefers a currency-marked number over bare numbers', () => {
    expect(parsePriceToCents('Air Max 90 — $140')).toBe(14000);
    expect(parsePriceToCents('2 for 30€')).toBe(3000);
    expect(parsePriceToCents('Size 10, now 59,99 €')).toBe(5999);
    expect(parsePriceToCents('Was $199, now $149')).toBe(19900);
  });

  it('reads typographic Swiss apostrophes (Intl de-CH output)', () => {
    const swiss = new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(1299.5);
    expect(parsePriceToCents(swiss)).toBe(129950);
    expect(parsePriceToCents('CHF 1\u2019299.50')).toBe(129950);
    expect(parsePriceToCents('1\u2019299.50 CHF')).toBe(129950);
    expect(parsePriceToCents('Uhr CHF 1\u2019299.50', { requireCurrency: true })).toBe(129950);
  });

  it('does not take a model number before a prefixed price', () => {
    for (const requireCurrency of [false, true]) {
      const opts = { requireCurrency };
      expect(parsePriceToCents('PlayStation 5 $499', opts)).toBe(49900);
      expect(parsePriceToCents('Apple iPhone 16 $799', opts)).toBe(79900);
      expect(parsePriceToCents('Nintendo Switch 2 $449.99', opts)).toBe(44999);
      expect(parsePriceToCents('Sony WH-1000XM5 $348', opts)).toBe(34800);
      expect(parsePriceToCents('Dyson V15 £599', opts)).toBe(59900);
      expect(parsePriceToCents('Pack of 3 €12,99', opts)).toBe(1299);
      expect(parsePriceToCents('iPhone 15 EUR 999', opts)).toBe(99900);
    }
  });

  it('keeps a suffixed price when a quantity follows the currency mark', () => {
    expect(parsePriceToCents('12,99 € 3 items')).toBe(1299);
    expect(parsePriceToCents('12,99€ 3 Stück')).toBe(1299);
    expect(parsePriceToCents('20 € 15% off')).toBe(2000);
  });

  it('skips percentages when falling back to a bare number', () => {
    expect(parsePriceToCents('20% off, 45')).toBe(4500);
  });

  it('can require a currency mark for free text', () => {
    expect(parsePriceToCents('Apple AirPods Pro (2nd Gen)', { requireCurrency: true })).toBeNull();
    expect(parsePriceToCents('AirPods Pro $249', { requireCurrency: true })).toBe(24900);
    expect(parsePriceToCents('6 ft cable', { requireCurrency: true })).toBeNull();
    expect(parsePriceToCents('try 3 times', { requireCurrency: true })).toBeNull();
  });

  it('returns null without a number', () => {
    expect(parsePriceToCents('')).toBeNull();
    expect(parsePriceToCents('   ')).toBeNull();
    expect(parsePriceToCents('free')).toBeNull();
    expect(parsePriceToCents('$')).toBeNull();
    expect(parsePriceToCents(null)).toBeNull();
    expect(parsePriceToCents(undefined)).toBeNull();
  });
});

describe('guessNameFromUrl', () => {
  it.each([
    ['https://www.nike.com/t/air-max-90-shoes-abc123', 'Air Max 90 Shoes'],
    [
      'https://www.amazon.com/Apple-AirPods-Pro-2nd-Generation/dp/B0BDHWDR12/ref=sr_1_1?crid=X',
      'Apple AirPods Pro 2nd Generation',
    ],
    ['https://www.etsy.com/listing/123456789/handmade-ceramic-mug-blue?ref=hp', 'Handmade Ceramic Mug Blue'],
    ['https://www.zara.com/us/en/oversized-blazer-p02010743.html?v1=1', 'Oversized Blazer'],
    ['https://www.ikea.com/us/en/p/kallax-shelf-unit-white-80275887/', 'Kallax Shelf Unit White'],
    ['https://shop.example.com/products/linen_shirt#reviews', 'Linen Shirt'],
    ['https://www.walmart.com/ip/Ninja-Air-Fryer-AF101/123456789', 'Ninja Air Fryer'],
    ['https://www.target.com/p/stanley-40oz-quencher/-/A-12345678', 'Stanley 40oz Quencher'],
    ['https://store.com/p/floor-lamp-for-the-living-room', 'Floor Lamp for the Living Room'],
    ['https://store.com/p/USB-C-CHARGER', 'USB C Charger'],
    ['https://store.com/p/caf%C3%A9+au+lait+mug', 'Café Au Lait Mug'],
  ])('%s -> %p', (url, name) => {
    expect(guessNameFromUrl(url)).toBe(name);
  });

  it('falls back to the site name', () => {
    expect(guessNameFromUrl('https://www.nike.com/')).toBe('Nike');
    expect(guessNameFromUrl('https://www.amazon.com/dp/B0BDHWDR12')).toBe('Amazon');
    expect(guessNameFromUrl('https://www.amazon.co.uk/gp/product/B0BDHWDR12')).toBe('Amazon');
    expect(guessNameFromUrl('https://a.co/d/abc1234')).toBe('Amazon');
    expect(guessNameFromUrl('https://store.apple.com/')).toBe('Apple');
    expect(guessNameFromUrl('https://www.urban-outfitters.com/en-us/')).toBe('Urban Outfitters');
    expect(guessNameFromUrl('https://www.ebay.com/itm/1234567890')).toBe('eBay');
    expect(guessNameFromUrl('https://user:pw@shop.ikea.com:8080/')).toBe('IKEA');
  });

  it('caps the title at 40 characters on a word boundary', () => {
    const name = guessNameFromUrl(
      'https://www.bestbuy.com/site/sony-wh1000xm5-wireless-noise-canceling-headphones-black/6505727.p?skuId=6505727'
    );
    expect(name).toBe('Sony Wireless Noise Canceling Headphones');
    expect(name.length).toBeLessThanOrEqual(40);
    // Very long single tokens are treated as ids, not words.
    expect(guessNameFromUrl('https://x.com/p/supercalifragilisticexpialidocious-lamp')).toBe('Lamp');
  });

  it('accepts links without a scheme and handles junk', () => {
    expect(guessNameFromUrl('nike.com/t/air-max-90-shoes-abc123')).toBe('Air Max 90 Shoes');
    expect(guessNameFromUrl('')).toBe('');
    expect(guessNameFromUrl(null)).toBe('');
  });
});

describe('capTitle', () => {
  it('collapses whitespace and leaves short titles alone', () => {
    expect(capTitle('  Linen   shirt ')).toBe('Linen shirt');
  });

  it('does not end on a connecting word or separator', () => {
    expect(capTitle('Lamp for', 40)).toBe('Lamp');
    expect(capTitle('Ceramic mug and saucer set in blue glaze', 26)).toBe('Ceramic mug and saucer set');
    expect(capTitle('Ceramic mug and saucer', 18)).toBe('Ceramic mug');
    expect(capTitle('Mug -', 40)).toBe('Mug');
  });

  it('hard-cuts a title with no usable word boundary', () => {
    expect(capTitle('x'.repeat(50))).toHaveLength(40);
    expect(capTitle(`ab ${'y'.repeat(50)}`)).toHaveLength(40);
  });
});

describe('titleFromSharedText', () => {
  it('keeps the words around a shared link', () => {
    expect(titleFromSharedText('Apple AirPods Pro (2nd Gen) https://a.co/d/xyz')).toBe(
      'Apple AirPods Pro (2nd Gen)'
    );
    expect(titleFromSharedText('Nike Air Max 90 | Nike.com https://nike.com/t/x')).toBe(
      'Nike Air Max 90'
    );
    expect(titleFromSharedText('Check out this: Linen Shirt - Uniqlo https://u.com/x')).toBe(
      'Linen Shirt'
    );
    expect(titleFromSharedText('Air Max 90 $140 https://nike.com/t/x')).toBe('Air Max 90');
  });

  it('returns null when only a link (or a long message) is left', () => {
    expect(titleFromSharedText('https://nike.com/t/air-max')).toBeNull();
    expect(titleFromSharedText('  $140  ')).toBeNull();
    expect(
      titleFromSharedText(
        'hey so I was thinking about it and maybe we should get this for the flat next week https://x.com'
      )
    ).toBeNull();
    expect(titleFromSharedText('')).toBeNull();
  });
});

describe('guessCategory', () => {
  it.each([
    ['Air Max 90 Shoes', 'fashion'],
    ['Oversized denim jacket', 'fashion'],
    ['Linen t-shirt', 'fashion'],
    ['Graphic tee', 'fashion'],
    ['Midi dress', 'fashion'],
    ['Sony WH-1000XM5 Wireless Headphones', 'tech'],
    ['iPhone 16 Pro', 'tech'],
    ['MacBook Air laptop', 'tech'],
    ['Apple Watch Series 10', 'tech'],
    ['Gaming headset', 'tech'],
    ['Mushroom table lamp', 'home'],
    ['Ninja Air Fryer', 'home'],
    ['Eames lounge chair', 'home'],
    ['Kitchen knife set', 'home'],
    ['Coffee mug', 'home'],
    ['Vitamin C serum', 'beauty'],
    ['Glossier skincare set', 'beauty'],
    ['Makeup brushes', 'beauty'],
    ['Dyson Airwrap hair styler', 'beauty'],
    ['Dark chocolate box', 'food'],
    ['Sushi takeout', 'food'],
    ['Bag of chips', 'food'],
    ['LEGO Millennium Falcon', 'fun'],
    ['Zelda video game', 'fun'],
    ['Plush toy', 'fun'],
    ['Concert tickets', 'fun'],
    ['Something nice', 'other'],
    ['', 'other'],
  ] as const)('%p -> %p', (text, category) => {
    expect(guessCategory(text)).toBe(category);
  });

  it('reads URL slugs', () => {
    expect(guessCategory('https://www.nike.com/t/air-max-90-shoes-abc123')).toBe('fashion');
    expect(guessCategory('https://shop.com/products/ceramic_table_lamp')).toBe('home');
  });

  it('is case-insensitive and tolerates null', () => {
    expect(guessCategory('WIRELESS EARBUDS')).toBe('tech');
    expect(guessCategory(null)).toBe('other');
    expect(guessCategory(undefined)).toBe('other');
  });
});
