"""tools/strips-compose.py - joins the frames of tools/strips.mjs into shots/M1..M3 strips (Pillow).  python tools/strips-compose.py
Labels are annotations of the picture, set in Segoe UI (a system font, only for the captions of this sheet)."""
import os, json, sys
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..'))
WORK = os.path.abspath(os.path.join(ROOT, '..', '..', '..', '..', 'tmp', 'look-dev', 'd3-field-manual', 'strips')); OUT = os.path.join(ROOT, 'shots')
mot = json.load(open(os.path.join(ROOT, 'results', 'motion.json')))
def font(sz):
    for f in ('C:/Windows/Fonts/segoeui.ttf', 'C:/Windows/Fonts/arial.ttf'):
        if os.path.exists(f): return ImageFont.truetype(f, sz)
    return ImageFont.load_default()
def sheet(name, title, sub, labels, cols=4, scale=1.0):
    d = os.path.join(WORK, name); files = sorted(f for f in os.listdir(d) if f.endswith('.png')); ims = [Image.open(os.path.join(d, f)).convert('RGB') for f in files]
    w, h = ims[0].size; w = int(w * scale); h = int(h * scale); ims = [i.resize((w, h), Image.LANCZOS) if scale != 1 else i for i in ims]
    rows = (len(ims) + cols - 1) // cols; pad = 14; head = 78; lab = 34
    W = cols * w + (cols + 1) * pad; H = head + rows * (h + lab) + (rows + 1) * pad
    sh = Image.new('RGB', (W, H), (10, 15, 20)); dr = ImageDraw.Draw(sh)
    dr.text((pad, 14), title, fill=(244, 246, 248), font=font(26)); dr.text((pad, 48), sub, fill=(170, 181, 193), font=font(20))
    for i, im in enumerate(ims):
        r, c = divmod(i, cols); x = pad + c * (w + pad); y = head + pad + r * (h + lab + pad)
        sh.paste(im, (x, y)); dr.rectangle((x - 1, y - 1, x + w, y + h), outline=(60, 72, 86)); dr.text((x, y + h + 6), labels[i], fill=(242, 177, 52), font=font(20))
    p = os.path.join(OUT, name + '.png'); sh.save(p); print('wrote', p, sh.size)
m1 = [f'frame {i + 1}   +{int(round((i * 2 + 1) * 16.667))} ms' for i in range(8)]
sheet('M1-deployment', 'M1  Deployment: seven regiments take the field (tick 47 to 48)', 'Eight frames, one every 33 ms. The frame arrives first, then the ink of the cell, then the type; the mark settles from 88 % of its size. Real page, DPR 2.', m1, cols=2, scale=0.9)
s2 = mot['M2']['series']; m2 = [f'frame {i + 1}   +{int(round(i * 16.667))} ms   ' + (f"step {s2[i].get('step', 0):.1f} px" if s2[i] and 'step' in s2[i] else 'first frame') for i in range(8)]
sheet('M2-march', 'M2  March: the 53rd Virginia charges toward The Angle, between its keyframes of tick 542 and 551 (frames from tick 545), 16x', 'Eight consecutive frames, 16.7 ms apart, in a fixed window: the step per frame is the easing. Real page, DPR 2.', m2, cols=4, scale=1.0)
m3 = [f"frame {i + 1}   +{i * 50} ms   width {w['w']:.0f} px" for i, w in enumerate(mot['M3']['series'])]
sheet('M3-grow', 'M3  The mark grows to the unit\'s full name when it is selected (the same object, wider)', 'Eight frames, one every 50 ms; the footprint was reserved by the layout first, so the neighbours make room before the plate arrives. Real page, DPR 2.', m3, cols=2, scale=1.0)
