#!/usr/bin/env python3
"""Check that the stable counts GATE-SPEC.md states agree with the files they were counted from. Reads files only (and runs the light node
script spec-a-evidence/night_count.mjs). Counts that other workstreams are still changing (correction records, photo-match, vegetation) are NOT
checked here: the spec dates them and a runner reads them at run time. Usage: python3 -I check_gs_counts.py [path-to-spec]"""
import re, os, sys, json, collections, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
GR = os.path.abspath(os.path.join(HERE, '..')); GOV = os.path.abspath(os.path.join(GR, '..')); ROOT = os.path.abspath(os.path.join(GOV, '..', '..'))
doc = sys.argv[1] if len(sys.argv) > 1 else os.path.join(GR, 'GATE-SPEC.md')
text = open(doc, encoding='utf-8').read()
J = lambda p: json.load(open(os.path.join(GOV, p), encoding='utf-8'))
JL = lambda p: [json.loads(l) for l in open(os.path.join(GOV, p), encoding='utf-8') if l.strip()]
res, bad = [], []
def check(name, value, *needles):
    """each needle (a string with {} for the value, or a plain string) must occur in the spec text"""
    for nd in needles:
        s = nd.format(value) if '{}' in nd else nd
        ok = s in text
        res.append((name, value, s, ok))
        if not ok: bad.append(f'{name}: the spec does not contain {s!r} (the file says {value})')
req = J('requirements.json'); subs = req['sub_requirements']
check('sub-requirements', len(subs), '{} rows on 2026-11-14', '969 sub-requirements')
check('origin owner_chat', sum(s['origin'] == 'owner_chat' for s in subs), '{} `origin: owner_chat`')
check('origin pdf', sum(s['origin'] == 'pdf' for s in subs), '{} `origin: pdf`')
check('passes true', sum(bool(s['passes']) for s in subs), '0 passing')
check('requirements', len(req['requirements']), '22 requirements')
cls = collections.Counter()
for s in subs:
    i = s['id']
    k = ('TL' if re.match(r'R11\.\d{4}$', i) and not i.endswith('0000') else 'EP' if re.match(r'R22\.\d{4}$', i) and not i.endswith('0000') else 'SS' if i.startswith('R14.S-') else
         'WK' if i.startswith('R14.E-') else 'GE' if i.startswith('R13.G-') else 'PE' if i.startswith('R13.P-') else 'CT' if re.match(r'R12\.\d{3}$', i) else
         'CF' if i.startswith('R03.C-') else 'TOP' if re.match(r'R\d\d\.0000$', i) else 'OA' if i.startswith('OA') else 'OTHER')
    cls[k] += 1
want = {'TL': 691, 'EP': 14, 'SS': 88, 'WK': 18, 'GE': 18, 'PE': 14, 'CT': 45, 'CF': 47, 'TOP': 22, 'OA': 12}
if dict(cls) != want: bad(f'class counts differ from the spec: {dict(cls)}')
for k, v in want.items(): res.append(('class ' + k, cls[k], '', cls[k] == v))
linked = sum(1 for s in subs if s.get('register_ids'))
check('linked to a register entry', linked, '{} linked to an open entry')
check('unlinked', len(subs) - linked, '{} unlinked')
check('source_status all seeded_unverified', collections.Counter(s['source_status'] for s in subs)['seeded_unverified'], 'seeded_unverified')
# register
idx = J('register_index.json'); ents = idx.get('entries', idx) if isinstance(idx, dict) else idx
ids = set(ents.keys()) if isinstance(ents, dict) else {e['id'] for e in ents}
files = {f[:-3] for f in os.listdir(os.path.join(GOV, 'register')) if f.endswith('.md')}
check('register entries', len(ids), '{} entries (485 open, 2 closed)')
check('register files', len(files), '{} entry files', 'nine files are not in the index')
if len(files - ids) != 9: bad(f'register files outside the index: {len(files-ids)}, the spec says nine')
# timeline
seed = JL('timeline_seed.jsonl'); ver = JL('timeline_verified.jsonl')
check('seed rows', len(seed), 'documented 580, inferred 55, open gap 44, plausible-procedural 12')
tc = collections.Counter(r['tier'] for r in seed)
if (tc['documented'], tc['inferred'], tc['open gap'], tc['plausible-procedural']) != (580, 55, 44, 12): bad(f'seed tiers: {dict(tc)}')
vt = collections.Counter(r['tier'] for r in ver)
if (vt['documented'], vt['inferred'], vt['open gap'], vt['plausible-procedural'], vt['unclassified']) != (452, 144, 71, 19, 5): bad(f'overlay tiers: {dict(vt)}')
se = collections.Counter(r['status_effective'] for r in ver)
want_se = {'verified_against_or_text': 265, 'partially_verified': 200, 'gap': 130, 'inferred': 44, 'failed_lookup': 22, 'claim_unsupported_by_or_text': 22, 'recheck_failed': 8}
if dict(se) != want_se: bad(f'status_effective: {dict(se)}')
order = {'documented': 0, 'inferred': 1, 'plausible-procedural': 2, 'open gap': 3, 'unclassified': 4}
sd = {r['id']: r['tier'] for r in seed}
diff = [(sd[r['id']], r['tier']) for r in ver if sd[r['id']] != r['tier']]
if (len(diff), sum(order[b] > order[a] for a, b in diff), sum(order[b] < order[a] for a, b in diff)) != (163, 140, 23): bad('overlay differs from the seed on other than 163 rows (140 lower, 23 higher)')
doc_rows = [r for r in ver if r['tier'] == 'documented']
if collections.Counter(r['status_effective'] for r in doc_rows) != collections.Counter({'verified_against_or_text': 251, 'partially_verified': 192, 'recheck_failed': 6, 'claim_unsupported_by_or_text': 3}): bad('status of the 452 documented rows')
check('unclassified rows', sorted(r['id'] for r in ver if r['tier'] == 'unclassified'), 'T2-121, T2-133, T2-148, T2-176, T2-178')
# schedule and conflicts
ss = J('../structures/state_schedule.json')['rows'] if False else json.load(open(os.path.join(GOV, '..', 'structures', 'state_schedule.json')))['rows']
if (len(ss), sum(1 for r in ss if r.get('claim_support_verified')), sum(1 for r in ss if r.get('weak_source'))) != (88, 0, 38): bad('state schedule: claim_support_verified or weak_source counts')
cd = J('decisions/conflict_defaults.json')['conflicts']
ct = collections.Counter(v['tier'] for v in cd.values())
if (ct['documented'], ct['inferred'], ct['plausible-procedural'], ct['open gap']) != (29, 7, 8, 3): bad(f'conflict default tiers: {dict(ct)}')
# night minutes
try:
    out = subprocess.run(['node', os.path.join(GR, 'spec-a-evidence', 'night_count.mjs')], capture_output=True, text=True, timeout=60).stdout
    nm = json.loads(out)['instant_integer_minute']
    check('night minutes', nm['total_night'], '12,074')
    if (nm['battle_window_night'], nm['epilogue_night']) != (10380, 1694): bad(f'night split: {nm}')
    res.append(('night split', (nm['battle_window_night'], nm['epilogue_night']), '10,380', '10,380' in text and '1,694' in text))
except Exception as e: bad(f'night_count.mjs did not run: {e}')
# gates
gates = J('gates.json'); n = len(gates['gates']) if isinstance(gates, dict) and 'gates' in gates else len(gates)
check('gates', n, 'Q01..Q28')
# thresholds registry vs decisions
tids = re.findall(r'^\| (T-[A-Za-z0-9]+-\d+)', text, re.M)
res.append(('threshold rows', len(tids), '', len(tids) == len(set(tids))))
print(json.dumps({'checks': len(res), 'failed': len(bad), 'ok': sum(1 for r in res if r[3])}))
for b in bad: print('MISMATCH:', b)
sys.exit(1 if bad else 0)
