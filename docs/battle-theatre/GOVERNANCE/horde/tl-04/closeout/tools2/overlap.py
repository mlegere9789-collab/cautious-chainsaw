"""Content-word coverage of every documented, supported sub-claim by the quotes it cites (a heuristic for claims that go beyond their quotes; listed for reading).
Words of 5+ letters of the claim (stop words and words of the unit/place vocabulary removed) that are in none of the cited quotes (stem match on the first 5 letters)."""
import json, re, sys
G = '/home/user/cautious-chainsaw/docs/battle-theatre/GOVERNANCE/'
rows = [json.loads(l) for l in open(G + 'timeline_corrections/tl-04.jsonl', encoding='utf-8')]
STOP = set('''about above after again against along also another around before being between brigade division corps regiment battery report reports according their there these those which while would could should through during until where
because without within under later earlier first second third night evening morning afternoon Gettysburg town hill ridge road pike July seed states stated reads states said says carried shown given named place position division's
army union confederate official records source texts text claim row rows hours hour hours approximately about not documented supported same other more most many some such only then than that this with from have has had were was are and for the its his her one two three four five'''.lower().split())
thr = float(sys.argv[1]) if len(sys.argv) > 1 else 0.7
want = set(sys.argv[2:])
n = 0; fl = 0
for r in rows:
    if want and r['id'] not in want:
        continue
    cit = {c['key']: c for c in r['citations']}
    for s in r['sub_claims']:
        if s['tier'] != 'documented' or s['support'] not in ('supported',):
            continue
        n += 1
        qt = ' '.join((cit[k].get('quote') or '') + ' ' + (cit[k].get('author') or '') + ' ' + (cit[k].get('report_heading') or '') + ' ' + (cit[k].get('witness') or '') + ' ' + (cit[k].get('note') or '') + ' ' + (cit[k].get('reading') or '') for k in s['citations'] if k in cit).lower()
        qt = re.sub(r'[^a-z0-9 ]', ' ', qt)
        qstems = set(w[:5] for w in qt.split())
        words = [w for w in re.findall(r"[A-Za-z][A-Za-z']{4,}", s['claim'])]
        words = [w for w in words if w.lower() not in STOP]
        miss = [w for w in words if w.lower()[:5] not in qstems]
        cov = 1 - len(miss) / max(1, len(words))
        if cov < thr and len(miss) >= 3:
            fl += 1
            print('%s SUB%d cov %.2f missing %s\n    claim: %s' % (r['id'], s['n'], cov, miss[:10], s['claim'][:260]))
print('checked', n, 'flagged', fl)
