"""Compose App Store screenshots (1290x2796) from real app screenshots — v2 "frost minimal".

Usage: python3 appstore.py <shots_dir> <out_dir>
Expects 393x852 @2x or @3x PNGs named by route key (see SHOTS): home, freeze, item, thawed, saved.

Paper canvas with a soft frost wash at the top, a serif headline (words wrapped in *asterisks* are set
in italic), a quiet Geist subline, and the screenshot in a thin white device frame that runs off the
bottom edge.
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'node_modules', '@expo-google-fonts')
SERIF = f'{ROOT}/instrument-serif/400Regular/InstrumentSerif_400Regular.ttf'
SERIF_ITALIC = f'{ROOT}/instrument-serif/400Regular_Italic/InstrumentSerif_400Regular_Italic.ttf'
BODY = f'{ROOT}/geist/400Regular/Geist_400Regular.ttf'
W, H = 1290, 2796
PAPER = (246, 246, 243)
INK = (17, 17, 19)
INK500 = (111, 111, 118)
ICE100 = (233, 240, 247)
ICE50 = (243, 247, 251)

SHOTS = [
    ('home', 'Wants melt.\nMoney *doesn’t.*', 'Freeze an impulse buy. Decide once the urge cools.'),
    ('freeze', 'Put it\n*on ice.*', 'Paste a link or snap a photo. Pick a cooldown.'),
    ('item', 'Watch the\nwant *melt.*', 'The frost clears as the cooldown runs out.'),
    ('thawed', 'Still\n*want it?*', 'No guilt either way. Buying is allowed.'),
    ('saved', 'Let it go.\nWatch it *grow.*', 'Every “no thanks” becomes water in your glass.'),
]


def frost_wash(img):
    """Vertical ice100 → paper gradient over the top 1300px."""
    wash = Image.new('RGB', (1, 1300))
    for y in range(1300):
        t = y / 1299
        wash.putpixel((0, y), tuple(round(ICE100[i] * (1 - t) + PAPER[i] * t) for i in range(3)))
    img.paste(wash.resize((W, 1300)), (0, 0))


def runs(line):
    """'Money *doesn’t.*' → [('Money ', False), ('doesn’t.', True)]."""
    return [(part, i % 2 == 1) for i, part in enumerate(line.split('*')) if part]


def headline(d, text, y, size=158, leading=150):
    regular = ImageFont.truetype(SERIF, size)
    italic = ImageFont.truetype(SERIF_ITALIC, size)
    for line in text.split('\n'):
        parts = runs(line)
        width = sum(d.textlength(t, font=italic if it else regular) for t, it in parts)
        x = (W - width) / 2
        for t, it in parts:
            font = italic if it else regular
            d.text((x, y), t, font=font, fill=INK)
            x += d.textlength(t, font=font)
        y += leading
    return y


def device(shot, width):
    """The screenshot in a thin white frame with a hairline edge."""
    s = shot.convert('RGBA')
    pad = 16
    sw = width - pad * 2
    sh = round(s.height * sw / s.width)
    s = s.resize((sw, sh), Image.LANCZOS)
    r = round(width * 0.13)
    dev = Image.new('RGBA', (width, sh + pad * 2), (0, 0, 0, 0))
    dd = ImageDraw.Draw(dev)
    dd.rounded_rectangle((0, 0, width - 1, sh + pad * 2 - 1), radius=r, fill=(255, 255, 255, 255), outline=(225, 225, 220, 255), width=2)
    mask = Image.new('L', (sw, sh), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, sw - 1, sh - 1), radius=r - pad, fill=255)
    dev.paste(s, (pad, pad), mask)
    return dev


def compose(shot_path, head, sub, out):
    img = Image.new('RGB', (W, H), PAPER)
    frost_wash(img)
    img = img.convert('RGBA')
    d = ImageDraw.Draw(img)
    y = headline(d, head, 200)
    fs = ImageFont.truetype(BODY, 44)
    y += 56
    w = d.textlength(sub, font=fs)
    d.text(((W - w) / 2, y), sub, font=fs, fill=INK500)

    dev = device(Image.open(shot_path), 1000)
    sx = (W - dev.width) // 2
    sy = y + 150
    # Long, faint shadow: the device's alpha, offset down, blurred.
    shadow = Image.new('RGBA', img.size, INK + (0,))
    alpha = dev.split()[3].point(lambda a: int(a * 0.14))
    sh = Image.new('RGBA', dev.size, INK + (0,))
    sh.putalpha(alpha)
    shadow.paste(sh, (sx, sy + 60), sh)
    img = Image.alpha_composite(img, shadow.filter(ImageFilter.GaussianBlur(80)))
    img.alpha_composite(dev, (sx, sy))
    img.convert('RGB').save(out, optimize=True)


if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    os.makedirs(dst, exist_ok=True)
    for i, (key, head, sub) in enumerate(SHOTS, 1):
        p = os.path.join(src, f'{key}.png')
        if not os.path.exists(p):
            print('missing', p)
            continue
        compose(p, head, sub, os.path.join(dst, f'appstore-{i}-{key}.png'))
        print('wrote', i, key)
