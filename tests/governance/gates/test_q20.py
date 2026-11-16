"""Tests of the Q20 runner (cavalry presence with manifest, horses and arms): every check has an injected defect it must catch (GATE-SPEC U-25).

    python3 -m unittest discover -s tests/governance/gates -p 'test_q20.py' -v

The unit tests give the runner a synthetic layer dump and synthetic kit inputs (gates_fixtures.py); the end-to-end tests run the real node child on the real product and write into a scratch folder.
"""
import copy
import json
import os
import tempfile
import unittest

import gates_fixtures as F  # noqa: E402  (also puts tools/bt/gates and its lib on sys.path)
from pq_common import Env  # noqa: E402
import q20_cavalry as Q  # noqa: E402

COVERED = lambda ids: (True, [], [])  # noqa: E731
UNCOVERED = lambda ids: (False, ['%s: no such register entry' % ids[0]], [])  # noqa: E731


def run(D=None, K=None, gait='ok', gap=COVERED, mutate_k=None, mutate_d=None):
    env = Env(out=tempfile.mkdtemp(prefix='q20-test-'))
    D = copy.deepcopy(D) if D is not None else F.q20_dump()
    K = copy.deepcopy(K) if K is not None else F.q20_inputs()
    if mutate_d:
        mutate_d(D)
    if mutate_k:
        mutate_k(K)
    g = dict(F.GAIT_OK) if gait == 'ok' else gait
    rec, out = Q.run(env, dump=D, inputs=K, write=False, gait=g, gap_cover=gap)
    return out


def items(out, check=None, sub=None):
    return [i for i in out['items'] if (check is None or i['check'] == check) and (sub is None or sub in i['id'])]


def one(out, check, sub):
    xs = items(out, check, sub)
    assert len(xs) == 1, (check, sub, [i['id'] for i in xs])
    return xs[0]


U1 = 'us-cav-1d-merritt-6pa'


class CleanFixture(unittest.TestCase):
    def test_everything_passes_except_the_presence_intervals_which_have_no_machine_table_so_the_verdict_is_incomplete(self):
        out = run()
        bad = [(i['id'], i['result']) for i in out['items'] if i['result'] not in ('PASS', 'N/A')]
        self.assertEqual(bad, [('Q20/Q20.2/%s/default' % U1, 'BLOCKED-INPUT')], bad)
        self.assertEqual(out['verdict'], 'INCOMPLETE')
        for chk in ('Q20.1', 'Q20.2', 'Q20.3', 'Q20.4', 'Q20.5', 'Q20.6'):
            self.assertTrue(items(out, chk), chk)

    def test_pass_is_true_only_for_the_result_pass_and_every_item_has_a_reason(self):
        for i in run()['items']:
            self.assertEqual(i['pass'], i['result'] == 'PASS', i['id'])
            self.assertTrue(i['reason'] and 'evidence' in i)

    def test_there_is_no_covered_item_in_a_gate_that_has_no_register_branch(self):
        self.assertEqual(run()['counts']['COVERED'], 0)
        self.assertEqual(run(gap=UNCOVERED)['counts']['COVERED'], 0)

    def test_two_runs_give_identical_items(self):
        self.assertEqual(json.dumps(run()['items'], sort_keys=True), json.dumps(run()['items'], sort_keys=True))


class TheSet(unittest.TestCase):                # Q20.1
    def test_a_kit_card_with_no_unit_in_the_layer_fails(self):
        def add(K):
            K['kit']['cards']['US.CAV.1MICH'] = {'id': 'US.CAV.1MICH', 'name': '1st Michigan Cavalry', 'army': 'union'}
        r = one(run(mutate_k=add), 'Q20.1', 'US.CAV.1MICH')
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('no unit in the layer', r['reason'])

    def test_a_layer_unit_the_figure_pass_dresses_from_the_army_default_fails(self):
        def drop(D):
            D['units'][0]['kit'] = {'unit': 'DEFAULT.union.cavalry', 'how': 'default', 'default': True}
        self.assertEqual(one(run(mutate_d=drop), 'Q20.1', U1)['result'], 'FAIL')

    def test_a_cavalry_unit_of_the_verified_oob_that_the_layer_lacks_fails(self):
        def add(K):
            K['table']['units']['us-cav-3d-custer-5mi'] = {'name': '5th Michigan', 'arm': 'cavalry', 'level': 'regiment', 'in_roster': False}
        r = one(run(mutate_k=add), 'Q20.1', 'us-cav-3d-custer-5mi')
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('missing from the layer', r['reason'])

    def test_a_layer_unit_that_the_table_holds_as_infantry_fails(self):
        def mod(K):
            K['table']['units'][U1]['arm'] = 'infantry'
        self.assertEqual(one(run(mutate_k=mod), 'Q20.1', U1)['result'], 'FAIL')

    def test_without_the_verified_table_the_set_is_blocked_and_never_passes(self):
        out = run(mutate_k=lambda K: K.update(table=None))
        r = one(out, 'Q20.1', U1)
        self.assertEqual(r['result'], 'BLOCKED-INPUT')
        self.assertTrue(r['reason'].startswith('input missing:'))
        self.assertEqual(r['evidence']['layer_only_result'], 'PASS')
        self.assertNotEqual(out['verdict'], 'PASS')


class Times(unittest.TestCase):                 # Q20.2
    def test_a_documented_cavalry_unit_that_is_never_drawn_fails(self):
        def undraw(D):
            D['units'][0].update({'drawn': False, 'render': 'not_drawn', 'render_reason': 'no road of approach', 'summary': None, 'figures': None, 'horse': None, 'dismount': None})
        r = one(run(mutate_d=undraw), 'Q20.2', U1)
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('never present', r['reason'])

    def test_a_unit_documented_off_the_field_that_is_drawn_fails(self):
        def draw(D):
            D['units'][1]['drawn'] = True
        self.assertEqual(one(run(mutate_d=draw), 'Q20.2', 'cs-cav-imboden')['result'], 'FAIL')

    def test_without_a_machine_action_table_a_drawn_unit_is_blocked_and_with_one_it_is_not_run_not_passed(self):
        self.assertEqual(one(run(), 'Q20.2', U1)['result'], 'BLOCKED-INPUT')
        r = one(run(mutate_k=lambda K: K.update(actions={'schema': 'x', 'units': {}})), 'Q20.2', U1)
        self.assertEqual(r['result'], 'NOT-RUN')
        self.assertFalse(r['pass'])


class Manifest(unittest.TestCase):              # Q20.3
    def test_a_unit_with_no_officer_fails(self):
        def mod(D):
            D['units'][0]['figures']['rank'] = {'private': 380}
        r = one(run(mutate_d=mod), 'Q20.3', U1)
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('officer', r['reason'])

    def test_a_unit_with_no_trumpeter_fails(self):
        def mod(D):
            D['units'][0]['figures']['instrument'] = {'flag_none': 380}
        self.assertEqual(one(run(mutate_d=mod), 'Q20.3', U1)['result'], 'FAIL')

    def test_figures_without_a_manifest_fail(self):
        def mod(D):
            D['units'][0]['figures'].update({'with_manifest': 379, 'without': 1})
        self.assertEqual(one(run(mutate_d=mod), 'Q20.3', U1)['result'], 'FAIL')

    def test_a_field_that_does_not_cover_every_figure_fails(self):
        def mod(D):
            D['units'][0]['summary']['by_field']['weapon'][0]['count'] = 300
        r = one(run(mutate_d=mod), 'Q20.3', U1)
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('weapon', r['reason'])

    def test_a_cavalry_unit_with_no_saddle_or_no_sabre_fails(self):
        def nosaddle(D):
            D['units'][0]['summary']['by_field']['accoutrements'][0]['items'] = ['m1858_sword_belt_cav', 'bridle_union_cav']
        self.assertEqual(one(run(mutate_d=nosaddle), 'Q20.3', U1)['result'], 'FAIL')

        def nosabre(D):
            D['units'][0]['figures']['sidearm_items'] = {'colt_army_1860': 380}
        self.assertEqual(one(run(mutate_d=nosabre), 'Q20.3', U1)['result'], 'FAIL')

    def test_horse_holders_that_the_roles_do_not_hold_fail(self):
        def mod(D):
            D['units'][0]['dismount']['roles']['hold'] = 10
        self.assertEqual(one(run(mutate_d=mod), 'Q20.3', U1)['result'], 'FAIL')

    def test_a_documented_unit_that_has_no_figures_fails(self):
        def undraw(D):
            D['units'][0].update({'drawn': False, 'render': 'not_drawn', 'summary': None, 'figures': None, 'horse': None, 'dismount': None})
        out = run(mutate_d=undraw)
        self.assertEqual(one(out, 'Q20.3', U1)['result'], 'FAIL')
        self.assertEqual(one(out, 'Q20.3', 'cs-cav-imboden')['result'], 'N/A')


class Horses(unittest.TestCase):                # Q20.4
    def test_fewer_mounted_in_the_world_than_riders_fails(self):
        def mod(D):
            D['units'][0]['world']['mounted'] = 379
        self.assertEqual(one(run(mutate_d=mod), 'Q20.4', U1)['result'], 'FAIL')

    def test_a_horse_range_that_does_not_end_in_one_horse_per_trooper_fails(self):
        def mod(D):
            D['units'][0]['horse']['horses']['point'] = 300
        self.assertEqual(one(run(mutate_d=mod), 'Q20.4', U1)['result'], 'FAIL')

    def test_a_flagged_value_whose_gap_is_not_a_complete_register_entry_with_a_search_log_fails(self):
        r = one(run(gap=UNCOVERED), 'Q20.4', U1)
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('register entry', r['reason'])

    def test_a_holder_ratio_that_is_not_one_in_four_fails(self):
        def mod(D):
            D['units'][0]['dismount']['counts']['holders'] = 20
        self.assertEqual(one(run(mutate_d=mod), 'Q20.4', U1)['result'], 'FAIL')

    def test_the_class_items_for_colour_type_and_casualties_fail_when_their_gaps_are_not_covered(self):
        out = run(gap=UNCOVERED)
        self.assertEqual(one(out, 'Q20.4', 'colour-type-condition')['result'], 'FAIL')
        self.assertEqual(one(out, 'Q20.4', '/casualties/')['result'], 'FAIL')
        out = run()
        self.assertEqual(one(out, 'Q20.4', 'colour-type-condition')['result'], 'PASS')


class Arms(unittest.TestCase):                  # Q20.5
    def _spencer(self, kid, valid='1863-07-03'):
        def mod(K):
            K['kit']['cards'][kid] = {'id': kid, 'name': kid}
            it = {'item': 'spencer_repeater'}
            if valid:
                it['valid_from'] = valid
            K['kit']['units'][kid] = {'fields': {'weapon': {'allowed': [it], 'tier': 'documented', 'source_keys': ['AR-Guns']}}}
        return mod

    def test_a_spencer_in_a_regiment_that_is_not_michigan_fails(self):
        r = one(run(mutate_k=self._spencer('US.CAV.8NY')), 'Q20.5', 'US.CAV.8NY')
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('Spencers only', r['reason'])

    def test_a_michigan_spencer_without_the_date_of_july_3_fails_and_with_it_the_card_passes(self):
        self.assertEqual(one(run(mutate_k=self._spencer('US.CAV.5MICH', valid=None)), 'Q20.5', 'US.CAV.5MICH')['result'], 'FAIL')
        self.assertEqual(one(run(mutate_k=self._spencer('US.CAV.5MICH')), 'Q20.5', 'US.CAV.5MICH')['result'], 'PASS')

    def test_a_henry_anywhere_fails(self):
        def mod(K):
            K['kit']['units']['US.CAV.6PA']['fields']['weapon']['allowed'].append({'item': 'henry_rifle'})
        self.assertEqual(one(run(mutate_k=mod), 'Q20.5', 'US.CAV.6PA')['result'], 'FAIL')

    def test_a_card_with_no_weapon_record_inherits_the_default_and_fails(self):
        def mod(K):
            K['kit']['units']['US.CAV.6PA']['fields'] = {}
        self.assertEqual(one(run(mutate_k=mod), 'Q20.5', 'US.CAV.6PA')['result'], 'FAIL')

    def test_a_spencer_in_the_manifests_of_a_drawn_unit_that_is_not_michigan_fails(self):
        def mod(D):
            D['units'][0]['figures']['weapon_items'] = {'sharps_carbine': 300, 'spencer_repeater': 80}
        self.assertEqual(one(run(mutate_d=mod), 'Q20.5', 'US.CAV.6PA')['result'], 'FAIL')

    def test_a_henry_in_the_manifests_fails(self):
        def mod(D):
            D['units'][0]['figures']['weapon_items'] = {'sharps_carbine': 300, 'henry_rifle': 80}
        self.assertEqual(one(run(mutate_d=mod), 'Q20.5', 'US.CAV.6PA')['result'], 'FAIL')


class States(unittest.TestCase):                # Q20.6
    def test_a_state_of_the_plan_that_the_kit_lacks_fails(self):
        def mod(K):
            K['kit']['behaviour_states'] = [{'state': 'march_column'}]
        r = one(run(mutate_k=mod), 'Q20.6', 'states')
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('horse_holding', r['reason'])

    def test_a_state_with_no_mapping_to_the_products_activities_fails(self):
        def mod(D):
            D['state_schedule']['mapping'] = {'march_column': ['march']}
        r = one(run(mutate_d=mod), 'Q20.6', 'states')
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('horse_holding', r['reason'])

    def test_no_per_unit_schedule_of_the_states_fails(self):
        def mod(D):
            D['state_schedule'] = {'per_unit': False, 'basis': 'no schedule'}
        self.assertEqual(one(run(mutate_d=mod), 'Q20.6', 'states')['result'], 'FAIL')

    def test_a_plan_text_without_the_state_list_blocks(self):
        self.assertEqual(one(run(mutate_k=lambda K: K.update(plan='nothing')), 'Q20.6', 'states')['result'], 'BLOCKED-INPUT')

    def test_a_failing_gait_test_fails_and_a_skipped_one_is_not_run(self):
        self.assertEqual(one(run(gait=dict(F.GAIT_OK, exit=1, fail=2, **{'pass': 12})), 'Q20.6', 'gait')['result'], 'FAIL')
        r = one(run(gait=dict(F.GAIT_OK, skipped=2)), 'Q20.6', 'gait')
        self.assertEqual(r['result'], 'NOT-RUN')
        self.assertFalse(r['pass'])
        self.assertEqual(one(run(gait=None), 'Q20.6', 'gait')['result'], 'NOT-RUN')

    def test_a_dismounted_fight_of_a_unit_that_is_not_drawn_fails(self):
        def undraw(D):
            D['units'][0].update({'drawn': False, 'render': 'not_drawn', 'summary': None, 'figures': None, 'horse': None, 'dismount': None})
        self.assertEqual(one(run(mutate_d=undraw), 'Q20.6', 'dismount-DM-T')['result'], 'FAIL')


class RegistryAndVersion(unittest.TestCase):          # runner version and diagnostic table
    def test_the_record_names_the_runner_version(self):
        out = run()
        self.assertRegex(out['runner_version'], r'^[0-9a-f]{16}$')
        self.assertIn('q20_cavalry.py', out['runner_files'])

    def test_the_diagnostic_table_option_is_refused_for_the_stored_record(self):
        self.assertEqual(Q.main(['--table', '/nonexistent/verified_oob.json', '--quiet', '--no-gait-test']), 3)


class RealData(unittest.TestCase):
    """The real node child and the real gait test on the real product, writing into a scratch folder."""

    @classmethod
    def setUpClass(cls):
        cls.req = os.path.join(F.ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'requirements.json')
        with open(cls.req, 'rb') as f:
            cls.req_before = f.read()
        cls.out_dir = tempfile.mkdtemp(prefix='q20-real-')
        cls.code = Q.main(['--out', cls.out_dir, '--quiet'])
        with open(os.path.join(cls.out_dir, 'Q20.json'), encoding='utf-8') as f:
            cls.rec = json.load(f)

    def test_the_record_has_the_fields_the_protocol_names(self):
        r = self.rec
        for k in ('schema', 'gate', 'inputs', 'input_hashes', 'runnable_here', 'items', 'counts', 'totals', 'verdict', 'owed'):
            self.assertIn(k, r)
        self.assertEqual(r['gate'], 'Q20')
        paths = {i['path']: i for i in r['inputs']}
        for need in ('docs/battle-theatre/kit/cavalry_units.json', 'docs/battle-theatre/app/data/cavalry-horses.json', 'docs/battle-theatre/app/src/history/cavalry.mjs'):
            self.assertTrue(paths[need]['sha256'] and len(paths[need]['sha256']) == 64, need)
        for i in r['items']:
            self.assertTrue(set(['id', 'pass', 'reason', 'evidence']) <= set(i), i['id'])
            self.assertEqual(i['pass'], i['result'] == 'PASS')

    def test_every_check_runs_on_the_real_cavalry_and_the_gait_test_ran(self):
        for chk in ('Q20.1', 'Q20.2', 'Q20.3', 'Q20.4', 'Q20.5', 'Q20.6'):
            self.assertTrue([i for i in self.rec['items'] if i['check'] == chk], chk)
        g = [i for i in self.rec['items'] if 'gait-foot-contact' in i['id']][0]
        self.assertIn(g['result'], ('PASS', 'FAIL', 'NOT-RUN'))
        self.assertEqual(g['evidence'].get('status'), 'ran')
        self.assertEqual(len({i['id'].split('/')[2] for i in self.rec['items'] if i['check'] == 'Q20.3'}) >= 58, True)

    def test_without_the_verified_table_nothing_of_the_set_passes_and_no_unit_time_is_compared(self):
        if os.path.exists(os.path.join(F.ROOT, 'docs', 'battle-theatre', 'kit', 'verified_oob.json')):
            self.skipTest('kit/verified_oob.json exists now: this test describes the state without it')
        xs = [i for i in self.rec['items'] if i['check'] == 'Q20.1' and i['result'] in ('PASS', 'BLOCKED-INPUT')]
        self.assertTrue(all(i['result'] == 'BLOCKED-INPUT' or 'documented off the field' in json.dumps(i['evidence']) or i['evidence'].get('status') for i in xs))
        t = [i for i in self.rec['items'] if i['check'] == 'Q20.2' and i['result'] == 'BLOCKED-INPUT']
        self.assertTrue(t and all(i['reason'].startswith('input missing:') for i in t))
        self.assertNotEqual(self.rec['verdict'], 'PASS')

    def test_the_runner_writes_no_pass_flag_and_leaves_requirements_json_alone(self):
        with open(self.req, 'rb') as f:
            self.assertEqual(f.read(), self.req_before)
        self.assertEqual(sorted(os.listdir(self.out_dir)), ['Q20.json'])


class RealDataInjectedDefect(unittest.TestCase):
    """A defect injected into the REAL world builder's output: one trooper of a drawn cavalry unit is dropped from the world; the real node child reports the mounted count and the runner must fail the horse item."""

    def test_a_dropped_trooper_in_the_world_is_found(self):
        d = tempfile.mkdtemp(prefix='q20-mut-')
        mut = os.path.join(d, 'mutate.mjs')
        with open(mut, 'w', encoding='utf-8') as f:
            f.write("export function mutateWorld(world, layer) { const i = layer.units.findIndex(u => u.drawn && u.arm === 'cavalry' && u.strength.drawn > 50); world.units[i].count -= 1; }\n")
        out_dir = os.path.join(d, 'out')
        code = Q.main(['--out', out_dir, '--quiet', '--mutate', mut, '--no-gait-test'])
        with open(os.path.join(out_dir, 'Q20.json'), encoding='utf-8') as f:
            rec = json.load(f)
        bad = [i for i in rec['items'] if i['check'] == 'Q20.4' and i['result'] == 'FAIL' and any((not c['ok']) and c['name'].startswith('one horse') for c in i['evidence'].get('conditions', []))]
        self.assertTrue(bad, 'the dropped trooper was not found')
        self.assertEqual(code, 1)


if __name__ == '__main__':
    unittest.main(verbosity=2)
