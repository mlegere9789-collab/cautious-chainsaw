"""Negative controls of the node child of the Q23 runner (tools/bt/gates/q23_app.mjs): it runs the app's own marking code, and each defect injected into a COPY of app/src must show up in
what it reports (GATE-SPEC U-25). The real code is never touched: the tests copy docs/battle-theatre/app/src into a scratch folder and edit the copy.

    python3 tests/governance/gates/test_q23_app.py        (needs node; runs the child with --no-layer and small stand-in lists of units and works, a few seconds)
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
GATES = os.environ.get('GATES_DIR') or os.path.join(REPO, 'tools', 'bt', 'gates')
APP_SRC = os.path.join(REPO, 'docs', 'battle-theatre', 'app', 'src')

UNITS = [{'id': 'u-doc', 'short': 'D', 'tier': 'documented'}, {'id': 'u-inf', 'short': 'I', 'tier': 'inferred'}, {'id': 'u-pp', 'short': 'P', 'tier': 'plausible-procedural'}, {'id': 'u-gap', 'short': 'G', 'tier': 'open gap'}]
OBJECTS = [{'id': 'O-1', 'tier': 'documented', 'pre_existing': True, 'line': None, 'at': {'lng': -77.25, 'lat': 39.8, 'sigma_m': 40, 'place': 'x'}, 'name': 'wall'},
           {'id': 'O-2', 'tier': 'inferred', 'pre_existing': False, 'line': None, 'at': {'lng': -77.26, 'lat': 39.81, 'sigma_m': 40, 'place': 'y'}, 'name': 'work'}]


class Q23App(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp(prefix='q23app-')
        cls.app = os.path.join(cls.tmp, 'app')
        shutil.copytree(APP_SRC, os.path.join(cls.app, 'src'))          # only the code; the child run here needs no data
        cls.units = os.path.join(cls.tmp, 'units.json')
        cls.objects = os.path.join(cls.tmp, 'objects.json')
        with open(cls.units, 'w') as f:
            json.dump(UNITS, f)
        with open(cls.objects, 'w') as f:
            json.dump(OBJECTS, f)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def reset(self):
        shutil.rmtree(os.path.join(self.app, 'src'))
        shutil.copytree(APP_SRC, os.path.join(self.app, 'src'))

    def edit(self, rel, old, new, every=False):
        p = os.path.join(self.app, 'src', rel)
        with open(p, encoding='utf-8') as f:
            t = f.read()
        self.assertIn(old, t, 'the code to mutate is not where the test expects it: %s in %s' % (old, rel))
        with open(p, 'w', encoding='utf-8') as f:
            f.write(t.replace(old, new) if every else t.replace(old, new, 1))

    def run_child(self, tiers=None):
        out = os.path.join(self.tmp, 'out.json')
        if os.path.exists(out):
            os.unlink(out)
        args = ['node', os.path.join(GATES, 'q23_app.mjs'), '--out', out, '--app', self.app, '--no-layer', '--units', self.units, '--objects', self.objects]
        if tiers is not None:
            tin = os.path.join(self.tmp, 'tiers.json')
            with open(tin, 'w') as f:
                json.dump(tiers, f)
            args += ['--tiers', tin]
        p = subprocess.run(args, capture_output=True, text=True, timeout=300)
        self.assertEqual(p.returncode, 0, p.stderr[-600:])
        with open(out) as f:
            return json.load(f)

    def setUp(self):
        self.reset()

    # ------------------------------------------------------------------------------------------ the real code
    def test_real_code_has_distinct_styles_and_draws_every_unit_in_its_tier(self):
        r = self.run_child(['documented', 'documented (secondary)', 'not documented', 'computed (not measured)'])
        self.assertEqual(r['errors'], [], r['errors'])
        self.assertEqual(r['style']['problems'], [])
        self.assertEqual(r['hooks']['problems'], [])
        for mode in ('glyph', 'footprint'):
            m = r['overlay_units']['modes'][mode]
            self.assertEqual(m['drawn'], 4)
            self.assertEqual(m['problems'], [], m['problems'])
        self.assertEqual(r['tier_names']['documented (secondary)'], 'documented')
        self.assertIsNone(r['tier_names']['not documented'])
        self.assertIsNone(r['tier_names']['computed (not measured)'])

    def test_real_works_overlay_marks_tier_by_colour_alone(self):
        # a finding about the real code, pinned so that it cannot turn into a pass without a change of the overlay: two works of different tiers differ only in the colour of the outline
        objs = [dict(OBJECTS[0], id='A', tier='documented', pre_existing=False), dict(OBJECTS[1], id='B', tier='inferred', pre_existing=False)]
        with open(self.objects, 'w') as f:
            json.dump(objs, f)
        try:
            r = self.run_child()
        finally:
            with open(self.objects, 'w') as f:
                json.dump(OBJECTS, f)
        self.assertGreaterEqual(r['overlay_objects']['colour_only_count'], 1, r['overlay_objects'])

    # ------------------------------------------------------------------------------------------ injected defects
    def test_two_tiers_that_differ_by_colour_alone_are_reported(self):
        self.edit('config.mjs', "'inferred':             { color: '#e0b250', dash: [7, 4],  glyph: 'diamond',  label: 'Inferred' }", "'inferred':             { color: '#e0b250', dash: [2, 4],  glyph: 'triangle',  label: 'Inferred' }")
        r = self.run_child()
        self.assertTrue(any('colour alone' in p for p in r['style']['problems']), r['style']['problems'])

    def test_documented_tier_with_a_broken_outline_is_reported(self):
        self.edit('config.mjs', "'documented':           { color: '#6fcf97', dash: [],      glyph: 'circle',", "'documented':           { color: '#6fcf97', dash: [5, 5],  glyph: 'circle',")
        r = self.run_child()
        self.assertTrue(any('documented tier has a broken outline' in p for p in r['style']['problems']), r['style']['problems'])

    def test_missing_style_for_a_tier_is_reported(self):
        self.edit('config.mjs', "  'open gap':             { color: '#ef7d6b', dash: [10, 3, 2, 3], glyph: 'square', label: 'Open gap' },\n", '')
        r = self.run_child()
        self.assertTrue(any('no entry for the tier open gap' in p for p in r['style']['problems']), r['style']['problems'])

    def test_overlay_that_draws_every_unit_as_a_circle_is_reported(self):
        self.edit('overlay.mjs', 'GLYPH[S.glyph](c, p[0], p[1], r);', 'GLYPH.circle(c, p[0], p[1], r);')
        r = self.run_child()
        m = r['overlay_units']['modes']['glyph']
        self.assertGreater(m['problem_count'], 0)
        self.assertTrue(any('drawn as circle' in p for p in m['problems']), m['problems'])

    def test_overlay_that_draws_every_unit_in_the_documented_colour_is_reported(self):
        self.edit('overlay.mjs', 'const tier = units[i].tier, S = TIER_STYLE[tier]', "const tier = units[i].tier, S = TIER_STYLE['documented']")
        r = self.run_child()
        self.assertGreater(r['overlay_units']['modes']['glyph']['problem_count'], 0)

    def test_overlay_that_loses_the_outline_pattern_in_footprint_mode_is_reported(self):
        self.edit('overlay.mjs', 'c.strokeStyle = S.color; c.setLineDash(S.dash); c.stroke(); c.setLineDash([]); drawn = true;', 'c.strokeStyle = S.color; c.stroke(); drawn = true;')
        r = self.run_child()
        self.assertGreater(r['overlay_units']['modes']['footprint']['problem_count'], 0)

    def test_tier_mark_hook_that_names_no_glyph_is_reported(self):
        self.edit('ui/extensions.mjs', 'const pill = `<span class="pill" data-tier="${n}">${glyphSVG(n, 12)}${esc(TIER_STYLE[n].label)}</span>`;', 'const pill = `<span class="pill" data-tier="${n}">${esc(TIER_STYLE[n].label)}</span>`;')
        r = self.run_child()
        self.assertTrue(any('draws no glyph' in p for p in r['hooks']['problems']), r['hooks']['problems'])

    def test_statement_without_a_tier_that_is_not_marked_is_reported(self):
        self.edit('ui/extensions.mjs', 'Tier not stated', 'Tier', every=True)
        r = self.run_child()
        self.assertTrue(any('Tier not stated' in p for p in r['hooks']['problems']), r['hooks']['problems'])

    def test_sound_panel_that_drops_its_disclosure_is_reported(self):
        self.edit('audio3d/provenance.mjs', 'No recording of the 1863 battle exists.', 'Sounds are listed below.')
        r = self.run_child()
        self.assertTrue(any('no recording of 1863 exists' in p for p in r['audio']['problems']), r['audio']['problems'])

    def test_sound_panel_row_without_a_kind_label_is_reported(self):
        self.edit('audio3d/provenance.mjs', "kindLabel: PROVENANCE_KINDS[f.kind]?.label || f.kind,", "kindLabel: '',")
        r = self.run_child()
        self.assertTrue(any('lacks its provenance kind label' in p for p in r['audio']['problems']), r['audio']['problems'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
