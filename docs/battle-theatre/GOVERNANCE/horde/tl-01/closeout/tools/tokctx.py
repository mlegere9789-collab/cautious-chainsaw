"""For each 'supported' sub-claim: tokens (names, numbers) of the claim that are not in its cited quotes/readings -> are they near the quotes
(+-WIN characters of the raw text)?  Prints per sub-claim: tokens missing from quotes, and which of them occur nearby (FOUND) or not (NOT)."""
import json, re, sys, os, unicodedata
ROOT = '/home/user/cautious-chainsaw'
G = ROOT + '/docs/battle-theatre/GOVERNANCE'
rows = [json.loads(l) for l in open(G + '/timeline_corrections/tl-01.jsonl', encoding='utf-8')]
WIN = int(sys.argv[1]) if len(sys.argv) > 1 else 2500
only = set(sys.argv[2:])
STOP = set('''The A An On In At By For From To Of And Or But Not No Yes It Its His Her Their They He She We Our I You This That These Those There Then
Jun June Jul July Aug Sept Sep Oct Nov Dec Jan Feb Mar Apr May Monday Tuesday Wednesday Thursday Friday Saturday Sunday NOT OR SEED PDF
Official Records Union Confederate Rebel Rebels Federal Army Corps Division Brigade Regiment Battalion Company Cavalry Infantry Artillery
Gen General Maj Col Capt Lieut Lt Brig Mr Mrs Hon Dr Pvt Private Surg Surgeon Colonel Captain Major Lieutenant Brigadier Itinerary Compiler Jacobs
Richards Early Hill Lee Pierce Fremantle Alexander Stuart'''.split())
def squash(s): return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD', s).lower())
def toks(claim):
    t = []
    for m in re.finditer(r'\d[\d,.:]*\d|\d', claim): t.append(m.group(0).strip('.,:'))
    for m in re.finditer(r"\b([A-Z][a-z]+(?:['’][a-z]+)?)\b", claim):
        w = m.group(1)
        if w not in STOP and m.start() > 0: t.append(w)
    seen = []; [seen.append(x) for x in t if x not in seen]
    return seen
_raw = {}
def raw(p):
    if p not in _raw: _raw[p] = open(os.path.join(ROOT, p), encoding='utf-8', newline='').read()
    return _raw[p]
def near_has(tok, cits):
    base = re.sub(r"['’]s$", '', tok)
    pat = re.compile(re.escape(base[:max(4, len(base) - 1)]), re.I) if not re.match(r'\d', tok) else None
    for c in cits:
        t = raw(c['source_file']); a, b = c['text_offset'], c['text_offset_end']
        seg = t[max(0, a - WIN): b + WIN]
        if pat is not None:
            m = pat.search(seg)
            if m: return re.sub(r'\s+', ' ', seg[max(0, m.start() - 60): m.end() + 60])
        else:
            tt = tok.replace(',', '')
            for v in {tok, tt, '{:,}'.format(int(tt)) if tt.isdigit() and int(tt) >= 1000 else tt}:
                m = re.search(r'(?<!\d)' + re.escape(v) + r'(?!\d)', seg)
                if m: return re.sub(r'\s+', ' ', seg[max(0, m.start() - 60): m.end() + 60])
    return None
for r in rows:
    if only and r['id'] not in only: continue
    cit = {c['key']: c for c in r['citations']}
    for s in r['sub_claims']:
        if s['support'] != 'supported' or not s['citations']: continue
        cs = [cit[k] for k in s['citations'] if k in cit]
        blob = squash(' '.join(c['quote'] + ' ' + (c.get('reading') or '') for c in cs))
        miss = [t for t in toks(s['claim']) if squash(t) and squash(t) not in blob]
        if not miss: continue
        res = []
        for t in miss:
            f = near_has(t, cs)
            res.append((t, f))
        notn = [t for t, f in res if f is None]
        print('%s sub %d  missing %s  NOT-NEARBY %s\n     %s' % (r['id'], s['n'], [t for t, f in res], notn, s['claim'][:230]))
