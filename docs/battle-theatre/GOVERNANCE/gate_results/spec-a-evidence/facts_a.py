#!/usr/bin/env python3
"""Recompute, from the working tree, the repository counts that GATE-SPEC-A.md states (sections 1.3, 2.2, 2.3, 2.4, 3.x, 9).
Read-only; prints one JSON object. Usage: python3 -I facts_a.py"""
import json, os, re, collections, glob, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from plan_lib import GOV, ROOT
J = lambda p: json.load(open(os.path.join(GOV, p), encoding='utf-8'))
JL = lambda p: [json.loads(l) for l in open(os.path.join(GOV, p), encoding='utf-8') if l.strip()]
C = collections.Counter
out = {}
req = J('requirements.json'); subs = req['sub_requirements']
out['sub_requirements'] = len(subs); out['requirements'] = len(req['requirements'])
out['origin'] = dict(C(s['origin'] for s in subs)); out['passes_true'] = sum(bool(s['passes']) for s in subs)
out['source_status'] = dict(C(s['source_status'] for s in subs))
cls = collections.OrderedDict()
def klass(sid):
    if re.match(r'R11\.\d{4}$', sid) and not sid.endswith('0000'): return 'TL'
    if re.match(r'R22\.\d{4}$', sid) and not sid.endswith('0000'): return 'EP'
    if re.match(r'R14\.S-', sid): return 'SS'
    if re.match(r'R14\.E-', sid): return 'WK'
    if re.match(r'R13\.G-', sid): return 'GE'
    if re.match(r'R13\.P-', sid): return 'PE'
    if re.match(r'R12\.\d{3}$', sid): return 'CT'
    if re.match(r'R03\.C-', sid): return 'CF'
    if re.match(r'R\d\d\.0000$', sid): return 'TOP'
    if re.match(r'OA\d\d\.0000$', sid): return 'OA'
    return 'OTHER:' + sid
bycls = collections.defaultdict(list)
for s in subs: bycls[klass(s['id'])].append(s)
out['class_counts'] = {k: len(v) for k, v in bycls.items()}
out['class_gate_ids'] = {k: sorted({tuple(s['gate_ids']) for s in v}) for k, v in bycls.items()}
out['class_id_range'] = {k: [v[0]['id'], v[-1]['id']] for k, v in bycls.items()}
per = collections.defaultdict(int)
for s in subs:
    for g in s['gate_ids']: per[g] += 1
out['rows_per_gate'] = dict(sorted(per.items()))
out['requirement_rows'] = dict(C(s['requirement_id'] for s in subs))
out['top_rows_gate_ids'] = {s['id']: s['gate_ids'] for s in bycls['TOP']}
out['top_rows_text_sample'] = bycls['TOP'][0]['text']
out['texts'] = {k: bycls[k][0]['text'] for k in ('TL', 'EP', 'SS', 'WK', 'GE', 'PE', 'CT', 'CF', 'OA')}
out['oa_texts'] = {s['id']: s['text'] for s in bycls['OA']}
out['timeline_ids'] = {'R11.0001': next(s['text'] for s in subs if s['id'] == 'R11.0001')[:40],
                       'R11.0226': next(s['text'] for s in subs if s['id'] == 'R11.0226')[:40],
                       'R11.0474': next(s['text'] for s in subs if s['id'] == 'R11.0474')[:40],
                       'R11.0501': next(s['text'] for s in subs if s['id'] == 'R11.0501')[:40]}
reg = J('register_index.json')
out['register_entries'] = len(reg); out['register_status'] = dict(C(e.get('status') for e in reg)); out['register_tier'] = dict(C(e.get('tier') for e in reg))
out['register_closed_ids'] = sorted(e['id'] for e in reg if e.get('status') == 'closed')
linked = [s for s in subs if s['register_ids']]; out['subreqs_with_register_ids'] = len(linked); out['subreqs_without_register_ids'] = len(subs) - len(linked)
out['cf_rows_linked'] = sum(1 for s in bycls['CF'] if s['register_ids'])
# owner_q presence
regdir = os.path.join(GOV, 'register')
files = sorted(glob.glob(os.path.join(regdir, 'EG-*.md')))
out['register_files'] = len(files)
def has_owner_q(t):
    m = re.search(r'(?im)^\s*\**\s*(?:Owner decision requested|owner_q|Owner question)\**\s*[:|]\s*(.*)$', t)
    return bool(m and m.group(1).strip() and 'not stated by the shard proposal' not in m.group(1))
miss = 0
for f in files:
    t = open(f, encoding='utf-8', errors='replace').read()
    if not has_owner_q(t): miss += 1
out['register_files_without_owner_question_by_this_probe'] = miss
out['register_index_fields'] = sorted({k for e in reg for k in e})
seed = JL('timeline_seed.jsonl'); out['seed_rows'] = len(seed); out['seed_tier'] = dict(C(r['tier'] for r in seed)); out['seed_status'] = dict(C(r['status'] for r in seed))
out['seed_by_prefix'] = dict(C(r['id'].split('-')[0] for r in seed))
out['seed_ids_missing_T3'] = sorted(set(f'T3-{i:03d}' for i in range(1, 220)) - {r['id'] for r in seed if r['id'].startswith('T3-')})
ver = JL('timeline_verified.jsonl'); out['verified_rows'] = len(ver)
out['verified_tier'] = dict(C(r.get('tier') for r in ver)); out['verified_status_effective'] = dict(C(r.get('status_effective') for r in ver))
out['verified_fields'] = sorted({k for r in ver for k in r})
win = JL('timeline_windows.jsonl'); out['windows_rows'] = len(win); out['windows_parse_status'] = dict(C(r.get('parse_status') for r in win)); out['windows_fields'] = sorted({k for r in win for k in r})
epi = JL('epilogue_seed.jsonl'); out['epilogue_rows'] = len(epi); out['epilogue_ids'] = [epi[0]['id'], epi[-1]['id']]; out['epilogue_tier'] = dict(C(r.get('tier') for r in epi))
out['epilogue_fields'] = sorted({k for r in epi for k in r})
conf = J('conflict_register.json'); out['conflict_register_type'] = type(conf).__name__; out['conflict_register_len'] = len(conf)
cd = J('decisions/conflict_defaults.json'); out['conflict_defaults_top_keys'] = list(cd)[:8] if isinstance(cd, dict) else len(cd)
# structures
S = os.path.join(ROOT, 'docs', 'battle-theatre', 'structures')
st = json.load(open(os.path.join(S, 'structures.json'), encoding='utf-8'))
recs = st.get('structures', st) if isinstance(st, dict) else st
out['structures_records'] = len(recs) if hasattr(recs, '__len__') else None
try:
    out['structures_prefix'] = dict(C(re.match(r'^([A-Za-z]+)', r['id']).group(1) for r in recs))
except Exception as e: out['structures_prefix_err'] = str(e)
sch = json.load(open(os.path.join(S, 'state_schedule.json'), encoding='utf-8'))
rows = sch.get('schedule', sch.get('rows', sch)) if isinstance(sch, dict) else sch
out['schedule_rows'] = len(rows)
combo = C()
for r in rows:
    objs = r.get('objects') or ([r['object']] if r.get('object') else [])
    pre = sorted({re.match(r'^([A-Za-z]+)', o if isinstance(o, str) else o.get('id', '')).group(1) for o in objs})
    combo['+'.join(pre) if pre else '(none)'] += 1
out['schedule_object_prefix_combos'] = dict(combo)
out['schedule_row_keys'] = sorted({k for r in rows for k in r})
out['schedule_tier'] = dict(C(r.get('tier') for r in rows))
hosp = json.load(open(os.path.join(S, 'hospitals.json'), encoding='utf-8'))
hl = hosp.get('hospitals', hosp) if isinstance(hosp, dict) else hosp
out['hospitals'] = len(hl)
# kit and history
K = os.path.join(ROOT, 'docs', 'battle-theatre', 'kit')
for f in ('kit_specs.json', 'artillery_batteries.json', 'cavalry_units.json', 'verified_oob.json', 'verified_batteries.json'):
    p = os.path.join(K, f); out['kit_' + f] = os.path.exists(p)
    if os.path.exists(p):
        d = json.load(open(p, encoding='utf-8'))
        for key in ('units', 'batteries', 'specs', 'rows'):
            if isinstance(d, dict) and key in d and hasattr(d[key], '__len__'): out['kit_' + f + '_len'] = len(d[key]); break
        else: out['kit_' + f + '_len'] = len(d) if hasattr(d, '__len__') else None
hu = os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'units.json')
d = json.load(open(hu, encoding='utf-8')); out['history_units'] = len(d.get('units', d)) if isinstance(d, dict) else len(d)
out['paths_exist'] = {p: os.path.exists(os.path.join(ROOT, p)) for p in (
    'docs/battle-theatre/GOVERNANCE/realizations', 'docs/battle-theatre/GOVERNANCE/timeline_corrections', 'docs/battle-theatre/GOVERNANCE/evidence_corrections',
    'docs/battle-theatre/kit/verified_oob.json', 'docs/battle-theatre/kit/verified_batteries.json', 'docs/battle-theatre/app/docs/GATE-HOOKS.md',
    'docs/battle-theatre/app/data/vegetation.json', 'tools/bt/gates', 'tools/bt/realize', 'tools/bt/photomatch', 'docs/battle-theatre/GOVERNANCE/gate_results/thresholds.json',
    'docs/battle-theatre/GOVERNANCE/library/status.json', 'docs/battle-theatre/GOVERNANCE/library/status_2.json', 'docs/battle-theatre/GOVERNANCE/library/status_3.json',
    'docs/battle-theatre/GOVERNANCE/subreq_links.json')}
for d in ('realizations', 'timeline_corrections', 'evidence_corrections'):
    p = os.path.join(GOV, d)
    out[d + '_files'] = len(glob.glob(os.path.join(p, '**', '*'), recursive=True)) if os.path.isdir(p) else None
print(json.dumps(out, indent=1, sort_keys=False, default=str))
