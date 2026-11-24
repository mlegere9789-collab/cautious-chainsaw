"""Classifies every FAIL and BLOCKED-INPUT item of the gate records Q04, Q05 and Q06 by sub-gate and cause and writes horde/Q04-Q06-TRIAGE.md.

    python3 -I tools/bt/q456_triage.py [--snapshot-before]   # first: store the tallies of the records as they are now as the "before" column
    python3 -I tools/bt/q456_triage.py                       # then: table of the records now against the stored "before"

Reads GOVERNANCE/gate_results/Q04.json, Q05.json, Q06.json, history/arrivals.json (the linked conflicts of a gate owner) and conflicts/FLOOR-HOLDS.md (the conflicts whose
resolution default is earlier than a Q04 floor). Deterministic, no clock, nothing guessed: a reason text that no class matches is `unclassified` (the test wants zero).
Nothing is lowered: a class that is a record gap stays FAIL or BLOCKED-INPUT and has a register proposal (tools/bt/propose_q456_gaps.py); a class that is an owner decision stays
as it is and has a request in GOVERNANCE/horde/requests/."""
import argparse, collections, json, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BT = os.path.join(ROOT, 'docs', 'battle-theatre')
GOV = os.path.join(BT, 'GOVERNANCE')
RES = os.path.join(GOV, 'gate_results')
ARR = os.path.join(BT, 'history', 'arrivals.json')
FLOORHOLDS = os.path.join(GOV, 'conflicts', 'FLOOR-HOLDS.md')
BEFORE = os.path.join(GOV, 'horde', 'q456-triage-before.json')
OUT = os.path.join(GOV, 'horde', 'Q04-Q06-TRIAGE.md')
BAD = ('FAIL', 'BLOCKED-INPUT')
GATES = ('Q04', 'Q05', 'Q06')

# cause -> (meaning, kind of fix, status text)
CAUSE = collections.OrderedDict([
    ('floor-hold-conflict', ('A scenario selects a value of a conflict whose resolution instant is earlier than the Q04 floor of the unit (C-005, C-007, C-021, C-023: conflicts/FLOOR-HOLDS.md), or the `earliest` view does. The viewer drew the instant before the floor.',
        'product defect (the scenario rule did not hold the floor for the selectable values): fixed in app/src/history/arrivals.mjs, drawn at the floor, floor not moved. Moving a floor is an owner decision: requests/q04-floor-holds-owner-decision.md')),
    ('selectable-value-below-floor', ('A scenario selects a PDF value or a researched position of a conflict (C-004) that is earlier than the printed arrival time of the unit itself (its own gate); the layer lowered the unit\'s earliest to the chosen value.',
        'product defect (same rule): fixed in app/src/history/arrivals.mjs. Whether a unit\'s own printed gate moves for a chosen value is an owner decision: requests/q04-floor-holds-owner-decision.md')),
    ('arrivals-data', ('A Q04 item fails with no conflict linked to its gate owner: the ledger gate itself is earlier than the bound read from it.', 'arrivals data: build_arrivals.py / arrivals_data.py')),
    ('rollup-of-q04-1', ('Q04.6 named case (II Corps, Longstreet\'s divisions, Stuart\'s brigades): fails because units of the case fail Q04.1.', 'closes with the Q04.1 items of its units')),
    ('gait-gap', ('A leg is declared double quick but its mean speed (the speed the documented time needs) lies between quick time (1.30 m/s) and double quick (2.31 m/s): no documented gait has that speed.',
        'path/time geometry: real.mjs schedule() labels any speed between the march constant and the urgent double quick as double_quick. A documented fix is to alternate march and double quick (two legs) so each leg is inside its gait; not done in this task (changes the legs of 200+ units)')),
    ('march-gait-range', ('A leg is declared march but its mean speed is outside the documented march range.', 'path/time geometry (same code)')),
    ('gun-piece-step', ('Gun pieces of an artillery unit are farther apart between two samples than the speed bound allows (a jump of the draw list of the train).', 'path/turn geometry of the artillery train (structures/artillery.mjs); open')),
    ('turn-too-fast', ('The far end of a turning formation moves faster than the documented class bound: the stage turned a block in a 25 s minimum at a far-end speed of up to 4.4 m/s (an undocumented tuning value) while the foot bound is 2.5149 m/s (urgent double quick, Hardee 114), and the unit\'s own speed was not counted.',
        'product defect (turn geometry): fixed in app/src/stage.mjs: turn time T = max(25 s, 1.5 dA r / sqrt(B^2 - v^2)), B the documented bound, v the unit\'s speed on its leg')),
    ('lateness-ledger-vs-edge', ('A documented arrival time at a place that the documented rate cannot meet from the point where the printed road enters the loaded ground (the layer keeps the speed bound and reports the lateness). No register entry names the gap.',
        'real record gap (the ground ends before the unit\'s earlier positions): register entry owed, proposal q456-lateness-ledger-vs-edge-<road>')),
    ('lateness-state-vs-window', ('A day-position (troop-map state) whose window the documented rate cannot meet.', 'real record gap: register entry owed, proposal q456-lateness-state-vs-window')),
    ('lateness-defect', ('A later stop of a ledger path that the layer reaches late after an earlier stop was late or a scenario step-off moved (a defect of the layer report).', 'register entry owed, proposal q456-lateness-late-stop')),
    ('lateness-cascade', ('A stop reached late because the stop before it was reached late (same unit).', 'register entry owed, proposal q456-lateness-cascade')),
    ('range-missing', ('A mover class has no documented range of movement (limbers, caissons, gun pieces, wagon and forge, cavalry column).', 'real record gap: register entry owed (Q05_5_ENTRIES), research of the manuals')),
    ('formation-tier-tuning-duration', ('A change of formation shows the tier of the clause that dates it (inferred) but its duration, 90 s, is a tuning value (plausible-procedural): the weakest tier of its parts must be shown.',
        'product marking defect: fixed in app/src/history/real.mjs (tier is the weaker of the clause and plausible-procedural); the item then needs the open register entry that holds the 90 s (proposal q456-formation-duration-90s)')),
    ('formation-duration-register-owed', ('The tier shown is now the weakest of the parts (plausible-procedural); the 90 s deployment duration has no open register entry (no drill-manual figure read), so the gate holds the item BLOCKED-INPUT.',
        'register entry owed: proposal q456-formation-duration-90s (search log owed: nobody has searched a manual for it)')),
    ('no-road-unplaceable', ('The unit has no path: a report of its line of command names a road or route the repository cannot place (the road from Scotland, the route by Horner\'s Mill, a railroad, a road named only by its ends), so the sibling-road rule (DEC-015) is not applied.', 'real record gap: register entry owed (path inferred only with an owner-visible marked entry); research of the gazetteer')),
    ('sibling-no-day-position', ('The unit has no path: the sibling road is available but the unit has no single-label day position (a Bachelder sheet), so it would only stand in a column at the edge.', 'real record gap: register entry owed; research of the troop-map sheets')),
    ('edge-only-no-place', ('The unit is shown only at the edge of the loaded ground: a road of approach is printed, no place after arrival is printed.', 'real record gap: register entry owed; research of the unit\'s reports (history/undrawn)')),
    ('stuart-cavalry-no-own-road', ('Stuart\'s cavalry is drawn only by a road documented for its own brigade or division, and only earlier marches are printed.', 'real record gap: register entry owed (links to C-023)')),
    ('road-off-ground', ('The printed road of approach (Black Horse Tavern Road, Third Corps) does not cross into the loaded ground.', 'ground extent: register entry owed; the loaded ground may be extended only by an owner decision')),
    ('sibling-roads-differ', ('The documented sibling formations of the corps name different roads; none is chosen (carried as scenarios, never a default).', 'source conflict between roads: carried as selectable scenarios; owner decision on the default view (PENDING OWNER)')),
    ('no-figure-open-gap', ('The unit has no path because the record gives no figure for this headquarters, person or artillery group (an open gap, nothing drawn).', 'real record gap: register entry owed')),
    ('road-conflict-reports', ('A road of approach is printed for the corps, but reports of this unit print another road.', 'source conflict: carried; owner decision on the default view')),
    ('na-not-on-field', ('(not a failure) unit was not on the field.', 'N/A')),
    ('unclassified', ('No class matches: add one.', '-')),
])


def load(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def floor_hold_conflicts(path=FLOORHOLDS):
    """Conflict ids of the rows of the FLOOR-HOLDS table (the first column: C-005, C-007, ...)."""
    out = set()
    try:
        with open(path, encoding='utf-8') as f:
            for ln in f:
                m = re.match(r'\|\s*(C-\d{3})\s*\|', ln)
                if m:
                    out.add(m.group(1))
    except OSError:
        pass
    return out


def linked_conflicts(arr):
    """{gate owner: [conflict ids that bear on its arrival]} from the ledger rows (the links the arrival layer uses)."""
    return {r['unit_id']: [c['id'] for c in r.get('conflicts', []) if c.get('link') in ('topic_arrival', 'cited_by_reference')] for r in arr['rows']}


def classify(gate, it, FH, links):
    c, r, ev = it['check'], it.get('reason') or '', it.get('evidence') or {}
    if gate == 'Q04':
        if c == 'Q04.6':
            return 'rollup-of-q04-1'
        sc = it.get('scenario') or ''
        owner = None
        if c == 'Q04.5':
            owner = (ev.get('gate') or {}).get('owner')
        else:
            m = re.search(r'gate of (\S+) \(', ev.get('bound_source') or '')
            owner = m.group(1) if m else None
        ids = set(re.findall(r'C-\d{3}', sc)) or set(links.get(owner, []))
        ids &= set(links.get(owner, [])) or ids
        if not ids:
            return 'arrivals-data'
        return 'floor-hold-conflict' if ids & FH else 'selectable-value-below-floor'
    if gate == 'Q05':
        if c == 'Q05.1':
            if 'declared double_quick' in r:
                return 'gait-gap'
            if 'declared march' in r:
                return 'march-gait-range'
            return 'unclassified'
        if c == 'Q05.2':
            return 'gun-piece-step'
        if c == 'Q05.3':
            return 'turn-too-fast' if ev.get('turns_over') else 'unclassified'
        if c == 'Q05.4':
            k = (ev.get('offset') or {}).get('kind')
            return {'ledger_vs_edge': 'lateness-ledger-vs-edge', 'state_vs_window': 'lateness-state-vs-window', 'late': 'lateness-defect', 'cascade': 'lateness-cascade'}.get(k, 'unclassified')
        if c == 'Q05.5':
            return 'range-missing'
        return 'unclassified'
    if gate == 'Q06':
        if c == 'Q06.2':
            if 'the weakest tier' in r:
                return 'formation-tier-tuning-duration'
            return 'formation-duration-register-owed' if it['result'] == 'BLOCKED-INPUT' and 'deployment duration' in r else 'unclassified'
        if c == 'Q06.3':
            if it['result'] == 'N/A':
                return 'na-not-on-field'
            rr = ev.get('reason') or r
            if ev.get('render') == 'edge_only':
                return 'edge-only-no-place'
            if 'does not cross into the loaded ground' in rr:
                return 'road-off-ground'
            if 'no figure for this' in rr:
                return 'no-figure-open-gap'
            if 'reports of this unit print another' in rr or 'but reports of this unit' in rr:
                return 'road-conflict-reports'
            if 'name different roads' in rr:
                return 'sibling-roads-differ'
            if "Stuart" in rr and 'cavalry' in rr:
                return 'stuart-cavalry-no-own-road'
            if 'no single-label day position' in rr:
                return 'sibling-no-day-position'
            if 'cannot place' in rr:
                return 'no-road-unplaceable'
            return 'unclassified'
        return 'unclassified'
    return 'unclassified'


def tally(gate, res, FH, links):
    rows = collections.OrderedDict()
    for it in res['items']:
        if it['result'] in BAD:
            k = '%s|%s|%s' % (it['check'], it['result'], classify(gate, it, FH, links))
            rows[k] = rows.get(k, 0) + 1
    return rows


def snapshot(FH, links):
    out = {}
    for g in GATES:
        res = load(os.path.join(RES, g + '.json'))
        out[g] = {'run_id': res['run_id'], 'counts': res['counts'], 'rows': tally(g, res, FH, links)}
    return out


def render(now, before):
    L = ['# Q04, Q05, Q06 triage: every FAIL and BLOCKED-INPUT item by sub-gate and cause', '',
         'Generated by `python3 -I tools/bt/q456_triage.py` from `GOVERNANCE/gate_results/{Q04,Q05,Q06}.json`, `history/arrivals.json` and `conflicts/FLOOR-HOLDS.md`; deterministic, no clock. The "before" column is the stored tally of the first full results (`horde/q456-triage-before.json`). Nothing was lowered, no floor was moved, no scenario was chosen.', '']
    for g in GATES:
        b, n = before.get(g), now[g]
        L.append('%s counts before (`%s`): %s. Now (`%s`): %s.' % (g, b['run_id'] if b else '-', ', '.join('%s %d' % kv for kv in sorted(b['counts'].items()) if kv[1]) if b else '-', n['run_id'], ', '.join('%s %d' % kv for kv in sorted(n['counts'].items()) if kv[1])))
    L += ['', '## By sub-gate, result and cause', '', '| gate | sub-gate | result | cause | before | now |', '|---|---|---|---|---|---|']
    order = list(CAUSE)
    keys = set()
    for g in GATES:
        keys |= {(g,) + tuple(k.split('|')) for k in now[g]['rows']} | {(g,) + tuple(k.split('|')) for k in (before.get(g) or {}).get('rows', {})}
    for g, chk, res, cause in sorted(keys, key=lambda k: (k[0], k[1], k[2], order.index(k[3]))):
        key = '|'.join((chk, res, cause))
        L.append('| %s | %s | %s | `%s` | %s | %d |' % (g, chk, res, cause, (before.get(g) or {}).get('rows', {}).get(key, 0) if before.get(g) else '-', now[g]['rows'].get(key, 0)))
    L += ['', '## By cause', '', '| cause | before | now | what it is | what was done or what is owed |', '|---|---|---|---|---|']
    for cause, (meaning, fix) in CAUSE.items():
        a = sum(v for g in GATES for k, v in now[g]['rows'].items() if k.split('|')[2] == cause)
        bb = sum(v for g in GATES for k, v in ((before.get(g) or {}).get('rows', {})).items() if k.split('|')[2] == cause)
        if a or bb:
            L.append('| `%s` | %d | %d | %s | %s |' % (cause, bb, a, meaning.replace('|', '/'), fix.replace('|', '/')))
    return '\n'.join(L) + '\n'


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--snapshot-before', action='store_true', help='store the tallies of the records as they are now as the before column, then stop')
    ap.add_argument('--out', default=OUT)
    a = ap.parse_args(argv)
    FH, links = floor_hold_conflicts(), linked_conflicts(load(ARR))
    if a.snapshot_before:
        with open(BEFORE, 'w', encoding='utf-8', newline='\n') as f:
            json.dump(snapshot(FH, links), f, indent=1, sort_keys=True)
            f.write('\n')
        print('before snapshot written:', BEFORE)
        return 0
    now = snapshot(FH, links)
    before = load(BEFORE) if os.path.isfile(BEFORE) else {}
    with open(a.out, 'w', encoding='utf-8', newline='\n') as f:
        f.write(render(now, before))
    un = sum(v for g in GATES for k, v in now[g]['rows'].items() if k.split('|')[2] == 'unclassified')
    print('triage written: %s; unclassified %d' % (a.out, un))
    return 0 if un == 0 else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
