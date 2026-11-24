"""Classifies every FAIL and BLOCKED-INPUT item of a Q01 gate record by sub-gate and cause and writes the table of horde/Q01-TRIAGE.md.

    python3 -I tools/bt/q01_triage.py [--result Q01.json] [--before Q01-earlier.json] [--out Q01-TRIAGE.md]

A class is read from the item's own reason and evidence and from the verified table (kit/verified_oob.json); nothing is guessed. A class that cannot be matched is reported as `unclassified`
(a runner or table change that adds a reason text must add its class here; the test lists the unclassified count and wants zero).
Classes: kit-evidence-not-run (the group of the unit has no evidence file), table-unverified (the group has one and the field is still unverified), table-gap (the pass searched and recorded a gap),
required-set (the unit's required fields omit the figure), layer-no-figure, layer-procedural-vs-table, layer-lacks-commander, layer-lacks-succession, roster-missing (kit row the roster lacks),
support-class-missing, arrivals-no-road, arrivals-road-off-ground, evidence-defect, runner-bug (fixed; listed with the fix)."""
import argparse, collections, json, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BT = os.path.join(ROOT, 'docs', 'battle-theatre')
RESULT = os.path.join(BT, 'GOVERNANCE', 'gate_results', 'Q01.json')
TABLE = os.path.join(BT, 'kit', 'verified_oob.json')
OUT = os.path.join(BT, 'GOVERNANCE', 'horde', 'Q01-TRIAGE.md')
BAD = ('FAIL', 'BLOCKED-INPUT')

CAUSE = collections.OrderedDict([
    ('kit-evidence-not-run', 'kit unit unverified: its research group has no evidence file yet (kit/evidence/<group>.jsonl)'),
    ('table-unverified', 'kit unit unverified although its group has an evidence file (the pass left the field open without a gap line)'),
    ('table-gap', 'kit field is a recorded gap: the pass searched the sources and found no figure (real record gap)'),
    ('required-set', 'kit unit does not require the figure (groups.json required set omits strength) although the layer draws one'),
    ('layer-no-figure', 'layer draws the unit with no strength figure (open gap in the layer)'),
    ('layer-procedural-vs-table', 'layer carries a plausible-procedural share where the verified table holds a documented figure (layer data to adopt the table)'),
    ('layer-lacks-commander', 'layer holds no commander (or not the whole succession) of a unit whose commanders the table verifies (layer data to adopt the table)'),
    ('roster-missing', 'kit row of the Official Records tables that the roster (layer) lacks: the unit is not drawn'),
    ('support-class-missing', 'support-troop class of the kit (ambulance, provost, signal, ...) that the layer does not hold as a unit'),
    ('arrivals-no-road', 'arrivals ledger prints no road or direction of approach for the unit (real record gap)'),
    ('arrivals-road-off-ground', 'the printed road of approach lies outside the loaded ground'),
    ('arrivals-road-conflict', 'the corps road printed in the ledger and the road printed by the unit\'s own reports differ (a source conflict to carry as a scenario)'),
    ('arrivals-no-leaf-route', 'a formation whose leaf units have no entry place and road'),
    ('arrivals-open-gap', 'arrivals record is itself an open gap (no figure for the group)'),
    ('rollup-layer-vs-table', 'roll-up: the layer sum (procedural shares) differs from the verified sum, or the layer names no date for a dated range'),
    ('evidence-defect', 'evidence lines of the table that the re-match refuses (quote over 14 words, quote not found, number not in the extract)'),
    ('runner-bug', 'runner or mapping bug (fixed in this task; listed for the record)'),
    ('unclassified', 'no class matches: add one'),
])


def load(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def classify(item, units, researched):
    """-> cause id of a FAIL or BLOCKED-INPUT item."""
    c, r, uid = item['check'], item['reason'] or '', (item.get('subjects') or [''])[0]
    t = units.get(uid) or {}
    if c == 'Q01.1':
        return 'evidence-defect'
    if c == 'Q01.2':
        if t.get('level') == 'default' or t.get('same_as') or uid == 'US.CAV.3WV':
            return 'runner-bug'
        if re.search(r'US\.SUP\.|CS\.SUP\.|SUP\.', uid):
            return 'support-class-missing'
        return 'roster-missing'
    if c in ('Q01.3', 'Q01.4', 'Q01.7') and item['result'] == 'BLOCKED-INPUT':
        if c == 'Q01.3':
            fig = (item.get('evidence') or {}).get('layer_figure')
            f = (t.get('fields') or {}).get('strength')
            if f is None and 'strength' not in (t.get('required') or []):
                return 'required-set' if fig is not None else 'layer-no-figure'
            if f == 'gap':
                return 'table-gap'
            if fig is None:
                return 'layer-no-figure' if t.get('group') in researched else 'kit-evidence-not-run'
        if c == 'Q01.7':
            f = (t.get('fields') or {}).get('commander')
        elif c == 'Q01.4':
            leaves = [units.get(x) or {} for x in (item.get('evidence') or {}).get('unverified_table_leaves') or []]
            if not leaves:
                return 'rollup-layer-vs-table'
            if any(x.get('group') not in researched for x in leaves):
                return 'kit-evidence-not-run'
            return 'table-gap' if any((x.get('fields') or {}).get('strength') == 'gap' for x in leaves) else 'table-unverified'
        else:
            f = (t.get('fields') or {}).get('strength')
        if f == 'gap':
            return 'table-gap'
        return 'kit-evidence-not-run' if t.get('group') not in researched else 'table-unverified'
    if c == 'Q01.3' and item['result'] == 'FAIL':
        return 'layer-procedural-vs-table'
    if c == 'Q01.4' and item['result'] == 'FAIL':
        return 'rollup-layer-vs-table'
    if c == 'Q01.5':
        if 'Open gap' in r:
            return 'arrivals-open-gap'
        if 'does not cross into the loaded ground' in r:
            return 'arrivals-road-off-ground'
        if 'but reports of this unit print another' in r:
            return 'arrivals-road-conflict'
        if 'no leaf unit under it' in r:
            return 'arrivals-no-leaf-route'
        if 'no road or direction of approach is printed' in r:
            return 'arrivals-no-road'
        return 'unclassified'
    if c == 'Q01.7' and item['result'] == 'FAIL':
        return 'layer-lacks-commander'
    return 'unclassified'


def tally(result, table):
    units = table['units']
    researched = {u['group'] for u in units.values() if u['status'] in ('verified', 'partly')}
    rows = collections.OrderedDict()
    for it in result['items']:
        if it['result'] in BAD:
            k = (it['check'], it['result'], classify(it, units, researched))
            rows[k] = rows.get(k, 0) + 1
    return rows


def render(after, before, res_after, res_before, table):
    L = ['# Q01 triage: every FAIL and BLOCKED-INPUT item by sub-gate and cause', '',
         'Generated by `python3 -I tools/bt/q01_triage.py` from `GOVERNANCE/gate_results/Q01.json` and `kit/verified_oob.json`; deterministic, no clock. Nothing was lowered: a class that is a record gap stays FAIL or BLOCKED-INPUT and has a register proposal.', '']
    def tot(res):
        return res['counts']
    if before is not None:
        L += ['Q01 counts before this task (`%s`): PASS %d, FAIL %d, BLOCKED-INPUT %d, N/A %d.' % (res_before['run_id'], tot(res_before)['PASS'], tot(res_before)['FAIL'], tot(res_before)['BLOCKED-INPUT'], tot(res_before)['N/A'])]
    L += ['Q01 counts now (`%s`): PASS %d, FAIL %d, BLOCKED-INPUT %d, N/A %d.' % (res_after['run_id'], tot(res_after)['PASS'], tot(res_after)['FAIL'], tot(res_after)['BLOCKED-INPUT'], tot(res_after)['N/A']), '']
    L += ['## By sub-gate and result', '', '| sub-gate | FAIL before | FAIL now | BLOCKED before | BLOCKED now |', '|---|---|---|---|---|']
    for chk in ('Q01.1', 'Q01.2', 'Q01.3', 'Q01.4', 'Q01.5', 'Q01.6', 'Q01.7'):
        g = lambda res, k: res['totals']['by_check'][chk][k]
        L.append('| %s | %s | %d | %s | %d |' % (chk, g(res_before, 'FAIL') if before is not None else '-', g(res_after, 'FAIL'), g(res_before, 'BLOCKED-INPUT') if before is not None else '-', g(res_after, 'BLOCKED-INPUT')))
    L += ['', '## By sub-gate, result and cause', '', '| sub-gate | result | cause | before | now |', '|---|---|---|---|---|']
    keys = sorted(set(after) | set(before or {}), key=lambda k: (k[0], k[1], list(CAUSE).index(k[2])))
    for k in keys:
        L.append('| %s | %s | `%s` | %s | %d |' % (k[0], k[1], k[2], before.get(k, 0) if before is not None else '-', after.get(k, 0)))
    L += ['', '## By cause', '', '| cause | meaning | before | now |', '|---|---|---|---|']
    for cause, text in CAUSE.items():
        a = sum(v for k, v in after.items() if k[2] == cause)
        b = sum(v for k, v in (before or {}).items() if k[2] == cause)
        if a or b:
            L.append('| `%s` | %s | %s | %d |' % (cause, text, b if before is not None else '-', a))
    units = table['units']
    cnt = collections.Counter(u['status'] for u in units.values())
    L += ['', 'Table `kit/verified_oob.json`: %d units, %d verified, %d partly, %d unverified; research groups with an evidence file: %s.' % (len(units), cnt['verified'], cnt['partly'], cnt['unverified'], ', '.join(sorted(table['inputs']['evidence_files'])))]
    return '\n'.join(L) + '\n'


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--result', default=RESULT)
    ap.add_argument('--before')
    ap.add_argument('--table', default=TABLE)
    ap.add_argument('--out', default=OUT)
    a = ap.parse_args(argv)
    res, table = load(a.result), load(a.table)
    after = tally(res, table)
    rb = load(a.before) if a.before else None
    before = tally(rb, table) if rb else None
    text = render(after, before, res, rb, table)
    with open(a.out, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    un = sum(v for k, v in after.items() if k[2] == 'unclassified')
    print('triage written: %s; unclassified %d' % (a.out, un))
    return 0 if un == 0 else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
