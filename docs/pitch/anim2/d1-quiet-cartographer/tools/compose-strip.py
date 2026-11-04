"""compose-strip.py (round 2) - lays the eight pictures of a motion strip out on a LIGHT page in the product's own type (QC Sans) and colours: two columns of four, every picture at 200 percent (a DPR 2 screenshot shown at
its own pixels), one fixed camera, a caption of what to look at, and under each picture its time and the engine clock.  The measured jitter of the strip (results/strip-<name>.json) is printed in the footer.
  python tools/compose-strip.py <frames dir> <out dir> [march|select|deploy]"""
import sys, json, os
from PIL import Image, ImageDraw, ImageFont

fr, out = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__)); D1 = os.path.dirname(HERE)
names = [sys.argv[3]] if len(sys.argv) > 3 else ['march', 'select', 'deploy']
F = os.path.join(D1, 'assets', 'fonts')
PAPER = (251, 251, 249); INK = (20, 28, 37); MUTE = (70, 82, 95); EDGE = (205, 209, 205)
LOOK = {
    'march': 'Look at: the pip leaves its place a little at first and then steadily (the clock eases up to 1x), the code travels beside it, and nothing else on the map moves.',
    'select': 'Look at: the ring closes round the pip, the code is replaced by the name growing from the same place, and the pip, its neighbours and the crowds around it stay exactly where they were.',
    'deploy': 'Look at: nine marks appear where nothing stood; each starts at 86 percent of its size and fades in, then its lettering follows it. Nothing moves once it has arrived.',
}
for name in names:
    meta_p = os.path.join(fr, name + '.json')
    if not os.path.exists(meta_p):
        continue
    meta = json.load(open(meta_p)); frames = [Image.open(os.path.join(fr, f'{name}-{i}.png')).convert('RGB') for i in range(8)]
    jit_p = os.path.join(D1, 'results', f'strip-{name}.json'); jit = json.load(open(jit_p)) if os.path.exists(jit_p) else None
    w, h = frames[0].size; pad = 36; lab = 64; cols, rows = 2, 4; foot = 120
    W = cols * w + (cols + 1) * pad
    f_t = ImageFont.truetype(os.path.join(F, 'QCSans-Bold.woff'), 46); f_s = ImageFont.truetype(os.path.join(F, 'QCSans-Regular.woff'), 32); f_l = ImageFont.truetype(os.path.join(F, 'QCSans-SemiBold.woff'), 32)
    def wrap(txt, font, maxw):
        out, line = [], ''
        for word in txt.split(' '):
            t = (line + ' ' + word).strip()
            if font.getlength(t) > maxw and line: out.append(line); line = word
            else: line = t
        if line: out.append(line)
        return out
    tl = wrap(meta['title'], f_t, W - 2 * pad); sub = wrap(LOOK.get(name, '') + ' Eight pictures from one fixed camera, at 200 percent (device pixel ratio 2, shown at its own pixels); the engine ran at 60 frames per second between them.', f_s, W - 2 * pad)
    head = 30 + len(tl) * 58 + 12 + len(sub) * 42 + 20
    H = head + rows * (h + lab) + (rows + 1) * pad + foot
    sheet = Image.new('RGB', (W, H), PAPER); d = ImageDraw.Draw(sheet)
    y0 = 30
    for ln in tl: d.text((pad, y0), ln, font=f_t, fill=INK); y0 += 58
    y0 += 12
    for ln in sub: d.text((pad, y0), ln, font=f_s, fill=MUTE); y0 += 42
    for i, im in enumerate(frames):
        r, c = divmod(i, cols); x = pad + c * (w + pad); y = head + pad + r * (h + lab + pad)
        t = meta['frames'][i]
        d.text((x, y + 8), f'{i + 1}', font=f_l, fill=INK); d.text((x + 36, y + 8), f'+{int(round(i * meta["dt"]))} ms', font=f_l, fill=INK); d.text((x + 200, y + 8), f'engine clock {t["tau"]:.2f}', font=f_s, fill=MUTE)
        sheet.paste(im, (x, y + lab)); d.rectangle([x - 1, y + lab - 1, x + w, y + lab + h], outline=EDGE, width=2)
    if jit:
        txt = f'Measured over all {jit["engineFrames"]} engine frames of this strip ({jit["marksFollowed"]} marks followed): {jit["steps"]} steps of more than 6 px in one frame, {jit["reversals"]} reversals of a mark\'s drift, largest step {jit["worstStepPx"]} px.'
        yy = H - foot + 24
        for ln in wrap(txt, f_s, W - 2 * pad): d.text((pad, yy), ln, font=f_s, fill=MUTE); yy += 42
    p = os.path.join(out, f'strip-{name}.png'); sheet.save(p, optimize=True); print('wrote', p, sheet.size)
