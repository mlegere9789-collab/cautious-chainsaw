"""Build the close-out corrections of shards tl-05..tl-08.

    python3 -I docs/battle-theatre/GOVERNANCE/horde/tl-05/closeout/build.py [--write] [--check-only]

Reads rows_05.py .. rows_08.py, resolves every quote in the local OR text (stops on a miss), runs the declared searches,
and writes GOVERNANCE/timeline_corrections/tl-05.jsonl .. tl-08.jsonl plus the per-row register proposals
horde/tl-0N/proposed-register/tl-0N-CO-<row>.md for every row that is not confirmed.
"""
import os, sys, json, re, importlib, glob
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import tl58lib as L

WRITE = '--write' in sys.argv
SHARDS = {'tl-05': (6, 62), 'tl-06': (63, 120), 'tl-07': (121, 178), 'tl-08': (179, 235)}
for mod in ('rows_05', 'rows_06', 'rows_07', 'rows_08'):
    if os.path.exists(os.path.join(HERE, mod + '.py')):
        importlib.import_module(mod)


def shard_of(rid):
    n = int(rid.split('-')[1])
    for s, (a, b) in SHARDS.items():
        if a <= n <= b:
            return s


seed = {}
for l in open(os.path.join(L.G, 'timeline_seed.jsonl'), encoding='utf-8'):
    r = json.loads(l)
    seed[r['id']] = r

# register entries that already name a row (title of the proposed-register files)
reg_by_row = {}
for s in SHARDS:
    for p in sorted(glob.glob(os.path.join(L.G, 'horde', s, 'proposed-register', '*.md'))):
        txt = open(p, encoding='utf-8').read()
        rid = os.path.basename(p)[:-3]
        if rid.startswith(s + '-CO-'):
            continue
        for m in set(re.findall(r'T2-\d{3}', txt)):
            reg_by_row.setdefault(m, []).append(rid)
# older register entries in GOVERNANCE/register that name a row
for p in glob.glob(os.path.join(L.G, 'register', 'EG-TL-*.md')):
    txt = open(p, encoding='utf-8').read()
    for m in set(re.findall(r'T2-\d{3}', txt)):
        reg_by_row.setdefault(m, []).append(os.path.basename(p)[:-3])

results = {}
for s in SHARDS:
    for l in open(os.path.join(L.G, 'horde', s, 'results.jsonl'), encoding='utf-8'):
        r = json.loads(l)
        results[r['id']] = r

out = {s: [] for s in SHARDS}
ERR = []
counts = {'rows': 0, 'citations': 0, 'subs': 0}
for rid, R in L.ROWS.items():
    s = shard_of(rid)
    sd = seed[rid]
    sr = results[rid]
    nm = sr.get('norm', sr)
    cites = []
    for key, (rep, quote) in R['cites'].items():
        try:
            cites.append(L.resolve(key, rep, quote))
        except SystemExit as e:
            ERR.append('%s %s: %s' % (rid, key, e))
    keys = {c['key'] for c in cites}
    subs = []
    for i, (claim, tier, support, ck, note) in enumerate(R['subs'], 1):
        for k in ck:
            assert k in keys or any(e.startswith('%s %s:' % (rid, k)) for e in ERR), (rid, k)
        if support == 'supported':
            assert tier == 'documented' or ck, (rid, i)
            assert ck, (rid, i, 'supported sub-claim without a citation')
        d = {'n': i, 'claim': claim, 'tier': tier, 'support': support, 'citations': ck}
        if note:
            d['note'] = note
        subs.append(d)
    for sc in R['scenarios']:
        for k in sc['cites']:
            assert k in keys or any(e.startswith('%s %s:' % (rid, k)) for e in ERR), (rid, 'scenario', k)
    searched = [L.run_search(x) for x in R['searched']]
    related = list(dict.fromkeys(reg_by_row.get(rid, []) + R['related']))
    confirmed = R['verdict'] == 'confirmed'
    reg_new = None if confirmed else '%s-CO-%s' % (s, rid)
    tier = R['tier'] or sd['tier']
    tc_note = 'tier unchanged against the seed' if tier == sd['tier'] else ('demotion relative to the seed' if (tier in ('inferred', 'open gap', 'plausible-procedural') and sd['tier'] == 'documented') else 'tier differs from the seed')
    rec = {
        'id': rid, 'shard': s,
        'seed': {'page': sd.get('page'), 'tier': sd['tier'], 'time_window_raw': sd.get('time_window_raw')},
        'before': {'status_effective': 'shard_results_not_reread_against_or_text', 'shard_verdict': sr.get('verdict'), 'shard_tier': nm.get('tier'),
                   'shard_status': nm.get('status'), 'or_recheck': None, 'or_claim_check_verdict': None},
        'verdict': R['verdict'],
        'corrected_claim': {'text': R['text'], 'tier': tier,
                            'marking': 'tier glyph on every sub-claim that is not documented; unsupported parts shown as open gaps'},
        'tier_change': {'seed': sd['tier'], 'shard_effective': nm.get('tier'), 'corrected': tier, 'note': tc_note},
        'sub_claims': subs, 'citations': cites, 'scenarios': R['scenarios'], 'default': None,
        'remains_unsupported': R['remains'], 'searched': searched,
        'register_proposed': reg_new, 'register_related': related,
        'recheck_applied': ('Second reading 2026-11-24 of the shard result (verdict %s) against the local OR text: every quoted passage was re-matched verbatim in %s at its stored offsets; '
                            'a sub-claim is marked supported only where its quote says exactly that.' % (sr.get('verdict'), 'tmp/library/or27')) + ((' ' + R['recheck']) if R['recheck'] else ''),
    }
    if R['verdict'] != 'confirmed' and R['verdict'] != 'corrected':
        pass
    out[s].append(rec)
    counts['rows'] += 1
    counts['citations'] += len(cites)
    counts['subs'] += len(subs)

if ERR:
    print('\n'.join(ERR))
    print(len(ERR), 'quote errors; nothing written')
    sys.exit(1)
for s, rows in out.items():
    rows.sort(key=lambda r: r['id'])
    print(s, len(rows), 'rows', sum(len(r['citations']) for r in rows), 'citations', {v: sum(1 for r in rows if r['verdict'] == v) for v in L.VERDICTS})

if WRITE:
    for s, rows in out.items():
        if not rows:
            continue
        p = os.path.join(L.G, 'timeline_corrections', s + '.jsonl')
        with open(p, 'w', encoding='utf-8', newline='\n') as f:
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False) + '\n')
        for r in rows:
            if not r['register_proposed']:
                continue
            ps = os.path.join(L.G, 'horde', s, 'proposed-register')
            os.makedirs(ps, exist_ok=True)
            vc = r['verdict']
            uns = [sc['claim'] for sc in r['sub_claims'] if sc['support'] in ('unsupported', 'conflict', 'contradicted')]
            body = ['# %s: %s, close-out second reading (%s)' % (r['register_proposed'], r['id'], vc), '',
                    '| Field | Content |', '|---|---|',
                    '| ID | %s |' % r['register_proposed'],
                    '| Requirement IDs | R04, R05 |',
                    '| Category | %s |' % ('source conflict' if r['scenarios'] else 'evidence missing'),
                    '| Description | %s |' % r['corrected_claim']['text'].replace('|', '/'),
                    '| Why literal 100%% is not possible or blocked | The sources read do not support the seed claim in full (verdict %s); the unsupported or conflicting parts are listed below (Law cl.3, 7). |' % vc,
                    '| Evidence searched | OR Ser. I vol. 27 text (tmp/library/or27) via tools/bt/or27_find.py; %d quote(s) re-matched at stored offsets; %d declared search(es) with real hit counts in timeline_corrections/%s.jsonl; the shard\'s earlier web lookups (2026-11-04) are not repeated and not counted as local evidence. |' % (len(r['citations']), len(r['searched']), r['shard']),
                    '| Autonomous substitute applied | Supported parts carried as documented; every other part carried at its own tier and marked; conflicting values carried as selectable scenarios, no default. |',
                    '| Strongest evidence-based reconstruction | %s |' % ('; '.join('%s p.%s' % (c['report_id'], c['printed_page']) for c in r['citations']) or 'none (no local text supports any part)'),
                    '| Confidence tier | %s |' % r['corrected_claim']['tier'],
                    '| Competing values | %s |' % ('; '.join('%s: %s' % (sc['id'], sc['value']) for sc in r['scenarios']) or '-'),
                    '| Not supported or in conflict | %s |' % (' / '.join(x.replace('|', '/') for x in (uns + r['remains_unsupported'])) or '-'),
                    '| Product marking | Tier glyph on the affected unit/event; conflict flagged where scenarios differ. |',
                    '| Review status | internal review only (DEC-006: no public review label) |',
                    '| Owner decision requested | Default view of the competing values, where any (PENDING OWNER; none chosen here). |',
                    '| Status | open (proposed by the tl-05..08 close-out) |',
                    '| Related | %s |' % (', '.join(r['register_related']) or '-'),
                    '| Owner decision and date | (filled only from the Decision Log) |', '']
            open(os.path.join(ps, r['register_proposed'] + '.md'), 'w', encoding='utf-8', newline='\n').write('\n'.join(body))
    print('written')
print(counts)
