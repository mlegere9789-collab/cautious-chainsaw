"""Confirms, in the OCR text of the Official Records, every curated phrase whose phrase_in is 'record' (data/claim-curation.json) and writes data/claim-phrase-verification.json.

    python -I docs/battle-theatre/app/tools/verify_claim_phrases.py          (needs tmp/library/or27, the OCR text read by tools/bt/or27_find.py; it only READS tools/bt)

A phrase is confirmed when it occurs (whitespace-normalised, hyphenation joined, case-sensitive, OCR errors kept as printed) inside the record named by the claim's source
(report_id), at most 600 characters from the claim's own verified quote (a curation row may name a wider `window_chars`, at most 2000, when the sentence that prints the road is a few lines after the
claim's quote; the result then carries the window). The result names the record, the printed page and the character distance from the quote.
tests/claims.test.mjs re-runs the check when the OR text is present and fails when the file differs.
"""
import os, sys, json, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
from or27_find import get_part, norm_query   # noqa: E402  (read only)

APP = os.path.join(ROOT, 'docs', 'battle-theatre', 'app')
CUR = os.path.join(APP, 'data', 'claim-curation.json')
OUT = os.path.join(APP, 'data', 'claim-phrase-verification.json')
POS = os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'positions')
WINDOW = 600


def load_claims():
    claims = {}
    for L in 'ABCD':
        p = os.path.join(POS, 'positions_%s.jsonl' % L)
        if not os.path.exists(p):
            continue
        with open(p, encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    r = json.loads(line)
                    claims[r['claim_id']] = r
    return claims


def main(argv):
    out = OUT
    if '--out' in argv:
        out = argv[argv.index('--out') + 1]
    cur = json.load(open(CUR, encoding='utf-8'))
    claims = load_claims()
    want = []
    for sect in ('approach', 'stops', 'departures'):
        for e in cur.get(sect, []):
            if e.get('phrase_in') == 'record':
                want.append((sect, e))
    results = []
    for sect, e in want:
        c = claims.get(e['claim'])
        if c is None:
            results.append({'claim': e['claim'], 'phrase': e['phrase'], 'found': False, 'why': 'no such claim'})
            continue
        s = c['source']
        rid = s.get('report_id') or s.get('record_id')
        part = int(rid.split('-')[1])
        P = get_part(part)
        q = norm_query(s.get('quote') or '')
        ph = norm_query(e['phrase'])
        res = {'claim': e['claim'], 'phrase': e['phrase'], 'record': rid, 'found': False}
        # position of the claim's quote inside its record
        qpos = None
        pos = 0
        while q:
            i = P.ntext.find(q, pos)
            if i < 0:
                break
            os_, _ = P.orig_span(i, i + len(q))
            r = P.record_at(os_)
            if r and r['id'] == rid:
                qpos = i
                break
            pos = i + 1
        if qpos is None:
            res['why'] = 'the claim quote is not found inside its record'
            results.append(res)
            continue
        win = int(e.get('window_chars') or WINDOW)
        if win < WINDOW or win > 2000:
            res['why'] = 'window_chars must be between %d and 2000' % WINDOW
            results.append(res)
            continue
        if win != WINDOW:
            res['window_chars'] = win
        lo, hi = max(0, qpos - win), min(len(P.ntext), qpos + len(q) + win)
        j = P.ntext.find(ph, lo, hi + len(ph))
        if j < 0:
            res['why'] = 'the phrase is not within %d characters of the quote' % win
            results.append(res)
            continue
        os_, oe = P.orig_span(j, j + len(ph))
        r = P.record_at(os_)
        cite = P.cite(os_, oe)
        res.update({'found': bool(r and r['id'] == rid), 'page': cite['page'], 'distance_from_quote': abs(j - qpos), 'cite': cite['cite']})
        results.append(res)
    doc = {'_doc': 'Written by tools/verify_claim_phrases.py: each curated phrase with phrase_in "record" located in the OR27 OCR text, inside the record of its claim and within %d characters of the claim\'s verified quote.' % WINDOW,
           'window_chars': WINDOW, 'results': results}
    with open(out, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(doc, f, indent=1, ensure_ascii=False)
        f.write('\n')
    ok = sum(1 for r in results if r['found'])
    print('%d phrases checked, %d confirmed' % (len(results), ok))
    for r in results:
        if not r['found']:
            print('NOT CONFIRMED', r['claim'], r['phrase'], r.get('why'))
    return 0 if ok == len(results) else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
