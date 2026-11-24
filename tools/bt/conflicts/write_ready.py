#!/usr/bin/env python3
"""Write docs/battle-theatre/GOVERNANCE/conflicts/READY.json, but only when the preparation is true:

    python3 -I tools/bt/conflicts/write_ready.py

Conditions (all checked here, nothing is assumed): the self-test of validate_resolution.py passes; the 47 dossiers exist with every section; the ledger SOURCES.md parses and
every hash of a local text is the file's; every source the dossiers cite has a row in the ledger (check_dossier_sources.py); PLAN.md and schema.json exist; every id of the register has a profile. Exit status 1 and no file when one condition fails
(an earlier READY.json is removed, so a stale one never says ready).
"""
import io
import contextlib
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cfl_lib as L
import cfl_selftest
import build_dossiers as B
import check_dossier_sources as K
import dossier_profiles as DP

L.utf8_stdout()


def main():
    problems = []
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        st = cfl_selftest.run()
    selftest_text = buf.getvalue().strip().splitlines()
    if st != 0:
        problems.append('the self-test of validate_resolution.py failed')
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        dc = B.check()
    if dc != 0:
        problems.append('dossiers: ' + ' | '.join(buf.getvalue().strip().splitlines()[:6]))
    ks = K.check()
    if ks['problems']:
        problems.append('sources cited by the dossiers without a row in SOURCES.md: ' + ' | '.join(ks['problems'][:6]))
    for f in (L.PLAN_MD, L.SCHEMA_JSON, L.SOURCES_MD):
        if not os.path.exists(f):
            problems.append('missing %s' % L.rel(f))
    T = L.town()
    ok, errs, n = T.check_ledger(L.new_ctx())
    if not ok:
        problems.append('ledger: ' + '; '.join(errs[:3]))
    if sorted(DP.P) != L.IDS:
        problems.append('profiles do not cover the 47 ids')
    if problems:
        if os.path.exists(L.READY_JSON):
            os.remove(L.READY_JSON)
        print('NOT READY:')
        for p in problems:
            print('  -', p)
        return 1
    res = L.load_json(os.path.join(L.CONF, 'selftest', 'RESULT.json'))
    obj = {
        'schema': 'conflicts-ready-1',
        'ready': True,
        'date': L.today(),
        'what': 'The research of the 47 source conflicts can start: plan and rubric, record format, validator with self-test, source ledger and one dossier per conflict exist and were checked on this date.',
        'validator': 'python3 -I tools/bt/conflicts/validate_resolution.py C-0xx | --all [--complete] | --self-test | --schema',
        'plan': L.rel(L.PLAN_MD),
        'schema_file': L.rel(L.SCHEMA_JSON),
        'sources_ledger': L.rel(L.SOURCES_MD),
        'ledger_check': {'sources_with_local_text': n, 'result': 'OK'},
        'dossier_sources_check': {'distinct_sources_and_keys_cited': ks['distinct_ids_cited'], 'ledger_rows': ks['ledger_rows'], 'result': 'OK'},
        'dossier_folder': L.rel(L.DOSSIERS),
        'resolutions_folder': L.rel(L.RESOLUTIONS),
        'self_test': {'ok': res.get('ok'), 'date': res.get('date'), 'planted_defects_and_checks_caught': res.get('caught'), 'result_file': 'docs/battle-theatre/GOVERNANCE/conflicts/selftest/RESULT.json'},
        'tools': {'find_passage': 'python3 -I tools/bt/conflicts/find_passage.py', 'add_source': 'python3 -I tools/bt/conflicts/add_source.py', 'build_sources': 'python3 -I tools/bt/conflicts/build_sources.py [--check]',
                  'build_dossiers': 'python3 -I tools/bt/conflicts/build_dossiers.py [C-0xx ...|--check]', 'probe_candidates': 'python3 -I tools/bt/conflicts/probe_candidates.py',
                  'check_dossier_sources': 'python3 -I tools/bt/conflicts/check_dossier_sources.py',
                  'tests': 'python3 -I tests/governance/conflicts/test_validate_resolution.py  (the unit tests of the tools are loaded by it; they also run alone: python3 -I -m unittest discover -s tools/bt/conflicts/tests)'},
        'ids': L.IDS,
    }
    L.dump_json(L.READY_JSON, obj)
    print('READY.json written: 47 ids, self-test %s, %d sources with a local text' % ('OK', n))
    return 0


if __name__ == '__main__':
    sys.exit(main())
