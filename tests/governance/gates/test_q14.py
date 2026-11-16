"""Tests of the Q14 runner (ordnance: ranges, elevations, rates of fire, per-battery gun counts): every check has an injected defect it must catch (GATE-SPEC U-25).

    python3 -m unittest discover -s tests/governance/gates -p 'test_q14.py' -v

The unit tests give the runner a synthetic layer dump and synthetic kit inputs (gates_fixtures.py); the end-to-end tests run the real node child on the real product and write into a scratch folder.
"""
import json
import os
import tempfile
import unittest

import gates_fixtures as F  # noqa: E402  (also puts tools/bt/gates and its lib on sys.path)
from pq_common import Env  # noqa: E402
import q14_ordnance as Q  # noqa: E402


def run(D=None, K=None, ocr='default', vb=None, root=None, gap_entries=None, mutate_k=None):
    env = Env(root=root, out=tempfile.mkdtemp(prefix='q14-test-'))
    D = D if D is not None else F.q14_dump()
    K = K if K is not None else F.q14_inputs()
    if vb is not None:
        K['vb'] = vb
    if mutate_k:
        mutate_k(K)
    ocr = F.FakeOcr() if ocr == 'default' else ocr
    rec, out = Q.run(env, dump=D, inputs=K, ocr=ocr, write=False, gap_entries=gap_entries)
    return out


def items(out, check=None, sub=None):
    return [i for i in out['items'] if (check is None or i['check'] == check) and (sub is None or sub in i['id'])]


def one(out, check, sub):
    xs = items(out, check, sub)
    assert len(xs) == 1, (check, sub, [i['id'] for i in xs])
    return xs[0]


class CleanFixture(unittest.TestCase):
    def test_every_check_passes_except_the_owed_drill_state_machine_so_the_verdict_is_incomplete(self):
        out = run(vb=F.q14_vb())
        bad = [(i['id'], i['result'], i['reason'][:140]) for i in out['items'] if i['result'] not in ('PASS',)]
        self.assertEqual([b[0] for b in bad], ['Q14/Q14.7/drill-state-machine/default'], bad)
        self.assertEqual(out['verdict'], 'INCOMPLETE')
        for chk in ('Q14.1', 'Q14.2', 'Q14.3', 'Q14.4', 'Q14.5', 'Q14.6', 'Q14.7'):
            self.assertTrue(items(out, chk), chk)

    def test_pass_is_true_only_for_the_result_pass_and_every_item_has_a_reason(self):
        out = run(vb=F.q14_vb())
        for i in out['items']:
            self.assertEqual(i['pass'], i['result'] == 'PASS', i['id'])
            self.assertTrue(i['reason'] and 'evidence' in i)

    def test_two_runs_give_identical_items(self):
        a, b = run(vb=F.q14_vb()), run(vb=F.q14_vb())
        self.assertEqual(json.dumps(a['items'], sort_keys=True), json.dumps(b['items'], sort_keys=True))


class WeaponsTable(unittest.TestCase):                 # Q14.1
    def test_a_weapon_the_product_fires_with_no_table_row_fails(self):
        K = F.q14_inputs()
        K['fx']['weapons']['mystery_gun'] = {}
        self.assertEqual(one(run(K=K), 'Q14.1', '/mystery_gun/')['result'], 'FAIL')

    def test_a_documented_tier_that_no_manual_item_confirms_fails(self):
        K = F.q14_inputs()
        K['weapons']['weapons']['rifle_ok'].update({'tier': 'documented', 'weak_source': False, 'tier_basis': 'claim_support_verified false'})
        r = one(run(K=K), 'Q14.1', '/rifle_ok/')
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('re-match', r['reason'])

    def test_a_conflict_that_is_not_carried_as_a_range_fails(self):
        K = F.q14_inputs()
        K['weapons']['weapons']['rifle_ok']['conflicts'] = [{'id': 'C-X', 'positions': [{'value_yd': 1}]}]
        self.assertEqual(one(run(K=K), 'Q14.1', '/rifle_ok/')['result'], 'FAIL')

    def test_a_gap_row_is_not_a_table_row_for_a_weapon_the_product_fires(self):
        K = F.q14_inputs()
        K['weapons']['weapons']['rifle_ok'].update({'tier': 'gap', 'gap_ids': ['G17']})
        self.assertEqual(one(run(K=K), 'Q14.1', '/rifle_ok/')['result'], 'FAIL')


class Ranges(unittest.TestCase):                       # Q14.2
    def test_a_printed_range_that_no_cited_manual_item_prints_fails(self):
        D = F.q14_dump()
        D['ballistics']['rows'][2]['range_yd'] = 1900
        r = one(run(D=D), 'Q14.2', '@5')
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('no cited manual item', r['reason'])

    def test_a_figure_that_is_not_in_the_ocr_text_of_the_manual_fails(self):
        r = one(run(ocr=F.FakeOcr(window='not_found')), 'Q14.2', '@5')
        self.assertEqual(r['result'], 'FAIL')

    def test_a_manual_text_that_is_not_on_the_machine_is_not_run_and_never_a_pass(self):
        r = one(run(ocr=F.FakeOcr(phrase='no_text')), 'Q14.2', '@5')
        self.assertEqual(r['result'], 'NOT-RUN')
        self.assertFalse(r['pass'])

    def test_an_extract_of_fifteen_words_or_more_is_not_a_documented_support(self):          # T-Q02-1, plan p. 134, E.6
        r = one(run(ocr=F.FakeOcr(phrase='long_quote')), 'Q14.2', '@5')
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('longer than', r['reason'])

    def test_the_ocr_store_refuses_a_phrase_over_the_threshold_before_looking_for_it(self):
        store = Q.OcrStore(Env(out=tempfile.mkdtemp(prefix='q14-ocr-')), {}, max_words=14)
        self.assertEqual(store.phrase('X', ' '.join(['word'] * 15)), 'long_quote')
        self.assertEqual(store.phrase('X', ' '.join(['word'] * 14)), 'no_text')                    # a short phrase goes on to the text, which is not there

    def test_an_inverse_that_does_not_return_the_documented_elevation_fails(self):
        D = F.q14_dump()
        D['ballistics']['inverse'][1]['ok'] = False
        D['ballistics']['inverse'][1]['elev_back'] = 3.4
        self.assertEqual(one(run(D=D), 'Q14.2', '@inverse')['result'], 'FAIL')

    def test_an_impact_invented_beyond_the_table_fails(self):
        D = F.q14_dump()
        D['ballistics']['beyond'][0].update({'elevation_beyond': 5.4, 'impact_beyond': 'object'})
        self.assertEqual(one(run(D=D), 'Q14.2', '@inverse')['result'], 'FAIL')

    @staticmethod
    def _rifle_row(K):
        K['weapons']['artillery']['pieces']['3inch_ordnance_rifle'] = {'id': '3inch_ordnance_rifle', 'tier': 'inferred', 'weak_source': True, 'table_source_keys': ['Wiki-FieldArtACW'], 'conflicts': [], 'gap_ids': []}

    def _drawn_rifle(self):
        D = F.q14_dump()
        D['batteries'][0]['guns']['types'] = [{'type_id': '3inch_ordnance_rifle', 'count': 6, 'printed_type': 'six 3-inch'}]
        return D

    def test_a_drawn_piece_without_a_documented_table_fails_when_no_register_entry_covers_it(self):
        r = one(run(D=self._drawn_rifle(), mutate_k=self._rifle_row), 'Q14.2', '/3inch_ordnance_rifle/gap')
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('no register entry names this gap', r['reason'])

    def test_the_same_gap_is_covered_by_an_open_complete_register_entry_with_a_search_log_and_keeps_the_verdict_incomplete(self):
        root = tempfile.mkdtemp(prefix='q14-reg-')
        gov = os.path.join(root, 'docs', 'battle-theatre', 'GOVERNANCE')
        os.makedirs(os.path.join(gov, 'register', 'search_logs'))
        entry = {k: 'x' for k in ('title', 'cat', 'desc', 'why', 'searched', 'subst', 'recon', 'tier', 'marking', 'owner_q')}
        entry.update({'id': 'EG-TEST-1', 'rids': ['R04'], 'status': 'open'})
        F.dump_json(os.path.join(gov, 'register_index.json'), [entry])
        with open(os.path.join(gov, 'register', 'EG-TEST-1.md'), 'w') as f:
            f.write('x')
        F.dump_json(os.path.join(gov, 'register', 'search_logs', 'EG-TEST-1.json'), [{'source_id': 'FIELDART-1863', 'locator': 'p. 43', 'date_searched': '2026-11-15', 'result': 'negative', 'note': 'no table for rifles'}])
        out = run(D=self._drawn_rifle(), root=root, gap_entries={'per-elevation': ['EG-TEST-1'], 'rate': ['EG-TEST-1']}, mutate_k=self._rifle_row)
        r = one(out, 'Q14.2', '/3inch_ordnance_rifle/gap')
        self.assertEqual(r['result'], 'COVERED')
        self.assertFalse(r['pass'])
        self.assertIn(out['verdict'], ('INCOMPLETE',))            # K3: COVERED does not count toward a Q14 verdict
        self.assertFalse(r['evidence']['product_marking_checked'])

    def test_an_entry_without_a_search_log_does_not_cover_the_gap(self):
        root = tempfile.mkdtemp(prefix='q14-reg-')
        gov = os.path.join(root, 'docs', 'battle-theatre', 'GOVERNANCE')
        os.makedirs(os.path.join(gov, 'register'))
        entry = {k: 'x' for k in ('title', 'cat', 'desc', 'why', 'searched', 'subst', 'recon', 'tier', 'marking', 'owner_q')}
        entry.update({'id': 'EG-TEST-2', 'rids': ['R04'], 'status': 'open'})
        F.dump_json(os.path.join(gov, 'register_index.json'), [entry])
        r = one(run(D=self._drawn_rifle(), root=root, gap_entries={'per-elevation': ['EG-TEST-2'], 'rate': []}, mutate_k=self._rifle_row), 'Q14.2', '/3inch_ordnance_rifle/gap')
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('search log', r['reason'])

    def test_a_projectile_event_beyond_the_documented_range_fails_and_one_inside_passes(self):
        D = F.q14_dump()
        D['events'] = [{'scenario': 'default', 'unit': 'us-b1', 'piece': 'napoleon_12pdr_m1857', 'round': 'shot', 'range_m': 1800.0, 'range_yd': 1968.5, 'elevation_deg': None, 'in_table': False, 'flight_s': None}]
        self.assertEqual(one(run(D=D), 'Q14.2', '/event/')['result'], 'FAIL')
        D['events'][0].update({'range_m': 900.0, 'range_yd': 984.3, 'elevation_deg': 2.4, 'in_table': True})
        self.assertEqual(one(run(D=D), 'Q14.2', '/event/')['result'], 'PASS')

    def test_with_no_projectile_event_the_domain_is_empty_and_the_item_is_blocked(self):
        D = F.q14_dump()
        D['events'] = []
        r = one(run(D=D), 'Q14.2', 'projectile-events')
        self.assertEqual(r['result'], 'BLOCKED-INPUT')
        self.assertTrue(r['reason'].startswith('input missing:'))


class Bands(unittest.TestCase):                        # Q14.3
    def test_a_round_that_contradicts_the_band_fails(self):
        D = F.q14_dump()
        D['events'] = [{'scenario': 'default', 'unit': 'us-b1', 'piece': 'napoleon_12pdr_m1857', 'round': 'canister', 'range_m': 900.0, 'range_yd': 984.3, 'elevation_deg': 2.4, 'in_table': True, 'flight_s': 2.0}]
        self.assertEqual(one(run(D=D), 'Q14.3', '/event/')['result'], 'FAIL')
        D['events'][0]['round'] = 'shot'
        self.assertEqual(one(run(D=D), 'Q14.3', '/event/')['result'], 'PASS')

    def test_a_double_canister_band_that_is_neither_in_the_manual_nor_carried_as_a_conflict_fails(self):
        K = F.q14_inputs()
        K['weapons']['artillery']['ammunition_choice']['range_bands_yd']['double_canister_inside'] = 100
        K['weapons']['artillery']['conflicts'] = []
        r = one(run(K=K), 'Q14.3', 'band-rule')
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('double-canister', r['reason'])

    def test_a_canister_band_that_starts_elsewhere_than_the_manual_says_fails(self):
        K = F.q14_inputs()
        K['weapons']['artillery']['ammunition_choice']['range_bands_yd']['canister_inside'] = [500, 600]
        self.assertEqual(one(run(K=K), 'Q14.3', 'band-rule')['result'], 'FAIL')


class Rates(unittest.TestCase):                        # Q14.4
    def test_a_gun_that_fires_more_often_than_the_documented_maximum_fails(self):
        D = F.q14_dump()
        D['plans']['default'][0]['max_in_60s']['count'] = 4
        r = one(run(D=D), 'Q14.4', 'serve_guns')
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('documented maximum', r['reason'])

    def test_a_gun_within_the_maximum_passes_only_when_the_manual_phrases_are_found_again(self):
        self.assertEqual(one(run(), 'Q14.4', 'serve_guns')['result'], 'PASS')
        self.assertEqual(one(run(ocr=F.FakeOcr(phrase='no_text')), 'Q14.4', 'serve_guns')['result'], 'NOT-RUN')

    def _musket(self, count):
        D = F.q14_dump()
        p = dict(D['plans']['default'][0], animator='us-inf', unit='us-inf', crew=False, activity='fire', mode='at_will', weapon='long_arm', n=300, cycle_min=20, cycle_max=30, max_in_60s={'count': count, 'figure': 1, 't_s': 5.0})
        D['plans']['default'] = [p]
        return D

    def test_a_musket_plan_above_the_plans_typical_figure_fails(self):
        r = one(run(D=self._musket(4)), 'Q14.4', ':fire/')
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn("plan's typical figure", r['reason'])

    def test_a_musket_plan_inside_the_typical_figure_is_not_a_pass_because_no_maximum_is_documented(self):
        r = one(run(D=self._musket(3)), 'Q14.4', ':fire/')
        self.assertFalse(r['pass'])
        self.assertIn(r['result'], ('FAIL', 'COVERED'))
        self.assertIn('no documented maximum', r['reason'])

    def test_a_scan_item_reports_a_plan_that_exceeds_in_another_scenario(self):
        D = F.q14_dump()
        D['scenarios'] = ['default', 'sample-1']
        D['plans']['sample-1'] = [dict(D['plans']['default'][0], max_in_60s={'count': 4, 'figure': 0, 't_s': 1.0})]
        r = one(run(D=D), 'Q14.4', 'plans-scan/sample-1')
        self.assertEqual(r['result'], 'FAIL')


class Counts(unittest.TestCase):                       # Q14.5
    def test_no_verified_battery_table_blocks_the_count_but_keeps_layer_only_failures(self):
        out = run()
        r = one(out, 'Q14.5', '/us-b1/')
        self.assertEqual(r['result'], 'BLOCKED-INPUT')
        self.assertTrue(r['reason'].startswith('input missing:') and 'verified_batteries.json' in r['reason'])
        self.assertEqual(r['evidence']['layer_only_result'], 'PASS')

    def test_guns_in_the_world_that_differ_from_the_layer_count_fail(self):
        D = F.q14_dump()
        D['batteries'][0]['world']['guns'] = 5
        self.assertEqual(one(run(D=D), 'Q14.5', '/us-b1/')['result'], 'FAIL')

    def test_pieces_fired_for_a_battery_whose_guns_are_not_drawn_fail(self):
        D = F.q14_dump()
        D['batteries'][0]['guns'].update({'status': 'not_drawn', 'count': None, 'types': []})
        D['batteries'][0]['world']['guns'] = 0
        D['plans']['default'][0].update({'crew': False, 'animator': 'us-b1', 'n': 33})
        r = one(run(D=D), 'Q14.5', '/us-b1/')
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('33', r['reason'])

    def test_a_count_outside_the_verified_total_fails_and_inside_passes(self):
        self.assertEqual(one(run(vb=F.q14_vb(count=6)), 'Q14.5', '/us-b1/')['result'], 'PASS')
        self.assertEqual(one(run(vb=F.q14_vb(count=4)), 'Q14.5', '/us-b1/')['result'], 'FAIL')

    def test_a_battery_that_is_not_yet_on_the_field_on_a_date_of_the_table_fails(self):
        D = F.q14_dump()
        D['batteries'][0]['enter_min'] = 99999999
        self.assertEqual(one(run(D=D, vb=F.q14_vb()), 'Q14.5', '/us-b1/')['result'], 'FAIL')

    def test_a_type_the_verified_figures_do_not_allow_fails(self):
        D = F.q14_dump()
        D['batteries'][0]['guns']['types'] = [{'type_id': '3inch_ordnance_rifle', 'count': 6, 'printed_type': 'six 3-inch'}]
        self.assertEqual(one(run(D=D, vb=F.q14_vb()), 'Q14.5', '/us-b1/')['result'], 'FAIL')

    def test_an_unverified_row_is_blocked_not_failed(self):
        vb = F.q14_vb()
        vb['batteries']['us-b1'].update({'unverified': True, 'range_by_date': {}})
        self.assertEqual(one(run(vb=vb), 'Q14.5', '/us-b1/')['result'], 'BLOCKED-INPUT')

    def test_an_army_total_outside_the_plans_printed_range_fails(self):
        D = F.q14_dump()
        D['drawn_guns'] = {'union': 124, 'confederate': 0}
        out = run(D=D)
        self.assertEqual(one(out, 'Q14.5', 'army-total/US')['result'], 'FAIL')
        self.assertEqual(one(out, 'Q14.5', 'army-total/CS')['result'], 'FAIL')
        self.assertEqual(out['verdict'], 'FAIL')

    def test_the_plans_printed_range_is_read_from_its_text_and_an_unreadable_text_blocks(self):
        K = F.q14_inputs()
        K['plan'] = 'nothing here'
        self.assertEqual(one(run(K=K), 'Q14.5', 'army-total/US')['result'], 'BLOCKED-INPUT')

    def test_an_emplacement_with_no_machine_record_is_blocked(self):
        K = F.q14_inputs()
        K['structures'] = {'structures': [{'id': 'G-03', 'description': 'Lunettes of the Cemetery Hill batteries', 'time_printed': 'Jul 1 evening', 'emplacement_class': 'prepared'}]}
        r = one(run(K=K), 'Q14.5', '/G-03/')
        self.assertEqual(r['result'], 'BLOCKED-INPUT')


class Expenditure(unittest.TestCase):                  # Q14.6
    def test_a_battery_that_fires_more_than_the_documented_allowance_fails(self):
        D = F.q14_dump()
        D['plans']['default'][0]['shots'] = 784105
        r = one(run(D=D), 'Q14.6', '/us-b1/')
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('784105', r['reason'])

    def test_a_battery_inside_the_allowance_passes(self):
        self.assertEqual(one(run(), 'Q14.6', '/us-b1/')['result'], 'PASS')

    def test_without_the_documented_stock_the_item_is_blocked(self):
        def drop(K):
            del K['items']['ORD-BATT-WAR']
        self.assertEqual(one(run(mutate_k=drop), 'Q14.6', '/us-b1/')['result'], 'BLOCKED-INPUT')


class Crew(unittest.TestCase):                         # Q14.7
    def test_a_crew_size_that_is_not_selectable_fails(self):
        D = F.q14_dump()
        D['crew']['selectable'] = False
        self.assertEqual(one(run(D=D), 'Q14.7', 'crew-size')['result'], 'FAIL')

    def test_a_crew_conflict_that_is_not_registered_fails(self):
        K = F.q14_inputs()
        K['conflicts'] = {'conflicts': []}
        self.assertEqual(one(run(K=K), 'Q14.7', 'crew-size')['result'], 'FAIL')

    def test_a_post_with_no_documented_role_fails(self):
        D = F.q14_dump()
        D['crew']['posts'] = ['gunner', 'No. 1', 'No. 8']
        r = one(run(D=D), 'Q14.7', 'crew-posts')
        self.assertEqual(r['result'], 'FAIL')
        self.assertIn('No. 8', r['reason'])

    def test_the_drill_state_machine_is_owed_and_never_a_pass(self):
        r = one(run(), 'Q14.7', 'drill-state-machine')
        self.assertEqual(r['result'], 'NOT-RUN')
        self.assertFalse(r['pass'])


class RegistryAndVersion(unittest.TestCase):          # runner version, threshold registry, diagnostic table
    def test_the_record_names_the_runner_version_and_the_threshold_it_used(self):
        out = run(vb=F.q14_vb())
        self.assertRegex(out['runner_version'], r'^[0-9a-f]{16}$')
        self.assertIn('q14_ordnance.py', out['runner_files'])
        self.assertEqual([(t['id'], t['value']) for t in out['thresholds']], [('T-Q02-1', 14)])

    def test_the_diagnostic_table_option_is_refused_for_the_stored_record(self):
        self.assertEqual(Q.main(['--table', '/nonexistent/verified_batteries.json', '--quiet']), 3)


class RealData(unittest.TestCase):
    """The real node child on the real product (the default scenario only, to keep the run short), writing into a scratch folder."""

    @classmethod
    def setUpClass(cls):
        cls.req = os.path.join(F.ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'requirements.json')
        with open(cls.req, 'rb') as f:
            cls.req_before = f.read()
        cls.out_dir = tempfile.mkdtemp(prefix='q14-real-')
        cls.code = Q.main(['--out', cls.out_dir, '--quiet', '--scenarios', 'default'])
        with open(os.path.join(cls.out_dir, 'Q14.json'), encoding='utf-8') as f:
            cls.rec = json.load(f)

    def test_the_record_has_the_fields_the_protocol_names(self):
        r = self.rec
        for k in ('schema', 'gate', 'inputs', 'input_hashes', 'runnable_here', 'items', 'counts', 'totals', 'verdict', 'owed'):
            self.assertIn(k, r)
        self.assertEqual(r['gate'], 'Q14')
        paths = {i['path']: i for i in r['inputs']}
        for need in ('docs/battle-theatre/kit/weapons.json', 'docs/battle-theatre/drill/ordnance_tables.json', 'docs/battle-theatre/app/src/anim3d/ballistics.mjs'):
            self.assertTrue(paths[need]['sha256'] and len(paths[need]['sha256']) == 64, need)
        for i in r['items']:
            self.assertTrue(set(['id', 'pass', 'reason', 'evidence']) <= set(i), i['id'])
            self.assertEqual(i['pass'], i['result'] == 'PASS')

    def test_the_real_product_is_checked_on_every_part_of_the_gate(self):
        for chk in ('Q14.1', 'Q14.2', 'Q14.3', 'Q14.4', 'Q14.5', 'Q14.6', 'Q14.7'):
            self.assertTrue([i for i in self.rec['items'] if i['check'] == chk], chk)
        self.assertEqual(len([i for i in self.rec['items'] if i['check'] == 'Q14.5' and '/US.' not in i['id'] and i['id'].count('-art') >= 0]) > 80, True)

    def test_without_the_verified_battery_table_no_gun_count_passes(self):
        if os.path.exists(os.path.join(F.ROOT, 'docs', 'battle-theatre', 'kit', 'verified_batteries.json')):
            self.skipTest('kit/verified_batteries.json exists now: this test describes the state without it')
        xs = [i for i in self.rec['items'] if i['check'] == 'Q14.5' and '/army-total/' not in i['id'] and '/G-' not in i['id']]
        self.assertTrue(xs)
        self.assertTrue(all(i['result'] in ('BLOCKED-INPUT', 'FAIL') for i in xs))
        self.assertTrue(any(i['result'] == 'BLOCKED-INPUT' and i['reason'].startswith('input missing:') for i in xs))
        self.assertNotEqual(self.rec['verdict'], 'PASS')

    def test_the_runner_writes_no_pass_flag_and_leaves_requirements_json_alone(self):
        with open(self.req, 'rb') as f:
            self.assertEqual(f.read(), self.req_before)
        self.assertEqual(sorted(os.listdir(self.out_dir)), ['Q14.json'])


class RealDataInjectedDefect(unittest.TestCase):
    """A defect injected into the REAL product's table: the printed 5-degree range of the Napoleon is raised to 1,900 yd in ballistics.mjs; the real node child reads it and the runner must fail that row."""

    def test_a_changed_range_in_the_products_own_table_is_found(self):
        d = tempfile.mkdtemp(prefix='q14-mut-')
        mut = os.path.join(d, 'mutate.mjs')
        base = F.ROOT.replace('\\', '/') + '/docs/battle-theatre/app/src/anim3d/ballistics.mjs'
        with open(mut, 'w', encoding='utf-8') as f:
            f.write("import { RANGE_TABLE_YD } from 'file://%s';\nexport function mutateLayer(layer) { RANGE_TABLE_YD.napoleon_12pdr_m1857.shot[4][1] = 1900; }\n" % base)
        out_dir = os.path.join(d, 'out')
        code = Q.main(['--out', out_dir, '--quiet', '--mutate', mut, '--scenarios', 'default'])
        with open(os.path.join(out_dir, 'Q14.json'), encoding='utf-8') as f:
            rec = json.load(f)
        bad = [i for i in rec['items'] if i['check'] == 'Q14.2' and i['result'] == 'FAIL' and 'shot@5' in i['id'] and 'napoleon' in i['id']]
        self.assertTrue(bad, 'the changed range was not found')
        self.assertIn('1900', bad[0]['reason'])
        self.assertEqual(code, 1)


if __name__ == '__main__':
    unittest.main(verbosity=2)
