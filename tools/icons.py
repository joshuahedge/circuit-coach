"""Draws the app icons with Pillow: a dark tile, an orange rising line (strength) and a blue dot (running).

Usage: python tools/icons.py   (writes into icons/)
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'icons')
BG = (18, 22, 28)
ORANGE = (255, 138, 76)
BLUE = (90, 169, 255)
SS = 4  # supersampling for smooth edges


def draw(size, inset):
    s = size * SS
    img = Image.new('RGB', (s, s), BG)
    d = ImageDraw.Draw(img)
    pad = s * inset
    span = s - 2 * pad
    # Rising line: three segments, round joints.
    pts = [(pad + span * 0.04, pad + span * 0.78), (pad + span * 0.36, pad + span * 0.48),
           (pad + span * 0.58, pad + span * 0.64), (pad + span * 0.92, pad + span * 0.24)]
    w = int(span * 0.12)
    d.line(pts, fill=ORANGE, width=w, joint='curve')
    for x, y in (pts[0], pts[-1]):
        d.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=ORANGE)
    r = span * 0.11
    cx, cy = pad + span * 0.78, pad + span * 0.80
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=BLUE)
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
