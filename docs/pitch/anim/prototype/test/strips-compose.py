"""strips-compose.py - puts the frame crops captured by test/strips.mjs together: one strip per renderer (eight consecutive frames in a row, the tracked tile ringed, the ghost of its previous
position, the measured step in px since the frame before) and one comparison image per place (before above after).  Every number printed on the images is read from strips.json, which the
capture script wrote from the page's own frames.
    python docs/pitch/anim/prototype/test/strips-compose.py
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '..'))
META = os.path.join(REPO, 'tmp', 'pitch-anim', 'assemble', 'strips', 'strips.json')
OUT = os.path.join(REPO, 'docs', 'pitch', 'anim', 'shots', 'prototype', 'strips')
os.makedirs(OUT, exist_ok=True)

def font(size, bold=False):
    for p in (r'C:\Windows\Fonts\segoeuib.ttf' if bold else r'C:\Windows\Fonts\segoeui.ttf', r'C:\Windows\Fonts\arialbd.ttf' if bold else r'C:\Windows\Fonts\arial.ttf'):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

meta = json.load(open(META, encoding='utf8'))
DPR = meta['dpr']; CW = meta['crop']['w'] * DPR; CH = meta['crop']['h'] * DPR
S = DPR / 2.0                                       # layout scale: the design is laid out for DPR 2
BG = (14, 17, 21); INK = (238, 241, 245); MUTED = (163, 173, 185); ACC = (242, 183, 0); WARN = (224, 154, 26); OK = (58, 166, 117); LINE = (42, 50, 60)
GAP = int(8 * S); PAD = int(28 * S); HEAD = int(92 * S); FOOT = int(54 * S)

def strip(rec, mode):
    frames = rec['modes'][mode]; n = len(frames)
    W = PAD * 2 + n * CW + (n - 1) * GAP; H = HEAD + CH + FOOT
    img = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(img)
    f1, f2, f3, f4 = font(int(26 * S), True), font(int(16 * S)), font(int(13 * S)), font(int(15 * S), True)
    before = mode == 'before'
    col = WARN if before else OK
    title = 'BEFORE  ·  production-style stepping, reproduced' if before else 'AFTER  ·  Battle Studio'
    d.rounded_rectangle([PAD, int(22 * S), PAD + int(14 * S), int(22 * S) + int(14 * S)], radius=int(7 * S), fill=col)
    d.text((PAD + int(26 * S), int(14 * S)), title, font=f1, fill=INK)
    sub = f"{rec['label']}  ·  unit {rec['unit']}  ·  ticks {frames[0]['tau']:.2f} to {frames[-1]['tau']:.2f}  ·  {meta['speedx']}x at 60 fps, eight consecutive frames  ·  zoom {rec['zoom']}"
    d.text((PAD + int(26 * S), int(54 * S)), sub, font=f2, fill=MUTED)
    prev = None
    for k, fr in enumerate(frames):
        x = PAD + k * (CW + GAP); y = HEAD
        im = Image.open(os.path.join(REPO, fr['file'])).convert('RGB')
        if im.size != (CW, CH):
            im = im.resize((CW, CH))
        img.paste(im, (x, y)); d.rectangle([x - 1, y - 1, x + CW, y + CH], outline=LINE, width=1)
        cx = (fr['x'] - rec['crop']['x']) * DPR if fr['x'] is not None else None; cy = (fr['y'] - rec['crop']['y']) * DPR if fr['y'] is not None else None
        # ghost of the previous frame's position and the step line
        if prev is not None and prev[0] is not None and cx is not None:
            px, py = prev
            gx, gy = x + px, y + py
            d.ellipse([gx - 9 * S, gy - 9 * S, gx + 9 * S, gy + 9 * S], outline=(255, 255, 255), width=max(1, int(1.5 * S)))
            d.line([gx, gy, x + cx, y + cy], fill=(255, 255, 255), width=max(1, int(1 * S)))
        if cx is not None:
            r = 12 * S; d.ellipse([x + cx - r, y + cy - r, x + cx + r, y + cy + r], outline=ACC, width=max(2, int(2.5 * S)))
        # captions
        step = None
        if prev is not None and fr['x'] is not None and frames[k - 1]['x'] is not None:
            step = ((fr['x'] - frames[k - 1]['x']) ** 2 + (fr['y'] - frames[k - 1]['y']) ** 2) ** 0.5
        label = f"frame {k + 1}"
        d.text((x, y + CH + int(8 * S)), label, font=f4, fill=INK)
        stxt = 'step: first frame' if step is None else f"step {step:.1f} px"
        d.text((x, y + CH + int(28 * S)), stxt, font=f3, fill=(col if (step is not None and step >= 20) else MUTED))
        d.text((x + CW - int(92 * S), y + CH + int(8 * S)), f"tick {fr['tau']:.2f}", font=f3, fill=MUTED)
        prev = (cx, cy) if cx is not None else None
    return img

def compare(rec, b, a):
    W = max(b.width, a.width); H = b.height + a.height + int(6 * S)
    img = Image.new('RGB', (W, H + int(46 * S)), BG); d = ImageDraw.Draw(img)
    img.paste(b, (0, 0)); img.paste(a, (0, b.height + int(6 * S)))
    f = font(int(13 * S))
    steps = lambda m: [((rec['modes'][m][k]['x'] - rec['modes'][m][k - 1]['x']) ** 2 + (rec['modes'][m][k]['y'] - rec['modes'][m][k - 1]['y']) ** 2) ** 0.5 for k in range(1, 8)]
    sb, sa = steps('before'), steps('after')
    d.text((PAD, H + int(8 * S)), f"Largest step between two frames of this tile: before {max(sb):.1f} px, after {max(sa):.1f} px.  Same ticks, same camera, same canvas; the ring marks the tile, the white ring its position one frame earlier.  Positions are Modelled in both.", font=f, fill=MUTED)
    return img, max(sb), max(sa)

summary = []
for rec in meta['strips']:
    b = strip(rec, 'before'); a = strip(rec, 'after')
    b.save(os.path.join(OUT, f"strip-{rec['hotspot']}-before.png"), optimize=True); a.save(os.path.join(OUT, f"strip-{rec['hotspot']}-after.png"), optimize=True)
    c, mb, ma = compare(rec, b, a); c.save(os.path.join(OUT, f"strip-{rec['hotspot']}-compare.png"), optimize=True)
    summary.append({'hotspot': rec['hotspot'], 'unit': rec['unit'], 'largestStepBeforePx': round(mb, 1), 'largestStepAfterPx': round(ma, 1), 'tau': [rec['modes']['before'][0]['tau'], rec['modes']['before'][-1]['tau']]})
    print(rec['hotspot'], rec['unit'], 'before max step', round(mb, 1), 'after max step', round(ma, 1))
meta['summary'] = summary
json.dump(meta, open(os.path.join(OUT, 'strips.json'), 'w', encoding='utf8'), indent=1)
print('wrote', OUT)
