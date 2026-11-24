"""Tests of the Q06 runner (march-to-position check): every check has an injected defect it must catch (GATE-SPEC U-25, K11).

    python3 -m unittest discover -s tests/governance/gates -p 'test_q06.py' -v

The unit tests give the runner a synthetic dump of the node child (q456_fixtures.py q06_dump); the end-to-end tests run the real node child (q06_path.mjs) on the real product with a mutation module that injects one
defect into the real code path (tests/governance/gates/q456_mutations/*.mjs), on a few units and the default scenario, and read the real findings (units the layer does not draw have no path).
"""
import copy
import json
import os
import tempfile
import unittest

import q456_fixtures as F  # noqa: E402
from pq_common import Env, Record  # noqa: E402
import q06_path as Q  # noqa: E402

MUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'q456_mutations')
COVER = lambda env, ids: (True, [], [])  # noqa: E731
NOCOVER = lambda env, ids: (False, ['no register entry names this gap'], [])  # noqa: E731
R1, R2, CAV, OPEN, EDGE, NOF = 'us-1c-1d-r1', 'us-1c-1d-r2', 'us-cav-1d-c1', 'us-2c-1d-open', 'us-6c-2d-edge', 'us-cav-2d-huey'


def run(D=None, mutate_d=None, cover=None, drop_open=False):
    env = Env(root=F.ROOT, out=tempfile.mkdtemp(prefix='q06-test-'))
    D = copy.deepcopy(D) if D is not None else F.q06_dump()
    if mutate_d:
        mutate_d(D)
    K = Q.load_inputs(Record('Q06', env), env, run_checker=False)
    K['undrawn'] = F.q06_inputs_undrawn()
    old = Q.covered_by_register
    if cover is not None:
        Q.covered_by_register = cover
    try:
        rec, out = Q.run(env, dump=D, inputs=K, write=False)
    finally:
        Q.covered_by_register = old
    return out


def items(out, check=None, sub=None):
    return [i for i in out['items'] if (check is None or i['check'] == check) and (sub is None or sub in i['id'])]


def one(out, check, sub):
    xs = items(out, check, sub)
    assert len(xs) == 1, (check, sub, [i['id'] for i in xs])
    return xs[0]


def beh(D, uid=R1):
    return list(D['behaviours'][uid].values())[0]


class CleanFixture(unittest.TestCase):
    def test_units_with_a_chain_pass_and_the_units_with_no_path_fail_and_the_unit_never_on_the_field_is_not_applicable(self):
        out = run(cover=COVER)
        self.assertEqual(one(out, 'Q06.1', 'Q06.1/%s/delegated' % R1)['result'], 'PASS')
        self.assertEqual(one(out, 'Q06.1', 'Q06.1/%s/delegated' % CAV)['result'], 'PASS')
        self.assertEqual(one(out, 'Q06.3', 'Q06.3/%s' % OPEN)['result'], 'FAIL')
        self.assertEqual(one(out, 'Q06.3', 'Q06.3/%s' % EDGE)['result'], 'FAIL')
        x = one(out, 'Q06.3', 'Q06.3/%s' % NOF)
        self.assertEqual(x['result'], 'N/A')
        self.assertFalse(x['pass'])
        self.assertEqual(out['verdict'], 'FAIL')

    def test_a_layer_in_which_every_unit_has_a_chain_passes_with_every_check_present(self):
        def all_moving(D):
            for uid in (OPEN, EDGE, NOF):
                D['behaviours'].pop(uid, None)
            D['units'] = [u for u in D['units'] if u['id'] not in (OPEN, EDGE, NOF)]
            for k in ('delegated', 'pdf'):
                for uid in (OPEN, EDGE, NOF):
                    D['hashes']['default'].pop(uid, None)
        out = run(mutate_d=all_moving, cover=COVER)
        bad = [(i['id'], i['result'], i['reason'][:200]) for i in out['items'] if i['result'] != 'PASS']
        self.assertEqual(bad, [], bad)
        self.assertEqual(out['verdict'], 'PASS')
        for chk in ('Q06.1', 'Q06.2', 'Q06.4', 'Q06.5', 'Q06.S*'):
            self.assertTrue(items(out, chk), chk)

    def test_pass_is_true_only_for_the_result_pass_and_every_item_has_a_reason_and_evidence(self):
        for i in run(cover=COVER)['items']:
            self.assertEqual(i['pass'], i['result'] == 'PASS', i['id'])
            self.assertTrue(i['reason'] and 'evidence' in i, i['id'])

    def test_two_runs_give_identical_items(self):
        self.assertEqual(json.dumps(run(cover=COVER)['items'], sort_keys=True), json.dumps(run(cover=COVER)['items'], sort_keys=True))

    def test_the_thresholds_are_recorded_with_their_decision(self):
        t = {x['id']: x for x in run(cover=COVER)['thresholds']}
        self.assertEqual(t['T-Q06-1']['value'], 90)
        self.assertEqual(t['T-Q06-1']['decision'], 'DD-G01')
        self.assertEqual(t['T-Q05-1']['value'], 1.0)


class Chain(unittest.TestCase):                       # Q06.1
    def test_a_drawn_unit_with_no_leg_has_no_chain_and_fails(self):
        def nolegs(D):
            beh(D)['legs'] = []
            beh(D)['joins'] = []
        self.assertEqual(one(run(mutate_d=nolegs), 'Q06.1', 'Q06.1/%s/delegated' % R1)['result'], 'FAIL')

    def test_a_leg_that_starts_more_than_a_metre_from_where_the_last_ended_breaks_the_chain(self):
        def gap(D):
            beh(D)['joins'][1]['d_m'] = 7.0
        x = one(run(mutate_d=gap), 'Q06.1', 'Q06.1/%s/delegated' % R1)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('T-Q05-1', x['reason'])

    def test_a_first_leg_that_does_not_start_at_the_entry_breaks_the_chain(self):
        def gap(D):
            beh(D)['joins'][0]['d_m'] = 40.0
        self.assertIn('the entry', one(run(mutate_d=gap), 'Q06.1', 'Q06.1/%s/delegated' % R1)['reason'])

    def test_a_leg_that_starts_before_the_one_before_ended_puts_the_unit_in_two_places(self):
        def overlap(D):
            beh(D)['joins'][1]['gap_s'] = -90.0
        x = one(run(mutate_d=overlap), 'Q06.1', 'Q06.1/%s/delegated' % R1)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('two places', x['reason'])

    def test_a_chain_that_does_not_end_at_the_units_fighting_position_fails(self):
        def off(D):
            beh(D)['slot']['x'] += 30.0
        x = one(run(mutate_d=off), 'Q06.1', 'Q06.1/%s/delegated' % R1)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('fighting position', x['reason'])

    def test_a_unit_with_legs_and_no_fighting_position_fails(self):
        def noslot(D):
            beh(D)['slot'] = None
        self.assertEqual(one(run(mutate_d=noslot), 'Q06.1', 'Q06.1/%s/delegated' % R1)['result'], 'FAIL')

    def test_the_departure_leg_is_not_part_of_the_chain_to_the_fighting_position(self):
        self.assertEqual(one(run(cover=COVER), 'Q06.1', 'Q06.1/%s/delegated' % R2)['result'], 'PASS')
        def wrong(D):
            beh(D, R2)['legs'][1]['end'] = [-950.0, 300.0]               # the chain (before the departure) ends 50 m from the fighting position
        self.assertEqual(one(run(mutate_d=wrong), 'Q06.1', 'Q06.1/%s/delegated' % R2)['result'], 'FAIL')

    def test_a_leg_with_no_tier_or_an_open_gap_tier_or_no_source_or_no_rate_fails(self):
        for key, val, word in (('tier', 'open gap', 'tier'), ('tier', None, 'tier'), ('sources', [], 'source key'), ('mean_ms', 0, 'rate')):
            def bad(D, k=key, v=val):
                beh(D)['legs'][0][k] = v
            x = one(run(mutate_d=bad), 'Q06.1', 'Q06.1/%s/delegated' % R1)
            self.assertEqual(x['result'], 'FAIL', (key, val))
            self.assertIn(word, x['reason'])

    def test_a_leg_walked_faster_than_the_documented_bound_fails_q06_too(self):
        def fast(D):
            beh(D)['legs'][0]['max_seg_ms'] = 3.5
        x = one(run(mutate_d=fast), 'Q06.1', 'Q06.1/%s/delegated' % R1)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('Q05', x['reason'])

    def test_a_unit_with_no_road_of_approach_or_an_unmarked_road_fails(self):
        def noap(D):
            beh(D)['approach'] = None
        self.assertEqual(one(run(mutate_d=noap), 'Q06.1', 'Q06.1/%s/delegated' % R1)['result'], 'FAIL')
        def gap(D):
            beh(D)['approach']['tier'] = 'open gap'
        self.assertEqual(one(run(mutate_d=gap), 'Q06.1', 'Q06.1/%s/delegated' % R1)['result'], 'FAIL')
        def nosrc(D):
            beh(D)['approach'].update({'has_sources': False, 'modelled': False})
        self.assertEqual(one(run(mutate_d=nosrc), 'Q06.1', 'Q06.1/%s/delegated' % R1)['result'], 'FAIL')
        def modelled(D):
            beh(D)['approach'].update({'has_sources': False, 'modelled': True})
        self.assertEqual(one(run(mutate_d=modelled), 'Q06.1', 'Q06.1/%s/delegated' % R1)['result'], 'PASS')

    def test_legs_with_no_stop_and_no_day_position_behind_them_fail(self):
        def nostop(D):
            beh(D)['plan'].update({'n_stops': 0, 'n_days_feasible': 0})
        self.assertEqual(one(run(mutate_d=nostop), 'Q06.1', 'Q06.1/%s/delegated' % R1)['result'], 'FAIL')


class NotDeployed(unittest.TestCase):                 # Q06.2
    def test_a_unit_built_as_a_line_appears_deployed_and_fails(self):
        def line(D):
            beh(D)['layout']['kind'] = 'line'
        x = one(run(mutate_d=line), 'Q06.2', 'Q06.2/%s/delegated' % R1)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('appears deployed', x['reason'])

    def test_a_change_of_formation_before_the_entry_fails(self):
        def early(D):
            beh(D, R2)['formations'][0]['t'] = 45000.0
        self.assertEqual(one(run(mutate_d=early, cover=COVER), 'Q06.2', 'Q06.2/%s/delegated' % R2)['result'], 'FAIL')

    def test_a_change_of_formation_that_precedes_the_entry_fails_even_when_a_leg_has_ended_before_it(self):
        def odd(D):
            beh(D, R2)['entry']['t'] = 45500.0                 # the entry is recorded after the legs and the change of formation (a corrupted order)
        x = one(run(mutate_d=odd, cover=COVER), 'Q06.2', 'Q06.2/%s/delegated' % R2)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('precedes the entry', x['reason'])

    def test_a_change_of_formation_before_the_unit_has_marched_anywhere_fails(self):
        def early(D):
            beh(D, R2)['formations'][0]['t'] = 45150.0
        x = one(run(mutate_d=early, cover=COVER), 'Q06.2', 'Q06.2/%s/delegated' % R2)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('before the unit has marched', x['reason'])

    def test_a_deployment_that_lasts_other_than_the_recorded_tuning_value_fails(self):
        def other(D):
            beh(D, R2)['formations'][0]['duration_s'] = 45
        self.assertEqual(one(run(mutate_d=other, cover=COVER), 'Q06.2', 'Q06.2/%s/delegated' % R2)['result'], 'FAIL')

    def test_a_change_shown_with_a_tier_better_than_its_plausible_procedural_duration_fails(self):
        def tier(D):
            beh(D, R2)['formations'][0]['tier'] = 'inferred'
        x = one(run(mutate_d=tier, cover=COVER), 'Q06.2', 'Q06.2/%s/delegated' % R2)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('tuning value', x['reason'])

    def test_a_deployment_with_no_open_register_entry_for_its_duration_is_blocked_input_and_with_one_it_passes(self):
        x = one(run(cover=NOCOVER), 'Q06.2', 'Q06.2/%s/delegated' % R2)
        self.assertEqual(x['result'], 'BLOCKED-INPUT')
        self.assertTrue(x['reason'].startswith('input missing:'))
        self.assertEqual(one(run(cover=COVER), 'Q06.2', 'Q06.2/%s/delegated' % R2)['result'], 'PASS')

    def test_a_unit_with_no_change_of_formation_needs_no_register_entry(self):
        self.assertEqual(one(run(cover=NOCOVER), 'Q06.2', 'Q06.2/%s/delegated' % R1)['result'], 'PASS')


class EveryUnit(unittest.TestCase):                   # Q06.3
    def test_a_leaf_unit_the_layer_does_not_draw_has_no_path_and_fails_with_the_research_it_has_not_consumed(self):
        x = one(run(), 'Q06.3', 'Q06.3/%s' % OPEN)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('no path', x['reason'])
        self.assertIn('too many units', x['reason'])
        r = x['evidence']['research']
        self.assertFalse(r['layer_consumes_them'])
        self.assertEqual(r['group_file_records_by_kind'], {'position': 3, 'arrival': 1})
        self.assertEqual(r['checker_exit'], 0)

    def test_a_unit_shown_only_where_its_road_leaves_the_ground_has_no_path_to_a_fighting_position_and_fails(self):
        x = one(run(), 'Q06.3', 'Q06.3/%s' % EDGE)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('only where its road of approach leaves the loaded ground', x['reason'])

    def test_a_unit_that_gets_a_chain_stops_failing(self):
        def drawn(D):
            for u in D['units']:
                if u['id'] == OPEN:
                    u['render'] = 'moving'
                    u['drawn'] = True
            D['behaviours'][OPEN] = {'q-' + OPEN: F._q06_behaviour('q-' + OPEN)}
        out = run(mutate_d=drawn, cover=COVER)
        self.assertEqual(items(out, 'Q06.3', 'Q06.3/%s' % OPEN), [])
        self.assertEqual(one(out, 'Q06.1', 'Q06.1/%s/delegated' % OPEN)['result'], 'PASS')

    def test_an_undrawn_unit_is_a_fail_even_when_the_research_checker_accepts_its_records(self):
        self.assertEqual(one(run(), 'Q06.3', 'Q06.3/%s' % OPEN)['evidence']['research']['checker']['us-1c-1d-art']['errors'], 0)
        self.assertEqual(one(run(), 'Q06.3', 'Q06.3/%s' % OPEN)['result'], 'FAIL')

    def test_a_unit_with_no_scan_record_is_blocked_input(self):
        def gone(D):
            D['behaviours'][OPEN] = {}
        x = one(run(mutate_d=gone), 'Q06.3', 'Q06.3/%s' % OPEN)
        self.assertEqual(x['result'], 'BLOCKED-INPUT')
        self.assertTrue(x['reason'].startswith('input missing:'))


class Departure(unittest.TestCase):                   # Q06.4
    def test_a_unit_that_leaves_by_a_march_that_ends_outside_the_ground_passes(self):
        self.assertEqual(one(run(cover=COVER), 'Q06.4', 'Q06.4/%s/delegated' % R2)['result'], 'PASS')

    def test_a_unit_that_leaves_with_no_march_vanishes_and_fails(self):
        def vanish(D):
            beh(D, R2)['leave']['march_before'] = None
        x = one(run(mutate_d=vanish, cover=COVER), 'Q06.4', 'Q06.4/%s/delegated' % R2)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('vanishes', x['reason'])

    def test_a_march_out_that_ends_inside_the_ground_fails(self):
        def inside(D):
            beh(D, R2)['leave']['march_before']['end_in_box'] = True
        self.assertEqual(one(run(mutate_d=inside, cover=COVER), 'Q06.4', 'Q06.4/%s/delegated' % R2)['result'], 'FAIL')

    def test_a_unit_that_leaves_before_its_march_ends_fails(self):
        def early(D):
            beh(D, R2)['leave']['t'] = 46090.0
        self.assertEqual(one(run(mutate_d=early, cover=COVER), 'Q06.4', 'Q06.4/%s/delegated' % R2)['result'], 'FAIL')

    def test_a_march_out_that_does_not_start_where_the_unit_stood_fails(self):
        def jump(D):
            beh(D, R2)['joins'][2]['d_m'] = 25.0
        self.assertEqual(one(run(mutate_d=jump, cover=COVER), 'Q06.4', 'Q06.4/%s/delegated' % R2)['result'], 'FAIL')


class OutsideTheMap(unittest.TestCase):               # Q06.5
    def test_an_entry_inside_the_loaded_ground_fails(self):
        def inside(D):
            beh(D)['entry'].update({'outside_box': False, 'outside_ground': False})
        self.assertEqual(one(run(mutate_d=inside), 'Q06.5', 'Q06.5/%s/delegated' % R1)['result'], 'FAIL')

    def test_an_entry_that_is_not_on_the_road_of_approach_fails(self):
        def off(D):
            beh(D)['entry']['d_road_m'] = 12.0
        x = one(run(mutate_d=off), 'Q06.5', 'Q06.5/%s/delegated' % R1)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('road of approach', x['reason'])

    def test_a_road_that_does_not_cross_the_edge_fails(self):
        def nocross(D):
            beh(D)['entry']['crossing_s'] = None
        self.assertEqual(one(run(mutate_d=nocross), 'Q06.5', 'Q06.5/%s/delegated' % R1)['result'], 'FAIL')

    def test_an_arrival_record_that_does_not_resolve_the_entry_fails(self):
        def open_(D):
            beh(D)['arrival']['entry_status'] = 'open gap: no road of approach'
        self.assertEqual(one(run(mutate_d=open_), 'Q06.5', 'Q06.5/%s/delegated' % R1)['result'], 'FAIL')

    def test_a_unit_with_no_enter_event_fails(self):
        def noenter(D):
            beh(D)['entry'] = None
        self.assertEqual(one(run(mutate_d=noenter), 'Q06.5', 'Q06.5/%s/delegated' % R1)['result'], 'FAIL')


class ScenarioSet(unittest.TestCase):
    def test_a_factorisation_violation_fails(self):
        def bad(D):
            D['scenario_set']['factorisation']['violations'] = [{'scenario': 'x', 'units': [R1], 'n': 1}]
        self.assertEqual(one(run(mutate_d=bad), 'Q06.S*', 'S*/factorisation')['result'], 'FAIL')

    def test_a_part_of_s_star_is_not_run_and_the_verdict_is_never_a_pass(self):
        def part(D):
            D['scenario_set'].update({'complete': False, 'id': 'default'})
        out = run(mutate_d=part, cover=COVER)
        self.assertEqual(one(out, 'Q06.S*', 'S*/factorisation')['result'], 'NOT-RUN')
        self.assertNotEqual(out['verdict'], 'PASS')

    def test_a_unit_with_no_scan_record_is_blocked_input(self):
        def gone(D):
            D['behaviours'][R1] = {}
        x = one(run(mutate_d=gone), 'Q06.1', 'Q06.1/%s/delegated' % R1)
        self.assertEqual(x['result'], 'BLOCKED-INPUT')

    def test_a_partial_scan_judges_only_the_selected_units(self):
        def sel(D):
            D['selected_units'] = [R1]
        out = run(mutate_d=sel, cover=COVER)
        self.assertEqual(sorted({i['subjects'][0] for i in out['items'] if i.get('subjects')}), [R1])
        self.assertEqual(out['verdict'], 'INCOMPLETE')


# ------------------------------------------------------------------------------------------------------------------------------------------------------------------ the real product
class RealProduct(unittest.TestCase):
    UNIT = 'us-1c-1d-meredith-19in'

    def runner(self, mutation, units=None):
        env = Env(root=F.ROOT, out=tempfile.mkdtemp(prefix='q06-e2e-'))
        K = Q.load_inputs(Record('Q06', env), env, run_checker=False)
        rec, out = Q.run(env, mutate=os.path.join(MUT, mutation) if mutation else None, write=False, inputs=K, extra=['--scenarios', 'default', '--units', units or self.UNIT])
        return out

    def get(self, out, check, uid=None):
        return [i for i in out['items'] if i['check'] == check and (uid or self.UNIT) in i['id']][0]

    def test_the_real_product_gives_this_regiment_a_chain_from_the_edge_to_its_fighting_position_and_enters_it_as_a_column(self):
        out = self.runner(None)
        for chk in ('Q06.1', 'Q06.2', 'Q06.5'):
            x = self.get(out, chk)
            self.assertEqual(x['result'], 'PASS', (chk, x['reason']))

    def test_the_real_layer_gives_the_units_it_does_not_draw_no_path_and_says_why(self):
        out = self.runner(None, units='us-3c-2d-carr-1ma,us-6c-2d-neill-7me,us-cav-2d-huey')
        a = self.get(out, 'Q06.3', 'us-3c-2d-carr-1ma')
        self.assertEqual(a['result'], 'FAIL')
        self.assertIn('Open gap', a['evidence']['reason'])
        b = self.get(out, 'Q06.3', 'us-6c-2d-neill-7me')
        self.assertEqual(b['result'], 'FAIL')
        self.assertEqual(b['evidence']['render'], 'edge_only')
        self.assertEqual(self.get(out, 'Q06.3', 'us-cav-2d-huey')['result'], 'N/A')

    def test_a_leg_moved_30_m_breaks_the_chain(self):
        x = self.get(self.runner('chain_gap.mjs'), 'Q06.1')
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('T-Q05-1', x['reason'])

    def test_a_fighting_position_that_is_not_where_the_last_leg_ends_is_caught(self):
        x = self.get(self.runner('slot_mismatch.mjs'), 'Q06.1')
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('fighting position', x['reason'])

    def test_a_unit_built_as_a_line_is_caught_as_deployed_on_appearance(self):
        x = self.get(self.runner('built_as_line.mjs'), 'Q06.2')
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('appears deployed', x['reason'])

    KERSHAW = 'cs-1c-mclaws-kershaw-2sc'

    def test_a_real_change_of_formation_shows_the_tuning_values_tier_and_passes_with_its_register_entry(self):
        x = self.get(self.runner(None, units=self.KERSHAW), 'Q06.2', self.KERSHAW)
        self.assertTrue(x['evidence']['formations'], 'this unit changes formation')
        self.assertEqual({f['tier'] for f in x['evidence']['formations']}, {'plausible-procedural'})
        self.assertEqual(x['evidence']['register_ids'], ['EG-0921'])
        self.assertEqual(x['result'], 'PASS', x['reason'])

    def test_the_same_change_is_blocked_input_until_the_register_entry_exists(self):
        old = Q.Q06_2_ENTRIES
        Q.Q06_2_ENTRIES = []
        try:
            x = self.get(self.runner(None, units=self.KERSHAW), 'Q06.2', self.KERSHAW)
        finally:
            Q.Q06_2_ENTRIES = old
        self.assertEqual(x['result'], 'BLOCKED-INPUT', x['reason'])
        self.assertIn('register entry', x['reason'])

    def test_planted_defect_a_change_of_formation_shown_with_a_tier_better_than_its_tuning_value_duration_fails(self):
        x = self.get(self.runner('formation_tier_better.mjs', units=self.KERSHAW), 'Q06.2', self.KERSHAW)
        self.assertEqual(x['result'], 'FAIL', x['reason'])
        self.assertIn('tuning value', x['reason'])


if __name__ == '__main__':
    unittest.main()
