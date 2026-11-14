"""Header-strip montages of OR scan leaves, to read the printed page numbers on the page images.
    python3 -I tmp/tl-03/audit/montage.py all            every OR leaf cited in timeline_corrections/tl-03.jsonl not yet in viewed_leaves.json
    python3 -I tmp/tl-03/audit/montage.py 1:937 2:589    given leaves (part:leaf; PDF page = leaf + 1)
Writes tmp/tl-03/img/mont_<k>.png (10 strips each, a label bar above every strip) and tmp/tl-03/img/mont_manifest.json."""
import os, sys, json, subprocess
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
import kit_or27_leafmap as KL
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
PDF = {1: 'cu31924077699761', 2: 'cu31924077728255', 3: 'cu31924077700262'}
IMG = os.path.join(ROOT, 'tmp', 'tl-03', 'img'); os.makedirs(IMG, exist_ok=True)
VL = os.path.join(G, 'horde', 'tl-03', 'closeout', 'audit', 'viewed_leaves.json')
done = json.load(open(VL))['leaves'] if os.path.exists(VL) else {}
args = sys.argv[1:]
if args and args[0] == 'all':
    lms = {p: KL.load(p) for p in (1, 2, 3)}
    need = []
    for l in open(os.path.join(G, 'timeline_corrections', 'tl-03.jsonl'), encoding='utf-8'):
        r = json.loads(l)
        for c in r['citations']:
            if c['source_id'] != 'OR27': continue
            lm = lms[c['part']]
            for off in (c['text_offset'], c['text_offset_end'] - 1):
                k = '%d:%d' % (c['part'], lm.at(off)['leaf'])
                if k not in done and k not in need: need.append(k)
    leaves = sorted(need, key=lambda k: tuple(int(x) for x in k.split(':')))
else:
    leaves = args
strips = []
for k in leaves:
    part, leaf = (int(x) for x in k.split(':'))
    base = os.path.join(IMG, 'h_%d_%d' % (part, leaf))
    subprocess.run(['pdftoppm', '-f', str(leaf + 1), '-l', str(leaf + 1), '-r', '130', '-x', '0', '-y', '0', '-W', '760', '-H', '150', '-gray', '-png', '-singlefile', os.path.join(ROOT, 'tmp', 'kit-plan', 'or27-pdf', PDF[part] + '.pdf'), base], check=True)
    strips.append((k, base + '.png'))
man = []
for i in range(0, len(strips), 6):
    chunk = strips[i:i + 6]
    im = Image.new('L', (760, 178 * len(chunk)), 255)
    d = ImageDraw.Draw(im)
    for j, (k, p) in enumerate(chunk):
        d.rectangle([0, j * 178, 760, j * 178 + 24], fill=200)
        d.text((6, j * 178 + 6), 'leaf %s' % k, fill=0)
        im.paste(Image.open(p), (0, j * 178 + 26))
        os.remove(p)
    out = os.path.join(IMG, 'mont_%d.png' % (i // 6))
    im.save(out)
    man.append({'file': out, 'leaves': [k for k, _ in chunk]})
json.dump(man, open(os.path.join(IMG, 'mont_manifest.json'), 'w'), indent=1)
print(len(leaves), 'leaves in', len(man), 'montages')
for m in man: print(m['file'], m['leaves'])
