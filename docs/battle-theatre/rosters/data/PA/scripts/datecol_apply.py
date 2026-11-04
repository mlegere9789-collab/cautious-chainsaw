"""Match Windows-OCR lines of the date-column strips to roster rows by vertical position and parse the muster date.
Input : tmp/library/rosters/PA/datecol80_ocr.jsonl (winocr.ps1 output), datecol80_manifest.jsonl, derived/<vol>.records.json
Output: data/PA/datecol_second_ocr.json  {"<vol>|<page>|<y>": {"ocr": text, "date": iso or null, "prec": "day"|"month"|null}}
Each strip line is one table line; a row's date line is the line whose vertical centre is within 26 px (djvu coordinates) of the row anchor.
"""
import sys, os, json, re, collections, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pa_common as C
import dates as D

man = {}
for l in open(os.path.join(C.CACHE, 'datecol80_manifest.jsonl'), encoding='utf-8'):
    o = json.loads(l)
    man[o['file']] = o
recs = {}
for vol in ('01', '02', '03', '04', '00'):
    p = os.path.join(C.CACHE, 'derived', vol + '.records.json')
    if os.path.exists(p):
        by = collections.defaultdict(list)
        for r in json.load(open(p)):
            by[r['page']].append(r)
        recs[vol] = by
out = {}
nlines = nmatch = 0
ocr_path = os.path.join(C.CACHE, 'datecol80_ocr.jsonl')
for l in open(ocr_path, encoding='utf-8-sig'):
    l = l.strip()
    if not l:
        continue
    o = json.loads(l)
    if 'error' in o:
        continue
    fn = os.path.basename(o['file'])
    m = man.get(fn)
    if not m:
        continue
    vol, idx = m['vol'], m['idx']
    osc, sc = m['osc'], m['scale']
    rows = recs.get(vol, {}).get(idx, [])
    if not rows:
        continue
    ys = sorted(r['y'] for r in rows)
    grp = collections.defaultdict(list)
    for ln in o['lines']:
        nlines += 1
        yc = ((ln['y'] + ln['h'] * 0.6) / osc + m['y']) / sc
        best = min(ys, key=lambda y: abs(y - yc))
        if abs(best - yc) > 28:
            continue
        grp[best].append((ln['x'], re.sub(r'\s+', ' ', ln['text']).strip()))
    for best, items in grp.items():
        items.sort()
        txt = ' '.join(t for x, t in items)
        key = '%s|%d|%d' % (vol, idx, best)
        ds = D.find_dates(txt[:34])
        full = [x for x in ds if x[0]]
        if full:
            d = full[0]
            out[key] = dict(ocr=txt[:60], date=d[0].isoformat(), prec=d[1])
        else:
            out[key] = dict(ocr=txt[:60], date=None, prec=None)
        nmatch += 1
json.dump(out, open(os.path.join(C.DATA, 'datecol_second_ocr.json'), 'w'), separators=(',', ':'))
print('ocr lines', nlines, 'matched', nmatch, 'with date', sum(1 for v in out.values() if v['date']))
