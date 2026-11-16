"""Negative controls of the Q23 runner (marking check), GATE-SPEC U-25: the runner finds no fault in a clean world and reports each injected defect as FAIL.

The picture parts of the gate (frames at the default overlay state, legibility at night) cannot be run here, so a clean world is INCOMPLETE with no FAIL: the two NOT-RUN items are the whole
difference (U-10, U-27). The app's own code (overlay with a recording canvas, the hooks) is run by node tools/bt/gates/q23_app.mjs; its result is canned here so that the tests need no node;
tests/governance/gates/test_q23_app.mjs runs the real child against a defective copy of the app code.

    python3 tests/governance/gates/test_q23.py        (python unittest; each test runs the runner on a scratch repository, no node, no network)
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pq_fixtures as fx  # noqa: E402
import pq_world as W  # noqa: E402

BT, GOV = W.BT, W.GOV


class Q23(unittest.TestCase):
    def go(self, world, *extra, expect_exit=None):
        s = fx.Scratch(world)
        self.addCleanup(s.close)
        code, rec, out = s.run('q23_marking.py', *W.paths23(s), *extra)
        self.assertIsNotNone(rec, out)
        if expect_exit is not None:
            self.assertEqual(code, expect_exit, out)
        return rec

    def fails(self, rec, needle, prefix='Q23/'):
        hit = [i for i in rec['items'] if i['result'] == 'FAIL' and i['id'].startswith(prefix) and needle in i['reason']]
        self.assertTrue(hit, 'no FAIL item with %r under %s; FAIL items: %s' % (needle, prefix, [(i['id'], i['reason'][:110]) for i in rec['items'] if i['result'] == 'FAIL']))
        return hit[0]

    def w(self):
        return W.world23()

    # ------------------------------------------------------------------------------------------ clean world
    def test_clean_world_has_no_fail_and_only_the_picture_parts_are_not_run(self):
        rec = self.go(self.w(), expect_exit=2)
        self.assertEqual(rec['counts']['FAIL'], 0, [(i['id'], i['reason'][:100]) for i in rec['items'] if i['result'] == 'FAIL'])
        nr = sorted(i['id'] for i in rec['items'] if i['result'] == 'NOT-RUN')
        self.assertEqual(nr, ['Q23/Q23.3/frames', 'Q23/Q23.6/night'])
        self.assertEqual(rec['verdict'], 'INCOMPLETE')
        self.assertEqual(rec['gate'], 'Q23')
        self.assertTrue(all(not fx.items_by_id(rec)[i]['pass'] for i in nr))
        self.assertFalse(fx.items_by_id(rec)['Q23/Q23.3/frames']['evidence']['looked_at'])

    def test_two_runs_give_identical_items(self):
        w = self.w()
        a, b = self.go(w), self.go(w)
        self.assertEqual(a['items'], b['items'])

    # ------------------------------------------------------------------------------------------ Q23.1 census
    def test_name_of_the_plans_list_that_no_class_covers_is_fail(self):
        w = self.w()
        w['fixture/content_classes.json']['spec_list'].append('the epilogue')
        it = self.fails(self.go(w), 'name(s) of the plan', 'Q23/Q23.1/census')
        self.assertIn('the epilogue', it['evidence']['spec_names_not_covered'])

    def test_folder_of_app_src_in_no_class_is_fail(self):
        w = self.w()
        w[BT + 'app/src/newlayer/draw.mjs'] = 'export const x = 1;\n'
        it = self.fails(self.go(w), 'folder(s) or ext module(s) of app/src are in no class', 'Q23/Q23.1/census')
        self.assertIn('newlayer/', it['reason'])

    def test_ext_module_in_no_class_is_fail(self):
        w = self.w()
        w[BT + 'app/src/ext/index.mjs'] = "export default [\n  'extra.mjs',\n];\n"
        w[BT + 'app/src/ext/extra.mjs'] = 'export const x = 1;\n'
        w['fixture/content_classes.json']['classes'][1]['modules'] = ['data.mjs']
        self.fails(self.go(w), 'ext module', 'Q23/Q23.1/census')

    def test_class_that_the_product_does_not_have_is_blocked_not_skipped(self):
        w = self.w()
        w['fixture/content_classes.json']['classes'].append({'id': 'epilogue', 'label': 'epilogue', 'spec_names': [], 'modules': [], 'datum_classes': [], 'present': False, 'mark_evidence': [], 'node_checks': []})
        rec = self.go(w)
        it = fx.items_by_id(rec)['Q23/Q23.1/class-epilogue']
        self.assertEqual(it['result'], 'BLOCKED-INPUT')
        self.assertTrue(it['reason'].startswith('input missing:'))

    def test_module_named_by_a_class_that_is_not_on_disk_is_fail(self):
        w = self.w()
        w['fixture/content_classes.json']['classes'][0]['modules'] = ['overlay.mjs', 'ghost.mjs']
        self.fails(self.go(w), 'not on disk', 'Q23/Q23.1/census')

    # ------------------------------------------------------------------------------------------ Q23.2 flag in data
    def test_member_with_no_tier_the_product_reads_is_fail(self):
        w = self.w()
        del W.things(w)[0]['tier']
        self.fails(self.go(w, expect_exit=1), 'not flagged', 'Q23/Q23.2/t.things')

    def test_tier_statement_the_product_does_not_read_is_unmarked(self):
        w = self.w()
        W.things(w)[1]['tier'] = 'computed (not measured)'
        r = self.go(w)
        self.fails(r, 'not flagged', 'Q23/Q23.2/t.things')

    def test_explicit_render_flag_that_disagrees_with_the_tier_is_fail(self):
        w = self.w()
        W.things(w)[1]['render_flag'] = 2                       # an inferred datum carries flag 2
        self.fails(self.go(w), 'disagrees with the tier', 'Q23/Q23.2/t.things')

    def test_documented_datum_with_a_non_zero_flag_is_fail(self):
        w = self.w()
        W.things(w)[0]['render_flag'] = 2
        self.fails(self.go(w), 'on a documented datum', 'Q23/Q23.2/t.things')

    def test_class_with_no_member_is_fail_not_skipped(self):
        w = self.w()
        w[BT + 'app/data/things.json'] = {'things': []}
        self.fails(self.go(w), 'no record carries a tier the product could flag', 'Q23/Q23.2/t.things')

    # ------------------------------------------------------------------------------------------ Q23.3 flag in the product
    def test_style_table_that_differs_by_colour_alone_is_fail(self):
        w = self.w()
        w['fixture/app_result.json']['style']['problems'] = ['inferred and plausible-procedural differ by colour alone (same glyph and same outline pattern)']
        self.fails(self.go(w), 'differ by colour alone', 'Q23/Q23.3/style-table')

    def test_hook_that_does_not_mark_a_missing_tier_is_fail(self):
        w = self.w()
        w['fixture/app_result.json']['hooks']['problems'] = ['a statement with no tier is not marked "Tier not stated"']
        self.fails(self.go(w), 'Tier not stated', 'Q23/Q23.3/hooks')

    def test_overlay_that_draws_a_unit_in_the_wrong_style_is_fail(self):
        w = self.w()
        m = w['fixture/app_result.json']['overlay_units']['modes']['glyph']
        m['problem_count'] = 1
        m['problems'] = ['u2: tier plausible-procedural drawn as circle, not the triangle of its tier']
        self.fails(self.go(w), 'drawn as circle', 'Q23/Q23.3/class-units')

    def test_works_drawn_by_colour_alone_is_fail(self):
        w = self.w()
        w['fixture/content_classes.json']['classes'].append({'id': 'works', 'label': 'works', 'spec_names': [], 'modules': ['data.mjs'], 'datum_classes': [], 'present': True, 'node_checks': ['overlay_objects'],
                                                             'mark_evidence': [{'file': BT + 'app/src/overlay.mjs', 'patterns': ['TIER_STYLE[tier]'], 'what': 'x'}]})
        w['fixture/app_result.json']['overlay_objects'] = {'objects': 2, 'per': [], 'problems': [], 'colour_only': ['documented (A) and inferred (B) are drawn alike apart from colour'], 'colour_only_count': 1}
        self.fails(self.go(w), 'drawn alike apart from colour', 'Q23/Q23.3/class-works')

    def test_class_with_no_mark_code_is_fail(self):
        w = self.w()
        w['fixture/content_classes.json']['classes'][1]['mark_evidence'] = []
        it = self.fails(self.go(w), 'no code that draws or prints a tier mark', 'Q23/Q23.3/class-things')
        self.assertIn('searched', it['evidence'])

    def test_mark_code_that_was_removed_is_found_missing(self):
        w = self.w()
        w[BT + 'app/src/overlay.mjs'] = '// nothing here\n'
        self.fails(self.go(w), "not found", 'Q23/Q23.3/class-units')

    def test_non_documented_unit_without_a_register_link_is_fail(self):
        w = self.w()
        W.layer(w)['classes']['layer.units'][1]['register_ids'] = []
        self.fails(self.go(w), 'no usable register link', 'Q23/Q23.3/register-link-units')

    def test_unit_whose_register_entry_has_no_file_is_fail(self):
        w = self.w()
        del w[GOV + 'register/EG-0001.md']
        self.fails(self.go(w), 'no usable register link', 'Q23/Q23.3/register-link-units')

    def test_figure_choice_that_declares_no_mark_is_fail(self):
        w = self.w()
        w[BT + 'app/data/figures3d/TIERS.json']['choices'].append({'id': 'F-9', 'tier': 'plausible-procedural', 'mark': 'none'})
        it = self.fails(self.go(w), 'declare no mark', 'Q23/Q23.3/declared-marks-figures3d')
        self.assertIn('F-9', it['evidence']['unmarked'])

    def test_frames_are_never_claimed_without_a_look(self):
        rec = self.go(self.w())
        it = fx.items_by_id(rec)['Q23/Q23.3/frames']
        self.assertEqual(it['result'], 'NOT-RUN')
        self.assertEqual(it['renderer_class'], 'swgl')
        self.assertTrue(any('looked at' in o or 'ui.spec' in o for o in rec['owed']))

    # ------------------------------------------------------------------------------------------ Q23.4 substitutes
    def test_sound_panel_that_does_not_disclose_is_fail(self):
        w = self.w()
        w['fixture/app_result.json']['audio']['problems'] = ['the panel disclosure does not say modern recording, reconstruction and synthesized']
        self.fails(self.go(w), 'disclosure', 'Q23/Q23.4/audio-panel')

    def test_audio_manifest_entry_without_the_modern_mark_is_fail(self):
        w = self.w()
        w[BT + 'app/data/audio3d/sources.json']['sources'].append({'ledgerId': 'A2', 'licence': 'CC0 1.0', 'sourceUrl': 'u', 'howRecorded': 'a recording', 'caveats': ''})
        self.fails(self.go(w), 'do not carry the "modern reconstruction" or "modern recording" mark', 'Q23/Q23.4/audio-manifest')

    def test_motion_base_that_is_documented_without_a_source_is_fail(self):
        w = self.w()
        w[BT + 'app/data/anim3d/gait-sources.json']['bases']['modern_range']['tier'] = 'documented'
        self.fails(self.go(w), 'motion base', 'Q23/Q23.4/motion-bases')

    def test_motion_base_not_labelled_modern_is_fail(self):
        w = self.w()
        w[BT + 'app/data/anim3d/gait-sources.json']['bases']['modern_range']['label'] = 'ranges'
        self.fails(self.go(w), 'not labelled modern', 'Q23/Q23.4/motion-bases')

    def test_register_entry_of_a_substitute_class_without_marking_is_fail(self):
        w = self.w()
        w[GOV + 'register_index.json'][1]['marking'] = '-'
        self.fails(self.go(w), 'no marking', 'Q23/Q23.4/register-audio')

    # ------------------------------------------------------------------------------------------ Q23.5, Q23.7, Q23.8
    def test_individuals_without_a_mark_in_the_overlay_is_fail(self):
        w = self.w()
        w[BT + 'app/src/overlay.mjs'] = "// marks\nconst S = TIER_STYLE[tier]; // single source flag shown\nexport class O { draw(tMin, opts) { for (const u of []) {} } ring(c, i) {} }\n"
        self.fails(self.go(w), 'no mark is drawn for an individual soldier', 'Q23/Q23.5/individuals')

    def test_individuals_entry_that_is_not_plausible_procedural_is_fail(self):
        w = self.w()
        w[GOV + 'register/EG-0001.md'] = w[GOV + 'register/EG-0001.md'].replace('plausible-procedural', 'inferred')
        self.fails(self.go(w), 'not plausible-procedural', 'Q23/Q23.5/individuals')

    def test_missing_individuals_entry_is_blocked(self):
        w = self.w()
        del w[GOV + 'register/EG-0001.md']
        it = fx.items_by_id(self.go(w))['Q23/Q23.5/individuals']
        self.assertEqual(it['result'], 'BLOCKED-INPUT')

    def test_non_documented_register_entry_without_marking_is_fail(self):
        w = self.w()
        w[GOV + 'register_index.json'][0]['marking'] = 'not stated by the shard proposal'
        self.fails(self.go(w), 'have no marking', 'Q23/Q23.7/register')

    def test_unindexed_register_file_without_marking_is_fail(self):
        w = self.w()
        w[GOV + 'register/EG-9999.md'] = '# EG-9999\n\n| Field | Content |\n|---|---|\n| ID | EG-9999 |\n| Confidence tier | inferred |\n| Product marking | - |\n| Status | open |\n'
        it = self.fails(self.go(w), 'unindexed entry file', 'Q23/Q23.7/register')
        self.assertIn('EG-9999', it['evidence']['entry_files_not_in_index'])

    def test_open_gap_without_a_register_entry_is_fail(self):
        w = self.w()
        del W.things(w)[3]['register']
        self.fails(self.go(w), 'no usable register entry', 'Q23/Q23.8/t.things')

    def test_open_gap_units_that_are_not_drawn_have_no_map_marker(self):
        w = self.w()
        W.layer(w)['classes']['layer.units'].append(W.rec('unit:u3', 'open gap', ['SRC-A'], register_ids=['EG-0001'], extra={'drawn': False}))
        self.fails(self.go(w), 'have no map marker', 'Q23/Q23.8/units-map-marker')

    # ------------------------------------------------------------------------------------------ missing input is never a pass
    def test_missing_app_result_means_the_app_code_did_not_run_and_is_never_a_pass(self):
        w = self.w()
        s = fx.Scratch(w)
        self.addCleanup(s.close)
        code, rec, out = s.run('q23_marking.py', '--registry', os.path.join(s.root, 'fixture', 'datum_classes.json'), '--content-classes', os.path.join(s.root, 'fixture', 'content_classes.json'),
                               '--layer-dump', os.path.join(s.root, 'fixture', 'layer.json'), '--app-result', os.path.join(s.root, 'fixture', 'missing.json'))
        self.assertNotEqual(rec['verdict'], 'PASS')
        self.assertEqual(fx.items_by_id(rec)['Q23/Q23.3/style-table']['result'], 'BLOCKED-INPUT')
        self.assertEqual(fx.items_by_id(rec)['Q23/Q23.3/hooks']['result'], 'BLOCKED-INPUT')

    def test_missing_registry_is_blocked_not_a_pass(self):
        s = fx.Scratch(self.w())
        self.addCleanup(s.close)
        code, rec, out = s.run('q23_marking.py', '--registry', os.path.join(s.root, 'fixture', 'nope.json'))
        self.assertNotEqual(rec['verdict'], 'PASS')
        self.assertEqual(rec['items'][0]['result'], 'BLOCKED-INPUT')


if __name__ == '__main__':
    unittest.main(verbosity=2)
