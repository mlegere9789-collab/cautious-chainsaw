#!/usr/bin/env python3
"""Local re-run (2026-11-16) of the questions that the shards asked of the local texts and answered with "no hit".

Each spec repeats the shard's own question as a regular expression (a window of at most N characters between the two terms where the shard asked for
two terms near each other) over the CURRENT local corpus (every .txt under tmp/library, which now holds the Official Records, the 99 ws9 texts, the
town library, the National Park Service reports and the saved Chronicling America pages). Result per spec: number of files and matches and the first
contexts, written to local_rescan_results.json. It does not decide anything: a hit is read by hand before it is used.

Run through the machine lock:  tools/horde/bench.sh python3 -I local_rescan.py
"""
import glob, json, os, re, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, *(['..'] * 8)))
OUT = os.path.join(HERE, 'local_rescan_results.json')
LIB = os.path.join(ROOT, 'tmp', 'library')

W = lambda a, b, n: r'(?:%s)[\s\S]{0,%d}?(?:%s)|(?:%s)[\s\S]{0,%d}?(?:%s)' % (a, n, b, b, n, a)   # a near b, either order
SPECS = [
    ('LKR-fence-1-L6', 'lunette|epaulement in the Official Records', r'lunette|epaulement', 'or27'),
    ('LKR-fence-1-L9', 'firewood in the Official Records', r'firewood', 'or27'),
    ('LKR-fence-2-L2', 'Klingle|Klingel|Leister|Weikert|Spangler|Wade in OR27 (count by name)', r'Kling[eE]?[lL]e?\b|Leister|Weikert|Spangler|\bWade\b', 'or27'),
    ('LKR-fence-2-L3', 'Bigelow with Trostle and wall in OR27', W(r'Bigelow', r'Trostle', 600), 'or27'),
    ('LKR-fence-2-L5', 'Leister|Klingle|Wade|Weikert|Trostle|Bigelow with fence (state volumes, B&L, ws9)', W(r'Leister|Kling[eE]?[lL]e?\b|Weikert|Trostle|Bigelow', r'fence', 250), 'all'),
    ('LKR-fence-2-L27', 'Weikert in OR27', r'Weikert|Wikert', 'or27'),
    ('LKR-fence-2-L33', 'Rose|Slyder|Bushman with hospital|buried|wounded (NPS texts)', W(r'Slyder|Bushman|Rose farm', r'hospital|buried|wounded', 300), 'nps'),
    ('LKR-fence-2-L39', 'Sherfy in OR27 (OCR variants)', r'Sherf[eiy]|Shertz|Sherfey', 'or27'),
    ('LKR-fence-2-L47', '"fences are all down"', r'fences?\s+(?:are|were)\s+all\s+down', 'all'),
    ('LKR-fence-2-L49', 'Leister with rails|fence|burn', W(r'Leister', r'rails?\b|fence|burn', 300), 'all'),
    ('LKR-fence-2-L50', 'Weed with died|basement|expired (and Weikert hospital)', W(r'\bWeed\b', r'died|basement|expired|dead', 250), 'all'),
    ('LKR-fence-2-L51', 'White Run', r'White\s+Run', 'all'),
    ('LKR-fence-2-L52', 'Spangler barn with operating|lantern|tables|forebay', W(r'Spangler', r'operating|lantern|tables?\b|forebay', 300), 'all'),
    ('LKR-fence-2-L54', 'Wade with house|killed|struck|bullet', W(r'Jennie Wade|Ginnie Wade|Virginia Wade|Miss Wade|Mary Wade', r'house|killed|struck|bullet', 300), 'all'),
    ('LKR-fence-3-L37', 'loop-hole|port-hole|loophole', r'loop-?holes?|port-?holes?', 'all'),
    ('LKR-fence-3-L41', 'Pardee Field with wall', W(r'Pardee Field', r'wall', 250), 'nps'),
    ('LKR-fence-3-L53', '836 with holes|perforated', W(r'\b836\b', r'holes?|perforat', 150), 'all'),
    ('LKR-fence-3-L54', 'Brian|Bryan|Brien barn or house in OR27', W(r'\bBrian\b|\bBryan\b|\bBrien\b', r'barn|house', 200), 'or27'),
    ('LKR-fence-3-L58', 'Granite School with hospital|shell|Second Corps|McAllister', W(r'Granite\s+School', r'hospital|shell|Second Corps|McAllister', 300), 'all'),
    ('LKR-fence-3-L65', 'Hummelbaugh with hospital|Pleasonton|headquarters|Barksdale', W(r'Hummelbaug', r'hospital|Pleasonton|headquarters|Barksdale', 300), 'all'),
    ('LKR-fence-3-L107', 'Gettysburg railroad or trains with open|resume|complete|repair|running (saved pages 6-15 Jul 1863)', W(r'Gettysburg', r'(?:rail ?road|trains?\b)[\s\S]{0,80}(?:open|resum|complet|repair|running)', 250), 'ca-jul'),
]


def files_for(kind):
    if kind == 'or27':
        return sorted(glob.glob(os.path.join(LIB, 'or27', '*_djvu.txt')))
    if kind == 'nps':
        return sorted(glob.glob(os.path.join(LIB, 'web', 'nps', '**', '*.txt'), recursive=True))
    if kind == 'ca-jul':
        out = []
        for d in range(6, 16):
            out += glob.glob(os.path.join(LIB, 'web', 'ca', 'pages', '*', '1863-07-%02d' % d, 'ed-*', 'seq-*.txt'))
        return sorted(out)
    return sorted(glob.glob(os.path.join(LIB, '**', '*.txt'), recursive=True))


def main():
    t0 = time.time()
    cache = {}
    res = {}
    for lk, desc, rx, kind in SPECS:
        fl = cache.get(kind)
        if fl is None:
            fl = cache[kind] = files_for(kind)
        cre = re.compile(rx, re.I)
        nfiles = nm = 0
        ctxs = []
        byname = {}
        for f in fl:
            try:
                t = open(f, encoding='utf-8', errors='replace').read()
            except Exception:
                continue
            ms = list(cre.finditer(t))
            if not ms:
                continue
            nfiles += 1
            nm += len(ms)
            if len(ctxs) < 4:
                m = ms[0]
                ctxs.append({'file': os.path.relpath(f, ROOT), 'at': m.start(), 'ctx': re.sub(r'\s+', ' ', t[max(0, m.start() - 120):m.end() + 160])[:420]})
        res[lk] = {'asked': desc, 'regex': rx, 'corpus': kind, 'files_scanned': len(fl), 'files_with_match': nfiles, 'matches': nm, 'first_contexts': ctxs}
        print(lk, '| files', len(fl), '| files with match', nfiles, '| matches', nm, flush=True)
    res['_meta'] = {'run_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'seconds': round(time.time() - t0, 1), 'corpus': 'every .txt under tmp/library (or27, nps, ca pages as named per spec)'}
    json.dump(res, open(OUT, 'w'), indent=1, ensure_ascii=False)


if __name__ == '__main__':
    main()
