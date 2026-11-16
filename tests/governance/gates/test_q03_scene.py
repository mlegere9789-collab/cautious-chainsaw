"""Negative controls of the node child of the Q03 runner (tools/bt/gates/q03_scene.mjs): it runs the application's OWN code (the flag patterns and the statute count, the structure state engine, the later-memorial
layer) and reports what that code does, so a defect injected into a COPY of app/src must show up in the dump (GATE-SPEC U-25). The real code is never touched: the tests copy docs/battle-theatre/app/src and
app/tools into a scratch tree, link the data and the terrain, edit the copy and run the child on it with --no-layer (the layer part is run by the runner itself on the real tree, through tools/horde/bench.sh).

    python3 tests/governance/gates/test_q03_scene.py        (needs node; each run of the child takes a few seconds of CPU)
"""
import json
import os
import shutil
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
BT = os.path.join(REPO, 'docs', 'battle-theatre')
CHILD = os.path.join(os.environ.get('GATES_DIR') or os.path.join(REPO, 'tools', 'bt', 'gates'), 'q03_scene.mjs')


class Scratch:
    def __init__(self):
        self.dir = tempfile.mkdtemp(prefix='q03scene-')
        self.bt = os.path.join(self.dir, 'docs', 'battle-theatre')
        os.makedirs(os.path.join(self.bt, 'app'))
        shutil.copytree(os.path.join(BT, 'app', 'src'), os.path.join(self.bt, 'app', 'src'))
        shutil.copytree(os.path.join(BT, 'app', 'tools'), os.path.join(self.bt, 'app', 'tools'))
        for name in os.listdir(os.path.join(BT, 'app')):                  # the rest of app/ and of docs/battle-theatre is linked (read-only use)
            if name not in ('src', 'tools'):
                os.symlink(os.path.join(BT, 'app', name), os.path.join(self.bt, 'app', name))
        for name in os.listdir(BT):
            if name != 'app':
                os.symlink(os.path.join(BT, name), os.path.join(self.bt, name))

    def edit(self, rel, old, new):
        p = os.path.join(self.bt, 'app', *rel.split('/'))
        s = open(p, encoding='utf-8').read()
        assert s.count(old) == 1, '%s: %r found %d times' % (rel, old, s.count(old))
        open(p, 'w', encoding='utf-8').write(s.replace(old, new, 1))

    def run(self):
        out = os.path.join(self.dir, 'dump.json')
        e = dict(os.environ)
        e.pop('NODE_USE_ENV_PROXY', None)
        p = subprocess.run(['node', CHILD, '--out', out, '--bt', self.bt, '--no-layer'], capture_output=True, text=True, env=e, timeout=600, cwd=REPO)
        assert p.returncode == 0, (p.stdout + p.stderr)[-1500:]
        return json.load(open(out, encoding='utf-8'))

    def close(self):
        shutil.rmtree(self.dir, ignore_errors=True)


class SceneChild(unittest.TestCase):
    def scratch(self):
        s = Scratch()
        self.addCleanup(s.close)
        return s

    def test_the_unmodified_code_gives_the_clean_dump(self):
        d = self.scratch().run()
        self.assertEqual(d['errors'], [], d['errors'])
        self.assertEqual(d['flags']['us_stars'], 34)
        self.assertEqual(d['flags']['statutory']['1863-07-03'], 34)
        self.assertEqual(d['flags']['statutory']['1863-07-04'], 35)
        self.assertEqual(d['flags']['statutory']['1863-11-19'], 35)
        self.assertTrue(d['flags']['patterns']['us_national']['ok'])
        self.assertEqual(d['flags']['anv_scenarios'], {'pdf_p70': 12, 'nps': 13})
        self.assertEqual(d['ext']['scene_objects_nonempty'], [])
        self.assertTrue(d['ext']['memorials']['ok'])
        pre = d['engine']['preexisting']
        self.assertEqual(len(pre), 14)
        for pid in pre:
            for sc, runs in d['engine']['series'][pid].items():
                self.assertTrue(runs[0]['present'], pid)
        self.assertGreater(len(d['model']['objects']), 400)
        self.assertEqual(d['grid']['minutes'], 30240)

    def test_a_changed_star_constant_shows_in_the_flags_section(self):
        s = self.scratch()
        s.edit('src/figures3d/flags.mjs', 'export const US_STARS = 34;', 'export const US_STARS = 35;')
        d = s.run()
        self.assertEqual(d['flags']['us_stars'], 35)
        self.assertFalse(d['flags']['patterns']['us_national']['ok'], 'the pattern builder counts its stars against the constant and throws')

    def test_a_memorial_layer_that_adds_a_scene_object_shows_in_the_ext_section(self):
        s = self.scratch()
        s.edit('src/ext/site-places.mjs', 'export const sceneObjectsAt = () => [];', "export const sceneObjectsAt = () => [{ id: 'monument-1' }];")
        d = s.run()
        self.assertTrue(d['ext']['scene_objects_nonempty'])
        self.assertFalse(d['ext']['memorials']['ok'])

    def test_a_pre_existing_feature_the_engine_builds_shows_in_the_series(self):
        s = self.scratch()
        s.edit('src/structures/state.mjs', "state: 'present at frame one (pre-existing; no construction)'", "state: 'stage 2: felling and gathering'")
        d = s.run()
        runs = d['engine']['series']['P-01']['default']
        self.assertIn('felling', runs[0]['state'])

    def test_an_avenue_the_engine_places_shows_in_the_series(self):
        s = self.scratch()
        s.edit('src/structures/state.mjs', "state: 'does_not_exist_in_1863', status: 'never_placed', present: false", "state: 'open', status: 'after', present: true")
        d = s.run()
        self.assertTrue(any(r['present'] is True for r in d['engine']['series']['RD-avenues']['default']))

    def test_a_missing_data_file_is_an_error_of_its_section_not_a_pass(self):
        s = self.scratch()
        os.unlink(os.path.join(s.bt, 'app', 'data'))
        os.makedirs(os.path.join(s.bt, 'app', 'data'))
        d = s.run()
        self.assertEqual(d['sections']['model'], 'error')
        self.assertIsNone(d['model'])
        self.assertTrue(d['errors'])


if __name__ == '__main__':
    unittest.main(verbosity=2, warnings='ignore')
