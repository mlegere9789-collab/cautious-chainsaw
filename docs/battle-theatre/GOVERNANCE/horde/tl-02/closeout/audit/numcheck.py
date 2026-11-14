"""Independent check: numbers in documented sub-claims versus the cited quotes (run: python3 -I tmp/tl-02/audit/numcheck.py [--all]).
For every sub-claim with tier documented and support supported/conflict, every numeric token of the claim text must occur in one of the
cited quotes (OCR-tolerant: 10.15 = 10. 15 = 10:15, thousands commas ignored, number words 'one hundred' not converted).  Tokens that do not occur
are listed for reading: they are either derived values (stated in the note), OCR corrections read on the page image, or defects."""
import os, re, sys, json
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
rows = [json.loads(l) for l in open(os.path.join(G, 'timeline_corrections', 'tl-02.jsonl'), encoding='utf-8')]
NUMW = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'eleven': 11, 'twelve': 12, 'fourteen': 14, 'twenty': 20}
def toks(s):
    s = re.sub(r'(?<=\d),(?=\d{3})', '', s)
    s = re.sub(r'(\d)\s*[.:]\s*(\d)', r'\1.\2', s)
    out = []
    for m in re.finditer(r'\d+(?:\.\d+)?', s):
        t = m.group(0)
        out.append(t)
    return out
def canon(t):
    return t.rstrip('0').rstrip('.') if '.' in t else t
bad = 0
for r in rows:
    cites = {c['key']: c for c in r['citations']}
    for s in r['sub_claims']:
        if s['tier'] != 'documented' or s['support'] not in ('supported', 'conflict'):
            continue
        qs = ' '.join((cites[k].get('quote') or '') + ' ' + (cites[k].get('note') or '') + ' ' + (cites[k].get('value') or '') for k in s['citations'] if k in cites)
        qt = set(canon(t) for t in toks(qs))
        qraw = re.sub(r'\s+', ' ', qs)
        miss = []
        for t in toks(s['claim']):
            if canon(t) in qt: continue
            # ordinal / clock forms such as 9.30 vs 9:30 vs "9 30"
            if re.search(r'(?<!\d)' + re.escape(t).replace(r'\.', r'\s*[.:,]?\s*') + r'(?!\d)', qraw): continue
            miss.append(t)
        if miss:
            bad += 1
            print('%s sub %d [%s]: numbers not in cited quote/note: %s | %s' % (r['id'], s['n'], ','.join(s['citations']), miss, s['claim'][:170]))
print('sub-claims with numbers not found in their cited text:', bad)
