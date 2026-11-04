"""Reads, for every usable arrival_road / march / movement claim of the position ledgers dated 3 July 1863 or earlier, the OCR text of the Official Records around the claim's verified quote
(500 characters either side, inside the claim's own record) and writes the road words found there to data/approach-record-scan.json.

    python -I docs/battle-theatre/app/tools/scan_record_roads.py          (needs tmp/library/or27, the OCR text read by tools/bt/or27_find.py; it only READS tools/bt)

Why: tools/approach-audit.mjs must say, for every formation with an open gap, which claims were looked at. A claim whose own printed fields name no road may still have a road in the sentence
before or after its quote; this file records those sentences (OCR errors kept as printed), so the audit can list them and the review can say why none of them is a road of approach.
Nothing here decides anything: the verdicts are in data/approach-review.json, the roads that were adopted are in data/claim-curation.json.
tests/claims.test.mjs re-runs the scan when the OR text is present and fails when the file differs.
"""
import os, sys, json, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
from or27_find import get_part, norm_query   # noqa: E402  (read only)

APP = os.path.join(ROOT, 'docs', 'battle-theatre', 'app')
OUT = os.path.join(APP, 'data', 'approach-record-scan.json')
POS = os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'positions')
KINDS = ('arrival_road', 'march', 'movement')
LAST_DATE = '1863-07-03'
WINDOW = 500
ROAD = re.compile(r'\b(road|roads|pike|turnpike|route)\b', re.I)


def usable(c):
    return c.get('claim_support_verified') is True and c.get('fidelity_check') in ('passed_full_read', 'corrected') and c.get('tier') in ('documented', 'inferred')


def load_claims():
    out = []
    for L in 'ABCD':
        p = os.path.join(POS, 'positions_%s.jsonl' % L)
        with open(p, encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    r = json.loads(line)
                    r['ledger'] = L
                    out.append(r)
    return out


def main(argv):
    out = OUT
    if '--out' in argv:
        out = argv[argv.index('--out') + 1]
    rows = []
    for c in load_claims():
        if not usable(c) or c['kind'] not in KINDS or (c['when'].get('date') or '') > LAST_DATE:
            continue
        s = c['source']
        rid = s.get('report_id') or s.get('record_id')
        if not rid or not rid.startswith('OR27-'):
            continue
        try:
            P = get_part(int(rid.split('-')[1]))
        except Exception:
            continue
        q = norm_query(s.get('quote') or '')
        pos, found = 0, None
        while q:
            j = P.ntext.find(q, pos)
            if j < 0:
                break
            os_, _ = P.orig_span(j, j + len(q))
            r = P.record_at(os_)
            if r and r['id'] == rid:
                found = j
                break
            pos = j + 1
        if found is None:
            continue
        ctx = P.ntext[max(0, found - WINDOW):found + len(q) + WINDOW]
        ms = list(ROAD.finditer(ctx))
        if not ms:
            continue
        snips, last = [], -1000
        for m in ms:
            if m.start() - last < 120:
                continue
            last = m.start()
            snips.append(ctx[max(0, m.start() - 90):m.end() + 60].replace('\n', ' '))
            if len(snips) == 3:
                break
        rows.append({'claim': c['claim_id'], 'record': rid, 'snippets': snips})
    rows.sort(key=lambda r: r['claim'])
    doc = {'_doc': 'Written by tools/scan_record_roads.py: for each usable arrival_road, march or movement claim dated 3 July 1863 or earlier, the road words in the OCR text of its own record within %d characters of its verified quote (OCR errors kept as printed). A record, not a reading: the verdicts are in approach-review.json.' % WINDOW,
           'window_chars': WINDOW, 'rows': rows}
    with open(out, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(doc, f, indent=1, ensure_ascii=False)
        f.write('\n')
    print('%d claims have a road word in the record around their quote' % len(rows))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
