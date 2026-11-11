"""Q17 / Q18 / Q23 coverage checks (PDF gates). Importable (coverage()) and runnable; exit 1 if any check fails.
A check passes only on real evidence: a register link is never a pass of the requirement itself, and 'visual realization'
is credited only where a realization record exists (none is recorded in the governance files yet, so Q17 rests on open register entries)."""
import json, os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
J = lambda p: json.load(open(os.path.join(G, p), encoding='utf-8'))
MARK_MISSING = re.compile(r'^\s*(-|none|not stated by the shard proposal.*)?\s*$', re.I)

def coverage():
    req = J('requirements.json'); subs = req['sub_requirements']
    reg = J('register_index.json'); byid = {e['id']: e for e in reg}
    open_ids = {i for i, e in byid.items() if e['status'] != 'closed'}
    out = {}
    # Q17: every timeline row has a visual realization or an open register entry
    rows = [json.loads(l) for l in open(os.path.join(G, 'timeline_seed.jsonl'), encoding='utf-8')]
    row_sub = {}
    for s in subs:
        m = re.match(r'Timeline row (T\d-\d+)', s['text'])
        if m and s['requirement_id'] == 'R11': row_sub[m.group(1)] = s
    visual = set()  # realization records: none exist in GOVERNANCE yet
    uncovered = [r['id'] for r in rows
                 if r['id'] not in visual and not (r['id'] in row_sub and set(row_sub[r['id']]['register_ids']) & open_ids)]
    out['Q17'] = {'ok': not uncovered, 'rows': len(rows), 'covered_by_open_register_entry': len(rows) - len(uncovered),
                  'covered_by_visual_realization': len(visual), 'uncovered': len(uncovered), 'uncovered_sample': uncovered[:8]}
    # Q18: every requirement has sub-requirements; each passing or linked to an open register entry
    by = {}
    for s in subs: by.setdefault(s['requirement_id'], []).append(s)
    nosub = [r for r in sorted(req['requirements']) if r not in by]
    unlinked = [s['id'] for s in subs if not s['passes'] and not (set(s['register_ids']) & open_ids)]
    out['Q18'] = {'ok': not nosub and not unlinked, 'requirements_without_subrequirements': nosub,
                  'requirements': len(req['requirements']), 'subrequirements': len(subs), 'unlinked_and_not_passing': len(unlinked)}
    out['Q18']['structure_ok'] = not nosub
    # Q23: every non-documented item carries a marking (register entries; timeline rows carry a tier)
    unmarked = [e['id'] for e in reg if e['tier'] != 'documented' and MARK_MISSING.match(e.get('marking') or '')]
    notier = [r['id'] for r in rows if r.get('tier') is None]
    nondoc = sum(1 for e in reg if e['tier'] != 'documented')
    out['Q23'] = {'ok': not unmarked and not notier, 'non_documented_register_entries': nondoc,
                  'unmarked_register_entries': len(unmarked), 'unmarked_sample': unmarked[:8], 'timeline_rows_without_tier': len(notier)}
    return out

if __name__ == '__main__':
    c = coverage()
    print(json.dumps(c, indent=1))
    sys.exit(0 if all(v['ok'] for v in c.values()) else 1)
