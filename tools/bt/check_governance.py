"""Machine checks for the Phase-0 governance files (PDF gates Q02 partial, Q17/Q18 coverage, register completeness, Law cl.4/6).
Exit code 1 on any hard failure. 'Unlinked' sub-requirements are reported honestly, not hidden (PDF Section F: anything else is unfinished work)."""
import json, os, re, sys, hashlib
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
J = lambda p: json.load(open(os.path.join(G, p), encoding='utf-8'))
fails, notes = [], []
req = J('requirements.json'); subs = req['sub_requirements']
rids = sorted(req['requirements'])
if rids != ['R%02d' % i for i in range(1, 23)]: fails.append(f'requirement ids wrong: {rids}')
# wording unchanged vs PDF Section A (re-derive)
src = J('_req_src.json')['requirements']
for k, v in req['requirements'].items():
    if src.get(k) != v['text']: fails.append(f'requirement wording edited: {k}')
# coverage (Q18)
by = {}
for s in subs: by.setdefault(s['requirement_id'], []).append(s)
for r in rids:
    if r not in by: fails.append(f'Q18: {r} has no sub-requirements')
gates = J('gates.json')
if sorted(gates) != ['Q%02d' % i for i in range(1, 29)]: fails.append('gates incomplete')
for s in subs:
    for g in s['gate_ids']:
        if g not in gates: fails.append(f'{s["id"]}: unknown gate {g}')
    if s['passes'] and s['source_status'] == 'seeded_unverified' and s['origin'] == 'pdf':
        fails.append(f'{s["id"]}: passes=true on an unverified seed')
passing = sum(s['passes'] for s in subs)
linked = sum((not s['passes']) and bool(s['register_ids']) for s in subs)
unlinked = len(subs) - passing - linked
notes.append(f'sub-requirements {len(subs)}: passing {passing}, linked to open register entry {linked}, UNLINKED (unfinished work) {unlinked}')
# horde evidence links (informational only: links are not passes, counts above are unchanged)
_lp = os.path.join(G, 'subreq_links.json')
if os.path.exists(_lp):
    _l = json.load(open(_lp, encoding='utf-8'))
    _known = [k for k in _l if k in {s['id'] for s in subs}]
    _unl = [s['id'] for s in subs if not s['passes'] and not s['register_ids'] and s['id'] not in _l]
    notes.append(f'horde evidence links (subreq_links.json, informational, not passes): {len(_known)} sub-requirements have a shard evidence row; still without register link or evidence row: {len(_unl)}')
# register completeness
reg = J('register_index.json'); regids = {e['id'] for e in reg}
need = ['title', 'rids', 'cat', 'desc', 'why', 'searched', 'subst', 'recon', 'tier', 'marking', 'status']
for e in reg:
    for k in need:
        if not e.get(k): fails.append(f'{e["id"]}: missing {k}')
    if e['tier'] not in ('documented', 'inferred', 'plausible-procedural'): fails.append(f'{e["id"]}: bad tier {e["tier"]}')
    if not os.path.exists(os.path.join(G, 'register', e['id'] + '.md')): fails.append(f'{e["id"]}: file missing')
for s in subs:
    for rid in s['register_ids']:
        if rid not in regids: fails.append(f'{s["id"]}: dangling register id {rid}')
# timeline seed (Q02 partial, Q17 inputs)
rows = [json.loads(l) for l in open(os.path.join(G, 'timeline_seed.jsonl'), encoding='utf-8')]
if len(rows) != 691: fails.append(f'timeline rows {len(rows)} != 691')
bad = [r['id'] for r in rows if r['tier'] is None]
if bad: fails.append(f'rows without tier: {bad[:5]}')
nosrc = [r['id'] for r in rows if r['tier'] == 'documented' and r['text_raw'].rstrip().endswith(('| -', '|'))]
if nosrc: fails.append(f'Q02: documented rows without a source key: {nosrc[:5]}')
if any(r['status'] != 'seeded_unverified' for r in rows): fails.append('a timeline row is marked verified without evidence')
# conflicts / decisions
conf = J('conflict_register.json')
if len(conf) != 47: fails.append('conflict register != 47')
dl = open(os.path.join(G, 'decision_log.md'), encoding='utf-8').read()
decided = [l for l in dl.split(chr(10)) if 'DECIDED' in l and 'DECIDED BY OWNER' not in l]
if decided: fails.append('Law cl.6: a decision is marked decided without an owner entry')
for c in conf:
    if ('DEC-' + c['id']) not in dl: fails.append(f'decision log lacks {c["id"]}')
rep = {'ok': not fails, 'fails': fails, 'notes': notes, 'counts': {'requirements': len(rids), 'sub_requirements': len(subs), 'register_entries': len(reg), 'timeline_rows': len(rows), 'conflicts': len(conf), 'gates': len(gates)}}
json.dump(rep, open(os.path.join(G, 'check_report.json'), 'w', encoding='utf-8'), indent=1)
print(json.dumps(rep, indent=1)[:2500])
sys.exit(0 if not fails else 1)
