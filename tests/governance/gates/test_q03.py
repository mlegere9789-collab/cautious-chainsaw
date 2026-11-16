"""Negative controls of the Q03 runner (no anachronisms), GATE-SPEC U-25 and K11: a gate must be able to fail. Each test injects ONE defect into a scratch repository (the real kit, structure records and
schedule are copied, the drawn objects, the registry, the register and the dump of the node child are made by q03_world.py) and the runner must report it; a control with no defect must not.

    python3 tests/governance/gates/test_q03.py            (python unittest; no node, no network; each test runs the runner on a scratch tree restricted to one or two kit units, so the verdict is INCOMPLETE)
    GATES_DIR=<folder holding q03_anachronism.py without its checks>  python3 tests/governance/gates/test_q03.py     (the red run: the tests must fail against a runner that checks nothing)
"""
import json
import os
import sys
import types
import unittest
import warnings

warnings.simplefilter('ignore', ResourceWarning)        # tools/bt/check_structures.py leaves its JSON files unclosed
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import q03_world as W  # noqa: E402
import pq_common as pq  # noqa: E402

UNIT = 'US.2WI'


def load_runner():
    """The runner module of GATES_DIR (the real one, or a mutated copy), imported fresh."""
    import importlib.util
    for name in ('q03_anachronism', 'q03_structures', 'q03_runner_under_test'):
        sys.modules.pop(name, None)
    sys.path.insert(0, W.GATES_DIR)
    try:
        spec = importlib.util.spec_from_file_location('q03_runner_under_test', os.path.join(W.GATES_DIR, 'q03_anachronism.py'))
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        return m
    finally:
        sys.path.remove(W.GATES_DIR)
KEPI_UNIT, BADGE_UNIT, DISPUTED_UNIT = 'CS.CAV.10VA', 'US.119NY', 'US.140NY'


class Q03Base(unittest.TestCase):
    def world(self):
        w = W.World()
        self.addCleanup(w.close)
        return w

    def go(self, w, *args, **kw):
        code, rec, out = w.run(*args, **kw)
        self.assertIsNotNone(rec, out)
        return rec

    def get(self, rec, iid):
        d = W.by_id(rec)
        self.assertIn(iid, d, 'no item %s; items: %s' % (iid, sorted(d)[:12]))
        return d[iid]

    def fails(self, rec, iid, needle=''):
        it = self.get(rec, iid)
        self.assertEqual(it['result'], 'FAIL', '%s is %s: %s' % (iid, it['result'], it['reason'][:200]))
        self.assertFalse(it['pass'])
        if needle:
            self.assertIn(needle, it['reason'] + json.dumps(it['evidence']), 'the reason does not name %r: %s' % (needle, it['reason'][:300]))
        return it

    def passes(self, rec, iid):
        it = self.get(rec, iid)
        self.assertEqual(it['result'], 'PASS', '%s is %s: %s' % (iid, it['result'], it['reason'][:300]))
        self.assertTrue(it['pass'])
        return it

    def blocked(self, rec, iid):
        it = self.get(rec, iid)
        self.assertEqual(it['result'], 'BLOCKED-INPUT', '%s is %s: %s' % (iid, it['result'], it['reason'][:200]))
        self.assertTrue(it['reason'].startswith('input missing:'), it['reason'][:100])
        self.assertFalse(it['pass'])
        return it


def add_entry(unit, field, item, weight=6.0, **extra):
    e = {'item': item, 'weight': {'value': weight, 'kind': 'tuning_parameter', 'historical_basis': False}, 'detail': None}
    e.update(extra)
    unit['fields'].setdefault(field, {'allowed': [], 'tier': 'plausible-procedural', 'tier_declared': 'plausible-procedural', 'source_keys': [], 'weak_source': True}).setdefault('allowed', []).append(e)


# ================================================================================================ the record and the clean controls
class Record(Q03Base):
    def test_record_shape_and_clean_unit(self):
        w = self.world()
        rec = self.go(w)
        self.assertEqual(rec['gate'], 'Q03')
        self.assertEqual(rec['schema'], 'bt-gate-result/1')
        self.assertTrue(rec['runnable_here'])
        self.assertTrue(rec['input_hashes'] and all(v is None or len(v) == 64 for v in rec['input_hashes'].values()))
        for it in rec['items']:
            for k in ('id', 'pass', 'reason', 'evidence'):
                self.assertIn(k, it, it['id'])
            self.assertEqual(it['pass'], it['result'] == 'PASS', it['id'])
        self.assertEqual(rec['totals']['items'], len(rec['items']))
        self.assertEqual(rec['counts']['COVERED'], 0, 'Q03 has no COVERED branch')
        self.passes(rec, 'Q03/Q03.1/unit/%s' % UNIT)
        self.passes(rec, 'Q03/Q03.1/kit-specs')
        self.assertIn(rec['verdict'], ('FAIL', 'INCOMPLETE'), 'a run restricted to one unit is never a PASS (U-26)')
        self.assertTrue(any('restricted by --units' in r for r in rec['incomplete_reasons']))

    def test_two_runs_give_identical_items(self):
        w = self.world()
        a = self.go(w)
        b = self.go(w)
        self.assertEqual(a['items'], b['items'])
        self.assertEqual(a['counts'], b['counts'])

    def test_class7_turntable_audit_is_not_run_and_not_looked_at(self):
        rec = self.go(self.world())
        it = self.get(rec, 'Q03/Q03.1/class7-turntable-audit')
        self.assertEqual(it['result'], 'NOT-RUN')
        self.assertFalse(it['pass'])
        self.assertIs(it['evidence']['looked_at'], False)
        self.assertTrue(any('turntable' in o for o in rec['owed']))


# ================================================================================================ Q03.1 the seven classes
class KitClasses(Q03Base):
    def test_class2_henry_rifle_in_a_spec(self):
        w = self.world()
        add_entry(w.kit['kit_specs.json']['units'][UNIT], 'weapon', 'henry_rifle', weight=1.0)
        rec = self.go(w)
        self.fails(rec, 'Q03/Q03.1/kit-specs', 'UNIT_ALLOWS_BARRED_ARM')

    def test_class2_zouave_dress_on_a_unit_that_is_not_zouave(self):
        w = self.world()
        add_entry(w.kit['kit_specs.json']['units'][UNIT], 'headgear', 'fez_red_114pa', weight=50.0)
        rec = self.go(w)
        it = self.fails(rec, 'Q03/Q03.1/unit/%s' % UNIT, 'ANACH_ZOUAVE')
        self.assertIn('anachronism list', it['evidence']['fail_by_class'])
        self.fails(rec, 'Q03/Q03.1/kit-specs', 'ZOUAVE_ON_NON_ZOUAVE_UNIT')

    def test_class3_confederate_item_on_a_union_soldier(self):
        w = self.world()
        add_entry(w.kit['kit_specs.json']['units'][UNIT], 'accoutrements', 'cs_cartridge_box', weight=6.0)
        rec = self.go(w)
        it = self.fails(rec, 'Q03/Q03.1/unit/%s' % UNIT, 'WRONG_ARMY_UNION_HAS_CS_ITEM')
        self.assertIn('wrong-unit items', it['evidence']['fail_by_class'])

    def test_class4_cavalry_trim_on_infantry(self):
        w = self.world()
        add_entry(w.kit['kit_specs.json']['units'][UNIT], 'coat', 'mounted_jacket_cavalry_union', weight=50.0)
        rec = self.go(w)
        self.fails(rec, 'Q03/Q03.1/unit/%s' % UNIT, 'BRANCH_CAVALRY_TRIM')

    def test_class5_field_without_a_tier(self):
        w = self.world()
        del w.kit['kit_specs.json']['units'][UNIT]['fields']['headgear']['tier']
        rec = self.go(w, with_export=False)
        self.fails(rec, 'Q03/Q03.1/kit-specs', 'TIER_MISSING')
        self.fails(rec, 'Q03/Q03.1/unit/%s' % UNIT)

    def test_class5_documented_field_with_only_a_lead_source(self):
        w = self.world()
        f = w.kit['kit_specs.json']['units'][UNIT]['fields']['headgear']
        f['tier'] = 'documented'
        f['source_keys'] = ['Wiki-UnionUnif']
        f['weak_source'] = False
        rec = self.go(w)
        self.fails(rec, 'Q03/Q03.1/kit-specs', 'DOCUMENTED')

    def test_class6_a_manifest_that_is_not_reproducible(self):
        w = self.world()
        w.write()
        Q = load_runner()
        env = pq.Env(w.root, w.out)
        V = Q.Validators(env)
        kit = V.CK.Kit(os.path.join(w.bt, 'kit'))
        counter = iter(range(10 ** 9))
        V.GG = types.SimpleNamespace(canon=lambda m: str(next(counter)), add_defaults=V.GG.add_defaults)
        rec = pq.Record('Q03', env)
        Q.UNIT_FILTER = __import__('re').compile('^%s$' % UNIT.replace('.', r'\.'))
        fp = Q.FlagPolicy(env, rec, {'flags': {}}, "Object.entries(s.flags)")
        Q.population(V, rec, kit, Q.Rows(env), fp)
        it = [i for i in rec.items if i['id'] == 'Q03/Q03.1/unit/%s' % UNIT][0]
        self.assertEqual(it['result'], 'FAIL')
        self.assertIn('class 6', it['reason'])

    def test_an_absent_unit_the_validator_does_not_refuse_is_fail(self):
        w = self.world()
        w.write()
        Q = load_runner()
        env = pq.Env(w.root, w.out)
        V = Q.Validators(env)
        kit = V.CK.Kit(os.path.join(w.bt, 'kit'))
        V.CK = types.SimpleNamespace(manifest_for=lambda *a, **k: {'soldier_id': 'x'}, validate_manifest=lambda *a, **k: [], mk=V.CK.mk)         # a validator that lets an absent unit through
        rec = pq.Record('Q03', env)
        Q.UNIT_FILTER = __import__('re').compile(r'^US\.5NY_INF$')
        Q.absent_units(V, rec, kit, Q.Rows(env))
        it = [i for i in rec.items if i['id'] == 'Q03/Q03.1/absent/US.5NY_INF'][0]
        self.assertEqual(it['result'], 'FAIL')

    def test_class1_present_unit_that_the_kit_marks_absent_is_refused(self):
        w = self.world()
        rec = self.go(w, units='^US\\.5NY_INF$')
        a = self.passes(rec, 'Q03/Q03.1/absent/US.5NY_INF')
        self.assertTrue(a['evidence']['manifest_for_refuses'])

    def test_absent_unit_that_the_kit_lets_through_is_fail(self):
        w = self.world()
        w.kit['kit_specs.json']['units']['US.5NY_INF']['presence']['status'] = 'present_at_gettysburg'
        rec = self.go(w, units='^US\\.5NY_INF$')
        self.fails(rec, 'Q03/Q03.6/5th-ny-not-at-gettysburg')

    def test_disputed_unit_is_judged_per_variant_and_no_default_is_chosen(self):
        w = self.world()
        rec = self.go(w, units='^US\\.140NY$')
        for v in ('regulation_blue_zouave_jan_1864', 'zouave_from_1863_06_03'):
            it = self.get(rec, 'Q03/Q03.1/unit/US.140NY/%s' % v)
            self.assertIs(it['evidence']['no_default_variant_refused'], True)
            self.assertEqual(it['result'], 'PASS', it['reason'])            # the register entry EG-9001 of the scratch register is complete


# ================================================================================================ Q03.1 flags
class Flags(Q03Base):
    def test_flagged_unit_passes_when_marked_and_registered(self):
        w = self.world()
        rec = self.go(w, units='^(%s|%s|%s)$' % (KEPI_UNIT, BADGE_UNIT, DISPUTED_UNIT.replace('.', r'\.')))
        for u in (KEPI_UNIT, BADGE_UNIT):
            it = self.passes(rec, 'Q03/Q03.1/unit/%s' % u)
            self.assertTrue(it['evidence']['flag_codes'])
        self.passes(rec, 'Q03/Q03.1/flag/FLAG_KEPI_PRIVATE_PURCHASE')
        self.passes(rec, 'Q03/Q03.1/flag/FLAG_BADGE_UNRESOLVED')
        self.passes(rec, 'Q03/Q03.1/flag/DISPUTED_FLAGGED')

    def test_flag_with_no_register_entry_is_fail(self):
        w = self.world()
        w.flags_map['flags']['FLAG_KEPI_PRIVATE_PURCHASE'] = {'register_ids': []}
        rec = self.go(w, units='^%s$' % KEPI_UNIT.replace('.', r'\.'))
        self.fails(rec, 'Q03/Q03.1/unit/%s' % KEPI_UNIT, 'no register entry names this flag class')
        self.fails(rec, 'Q03/Q03.1/flag/FLAG_KEPI_PRIVATE_PURCHASE')

    def test_flag_whose_register_entry_has_no_owner_question_is_fail(self):
        w = self.world()
        for e in w.register:
            if e['id'] == 'EG-9004':
                e['owner_q'] = ''
        rec = self.go(w, units='^%s$' % KEPI_UNIT.replace('.', r'\.'))
        self.fails(rec, 'Q03/Q03.1/unit/%s' % KEPI_UNIT, 'owner_q')

    def test_flag_whose_register_entry_is_closed_is_fail(self):
        w = self.world()
        for e in w.register:
            if e['id'] == 'EG-9004':
                e['status'] = 'closed'
        rec = self.go(w, units='^%s$' % KEPI_UNIT.replace('.', r'\.'))
        self.fails(rec, 'Q03/Q03.1/unit/%s' % KEPI_UNIT, 'not open')

    def test_flag_whose_register_entry_does_not_exist_is_fail(self):
        w = self.world()
        w.register = [e for e in w.register if e['id'] != 'EG-9004']
        rec = self.go(w, units='^%s$' % KEPI_UNIT.replace('.', r'\.'))
        self.fails(rec, 'Q03/Q03.1/unit/%s' % KEPI_UNIT, 'no such register entry')

    def test_flag_the_card_does_not_show_is_fail(self):
        w = self.world()
        w.card = 'const nothing = 1;\n'
        rec = self.go(w, units='^%s$' % BADGE_UNIT)
        self.fails(rec, 'Q03/Q03.1/unit/%s' % BADGE_UNIT, 'figure card')

    def test_a_dispute_without_its_own_register_entry_is_fail_for_its_units_only(self):
        w = self.world()
        w.flags_map['flags']['DISPUTED_FLAGGED']['by_dispute']['DISP-BERDAN-GREEN-BLUE'] = []
        rec = self.go(w, units='^(US\\.140NY|US\\.1USS)$')
        self.fails(rec, 'Q03/Q03.1/unit/US.1USS', 'DISP-BERDAN-GREEN-BLUE')
        self.passes(rec, 'Q03/Q03.1/unit/US.140NY/regulation_blue_zouave_jan_1864')
        self.fails(rec, 'Q03/Q03.1/flag/DISPUTED_FLAGGED')


# ================================================================================================ Q03.1 every figure drawn
class Drawn(Q03Base):
    def test_clean_drawn_unit_passes(self):
        w = self.world()
        w.make_export()
        rec = self.go(w)
        it = self.passes(rec, 'Q03/Q03.1/drawn/us-1c-1d-meredith-2wi')
        self.assertTrue(it['evidence']['digest_equal_to_app_port'])
        self.assertTrue(it['evidence']['day_before_arrival_refused'])

    def test_the_apps_port_makes_other_manifests_is_fail(self):
        w = self.world()
        w.make_export(mutate=lambda e: e['units'][0].update(digest='0' * 24))
        rec = self.go(w)
        self.fails(rec, 'Q03/Q03.1/drawn/us-1c-1d-meredith-2wi', 'JS port')

    def test_a_figure_drawn_before_its_unit_arrives_is_fail(self):
        w = self.world()
        w.make_export(units=(('us-1c-1d-meredith-2wi', UNIT, 3, '1863-06-28'),))
        rec = self.go(w)
        self.fails(rec, 'Q03/Q03.1/drawn/us-1c-1d-meredith-2wi', 'PRESENCE_TIME')

    def test_a_shell_gate_earlier_than_the_arrival_checker_is_fail(self):
        w = self.world()
        w.make_export(mutate=lambda e: e['units'][0].update(earliest_iso='1863-06-20T08:00'))
        rec = self.go(w)
        self.fails(rec, 'Q03/Q03.1/drawn/us-1c-1d-meredith-2wi', 'SHELL_GATE_EARLIER_THAN_CHECKER')

    def test_a_drawn_unit_from_a_kit_unit_the_kit_does_not_have_is_fail(self):
        w = self.world()
        w.make_export()
        w.export['units'][0]['kit_unit'] = 'US.NOPE'
        w.write()
        rec = self.go(w, units='^US\\.NOPE$')
        self.fails(rec, 'Q03/Q03.1/drawn/us-1c-1d-meredith-2wi', 'not in the kit')

    def test_a_drawn_unit_with_an_anachronism_in_its_kit_spec_is_fail(self):
        w = self.world()
        add_entry(w.kit['kit_specs.json']['units'][UNIT], 'headgear', 'fez_red_114pa', weight=50.0)
        w.make_export()
        rec = self.go(w)
        self.fails(rec, 'Q03/Q03.1/drawn/us-1c-1d-meredith-2wi', 'ANACH_ZOUAVE')

    def test_dress_the_unit_wears_on_its_first_day_that_is_not_valid_on_a_later_day_it_is_still_drawn_is_fail(self):
        w = self.world()
        for e in w.kit['kit_specs.json']['units'][UNIT]['fields']['headgear']['allowed']:
            e['valid_to'] = '1863-07-02'
        w.make_export()
        rec = self.go(w)
        self.fails(rec, 'Q03/Q03.1/drawn/us-1c-1d-meredith-2wi', 'not valid on 1863-07-03')

    def test_without_the_export_the_drawn_part_is_blocked_not_passed(self):
        w = self.world()
        rec = self.go(w, with_export=False, units='^US\\.2WI$')
        it = self.get(rec, 'Q03/Q03.1/drawn-figures')
        self.assertEqual(it['result'], 'NOT-RUN')
        self.assertIn(rec['verdict'], ('FAIL', 'INCOMPLETE'))


# ================================================================================================ Q03.2
class Validity(Q03Base):
    def test_k9_census_fails_for_items_without_a_validity(self):
        rec = self.go(self.world())
        it = self.fails(rec, 'Q03/Q03.2/validity-census', 'K.9')
        self.assertGreater(it['evidence']['without_validity'], 100)

    def test_k9_census_passes_when_every_item_has_one(self):
        w = self.world()
        for pool in (w.kit['kit_specs.json']['items'], w.kit['weapons.json']['weapons'], w.kit['weapons.json']['artillery']['pieces']):
            for it in pool.values():
                it['valid_from'] = '1850-01-01'
                it['valid_to'] = '1865-12-31'
        rec = self.go(w)
        self.passes(rec, 'Q03/Q03.2/validity-census')

    def test_a_field_with_no_item_valid_on_a_day_is_fail(self):
        w = self.world()
        for e in w.kit['kit_specs.json']['units'][UNIT]['fields']['headgear']['allowed']:
            e['valid_from'] = '1863-07-05'
        rec = self.go(w)
        self.fails(rec, 'Q03/Q03.2/date/1863-06-26', 'no item valid')
        self.fails(rec, 'Q03/Q03.2/date/1863-07-04')
        self.passes(rec, 'Q03/Q03.2/date/1863-07-05')

    def test_a_spec_entry_that_is_hardly_ever_drawn_is_still_validated_on_every_day(self):
        w = self.world()
        add_entry(w.kit['kit_specs.json']['units'][UNIT], 'headgear', 'fez_red_114pa', weight=1e-12)     # all but never drawn: only the one-by-one scan of the spec entries sees it
        rec = self.go(w)
        it = self.fails(rec, 'Q03/Q03.2/date/1863-07-01', 'spec entries valid on the day fail the validator one by one')
        self.assertGreater(it['evidence']['entries_failing'], 0)
        self.assertEqual(it['evidence']['n_units_failing'], 0, 'the sample manifests do not see it')

    def test_a_clean_unit_passes_every_battle_day(self):
        rec = self.go(self.world())
        for d in W.SCENE_DATES[:19]:
            self.passes(rec, 'Q03/Q03.2/date/%s' % d)

    def test_epilogue_days_without_a_manifest_are_blocked(self):
        rec = self.go(self.world())
        for d in ('1863-11-18', '1863-11-19'):
            it = self.blocked(rec, 'Q03/Q03.2/date/%s' % d)
            self.assertIn('Lincoln', it['reason'])

    def test_stars_follow_the_statute_or_fail(self):
        rec = self.go(self.world())
        for d in W.SCENE_DATES:
            it = self.get(rec, 'Q03/Q03.2/stars/%s' % d)
            if d <= '1863-07-03':
                self.assertEqual(it['result'], 'PASS', d)
            else:
                self.assertEqual(it['result'], 'FAIL', d)
                self.assertIn('35', it['reason'])

    def test_a_product_whose_count_equals_the_statute_on_every_day_passes(self):
        w = self.world()
        w.make_dump(mutate=lambda d: d['flags'].update(statutory={dte: 34 for dte in W.SCENE_DATES}))
        rec = self.go(w)
        for d in W.SCENE_DATES:
            self.passes(rec, 'Q03/Q03.2/stars/%s' % d)

    def test_a_figure_code_that_follows_the_date_passes_where_it_equals_the_statute_and_fails_where_not(self):
        w = self.world()
        w.make_dump(mutate=lambda d: d['flags'].update(product_stars_by_date={dte: (34 if dte <= '1863-07-04' else 35) for dte in W.SCENE_DATES}))
        rec = self.go(w)
        self.passes(rec, 'Q03/Q03.2/stars/1863-07-03')
        self.fails(rec, 'Q03/Q03.2/stars/1863-07-04', '35')                      # the code draws 34 on the 4th, the statute gives 35 (the star is effective from 4 July)
        self.passes(rec, 'Q03/Q03.2/stars/1863-07-05')
        self.passes(rec, 'Q03/Q03.2/stars/1863-11-19')

    def test_a_national_colour_that_does_not_build_is_fail(self):
        w = self.world()
        w.make_dump(mutate=lambda d: d['flags']['patterns'].update(us_national={'ok': False, 'error': 'star count 33'}))
        rec = self.go(w)
        self.fails(rec, 'Q03/Q03.2/stars/1863-07-01', 'does not build')

    def test_anv_star_count_is_12_or_13(self):
        w = self.world()
        w.make_dump(mutate=lambda d: d['flags']['anv_scenarios'].update(pdf_p70=11))
        rec = self.go(w)
        self.fails(rec, 'Q03/Q03.2/anv-stars/pdf_p70')
        self.passes(rec, 'Q03/Q03.2/anv-stars/nps')


# ================================================================================================ Q03.3
class Structures(Q03Base):
    def test_a_clean_object_passes(self):
        rec = self.go(self.world())
        it = self.passes(rec, 'Q03/Q03.3/object/STR-TOWN-SCHMUCKER_HALL')
        self.assertTrue(it['evidence']['schedule_rows'])

    def test_building_built_after_1863_is_fail_in_q033_and_q034(self):
        w = self.world()
        w.add_building('STR-LATE', 'Later barn', rec='bld-spangler-farm', built='1935 (on foundations of the pre-war barn)', represents='later building on the 1863 site/foundation (not the 1863 structure itself)')
        rec = self.go(w)
        self.fails(rec, 'Q03/Q03.3/object/STR-LATE', 'later building')
        self.fails(rec, 'Q03/Q03.4/registry/buildings', 'STR-LATE')

    def test_building_that_represents_a_later_building_is_fail_whatever_its_date(self):
        w = self.world()
        w.add_building('STR-REP', 'Rebuilt barn', rec='bld-spangler-farm', built='1850', represents='later building on the 1863 site/foundation (not the 1863 structure itself)')
        rec = self.go(w)
        self.fails(rec, 'Q03/Q03.3/object/STR-REP', 'the drawn geometry is a later building')
        self.fails(rec, 'Q03/Q03.4/registry/buildings', 'represents a later building')

    def test_an_object_the_record_says_is_not_drawn_but_the_scene_draws_is_fail(self):
        w = self.world()
        w.add_building('STR-DUP', 'Duplicate mass', rec='bld-schmucker-hall', built='1832', status='not_drawn_duplicate_of_penn_hall')
        rec = self.go(w)
        self.fails(rec, 'Q03/Q03.3/object/STR-DUP', 'not drawn')

    def test_building_the_build_note_calls_later_is_fail(self):
        w = self.world()
        w.add_building('STR-CHURCH', 'Church', rec='bld-presbyterian-church', built='site since 1842; building rebuilt later')
        rec = self.go(w)
        self.fails(rec, 'Q03/Q03.3/object/STR-CHURCH', 'later')

    def test_mass_known_only_from_the_1868_survey_is_fail(self):
        w = self.world()
        w.add_building('STR-BORO-MASS-001', 'Borough mass', rec=None, kind='mass', subtype='borough_building_mass', note='Standing at the 1868-69 survey; most borough blocks were built up before 1863 but individual buildings are not dated.')
        rec = self.go(w)
        it = self.fails(rec, 'Q03/Q03.3/object/STR-BORO-MASS-001', 'not established')
        self.assertIn('no state schedule', it['reason'])

    def test_object_the_registry_does_not_call_present_in_1863_is_fail(self):
        w = self.world()
        w.add_building('STR-NOT', 'Not yet', rec='bld-schmucker-hall', built='1832', present=False)
        rec = self.go(w)
        self.fails(rec, 'Q03/Q03.3/object/STR-NOT', 'the registry row says present_1863')

    def test_object_with_no_state_schedule_is_fail(self):
        w = self.world()
        w.add_building('STR-NOSCHED', 'No record', rec=None, built='1850')
        rec = self.go(w)
        self.fails(rec, 'Q03/Q03.3/object/STR-NOSCHED', 'no state schedule')

    def test_building_destroyed_in_1863_with_no_row_is_fail(self):
        w = self.world()
        w.add_building('STR-BURNT', 'Burnt', rec='bld-snyder-farm', built='1862', status='destroyed_1863')
        rec = self.go(w)
        self.fails(rec, 'Q03/Q03.3/object/STR-BURNT', 'destroyed in 1863')

    def test_fence_known_only_as_a_modern_line_is_fail(self):
        w = self.world()
        w.add_fence('FN-0200', rec=None, note='Geometry is the modern OSM line; the fence type of 1863 is NOT read from the sheet.')
        rec = self.go(w)
        self.fails(rec, 'Q03/Q03.3/object/FN-0200', 'not established')

    def test_the_record_that_does_not_say_pre_existing_is_fail(self):
        w = self.world()
        for s in w.struct['structures.json']['structures']:
            if s['id'] == 'bld-codori-farm':
                s['preexisting'] = False
        rec = self.go(w)
        self.fails(rec, 'Q03/Q03.3/record/bld-codori-farm', 'existed before the battle')

    def test_the_rose_and_codori_barns_and_the_mcpherson_house_stand_throughout(self):
        rec = self.go(self.world())
        for row, oid in (('S-078', 'bld-mcpherson-farm#house'), ('S-079', 'bld-rose-farm#barn'), ('S-079', 'bld-codori-farm#barn')):
            self.passes(rec, 'Q03/Q03.3/stands-throughout/%s/%s' % (row, oid))

    def test_a_barn_that_is_gone_in_the_window_is_fail(self):
        w = self.world()
        w.make_dump(mutate=lambda d: d['engine']['series']['bld-codori-farm#barn']['default'].append({'iso': '1863-07-08T10:00', 's': 0, 'state': 'Burned 1910; torn down 1882', 'status': 'after', 'present': True, 'stage': None, 'progress': None, 'rows': []}))
        self.fails(self.go(w), 'Q03/Q03.3/stands-throughout/S-079/bld-codori-farm#barn', 'later state')

    def test_a_house_the_engine_removes_is_fail(self):
        w = self.world()
        w.make_dump(mutate=lambda d: d['engine']['series']['bld-mcpherson-farm#house']['default'].append({'iso': '1863-07-09T10:00', 's': 0, 'state': 'gone', 'status': 'after', 'present': False, 'stage': None, 'progress': None, 'rows': []}))
        self.fails(self.go(w), 'Q03/Q03.3/stands-throughout/S-078/bld-mcpherson-farm#house', 'absent')

    def test_without_an_out_of_window_row_the_negative_check_is_blocked(self):
        w = self.world()
        for r in w.struct['state_schedule.json']['rows']:
            r.pop('out_of_battle_scope', None)
        w.make_dump()
        self.blocked(self.go(w), 'Q03/Q03.3/stands-throughout')

    def test_a_hospital_with_no_closing_window_is_fail(self):
        w = self.world()
        w.struct['hospitals.json']['hospitals'][0]['closing_window'] = None
        rec = self.go(w)
        hid = w.struct['hospitals.json']['hospitals'][0]['id']
        self.fails(rec, 'Q03/Q03.3/record/%s' % hid, 'no closing window')

    def test_the_avenue_record_must_never_place(self):
        w = self.world()
        rec = self.go(w)
        self.passes(rec, 'Q03/Q03.3/record/RD-avenues')
        w2 = self.world()
        for s in w2.struct['structures.json']['structures']:
            if s['id'] == 'RD-avenues':
                s['never_place'] = False
        rec2 = self.go(w2)
        self.fails(rec2, 'Q03/Q03.3/record/RD-avenues')

    def _work_object(self, wid, pre=False):
        def mut(d):
            d['model']['objects'].append({'oid': 900, 'id': 'OBJ-%s' % wid, 'cls': 'works', 'name': wid, 'tier': 'inferred', 'state_id': wid, 'rec': wid, 'part': None, 'dropped': False, 'geometry': None, 'meta': {'pre_existing': pre}})
        return mut

    def test_a_work_with_a_documented_beginning_passes_and_one_without_is_fail(self):
        w = self.world()
        w.make_dump(mutate=self._work_object('E-01'))
        self.passes(self.go(w), 'Q03/Q03.3/work/OBJ-E-01')
        w2 = self.world()
        w2.struct['works_stages.json']['works']['E-01']['begin'] = {'gran': 'date'}
        w2.make_dump(mutate=self._work_object('E-01'))
        self.fails(self.go(w2), 'Q03/Q03.3/work/OBJ-E-01', 'no documented beginning')

    def test_a_pre_existing_work_whose_record_does_not_say_so_is_fail(self):
        w = self.world()
        for r in w.struct['structures.json']['structures']:
            if r['id'] == 'P-01':
                r['preexisting'] = False
        w.make_dump(mutate=self._work_object('P-01', pre=True))
        self.fails(self.go(w), 'Q03/Q03.3/work/OBJ-P-01', 'does not say pre-existing')

    def test_without_the_model_the_objects_are_blocked_not_passed(self):
        w = self.world()
        w.make_dump(mutate=lambda d: d.update(model=None))
        rec = self.go(w)
        self.blocked(rec, 'Q03/Q03.3/objects')
        self.blocked(rec, 'Q03/Q03.4/registry')


# ================================================================================================ Q03.4
class Modern(Q03Base):
    def test_class_absent_in_1863_is_fail(self):
        w = self.world()
        w.add_building('STR-MON', 'A thing', rec='bld-schmucker-hall', built='1832', subtype='monument')
        rec = self.go(w)
        self.fails(rec, 'Q03/Q03.4/registry/buildings', 'monument')

    def test_an_address_is_not_an_avenue(self):
        w = self.world()
        w.add_building('STR-DOBBIN', 'Dobbin House (89 Steinwehr Avenue)', rec='bld-schmucker-hall', built='1776')
        rec = self.go(w)
        self.passes(rec, 'Q03/Q03.4/registry/buildings')
        self.passes(rec, 'Q03/Q03.4/avenues')

    def test_a_drawn_road_that_is_an_avenue_is_fail(self):
        w = self.world()
        w.add_road('RD-099', 'Hancock Avenue')
        rec = self.go(w)
        self.fails(rec, 'Q03/Q03.4/avenues', 'Hancock Avenue')

    def test_the_engine_placing_an_avenue_is_fail(self):
        w = self.world()
        w.make_dump(mutate=lambda d: d['engine']['series']['RD-avenues']['default'].append({'iso': '1863-07-02T09:00', 's': 0, 'state': 'Open', 'status': 'after', 'present': True, 'stage': None, 'progress': None, 'rows': []}))
        rec = self.go(w)
        self.fails(rec, 'Q03/Q03.4/avenues', 'places an avenue')

    def test_the_memorial_layer_adding_a_scene_object_is_fail(self):
        w = self.world()
        w.make_dump(mutate=lambda d: d['ext'].update(scene_objects_nonempty=[{'iso': '1863-07-02T09:00', 'n': 1}]))
        rec = self.go(w)
        self.fails(rec, 'Q03/Q03.4/memorial-layer', 'adds scene objects')
        w2 = self.world()
        w2.make_dump(mutate=lambda d: d['ext']['layer'].update(defaultOn=True))
        self.fails(self.go(w2), 'Q03/Q03.4/memorial-layer', 'off by default')

    def test_the_memorial_layer_clean_passes(self):
        self.passes(self.go(self.world()), 'Q03/Q03.4/memorial-layer')

    def test_the_disclosure_that_the_ground_is_modern_is_not_a_pass(self):
        w = self.world()
        w.config = "export const GROUND_NOTE = 'The ground is the modern landscape (2022 aerial photograph and 3D Elevation Program terrain), not the 1863 landscape.';\n"
        rec = self.go(w)
        self.fails(rec, 'Q03/Q03.4/ground-disclosure', 'modern landscape')

    def test_no_ground_audit_is_blocked_input(self):
        w = self.world()
        rec = self.go(w)
        it = self.blocked(rec, 'Q03/Q03.4/ground-audit')
        self.assertIn('ground_audit/audit.json', it['reason'])
        self.assertTrue(any('ground audit' in o for o in rec['owed']))

    def _audit(self, w, **over):
        import hashlib
        h = lambda b: hashlib.sha256(b).hexdigest()  # noqa: E731
        a = {'schema': 'bt-ground-audit/1', 'layers': [
            {'id': 'aerial', 'role': 'aerial', 'source': {'path': 'x/aerial-2022.jpg', 'sha256': 'f' * 64}, 'corrected': {'path': 'render/prototype/data/aerial.jpg', 'sha256': h(w.ground['aerial.jpg'])}, 'classified': True,
             'classification': {'path': 'x/class.png', 'sha256': 'a' * 64}, 'modern_features': [{'id': 'F1', 'class': 'modern_road', 'action': 'painted_out', 'correction_record': 'CORR-1'}], 'unhandled_modern_features': 0},
            {'id': 'height', 'role': 'height', 'source': {'path': 'x/height-3dep.bin', 'sha256': 'e' * 64}, 'corrected': {'path': 'render/prototype/data/height.bin', 'sha256': h(w.ground['height.bin'])}, 'classified': True,
             'classification': {'path': 'x/class2.png', 'sha256': 'b' * 64}, 'modern_features': [{'id': 'F2', 'class': 'parking_lot', 'action': 'removed', 'correction_record': 'CORR-2'}], 'unhandled_modern_features': 0}]}
        a.update(over)
        w.audit = a

    def test_a_complete_ground_audit_passes(self):
        w = self.world()
        self._audit(w)
        self.passes(self.go(w), 'Q03/Q03.4/ground-audit')

    def test_the_page_loading_an_uncorrected_layer_is_fail(self):
        w = self.world()
        self._audit(w)
        w.audit['layers'][0]['corrected']['sha256'] = '0' * 64
        self.fails(self.go(w), 'Q03/Q03.4/ground-audit', 'not a corrected layer')

    def test_unhandled_modern_features_are_fail(self):
        w = self.world()
        self._audit(w)
        w.audit['layers'][1]['unhandled_modern_features'] = 3
        self.fails(self.go(w), 'Q03/Q03.4/ground-audit', 'unhandled')

    def test_a_feature_with_no_correction_record_is_fail(self):
        w = self.world()
        self._audit(w)
        w.audit['layers'][0]['modern_features'][0]['correction_record'] = ''
        self.fails(self.go(w), 'Q03/Q03.4/ground-audit', 'correction record')

    def test_an_unclassified_layer_is_fail(self):
        w = self.world()
        self._audit(w)
        w.audit['layers'][0]['classified'] = False
        self.fails(self.go(w), 'Q03/Q03.4/ground-audit', 'not classified')

    def test_an_audit_that_found_nothing_is_fail(self):
        w = self.world()
        self._audit(w)
        w.audit['layers'][0]['modern_features'] = []
        self.fails(self.go(w), 'Q03/Q03.4/ground-audit', 'lists no modern feature')

    def test_a_corrected_layer_equal_to_the_source_is_fail(self):
        w = self.world()
        self._audit(w)
        w.audit['layers'][0]['source']['sha256'] = w.audit['layers'][0]['corrected']['sha256']
        self.fails(self.go(w), 'Q03/Q03.4/ground-audit', 'nothing was removed')


# ================================================================================================ Q03.5
class PreExisting(Q03Base):
    def test_clean_pre_existing_features_pass(self):
        rec = self.go(self.world())
        for p in ('P-01', 'P-05', 'P-10', 'P-12', 'P-14'):
            self.passes(rec, 'Q03/Q03.5/%s' % p)
        self.assertEqual(len([i for i in rec['items'] if i['id'].startswith('Q03/Q03.5/P-')]), 14)

    def test_a_construction_state_is_fail(self):
        w = self.world()
        w.make_dump(mutate=lambda d: d['engine']['series']['P-01']['default'].append({'iso': '1863-07-02T09:00', 's': 0, 'state': 'stage 3: stacking', 'status': 'x', 'present': True, 'stage': 3, 'progress': 0.5, 'rows': []}))
        rec = self.go(w)
        self.fails(rec, 'Q03/Q03.5/P-01', 'construction')
        self.passes(rec, 'Q03/Q03.5/P-02')

    def test_not_present_at_the_first_minute_is_fail(self):
        w = self.world()

        def mut(d):
            d['engine']['series']['P-03']['default'][0].update(present=False, state='stage 0: bare ground')
        w.make_dump(mutate=mut)
        self.fails(self.go(w), 'Q03/Q03.5/P-03', 'not present at the first minute')

    def test_a_pre_existing_feature_in_the_list_of_works_is_fail(self):
        w = self.world()
        w.make_dump(mutate=lambda d: d['works3d'].update(works=[{'id': 'P-04', 'alias': [], 'pre_existing': True}], pre_ids_in_works=['P-04']))
        self.fails(self.go(w), 'Q03/Q03.5/P-04', 'built on screen')

    def test_a_pre_existing_feature_missing_from_the_draw_list_is_fail(self):
        w = self.world()
        w.make_dump(mutate=lambda d: d['works3d'].update(preexisting=[p for p in d['works3d']['preexisting'] if p['id'] != 'P-02']))
        self.fails(self.go(w), 'Q03/Q03.5/P-02', 'draw list')

    def test_a_draw_list_that_animates_it_is_fail(self):
        w = self.world()

        def mut(d):
            for p in d['works3d']['preexisting']:
                if p['id'] == 'P-06':
                    p.update(construction=True, progress=0.4)
        w.make_dump(mutate=mut)
        self.fails(self.go(w), 'Q03/Q03.5/P-06', 'draw list')

    def test_a_record_that_allows_construction_is_fail(self):
        w = self.world()
        for s in w.struct['structures.json']['structures']:
            if s['id'] == 'P-07':
                s['construction_animation_allowed'] = True
        w.make_dump()
        self.fails(self.go(w), 'Q03/Q03.5/P-07', 'allows a construction')

    def test_without_the_draw_lists_the_items_are_blocked_not_passed(self):
        w = self.world()
        w.make_dump(mutate=lambda d: d.update(works3d=None))
        rec = self.go(w)
        self.blocked(rec, 'Q03/Q03.5/P-01')


# ================================================================================================ Q03.7
class Vehicles(Q03Base):
    def test_vehicles_with_a_validity_and_an_army_pass(self):
        rec = self.go(self.world())
        for k in ('limber', 'caisson', 'wagon', 'forge'):
            for a in ('union', 'confederate'):
                self.passes(rec, 'Q03/Q03.7/%s/%s' % (k, a))
        self.assertEqual(self.get(rec, 'Q03/Q03.7/ambulances-and-supply-wagons')['result'], 'N/A')

    def test_a_vehicle_type_with_no_validity_is_fail(self):
        w = self.world()
        del w.artillery_train['vehicles']['limber']['valid_from']
        rec = self.go(w)
        self.fails(rec, 'Q03/Q03.7/limber/union', 'valid_from')
        self.passes(rec, 'Q03/Q03.7/caisson/union')

    def test_a_vehicle_type_valid_only_after_the_battle_is_fail(self):
        w = self.world()
        w.artillery_train['vehicles']['forge'].update(valid_from='1864-01-01')
        self.fails(self.go(w), 'Q03/Q03.7/forge/confederate', 'after the first scene day')

    def test_a_vehicle_type_of_the_other_army_is_fail(self):
        w = self.world()
        w.artillery_train['vehicles']['caisson']['army'] = 'union'
        rec = self.go(w)
        self.passes(rec, 'Q03/Q03.7/caisson/union')
        self.fails(rec, 'Q03/Q03.7/caisson/confederate', 'army')

    def test_a_type_with_no_record_at_all_is_fail(self):
        w = self.world()
        del w.artillery_train['vehicles']['battery_wagon']
        self.fails(self.go(w), 'Q03/Q03.7/wagon/union', 'no type record')

    def test_without_the_layer_the_vehicles_are_blocked(self):
        w = self.world()
        w.make_dump(mutate=lambda d: d.update(train=None))
        self.blocked(self.go(w), 'Q03/Q03.7/vehicles')


# ================================================================================================ Q03.6 the known corrections
class Regression(Q03Base):
    CASES = ['5th-ny-not-at-gettysburg', '140th-ny-regulation-blue', '146th-ny-and-114th-pa-zouave', 'mcpherson-barn-not-burned-1-july', 'bliss-burned-3-july-morning', 'angle-wall-pre-existing',
             'spencers-not-on-bufords-line', 'cope-survey-august-october-1863', 'devils-den-photograph-staged-6-july', 'louisiana-regiments-ordinary-anv-infantry']

    def run_reg(self, w, units='^(US\\.140NY|US\\.146NY|US\\.114PA|CS\\.5LA)$'):
        w.make_export(units=(('us-1c-1d-meredith-2wi', UNIT, 3, '1863-07-01'),))
        return self.go(w, units=units)

    def test_there_are_ten_items_one_per_case(self):
        w = self.world()
        w.make_export(units=(('us-1c-1d-meredith-2wi', UNIT, 3, '1863-07-01'),))
        rec = self.go(w, units='^(US\\.140NY|US\\.146NY|US\\.114PA|CS\\..*LA)$')
        got = sorted(i['id'].split('/')[2] for i in rec['items'] if i['id'].startswith('Q03/Q03.6/'))
        self.assertEqual(got, sorted(self.CASES))

    def test_140th_ny_without_its_variants_is_fail(self):
        w = self.world()
        w.kit['kit_specs.json']['units']['US.140NY'].pop('variants', None)
        rec = self.run_reg(w)
        self.fails(rec, 'Q03/Q03.6/140th-ny-regulation-blue', 'disputed')

    def test_140th_ny_zouave_item_in_the_regulation_blue_variant_is_fail(self):
        w = self.world()
        blue = w.kit['kit_specs.json']['units']['US.140NY']['variants']['regulation_blue_zouave_jan_1864']
        add_entry(blue, 'headgear', 'fez_red_114pa', weight=1e-12)          # in the spec but (all but) never drawn: only the spec scan sees it
        rec = self.run_reg(w)
        self.fails(rec, 'Q03/Q03.6/140th-ny-regulation-blue', 'fez_red_114pa')

    def test_140th_ny_both_variants_but_the_drawn_figures_carry_one_is_fail(self):
        w = self.world()
        w.make_export(units=(('us-2c-3d-xx-140ny', 'US.140NY', 2, '1863-07-02'),), mutate=lambda e: e['units'][0].update(variants=['regulation_blue_zouave_jan_1864']))
        rec = self.go(w, units='^US\\.140NY$')
        self.fails(rec, 'Q03/Q03.6/140th-ny-regulation-blue', 'does not carry both variants')

    def test_146th_zouave_dress_that_the_validator_no_longer_refuses_before_3_june_is_fail(self):
        w = self.world()
        for f in w.kit['kit_specs.json']['units']['US.146NY']['fields'].values():
            for e in f.get('allowed', []):
                e.pop('valid_from', None)
        rec = self.run_reg(w)
        self.fails(rec, 'Q03/Q03.6/146th-ny-and-114th-pa-zouave', 'before 3 June')

    def test_114th_pa_headgear_that_is_not_zouave_is_fail(self):
        w = self.world()
        add_entry(w.kit['kit_specs.json']['units']['US.114PA'], 'headgear', 'kepi_m1858', weight=1.0)
        rec = self.run_reg(w)
        self.fails(rec, 'Q03/Q03.6/146th-ny-and-114th-pa-zouave', 'US.114PA headgear')

    def test_a_spencer_on_bufords_line_is_fail(self):
        w = self.world()
        add_entry(w.kit['cavalry_units.json']['units']['US.CAV.8IL'], 'weapon', 'spencer_repeater', weight=50.0, valid_from='1863-06-30')
        rec = self.run_reg(w)
        self.fails(rec, 'Q03/Q03.6/spencers-not-on-bufords-line', 'US.CAV.8IL')

    def test_the_devils_den_record_with_another_date_is_fail(self):
        w = self.world()
        w.kit['kit_specs.json']['scene_evidence_records'][0]['values']['photo_date'] = '1863-07-05'
        self.fails(self.run_reg(w), 'Q03/Q03.6/devils-den-photograph-staged-6-july', 'photo_date')

    def test_the_devils_den_record_that_is_not_staged_is_fail(self):
        w = self.world()
        w.kit['kit_specs.json']['scene_evidence_records'][0]['values']['staged'] = False
        self.fails(self.run_reg(w), 'Q03/Q03.6/devils-den-photograph-staged-6-july')

    def test_a_louisiana_regiment_with_zouave_dress_is_fail(self):
        w = self.world()
        add_entry(w.kit['kit_specs.json']['units']['CS.5LA'], 'headgear', 'fez_red_114pa', weight=1.0)
        rec = self.run_reg(w)
        self.fails(rec, 'Q03/Q03.6/louisiana-regiments-ordinary-anv-infantry', 'CS.5LA')

    def test_a_louisiana_regiment_that_no_longer_forbids_zouave_dress_is_fail(self):
        w = self.world()
        u = w.kit['kit_specs.json']['units']['CS.5LA']
        u['zouave_policy'] = 'none'
        u['forbidden_tags'] = []
        rec = self.run_reg(w)
        self.fails(rec, 'Q03/Q03.6/louisiana-regiments-ordinary-anv-infantry', 'does not forbid')

    def test_cope_survey_dated_to_july_is_fail(self):
        w = self.world()
        for r in w.terrain_sources['rows']:
            if r.get('name', '').startswith('Cope map'):
                r['name'] = 'Cope map, NARA E 105a-1 (survey made in July 1863 by Emmor B. Cope on horseback)'
        self.fails(self.run_reg(w), 'Q03/Q03.6/cope-survey-august-october-1863')

    def test_cope_survey_row_missing_is_fail(self):
        w = self.world()
        w.terrain_sources['rows'] = [r for r in w.terrain_sources['rows'] if 'Cope' not in json.dumps(r)]
        self.fails(self.run_reg(w), 'Q03/Q03.6/cope-survey-august-october-1863')

    def test_the_5th_ny_named_in_the_roster_is_fail(self):
        w = self.world()
        units = w.history['units.json']
        units = units if isinstance(units, list) else units['units']
        units.append({'id': 'us-5c-xx-5ny', 'name': '5th New York', 'level': 'regiment', 'arm': 'infantry', 'army': 'US'})
        w.history['units.json'] = units if isinstance(w.history['units.json'], list) else {**w.history['units.json'], 'units': units}
        self.fails(self.run_reg(w), 'Q03/Q03.6/5th-ny-not-at-gettysburg', 'us-5c-xx-5ny')

    def test_the_5th_ny_drawn_is_fail(self):
        w = self.world()
        w.make_export(units=(('us-1c-1d-meredith-2wi', UNIT, 3, '1863-07-01'),))
        w.export['units'][0]['kit_unit'] = 'US.5NY_INF'
        w.write()
        self.fails(self.go(w, units='^US\\.5NY_INF$'), 'Q03/Q03.6/5th-ny-not-at-gettysburg', 'drawn')

    def test_mcpherson_barn_burning_on_1_july_is_fail(self):
        w = self.world()
        w.make_dump(mutate=lambda d: d['engine']['series']['bld-mcpherson-farm#barn']['default'].append({'iso': '1863-07-01T15:00', 's': 0, 'state': 'Burned', 'status': 'after', 'present': True, 'stage': None, 'progress': None, 'rows': []}))
        rec = self.run_reg(w)
        self.fails(rec, 'Q03/Q03.6/mcpherson-barn-not-burned-1-july', 'Burned')

    def test_mcpherson_row_no_longer_saying_the_barn_is_intact_is_fail(self):
        w = self.world()
        for r in w.struct['state_schedule.json']['rows']:
            if r['id'] == 'S-017':
                r['to_state'] = 'Aid station / hospital'
        w.make_dump()
        self.fails(self.run_reg(w), 'Q03/Q03.6/mcpherson-barn-not-burned-1-july', 'S-017')

    def test_bliss_buildings_burning_on_2_july_is_fail(self):
        w = self.world()
        w.make_dump(mutate=lambda d: d['engine']['series']['bld-bliss-farm#barn']['default'].insert(1, {'iso': '1863-07-02T10:00', 's': 0, 'state': 'Burned', 'status': 'after', 'present': True, 'stage': None, 'progress': None, 'rows': []}))
        self.fails(self.run_reg(w), 'Q03/Q03.6/bliss-burned-3-july-morning', 'before 3 July')

    def test_bliss_that_never_burns_is_fail(self):
        w = self.world()

        def mut(d):
            for sc, runs in d['engine']['series']['bld-bliss-farm#house'].items():
                del runs[1:]
        w.make_dump(mutate=mut)
        self.fails(self.run_reg(w), 'Q03/Q03.6/bliss-burned-3-july-morning', 'not burned after the window')

    def test_bliss_row_that_no_longer_names_the_14th_connecticut_is_fail(self):
        w = self.world()
        for r in w.struct['state_schedule.json']['rows']:
            if r['id'] == 'S-052':
                r['trigger'] = 'Hays order'
        w.make_dump()
        self.fails(self.run_reg(w), 'Q03/Q03.6/bliss-burned-3-july-morning', 'S-052')

    def test_the_angle_wall_under_construction_is_fail(self):
        w = self.world()
        w.make_dump(mutate=lambda d: d['engine']['series']['P-01']['default'].append({'iso': '1863-07-02T09:00', 's': 0, 'state': 'stage 2: felling and gathering', 'status': 'x', 'present': True, 'stage': 2, 'progress': None, 'rows': []}))
        self.fails(self.run_reg(w), 'Q03/Q03.6/angle-wall-pre-existing', 'construction')

    def test_clean_structure_corrections_pass(self):
        rec = self.run_reg(self.world())
        for c in ('mcpherson-barn-not-burned-1-july', 'bliss-burned-3-july-morning', 'angle-wall-pre-existing', 'spencers-not-on-bufords-line', 'cope-survey-august-october-1863', 'devils-den-photograph-staged-6-july'):
            self.passes(rec, 'Q03/Q03.6/%s' % c)


# ================================================================================================ input missing is never a pass
class InputMissing(Q03Base):
    def test_no_kit_data_is_blocked_input_and_no_unit_passes(self):
        w = self.world()
        w.kit = {}
        rec = self.go(w, with_export=False)
        self.blocked(rec, 'Q03/Q03.1/kit-specs')
        self.assertEqual([i for i in rec['items'] if i['id'].startswith('Q03/Q03.1/unit/')], [])
        self.assertEqual(rec['verdict'] in ('PASS',), False)

    def test_a_phase_that_raises_is_a_blocked_item_and_the_run_goes_on(self):
        w = self.world()
        del w.kit['kit_specs.json']['units'][UNIT]['presence']
        rec = self.go(w, with_export=False)
        errs = [i for i in rec['items'] if i['id'].startswith('Q03/phase-error/')]
        self.assertTrue(errs, 'a phase that raises must leave a trace')
        for i in errs:
            self.assertEqual(i['result'], 'BLOCKED-INPUT')
            self.assertTrue(i['reason'].startswith('input missing:'))
        self.assertTrue(any(i['id'].startswith('Q03/Q03.3/') for i in rec['items']), 'the structure phases still ran')
        self.assertNotEqual(rec['verdict'], 'PASS')

    def test_no_structure_records_is_blocked_input(self):
        w = self.world()
        w.struct = {}
        rec = self.go(w, with_dump=False)
        self.blocked(rec, 'Q03/Q03.3/records')
        self.assertTrue(all(not i['pass'] for i in rec['items'] if i['id'].startswith(('Q03/Q03.3', 'Q03/Q03.5'))))

    def test_a_node_child_that_fails_leaves_the_scene_items_blocked(self):
        w = self.world()
        rec = self.go(w, with_dump=False)         # the scratch tree has no app/src: the child fails to import it
        for iid in ('Q03/Q03.3/objects', 'Q03/Q03.4/memorial-layer', 'Q03/Q03.4/avenues', 'Q03/Q03.5/pre-existing', 'Q03/Q03.7/vehicles'):
            self.blocked(rec, iid)
        self.assertTrue(any('node child' in n or 'scene dump' in n for n in rec['notes']))

    def test_no_basemap_registry_blocks_the_objects(self):
        w = self.world()
        w.basemap = False
        rec = self.go(w)
        self.blocked(rec, 'Q03/Q03.3/objects')


if __name__ == '__main__':
    unittest.main(verbosity=2, warnings='ignore')
