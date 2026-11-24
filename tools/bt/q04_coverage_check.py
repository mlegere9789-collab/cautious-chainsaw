"""Proves that a change in the number of Q04 items dropped no unit and no scenario out of coverage.

    python3 -I tools/bt/q04_coverage_check.py                     compare GOVERNANCE/gate_results/Q04.json with the stored snapshot (horde/q04-coverage-before.json)
    python3 -I tools/bt/q04_coverage_check.py --snapshot [FILE]   store the coverage of FILE (default Q04.json) as the snapshot

A Q04.1 item is one distinct BEHAVIOUR of one unit (hash of what the unit does under a scenario); every scenario that gives the same behaviour is listed in the one item
(evidence.n_scenarios). When a product fix makes two behaviours identical (the clamp to the arrival floor makes a chosen value that was earlier than the floor draw as the floor itself) their items
collapse into one, and an item that no longer exists is not a lost check. Coverage is therefore: the same units, the same scenario set, and for every unit the same TOTAL number of scenarios
spread over its behaviours, no item left uncounted and no two items of a unit with the same behaviour hash. Exit 1 on any violation. Deterministic, reads files only.
"""
import json, os, sys, collections

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
GOV = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
NOW = os.path.join(GOV, 'gate_results', 'Q04.json')
SNAP = os.path.join(GOV, 'horde', 'q04-coverage-before.json')


def coverage(res):
    units = collections.defaultdict(lambda: {'items': 0, 'scenarios': 0, 'hashes': []})
    scan_units = []
    for i in res['items']:
        p = i['id'].split('/')
        if i['check'] == 'Q04.1':
            u = units[p[2]]
            u['items'] += 1
            u['scenarios'] += i['evidence']['n_scenarios']
            u['hashes'].append(i['evidence']['hash'])
        elif i['check'] == 'Q04.scan':
            scan_units.append(i['evidence'].get('scanned_units'))
    return {'run_id': res['run_id'], 'items': len(res['items']), 'scenario_count': res['scenario_set']['count'],
            'units': {k: {'items': v['items'], 'scenarios': v['scenarios'], 'distinct_hashes': len(set(v['hashes']))} for k, v in sorted(units.items())},
            'scan_units': sum(scan_units), 'scan_items': len(scan_units),
            'by_check': dict(sorted(collections.Counter(i['check'] for i in res['items']).items()))}


def compare(before, now):
    bad = []
    if before['scenario_count'] != now['scenario_count']:
        bad.append('scenario count %d -> %d' % (before['scenario_count'], now['scenario_count']))
    for k in sorted(set(before['units']) ^ set(now['units'])):
        bad.append('unit %s %s' % (k, 'dropped out of Q04.1' if k in before['units'] else 'appeared'))
    for k, b in before['units'].items():
        n = now['units'].get(k)
        if n and b['scenarios'] != n['scenarios']:
            bad.append('unit %s: scenarios covered %d -> %d' % (k, b['scenarios'], n['scenarios']))
    for k, n in now['units'].items():
        if n['items'] != n['distinct_hashes']:
            bad.append('unit %s: two items share a behaviour hash (not collapsed)' % k)
    if now['scan_units'] != now['by_check']['Q04.1']:
        bad.append('the scan covered %d behaviours but Q04.1 has %d' % (now['scan_units'], now['by_check']['Q04.1']))
    for c, n in before['by_check'].items():
        if c != 'Q04.1' and c != 'Q04.scan' and now['by_check'].get(c) != n:
            bad.append('%s items %d -> %s' % (c, n, now['by_check'].get(c)))
    return bad


def main(argv):
    if argv and argv[0] == '--snapshot':
        src = argv[1] if len(argv) > 1 else NOW
        with open(SNAP, 'w', encoding='utf-8', newline='\n') as f:
            json.dump(coverage(json.load(open(src, encoding='utf-8'))), f, indent=1, sort_keys=True)
            f.write('\n')
        print('snapshot written:', SNAP)
        return 0
    b, n = json.load(open(SNAP, encoding='utf-8')), coverage(json.load(open(NOW, encoding='utf-8')))
    bad = compare(b, n)
    fewer = [(k, b['units'][k]['items'] - v['items']) for k, v in n['units'].items() if k in b['units'] and v['items'] != b['units'][k]['items']]
    print('items %d (%s) -> %d (%s); units %d -> %d; scenarios %d -> %d; Q04.1 items %d -> %d in %d units, all collapses of identical behaviours; scan items %d -> %d, behaviours scanned %d -> %d (= the Q04.1 items)'
          % (b['items'], b['run_id'], n['items'], n['run_id'], len(b['units']), len(n['units']), b['scenario_count'], n['scenario_count'], b['by_check']['Q04.1'], n['by_check']['Q04.1'], len(fewer),
             b['by_check']['Q04.scan'], n['by_check']['Q04.scan'], b['scan_units'], n['scan_units']))
    print('\n'.join(bad) if bad else 'COVERAGE KEPT: no unit and no scenario dropped out')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
