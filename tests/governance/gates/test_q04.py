"""Tests of the Q04 runner (arrival check): every check has an injected defect it must catch (GATE-SPEC U-25, K11).

    python3 -m unittest discover -s tests/governance/gates -p 'test_q04.py' -v

The unit tests give the runner a synthetic dump of the node child (q456_fixtures.py: the real shape, small enough to read) and synthetic independent bounds. The end-to-end tests run the real node child
(q04_arrival.mjs) on the real product with a mutation module that injects one defect into the REAL code path (tests/governance/gates/q456_mutations/*.mjs), on a few units and the coarse grid so that they stay light;
a coarse run is INCOMPLETE by design, so they assert on the item that must fail.
"""
import copy
import json
import os
import tempfile
import unittest

import q456_fixtures as F  # noqa: E402  (also puts tools/bt/gates and its lib on sys.path)
from pq_common import Env  # noqa: E402
import q04_arrival as Q  # noqa: E402

MUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'q456_mutations')


def run(D=None, K=None, mutate_d=None, mutate_k=None):
    env = Env(out=tempfile.mkdtemp(prefix='q04-test-'))
    D = copy.deepcopy(D) if D is not None else F.q04_dump()
    K = copy.deepcopy(K) if K is not None else F.q04_inputs()
    if mutate_d:
        mutate_d(D)
    if mutate_k:
        mutate_k(K)
    rec, out = Q.run(env, dump=D, inputs=K, write=False)
    return out


def items(out, check=None, sub=None):
    return [i for i in out['items'] if (check is None or i['check'] == check) and (sub is None or sub in i['id'])]


def one(out, check, sub):
    xs = items(out, check, sub)
    assert len(xs) == 1, (check, sub, [i['id'] for i in xs])
    return xs[0]


R1, ART, R2 = 'us-5c-1d-r1', 'us-5c-art-b1', 'us-2c-1d-r1'


class CleanFixture(unittest.TestCase):
    def test_a_product_that_keeps_every_unit_off_the_field_until_its_window_opens_passes_with_every_check_present(self):
        out = run()
        bad = [(i['id'], i['result'], i['reason'][:160]) for i in out['items'] if i['result'] != 'PASS']
        self.assertEqual(bad, [], bad)
        self.assertEqual(out['verdict'], 'PASS')
        for chk in ('Q04.1', 'Q04.3', 'Q04.4', 'Q04.5', 'Q04.6', 'Q04.S*', 'Q04.scan'):
            self.assertTrue(items(out, chk), chk)

    def test_pass_is_true_only_for_the_result_pass_and_every_item_has_a_reason_and_evidence(self):
        for i in run()['items']:
            self.assertEqual(i['pass'], i['result'] == 'PASS', i['id'])
            self.assertTrue(i['reason'] and 'evidence' in i, i['id'])

    def test_there_is_no_covered_item_the_gate_has_no_register_branch(self):
        self.assertEqual(run()['counts']['COVERED'], 0)

    def test_two_runs_give_identical_items(self):
        self.assertEqual(json.dumps(run()['items'], sort_keys=True), json.dumps(run()['items'], sort_keys=True))

    def test_a_unit_has_one_item_for_each_behaviour_and_the_item_names_every_scenario_it_stands_for(self):
        out = run()
        self.assertEqual(sorted(i['id'] for i in items(out, 'Q04.1', R1)), ['Q04/Q04.1/%s/C-003=v0' % R1, 'Q04/Q04.1/%s/delegated' % R1])
        it = one(out, 'Q04.1', 'Q04.1/%s/delegated' % R1)
        self.assertIn('delegated', it['evidence']['scenarios'])
        self.assertIn('pdf', it['evidence']['scenarios'])
        self.assertEqual(it['evidence']['n_scenarios'], 3)

    def test_the_item_records_what_it_could_not_scan_so_that_nothing_is_claimed_for_classes_the_product_does_not_have(self):
        self.assertIn('ambulances', one(run(), 'Q04.1', 'Q04.1/%s/delegated' % R1)['evidence']['classes_not_in_product'])


class Absolute(unittest.TestCase):                    # Q04.1
    def test_a_class_present_before_the_earliest_documented_value_fails_even_when_the_scenario_moved_its_own_window_earlier(self):
        def early(D):
            r = D['behaviours'][R1]['a2']
            r['classes']['soldiers']['runs'] = [[F.minute(2, 4, 59), F.TO]]
            r['arrival']['earliest'] = F.minute(2, 4)            # the scenario's window is earlier too: only the absolute bound (the ledger's earliest, read in python) catches it
        x = one(run(mutate_d=early), 'Q04.1', 'Q04.1/%s/C-003=v0' % R1)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('earliest documented value', x['reason'])
        self.assertIn('soldiers', x['reason'])

    def test_a_unit_that_has_no_documented_gate_is_judged_against_the_scenario_window_and_says_so(self):
        def nogate(K):
            K['bound'][R1]['abs_min'] = None
        x = one(run(mutate_k=nogate), 'Q04.1', 'Q04.1/%s/delegated' % R1)
        self.assertEqual(x['result'], 'PASS')
        self.assertIn('none: no documented gate', x['evidence']['bound_source'])

    def test_the_bound_comes_from_the_independent_reading_and_not_from_the_dump(self):
        def late(K):
            K['bound'][R1]['abs_min'] = F.minute(2, 9)           # the checker says 09:00; the product shows the unit at 08:00 in the default scenario
        self.assertEqual(one(run(mutate_k=late), 'Q04.1', 'Q04.1/%s/delegated' % R1)['result'], 'FAIL')

    def test_each_class_is_scanned_and_each_names_itself_in_the_reason(self):
        for cname in ('crew', 'guns', 'train.limbers', 'train.caissons', 'train.wagons', 'train.horses', 'train.drivers'):
            def early(D, c=cname):
                D['behaviours'][ART]['b1']['classes'][c]['runs'] = [[F.minute(2, 4), F.TO]]
            x = one(run(mutate_d=early), 'Q04.1', 'Q04.1/%s/delegated' % ART)
            self.assertEqual(x['result'], 'FAIL', cname)
            self.assertIn(cname, x['reason'])

    def test_a_ridden_horse_before_its_rider_arrives_fails(self):
        def early(D):
            D['behaviours']['cs-cav-flee-1va']['d-cs-cav-flee-1va']['classes']['horses']['runs'] = [[F.minute(2, 18), F.TO]]
        x = one(run(mutate_d=early), 'Q04.1', 'Q04.1/cs-cav-flee-1va/delegated')
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('horses', x['reason'])

    def test_a_manifest_flags_and_colour_bearers_before_the_unit_enters_fails(self):
        def early(D):
            D['behaviours'][R1]['a1']['classes']['manifest']['runs'] = [[F.minute(2, 6), F.minute(2, 8, 3)]]
        x = one(run(mutate_d=early), 'Q04.1', 'Q04.1/%s/delegated' % R1)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('manifest', x['reason'])

    def test_a_unit_listed_as_never_on_the_field_that_is_present_fails_both_in_its_item_and_in_the_never_on_the_field_case(self):
        def appears(D):
            D['units'][[u['id'] for u in D['units']].index('us-cav-2d-huey')]['drawn'] = True
            D['behaviours']['us-cav-2d-huey']['d-us-cav-2d-huey']['classes'] = {'soldiers': F.runs(F.minute(2, 12))}
        out = run(mutate_d=appears)
        self.assertEqual(one(out, 'Q04.1', 'Q04.1/us-cav-2d-huey/delegated')['result'], 'FAIL')
        self.assertEqual(one(out, 'Q04.6', 'never-on-field/us-cav-2d-huey')['result'], 'FAIL')


class ScenarioLocal(unittest.TestCase):               # Q04.2
    def test_presence_after_the_absolute_bound_but_before_the_window_the_scenario_selects_fails(self):
        def early(D):
            r = D['behaviours'][R1]['a1']
            r['arrival']['earliest'] = F.minute(2, 7)             # this scenario's window opens at 07:00 ...
            r['classes']['soldiers']['runs'] = [[F.minute(2, 6), F.TO]]       # ... and the unit is there at 06:00, after the ledger's 05:00
        x = one(run(mutate_d=early), 'Q04.1', 'Q04.1/%s/delegated' % R1)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('window the scenario selects', x['reason'])
        self.assertNotIn('earliest documented value %s' % F.minute(2, 5), [c['detail'] for c in x['evidence']['conditions'] if c['name'].startswith('Q04.1')][0])

    def test_a_unit_with_no_arrival_record_in_the_scenario_but_present_fails(self):
        def norec(D):
            D['behaviours'][R1]['a1']['arrival'] = None
        self.assertEqual(one(run(mutate_d=norec), 'Q04.1', 'Q04.1/%s/delegated' % R1)['result'], 'FAIL')


class Effects(unittest.TestCase):                     # Q04.7
    def test_an_animation_event_before_the_window_opens_fails(self):
        def fx(D):
            D['behaviours'][R1]['a1']['effects'].update({'events_before': 4, 'types_before': {'unit_march': 4}, 'first_before': F.minute(2, 7) * 60.0})
        x = one(run(mutate_d=fx), 'Q04.1', 'Q04.1/%s/delegated' % R1)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('the real animation emits 4 event', x['reason'])

    def test_an_animation_timeline_that_starts_before_the_earliest_documented_value_fails(self):
        def fx(D):
            D['behaviours'][R1]['a1']['effects']['first_segment_s'] = F.minute(2, 4) * 60.0
        self.assertEqual(one(run(mutate_d=fx), 'Q04.1', 'Q04.1/%s/delegated' % R1)['result'], 'FAIL')

    def test_a_man_who_falls_before_the_window_opens_fails(self):
        def fall(D):
            D['behaviours'][R1]['a1']['classes']['casualties']['first_fall_s'] = F.minute(2, 6) * 60.0
        x = one(run(mutate_d=fall), 'Q04.1', 'Q04.1/%s/delegated' % R1)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('falls', x['reason'])

    def test_casualties_on_the_ground_before_the_window_opens_fail(self):
        def lying(D):
            D['behaviours'][R1]['a1']['classes']['casualties']['runs'] = [[F.minute(2, 6), F.TO]]
        self.assertEqual(one(run(mutate_d=lying), 'Q04.1', 'Q04.1/%s/delegated' % R1)['result'], 'FAIL')

    def test_a_casualty_event_before_the_unit_enters_fails(self):
        def ev(D):
            D['behaviours'][R1]['a1']['events']['state_before_enter'] = 2
        self.assertEqual(one(run(mutate_d=ev), 'Q04.1', 'Q04.1/%s/delegated' % R1)['result'], 'FAIL')

    def test_an_event_of_the_layer_before_the_window_fails_even_when_the_sim_cache_kept_it_off_the_scene(self):
        def ev(D):
            D['behaviours'][R1]['a1']['events'].update({'before_earliest': 1, 'first_before_earliest': {'t': F.minute(2, 4), 'type': 'enter'}})
            D['behaviours'][R1]['a1'].update({'n_refused': 1, 'refused': [{'unit': R1, 't': F.minute(2, 4), 'type': 'enter', 'reason': 'outside presence window (Q04)'}]})
        x = one(run(mutate_d=ev), 'Q04.1', 'Q04.1/%s/delegated' % R1)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('refused', x['reason'])

    def test_the_renderer_unit_table_disagreeing_with_presence_fails(self):
        def hid(D):
            D['behaviours'][R1]['a1']['hidden_flag'] = {'mismatch_samples': 3, 'first': F.minute(2, 6)}
        x = one(run(mutate_d=hid), 'Q04.1', 'Q04.1/%s/delegated' % R1)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('unit table', x['reason'])


class Entry(unittest.TestCase):                       # Q04.3
    def test_a_unit_whose_first_presence_is_inside_the_loaded_ground_appears_deployed_and_fails(self):
        def inside(D):
            D['behaviours'][R1]['a1']['first_sample'] = {'t': F.minute(2, 8), 'x': 200.0, 'z': -300.0}
        x = one(run(mutate_d=inside), 'Q04.3', 'Q04.3/%s' % R1)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('inside the loaded ground', x['reason'])

    def test_a_unit_that_enters_as_a_line_fails(self):
        def line(D):
            D['units'][[u['id'] for u in D['units']].index(R1)]['slot_kind'] = 'line'
        x = one(run(mutate_d=line), 'Q04.3', 'Q04.3/%s' % R1)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('not a column of march', x['reason'])

    def test_an_arrival_with_no_resolved_entry_fails(self):
        def noentry(D):
            D['behaviours'][R1]['a1']['arrival']['entry'] = None
        self.assertEqual(one(run(mutate_d=noentry), 'Q04.3', 'Q04.3/%s' % R1)['result'], 'FAIL')

    def test_an_enter_event_that_is_not_at_the_entry_of_the_arrival_record_fails(self):
        def moved(D):
            D['behaviours'][R1]['a1']['enter']['at'] = {'lng': -77.0, 'lat': 39.7}
        self.assertEqual(one(run(mutate_d=moved), 'Q04.3', 'Q04.3/%s' % R1)['result'], 'FAIL')

    def test_a_first_leg_that_does_not_start_at_the_entry_point_fails(self):
        def jump(D):
            D['behaviours'][R1]['a1']['first_path']['wp0'] = {'t': F.minute(2, 8), 'lng': -77.2 + 0.001, 'lat': 39.78}      # about 85 m away
        x = one(run(mutate_d=jump), 'Q04.3', 'Q04.3/%s' % R1)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('first leg', x['reason'])

    def test_a_change_of_formation_before_the_entry_fails(self):
        def deploy(D):
            D['behaviours'][R1]['a1']['formations'] = [{'t': F.minute(2, 7), 'formation': 'line', 'duration_s': 90, 'tier': 'inferred', 'clause': 'PO-01'}]
        self.assertEqual(one(run(mutate_d=deploy), 'Q04.3', 'Q04.3/%s' % R1)['result'], 'FAIL')

    def test_an_enter_event_inside_the_loaded_box_fails(self):
        def box(D):
            D['behaviours'][R1]['a1']['enter_in_box'] = True
        self.assertEqual(one(run(mutate_d=box), 'Q04.3', 'Q04.3/%s' % R1)['result'], 'FAIL')

    def test_a_unit_that_is_not_drawn_has_no_entry_item_the_scan_says_nothing_about_it(self):
        self.assertEqual(items(run(), 'Q04.3', 'us-1c-2d-open'), [])


class Departure(unittest.TestCase):                   # Q04.4
    LEAVE = {'t': F.minute(3, 20), 'last_path_end': {'lng': -77.3, 'lat': 39.8, 't': F.minute(3, 19, 40)}, 'last_path_end_in_box': False, 'path_t_end': F.minute(3, 19, 40)}

    def _leaves(self, D, lv, end=None):
        r = D['behaviours'][R1]['a1']
        r['leave'] = lv
        r['classes']['soldiers']['runs'] = [[F.minute(2, 8), (lv['t'] - 1 / 60.0) if end is None else end]]

    def test_a_unit_that_leaves_by_a_march_out_of_the_ground_passes(self):
        def ok(D):
            self._leaves(D, dict(self.LEAVE))
        self.assertEqual(one(run(mutate_d=ok), 'Q04.4', 'Q04.4/%s' % R1)['result'], 'PASS')

    def test_a_unit_that_leaves_with_no_march_vanishes_where_it_stands_and_fails(self):
        def vanish(D):
            lv = dict(self.LEAVE)
            lv.update({'last_path_end': None, 'last_path_end_in_box': None})
            self._leaves(D, lv)
        x = one(run(mutate_d=vanish), 'Q04.4', 'Q04.4/%s' % R1)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('vanishes', x['reason'])

    def test_a_unit_whose_march_out_ends_inside_the_loaded_ground_vanishes_on_the_field_and_fails(self):
        def inside(D):
            lv = dict(self.LEAVE)
            lv['last_path_end_in_box'] = True
            self._leaves(D, lv)
        x = one(run(mutate_d=inside), 'Q04.4', 'Q04.4/%s' % R1)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('inside the loaded ground', x['reason'])

    def test_a_unit_that_leaves_before_its_march_out_has_ended_fails(self):
        def early(D):
            lv = dict(self.LEAVE)
            lv['t'] = F.minute(3, 19, 0)
            self._leaves(D, lv)
        self.assertEqual(one(run(mutate_d=early), 'Q04.4', 'Q04.4/%s' % R1)['result'], 'FAIL')

    def test_a_unit_that_disappears_with_no_leave_event_vanishes_and_fails(self):
        def gone(D):
            D['behaviours'][R1]['a1']['classes']['soldiers']['runs'] = [[F.minute(2, 8), F.minute(4, 12)]]
        x = one(run(mutate_d=gone), 'Q04.4', 'Q04.4/%s' % R1)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('vanishes', x['reason'])

    def test_a_unit_that_pops_out_and_in_is_present_in_two_runs_and_fails(self):
        def pop(D):
            D['behaviours'][R1]['a1']['classes']['soldiers']['runs'] = [[F.minute(2, 8), F.minute(2, 12)], [F.minute(2, 12, 1), F.TO]]
        x = one(run(mutate_d=pop), 'Q04.4', 'Q04.4/%s' % R1)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('separate runs', x['reason'])

    def test_the_last_presence_must_agree_with_the_leave_event(self):
        def off(D):
            self._leaves(D, dict(self.LEAVE), end=F.minute(3, 19, 0))
        self.assertEqual(one(run(mutate_d=off), 'Q04.4', 'Q04.4/%s' % R1)['result'], 'FAIL')


class Unknown(unittest.TestCase):                     # Q04.5
    def test_an_arrival_with_no_documented_time_that_is_shown_as_documented_fails(self):
        def doc(D):
            D['behaviours']['cs-1c-pickett-garnett-r1']['d-cs-1c-pickett-garnett-r1']['arrival']['tier'] = 'documented'
        x = one(run(mutate_d=doc), 'Q04.5', 'Q04.5/cs-1c-pickett-garnett-r1')
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('tier', x['reason'])

    def test_an_unknown_arrival_with_no_open_register_entry_fails(self):
        def noreg(K):
            K['register'] = {}
        x = one(run(mutate_k=noreg), 'Q04.5', 'Q04.5/cs-1c-pickett-garnett-r1')
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('register', x['reason'])

    def test_a_closed_register_entry_does_not_count(self):
        def closed(K):
            K['register']['EG-0005']['status'] = 'closed'
        self.assertEqual(one(run(mutate_k=closed), 'Q04.5', 'Q04.5/cs-1c-pickett-garnett-r1')['result'], 'FAIL')

    def test_a_unit_that_appears_before_the_floor_event_of_its_gate_fails(self):
        def early(D):
            D['behaviours']['cs-1c-pickett-garnett-r1']['d-cs-1c-pickett-garnett-r1']['classes']['soldiers']['runs'] = [[F.minute(2, 19, 0), F.TO]]
        self.assertEqual(one(run(mutate_d=early), 'Q04.5', 'Q04.5/cs-1c-pickett-garnett-r1')['result'], 'FAIL')

    def test_a_unit_whose_gate_is_documented_has_no_unknown_arrival_item(self):
        self.assertEqual(items(run(), 'Q04.5', 'Q04.5/%s' % R1), [])


class NamedCases(unittest.TestCase):                  # Q04.6
    def test_a_stuart_brigade_before_the_evening_of_july_2_in_the_default_view_fails_the_case(self):
        def early(D):
            D['behaviours']['cs-cav-flee-1va']['d-cs-cav-flee-1va']['classes']['soldiers']['runs'] = [[F.minute(2, 18), F.TO]]
        def lowbound(K):
            K['bound']['cs-cav-flee-1va']['abs_min'] = F.minute(2, 15)           # the ledger floor is lower: only the plan's named default catches it
        out = run(mutate_d=early, mutate_k=lowbound)
        self.assertEqual(one(out, 'Q04.1', 'Q04.1/cs-cav-flee-1va/delegated')['result'], 'PASS')
        x = one(out, 'Q04.6', 'Q04.6/stuart-s-cavalry-brigades')
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('evening of July 2', x['reason'])

    def test_pickett_before_the_morning_of_july_3_in_the_default_view_fails_the_case(self):
        def early(D):
            D['behaviours']['cs-1c-pickett-garnett-r1']['d-cs-1c-pickett-garnett-r1']['classes']['soldiers']['runs'] = [[F.minute(2, 21), F.TO]]
        x = one(run(mutate_d=early), 'Q04.6', 'Q04.6/pickett-s-division')
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('morning of July 3', x['reason'])

    def test_a_case_with_a_failing_unit_fails(self):
        def early(D):
            D['behaviours'][R2]['c2']['classes']['soldiers']['runs'] = [[F.minute(1, 20), F.TO]]
        x = one(run(mutate_d=early), 'Q04.6', 'Q04.6/ii-corps')
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn(R2, x['reason'])

    def test_a_case_with_no_drawn_unit_says_nothing_and_fails(self):
        def undrawn(D):
            for u in D['units']:
                if u['id'] == 'cs-cav-flee-1va':
                    u['drawn'] = False
            D['behaviours']['cs-cav-flee-1va']['d-cs-cav-flee-1va']['classes'] = {}
        x = one(run(mutate_d=undrawn), 'Q04.6', 'Q04.6/stuart-s-cavalry-brigades')
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('at least one drawn unit', x['reason'])

    def test_a_case_whose_units_are_not_in_the_layer_is_blocked_input(self):
        def gone(D):
            D['units'] = [u for u in D['units'] if not u['id'].startswith('us-6c')]
        x = [i for i in run(mutate_d=gone)['items'] if i['check'] == 'Q04.6' and 'vi-corps' in i['id']][0]
        self.assertEqual(x['result'], 'BLOCKED-INPUT')
        self.assertTrue(x['reason'].startswith('input missing:'))


class ScenarioSet(unittest.TestCase):                 # S*, the scans
    def test_a_unit_that_changes_without_depending_on_the_varied_conflict_fails_the_factorisation(self):
        def bad(D):
            D['scenario_set']['factorisation']['violations'] = [{'scenario': 'G4:C-004=v0', 'units': ['us-6c-1d-r1'], 'n': 1}]
        x = one(run(mutate_d=bad), 'Q04.S*', 'S*/factorisation')
        self.assertEqual(x['result'], 'FAIL')

    def test_a_joint_scenario_that_differs_from_the_product_of_its_groups_fails_the_factorisation(self):
        def bad(D):
            D['scenario_set']['factorisation']['joint'][0].update({'n_mismatch': 2, 'mismatches': ['us-2c-1d-r1']})
        self.assertEqual(one(run(mutate_d=bad), 'Q04.S*', 'S*/factorisation')['result'], 'FAIL')

    def test_a_scan_of_a_part_of_s_star_is_not_run_and_the_verdict_is_incomplete(self):
        def part(D):
            D['scenario_set']['complete'] = False
            D['scenario_set']['id'] = 'default'
        out = run(mutate_d=part)
        self.assertEqual(one(out, 'Q04.S*', 'S*/factorisation')['result'], 'NOT-RUN')
        self.assertEqual(out['verdict'], 'INCOMPLETE')
        self.assertTrue(any('not the whole of S*' in r for r in out['incomplete_reasons']))

    def test_a_restricted_scan_that_differs_from_a_full_scan_fails(self):
        def bad(D):
            D['scenario_set']['restriction_check'].update({'n_differences': 1, 'differences': [R1]})
        self.assertEqual(one(run(mutate_d=bad), 'Q04.S*', 'S*/restriction')['result'], 'FAIL')

    def test_an_unchecked_restriction_is_not_run(self):
        def bad(D):
            D['scenario_set']['restriction_check'] = {'checked': False}
        self.assertEqual(one(run(mutate_d=bad), 'Q04.S*', 'S*/restriction')['result'], 'NOT-RUN')

    def test_the_men_lying_that_do_not_equal_the_fall_table_fail_the_scan(self):
        def bad(D):
            D['scans'][0]['consistency']['down_mismatch_samples'] = 5
        self.assertEqual(one(run(mutate_d=bad), 'Q04.scan', 'scan/delegated')['result'], 'FAIL')

    def test_a_refused_event_in_a_scan_fails_the_scan(self):
        def bad(D):
            D['scans'][0]['refused_total'] = 2
        self.assertEqual(one(run(mutate_d=bad), 'Q04.scan', 'scan/delegated')['result'], 'FAIL')

    def test_the_coarse_grid_is_incomplete_never_a_pass(self):
        def coarse(D):
            D['grid']['mode'] = 'coarse'
            for s in D['scans']:
                s['grid']['mode'] = 'coarse'
                s['grid']['samples'] = 1473
        out = run(mutate_d=coarse)
        self.assertEqual(out['verdict'], 'FAIL')                     # the scan items say that the grid is not every minute
        self.assertTrue(any('coarse test grid' in r for r in out['incomplete_reasons']))

    def test_a_run_without_the_effects_or_the_manifests_or_the_train_is_incomplete(self):
        for key, val in (('effects_run', False), ('manifest_run', False), ('train', None), ('selected_units', ['x'])):
            def off(D, k=key, v=val):
                D[k] = v
            out = run(mutate_d=off)
            self.assertEqual(out['verdict'], 'INCOMPLETE', key)

    def test_a_behaviour_with_no_scan_record_is_blocked_input_never_a_pass(self):
        def gone(D):
            del D['behaviours'][R1]['a2']
        x = one(run(mutate_d=gone), 'Q04.1', 'Q04.1/%s/C-003=v0' % R1)
        self.assertEqual(x['result'], 'BLOCKED-INPUT')
        self.assertTrue(x['reason'].startswith('input missing:'))
        self.assertEqual(run(mutate_d=gone)['verdict'], 'INCOMPLETE')

    def test_a_missing_independent_bounds_file_makes_the_gate_incomplete_and_not_a_pass(self):
        def miss(K):
            K['bound'] = {}
            K['missing'] = 'docs/battle-theatre/history/arrivals.json'
        out = run(mutate_k=miss)
        self.assertEqual(out['verdict'], 'INCOMPLETE')
        self.assertTrue(any('input missing' in r for r in out['incomplete_reasons']))


# ------------------------------------------------------------------------------------------------------------------------------------------------------------------ the real product
class RealProduct(unittest.TestCase):
    """The real node child on the real product with one injected defect (tests/governance/gates/q456_mutations/). Light: a few units, the default scenario, the coarse grid."""
    UNIT = 'us-1c-1d-meredith-19in'

    def runner(self, mutation, units=None, extra=()):
        env = Env(out=tempfile.mkdtemp(prefix='q04-e2e-'))
        rec, out = Q.run(env, mutate=os.path.join(MUT, mutation) if mutation else None, write=False, extra=['--scenarios', 'default', '--grid', 'coarse', '--units', units or self.UNIT, '--no-restriction-check'] + list(extra))
        return out

    def test_the_unmutated_product_has_nothing_before_the_arrival_window_for_these_units(self):
        out = self.runner(None, units='%s,us-1c-art-1nyl,us-2c-art-1nyb' % self.UNIT)
        bad = [(i['id'], i['reason'][:200]) for i in out['items'] if i['check'] in ('Q04.1', 'Q04.3', 'Q04.4') and i['result'] == 'FAIL']
        self.assertEqual(bad, [])
        self.assertTrue(items(out, 'Q04.1', 'Q04.1/%s/' % self.UNIT))
        self.assertEqual(out['verdict'], 'INCOMPLETE')                 # a partial, coarse scan can never be a PASS

    def test_a_gate_moved_six_hours_earlier_is_caught_by_the_independent_bound(self):
        x = [i for i in self.runner('early_gate.mjs')['items'] if i['check'] == 'Q04.1' and self.UNIT in i['id']][0]
        self.assertEqual(x['result'], 'FAIL', x['reason'])
        self.assertIn('earliest documented value', x['reason'])

    def test_an_enter_event_before_the_window_is_refused_by_the_cache_and_still_reported(self):
        x = [i for i in self.runner('refused_event.mjs')['items'] if i['check'] == 'Q04.1' and self.UNIT in i['id']][0]
        self.assertEqual(x['result'], 'FAIL', x['reason'])
        self.assertTrue('refused' in x['reason'] or 'event(s) before the window' in x['reason'], x['reason'])

    def test_a_stage_that_draws_the_unit_before_the_window_the_layer_records_is_caught(self):
        x = [i for i in self.runner('stage_early.mjs')['items'] if i['check'] == 'Q04.1' and self.UNIT in i['id']][0]
        self.assertEqual(x['result'], 'FAIL', x['reason'])
        self.assertIn('window the scenario selects', x['reason'])

    def test_guns_drawn_from_the_first_frame_are_caught(self):
        x = [i for i in self.runner('guns_early.mjs', units='us-2c-art-1nyb')['items'] if i['check'] == 'Q04.1' and 'us-2c-art-1nyb' in i['id']][0]
        self.assertEqual(x['result'], 'FAIL', x['reason'])
        self.assertIn('guns', x['reason'])

    def test_a_manifest_that_exists_before_the_unit_enters_is_caught(self):
        x = [i for i in self.runner('manifest_early.mjs')['items'] if i['check'] == 'Q04.1' and self.UNIT in i['id']][0]
        self.assertEqual(x['result'], 'FAIL', x['reason'])
        self.assertIn('manifest', x['reason'])

    def test_a_march_sound_before_the_window_opens_is_caught(self):
        x = [i for i in self.runner('effect_early.mjs')['items'] if i['check'] == 'Q04.1' and self.UNIT in i['id']][0]
        self.assertEqual(x['result'], 'FAIL', x['reason'])
        self.assertIn('animation emits', x['reason'])

    def test_a_unit_that_leaves_inside_the_ground_is_caught_on_a_dense_run(self):
        x = [i for i in self.runner('vanish.mjs', extra=['--grid-dense-for-tests']) ['items'] if i['check'] == 'Q04.4' and self.UNIT in i['id']]
        self.assertTrue(x and x[0]['result'] == 'FAIL', [i['reason'] for i in x])


if __name__ == '__main__':
    unittest.main()
