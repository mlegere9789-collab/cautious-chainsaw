"""Second reading of the muster-date column: fetch a narrow IIIF crop (the date column strip) of every roll page that has rows
without a legible muster date. Source: Internet Archive IIIF image service for the same scanned page (public-domain book).
Rate: pa_common.fetch (1.6-2.6 s between requests, cached). Output: tmp/library/rosters/PA/datecol/<vol>_<idx>.jpg and datecol_manifest.jsonl
usage: datecol_fetch.py [max_pages]"""
import sys, os, json, csv, glob, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pa_common as C

maxp = int(sys.argv[1]) if len(sys.argv) > 1 else 10 ** 9
IDENT = {'01': 'historyofpennsyl01bate', '02': 'historyofpennsyl02bate', '03': 'historyofpennsyl03bate', '04': 'historyofpennsyl04bate', '00': 'historyofpennsyl00bate'}
need = collections.defaultdict(collections.Counter)
weight = collections.Counter()
for f in glob.glob(os.path.join(C.DATA, 'units', '*.csv')):
    rows = list(csv.DictReader(open(f, encoding='utf-8')))
    pd = sum(1 for r in rows if r['presence_label'] == 'Present-Documented')
    for r in rows:
        if not r['muster_date']:
            vol = r['source_id'][-2:]
            need[vol][int(r['source_page_idx_ia'])] += 1
            weight[(vol, int(r['source_page_idx_ia']))] = max(weight[(vol, int(r['source_page_idx_ia']))], pd)
todo = [(vol, p) for vol, c in need.items() for p, n in c.items() if n >= 2]
todo.sort(key=lambda t: (-weight[t], t))
out_dir = os.path.join(C.CACHE, 'datecol80')
os.makedirs(out_dir, exist_ok=True)
man_path = os.path.join(C.CACHE, 'datecol80_manifest.jsonl')
done = set()
if os.path.exists(man_path):
    for l in open(man_path, encoding='utf-8'):
        o = json.loads(l)
        done.add((o['vol'], o['idx']))
manifests = {}
pinfo = {}
sizes = {}
n_done = 0
for vol, idx in todo:
    if (vol, idx) in done:
        continue
    if n_done >= maxp:
        break
    if vol not in manifests:
        mp = C.fetch('https://iiif.archive.org/iiif/%s/manifest.json' % IDENT[vol], 'meta/iiif_manifest_%s.json' % vol)
        if not mp:
            print('manifest failed', vol)
            continue
        manifests[vol] = json.load(open(mp, encoding='utf-8'))['items']
        pinfo[vol] = json.load(open(os.path.join(C.CACHE, 'derived', vol + '.pageinfo.json')))
        sizes[vol] = json.load(open(os.path.join(C.CACHE, 'derived', vol + '.pages.json')))['sizes']
    n = idx - 1
    items = manifests[vol]
    try:
        iiif = int(items[n]['label']['none'][0])
    except Exception:
        print('no label', vol, idx)
        continue
    cw, ch = items[iiif]['width'], items[iiif]['height']
    dw, dh = (sizes[vol].get(str(idx)) or [cw, ch])[0], (sizes[vol].get(str(idx)) or [cw, ch])[1] or ch
    dx = pinfo[vol][str(idx)].get('dx')
    if not dx:
        continue
    sc = cw / float(dw)
    x = max(0, int((dx - 95) * sc))
    y = int(300 * sc)
    w = min(int(560 * sc), cw - x)
    h = min(int((ch / sc - 360) * sc), ch - y)
    url = 'https://iiif.archive.org/iiif/%s$%d/%d,%d,%d,%d/pct:80/0/default.jpg' % (IDENT[vol], iiif, x, y, w, h)
    fn = '%s_%d.jpg' % (vol, idx)
    p = C.fetch(url, 'datecol80/' + fn)
    if not p:
        print('FAILED', vol, idx)
        continue
    with open(man_path, 'a', encoding='utf-8') as f:
        f.write(json.dumps(dict(vol=vol, idx=idx, iiif=iiif, x=x, y=y, w=w, h=h, scale=sc, osc=0.8, file=fn)) + '\n')
    n_done += 1
    if n_done % 50 == 0:
        C.progress('datecol strips fetched: %d (%s)' % (n_done, vol))
        print(n_done, flush=True)
print('done', n_done, 'of', len(todo))
