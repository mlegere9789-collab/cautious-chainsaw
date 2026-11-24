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

    def test_a_kit_only_row_that_is_the_same_unit_as_a_layer_unit_is_not_missing(self):
        """The Q20 crosswalk bug seen from Q01.2: kit card US.CAV.3WV and roster unit us-cav-1d-devin-3wvaandc are one unit (same name and parent), so the kit-only row must not be reported missing from the layer."""
        t = F.oob_table()
        t['units']['KIT.R1'] = F.tunit('19th Indiana (kit spelling)', 'US', 'regiment', 'infantry', 'us-1c-1d-b1', in_roster=False, status='unverified', uid='KIT.R1')
        t['units']['KIT.R1']['same_as'] = {'unit_id': 'us-1c-1d-b1-r1', 'how': 'alias'}
        out = run(table=t)
        self.assertEqual(result_of(out, 'Q01.2', 'KIT.R1'), 'PASS')

    def test_a_same_as_row_whose_layer_unit_has_another_parent_still_fails(self):
        t = F.oob_table()
        t['units']['KIT.R1'] = F.tunit('19th Indiana (kit spelling)', 'US', 'regiment', 'infantry', 'us-1c', in_roster=False, status='unverified', uid='KIT.R1')
        t['units']['KIT.R1']['same_as'] = {'unit_id': 'us-1c-1d-b1-r1', 'how': 'alias'}
        out = run(table=t)
        self.assertEqual(result_of(out, 'Q01.2', 'KIT.R1'), 'FAIL')

    def test_a_same_as_row_naming_a_unit_the_layer_lacks_still_fails(self):
        t = F.oob_table()
        t['units']['KIT.R1'] = F.tunit('Nobody', 'US', 'regiment', 'infantry', 'us-1c-1d-b1', in_roster=False, status='unverified', uid='KIT.R1')
        t['units']['KIT.R1']['same_as'] = {'unit_id': 'us-nowhere', 'how': 'alias'}
        self.assertEqual(result_of(run(table=t), 'Q01.2', 'KIT.R1'), 'FAIL')

    def test_a_kit_default_record_is_not_a_unit_of_the_order_of_battle(self):
        t = F.oob_table()
        t['units']['default.union.infantry'] = F.tunit('default record: default.union.infantry', 'US', 'default', None, None, in_roster=False, status='unverified', uid='default.union.infantry', engaged=None)
        out = run(table=t)
        self.assertEqual(result_of(out, 'Q01.2', 'default.union.infantry'), 'N/A')

    def test_a_kit_support_record_that_the_layer_lacks_is_still_a_failure(self):
        t = F.oob_table()
        t['units']['US.SUP.SIGNAL'] = F.tunit('Signal Corps', 'US', 'group', None, 'us-aop', in_roster=False, status='unverified', uid='US.SUP.SIGNAL')
        self.assertEqual(result_of(run(table=t), 'Q01.2', 'US.SUP.SIGNAL'), 'FAIL')

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
                u['strength']['drawn'] = 450                 # 450 soldiers drawn against a carried range of 280 to 320
        out = run(layer=layer)
        self.assertEqual(result_of(out, 'Q01.3', 'us-1c-1d-b1-r1'), 'FAIL')
        layer = F.with_layer_commanders(F.layer_dump())
        for u in layer['units']:
            if u['id'] == 'us-1c-1d-b1-r1':
                u['strength'].update({'min': 400, 'max': 450, 'drawn': 420})          # a range of the layer's own that the table does not give
        self.assertEqual(result_of(run(layer=layer), 'Q01.3', 'us-1c-1d-b1-r1'), 'FAIL')

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
                u['strength'].update({'basis_key': None, 'sources': ['SS-B3', 'PDF-B3']})          # the right numbers, a basis that is the plan's and not the table's
        out = run(layer=layer)
        self.assertEqual(result_of(out, 'Q01.3', 'us-1c-1d-b1-r1'), 'FAIL')

    def test_a_layer_range_that_names_the_table_source_and_equals_the_table_range_passes(self):
        layer = F.with_layer_commanders(F.layer_dump())
        for u in layer['units']:
            if u['id'] == 'us-1c-1d-b1-r1':
                u['strength'].update({'basis_key': None, 'sources': ['OR27-1-R037']})              # the basis named by the source of the table's own evidence line
        out = run(layer=layer)
        self.assertEqual(result_of(out, 'Q01.3', 'us-1c-1d-b1-r1'), 'PASS')


class StrengthOneCondition(unittest.TestCase):      # each condition of Q01.3 alone, where the others hold
    def _point_table(self):
        t = F.oob_table()
        key = 'taken_into_action|officers_and_men'
        t['units']['us-1c-1d-b1-r1']['strength']['ranges'][key] = F.rng(300, 300)
        for f in t['units']['us-1c-1d-b1-r1']['strength']['figures']:
            f['low'], f['high'] = 300, 300
        return t

    def _layer(self, **upd):
        layer = F.with_layer_commanders(F.layer_dump())
        for u in layer['units']:
            if u['id'] == 'us-1c-1d-b1-r1':
                u['strength'].update({'min': None, 'max': None, 'kind': 'procedural', 'drawn': 300, 'basis_key': 'taken_into_action|officers_and_men', 'sources': ['OR27-1-R037']})
                u['strength'].update(upd)
        return layer

    def test_the_figure_alone_outside_a_single_verified_figure_fails(self):
        out = run(layer=self._layer(drawn=350), table=self._point_table(), evidence=F.evidence_lines(self._point_table()))
        r = items(out, 'Q01.3', 'us-1c-1d-b1-r1')[0]
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('lies in a verified range', r['reason'])

    def test_the_matching_figure_passes_where_the_range_is_a_single_figure(self):
        out = run(layer=self._layer(), table=self._point_table(), evidence=F.evidence_lines(self._point_table()))
        self.assertEqual(result_of(out, 'Q01.3', 'us-1c-1d-b1-r1'), 'PASS')

    def test_the_basis_alone_that_is_not_the_tables_fails(self):
        out = run(layer=self._layer(basis_key=None, sources=['SS-B3', 'PDF-B3']), table=self._point_table(), evidence=F.evidence_lines(self._point_table()))
        r = items(out, 'Q01.3', 'us-1c-1d-b1-r1')[0]
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('same basis', r['reason'])


class StrengthDates(unittest.TestCase):    # Q01.3 and Q01.4, the date of a figure: a range that spans dates is never used on its wide span (kit/evidence/PLAN.md; DD-G-OOB-10)
    KEY = 'taken_into_action|officers_and_men'

    def _table(self, unit='us-1c-1d-b1-r1', by=None, low=100, high=320, spans=True):
        t = F.oob_table()
        r = t['units'][unit]['strength']['ranges'][self.KEY]
        r.update({'low': low, 'high': high, 'spans_dates': spans, 'lines': len(by or {}) or 1,
                  'by_as_of': by or {'1863-07-01': {'low': 280, 'high': 320, 'lines': 1}, '1863-07-04': {'low': 100, 'high': 150, 'lines': 1}}})
        return t

    def _layer(self, unit='us-1c-1d-b1-r1', **upd):
        layer = F.with_layer_commanders(F.layer_dump())
        for u in layer['units']:
            if u['id'] == unit:
                u['strength'].update(upd)
        return layer

    def test_the_wide_span_of_a_range_that_spans_dates_is_not_a_pass(self):
        # the layer carries the whole span 100 to 320 and names no date: it lies "inside" the wide span, which the rule forbids
        out = run(layer=self._layer(min=100, max=320, drawn=300), table=self._table())
        r = items(out, 'Q01.3', 'us-1c-1d-b1-r1')[0]
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('spans the dates', r['reason'])

    def test_the_sub_range_of_the_date_the_layer_names_passes(self):
        out = run(layer=self._layer(as_of='1863-07-01'), table=self._table())
        self.assertEqual(result_of(out, 'Q01.3', 'us-1c-1d-b1-r1'), 'PASS')

    def test_a_figure_outside_the_sub_range_of_its_own_date_fails(self):
        out = run(layer=self._layer(as_of='1863-07-04'), table=self._table())          # 280 to 320 carried, the figures of 4 July are 100 to 150
        r = items(out, 'Q01.3', 'us-1c-1d-b1-r1')[0]
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('lies in a verified range', r['reason'])

    def test_a_date_the_table_has_no_figure_for_fails(self):
        out = run(layer=self._layer(as_of='1863-07-02'), table=self._table())
        r = items(out, 'Q01.3', 'us-1c-1d-b1-r1')[0]
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('none dated 1863-07-02', r['reason'])

    def test_a_single_dated_range_is_not_used_for_a_figure_of_another_date(self):
        out = run(layer=self._layer(as_of='1863-07-03'))
        r = items(out, 'Q01.3', 'us-1c-1d-b1-r1')[0]
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('none dated 1863-07-03', r['reason'])

    def test_a_roll_up_over_a_leaf_that_spans_dates_cannot_pass_on_the_wide_span(self):
        by = {'1863-07-01': {'low': 240, 'high': 260, 'lines': 1}, '1863-07-04': {'low': 10, 'high': 20, 'lines': 1}}
        t = self._table('us-1c-1d-b1-r2', by=by, low=10, high=260)
        out = run(layer=F.with_layer_commanders(F.layer_dump()), table=t)          # the layer sum 550 lies inside the wide sum 290 to 580, which must not be used
        r = items(out, 'Q01.4', 'us-1c-1d-b1')[0]
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('for want of a date', json.dumps(r['evidence']) + r['reason'])

    def test_a_roll_up_over_dated_leaf_figures_uses_the_sub_ranges(self):
        by = {'1863-07-01': {'low': 240, 'high': 260, 'lines': 1}, '1863-07-04': {'low': 10, 'high': 20, 'lines': 1}}
        t = self._table('us-1c-1d-b1-r2', by=by, low=10, high=260)
        layer = self._layer('us-1c-1d-b1-r2', as_of='1863-07-01')
        out = run(layer=layer, table=t)
        self.assertEqual(result_of(out, 'Q01.4', 'us-1c-1d-b1'), 'PASS')
        layer = self._layer('us-1c-1d-b1-r2', as_of='1863-07-04', drawn=250)                 # the same drawn figures, dated 4 July: the 4 July sum is 290 to 340 and the layer sum 550 is outside
        out = run(layer=layer, table=t)
        self.assertEqual(result_of(out, 'Q01.4', 'us-1c-1d-b1'), 'FAIL')


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

    def test_a_unit_that_differs_in_another_scenario_is_found_by_that_scenarios_scan(self):
        layer = F.with_layer_commanders(F.layer_dump())
        d = layer['onetoone']['scenarios']['default']['units']
        layer['onetoone']['scenarios']['sample-1'] = {'times': 10, 'units': {k: dict(v, violations=[]) for k, v in d.items()}}
        layer['onetoone']['scenarios']['sample-1']['units']['us-1c-1d-b1-r2']['violations'] = [{'t_min': 1120, 'expected': 250, 'rendered': 0, 'why': 'not drawn'}]
        layer['onetoone']['scenarios']['sample-1']['units']['us-1c-1d-b1-r2']['n_violations'] = 1
        out = run(layer=layer)
        r = items(out, 'Q01.6', 'units-scan')
        self.assertEqual([x['result'] for x in r], ['FAIL'])
        self.assertIn('us-1c-1d-b1-r2', json.dumps(r[0]['evidence']['failing']))
        self.assertEqual(out['verdict'], 'FAIL')

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

    def test_a_commander_that_the_layer_adds_to_the_tables_alone_fails(self):
        layer = F.with_layer_commanders(F.layer_dump())
        for u in layer['units']:
            if u['id'] == 'us-1c-1d-b1-r2':
                u['commanders'] = ['Col. Henry A. Morrow', 'Col. William Robinson']
        r = items(run(layer=layer), 'Q01.7', 'us-1c-1d-b1-r2')[0]
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('names no commander that the table does not', r['reason'])

    def test_a_commander_of_the_tables_succession_that_the_layer_lacks_alone_fails(self):
        t = F.oob_table()
        t['units']['us-1c-1d-b1-r2']['commanders'].append({'order': 2, 'name': 'John Smith', 'rank': 'Lieutenant Colonel', 'tier': 'documented', 'evidence_ids': ['ev:us-1c-1d-b1-r2:commander:1'], 'cite': {}})
        r = items(run(table=t), 'Q01.7', 'us-1c-1d-b1-r2')[0]
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('by order of succession', r['reason'])

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

    def test_an_ocr_corrected_extract_cannot_be_rematched_in_the_text_and_is_not_run_not_failed(self):
        ev = F.evidence_lines()
        ev[R1]['quote_mode'] = 'ocr_corrected'
        out = run(evidence=ev)
        r = items(out, 'Q01.1', 'table')[0]
        self.assertEqual(r['result'], 'NOT-RUN')
        self.assertIn('OCR', r['reason'])
        self.assertNotEqual(out['verdict'], 'PASS')

    def test_an_extract_of_fifteen_words_or_more_is_a_failure(self):
        ev = F.evidence_lines()
        ev[R1]['quote'] = 'between 280 and 320 men were present on the field that day according to the report of the colonel'
        r = items(run(evidence=ev), 'Q01.1', 'table')[0]
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('long quote', r['reason'])

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
        self.assertIn('value mismatch', r['reason'])                # the table's figure is not the figure of the evidence line it cites
        ev2 = F.evidence_lines()
        ev2[R1]['value'] = {'low': 999, 'high': 999}                # the line states a figure that its own extract does not hold
        for f in t['units']['us-1c-1d-b1-r1']['strength']['figures']:
            f['low'], f['high'] = 999, 999
        r2 = items(run(table=t, evidence=ev2), 'Q01.1', 'table')[0]
        self.assertEqual(r2['result'], 'FAIL')
        self.assertIn('number', r2['reason'])

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


class RegistryAndVersion(unittest.TestCase):          # the threshold registry (GATE-SPEC 1.7, U-20), the runner version and the diagnostic table
    def _root_with(self, thresholds):
        root = tempfile.mkdtemp(prefix='q01-root-')
        d = os.path.join(root, 'docs', 'battle-theatre', 'GOVERNANCE', 'gate_results')
        os.makedirs(d)
        if thresholds is not None:
            with open(os.path.join(d, 'thresholds.json'), 'w', encoding='utf-8') as f:
                json.dump(thresholds, f)
        return root

    def _run_in(self, root):
        env = Env(root=root, out=tempfile.mkdtemp(prefix='q01-test-'))
        rec, out = Q.run(env, layer=F.with_layer_commanders(F.layer_dump()), table=F.oob_table(), matcher=F.FakeMatcher(), evidence=F.evidence_lines(), write=False, k1_classes=F.K1_FIXTURE)
        return out

    def test_the_record_names_the_runner_version_and_the_threshold_it_used(self):
        out = run()
        self.assertRegex(out['runner_version'], r'^[0-9a-f]{16}$')
        self.assertIn('q01_oob.py', out['runner_files'])
        self.assertEqual([(t['id'], t['value']) for t in out['thresholds']], [('T-Q02-1', 14)])

    def test_a_stricter_recorded_threshold_is_applied(self):
        out = self._run_in(self._root_with({'schema': 'bt-thresholds/1', 'unset': [], 'thresholds': [{'id': 'T-Q02-1', 'value': {'max_words': 6}, 'decisions': ['DD-TEST'], 'status': ['PLAN']}]}))
        r = items(out, 'Q01.1', 'table')[0]
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('long quote', r['reason'])
        self.assertEqual([(t['id'], t['value']) for t in out['thresholds']], [('T-Q02-1', 6)])

    def test_a_threshold_that_is_unset_makes_the_gate_incomplete(self):
        out = self._run_in(self._root_with({'schema': 'bt-thresholds/1', 'unset': ['T-Q02-1'], 'thresholds': [{'id': 'T-Q02-1', 'value': None, 'decisions': [], 'status': ['UNSET']}]}))
        self.assertEqual(out['verdict'], 'INCOMPLETE')
        self.assertTrue(any('UNSET' in x for x in out['incomplete_reasons']))

    def test_a_missing_registry_uses_the_constant_and_says_so(self):
        out = self._run_in(self._root_with(None))
        self.assertTrue(any('T-Q02-1' in n and 'constant' in n for n in out['notes']))
        self.assertEqual(out['thresholds'][0]['value'], 14)

    def test_the_diagnostic_table_option_is_refused_for_the_stored_record(self):
        self.assertEqual(Q.main(['--table', '/nonexistent/verified_oob.json', '--quiet']), 3)


class RealData(unittest.TestCase):
    """The real node child on the real history layer. Slow (about 30 s), reads the working tree, writes only into a scratch folder."""

    @classmethod
    def setUpClass(cls):
        cls.req = os.path.join(F.ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'requirements.json')
        with open(cls.req, 'rb') as f:
            cls.req_before = f.read()
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
            self.assertTrue(any(i['result'] == 'BLOCKED-INPUT' for i in xs), chk)
            self.assertTrue(all((i['result'] == 'BLOCKED-INPUT' and i['reason'].startswith('input missing:')) or i['result'] == 'N/A' for i in xs), chk)
        self.assertNotEqual(self.rec['verdict'], 'PASS')

    def test_the_runner_writes_no_pass_flag_and_leaves_requirements_json_alone(self):
        with open(self.req, 'rb') as f:
            self.assertEqual(f.read(), self.req_before)
        self.assertEqual(sorted(os.listdir(self.out_dir)), ['Q01.json'])


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
