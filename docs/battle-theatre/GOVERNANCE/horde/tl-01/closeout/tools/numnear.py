"""For each supported sub-claim: numbers/dates in the claim that are not inside its quotes -> look for them in the raw source text within +-WIN
characters of the cited quotes (digits, comma/point variants, or spelled out).  Prints NEARBY (snippet) or NOT FOUND NEARBY."""
import json, re, sys, os
ROOT = '/home/user/cautious-chainsaw'
G = ROOT + '/docs/battle-theatre/GOVERNANCE'
rows = [json.loads(l) for l in open(G + '/timeline_corrections/tl-01.jsonl', encoding='utf-8')]
WIN = int(sys.argv[1]) if len(sys.argv) > 1 else 1800
ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split()
TENS = {20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty', 60: 'sixty', 70: 'seventy', 80: 'eighty', 90: 'ninety'}
ORD = {1: 'first|1st|1st', 2: 'second|2d|2nd', 3: 'third|3d|3rd', 20: 'twentieth|20th', 26: '26th|2Gth|twenty-sixth', 27: '27th|twenty-seventh', 28: '28th|twenty-eighth', 29: '29th|twenty-ninth', 30: '30th|thirtieth'}
def words(n):
    if n < 20: return [ONES[n]]
    if n < 100:
        t = TENS.get(n // 10 * 10)
        return [t] if n % 10 == 0 else [t + '[- ]' + ONES[n % 10]]
    return []
def variants(tok):
    t = tok.replace(',', '')
    out = [re.escape(tok)]
    if re.fullmatch(r'\d+', t):
        n = int(t)
        out += [re.escape(t)]
        if n >= 1000: out += [re.escape('{:,}'.format(n)), re.escape('{:,}'.format(n)).replace(',', r'[,.]')]
        out += words(n)
        if n in ORD: out += ORD[n].split('|')
        if 1 <= n <= 31:
            out += [r'%d(?:st|d|nd|rd|th|tli|tb)' % n]
    if re.fullmatch(r'\d+\.\d+', tok):
        a, b = tok.split('.')
        out += [r'%s[-\s]?[|J½]' % a, r'%s[.,]%s' % (a, b), r'%s and a half' % ONES[int(a)] if int(a) < 20 else '']
        if tok == '3.30': out += [r'3\s?J', r'half past three']
    if re.fullmatch(r'\d\d:\d\d', tok):
        h, m = int(tok[:2]), tok[3:]
        out += [r'%d[.:]\s?%s' % (h if h <= 12 else h - 12, m), r'%d o.clock' % (h if h <= 12 else h - 12)]
    return [v for v in out if v]
_raw = {}
def raw(path):
    if path not in _raw: _raw[path] = open(os.path.join(ROOT, path), encoding='utf-8', newline='').read()
    return _raw[path]
def squash(s): return re.sub(r'[^a-z0-9]', '', s.lower())
sys.path.insert(0, ROOT + '/tmp/tl-01/audit')
import importlib.util
spec = importlib.util.spec_from_file_location('tokcheck_mod', ROOT + '/tmp/tl-01/audit/tokcheck.py')
# reuse tokens() without running tokcheck's main loop: copy the function
STOP = set('''The A An On In At By For From To Of And Or But Not No Yes It Its His Her Their They He She We Our I You This That These Those There Then
Jun June Jul July Aug Sept Sep Oct Nov Dec Jan Feb Mar Apr May Monday Tuesday Wednesday Thursday Friday Saturday Sunday NOT OR SEED PDF'''.split())
def numtokens(claim):
    toks = []
    for m in re.finditer(r'\d[\d,.:]*\d|\d', claim):
        toks.append(m.group(0).strip('.,:'))
    return toks
bad = 0; ok = 0
for r in rows:
    cit = {c['key']: c for c in r['citations']}
    for s in r['sub_claims']:
        if s['support'] != 'supported' or not s['citations']: continue
        blob = ' '.join(cit[k]['quote'] + ' ' + (cit[k].get('reading') or '') for k in s['citations'] if k in cit)
        sb = squash(blob)
        for t in numtokens(s['claim']):
            if squash(t) in sb or not squash(t): continue
            if t in ('1863',): continue
            found = None
            for k in s['citations']:
                c = cit[k]
                txt = raw(c['source_file'])
                a, b = c['text_offset'], c['text_offset_end']
                seg = txt[max(0, a - WIN): b + WIN]
                for v in variants(t):
                    m = re.search(v, seg, re.I)
                    if m:
                        found = re.sub(r'\s+', ' ', seg[max(0, m.start() - 70): m.end() + 70]); break
                if found: break
            if found:
                ok += 1
            else:
                bad += 1
                print('NOT FOUND NEARBY: %s sub %d token %r | %s' % (r['id'], s['n'], t, s['claim'][:200]))
print('found nearby', ok, '| not found nearby', bad)
