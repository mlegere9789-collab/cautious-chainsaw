"""tools/strip-compose.py - composes the crops of tools/strip.mjs into shots/motion-strip.png: two rows of eight frames (a march, an arrival), each frame labelled with its number, its time and the measured step.
   python tools/strip-compose.py <crops dir> <out png>"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

src = sys.argv[1]; out = sys.argv[2]
meta = json.load(open(os.path.join(src, 'meta.json')))
def font(size, bold=False):
    for p in ['C:/Windows/Fonts/bahnschrift.ttf', 'C:/Windows/Fonts/segoeuib.ttf' if bold else 'C:/Windows/Fonts/segoeui.ttf']:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            pass
    return ImageFont.load_default()
F = font(22); FB = font(26, True); FS = font(20)
frames = {'march': [], 'arrival': []}
for kind in ('march', 'arrival'):
    for i in range(8):
        p = os.path.join(src, f'{kind}-{i}.png')
        if os.path.exists(p): frames[kind].append(Image.open(p).convert('RGB'))
w, h = frames['march'][0].size
gap = 10; pad = 28; lab = 56; head = 92
W = pad * 2 + 4 * w + 3 * gap
rows = [('march', 'A march: eight consecutive frames, 16.7 ms apart, the battle at 2x'), ('arrival', 'An arrival: eight frames, 40 ms apart, the mark drops onto the ground and unfurls from the hoist')]
H = head + len(rows) * (2 * (h + lab) + 30) + 30
img = Image.new('RGB', (W, H), (11, 14, 18)); d = ImageDraw.Draw(img)
d.text((pad, 20), 'Motion: easing and arrival', font=FB, fill=(246, 231, 189)); d.text((pad, 54), 'Real page, DPR 2, crops of 330 x 124 px around the mark; the camera is still, so every change is the mark\'s own.', font=FS, fill=(186, 181, 163))
y = head
for kind, title in rows:
    d.text((pad, y), title, font=F, fill=(233, 201, 123)); y += 34
    for i, im in enumerate(frames[kind]):
        r, c = divmod(i, 4); x = pad + c * (w + gap); yy = y + r * (h + lab)
        img.paste(im, (x, yy))
        m = meta[kind]['frames'][i] if i < len(meta[kind]['frames']) else {}
        if kind == 'march': t = f"frame {i + 1}   step {m.get('step', 0):.2f} px"
        else: t = f"frame {i + 1}   {m.get('ms', 0)} ms   opacity {m.get('opacity', 0):.2f}"
        d.text((x + 4, yy + h + 8), t, font=FS, fill=(243, 236, 218))
    y += 2 * (h + lab) + 24
img.save(out); print('wrote', out, img.size)
