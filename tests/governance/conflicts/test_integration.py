"""Tests of the integration of the 47 conflict resolutions (tools/bt/conflicts/integrate_resolutions.py).

    python3 -I tests/governance/conflicts/test_integration.py
Fails if a conflict loses a value, if a default has no resolution file, if the source panel text is missing, if the register is not marked resolved,
or if the shipped defaults file is not the built one. Planted defects must be caught by verify().
"""
import copy
import json
import os
import subprocess
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt', 'conflicts'))
import integrate_resolutions as I  # noqa: E402

CD = json.load(open(I.DEFS, encoding='utf-8'))
R = I.load_resolutions()


class Integration(unittest.TestCase):
    def test_valid_file_has_no_problem(self):
        self.assertEqual([], I.verify(CD, R))
        self.assertEqual(2, CD['version'])
        self.assertEqual(47, len(CD['conflicts']))

    def test_file_is_current(self):
        r = subprocess.run([sys.executable, '-I', os.path.join(ROOT, 'tools', 'bt', 'conflicts', 'integrate_resolutions.py'), '--check'], capture_output=True, text=True, cwd=ROOT)
        self.assertEqual(0, r.returncode, r.stdout + r.stderr)

    def test_register_and_structured_marked_resolved(self):
        reg = json.load(open(os.path.join(I.G, 'conflict_register.json'), encoding='utf-8'))
        st = json.load(open(os.path.join(I.G, 'conflicts_structured.json'), encoding='utf-8'))['conflicts']
        self.assertEqual(47, len(reg))
        self.assertEqual(47, len(st))
        for c in reg:
            self.assertEqual(I.STATUS, c['default_status'], c['id'])
            self.assertTrue(os.path.exists(os.path.join(ROOT, c['resolution'])), c['id'])
        for c in st:
            self.assertEqual(I.STATUS, c['status'], c['id'])
            self.assertIsNone(c['owner_decision'])

    def test_decision_log_block_and_no_decided(self):
        dl = open(os.path.join(I.G, 'decision_log.md'), encoding='utf-8').read()
        self.assertIn('## DEC-DELEG-J ', dl)
        self.assertIn('u must resolve the 47 conflicts', dl)
        self.assertEqual([], [l for l in dl.split('\n') if 'DECIDED' in l and 'DECIDED BY OWNER' not in l])
        dd = open(os.path.join(I.G, 'decisions', 'DELEGATED-DECISIONS-2026-11-11.md'), encoding='utf-8').read()
        self.assertIn('## DEC-DELEG-J ', dd)

    def test_planted_lost_value(self):
        bad = copy.deepcopy(CD)
        d = bad['conflicts']['C-004']
        d['scenarios'] = [s for s in d['scenarios'] if not s['id'].endswith('-S1')]
        self.assertTrue(any('C-004' in p and 'lost' in p for p in I.verify(bad, R)))

    def test_planted_missing_position_scenario(self):
        bad = copy.deepcopy(CD)
        cid = next(c for c, r in R.items() if any(not p.get('scenario_ids') for p in r['positions']))
        pid = next(p['id'] for p in R[cid]['positions'] if not p.get('scenario_ids'))
        bad['conflicts'][cid]['scenarios'] = [s for s in bad['conflicts'][cid]['scenarios'] if s['id'] != pid]
        self.assertTrue(any(pid in p and 'lost' in p for p in I.verify(bad, R)))

    def test_planted_no_resolution_file(self):
        bad = copy.deepcopy(CD)
        bad['conflicts']['C-010']['resolution_file'] = 'docs/battle-theatre/GOVERNANCE/conflicts/resolutions/none.json'
        self.assertTrue(any('C-010' in p and 'no resolution file' in p for p in I.verify(bad, R)))

    def test_planted_missing_panel_text(self):
        bad = copy.deepcopy(CD)
        bad['conflicts']['C-020']['source_panel_text'] = ''
        self.assertTrue(any('C-020' in p and 'panel' in p for p in I.verify(bad, R)))

    def test_planted_lost_previous_default(self):
        bad = copy.deepcopy(CD)
        del bad['conflicts']['C-030']['previous_default']
        self.assertTrue(any('C-030' in p and 'first delegated' in p for p in I.verify(bad, R)))

    def test_planted_dropped_conflict(self):
        bad = copy.deepcopy(CD)
        del bad['conflicts']['C-047']
        self.assertTrue(any('ids differ' in p for p in I.verify(bad, R)))

    def test_counts(self):
        cls = {}
        for r in R.values():
            cls[r['class']] = cls.get(r['class'], 0) + 1
        self.assertEqual(47, sum(cls.values()))


if __name__ == '__main__':
    unittest.main()
