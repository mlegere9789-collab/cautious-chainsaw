"""Build docs/battle-theatre/GOVERNANCE/conflicts_structured.json from the hand transcription and verify it against the parsed PDF register
(ids, topics, every printed value present in the PDF block). Fails loudly on any mismatch. Defaults stay PENDING OWNER (Law cl.6)."""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from conflicts_structured_data import C
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
parsed = {c['id']: c for c in json.load(open(os.path.join(G, 'conflict_register.json'), encoding='utf-8'))}
norm = lambda s: re.sub(r'[\s|"“”’\']+', '', s).lower()
out, bad = [], []
if set(parsed) != set(C): bad.append(f'id mismatch {sorted(set(parsed) ^ set(C))}')
for cid, (topic, vals, default, alts) in C.items():
    blob = norm(parsed[cid]['text'])
    for piece in [topic] + vals + [default] + [a for a in alts if a not in ('both', 'all', 'each', 'none', 'other two', 'other three', 'others')]:
        # PDF cells wrap across lines; compare with whitespace/pipes/quotes removed, ignore trailing source-key parentheses
        key = norm(re.sub(r'\s*\([^)]*\)$', '', piece))
        if key and key not in blob: bad.append(f'{cid}: "{piece}" not found in PDF block')
    out.append({'id': cid, 'topic': topic, 'values': [{'label': v} for v in vals], 'pdf_recommended_default': default, 'selectable_alternatives': alts,
                'owner_decision': None, 'status': 'PENDING OWNER', 'page': parsed[cid]['page']})
if bad:
    print('\n'.join(bad)); sys.exit(1)
json.dump({'_doc': 'PDF B.2.5 conflict register, structured. pdf_recommended_default is the PDF\'s recommendation, NOT an owner decision. Every value stays selectable (PDF B.2.5 rule).', 'conflicts': out}, open(os.path.join(G, 'conflicts_structured.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
print('conflicts_structured.json:', len(out), 'entries verified against PDF text')
