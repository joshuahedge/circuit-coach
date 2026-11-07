"""Draws the app icons with Pillow: a dark tile, an orange ring of five stations (a circuit) and a light
rising chevron inside it (getting stronger).

Usage: python tools/icons.py   (writes into icons/)
"""
import math
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'icons')
BG = (18, 22, 28)
ORANGE = (255, 138, 76)
LIGHT = (246, 238, 228)
SS = 4  # supersampling for smooth edges


def dot(d, x, y, w, fill):
    d.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=fill)


def draw(size, inset):
    s = size * SS
    img = Image.new('RGB', (s, s), BG)
    d = ImageDraw.Draw(img)
    pad = s * inset
    span = s - 2 * pad
    cx, cy = s / 2, s / 2
    w = span * 0.12
    r = span * 0.5 - w * 0.9
    # The circuit: a ring of five stations, round after round.
    gap = 34
    for i in range(5):
        a0 = -90 + i * 72 + gap / 2
        a1 = a0 + 72 - gap
        d.arc((cx - r - w / 2, cy - r - w / 2, cx + r + w / 2, cy + r + w / 2), a0, a1, fill=ORANGE, width=int(w))
        for a in (a0, a1):
            t = math.radians(a)
            dot(d, cx + r * math.cos(t), cy + r * math.sin(t), w, ORANGE)
    # Rising chevron in the middle.
    cw = span * 0.1
    pts = [(cx - span * 0.17, cy + span * 0.09), (cx, cy - span * 0.08), (cx + span * 0.17, cy + span * 0.09)]
    d.line(pts, fill=LIGHT, width=int(cw), joint='curve')
    for x, y in (pts[0], pts[-1]):
        dot(d, x, y, cw, LIGHT)
    return img.resize((size, size), Image.LANCZOS)


def main():
    os.makedirs(OUT, exist_ok=True)
    draw(192, 0.16).save(os.path.join(OUT, 'icon-192.png'))
    draw(512, 0.16).save(os.path.join(OUT, 'icon-512.png'))
    draw(512, 0.26).save(os.path.join(OUT, 'icon-512-maskable.png'))
    draw(180, 0.16).save(os.path.join(OUT, 'apple-touch-icon.png'))
    draw(32, 0.10).save(os.path.join(OUT, 'favicon-32.png'))
    print('icons written to', OUT)


if __name__ == '__main__':
    main()
