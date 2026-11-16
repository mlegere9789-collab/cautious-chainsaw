"""Tests of the Q01 runner (unit counts and strengths match the verified OOB table): every check has an injected defect it must catch (GATE-SPEC U-25).

    python3 -m unittest discover -s tests/governance/gates -p 'test_q01.py' -v

The unit tests give the runner a synthetic layer dump and a synthetic `kit-verified-oob-1` table (gates_fixtures.py); the end-to-end tests run the real node child on the
real history layer and write into a scratch folder (never into GOVERNANCE/gate_results).
"""
import json
import os
import subprocess
import sys
import tempfile
import unittest

import gates_fixtures as F  # noqa: E402  (also puts tools/bt/gates and its lib on sys.path)
from pq_common import Env  # noqa: E402
import q01_oob as Q  # noqa: E402


R1 = 'ev:us-1c-1d-b1-r1:strength:taken_into_action|officers_and_men'


def run(layer=None, table='default', matcher='default', evidence='default', k1='fixture', **kw):
    env = Env(out=tempfile.mkdtemp(prefix='q01-test-'))
    kw['k1_classes'] = F.K1_FIXTURE if k1 == 'fixture' else k1
    layer = F.with_layer_commanders(F.layer_dump()) if layer is None else layer
    table = F.oob_table() if table == 'default' else table
    matcher = F.FakeMatcher() if matcher == 'default' else matcher
    evidence = F.evidence_lines() if evidence == 'default' else evidence
    rec, out = Q.run(env, layer=layer, table=table, matcher=matcher, evidence=evidence, write=False, **kw)
    return out


def items(out, check=None, subject=None):
    return [i for i in out['items'] if (check is None or i['check'] == check) and (subject is None or ('/%s/' % subject) in i['id'] + '/')]


def result_of(out, check, subject):
    xs = items(out, check, subject)
    assert len(xs) == 1, (check, subject, [i['id'] for i in xs])
    return xs[0]['result']


class CleanFixture(unittest.TestCase):
    def test_a_matching_layer_and_table_pass_every_check_and_the_verdict_is_pass(self):
        out = run()
        bad = [(i['id'], i['result'], i['reason']) for i in out['items'] if i['result'] not in ('PASS', 'N/A')]
        self.assertEqual(bad, [])
        self.assertEqual(out['verdict'], 'PASS')
        for chk in ('Q01.1', 'Q01.2', 'Q01.3', 'Q01.4', 'Q01.5', 'Q01.6', 'Q01.7'):
            self.assertTrue(any(i['result'] == 'PASS' for i in items(out, chk)), chk)

    def test_pass_is_true_only_for_the_result_pass(self):
        out = run()
        for i in out['items']:
            self.assertEqual(i['pass'], i['result'] == 'PASS', i['id'])
            self.assertTrue(i['reason'] and 'evidence' in i and i['id'], i['id'])

    def test_two_runs_on_the_same_inputs_give_identical_items(self):
        self.assertEqual(json.dumps(run()['items'], sort_keys=True), json.dumps(run()['items'], sort_keys=True))


class TableMissing(unittest.TestCase):
    def test_no_table_means_nothing_passes_and_the_reason_says_input_missing(self):
        out = run(table=None)
        self.assertNotEqual(out['verdict'], 'PASS')
        self.assertTrue(all(not i['pass'] for i in out['items']))
        blocked = [i for i in out['items'] if i['result'] == 'BLOCKED-INPUT']
        self.assertTrue(blocked)
        self.assertTrue(all(i['reason'].startswith('input missing:') and 'verified_oob.json' in i['reason'] for i in blocked))
        for chk in ('Q01.1', 'Q01.2', 'Q01.3', 'Q01.4', 'Q01.7'):
            xs = items(out, chk)
            self.assertTrue(any(i['result'] == 'BLOCKED-INPUT' for i in xs), chk)
            self.assertTrue(all(i['result'] in ('BLOCKED-INPUT', 'N/A') for i in xs), chk)

    def test_without_a_table_the_layer_only_findings_are_kept_but_never_pass(self):
        out = run(table=None)
        for chk in ('Q01.5', 'Q01.6'):
            xs = items(out, chk)
            self.assertTrue(xs, chk)
            self.assertTrue(all(i['result'] in ('BLOCKED-INPUT', 'FAIL') for i in xs), chk)
        one = [i for i in items(out, 'Q01.5') if i['result'] == 'BLOCKED-INPUT'][0]
        self.assertEqual(one['evidence']['layer_only_result'], 'PASS')

    def test_a_layer_only_failure_is_still_a_failure_without_a_table(self):
        layer = F.with_layer_commanders(F.layer_dump())
        del layer['arrivals']['default']['us-1c-1d-b1-r1']
        out = run(layer=layer, table=None)
        self.assertEqual(result_of(out, 'Q01.5', 'us-1c-1d-b1-r1'), 'FAIL')
        self.assertEqual(out['verdict'], 'FAIL')

    def test_an_unknown_table_schema_is_not_eligible(self):
        t = F.oob_table()
        t['schema'] = 'something-else-9'
        out = run(table=t)
        self.assertEqual(result_of(out, 'Q01.1', 'table'), 'BLOCKED-INPUT')
        self.assertNotEqual(out['verdict'], 'PASS')


class UnitSet(unittest.TestCase):          # Q01.2
    def test_a_layer_unit_that_is_not_in_the_table_is_a_failure(self):
        t = F.oob_table()
        del t['units']['us-1c-1d-b1-r2']
        out = run(table=t)
        self.assertEqual(result_of(out, 'Q01.2', 'us-1c-1d-b1-r2'), 'FAIL')
        self.assertIn('not in the table', items(out, 'Q01.2', 'us-1c-1d-b1-r2')[0]['reason'])

    def test_a_table_unit_that_the_layer_lacks_is_a_failure(self):
        t = F.oob_table()
        t['units']['us-1c-1d-b1-r9'] = F.tunit('9th Wisconsin', 'US', 'regiment', 'infantry', 'us-1c-1d-b1', in_roster=False, status='partly')
        out = run(table=t)
        self.assertEqual(result_of(out, 'Q01.2', 'us-1c-1d-b1-r9'), 'FAIL')
        self.assertIn('missing from the layer', items(out, 'Q01.2', 'us-1c-1d-b1-r9')[0]['reason'])

    def test_a_brigade_assignment_that_differs_is_a_failure(self):
        t = F.oob_table()
        t['units']['us-1c-1d-b1-r2']['parent'] = 'us-1c-2d-b2'
        out = run(table=t)
        self.assertEqual(result_of(out, 'Q01.2', 'us-1c-1d-b1-r2'), 'FAIL')

    def test_a_unit_that_the_record_puts_off_the_field_must_not_be_drawn(self):
        layer = F.with_layer_commanders(F.layer_dump())
        for u in layer['units']:
            if u['id'] == 'us-1c-1d-b1-r3':
                u['drawn'], u['status'], u['render'] = True, 'on_field', 'moving'
        out = run(layer=layer)
        self.assertEqual(result_of(out, 'Q01.2', 'us-1c-1d-b1-r3'), 'FAIL')


class Strength(unittest.TestCase):         # Q01.3
    def test_a_figure_outside_the_verified_range_is_a_failure(self):
        layer = F.with_layer_commanders(F.layer_dump())
        for u in layer['units']:
            if u['id'] == 'us-1c-1d-b1-r1':
                u['strength']['drawn'] = 450
        out = run(layer=layer)
        self.assertEqual(result_of(out, 'Q01.3', 'us-1c-1d-b1-r1'), 'FAIL')

    def test_a_row_the_table_has_no_verified_strength_for_is_blocked_not_failed_and_not_passed(self):
        t = F.oob_table()
        t['units']['us-1c-1d-b1-r2']['strength'] = {'figures': [], 'ranges': {}}
        t['units']['us-1c-1d-b1-r2']['fields']['strength'] = 'unverified'
        out = run(table=t)
        r = items(out, 'Q01.3', 'us-1c-1d-b1-r2')[0]
        self.assertEqual(r['result'], 'BLOCKED-INPUT')
        self.assertFalse(r['pass'])
        self.assertTrue(r['reason'].startswith('input missing:'))

    def test_a_range_that_the_layer_collapses_to_one_figure_is_a_failure(self):
        layer = F.with_layer_commanders(F.layer_dump())
        for u in layer['units']:
            if u['id'] == 'us-1c-1d-b1-r1':
                u['strength'].update({'kind': 'printed', 'min': 300, 'max': 300, 'drawn': 300})
        out = run(layer=layer)
        r = items(out, 'Q01.3', 'us-1c-1d-b1-r1')[0]
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('collapsed', r['reason'])

    def test_a_basis_that_names_neither_the_table_basis_nor_a_table_source_fails(self):
        layer = F.with_layer_commanders(F.layer_dump())
        for u in layer['units']:
            if u['id'] == 'us-1c-1d-b1-r1':
                u['strength'].update({'min': 280, 'max': 320, 'kind': 'ranged'})
        out = run(layer=layer)
        self.assertEqual(result_of(out, 'Q01.3', 'us-1c-1d-b1-r1'), 'FAIL')

    def test_a_layer_range_that_names_the_table_source_and_equals_the_table_range_passes(self):
        layer = F.with_layer_commanders(F.layer_dump())
        for u in layer['units']:
            if u['id'] == 'us-1c-1d-b1-r1':
                u['strength'].update({'min': 280, 'max': 320, 'kind': 'ranged', 'basis_key': 'taken_into_action|officers_and_men', 'sources': ['OR27-1-R037']})
                u['tier'] = 'documented'
        out = run(layer=layer)
        self.assertEqual(result_of(out, 'Q01.3', 'us-1c-1d-b1-r1'), 'PASS')


class Rollups(unittest.TestCase):          # Q01.4
    def test_a_roll_up_outside_the_sum_of_the_ranges_is_a_failure(self):
        layer = F.with_layer_commanders(F.layer_dump())
        for u in layer['units']:
            if u['id'] == 'us-1c-1d-b1-r2':
                u['strength']['drawn'] = 900
        out = run(layer=layer)
        self.assertEqual(result_of(out, 'Q01.4', 'us-1c-1d-b1'), 'FAIL')

    def test_the_roll_up_is_blocked_when_a_leaf_has_no_verified_range(self):
        t = F.oob_table()
        t['units']['us-1c-1d-b1-r2']['strength'] = {'figures': [], 'ranges': {}}
        out = run(table=t)
        self.assertEqual(result_of(out, 'Q01.4', 'us-1c-1d-b1'), 'BLOCKED-INPUT')

    def test_an_army_total_outside_the_verified_army_range_is_a_failure(self):
        t = F.oob_table()
        t['units']['us-aop']['strength']['ranges'] = {'present_for_duty|officers_and_men': F.rng(1000, 2000)}
        out = run(table=t)
        self.assertEqual(result_of(out, 'Q01.4', 'us-aop'), 'FAIL')


class Presence(unittest.TestCase):         # Q01.5
    def test_a_unit_with_no_arrivals_record_fails(self):
        layer = F.with_layer_commanders(F.layer_dump())
        del layer['arrivals']['default']['us-1c-1d-b1-r2']
        self.assertEqual(result_of(run(layer=layer), 'Q01.5', 'us-1c-1d-b1-r2'), 'FAIL')

    def test_a_window_that_is_not_ordered_fails(self):
        layer = F.with_layer_commanders(F.layer_dump())
        layer['arrivals']['default']['us-1c-1d-b1-r1'].update({'earliest': 2000, 'default': 1010, 'latest': 1030})
        self.assertEqual(result_of(run(layer=layer), 'Q01.5', 'us-1c-1d-b1-r1'), 'FAIL')

    def test_a_record_with_no_sources_or_an_unknown_source_fails(self):
        layer = F.with_layer_commanders(F.layer_dump())
        layer['arrivals']['default']['us-1c-1d-b1-r1']['sources'] = []
        self.assertEqual(result_of(run(layer=layer), 'Q01.5', 'us-1c-1d-b1-r1'), 'FAIL')
        layer = F.with_layer_commanders(F.layer_dump())
        layer['arrivals']['default']['us-1c-1d-b1-r1']['sources'] = ['NO-SUCH-KEY']
        self.assertEqual(result_of(run(layer=layer), 'Q01.5', 'us-1c-1d-b1-r1'), 'FAIL')

    def test_a_drawn_leaf_with_no_place_or_route_fails(self):
        layer = F.with_layer_commanders(F.layer_dump())
        layer['arrivals']['default']['us-1c-1d-b1-r1']['entry'] = None
        layer['approach']['us-1c-1d-b1-r1'] = None
        r = items(run(layer=layer), 'Q01.5', 'us-1c-1d-b1-r1')[0]
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('place', r['reason'])

    def test_a_unit_that_was_never_on_the_field_needs_its_not_on_field_record(self):
        layer = F.with_layer_commanders(F.layer_dump())
        layer['not_on_field'] = {}
        self.assertEqual(result_of(run(layer=layer), 'Q01.5', 'us-1c-1d-b1-r3'), 'FAIL')


class OneToOne(unittest.TestCase):         # Q01.6
    def test_one_instance_fewer_than_the_strength_is_a_failure(self):
        layer = F.with_layer_commanders(F.layer_dump())
        v = layer['onetoone']['scenarios']['default']['units']['us-1c-1d-b1-r1']
        v['rendered_when_present'] = 299
        self.assertEqual(result_of(run(layer=layer), 'Q01.6', 'us-1c-1d-b1-r1/default'), 'FAIL')

    def test_a_violation_at_a_grid_time_is_a_failure(self):
        layer = F.with_layer_commanders(F.layer_dump())
        layer['onetoone']['scenarios']['default']['units']['us-1c-1d-b1-r2']['violations'] = [{'t_min': 1110, 'expected': 250, 'rendered': 0, 'why': 'not drawn at its arrival minute'}]
        self.assertEqual(result_of(run(layer=layer), 'Q01.6', 'us-1c-1d-b1-r2/default'), 'FAIL')

    def test_an_undrawn_unit_with_instances_is_a_failure(self):
        layer = F.with_layer_commanders(F.layer_dump())
        layer['onetoone']['scenarios']['default']['units']['us-1c-1d-b1-r3']['world_count'] = 4
        self.assertEqual(result_of(run(layer=layer), 'Q01.6', 'us-1c-1d-b1-r3/default'), 'FAIL')

    def test_a_cap_constant_in_the_source_is_a_failure(self):
        layer = F.with_layer_commanders(F.layer_dump())
        layer['cap_scan']['hits'] = [{'file': 'src/crowd/x.mjs', 'pattern': 'MAX_FIGURES', 'line': 3}]
        out = run(layer=layer)
        self.assertEqual(result_of(out, 'Q01.6', 'cap-scan/default'), 'FAIL')
        self.assertEqual(out['verdict'], 'FAIL')

    def test_a_stage_window_that_hides_a_unit_the_events_put_on_the_field_is_a_failure(self):
        layer = F.with_layer_commanders(F.layer_dump())
        v = layer['onetoone']['scenarios']['default']['units']['us-1c-1d-b1-r1']
        v['present_intervals'] = [[1500, None]]            # the stage would hide the unit from 1010 to 1500 although the layer events put it on the field
        self.assertEqual(result_of(run(layer=layer), 'Q01.6', 'us-1c-1d-b1-r1/default'), 'FAIL')
        v['present_intervals'] = [[900, None]]             # a window that opens earlier is the Q04 window and is fine: what is drawn is what the events print
        self.assertEqual(result_of(run(layer=layer), 'Q01.6', 'us-1c-1d-b1-r1/default'), 'PASS')

    def test_an_incomplete_scenario_set_or_grid_keeps_the_verdict_incomplete(self):
        layer = F.with_layer_commanders(F.layer_dump())
        layer['scenario_set'] = {'id': 'sample', 'complete': False, 'count': 7}
        out = run(layer=layer)
        self.assertEqual(out['verdict'], 'INCOMPLETE')
        layer = F.with_layer_commanders(F.layer_dump())
        layer['onetoone']['grid']['exact_by_breakpoints'] = False
        self.assertEqual(run(layer=layer)['verdict'], 'INCOMPLETE')


class Commanders(unittest.TestCase):       # Q01.7
    def test_a_commander_that_differs_from_the_table_is_a_failure(self):
        layer = F.with_layer_commanders(F.layer_dump())
        for u in layer['units']:
            if u['id'] == 'us-1c-1d-b1-r2':
                u['commanders'] = ['Col. William Robinson']
        self.assertEqual(result_of(run(layer=layer), 'Q01.7', 'us-1c-1d-b1-r2'), 'FAIL')

    def test_a_unit_whose_commander_the_layer_does_not_hold_fails_against_a_table_that_has_one(self):
        layer = F.layer_dump()                    # the real roster holds no regimental commander
        r = items(run(layer=layer), 'Q01.7', 'us-1c-1d-b1-r1')[0]
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('holds no commander', r['reason'])

    def test_a_table_row_without_a_verified_commander_is_blocked(self):
        t = F.oob_table()
        t['units']['us-1c-1d-b1-r2']['commanders'] = []
        t['units']['us-1c-1d-b1-r2']['fields']['commander'] = 'unverified'
        self.assertEqual(result_of(run(table=t), 'Q01.7', 'us-1c-1d-b1-r2'), 'BLOCKED-INPUT')


class TableItself(unittest.TestCase):      # Q01.1
    def test_a_documented_extract_that_is_not_in_the_source_text_is_a_failure(self):
        out = run(matcher=F.FakeMatcher(found=False))
        r = items(out, 'Q01.1', 'table')[0]
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('not found', r['reason'])
        self.assertEqual(out['verdict'], 'FAIL')

    def test_a_source_text_that_is_not_on_the_machine_is_not_run_and_never_a_pass(self):
        out = run(matcher=F.FakeMatcher(no_text=True))
        r = items(out, 'Q01.1', 'table')[0]
        self.assertEqual(r['result'], 'NOT-RUN')
        self.assertFalse(r['pass'])

    def test_no_matcher_at_all_is_not_run(self):
        out = run(matcher=None)
        self.assertEqual(items(out, 'Q01.1', 'table')[0]['result'], 'NOT-RUN')

    def test_a_cited_evidence_line_that_does_not_exist_is_a_failure(self):
        ev = F.evidence_lines()
        del ev[R1]
        r = items(run(evidence=ev), 'Q01.1', 'table')[0]
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn(R1, json.dumps(r['evidence']))

    def test_a_number_of_the_value_that_is_not_in_the_extract_is_a_failure(self):
        ev = F.evidence_lines()
        t = F.oob_table()
        for f in t['units']['us-1c-1d-b1-r1']['strength']['figures']:
            f['low'], f['high'] = 999, 999
        r = items(run(table=t, evidence=ev), 'Q01.1', 'table')[0]
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('number', r['reason'])

    def test_a_documented_value_with_a_lead_source_is_a_failure(self):
        ev = F.evidence_lines()
        ev[R1]['source_id'] = 'WIKI-OOB'
        r = items(run(evidence=ev), 'Q01.1', 'table')[0]
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('lead', r['reason'])

    def test_a_k1_class_the_table_lacks_is_listed(self):
        r = items(run(), 'Q01.1', 'table')[0]
        self.assertEqual(r['result'], 'PASS')
        r2 = items(run(k1={'signal': {'name': 'signal'}}), 'Q01.1', 'table')[0]
        self.assertEqual(r2['result'], 'FAIL')
        self.assertIn('signal', r2['reason'])
        r3 = items(run(k1=None), 'Q01.1', 'table')[0]              # the module's own list of the K.1 classes: the small fixture has none of most of them
        self.assertEqual(r3['result'], 'FAIL')
        self.assertIn('ambulance', r3['reason'])

    def test_a_range_with_low_above_high_or_a_missing_basis_is_a_failure(self):
        t = F.oob_table()
        rg = t['units']['us-1c-1d-b1-r1']['strength']['ranges']['taken_into_action|officers_and_men']
        rg['low'], rg['high'] = 400, 300
        self.assertEqual(items(run(table=t), 'Q01.1', 'table')[0]['result'], 'FAIL')
        t = F.oob_table()
        t['units']['us-1c-1d-b1-r1']['strength']['ranges']['taken_into_action|officers_and_men']['basis'] = ''
        self.assertEqual(items(run(table=t), 'Q01.1', 'table')[0]['result'], 'FAIL')


class RealData(unittest.TestCase):
    """The real node child on the real history layer. Slow (about 30 s), reads the working tree, writes only into a scratch folder."""

    @classmethod
    def setUpClass(cls):
        cls.out_dir = tempfile.mkdtemp(prefix='q01-real-')
        cls.code = Q.main(['--out', cls.out_dir, '--quiet'])
        with open(os.path.join(cls.out_dir, 'Q01.json'), encoding='utf-8') as f:
            cls.rec = json.load(f)

    def test_the_record_has_the_fields_the_protocol_names(self):
        r = self.rec
        for k in ('schema', 'gate', 'inputs', 'input_hashes', 'runnable_here', 'items', 'counts', 'totals', 'verdict', 'owed'):
            self.assertIn(k, r)
        self.assertEqual(r['gate'], 'Q01')
        self.assertTrue(r['runnable_here'])
        paths = {i['path']: i for i in r['inputs']}
        for need in ('docs/battle-theatre/history/units.json', 'docs/battle-theatre/history/arrivals.json', 'docs/battle-theatre/history/not_on_field.json'):
            self.assertTrue(paths[need]['sha256'] and len(paths[need]['sha256']) == 64, need)
        for i in r['items']:
            self.assertEqual(set(['id', 'pass', 'reason', 'evidence']) <= set(i), True, i['id'])
            self.assertEqual(i['pass'], i['result'] == 'PASS')

    def test_the_real_layer_is_checked_unit_by_unit(self):
        ids = {i['id'].split('/')[2] for i in self.rec['items'] if i['check'] == 'Q01.5'}
        self.assertEqual(len(ids), 726)
        self.assertEqual(len([i for i in self.rec['items'] if i['check'] == 'Q01.2']) >= 726, True)

    def test_without_the_verified_table_the_gate_is_incomplete_and_nothing_is_a_table_pass(self):
        table = os.path.join(F.ROOT, 'docs', 'battle-theatre', 'kit', 'verified_oob.json')
        if os.path.exists(table):
            self.skipTest('kit/verified_oob.json exists now: this test describes the state without it')
        self.assertEqual(self.code, 2 if self.rec['verdict'] == 'INCOMPLETE' else 1)
        for chk in ('Q01.1', 'Q01.2', 'Q01.3', 'Q01.4', 'Q01.7'):
            xs = [i for i in self.rec['items'] if i['check'] == chk]
            self.assertTrue(xs, chk)
            self.assertTrue(all(i['result'] == 'BLOCKED-INPUT' and i['reason'].startswith('input missing:') for i in xs), chk)
        self.assertNotEqual(self.rec['verdict'], 'PASS')

    def test_no_pass_flag_is_written_anywhere(self):
        req = os.path.join(F.ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'requirements.json')
        self.assertFalse('Q01.json' in open(req, encoding='utf-8').read())


class RealDataInjectedDefect(unittest.TestCase):
    """A defect injected into the real code path: the world builder drops one soldier of one unit; the node child must show the instance count differs from the strength."""

    def test_a_dropped_soldier_in_the_world_is_found_by_the_real_pipeline(self):
        d = tempfile.mkdtemp(prefix='q01-mut-')
        mut = os.path.join(d, 'mutate.mjs')
        with open(mut, 'w', encoding='utf-8') as f:
            f.write("export function mutateWorld(world, layer) { const i = layer.units.findIndex(u => u.drawn && u.strength.drawn > 50 && !(u.guns && u.guns.status === 'drawn')); world.units[i].count -= 1; globalThis.__mutated = layer.units[i].id; }\n")
        out_dir = os.path.join(d, 'out')
        code = Q.main(['--out', out_dir, '--quiet', '--mutate', mut, '--scenarios', 'default'])
        with open(os.path.join(out_dir, 'Q01.json'), encoding='utf-8') as f:
            rec = json.load(f)
        fails = [i for i in rec['items'] if i['check'] == 'Q01.6' and i['result'] == 'FAIL']
        self.assertTrue(fails, 'the dropped soldier was not found')
        self.assertEqual(rec['verdict'], 'FAIL')
        self.assertEqual(code, 1)


if __name__ == '__main__':
    unittest.main(verbosity=2)
