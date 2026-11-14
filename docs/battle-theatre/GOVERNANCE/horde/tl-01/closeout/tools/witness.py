"""Second-scan witness check for the Official Records citations of shard tl-01.

For every OR citation (part 1 or 2) of GOVERNANCE/timeline_corrections/tl-01.jsonl, look for the quote in the two other archive.org
scans of the same volume part (independent OCR of other physical copies; texts under tmp/tl-01/dl/or27_w2, copied from the scratch of
terrain-1, sha256 below).  Comparison is on the 'squashed' text (letters and digits only, lower case), the convention of terrain-1.
  verbatim : the squashed quote occurs in the scan
  aligned  : not verbatim, but k-mers of the quote vote for one place; the raw text there is returned as the second reading with a
             similarity ratio (difflib) so that an OCR error of the first scan can be read against the second
  none     : no place found
Output: tmp/tl-01/audit/witness.jsonl (one line per citation) and a summary on stdout.  Read-only for everything under docs/."""
import json, re, sys, os, time, pickle, array, difflib, hashlib
ROOT = '/home/user/cautious-chainsaw'
G = ROOT + '/docs/battle-theatre/GOVERNANCE'
W2 = ROOT + '/tmp/tl-01/dl/or27_w2'
CACHE = ROOT + '/tmp/tl-01/cache'
WIT = {
    1: [('warofrebellion271unit', '4a388b6291bb972d2c8c0086d3d29973b288e0008408f6ef869a75ac6f25ff63'),
        ('warofrebellion012701rootrich', '4ff47cecfd3a71f911c3e0b924f23e60709c2161c509a0a22d173127d6f1183d')],
    2: [('warofrebellion272unit', '144f88d2399c99feecccba69b42128f9ae1c3b5ab1eef965904f2e1ba04a1e02'),
        ('warofrebellionco272unit', 'b31739105c5e886a372998737e01e513cb9877c8c2713dac85be24fa281a6c12')],
    3: [('warofrebellion273unit', '5bd2aed13a5ef69c353bc8b5a488276aaf0e606ee247d2068a45fbc807959d31')],
}
ALNUM = re.compile(r'[0-9A-Za-z]')

def squash(s):
    return ''.join(ALNUM.findall(s)).lower()

def load(ident, sha):
    cp = '%s/witness_%s.pkl' % (CACHE, ident)
    if os.path.exists(cp):
        return pickle.load(open(cp, 'rb'))
    p = '%s/%s_djvu.txt' % (W2, ident)
    b = open(p, 'rb').read()
    if hashlib.sha256(b).hexdigest() != sha:
        raise SystemExit('sha256 mismatch for ' + p)
    raw = b.decode('utf-8', errors='replace')
    raw = re.sub(r'-[ \t]*\n[ \t]*(?=[a-z])', '', raw)      # join end-of-line hyphenation as terrain-1 does
    pos = array.array('i')
    chars = []
    for m in ALNUM.finditer(raw):
        pos.append(m.start()); chars.append(m.group(0))
    S = ''.join(chars).lower()
    d = {'S': S, 'pos': pos, 'raw': raw}
    pickle.dump(d, open(cp, 'wb'), protocol=4)
    return d

def align(d, sq):
    S = d['S']
    i = S.find(sq)
    if i >= 0:
        a, b = i, i + len(sq)
        return 'verbatim', 1.0, a, b
    n = len(sq)
    if n < 24:
        return 'none', 0.0, None, None
    # diagonal voting with exact diagonal collection
    k = 12; step = 4
    diag = {}
    for i0 in range(0, n - k + 1, step):
        km = sq[i0:i0 + k]
        j = S.find(km); c = 0
        while j >= 0 and c < 6:
            diag.setdefault(j - i0, []).append(i0)
            j = S.find(km, j + 1); c += 1
    if not diag:
        return 'none', 0.0, None, None
    # merge diagonals within +-30 chars (indels of OCR)
    keys = sorted(diag)
    best = None; bs = 0
    for kx in keys:
        sc = sum(len(diag[k2]) for k2 in keys if abs(k2 - kx) <= 30)
        if sc > bs: best, bs = kx, sc
    if bs < 2:
        return 'none', 0.0, None, None
    a = max(0, best - 10); b = min(len(S), best + n + 10)
    reg = S[a:b]
    sm = difflib.SequenceMatcher(None, sq, reg, autojunk=False)
    m = sm.find_longest_match(0, n, 0, len(reg))
    ratio = sm.ratio()
    # tighten the region to the matched span extended to the quote length
    st = max(0, a + m.b - m.a); en = min(len(S), st + n)
    reg2 = S[st:en]
    r2 = difflib.SequenceMatcher(None, sq, reg2, autojunk=False).ratio()
    if r2 >= ratio:
        a, b, ratio = st, en, r2
    return ('aligned' if ratio >= 0.6 else 'none'), round(ratio, 3), a, b

def main():
    rows = [json.loads(l) for l in open(G + '/timeline_corrections/tl-01.jsonl', encoding='utf-8')]
    t0 = time.time()
    data = {}
    for part, lst in WIT.items():
        for ident, sha in lst:
            data[ident] = load(ident, sha)
    print('witness texts loaded %.1fs' % (time.time() - t0), flush=True)
    out = open(ROOT + '/tmp/tl-01/audit/witness.jsonl', 'w', encoding='utf-8', newline='\n')
    stat = {}
    for r in rows:
        for c in r['citations']:
            if c['source_id'] != 'OR27': continue
            part = c['part']
            rec = {'row': r['id'], 'key': c['key'], 'part': part, 'report_id': c['report_id'], 'page': c['printed_page'], 'quote': c['quote']}
            if part not in WIT:
                rec['witnesses'] = []; rec['note'] = 'no second scan of part %s held locally' % part
                out.write(json.dumps(rec, ensure_ascii=False) + '\n'); stat['no_scan'] = stat.get('no_scan', 0) + 1
                continue
            sq = squash(c['quote'])
            ws = []
            for ident, sha in WIT[part]:
                d = data[ident]
                lvl, ratio, a, b = align(d, sq)
                w = {'scan': ident, 'result': lvl, 'ratio': ratio}
                if a is not None:
                    ra = d['pos'][a]; rb = d['pos'][b - 1] + 1
                    w['reading'] = re.sub(r'\s+', ' ', d['raw'][max(0, ra - 0):rb]).strip()
                ws.append(w)
            rec['witnesses'] = ws
            kinds = tuple(sorted(w['result'] for w in ws))
            stat[kinds] = stat.get(kinds, 0) + 1
            out.write(json.dumps(rec, ensure_ascii=False) + '\n')
    out.close()
    print('done %.1fs' % (time.time() - t0))
    for k, v in sorted(stat.items(), key=lambda kv: str(kv[0])):
        print(k, v)

if __name__ == '__main__':
    main()
