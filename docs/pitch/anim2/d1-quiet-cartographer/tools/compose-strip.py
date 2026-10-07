"""compose-strip.py - lays the eight frames of a motion strip out as a contact sheet (2 rows of 4) with a caption and the frame time, for shots/strip-<name>.png.
  python tools/compose-strip.py <frames dir> <out dir> [march|deploy]
Fonts: the QC Sans cut that ships with the page is not needed here; the label font is Liberation Sans from C:/Windows/Fonts (SIL OFL)."""
import sys, json, os
from PIL import Image, ImageDraw, ImageFont

fr, out = sys.argv[1], sys.argv[2]
names = [sys.argv[3]] if len(sys.argv) > 3 else ['march', 'select', 'deploy']
FONT = 'C:/Windows/Fonts/LiberationSans-Regular.ttf'; BOLD = 'C:/Windows/Fonts/LiberationSans-Bold.ttf'
for name in names:
    meta_p = os.path.join(fr, name + '.json')
    if not os.path.exists(meta_p): continue
    meta = json.load(open(meta_p)); frames = [Image.open(os.path.join(fr, f'{name}-{i}.png')).convert('RGB') for i in range(8)]
    w, h = frames[0].size; pad = 24; cap = 96; lab = 54; cols, rows = 4, 2
    W = cols * w + (cols + 1) * pad; H = cap + rows * (h + lab) + (rows + 1) * pad - 12
    sheet = Image.new('RGB', (W, H), (11, 15, 21)); d = ImageDraw.Draw(sheet)
    f_t = ImageFont.truetype(BOLD, 34); f_s = ImageFont.truetype(FONT, 26)
    d.text((pad, 22), meta['title'], font=f_t, fill=(238, 243, 248))
    d.text((pad, 62), 'Eight consecutive engine frames, each a 100 % crop of a real screenshot at device pixel ratio 2.  Tau is the engine clock in ticks.', font=f_s, fill=(170, 182, 196))
    for i, im in enumerate(frames):
        r, c = divmod(i, cols); x = pad + c * (w + pad); y = cap + pad + r * (h + lab + pad)
        sheet.paste(im, (x, y + lab)); d.rectangle([x - 1, y + lab - 1, x + w, y + lab + h], outline=(60, 72, 86), width=2)
        t = meta['frames'][i]
        d.text((x, y + 8), f'frame {i + 1}   +{i * meta["dt"]} ms   tau {t["tau"]:.2f}' + (f'   entering {t["entering"]}' if t.get('entering') else ''), font=f_s, fill=(232, 238, 244))
    p = os.path.join(out, f'strip-{name}.png'); sheet.save(p, optimize=True); print('wrote', p, sheet.size)
