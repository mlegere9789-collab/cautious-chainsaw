"""Re-check every quote recorded in horde/*/results.jsonl against the OR Ser.I vol.27 OCR text. Run: python -I or_recheck.py
Read-only on shards; writes results.jsonl beside itself."""
import os, re, sys, json, glob, unicodedata, bisect
ROOT = '/home/user/cautious-chainsaw'
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
from or27_find import get_part
from or27_lib import norm_query
OUT = os.path.dirname(os.path.abspath(__file__))
H = os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/horde')
QKEYS = {'quote', 'passage_quote', 'quote_under_15_words', 'exact_quote'}
FREE = {'passage_ref', 'supporting_passage_ref', 'supporting_passage_refs', 'supporting_passage', 'supporting_passages'}
LIG = {'ſ': 's', 'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬀ': 'ff', 'ﬃ': 'ffi', 'ﬄ': 'ffl', 'æ': 'ae', 'œ': 'oe', 'Æ': 'ae', 'Œ': 'oe'}

def squash(s):
    out, mp = [], []
    for i, ch in enumerate(s):
        for c in LIG.get(ch, ch):
            c = unicodedata.normalize('NFKD', c)
            for d in c:
                if d.isalnum():
                    out.append(d.lower()); mp.append(i)
    return ''.join(out), mp

PS = {}
def pdata(p):
    if p not in PS:
        P = get_part(p); sq, mp = squash(P.ntext); PS[p] = (P, sq, mp)
    return PS[p]

def lev_semi(q, t):
    """min edit distance of q against any substring of t (free ends); returns (dist, end index in t)"""
    n = len(q); prev = list(range(n + 1)); best = (n, 0)
    # prev[i] = dist q[:i] vs best substring ending at current j
    for j, c in enumerate(t, 1):
        cur = [0] * (n + 1)
        for i in range(1, n + 1):
            cur[i] = min(prev[i - 1] + (q[i - 1] != c), prev[i] + 1, cur[i - 1] + 1)
        if cur[n] < best[0] or (cur[n] == best[0] and best[1] == 0): best = (cur[n], j)
        prev = cur
    return best

def lev_start(q, t, endj):
    """find start of best match ending at endj by reverse alignment"""
    d, e = lev_semi(q[::-1], t[:endj][::-1]); return endj - e

def fuzzy_find(q, sq):
    n = len(q); k = 9
    if n < 12: return None
    seeds = [(o, q[o:o + k]) for o in range(0, n - k + 1, max(1, (n - k) // 12 or 1))]
    cands = {}
    for o, s in seeds:
        pos = 0; c = 0
        while c < 40:
            i = sq.find(s, pos)
            if i < 0: break
            cands[(i - o) // 20] = cands.get((i - o) // 20, 0) + 1; pos = i + 1; c += 1
    best = None
    for key, cnt in sorted(cands.items(), key=lambda x: -x[1])[:6]:
        if cnt < 2: continue
        a = max(0, key * 20 - 25); b = key * 20 + n + 45
        d, e = lev_semi(q, sq[a:b])
        if best is None or d < best[0]: best = (d, a + e)
    if best is None: return None
    d, e = best; s = lev_start(q, sq, e) if False else max(0, e - n)
    return d, s, e

def locate(q, parts):
    """returns list of (kind, part, ntext_start, ntext_end, dist)"""
    qn = norm_query(q)
    res = []
    for p in parts:
        P, sq, mp = pdata(p)
        i = P.ntext.find(qn)
        if i >= 0: return [('yes', p, i, i + len(qn), 0)]
    qs, _ = squash(q)
    if len(qs) < 8: return []
    for p in parts:
        P, sq, mp = pdata(p)
        i = sq.find(qs)
        if i >= 0: return [('fuzzy', p, mp[i], mp[i + len(qs) - 1] + 1, 0, 'differs only in case/punctuation/whitespace/ligature/OCR-normalised characters')]
    best = None
    for p in parts:
        P, sq, mp = pdata(p)
        r = fuzzy_find(qs, sq)
        if r and (best is None or r[0] < best[0]): best = (r[0], p, r[1], r[2])
    if best:
        d, p, s, e = best
        P, sq, mp = pdata(p)
        ratio = d / len(qs)
        if ratio <= 0.15:
            return [('fuzzy', p, mp[min(s, len(mp) - 1)], mp[min(e, len(mp)) - 1] + 1, d, 'squashed edit distance %d of %d chars (%.1f%%)' % (d, len(qs), 100 * ratio))]
        return [('no', p, mp[min(s, len(mp) - 1)], mp[min(e, len(mp)) - 1] + 1, d, 'nearest candidate rejected: edit distance %d of %d chars (%.1f%%)' % (d, len(qs), 100 * ratio))]
    return []

def locate(q, parts, _l=locate):
    r = _l(q, parts)
    if not r: return r
    r = list(r[0]); P = get_part(r[1])
    if r[3] > r[2]:
        a, b = P.orig_span(r[2], min(r[3], len(P.ntext))); r[2], r[3] = a, b
    return [tuple(r)]

def split_pieces(q):
    ps = re.split(r'\s*(?:\.\.\.|…|\. \. \.)\s*', q)
    ps = [re.sub(r'\[[^\]]*\]', ' ', x).strip(' "“”‘’\'') for x in ps]
    return [x for x in ps if len(x.split()) >= 2]

def ctx_part(ctx):
    s = ' '.join(str(ctx.get(k, '')) for k in ('part', 'report_id', 'citation', 'cite', 'or_cite_from_tool', 'work', 'source', 'type', 'key'))
    m = re.search(r'OR27-(\d)', s) or re.search(r'pt\.?\s*(\d)', s) or re.search(r'part\s*(\d)', s, re.I)
    if ctx.get('part') in (1, 2, 3, '1', '2', '3'): return int(ctx['part'])
    if m: return int(m.group(1))
    return None

def is_or(ctx):
    s = ' '.join(str(ctx.get(k, '')) for k in ('work', 'source', 'type', 'report_id', 'citation', 'cite', 'or_cite_from_tool', 'key'))
    return bool(re.search(r'OR27|Official Records|OR Ser|Ser\.? ?I vol', s, re.I)) or ctx.get('part') in (1, 2, 3, '1', '2', '3')

rows = []
def add(f, rid, field, q, ctx, kind):
    rows.append(dict(shard=f, row_id=rid, field=field, quote=q, ctx=ctx, kind=kind))

def walk(o, f, rid, field, ctx):
    if isinstance(o, dict):
        c2 = dict(ctx)
        for k in ('part', 'report_id', 'citation', 'cite', 'or_cite_from_tool', 'work', 'source', 'type', 'key', 'printed_page'):
            if k in o and o[k] is not None: c2[k] = o[k]
        for k, v in o.items():
            if k in QKEYS and isinstance(v, str) and v.strip(): add(f, rid, field + '.' + k, v, c2, 'quote-field')
            elif k in FREE: walk(v, f, rid, k, c2)
            elif isinstance(v, (dict, list)): walk(v, f, rid, k, c2)
            elif isinstance(v, str) and field in FREE: pass
    elif isinstance(o, list):
        for x in o: walk(x, f, rid, field, ctx)
    elif isinstance(o, str) and field in FREE:
        for m in re.finditer(r'["“]([^"“”]{20,}?)["”]', o):
            if len(m.group(1).split()) >= 4: add(f, rid, field, m.group(1), ctx, 'embedded-quote-in-free-text')

for fp in sorted(glob.glob(H + '/*/results.jsonl')):
    sh = fp.split('/')[-2]
    if sh == 'OR-RECHECK': continue
    for ln, l in enumerate(open(fp, encoding='utf-8'), 1):
        if not l.strip(): continue
        r = json.loads(l); rid = r.get('id') or r.get('item') or 'line%d' % ln
        walk(r, sh, rid, '', {})

seen = set()
out = []
qf = {(r['shard'], r['row_id'], norm_query(r['quote'])) for r in rows if r['kind'] == 'quote-field'}
for r in rows:
    key = (r['shard'], r['row_id'], norm_query(r['quote']))
    if r['kind'] != 'quote-field' and key in qf: continue
    if (key, r['kind']) in seen: continue
    seen.add((key, r['kind']))
    ctx = r.pop('ctx'); q = r['quote']
    part = ctx_part(ctx); orsrc = is_or(ctx) or r['kind'] == 'embedded-quote-in-free-text'
    rec = dict(r); rec['claimed_part'] = part; rec['claimed_report'] = ctx.get('report_id'); rec['claimed_printed_page'] = ctx.get('printed_page')
    rec['source_label'] = str(ctx.get('source') or ctx.get('work') or ctx.get('type') or '')[:100]
    if not is_or(ctx) and r['kind'] == 'quote-field':
        rec.update(found='not_checkable', note='quote is attributed to a source other than OR vol.27 (not in the downloaded text)'); out.append(rec); continue
    parts = ((part,) + tuple(x for x in (1, 2, 3) if x != part)) if part else (1, 2, 3)
    pieces = split_pieces(q) if re.search(r'\.\.\.|…|\[', q) else [norm_query(q.strip(' "“”'))]
    if not pieces: pieces = [norm_query(q)]
    kinds = []; dists = []; offs = []; notes = []; pg = None; rep = None; fpart = None
    for pc in pieces:
        loc = locate(pc, parts)
        if loc and loc[0][0] != 'no' and part and loc[0][1] != part: notes.append('found in pt.%d, not claimed pt.%d' % (loc[0][1], part))
        if not loc: kinds.append('no'); notes.append('no seed match'); continue
        l = loc[0]; kinds.append(l[0]); dists.append(l[4]); offs.append(l[2])
        if len(l) > 5: notes.append(l[5])
        if l[0] != 'no' and pg is None:
            fpart = l[1]; P = pdata(l[1])[0]; c = P.cite(l[2], l[3]); pg = c['page']; rep = c['record']; rep_who = c['who']
    if 'no' in kinds: f = 'no'
    elif 'fuzzy' in kinds: f = 'fuzzy'
    else: f = 'yes'
    if len(pieces) > 1: notes.append('quote split on ellipsis/brackets into %d pieces' % len(pieces))
    rec.update(found=f, found_part=fpart, offset=(offs[0] if f != 'no' else None), nearest_offset=(offs[0] if offs else None), found_report=rep, found_page=pg, edit_distance=(sum(dists) if dists else None), note='; '.join(dict.fromkeys(notes)))
    if f != 'no' and rec['claimed_report'] and rep and str(rec['claimed_report']).startswith('OR27') and rec['claimed_report'] != rep:
        rec['note'] += '; REPORT MISMATCH claimed %s found %s' % (rec['claimed_report'], rep)
    if f != 'no' and rec['claimed_printed_page'] and pg and str(rec['claimed_printed_page']) not in str(pg):
        rec['note'] += '; page differs: claimed %s found %s' % (rec['claimed_printed_page'], pg)
    if f == 'no' and (r['kind'] == 'embedded-quote-in-free-text' or (len(q.split()) > 15 and ':' in q[:30])):
        rec['note'] += '; LOW-CONFIDENCE not-found: ' + ('quoted fragment of free text, may be a paraphrase/non-OR source/extraction artifact' if r['kind'] != 'quote-field' else 'string labelled quote looks like a paraphrase/summary, not verbatim')
    out.append(rec)
with open(os.path.join(OUT, 'results.jsonl'), 'w', encoding='utf-8') as f:
    for r in out: f.write(json.dumps(r, ensure_ascii=False) + '\n')
import collections
print(collections.Counter(r['found'] for r in out), collections.Counter((r['kind'], r['found']) for r in out))
