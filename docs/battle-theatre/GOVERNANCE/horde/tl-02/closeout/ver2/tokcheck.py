"""Strict token check (second reader, 2026-11-15): for every supported/conflict sub-claim, list the claim's numbers and capitalised names
that occur neither in the cited quotes nor within +-700 characters of them in the source text.  A token that is only in the context means the
quote is narrower than the claim (extend it); a token that is nowhere near is a paraphrase or a claim not carried by the citation.
    python3 -I tmp/tl-02/ver2/tokcheck.py [--ctx 700]
"""
import os, re, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
CTX = 700
if '--ctx' in sys.argv:
    CTX = int(sys.argv[sys.argv.index('--ctx') + 1])
rows = [json.loads(l) for l in open(os.path.join(G, 'timeline_corrections', 'tl-02.jsonl'), encoding='utf-8')]
_cache = {}
def src(p):
    if p not in _cache:
        _cache[p] = open(os.path.join(ROOT, p), encoding='utf-8', errors='replace', newline='').read()
    return _cache[p]
def norm(s):
    s = s.lower()
    s = s.replace('’', "'").replace('‘', "'")
    s = re.sub(r"[^a-z0-9']+", ' ', s)
    return ' ' + s.strip() + ' '
STOPCAP = set('the a an of in on at by for and or as was were is are with from that this it its his her their which who after before then than into over under between about not no but also he she they we i our out up'.split())
def tokens(claim):
    c = re.sub(r'\([^)]*\)', ' ', claim)          # drop parenthetical glosses
    c = re.sub(r'\b(Jun|Jul|June|July)\.? \d+', ' ', c)   # dates are the row frame
    c = re.sub(r'\b(Jun|Jul|June|July|Gettysburg)\b', ' ', c)
    c = re.sub(r'"[^"]*"', lambda m: m.group(0), c)
    toks = []
    for m in re.finditer(r"\b\d[\d,.:]*\d\b|\b\d\b", c):
        t = m.group(0).strip('.,:')
        toks.append(('num', t))
    # capitalised words not at sentence start
    words = re.findall(r"[A-Za-z][A-Za-z'\-]*|[.;:!?]", c)
    start = True
    for w in words:
        if w in '.;:!?':
            start = True; continue
        if w[0].isupper() and not start and w.lower() not in STOPCAP and len(w) > 2:
            toks.append(('cap', w))
        start = False
    return toks
def present(tok, text_norm):
    t = norm(tok)
    if t in text_norm:
        return True
    # ordinal / comma tolerance
    t2 = norm(tok.replace(',', ''))
    return t2 in text_norm
out = []
for r in rows:
    cites = {c['key']: c for c in r['citations']}
    for s in r['sub_claims']:
        if s['support'] not in ('supported', 'conflict', 'procedural'):
            continue
        qtexts, ctexts = [], []
        for k in s['citations']:
            c = cites.get(k)
            if not c or c['source_id'] == 'COMPUTED':
                continue
            qtexts.append(c['quote'])
            t = src(c['source_file'])
            a, b = c['text_offset'], c['text_offset_end']
            ctexts.append(t[max(0, a - CTX):b + CTX])
        if not qtexts:
            continue
        qn = norm(' '.join(qtexts)); cn = norm(' '.join(ctexts))
        miss_q, miss_all = [], []
        seen = set()
        for kind, tk in tokens(s['claim']):
            if tk.lower() in seen: continue
            seen.add(tk.lower())
            if not present(tk, qn):
                if present(tk, cn):
                    miss_q.append(tk)
                else:
                    miss_all.append(tk)
        if miss_q or miss_all:
            out.append((r['id'], s['n'], s['tier'], s['support'], miss_q, miss_all, s['claim'][:170]))
print('sub-claims with tokens outside the quotes: %d' % len(out))
for o in out:
    print('%s sub%d %s/%s | ctx-only: %s | NOT NEAR: %s | %s' % o)
