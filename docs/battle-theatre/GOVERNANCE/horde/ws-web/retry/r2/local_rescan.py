#!/usr/bin/env python3
"""Local re-run (2026-11-16) of the questions that the shards asked of the local texts and answered with "no hit".

Each spec repeats the shard's own question as a regular expression (a window of at most N characters between the two terms where the shard asked for
two terms near each other) over the CURRENT local corpus (every .txt under tmp/library, which now holds the Official Records, the 99 ws9 texts, the
town library, the National Park Service reports and the saved Chronicling America pages). Result per spec: number of files and matches and the first
contexts, written to local_rescan_results.json. It does not decide anything: a hit is read by hand before it is used.

Method (same answers as running each regular expression over every file, with less work):
  * every file is read once and all specs that name it are applied to it;
  * a spec is run on a file only if the file contains the literal words the regular expression cannot match without (a necessary condition on the
    lower-cased text, e.g. "leister" and "fence"); a file without them cannot match, so nothing is lost;
  * for a two-term spec the full expression is tried only at positions where one of the two terms starts (a zero-width look-ahead finds them), which
    gives the same left-to-right, non-overlapping matches as scanning every position.
Run through the machine lock:  tools/horde/bench.sh python3 -I local_rescan.py
Options: --only LKR-a,LKR-b   --out file.json
"""
import glob, json, os, re, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, *(['..'] * 7)))
ONLY = sys.argv[sys.argv.index('--only') + 1].split(',') if '--only' in sys.argv else None
OUT = os.path.join(HERE, sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else 'local_rescan_results.json')
LIB = os.path.join(ROOT, 'tmp', 'library')

W = lambda a, b, n: r'(?:%s)[\s\S]{0,%d}?(?:%s)|(?:%s)[\s\S]{0,%d}?(?:%s)' % (a, n, b, b, n, a)   # a near b, either order
# (lk, what was asked, regex, corpus, necessary literals [every group needs one of its words], (term a, term b, window) for a two-term spec or None)
SPECS = [
    ('LKR-fence-1-L6', 'lunette|epaulement in the Official Records', r'lunette|epaulement', 'or27', [['lunette', 'epaulement']], None),
    ('LKR-fence-1-L9', 'firewood in the Official Records', r'firewood', 'or27', [['firewood']], None),
    ('LKR-fence-2-L2', 'Klingle|Klingel|Leister|Weikert|Spangler|Wade in OR27 (count by name)', r'Kling[eE]?[lL]e?\b|Leister|Weikert|Spangler|\bWade\b', 'or27',
     [['kling', 'leister', 'weikert', 'spangler', 'wade']], None),
    ('LKR-fence-2-L3', 'Bigelow with Trostle and wall in OR27', W(r'Bigelow', r'Trostle', 600), 'or27', [['bigelow'], ['trostle']], (r'Bigelow', r'Trostle', 600)),
    ('LKR-fence-2-L5', 'Leister|Klingle|Wade|Weikert|Trostle|Bigelow with fence (state volumes, B&L, ws9)', W(r'Leister|Kling[eE]?[lL]e?\b|Weikert|Trostle|Bigelow', r'fence', 250), 'all',
     [['leister', 'kling', 'weikert', 'trostle', 'bigelow'], ['fence']], (r'Leister|Kling[eE]?[lL]e?\b|Weikert|Trostle|Bigelow', r'fence', 250)),
    ('LKR-fence-2-L27', 'Weikert in OR27', r'Weikert|Wikert', 'or27', [['weikert', 'wikert']], None),
    ('LKR-fence-2-L33', 'Rose|Slyder|Bushman with hospital|buried|wounded (NPS texts)', W(r'Slyder|Bushman|Rose farm', r'hospital|buried|wounded', 300), 'nps',
     [['slyder', 'bushman', 'rose farm'], ['hospital', 'buried', 'wounded']], (r'Slyder|Bushman|Rose farm', r'hospital|buried|wounded', 300)),
    ('LKR-fence-2-L39', 'Sherfy in OR27 (OCR variants)', r'Sherf[eiy]|Shertz|Sherfey', 'or27', [['sherf', 'shertz']], None),
    ('LKR-fence-2-L47', '"fences are all down"', r'fences?\s+(?:are|were)\s+all\s+down', 'all', [['fence'], ['down']], None),
    ('LKR-fence-2-L49', 'Leister with rails|fence|burn', W(r'Leister', r'rails?\b|fence|burn', 300), 'all', [['leister'], ['rail', 'fence', 'burn']], (r'Leister', r'rails?\b|fence|burn', 300)),
    ('LKR-fence-2-L50', 'Weed with died|basement|expired (and Weikert hospital)', W(r'\bWeed\b', r'died|basement|expired|dead', 250), 'all',
     [['weed'], ['died', 'basement', 'expired', 'dead']], (r'\bWeed\b', r'died|basement|expired|dead', 250)),
    ('LKR-fence-2-L51', 'White Run', r'White\s+Run', 'all', [['white'], ['run']], None),
    ('LKR-fence-2-L52', 'Spangler barn with operating|lantern|tables|forebay', W(r'Spangler', r'operating|lantern|tables?\b|forebay', 300), 'all',
     [['spangler'], ['operating', 'lantern', 'table', 'forebay']], (r'Spangler', r'operating|lantern|tables?\b|forebay', 300)),
    ('LKR-fence-2-L54', 'Wade with house|killed|struck|bullet', W(r'Jennie Wade|Ginnie Wade|Virginia Wade|Miss Wade|Mary Wade', r'house|killed|struck|bullet', 300), 'all',
     [['jennie wade', 'ginnie wade', 'virginia wade', 'miss wade', 'mary wade'], ['house', 'killed', 'struck', 'bullet']],
     (r'Jennie Wade|Ginnie Wade|Virginia Wade|Miss Wade|Mary Wade', r'house|killed|struck|bullet', 300)),
    ('LKR-fence-3-L37', 'loop-hole|port-hole|loophole', r'loop-?holes?|port-?holes?', 'all', [['loophole', 'loop-hole', 'porthole', 'port-hole']], None),
    ('LKR-fence-3-L41', 'Pardee Field with wall', W(r'Pardee Field', r'wall', 250), 'nps', [['pardee field'], ['wall']], (r'Pardee Field', r'wall', 250)),
    ('LKR-fence-3-L53', '836 with holes|perforated', W(r'\b836\b', r'holes?|perforat', 150), 'all', [['836'], ['hole', 'perforat']], (r'\b836\b', r'holes?|perforat', 150)),
    ('LKR-fence-3-L54', 'Brian|Bryan|Brien barn or house in OR27', W(r'\bBrian\b|\bBryan\b|\bBrien\b', r'barn|house', 200), 'or27',
     [['brian', 'bryan', 'brien'], ['barn', 'house']], (r'\bBrian\b|\bBryan\b|\bBrien\b', r'barn|house', 200)),
    ('LKR-fence-3-L58', 'Granite School with hospital|shell|Second Corps|McAllister', W(r'Granite\s+School', r'hospital|shell|Second Corps|McAllister', 300), 'all',
     [['granite'], ['school'], ['hospital', 'shell', 'second corps', 'mcallister']], (r'Granite\s+School', r'hospital|shell|Second Corps|McAllister', 300)),
    ('LKR-fence-3-L65', 'Hummelbaugh with hospital|Pleasonton|headquarters|Barksdale', W(r'Hummelbaug', r'hospital|Pleasonton|headquarters|Barksdale', 300), 'all',
     [['hummelbaug'], ['hospital', 'pleasonton', 'headquarters', 'barksdale']], (r'Hummelbaug', r'hospital|Pleasonton|headquarters|Barksdale', 300)),
    ('LKR-fence-3-L107', 'Gettysburg railroad or trains with open|resume|complete|repair|running (saved pages 6-15 Jul 1863)',
     W(r'Gettysburg', r'(?:rail ?road|trains?\b)[\s\S]{0,80}(?:open|resum|complet|repair|running)', 250), 'ca-jul', [['gettysburg'], ['rail', 'train']],
     (r'Gettysburg', r'(?:rail ?road|trains?\b)[\s\S]{0,80}(?:open|resum|complet|repair|running)', 250)),
]
EXTRA_WINDOW = 700   # beyond the gap, room for the longest second term (the third spec above has a term of up to about 100 characters)


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


def find_matches(cre, anchor, t, win):
    """Same matches as list(cre.finditer(t)); for a two-term spec the expression is only tried where one of the terms starts."""
    if anchor is None:
        return list(cre.finditer(t))
    out = []
    last_end = 0
    n = len(t)
    for am in anchor.finditer(t):
        p = am.start()
        if p < last_end:
            continue
        m = cre.match(t, p, min(n, p + win))
        if m:
            out.append(m)
            last_end = m.end() if m.end() > p else p + 1
    return out


def compile_spec(sp):
    lk, desc, rx, kind, lits, two = sp
    cre = re.compile(rx, re.I)
    anchor = win = None
    if two:
        a, b, n = two
        anchor = re.compile(r'(?=(?:%s)|(?:%s))' % (a, b), re.I)
        win = n + EXTRA_WINDOW
    return cre, anchor, win


def main():
    t0 = time.time()
    specs = [s for s in SPECS if not ONLY or s[0] in ONLY]
    comp = {s[0]: compile_spec(s) for s in specs}
    kinds = sorted({s[3] for s in specs})
    byk = {k: files_for(k) for k in kinds}
    ksets = {k: set(v) for k, v in byk.items()}
    allfiles = sorted(set().union(*ksets.values())) if ksets else []
    st = {s[0]: {'nfiles': 0, 'nm': 0, 'ctxs': []} for s in specs}
    for i, f in enumerate(allfiles):
        mine = [s for s in specs if f in ksets[s[3]]]
        try:
            t = open(f, encoding='utf-8', errors='replace').read()
        except Exception:
            continue
        tl = t.lower()
        for s in mine:
            lk, desc, rx, kind, lits, two = s
            if not all(any(w in tl for w in g) for g in lits):
                continue
            cre, anchor, win = comp[lk]
            ms = find_matches(cre, anchor, t, win)
            if not ms:
                continue
            r = st[lk]
            r['nfiles'] += 1
            r['nm'] += len(ms)
            if len(r['ctxs']) < 4:
                m = ms[0]
                r['ctxs'].append({'file': os.path.relpath(f, ROOT), 'at': m.start(), 'ctx': re.sub(r'\s+', ' ', t[max(0, m.start() - 120):m.end() + 160])[:420]})
        if (i + 1) % 200 == 0:
            print('... %d of %d files read, %.0f s' % (i + 1, len(allfiles), time.time() - t0), flush=True)
    res = {}
    for s in specs:
        lk, desc, rx, kind = s[:4]
        r = st[lk]
        res[lk] = {'asked': desc, 'regex': rx, 'corpus': kind, 'files_scanned': len(byk[kind]), 'files_with_match': r['nfiles'], 'matches': r['nm'], 'first_contexts': r['ctxs']}
        print(lk, '| files', len(byk[kind]), '| files with match', r['nfiles'], '| matches', r['nm'], flush=True)
    res['_meta'] = {'run_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'seconds': round(time.time() - t0, 1), 'corpus': 'every .txt under tmp/library (or27, nps, ca pages as named per spec)',
                    'method': 'one pass over the files; literal pre-test; two-term specs tried at term starts (see the script docstring)'}
    json.dump(res, open(OUT, 'w'), indent=1, ensure_ascii=False)


if __name__ == '__main__':
    main()
