import { openableUrl } from '../url';

describe('openableUrl', () => {
  it('keeps http(s) links and adds https to bare domains', () => {
    expect(openableUrl('https://nike.com/p/1')).toBe('https://nike.com/p/1');
    expect(openableUrl('  http://a.co ')).toBe('http://a.co');
    expect(openableUrl('nike.com/p/1?x=2')).toBe('https://nike.com/p/1?x=2');
    expect(openableUrl(' nike.com/t/dunk ')).toBe('https://nike.com/t/dunk');
  });

  it('rejects anything else', () => {
    expect(openableUrl(undefined)).toBeNull();
    expect(openableUrl('')).toBeNull();
    expect(openableUrl('javascript:alert(1)')).toBeNull();
    expect(openableUrl('mailto:a@b.co')).toBeNull();
    expect(openableUrl('not a link')).toBeNull();
  });
});
