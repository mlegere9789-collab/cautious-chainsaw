#!/usr/bin/env python3
"""List every backticked token of GATE-SPEC-A.md that looks like a repository path and say whether it exists.
Resolution order: as written from the repository root, then under docs/battle-theatre/, GOVERNANCE/, GOVERNANCE/gate_results/, app/, tools/bt/.
A token with a glob star is tested with glob. Reads files only. Usage: python3 -I check_paths.py [path-to-spec]"""
import re, sys, os, glob, json
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from plan_lib import SPEC, ROOT, GOV
doc = sys.argv[1] if len(sys.argv) > 1 else SPEC
text = open(doc, encoding='utf-8').read()
text = re.sub(r'```.*?```', '', text, flags=re.S)
bases = ['', 'docs/battle-theatre', 'docs/battle-theatre/GOVERNANCE', 'docs/battle-theatre/GOVERNANCE/gate_results', 'docs/battle-theatre/app', 'tools/bt', 'docs/battle-theatre/app/data', 'docs/battle-theatre/app/tests', 'docs/battle-theatre/app/src']
seen = {}
for m in re.finditer(r'`([^`\n]{3,120})`', text):
    tok = m.group(1).strip()
    if ' ' in tok and not tok.endswith('*'): continue
    if not re.search(r'[A-Za-z0-9_\-]/[A-Za-z0-9_\-*]|\.(?:json|jsonl|mjs|py|md|txt|sh|js)$', tok): continue
    if tok.startswith(('http', '--', '<')) or re.match(r'^[A-Z]{2,}\d', tok): continue
    seen[tok] = seen.get(tok, 0) + 1
missing, ok = [], 0
for tok in sorted(seen):
    t = tok.split('::')[0].split(' ')[0].rstrip(',.;:')
    found = False
    for b in bases:
        p = os.path.join(ROOT, b, t)
        if '*' in t or '<' in t:
            if glob.glob(re.sub(r'<[^>]*>', '*', p)): found = True; break
        elif os.path.exists(p): found = True; break
    if found: ok += 1
    else: missing.append(tok)
print(json.dumps({'path_like_tokens': len(seen), 'exist': ok, 'not_found': len(missing)}))
for tok in missing: print('NOT FOUND:', tok)
