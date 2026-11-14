"""Crop the lines of a scan page around a phrase, to read OCR-damaged digits on the page image.
    python3 -I tmp/tl-03/audit/snip.py "p:leaf|phrase words|label" ["p:leaf|phrase|label" ...]  [--dpi 200] [--lines 3]
PDF page = leaf + 1 of tmp/kit-plan/or27-pdf/<identifier>.pdf.  The page is rendered, tesseract (tsv) locates the phrase (fuzzy match on 3-word windows)
and the band of lines around it is cropped.  All snippets of one call are stacked into tmp/tl-03/img/snip_<n>.png (label bar above each).  Page tsv cached in tmp/tl-03/scan/tsv."""
import os, sys, re, csv, io, subprocess, difflib, json
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
PDF = {1: 'cu31924077699761', 2: 'cu31924077728255', 3: 'cu31924077700262'}
TSV = os.path.join(ROOT, 'tmp', 'tl-03', 'scan', 'tsv'); os.makedirs(TSV, exist_ok=True)
IMG = os.path.join(ROOT, 'tmp', 'tl-03', 'img'); os.makedirs(IMG, exist_ok=True)
args = sys.argv[1:]; DPI = 200; LINES = 3
for fl in ('--dpi', '--lines'):
    if fl in args:
        i = args.index(fl); v = int(args[i + 1]); del args[i:i + 2]
        if fl == '--dpi': DPI = v
        else: LINES = v
def page_png(part, leaf):
    base = os.path.join(TSV, 'p%d_l%d_%d' % (part, leaf, DPI))
    if not os.path.exists(base + '.png'):
        subprocess.run(['pdftoppm', '-f', str(leaf + 1), '-l', str(leaf + 1), '-r', str(DPI), '-gray', '-png', '-singlefile', os.path.join(ROOT, 'tmp', 'kit-plan', 'or27-pdf', PDF[part] + '.pdf'), base], check=True)
    return base + '.png'
def page_tsv(part, leaf):
    p = os.path.join(TSV, 'p%d_l%d_%d.tsv' % (part, leaf, DPI))
    if not os.path.exists(p):
        env = dict(os.environ, OMP_THREAD_LIMIT='1')
        out = subprocess.run(['tesseract', page_png(part, leaf), 'stdout', '-l', 'eng', '--psm', '3', 'tsv'], capture_output=True, text=True, env=env).stdout
        open(p, 'w', encoding='utf-8').write(out)
    rows = list(csv.DictReader(io.StringIO(open(p, encoding='utf-8').read()), delimiter='\t', quoting=csv.QUOTE_NONE))
    return [r for r in rows if r.get('text') and r['text'].strip() and r['level'] == '5']
def norm(w): return re.sub(r'[^a-z0-9]', '', w.lower())
def locate(words, phrase):
    ph = [norm(w) for w in phrase.split() if norm(w)]
    n = min(3, len(ph)); best = (0, None)
    nw = [norm(r['text']) for r in words]
    for i in range(0, len(words) - n + 1):
        for j in range(0, len(ph) - n + 1):
            sc = sum(difflib.SequenceMatcher(None, nw[i + k], ph[j + k]).ratio() for k in range(n)) / n
            if sc > best[0]: best = (sc, i)
    return best
snips = []
for spec in args:
    k, phrase, label = (spec.split('|') + [''])[:3]
    part, leaf = (int(x) for x in k.split(':'))
    words = page_tsv(part, leaf)
    sc, i = locate(words, phrase)
    im = Image.open(page_png(part, leaf)); W, H = im.size
    if i is None or sc < 0.6:
        print('NOT LOCATED', spec, 'best', sc); continue
    w0 = words[i]
    line_key = (w0['block_num'], w0['par_num'], w0['line_num'])
    # y extents of lines: use words' tops; collect distinct line tops
    tops = sorted(set((int(r['top']), r['block_num'], r['par_num'], r['line_num']) for r in words))
    ty = int(w0['top']); lh = max(int(w0['height']), 20)
    y0 = max(0, ty - int(lh * (LINES + 0.6))); y1 = min(H, ty + int(lh * (LINES + 1.8)))
    snips.append((('%s %s' % (k, label or phrase[:30])), im.crop((0, y0, W, y1)), sc))
    print('located', k, 'score %.2f' % sc, 'at y=%d' % ty, '| OCR window:', ' '.join(r['text'] for r in words[max(0, i - 2):i + 12]))
if snips:
    n = len([f for f in os.listdir(IMG) if f.startswith('snip_')])
    width = max(s[1].size[0] for s in snips); total = sum(s[1].size[1] + 22 for s in snips)
    mont = Image.new('L', (width, total), 255); d = ImageDraw.Draw(mont); y = 0
    for lab, cr, sc in snips:
        d.rectangle([0, y, width, y + 20], fill=190); d.text((6, y + 4), lab, fill=0); y += 22
        mont.paste(cr, (0, y)); y += cr.size[1]
    out = os.path.join(IMG, 'snip_%d.png' % n); mont.save(out); print('wrote', out, mont.size)
