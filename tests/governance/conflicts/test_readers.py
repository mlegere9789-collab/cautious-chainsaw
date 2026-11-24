"""Red-first tests of the computed readers check (tools/bt/conflicts/readers.py and validate_resolution.py --readers).

    python3 -I tests/governance/conflicts/test_readers.py
A resolution whose readers list lacks something that names its id must fail with readers_incomplete; the computed list must pass; the output of readers.py must paste in.
"""
import copy
import json
import os
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
TOOLS = os.path.join(ROOT, 'tools', 'bt', 'conflicts')
sys.path.insert(0, TOOLS)
import cfl_lib as L  # noqa: E402
import readers as RD  # noqa: E402


def load(cid):
    return json.load(open(os.path.join(L.RESOLUTIONS, cid + '.json'), encoding='utf-8'))


def run(args):
    return subprocess.run([sys.executable, '-I'] + args, capture_output=True, text=True, cwd=ROOT)


class Readers(unittest.TestCase):
    def test_existing_resolutions_cover_computed_list(self):
        for cid in ('C-005', 'C-012', 'C-016', 'C-045'):
            self.assertEqual([], RD.missing(cid, load(cid)['readers']), cid)

    def test_each_removed_reader_is_missing(self):
        for cid in ('C-012', 'C-016'):
            rd = load(cid)['readers']
            for i, it in enumerate(RD.compute(cid)):
                fewer = [r for r in rd if not RD.covered(it, [r])]
                self.assertTrue(any(x['key'] == it['key'] for x in RD.missing(cid, fewer)), (cid, it['key']))

    def test_empty_readers_lists_everything(self):
        self.assertEqual(len(RD.compute('C-016')), len(RD.missing('C-016', [])))
        self.assertGreaterEqual(len(RD.compute('C-016')), 2)

    def test_pasted_output_is_complete(self):
        out = run([os.path.join(TOOLS, 'readers.py'), 'C-005'])
        self.assertEqual(0, out.returncode)
        lst = json.loads(out.stdout)
        self.assertEqual([], RD.missing('C-005', lst))
        for r in lst:
            self.assertEqual({'kind', 'ref', 'must_change', 'note'}, set(r))

    def test_keys_are_not_fooled_by_lookalikes(self):
        self.assertFalse(any('POS-A-11' in i['key'] for i in RD.compute('C-016')))
        self.assertFalse(RD.covered({'key': 'GATE-SPEC.md'}, [{'ref': 'GATE-SPEC-A.md', 'note': ''}]))

    def test_validator_fails_when_reader_removed(self):
        d = load('C-016')
        drop = [r for r in d['readers'] if 'EG-0110' in r['ref'] + r['note']]
        self.assertTrue(drop)
        d['readers'] = [r for r in d['readers'] if r not in drop]
        with tempfile.TemporaryDirectory() as t:
            p = os.path.join(t, 'C-016.json')
            json.dump(d, open(p, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
            bad = run([os.path.join(TOOLS, 'validate_resolution.py'), '--readers', p])
            self.assertEqual(1, bad.returncode, bad.stdout)
            self.assertIn('readers_incomplete', bad.stdout)
            self.assertIn('EG-0110', bad.stdout)
            off = run([os.path.join(TOOLS, 'validate_resolution.py'), '--no-readers', p])
            self.assertNotIn('readers_incomplete', off.stdout)

    def test_validator_passes_untouched(self):
        ok = run([os.path.join(TOOLS, 'validate_resolution.py'), '--readers', 'C-016'])
        self.assertEqual(0, ok.returncode, ok.stdout)


if __name__ == '__main__':
    unittest.main()
