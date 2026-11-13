#!/usr/bin/env python3
"""Contact sheets of the fetched Library of Congress derivatives for viewing (primary resource of every catalogue record, medium JPEG).
Output: tmp/photomatch/sheets/loc_<nn>.jpg (gitignored scratch). Usage: python3 -I tools/bt/photomatch/sheets.py [per_sheet=12] [cols=4]"""
import json, os, sys, glob
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUT = os.path.join(ROOT, 'tmp', 'photomatch', 'sheets'); os.makedirs(OUT, exist_ok=True)
args = [a for a in sys.argv[1:] if not a.startswith('--')]; per = int(args[0]) if len(args) > 0 else 12; cols = int(args[1]) if len(args) > 1 else 4
cat = json.load(open(os.path.join(HERE, 'catalogue.json')))['photographs']
if '--additions' in sys.argv: cat = json.load(open(os.path.join(HERE, 'catalogue_additions.json')))['photographs']
elif os.path.exists(os.path.join(HERE, 'catalogue_additions.json')): cat = cat + json.load(open(os.path.join(HERE, 'catalogue_additions.json')))['photographs']
led = json.load(open(os.path.join(HERE, 'images_ledger.json')))['images']
prim = {}
for k, v in led.items():
    if v.get('status') == 'ok' and v.get('derivative') == 'medium' and v.get('resource_index') == 0: prim[v['loc_id']] = v
W = 400; cells = []
for c in cat:
    v = prim.get(c['loc_id'])
    if not v or not os.path.exists(os.path.join(ROOT, v['local_file'])): continue
    im = Image.open(os.path.join(ROOT, v['local_file'])).convert('RGB'); h = round(im.height * W / im.width); im = im.resize((W, h))
    cell = Image.new('RGB', (W, 330 + 34), 'white'); im.thumbnail((W, 330)); cell.paste(im, ((W - im.width) // 2, 34))
    d = ImageDraw.Draw(cell); d.text((3, 2), f"{c['loc_id']}{' [S]' if c['staged_flag'] else ''}{'' if c['in_scope_july_1863_terrain'] else ' [out]'} {(c['creator'] or '')[:18]}", fill='black'); d.text((3, 17), c['title'].replace('Gettysburg, Pennsylvania. ', '').replace('[Gettysburg, Pa. ', '[')[:66], fill='black')
    cells.append(cell)
n = 0
for i in range(0, len(cells), per):
    ch = cells[i:i + per]; rows = (len(ch) + cols - 1) // cols; sh = Image.new('RGB', (cols * W, rows * 364), 'white')
    for j, cl in enumerate(ch): sh.paste(cl, ((j % cols) * W, (j // cols) * 364))
    sh.save(os.path.join(OUT, f'{"add" if "--additions" in sys.argv else "loc"}_{n:02d}.jpg'), quality=82); n += 1
print(len(cells), 'records on', n, 'sheets')
