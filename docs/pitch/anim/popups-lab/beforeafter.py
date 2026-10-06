from PIL import Image, ImageDraw, ImageFont
import os
S = 'docs/pitch/anim/shots/popups/'
pairs = [
    ('d02-cards-tick28.png', 'd50-proto-tick28-z13.5.png', 'before-after-tick28.png', 'Tick 28, Reynolds killed: the app today (left) and the Overlay Director prototype (right)'),
    ('d03-cards-tick553.png', 'd51-proto-tick553-z13.5.png', 'before-after-tick553.png', 'Tick 553, Cushing at the Angle: the app today (left) and the prototype (right)'),
]
try:
    font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 22)
    small = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 18)
except Exception:
    font = small = ImageFont.load_default()
for a, b, out, cap in pairs:
    A = Image.open(S + a).convert('RGB'); B = Image.open(S + b).convert('RGB')
    w, h = A.size
    sc = 0.75
    A = A.resize((int(w * sc), int(h * sc)), Image.LANCZOS); B = B.resize((int(w * sc), int(h * sc)), Image.LANCZOS)
    W = A.width + B.width + 30; H = A.height + 70
    im = Image.new('RGB', (W, H), (10, 10, 20))
    d = ImageDraw.Draw(im)
    d.text((10, 8), cap, fill=(232, 213, 163), font=font)
    d.text((10, 40), 'today (R1c)', fill=(200, 160, 80), font=small)
    d.text((A.width + 30, 40), 'prototype: captions with leader lines, never on a tile', fill=(200, 160, 80), font=small)
    im.paste(A, (0, 66)); im.paste(B, (A.width + 30, 66))
    im.save(S + out, optimize=True)
    print(out, im.size, os.path.getsize(S + out) // 1024, 'KB')
