"""Pages named in the text of a row (basis, text, scenarios, sub-claims) against the pages of its citations: python3 -I tmp/tl-03/audit/pagetext.py"""
import os, re, json, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
rows = [json.loads(l) for l in open(os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/timeline_corrections/tl-03.jsonl'), encoding='utf-8')]
bad = 0
for r in rows:
    cp = {}
    for c in r['citations']:
        if c['source_id'] == 'OR27':
            pages = set(int(x) for x in re.findall(r'\d+', c['printed_page']))
            if len(pages) == 2:
                a, b = sorted(pages); pages = set(range(a, b + 1))
            cp.setdefault(c['report_id'].split('-')[-1], set()).update(pages)
    texts = [r['corrected_claim']['time_window']['basis'], r['corrected_claim']['text'], r['corrected_claim']['event']] + [s['claim'] for s in r['sub_claims']] + [sc['basis'] + ' ' + sc['value'] for sc in r['scenarios']]
    for t in texts:
        for m in re.finditer(r'\b(R\d{3}|D\d{4})\b[^;,.()]{0,25}?\bpp?\.\s?(\d{2,4})(?:[-–](\d{2,4}))?', t):
            rep, p1, p2 = m.group(1), int(m.group(2)), m.group(3)
            want = set(range(p1, int(p2) + 1)) if p2 and int(p2) > p1 else {p1}
            have = cp.get(rep)
            if have is None: continue
            if not (want & have):
                bad += 1
                print('%s: text says %s p.%s%s, citations of that report have pages %s | ...%s' % (r['id'], rep, p1, ('-' + p2) if p2 else '', sorted(have), t[max(0, m.start() - 40):m.end() + 20].replace('\n', ' ')))
print('mismatches', bad)
