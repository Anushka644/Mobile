"""Compose App Store screenshots (1290x2796) from real app screenshots.

Usage: python3 appstore.py <shots_dir> <out_dir>
Expects 393x852@3x (1179x2556) or @2x PNGs named by route key (see SHOTS).
"""
import sys, os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'node_modules', '@expo-google-fonts')
DISPLAY = f'{ROOT}/bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf'
BODY = f'{ROOT}/nunito/600SemiBold/Nunito_600SemiBold.ttf'
W, H = 1290, 2796
CREAM = (255, 244, 236)
PLUM = (43, 33, 64)
PLUM500 = (122, 110, 143)
ACC = {
    'lavender': (236, 233, 255), 'ice': (205, 235, 255), 'mint': (221, 246, 238),
    'butter': (255, 244, 214), 'coral': (255, 229, 219),
}
SHOTS = [
    ('home', 'Wants melt.\nMoney doesn’t.', 'Freeze impulse buys. Decide when the urge cools.', 'lavender', 'ice', 0),
    ('freeze', 'Freeze it in\nseconds.', 'Paste a link or snap a photo. Pick a cooldown.', 'ice', 'mint', -3),
    ('item', 'Watch the\nwant melt.', 'A living countdown and gentle questions while you wait.', 'ice', 'lavender', 3),
    ('thawed', 'Still want it?\nYou decide.', 'No guilt either way. Buying is allowed.', 'mint', 'butter', -3),
    ('saved', 'Let it go.\nWatch it grow.', 'Every “no thanks” drops into your savings jar.', 'butter', 'mint', 3),
]


def glow(img, color, box, blur):
    layer = Image.new('RGBA', img.size, color + (0,))
    ImageDraw.Draw(layer).ellipse(box, fill=color + (255,))
    return Image.alpha_composite(img, layer.filter(ImageFilter.GaussianBlur(blur)))


def device(shot, width):
    s = shot.convert('RGBA')
    sw = width - 48
    sh = round(s.height * sw / s.width)
    s = s.resize((sw, sh), Image.LANCZOS)
    r = round(width * 0.145)
    dev = Image.new('RGBA', (width, sh + 48), (0, 0, 0, 0))
    ImageDraw.Draw(dev).rounded_rectangle((0, 0, width - 1, sh + 47), radius=r, fill=(255, 255, 255, 255))
    mask = Image.new('L', (sw, sh), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, sw - 1, sh - 1), radius=r - 24, fill=255)
    dev.paste(s, (24, 24), mask)
    return dev


def compose(shot_path, head, sub, g1, g2, rot, out):
    img = Image.new('RGBA', (W, H), CREAM + (255,))
    img = glow(img, ACC[g1], (-260, -420, W + 260, 760), 240)
    img = glow(img, ACC[g2], (-100, 1500, W + 100, 3000), 260)
    d = ImageDraw.Draw(img)
    fh = ImageFont.truetype(DISPLAY, 128)
    fs = ImageFont.truetype(BODY, 46)
    y = 190
    for line in head.split('\n'):
        w = d.textlength(line, font=fh)
        d.text(((W - w) / 2, y), line, font=fh, fill=PLUM)
        y += 132
    y += 26
    w = d.textlength(sub, font=fs)
    d.text(((W - w) / 2, y), sub, font=fs, fill=PLUM500)
    dev = device(Image.open(shot_path), 960)
    if rot:
        dev = dev.rotate(rot, resample=Image.BICUBIC, expand=True)
    shadow = Image.new('RGBA', img.size, PLUM + (0,))
    sx = (W - dev.width) // 2
    sy = y + 150
    alpha = dev.split()[3].point(lambda a: int(a * 0.28))
    sh = Image.new('RGBA', dev.size, PLUM + (0,))
    sh.putalpha(alpha)
    shadow.paste(sh, (sx, sy + 70), sh)
    img = Image.alpha_composite(img, shadow.filter(ImageFilter.GaussianBlur(70)))
    img.alpha_composite(dev, (sx, sy))
    img.convert('RGB').save(out, optimize=True)


if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    os.makedirs(dst, exist_ok=True)
    for i, (key, head, sub, g1, g2, rot) in enumerate(SHOTS, 1):
        p = os.path.join(src, f'{key}.png')
        if not os.path.exists(p):
            print('missing', p)
            continue
        compose(p, head, sub, g1, g2, rot, os.path.join(dst, f'appstore-{i}-{key}.png'))
        print('wrote', i, key)
