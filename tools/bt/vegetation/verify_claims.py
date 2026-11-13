"""Verify every curated vegetation claim against the saved source text and write tools/bt/vegetation/claims_verified.json.

    python -I tools/bt/vegetation/verify_claims.py            # all claims_*.json
    python -I tools/bt/vegetation/verify_claims.py --only claims_fields.json

A claim file is a JSON list of objects:
  id        unique, e.g. VC-CAL-001
  src       OR27 | NPS:<ID>[#layout] | WS9:<ID>             (srcs.py)
  report    (OR27 only) report id when the quote occurs in more than one report
  quote     the words the claim rests on, copied from the source (letters and digits are compared; hyphenation, line breaks and
            punctuation spacing are not); an OCR misreading in the source is kept in the quote, never corrected
  tier      documented | inferred       (the strongest tier the source supports FOR THE CLAIM AS STATED in `says`)
  kind      regional | crop | orchard | woodlot | thicket | tree | ground | damage | farm_inventory | geometry | gap
  says      one sentence: what the quote establishes (no more than the quote supports)
  feature   what it is about (free text)
  when      {"from": "1863-07-02", "to": "1863-07-02"}  (valid time of the statement; a single date may be given as a string)
  about     structured values the builder reads (crop, stage, height_m, species, class ...)
  anchor    where the feature is, as far as it can be placed (see build_vegetation.py); absent = documented but not placed
  note      reasoning for an inference, or a caveat

The output keeps every field and adds quote_found (the source's own words), locator, src_sha256 and ok. A claim whose quote is not found
is reported and left out of the output: it cannot be cited.
"""
import os, sys, json, glob, argparse

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..'))
import srcs  # noqa: E402

OUT = os.path.join(HERE, 'claims_verified.json')
TIERS = ('documented', 'inferred')
KINDS = ('regional', 'crop', 'orchard', 'woodlot', 'thicket', 'tree', 'ground', 'damage', 'farm_inventory', 'geometry', 'gap')


def load_claims(only=None):
    files = sorted(glob.glob(os.path.join(HERE, 'claims_*.json')))
    files = [f for f in files if os.path.basename(f) != 'claims_verified.json']
    if only:
        files = [f for f in files if os.path.basename(f) == only]
    out = []
    for f in files:
        data = json.load(open(f, encoding='utf-8'))
        for c in data:
            c['_file'] = os.path.basename(f)
            out.append(c)
    return out


def verify_all(claims):
    ok, bad, seen = [], [], set()
    for c in claims:
        why = None
        cid = c.get('id')
        if not cid or cid in seen:
            why = 'missing or repeated id'
        elif c.get('tier') not in TIERS:
            why = 'tier must be documented or inferred (got %r)' % c.get('tier')
        elif c.get('kind') not in KINDS:
            why = 'kind %r is not one of %s' % (c.get('kind'), ', '.join(KINDS))
        elif not c.get('says') or not c.get('quote') or not c.get('src'):
            why = 'says, quote and src are required'
        seen.add(cid)
        if why is None:
            try:
                r = srcs.verify(c['src'], c['quote'], report=c.get('report'))
                if not r.get('ok') and c['src'].startswith('NPS:') and '#' not in c['src']:      # two-column pages: the layout and raw texts keep the columns apart
                    for var in ('layout', 'raw'):
                        try:
                            r2 = srcs.verify(c['src'] + '#' + var, c['quote'])
                        except Exception:
                            continue
                        if r2.get('ok'):
                            r, c['src'] = r2, c['src'] + '#' + var
                            break
            except Exception as e:  # a missing source file is a failed lookup, said as such
                r = {'ok': False, 'error': 'source not readable: %s' % e}
            if not r.get('ok'):
                why = 'quote not found in %s%s' % (c['src'], (' (' + r['error'] + ')') if r.get('error') else '')
            else:
                d = dict(c)
                d['quote_found'] = r['found']
                d['locator'] = r['locator']
                d['match_count'] = r['count']
                if 'sha256' in r:
                    d['src_sha256'] = r['sha256']
                d['ok'] = True
                ok.append(d)
        if why:
            bad.append((cid, c.get('_file'), why, (c.get('quote') or '')[:90]))
    return ok, bad


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only')
    ap.add_argument('--no-write', action='store_true')
    a = ap.parse_args()
    claims = load_claims(a.only)
    ok, bad = verify_all(claims)
    multi = [c['id'] for c in ok if c['match_count'] > 1]
    for cid, f, why, q in bad:
        print('FAIL %s [%s] %s | %s' % (cid, f, why, q))
    if multi:
        print('NOTE %d claims match more than one place (first is cited): %s' % (len(multi), ', '.join(multi[:12])))
    print('%d claims read, %d verified, %d failed' % (len(claims), len(ok), len(bad)))
    if not a.only and not a.no_write:
        for c in ok:
            c.pop('_file', None)
        json.dump(ok, open(OUT, 'w', encoding='utf-8'), indent=0, ensure_ascii=False)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
