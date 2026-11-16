"""Round-3 search corpus for the terrain-1 close-out (read-only on every source text; writes only under tmp/terrain-1/r3).
Collects the local texts that bear on the Battle Theatre gun-position rows (Official Records vol. 27, the 99-text library,
every National Park Service text, the 1863 newspaper OCR, regimental and campaign histories that other workstreams fetched),
normalises them for searching (hyphenated line breaks joined, whitespace collapsed) and writes corpus.pkl + corpus_index.json.
Citations are NOT taken from this normalised copy: build.py re-resolves every quote in the raw file.
Run: python3 -I make_corpus.py"""
import os, re, json, hashlib, pickle, glob, sys
ROOT = '/home/user/cautious-chainsaw'
OUT = os.path.join(ROOT, 'tmp/terrain-1/r3')
HY = re.compile(r'-\s*\n\s*(?=[a-z])')
WS = re.compile(r'\s+')

def norm(raw):
    return WS.sub(' ', HY.sub('', raw))

entries = []   # (id, relpath, group)
def add(i, p, g):
    entries.append((i, os.path.relpath(p, ROOT), g))

# A. Official Records (Cornell scans used by tools/bt/or27_find.py)
for n, f in ((1, 'cu31924077699761'), (2, 'cu31924077728255'), (3, 'cu31924077700262')):
    add('OR27-%d' % n, os.path.join(ROOT, 'tmp/library/or27', f + '_djvu.txt'), 'or27')
# B. the library of 99 texts
for d, g in (('tmp/library/ws9', 'ws9'), ('tmp/library/ws9/prior', 'ws9')):
    for f in sorted(glob.glob(os.path.join(ROOT, d, '*_djvu.txt'))):
        b = os.path.basename(f).split('__')[0]
        if b.startswith(('ADAMS-SENTINEL-1863-0', 'ADAMS-SENTINEL-1863-1', 'GBG-COMPILER-1863-0', 'GBG-COMPILER-1863-1')) or not b.startswith(('ADAMS-SENTINEL', 'GBG-COMPILER')):
            add(b, f, g)
# C. National Park Service texts (base text of each document, not the layout/raw variants)
npsd = os.path.join(ROOT, 'tmp/library/web/nps')
for d in sorted(os.listdir(npsd)):
    p = os.path.join(npsd, d, d + '.txt')
    if os.path.exists(p): add('NPS:' + d, p, 'nps')
for f in sorted(glob.glob(os.path.join(npsd, 'pages', '*.txt'))):
    add('NPSPAGE:' + os.path.basename(f)[:-4], f, 'nps')
for f in sorted(glob.glob(os.path.join(ROOT, 'tmp/terrain-1/nps', '*.txt'))):
    add('NPSGOV:' + os.path.basename(f)[:-4], f, 'nps')
for f in sorted(glob.glob(os.path.join(ROOT, 'tmp/library/web/photomatch', '**', '*.txt'), recursive=True)):
    add('PHOTOMATCH:' + os.path.relpath(f, os.path.join(ROOT, 'tmp/library/web/photomatch')), f, 'nps')
# D. Chronicling America OCR (1863 newspapers)
for f in sorted(glob.glob(os.path.join(ROOT, 'tmp/library/web/ca/pages', '**', '*.txt'), recursive=True)):
    add('CA:' + os.path.relpath(f, os.path.join(ROOT, 'tmp/library/web/ca/pages')), f, 'ca')
# E. books and histories other workstreams fetched (de-duplicated by hash; manuals, medical, drill, almanacs and pre-1863 newspapers left out)
cand = json.load(open(os.path.join(OUT, 'extra_candidates.json')))
skip_rx = re.compile(r'(/medical/|CAVTACT|cavalrytactics|REGS-|regulations|MAHAN|DUANE|manualfor|treatise|ALMANAC|americanephemer|ADAMS-SENTINEL-OTHER|GBG-COMPILER-OTHER|/or27_w2/|or27_pdf|OR27-\d-R\d+\.txt|/r1g|ledger_|rows_dump|hits\d?\.txt|sv_uncov|exc_sv|exc_or|_hits|-hits|bank-hits|ch-hits|dump_rows|inputs_dump|view_all|run3/|/audit/|sv_strength|b23-main|dtic|DTIC|BUTTERFIELD|HAMMOND|CHISOLM|TRIPLER|GROSS|WOODWARD|SOUDER|MSHWR|AMM-CAT|TROOPER|WARCLAIMS|Billings|BILLINGS|HOKE-1887|RUPP-1846)')
have = set()
for i, p, g in entries: have.add(p)
for sz, rel, h in cand:
    if skip_rx.search(rel): continue
    if rel in have: continue
    if rel.startswith('tmp/library/web/') or rel.startswith('tmp/library/ws9') or rel.startswith('tmp/library/or27'): continue
    add('X:' + rel[4:], os.path.join(ROOT, rel), 'extra')

corpus = []; index = []; tot = 0
seen_sha = {}
for i, rel, g in entries:
    p = os.path.join(ROOT, rel)
    try:
        b = open(p, 'rb').read()
    except Exception as e:
        print('SKIP', rel, e); continue
    h = hashlib.sha256(b).hexdigest()
    if h in seen_sha and g != 'or27':
        index.append(dict(id=i, path=rel, group=g, sha256=h, duplicate_of=seen_sha[h])); continue
    seen_sha[h] = i
    t = norm(b.decode('utf-8', 'replace'))
    corpus.append((i, rel, g, h, t)); tot += len(t)
    index.append(dict(id=i, path=rel, group=g, sha256=h, chars=len(t)))
pickle.dump(corpus, open(os.path.join(OUT, 'corpus.pkl'), 'wb'), protocol=4)
json.dump(index, open(os.path.join(OUT, 'corpus_index.json'), 'w'), indent=0)
import collections
c = collections.Counter(x[2] for x in corpus)
print('files', len(corpus), 'chars', tot, dict(c))
