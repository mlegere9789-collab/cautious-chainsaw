"""Tests of the Q05 runner (position-time plausibility): every check has an injected defect it must catch (GATE-SPEC U-25, K11).

    python3 -m unittest discover -s tests/governance/gates -p 'test_q05.py' -v

The unit tests give the runner a synthetic dump of the node child (q456_fixtures.py q05_dump) and the real documented figures (app/data/anim3d/drill-timing.json, gait-sources.json); the end-to-end tests run the real
node child (q05_speed.mjs) on the real product with a mutation module that injects one defect into the real code path (tests/governance/gates/q456_mutations/*.mjs), on a few units and the coarse grid.
"""
import copy
import json
import os
import tempfile
import unittest

import q456_fixtures as F  # noqa: E402
from pq_common import Env  # noqa: E402
import q05_speed as Q  # noqa: E402

MUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'q456_mutations')
COVER = lambda env, ids: (True, [], [{'id': i, 'open': True, 'link_level': 'L1+search_log'} for i in ids])  # noqa: E731
NOCOVER = lambda env, ids: (False, ['no register entry names this gap'] if not ids else ['%s: no dated search log' % ids[0]], [])  # noqa: E731
INF, ART, CAV = 'us-1c-1d-r1', 'us-1c-art-b1', 'us-cav-1d-c1'


def run(D=None, mutate_d=None, cover=COVER):
    env = Env(out=tempfile.mkdtemp(prefix='q05-test-'))
    D = copy.deepcopy(D) if D is not None else F.q05_dump()
    if mutate_d:
        mutate_d(D)
    from pq_common import Record
    rec0 = Record('Q05', env)
    K = Q.load_inputs(rec0, env)
    K['cover'] = cover
    rec, out = Q.run(env, dump=D, inputs=K, write=False)
    return out


def items(out, check=None, sub=None):
    return [i for i in out['items'] if (check is None or i['check'] == check) and (sub is None or sub in i['id'])]


def one(out, check, sub):
    xs = items(out, check, sub)
    assert len(xs) == 1, (check, sub, [i['id'] for i in xs])
    return xs[0]


def beh(D, uid=INF):
    return list(D['behaviours'][uid].values())[0]


class CleanFixture(unittest.TestCase):
    def test_a_product_whose_every_leg_is_within_the_documented_ranges_and_continuous_passes_apart_from_the_covered_offsets(self):
        out = run()
        bad = [(i['id'], i['result'], i['reason'][:160]) for i in out['items'] if i['result'] not in ('PASS', 'COVERED')]
        self.assertEqual(bad, [], bad)
        self.assertEqual([i['check'] for i in items(out) if i['result'] == 'COVERED' and i['check'] != 'Q05.5' and i['check'] != 'Q05.4'], [])
        self.assertEqual(out['verdict'], 'INCOMPLETE')                 # COVERED items keep the verdict INCOMPLETE: Q05 has no register branch (K3)
        self.assertTrue(any('COVERED' in r for r in out['incomplete_reasons']))
        for chk in ('Q05.1', 'Q05.2', 'Q05.3', 'Q05.4', 'Q05.5'):
            self.assertTrue(items(out, chk), chk)

    def test_pass_is_true_only_for_the_result_pass_and_every_item_has_a_reason_and_evidence(self):
        for i in run()['items']:
            self.assertEqual(i['pass'], i['result'] == 'PASS', i['id'])
            self.assertTrue(i['reason'] and 'evidence' in i, i['id'])

    def test_two_runs_give_identical_items(self):
        self.assertEqual(json.dumps(run()['items'], sort_keys=True), json.dumps(run()['items'], sort_keys=True))

    def test_the_thresholds_are_recorded_with_their_decision(self):
        t = {x['id']: x for x in run()['thresholds']}
        self.assertEqual(t['T-Q05-1']['value'], 1.0)
        self.assertEqual(t['T-Q05-2']['value'], 1.0001)
        self.assertEqual(t['T-Q05-1']['decision'], 'DD-G01')

    def test_without_register_entries_the_missing_ranges_and_the_offsets_are_blocked_input_and_the_verdict_is_incomplete(self):
        out = run(cover=NOCOVER)
        self.assertEqual(out['verdict'], 'INCOMPLETE')
        for sub in ('Q05.4', 'Q05.5'):
            xs = [i for i in items(out, sub) if i['result'] != 'FAIL']
            self.assertTrue(xs and all(i['result'] == 'BLOCKED-INPUT' and i['reason'].startswith('input missing:') for i in xs), sub)


class Speed(unittest.TestCase):                       # Q05.1
    def test_a_segment_above_the_urgent_double_quick_fails(self):
        def fast(D):
            beh(D)['legs'][0]['max_seg_ms'] = 2.6
        x = one(run(mutate_d=fast), 'Q05.1', 'Q05.1/%s/delegated' % INF)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('above the foot column bound', x['reason'])

    def test_the_rounding_factor_of_the_bound_is_exactly_1_0001(self):
        def edge(D):
            beh(D)['legs'][0]['max_seg_ms'] = 2.5146 * 1.00005
        self.assertEqual(one(run(mutate_d=edge), 'Q05.1', 'Q05.1/%s/delegated' % INF)['result'], 'PASS')
        def over(D):
            beh(D)['legs'][0]['max_seg_ms'] = 2.5146 * 1.0002
        self.assertEqual(one(run(mutate_d=over), 'Q05.1', 'Q05.1/%s/delegated' % INF)['result'], 'FAIL')

    def test_a_leg_declared_march_with_a_mean_speed_above_quick_time_fails_the_lower_and_upper_bound_of_its_gait(self):
        def mid(D):
            l = beh(D)['legs'][1]
            l['mean_ms'] = 1.6
            l['max_seg_ms'] = 1.6
        x = one(run(mutate_d=mid), 'Q05.1', 'Q05.1/%s/delegated' % INF)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('declared march', x['reason'])

    def test_a_leg_declared_double_quick_at_a_speed_below_the_documented_double_quick_fails(self):
        def slow(D):
            l = beh(D)['legs'][0]
            l['mean_ms'] = 1.8
            l['max_seg_ms'] = 1.8
        x = one(run(mutate_d=slow), 'Q05.1', 'Q05.1/%s/delegated' % INF)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('declared double_quick', x['reason'])

    def test_a_leg_with_no_declared_gait_cannot_be_set_against_a_range_and_fails(self):
        def nogait(D):
            beh(D)['legs'][1]['gait'] = None
        self.assertIn('no declared gait', one(run(mutate_d=nogait), 'Q05.1', 'Q05.1/%s/delegated' % INF)['reason'])

    def test_a_jump_inside_a_path_fails(self):
        def jump(D):
            beh(D)['legs'][1]['zero_time_moves'] = 1
        x = one(run(mutate_d=jump), 'Q05.1', 'Q05.1/%s/delegated' % INF)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('in no time', x['reason'])

    def test_a_cavalry_segment_above_the_slowest_documented_gallop_fails_and_one_below_passes(self):
        def fast(D):
            beh(D, CAV)['legs'][0]['max_seg_ms'] = 4.6
        x = one(run(mutate_d=fast), 'Q05.1', 'Q05.1/%s/delegated' % CAV)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('cavalry mount', x['reason'])
        self.assertEqual(one(run(), 'Q05.1', 'Q05.1/%s/delegated' % CAV)['result'], 'PASS')

    def test_the_teams_of_horses_above_the_documented_gallop_fail(self):
        def fast(D):
            beh(D, ART)['train']['lists']['horses']['max_ms'] = 6.3
        x = one(run(mutate_d=fast), 'Q05.1', 'Q05.1/%s/delegated' % ART)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('teams of horses', x['reason'])


class NoTeleport(unittest.TestCase):                  # Q05.2
    def test_a_pair_of_samples_farther_apart_than_the_bound_allows_fails(self):
        def tele(D):
            beh(D)['step'].update({'n_over': 1, 'max': 6.7, 'offenders': [{'t': 45121.0, 'd_m': 400.0, 'dt_s': 60.0, 'v_ms': 6.7}]})
        x = one(run(mutate_d=tele), 'Q05.2', 'Q05.2/%s/delegated' % INF)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('farther apart', x['reason'])

    def test_a_gun_piece_that_jumps_fails(self):
        def tele(D):
            beh(D, ART)['gun_step'] = {'max': 9.0, 'at': 45200.0, 'n_over': 2, 'pairs': 400}
        self.assertEqual(one(run(mutate_d=tele), 'Q05.2', 'Q05.2/%s/delegated' % ART)['result'], 'FAIL')

    def test_a_unit_with_legs_that_is_never_present_at_two_consecutive_samples_fails(self):
        def nopairs(D):
            beh(D)['step']['pairs'] = 0
        self.assertEqual(one(run(mutate_d=nopairs), 'Q05.2', 'Q05.2/%s/delegated' % INF)['result'], 'FAIL')


class Continuity(unittest.TestCase):                  # Q05.3
    def test_a_leg_that_starts_more_than_a_metre_from_where_the_last_ended_fails(self):
        def gap(D):
            beh(D)['joins'][1]['d_m'] = 5.0
        x = one(run(mutate_d=gap), 'Q05.3', 'Q05.3/%s/delegated' % INF)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('T-Q05-1', x['reason'])

    def test_a_join_of_exactly_one_metre_is_allowed(self):
        def ok(D):
            beh(D)['joins'][1]['d_m'] = 1.0
        self.assertEqual(one(run(mutate_d=ok), 'Q05.3', 'Q05.3/%s/delegated' % INF)['result'], 'PASS')

    def test_a_first_leg_that_does_not_start_at_the_entry_fails(self):
        def gap(D):
            beh(D)['joins'][0]['d_m'] = 12.0
        x = one(run(mutate_d=gap), 'Q05.3', 'Q05.3/%s/delegated' % INF)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('the entry', x['reason'])

    def test_a_leg_that_starts_before_the_one_before_has_ended_puts_the_unit_in_two_places_and_fails(self):
        def overlap(D):
            beh(D)['joins'][1]['gap_s'] = -300.0
        x = one(run(mutate_d=overlap), 'Q05.3', 'Q05.3/%s/delegated' % INF)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('two places', x['reason'])

    def test_a_turn_whose_far_end_moves_faster_than_the_foot_bound_fails(self):
        def turn(D):
            beh(D)['turns'].append({'t': 45300.0, 'dA': 1.4, 'turn_s': 25.0, 'r_m': 46.0, 'v_ms': 2.44, 'omega_peak': 0.084, 'rot_peak_ms': 3.9, 'edge_peak_ms': 4.6, 'edge_sum_ms': 6.3, 'edge_mean_ms': 3.1})
        x = one(run(mutate_d=turn), 'Q05.3', 'Q05.3/%s/delegated' % INF)
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('far end', x['reason'])
        self.assertEqual(x['evidence']['turns_over'], 1)

    def test_a_turn_exactly_at_the_bound_passes(self):
        def turn(D):
            beh(D)['turns'][0]['edge_peak_ms'] = 2.5146
        self.assertEqual(one(run(mutate_d=turn), 'Q05.3', 'Q05.3/%s/delegated' % INF)['result'], 'PASS')

    def test_a_cavalry_column_may_turn_faster_than_a_foot_column_up_to_its_own_bound(self):
        def turn(D):
            beh(D, CAV)['turns'][0]['edge_peak_ms'] = 3.5
        self.assertEqual(one(run(mutate_d=turn), 'Q05.3', 'Q05.3/%s/delegated' % CAV)['result'], 'PASS')
        def turn2(D):
            beh(D, CAV)['turns'][0]['edge_peak_ms'] = 4.6
        self.assertEqual(one(run(mutate_d=turn2), 'Q05.3', 'Q05.3/%s/delegated' % CAV)['result'], 'FAIL')


class TimeAgainstRate(unittest.TestCase):             # Q05.4
    def test_a_lateness_the_layer_keeps_as_an_offset_is_covered_only_with_an_l3_register_entry(self):
        out = run()
        xs = items(out, 'Q05.4')
        self.assertEqual(len(xs), 1)
        self.assertEqual(xs[0]['result'], 'COVERED')
        self.assertFalse(xs[0]['pass'])
        self.assertEqual(run(cover=NOCOVER)['items'] and one(run(cover=NOCOVER), 'Q05.4', 'Q05.4/%s' % INF)['result'], 'BLOCKED-INPUT')

    def test_a_layer_that_speeds_up_to_meet_the_time_fails_the_offset_item_and_the_speed_item(self):
        def cheat(D):
            beh(D)['legs'][0]['max_seg_ms'] = 3.0
        out = run(mutate_d=cheat)
        self.assertEqual(one(out, 'Q05.4', 'Q05.4/%s' % INF)['result'], 'FAIL')
        self.assertEqual(one(out, 'Q05.1', 'Q05.1/%s/delegated' % INF)['result'], 'FAIL')

    def test_an_offset_of_zero_minutes_is_not_an_item(self):
        def zero(D):
            beh(D)['offsets'][0]['late_min'] = 0
        self.assertEqual(items(run(mutate_d=zero), 'Q05.4'), [])


class MissingRanges(unittest.TestCase):               # Q05.5
    def test_vehicles_above_the_conservative_foot_bound_fail_and_the_others_are_blocked_without_an_entry(self):
        def fast(D):
            beh(D, ART)['train']['lists']['limbers']['max_ms'] = 2.9
        out = run(mutate_d=fast, cover=NOCOVER)
        self.assertEqual(one(out, 'Q05.5', 'Q05.5/limber')['result'], 'FAIL')
        self.assertEqual(one(out, 'Q05.5', 'Q05.5/caisson')['result'], 'BLOCKED-INPUT')
        self.assertEqual(one(out, 'Q05.5', 'Q05.5/cavalry-mount')['result'], 'BLOCKED-INPUT')

    def test_with_an_open_l3_entry_and_the_conservative_bound_respected_the_class_is_covered_and_never_passes(self):
        out = run()
        for k in ('limber', 'caisson', 'wagon-forge', 'cavalry-mount'):
            x = one(out, 'Q05.5', 'Q05.5/' + k)
            self.assertEqual(x['result'], 'COVERED', k)
            self.assertFalse(x['pass'])

    def test_the_cavalry_class_reports_that_the_march_rate_is_below_every_documented_walk(self):
        x = one(run(), 'Q05.5', 'Q05.5/cavalry-mount')
        self.assertEqual(x['evidence']['measured']['below_documented_walk'], 1)
        self.assertIn('model parameter', x['reason'])


class ScenarioSet(unittest.TestCase):
    def test_a_factorisation_violation_fails(self):
        def bad(D):
            D['scenario_set']['factorisation']['violations'] = [{'scenario': 'x', 'units': [INF], 'n': 1}]
        self.assertEqual(one(run(mutate_d=bad), 'Q05.S*', 'S*/factorisation')['result'], 'FAIL')

    def test_a_part_of_s_star_is_not_run_and_the_verdict_is_incomplete(self):
        def part(D):
            D['scenario_set'].update({'complete': False, 'id': 'default'})
        out = run(mutate_d=part)
        self.assertEqual(one(out, 'Q05.S*', 'S*/factorisation')['result'], 'NOT-RUN')
        self.assertEqual(out['verdict'], 'INCOMPLETE')

    def test_the_coarse_grid_is_not_run_and_never_a_pass(self):
        def coarse(D):
            D['grid']['mode'] = 'coarse'
            D['scans'][0]['grid'] = {'mode': 'coarse', 'samples': 1473, 'integer_minutes': 27361}
        out = run(mutate_d=coarse)
        self.assertEqual(one(out, 'Q05.scan', 'scan/delegated')['result'], 'NOT-RUN')
        self.assertTrue(any('coarse test grid' in r for r in out['incomplete_reasons']))

    def test_a_unit_with_no_scan_record_is_blocked_input(self):
        def gone(D):
            D['behaviours'][INF] = {}
        x = one(run(mutate_d=gone), 'Q05.1', 'Q05.1/%s/delegated' % INF)
        self.assertEqual(x['result'], 'BLOCKED-INPUT')
        self.assertTrue(x['reason'].startswith('input missing:'))

    def test_the_bounds_of_the_node_child_must_equal_the_bounds_the_judge_reads(self):
        def off(D):
            D['bounds']['foot_upper'] = 3.0
        self.assertEqual(one(run(mutate_d=off), 'Q05.1', 'Q05/bounds')['result'], 'FAIL')

    def test_a_partial_scan_judges_only_the_selected_units(self):
        def sel(D):
            D['selected_units'] = [INF]
        out = run(mutate_d=sel)
        self.assertEqual(sorted({i['subjects'][0] for i in out['items'] if i.get('subjects')}), [INF])
        self.assertEqual(out['verdict'], 'INCOMPLETE')

    def test_a_scan_with_a_refused_event_fails(self):
        def refused(D):
            D['scans'][0]['refused_total'] = 3
        self.assertEqual(one(run(mutate_d=refused), 'Q05.scan', 'scan/delegated')['result'], 'FAIL')


class MissingInputs(unittest.TestCase):
    def test_a_missing_documented_table_blocks_the_speed_items_and_is_never_a_pass(self):
        env = Env(out=tempfile.mkdtemp(prefix='q05-test-'))
        D = F.q05_dump()
        rec, out = Q.run(env, dump=D, inputs={'doc': None, 'missing': 'docs/battle-theatre/app/data/anim3d/drill-timing.json'}, write=False)
        xs = items(out, 'Q05.1')
        self.assertTrue(xs and all(i['result'] == 'BLOCKED-INPUT' and i['reason'].startswith('input missing:') for i in xs))
        self.assertEqual(out['verdict'], 'INCOMPLETE')


# ------------------------------------------------------------------------------------------------------------------------------------------------------------------ the real product
class RealProduct(unittest.TestCase):
    """The real node child on the real product with one injected defect. Light: a few units, the default scenario, the coarse grid."""
    UNIT = 'us-1c-1d-meredith-19in'

    def runner(self, mutation, units=None, extra=()):
        env = Env(out=tempfile.mkdtemp(prefix='q05-e2e-'))
        from pq_common import Record
        K = Q.load_inputs(Record('Q05', env), env)
        K['cover'] = COVER
        rec, out = Q.run(env, mutate=os.path.join(MUT, mutation) if mutation else None, write=False, inputs=K, extra=['--scenarios', 'default', '--grid', 'coarse', '--units', units or self.UNIT] + list(extra))
        return out

    def get(self, out, check, uid=None):
        return [i for i in out['items'] if i['check'] == check and (uid or self.UNIT) in i['id']][0]

    def test_the_real_product_moves_this_unit_within_the_documented_speeds_and_joins_its_legs_but_turns_its_far_end_too_fast(self):
        out = self.runner(None)
        self.assertEqual(self.get(out, 'Q05.1')['result'], 'PASS', self.get(out, 'Q05.1')['reason'])
        self.assertEqual(self.get(out, 'Q05.2')['result'], 'PASS', self.get(out, 'Q05.2')['reason'])
        x = self.get(out, 'Q05.3')                               # the stage turns a block rigidly in 25 s: its far end moves at 4 to 6 m/s: a finding, not a fixture
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('far end', x['reason'])
        self.assertEqual(out['verdict'], 'FAIL')

    def test_a_leg_walked_twice_as_fast_is_caught_by_the_speed_check_and_the_displacement_check(self):
        out = self.runner('leg_fast.mjs')
        self.assertEqual(self.get(out, 'Q05.1')['result'], 'FAIL')
        self.assertIn('segment', self.get(out, 'Q05.1')['reason'])
        self.assertEqual(self.get(out, 'Q05.2')['result'], 'FAIL', self.get(out, 'Q05.2')['reason'])

    def test_a_leg_that_starts_150_m_from_where_the_last_ended_is_caught_as_a_broken_join_and_a_teleport(self):
        out = self.runner('leg_jump.mjs')
        x = self.get(out, 'Q05.3')
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('T-Q05-1', x['reason'])
        self.assertEqual(self.get(out, 'Q05.2')['result'], 'FAIL', self.get(out, 'Q05.2')['reason'])

    def test_a_leg_that_starts_before_the_one_before_has_ended_is_caught_as_two_places(self):
        out = self.runner('leg_overlap.mjs')
        x = self.get(out, 'Q05.3')
        self.assertEqual(x['result'], 'FAIL')
        self.assertIn('two places', x['reason'])

    def test_a_stage_that_puts_a_battery_400_m_away_at_every_second_sample_is_caught(self):
        out = self.runner('stage_teleport.mjs', units='us-1c-art-1nyl')
        self.assertEqual(self.get(out, 'Q05.2', 'us-1c-art-1nyl')['result'], 'FAIL', self.get(out, 'Q05.2', 'us-1c-art-1nyl')['reason'])


if __name__ == '__main__':
    unittest.main()
