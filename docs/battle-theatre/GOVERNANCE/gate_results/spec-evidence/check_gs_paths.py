#!/usr/bin/env python3
"""List every backticked token of GATE-SPEC.md that looks like a repository path and say whether it exists.
Adapted from spec-a-evidence/check_paths.py. A token resolves as written from the repository root, under docs/battle-theatre/ and the
common subfolders, or, for a bare file name, as a file of that name anywhere in the repository outside tmp/ and node_modules/.
A token that the file itself announces as absent, planned or generated (the gate runners, their outputs, the scratch files of the
first writing) is counted as announced and not as an error. Reads files only. Usage: python3 -I check_gs_paths.py [path-to-spec]"""
import re, sys, os, glob, json
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, *(['..'] * 5)))
doc = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'GATE-SPEC.md')
text = re.sub(r'```.*?```', '', open(doc, encoding='utf-8').read(), flags=re.S)
B = 'docs/battle-theatre'
bases = ['', B, B + '/GOVERNANCE', B + '/GOVERNANCE/gate_results', B + '/app', 'tools/bt', B + '/app/data', B + '/app/src', B + '/app/tests', B + '/app/docs',
         B + '/structures', B + '/history', B + '/kit', B + '/GOVERNANCE/library', B + '/GOVERNANCE/decisions', B + '/GOVERNANCE/realizations',
         B + '/GOVERNANCE/horde/requests', B + '/GOVERNANCE/evidence_corrections', B + '/GOVERNANCE/timeline_corrections', 'tools/bt/photomatch',
         'tools/bt/realize', B + '/kit/evidence', B + '/environment', B + '/GOVERNANCE/register', 'tests/governance', B + '/BIBLE', 'tools/horde', B + '/life', B + '/medical']
PLANNED = re.compile(r'^(?:tools/bt/gates/.*|gates/.*|q\d\d_[a-z_]+\.(?:py|mjs)|run_gate\.py|run_all\.py|apply_passes\.py|milestone\.py|baseline_pin\.py|ingest_gpu_result\.py|'
                     r'.*gate_results/.*|(?:GOVERNANCE/)?gate_results/.*|Qnn(?:\.prev)?\.json|OAnn\.json|RC-Rnn\.json|Q\d\d\.json|RC-R\d\d\.json|SUMMARY\.json|SR_STATUS\.json|MILESTONE\.json|'
                     r'status_log\.jsonl|review_log\.jsonl|subreq_added\.json|thresholds\.json|rc_items\.json|library_ids\.json|datum_classes\.json|time_layers\.json|'
                     r'runs/.*|latest/.*|evidence/Qnn/|logs/|baselines/.*|extracts\.py|Q18/.*|.*search_logs.*|kit/verified_oob\.json|kit/verified_batteries\.json|'
                     r'.*claim-ledger\.json|.*claims\.json|.*event-cards\.mjs|.*ground_audit.*|.*final-passes.*|tmp/.*|bt-gate-result/1|bt-vegetation/1|n/a|'
                     r'fix2_night_count\.mjs|epilogue\.jsonl|logs/.*|registry/.*|spec-evidence/.*|.*/spec-evidence/.*|\.jsonl|tests/governance/gates/|.*bt-gates-medical-library-status\.md)$')
seen = {}
for m in re.finditer(r'`([^`\n]{3,140})`', text):
    tok = m.group(1).strip()
    if ' ' in tok and not tok.endswith('*'): continue
    if not re.search(r'[A-Za-z0-9_\-]/[A-Za-z0-9_\-*<]|\.(?:json|jsonl|mjs|py|md|txt|sh|js)$', tok): continue
    if tok.startswith(('http', '--', '<')) or re.match(r'^[A-Z]{2,}\d', tok): continue
    seen[tok] = seen.get(tok, 0) + 1
anywhere = {}
def find_anywhere(name):
    if name in anywhere: return anywhere[name]
    hit = False
    for dp, dn, fn in os.walk(ROOT):
        dn[:] = [d for d in dn if d not in ('tmp', 'node_modules', '.git', '__pycache__')]
        if name in fn: hit = True; break
    anywhere[name] = hit; return hit
missing, ok, planned = [], 0, []
for tok in sorted(seen):
    t = tok.split('::')[0].split(' ')[0].rstrip(',.;:')
    t = re.sub(r'\{([^{},]+),[^{}]*\}', r'\1', t)
    found = False
    for b in bases:
        p = os.path.join(ROOT, b, t)
        if '*' in t or '<' in t:
            if glob.glob(re.sub(r'<[^>]*>', '*', p)): found = True; break
        elif os.path.exists(p): found = True; break
    if not found and '/' not in t and not ('*' in t or '<' in t) and find_anywhere(os.path.basename(t)): found = True
    if found: ok += 1
    elif PLANNED.match(t) or PLANNED.match(tok): planned.append(tok)
    else: missing.append(tok)
print(json.dumps({'path_like_tokens': len(seen), 'exist': ok, 'announced_planned_or_generated': len(planned), 'not_found': len(missing)}))
for tok in missing: print('NOT FOUND:', tok)
sys.exit(1 if missing else 0)
