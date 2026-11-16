"""Short extracts for the vegetation claims (the plan's rule: quote at most a short phrase, under 15 words; gate T-Q21-1 and T-Q02-1).

    python -I tools/bt/vegetation/short_quotes.py              # read claims_verified.json, write claims_extracts.json, print what needs a look
    python -I tools/bt/vegetation/short_quotes.py --review A B # print claims A..B (index) with their passage, the extract chosen and what it leaves out
    python -I tools/bt/vegetation/short_quotes.py --check      # exit 1 when claims_extracts.json is not what this run would write

A claim keeps its whole passage in the working files of this folder (claims_*.json, claims_verified.json: public-domain or government texts, never shipped). What the data file
carries as the claim's quote is an EXTRACT of at most 14 words, copied letter for letter from the saved text of the source, inside the passage, found again in that text (the
skeleton compare of srcs.py and, where the gate library is on the machine, its own fold compare: the one the gate runs) and placed (character offsets, printed page for the
Official Records). Which words of the passage the extract takes is chosen by a plain rule (the window of up to 14 words that holds the most of what the claim states: numbers, crops,
trees, states, names) and then READ by a person against the claim's sentence: an extract chosen by hand is in short_quotes_curated.json (id -> the words), with the reason.

An extract never states more than the passage does and never less than the claim needs from it: where no 14 words carry the claim, the claim's own sentence (`says`) is the
paraphrase (the plan: paraphrase everything else) and the extract is the part of the passage that names the crop, the tree, the number or the state, which the sentence then rests on.
"""
import os, re, sys, json, argparse

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..'))
import srcs  # noqa: E402

ROOT = srcs.ROOT
VERIFIED = os.path.join(HERE, 'claims_verified.json')
CURATED = os.path.join(HERE, 'short_quotes_curated.json')
OUT = os.path.join(HERE, 'claims_extracts.json')
MAXW = 14

STOP = set('''a an the and or but nor of in on at to for from by with as is are was were be been being it its this that these those there their they them he his her she him we us you your i
not no so than then too very can could may might must shall should will would do did does done have has had having which who whom whose what when where while whether into onto upon over under
about after before between through during against among within without also such some any all each both more most other another only own same up down out off again once just now still yet
one two three four five six seven eight nine ten per'''.split())
# words that carry what a vegetation claim states (weighted above the ordinary content words)
VEG = set('''wheat wheatfield corn cornfield oats oat rye barley hay grass grasses clover timothy meadow meadows pasture pastures stubble shock shocks sheaves harvest harvested harvesting ripe ripened
ripening green unripe yellow golden standing cut mown mowed reaped threshed trampled trodden tramped crushed flattened ruined destroyed damaged stripped scarred splintered
orchard orchards peach peaches apple apples cherry cherries pear fruit trees tree woods wood woodlot timber forest grove thicket scrub brush bushes underbrush undergrowth oak oaks chestnut hickory pine
cedar poplar walnut locust maple beech elm sassafras laurel dogwood leaves leaf foliage branches trunk trunks stumps boulders rocks rocky stony marsh swamp meadows field fields
potatoes potato flax buckwheat garden gardens yard barnyard lawn hedge hedges fence rails fenced cleared open denuded bare wooded thickly heavily lightly sparse dense thick'''.split())


def toks(s):
    return s.split()


def norm(t):
    t = re.sub(r'[^0-9A-Za-z]', '', t).lower()
    return t[:-1] if len(t) > 3 and t.endswith('s') and not t.endswith('ss') else t


def key_weights(says, about, feature, passage):
    """weights of the tokens (normalised) that the claim states and the passage holds"""
    pt = {norm(t) for t in toks(passage)}
    caps = {norm(t) for t in re.findall(r"\b[A-Z][a-z]{2,}\b", (says or '') + ' ' + (feature or ''))}
    abouts = set()
    for v in json.dumps(about or {}).replace('"', ' ').replace('_', ' ').split():
        abouts.add(norm(v))
    w = {}
    for t in re.findall(r"[0-9][0-9,.]*|[A-Za-z][A-Za-z'-]+", (says or '') + ' ' + (feature or '')):
        n = norm(t)
        if not n or n in w or n not in pt:
            continue
        if re.match(r'^\d', t):
            w[n] = 4.0
        elif n in VEG or n in abouts:
            w[n] = 3.0
        elif n in caps:
            w[n] = 1.5
        elif n not in STOP and len(n) > 3:
            w[n] = 1.0
    return w


def ranked_windows(passage, says, about, feature, maxw=MAXW, top=400):
    """every window of 3 to maxw words of the passage, best first: (score, coverage, words)"""
    tk = toks(passage)
    if len(tk) <= maxw:
        return [(9.0, 1.0, passage)]
    w = key_weights(says, about, feature, passage)
    tot = sum(w.values()) or 1.0
    nt = [norm(t) for t in tk]
    cands = []
    for i in range(len(tk)):
        for L in range(3, maxw + 1):
            j = i + L
            if j > len(tk):
                break
            cov = set(n for n in nt[i:j] if n in w)
            sc = sum(w[n] for n in cov) - 0.04 * L
            if i == 0 or re.search(r'[.;:!?,]["\')\]]*$', tk[i - 1]):
                sc += 0.6
            if j == len(tk) or re.search(r'[.;:!?,]["\')\]]*$', tk[j - 1]):
                sc += 0.4
            if nt[i] in STOP and i > 0 and not re.search(r'[.;:!?,]$', tk[i - 1]):
                sc -= 0.5
            if nt[j - 1] in STOP and j < len(tk):
                sc -= 0.5
            cands.append((sc, sum(w[n] for n in cov) / tot, ' '.join(tk[i:j])))
    cands.sort(key=lambda x: (-x[0], len(x[2])))
    return cands[:top]


def best_window(passage, says, about, feature, maxw=MAXW):
    r = ranked_windows(passage, says, about, feature, maxw, top=1)[0]
    return r[2], r[1], len(r[2].split())


def gate_store():
    """the gate's own text store, when its library is on the machine (tools/bt/gates/lib); None otherwise"""
    gl = os.path.join(ROOT, 'tools', 'bt', 'gates', 'lib')
    if not os.path.isdir(gl):
        return None, None
    sys.path.insert(0, gl)
    try:
        import pq_common as pq  # noqa: E402
        import extracts as ex  # noqa: E402
        env = pq.Env(ROOT)
        return ex, ex.TextStore(env)
    except Exception as e:                                    # the gate library moved or a text is absent: said, never a pass
        print('NOTE the gate library could not be used (%s: %s)' % (type(e).__name__, str(e)[:120]))
        return None, None


def gate_id(c):
    """the id the gate's text store knows: the report id for the Official Records, the library id (no family, no variant) for the others"""
    src = c['src']
    if src == 'OR27':
        return c['locator'].get('report')
    return src.split(':', 1)[1].split('#')[0]


def run(write=True):
    claims = json.load(open(VERIFIED, encoding='utf-8'))
    cur = json.load(open(CURATED, encoding='utf-8')) if os.path.exists(CURATED) else {}
    ex, ts = gate_store()
    out, flags = [], []
    for c in claims:
        cid = c['id']
        passage = c['quote'] if c.get('restored') else c['quote_found']
        why = None
        if cid in cur:
            cand = cur[cid]['extract'] if isinstance(cur[cid], dict) else cur[cid]
            why = cur[cid].get('why') if isinstance(cur[cid], dict) else None
            cov, n, how = None, len(cand.split()), 'curated'
        else:
            cand, cov, n = best_window(passage, c['says'], c.get('about'), c.get('feature'))
            how = 'whole' if n == len(passage.split()) and len(passage.split()) <= MAXW else 'rule'
        r = srcs.verify(c['src'], cand, report=c['locator'].get('report') if c['src'] == 'OR27' else None)
        rec = {'id': cid, 'how': how, 'words': len(cand.split()), 'coverage': None if cov is None else round(cov, 2)}
        if not r.get('ok'):
            rec.update(ok=False, extract=cand, error='the extract is not found in the saved text of ' + c['src'])
            flags.append((cid, rec['error']))
            out.append(rec)
            continue
        found = r['found']
        rec['extract'] = found                                 # the source's own words, whitespace collapsed
        if c.get('restored'):
            rec['printed'] = cand if r.get('defect') else None
        rec['locator'] = {k: v for k, v in r['locator'].items() if k in ('char_start', 'char_end', 'pdf_page', 'page', 'report', 'who')}
        if c['src'] == 'OR27':
            rec['locator']['report'] = c['locator'].get('report')
            rec['locator']['who'] = c['locator'].get('who')
        rec['passage'] = [c['locator'].get('char_start'), c['locator'].get('char_end')]
        if len(found.split()) > MAXW:
            rec.update(ok=False, error='more than %d words' % MAXW)
            flags.append((cid, rec['error']))
        elif len(re.sub(r'\W', '', found)) < 12:
            rec.update(ok=False, error='fewer than 12 letters and digits')
            flags.append((cid, rec['error']))
        else:
            rec['ok'] = True
        if why:
            rec['why'] = why
        if ts is not None and rec.get('ok'):
            gid = gate_id(c)
            if c['src'] == 'OR27':
                g = ts.find_or27(found, gid, None)
            else:
                g = ts.find(gid, found) if ts.has_text(gid) else {'status': 'no_text'}
            rec['gate'] = g.get('status')
            if g.get('status') != 'found':
                flags.append((cid, 'the gate library does not find the extract (%s)' % g.get('status')))
            else:
                okn, miss = ex.numbers_in_span(c['says'], found + ' ' + (g.get('span_text') or ''))
                rec['numbers_in_span'] = bool(okn)
                if not okn:
                    rec['numbers_missing'] = miss
        out.append(rec)
    if write:
        with open(OUT, 'w', encoding='utf-8') as f:
            json.dump(out, f, indent=0, ensure_ascii=False)
    return claims, out, flags


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--review', nargs=2, type=int)
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--no-write', action='store_true')
    ap.add_argument('--only')
    a = ap.parse_args()
    claims, out, flags = run(write=not (a.no_write or a.review or a.check))
    if a.review:
        lo, hi = a.review
        for i in range(lo, min(hi, len(claims))):
            c, e = claims[i], out[i]
            passage = c['quote'] if c.get('restored') else c['quote_found']
            print('#%d %s [%s] %s%s' % (i, c['id'], c['src'], c['tier'], ' RESTORED' if c.get('restored') else ''))
            print('  SAYS:   %s' % c['says'])
            if len(passage.split()) > MAXW:
                print('  PASSAGE(%dw): %s' % (len(passage.split()), passage))
            print('  EXTRACT(%dw,%s,cov=%s,gate=%s,nums=%s): %s' % (e['words'], e['how'], e['coverage'], e.get('gate'), e.get('numbers_in_span'), e['extract']))
        return 0
    if a.check:
        prev = json.load(open(OUT, encoding='utf-8')) if os.path.exists(OUT) else None
        same = prev == json.loads(json.dumps(out))
        print('check: ' + ('same' if same else 'DIFFERENT'))
        return 0 if same and not flags else 1
    n_whole = sum(1 for e in out if e['how'] == 'whole')
    n_rule = sum(1 for e in out if e['how'] == 'rule')
    n_cur = sum(1 for e in out if e['how'] == 'curated')
    low = [e for e in out if e['how'] == 'rule' and (e['coverage'] or 0) < 0.7]
    nums = [e for e in out if e.get('numbers_in_span') is False]
    print('%d claims: %d whole passage (14 words or fewer), %d chosen by the rule, %d curated; %d with coverage under 70%%; %d with numbers not in the span; %d flagged' % (len(out), n_whole, n_rule, n_cur, len(low), len(nums), len(flags)))
    for cid, why in flags[:40]:
        print('FLAG', cid, why)
    return 1 if flags else 0


if __name__ == '__main__':
    sys.exit(main())
