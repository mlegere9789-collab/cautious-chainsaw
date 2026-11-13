#!/usr/bin/env python3
"""Recompute, from the files in the working tree, the governance counts that GATE-SPEC-B.md states in sections 2.1 to 2.4.
Read-only; writes nothing. Prints one JSON object.   Run: python3 -I docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/facts.py"""
import json, os, re, sys, hashlib, collections, glob
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), *(['..'] * 5)))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
J = lambda p: json.load(open(os.path.join(G, p), encoding='utf-8'))
JL = lambda p: [json.loads(l) for l in open(os.path.join(G, p), encoding='utf-8') if l.strip()]
C = collections.Counter
out = {}

gates = J('gates.json'); out['gates_keys_in_file_order'] = list(gates)
req = J('requirements.json'); subs = req['sub_requirements']
out['requirements'] = len(req['requirements']); out['sub_requirements'] = len(subs)
out['origin'] = dict(C(s['origin'] for s in subs)); out['source_status'] = dict(C(s['source_status'] for s in subs))
out['passes_true'] = sum(bool(s['passes']) for s in subs)
out['sub_fields'] = sorted({k for s in subs for k in s})
# rows and ids per gate
per = collections.defaultdict(list)
for s in subs:
    for g in s['gate_ids']: per[g].append(s['id'])
out['rows_per_gate'] = {g: len(per[g]) for g in sorted(per)}
out['rows_without_gate'] = [s['id'] for s in subs if not s['gate_ids']]
out['gate_count_per_row'] = dict(C(len(s['gate_ids']) for s in subs))
out['gate_order_examples'] = {
    'timeline R11.0001': next((s['gate_ids'] for s in subs if s['id'] == 'R11.0001'), None),
    'catalogue R12.001': next((s['gate_ids'] for s in subs if s['id'] == 'R12.001'), None),
    'epilogue R22.0001': next((s['gate_ids'] for s in subs if s['id'] == 'R22.0001'), None)}
# requirements per gate (which requirement ids)
rq = {}
for g, ids in per.items(): rq[g] = sorted({i.split('.')[0] for i in ids})
out['requirement_ids_per_gate'] = {g: rq[g] for g in sorted(rq)}

reg = J('register_index.json')
out['register_entries'] = len(reg); out['register_status'] = dict(C(e['status'] for e in reg)); out['register_tier'] = dict(C(e['tier'] for e in reg))
rp = os.path.join(G, 'register', 'proposed')
out['register_proposed_shard_dirs'] = sorted(d for d in os.listdir(rp) if os.path.isdir(os.path.join(rp, d))) if os.path.isdir(rp) else None
out['register_alias_count'] = len(J('register_aliases.json'))
horde = os.path.join(G, 'horde')
pf = sorted(d for d in os.listdir(horde) if os.path.isdir(os.path.join(horde, d, 'proposed-register')))
out['horde_proposed_register_dirs'] = len(pf); out['horde_proposed_register_names'] = pf
links = J('subreq_links.json')
out['subreq_links_rows'] = len(links)
st = C()
for k, v in links.items():
    if isinstance(v, dict): st[v.get('status')] += 1
    elif isinstance(v, list):
        for x in v: st[x.get('status') if isinstance(x, dict) else None] += 1
out['subreq_links_status'] = dict(st)

seed = JL('timeline_seed.jsonl')
out['timeline_seed_rows'] = len(seed); out['timeline_seed_status'] = dict(C(r['status'] for r in seed)); out['timeline_seed_tier'] = dict(C(r['tier'] for r in seed))
ver = JL('timeline_verified.jsonl')
out['timeline_verified_rows'] = len(ver); out['timeline_verified_status_effective'] = dict(C(r.get('status_effective') for r in ver))
out['timeline_verified_fields'] = sorted({k for r in ver for k in r})
out['timeline_verified_with_register_refs'] = sum(1 for r in ver if r.get('register_refs'))
win = JL('timeline_windows.jsonl')
out['timeline_windows_rows'] = len(win); out['timeline_windows_parse_status'] = dict(C(r.get('parse_status') for r in win))
out['timeline_windows_fields'] = sorted({k for r in win for k in r})
epi = JL('epilogue_seed.jsonl'); out['epilogue_rows'] = len(epi); out['epilogue_status'] = dict(C(r.get('status') for r in epi)); out['epilogue_ids'] = [epi[0]['id'], epi[-1]['id']] if epi else None
conf = J('conflict_register.json'); out['conflict_register_rows'] = len(conf)
cs = J('conflicts_structured.json'); out['conflicts_structured_type'] = type(cs).__name__
try:
    rows = cs if isinstance(cs, list) else cs.get('conflicts', list(cs.values()))
    out['conflicts_structured_rows'] = len(rows)
    out['conflicts_structured_status'] = dict(C((r.get('status') if isinstance(r, dict) else None) for r in rows))
except Exception as e: out['conflicts_structured_err'] = str(e)
b = J('budget/phase_budget.json')
ph = b.get('phases', b)
out['budget_phases'] = len(ph) if hasattr(ph, '__len__') else None
try:
    pl = ph if isinstance(ph, list) else list(ph.values())
    out['budget_caps_all_null'] = all(p.get(k) is None for p in pl for k in ('token_cap', 'usd_cap', 'gpu_hours_cap') if isinstance(p, dict))
    out['budget_owner_approved'] = dict(C(p.get('owner_approved') for p in pl if isinstance(p, dict)))
except Exception as e: out['budget_err'] = str(e)

for f in ('status.json', 'status_2.json', 'acquired.json', 'acquired_2.json', 'candidates.json', 'figures-ledger.json'):
    p = os.path.join(G, 'library', f)
    out['library_' + f] = os.path.exists(p)
for f in ('status.json', 'status_2.json'):
    p = os.path.join(G, 'library', f)
    if os.path.exists(p):
        d = json.load(open(p, encoding='utf-8'))
        srcs = d.get('sources', d)
        if isinstance(srcs, dict): srcs = [dict(v, id=k) if isinstance(v, dict) else {'id': k, 'status': v} for k, v in srcs.items() if not k.startswith('_')]
        out['library_' + f + '_sources'] = len(srcs)
        out['library_' + f + '_status'] = dict(C(s.get('status') for s in srcs if isinstance(s, dict)))

# file hashes
def h(p):
    return hashlib.sha256(open(p, 'rb').read()).hexdigest()[:16]
hs = {}
for rel in ('GOVERNANCE/gates.json', 'GOVERNANCE/requirements.json', 'GOVERNANCE/register_index.json', 'GOVERNANCE/register_aliases.json', 'GOVERNANCE/timeline_seed.jsonl', 'GOVERNANCE/timeline_verified.jsonl', 'GOVERNANCE/timeline_windows.jsonl', 'GOVERNANCE/subreq_links.json', 'GOVERNANCE/conflict_register.json', 'GOVERNANCE/epilogue_seed.jsonl'):
    hs[rel.split('/')[-1]] = h(os.path.join(ROOT, 'docs', 'battle-theatre', rel))
for rel in ('tools/bt/check_governance.py', 'tools/bt/check_coverage.py', 'tools/bt/link_subreqs.py'):
    hs[rel.split('/')[-1]] = h(os.path.join(ROOT, rel))
out['sha256_16'] = hs

# ---- inputs watch: announced inputs of the gates, present or absent now (GATE-SPEC-B.md sections 2.1 and 8). Paths are relative to docs/battle-theatre unless they start with tools/ or tmp/ or tests/.
BT = os.path.join(ROOT, 'docs', 'battle-theatre')
def where(p):
    return os.path.join(ROOT, p) if p.split('/')[0] in ('tools', 'tmp', 'tests') else os.path.join(BT, p)
def stat(p):
    a = where(p)
    if not os.path.exists(a): return 'absent'
    if os.path.isdir(a):
        names = sorted(os.listdir(a)); return {'dir': True, 'entries': len(names), 'first': names[:6]}
    return {'bytes': os.path.getsize(a)}
WATCH = ['GOVERNANCE/realizations', 'GOVERNANCE/timeline_corrections', 'GOVERNANCE/evidence_corrections', 'GOVERNANCE/final-passes', 'GOVERNANCE/gate_results', 'GOVERNANCE/decisions',
         'kit/verified_oob.json', 'kit/verified_batteries.json', 'kit/evidence', 'history/undrawn', 'app/docs/GATE-HOOKS.md', 'app/docs/EXT-CONTRACT.md', 'app/src/ext', 'app/data/vegetation.json',
         'tools/bt/realize', 'tools/bt/vegetation', 'tools/bt/photomatch/nps_then_now.json', 'tools/bt/check_governance.py', 'tools/bt/check_coverage.py', 'tests/governance',
         'tmp/pdf/plan-clean.txt', 'tmp/library/misc', 'tmp/library/or27', 'tmp/library/ws9', 'GOVERNANCE/gate_results/GATE-SPEC-A.md']
out['inputs_watch'] = {p: stat(p) for p in WATCH}
# check_*.py of tools/bt and any other file named check_* under the history layer
out['check_scripts'] = sorted(os.path.relpath(f, ROOT) for f in (glob.glob(os.path.join(ROOT, 'tools', 'bt', 'check_*.py')) + glob.glob(os.path.join(BT, '**', 'check_*.py'), recursive=True)))
# rows of every evidence_corrections / timeline_corrections file by verdict
for d in ('evidence_corrections', 'timeline_corrections'):
    dd = os.path.join(G, d)
    if os.path.isdir(dd):
        tot, ver, files = 0, C(), {}
        for f in sorted(os.listdir(dd)):
            if f.endswith('.jsonl'):
                rows = [json.loads(l) for l in open(os.path.join(dd, f), encoding='utf-8') if l.strip()]
                files[f] = len(rows); tot += len(rows)
                for r in rows: ver[r.get('verdict')] += 1
        out[d] = {'files': files, 'rows': tot, 'verdict': dict(ver)}
# the pinned OCR texts of tools/bt/drill_check.py: which of the sixteen are present in tmp/library/misc
scr = os.path.join(ROOT, 'tmp', 'bt-gates', 'library-misc'); misc = os.path.join(ROOT, 'tmp', 'library', 'misc')
if os.path.isdir(scr):
    want = sorted(os.listdir(scr)); have = set(os.listdir(misc)) if os.path.isdir(misc) else set()
    out['drill_ocr_texts'] = {'pinned': len(want), 'present_in_tmp_library_misc': sum(1 for w in want if w in have), 'missing': [w for w in want if w not in have]}


# ---- the realization harness (gate Q17): its own result file, the decisions its tolerances cite, and its test
rp = os.path.join(G, 'realizations', 'RESULTS.json')
if os.path.exists(rp):
    rr = json.load(open(rp, encoding='utf-8'))
    out['realization_results'] = {'harness': rr.get('harness'), 'scope': rr.get('scope'), 'q17': rr.get('q17'), 'totals_timeline': (rr.get('totals') or {}).get('timeline'), 'totals_epilogue': (rr.get('totals') or {}).get('epilogue'),
                                  'realized_rows': sorted(k for k, v in (rr.get('rows') or {}).items() if v.get('realized')), 'mtime_utc': __import__('time').strftime('%FT%TZ', __import__('time').gmtime(os.path.getmtime(rp)))}
dd = os.path.join(G, 'decisions', 'DELEGATED-DECISIONS-2026-11-11.md')
out['decisions_DD-RZ'] = sorted(set(re.findall(r'DD-RZ-\d+', open(dd, encoding='utf-8').read()))) if os.path.exists(dd) else None
out['tests_governance_files'] = sorted(os.listdir(os.path.join(ROOT, 'tests', 'governance')))
out['realize_files'] = sorted(os.listdir(os.path.join(ROOT, 'tools', 'bt', 'realize')))
hk = os.path.join(BT, 'app', 'docs', 'GATE-HOOKS.md')
out['gate_hooks_functions'] = re.findall(r'^\| `([^`]+)` \|', open(hk, encoding='utf-8').read(), re.M) + re.findall(r'^\| [a-z/._-]+ \| `([^`]+)` \|', open(hk, encoding='utf-8').read(), re.M) if os.path.exists(hk) else None

print(json.dumps(out, indent=1, sort_keys=False))
