"""Q20.1 mapping bug: the history unit us-cav-1d-devin-3wvaandc (3rd West Virginia Cavalry, Cos A and C, Devin) is the same unit as the
kit card US.CAV.3WV (same name, same parent us-cav-1d-devin), but the crosswalk by id suffix found no card and resolved it to the army default.
Run: python3 -m unittest discover -s tests/governance/gates -p 'test_q20_crosswalk.py' -v"""
import json
import os
import subprocess
import sys
import tempfile
import unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
CW = os.path.join(ROOT, 'docs', 'battle-theatre', 'app', 'data', 'kit-crosswalk.json')


class T(unittest.TestCase):
    def test_3wv_takes_its_kit_card(self):
        cw = json.load(open(CW, encoding='utf-8'))['units']
        self.assertEqual(cw['us-cav-1d-devin-3wvaandc']['kit'], 'US.CAV.3WV')
        self.assertEqual(cw['us-cav-1d-devin-3wvaandc']['how'], 'alias')

    def test_file_is_what_the_generator_writes(self):
        out = os.path.join(tempfile.mkdtemp(), 'cw.json')
        env = dict(os.environ, KIT_CROSSWALK_OUT=out, PYTHONIOENCODING='utf-8')
        subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'bt', 'kit_crosswalk.py')], check=True, env=env, capture_output=True)
        self.assertEqual(json.load(open(out, encoding='utf-8')), json.load(open(CW, encoding='utf-8')))


if __name__ == '__main__':
    unittest.main()
