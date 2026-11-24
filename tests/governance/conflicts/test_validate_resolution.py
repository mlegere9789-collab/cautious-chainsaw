"""Tests of the conflict-research kit (tools/bt/conflicts): the validator with its planted defects, the unit tests of the tools, and the completeness of the kit.

Run:  python3 -I tests/governance/conflicts/test_validate_resolution.py        (exit 1 while any check fails: that is unfinished work, not a skip)
      python3 -I -m unittest discover -s tests/governance/conflicts -v
They need the local library (tmp/library/or27 and tmp/library/ws9) for the quote checks, like the validator itself. Heavy (about a minute of waiting on the disk): run it
through tools/horde/bench.sh.

Three groups:
  * the unit tests that live with the tools (tools/bt/conflicts/tests/test_validate_resolution.py) are loaded here by path, under another module name, so nothing is
    duplicated and this file cannot shadow theirs;
  * PlantedDefects: the four defects the plan names (a fabricated quote, a dropped value, a documented tier on a lead-only source, a missing reason) are planted by this
    file in a copy of the valid fixture and handed to the real command line; each must exit 1 with the code that names it, and the untouched fixture must exit 0;
  * Kit: 47 dossiers with every section, every source they cite in the ledger SOURCES.md, the self-test result, and READY.json (when it exists) telling the truth.
"""
import contextlib
import copy
import importlib.util
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
TOOLS = os.path.join(ROOT, 'tools', 'bt', 'conflicts')
UNIT = os.path.join(TOOLS, 'tests', 'test_validate_resolution.py')
VALIDATOR = os.path.join(TOOLS, 'validate_resolution.py')
FIXTURE = os.path.join(TOOLS, 'selftest', 'c001-valid.json')
SCRATCH = os.path.join(ROOT, 'tmp', 'conflicts', 'tests')       # inside the tmp/conflicts tree: gitignored scratch
sys.path.insert(0, TOOLS)

import cfl_lib as L  # noqa: E402


def _load_unit_tests():
    spec = importlib.util.spec_from_file_location('conflict_tool_unit_tests', UNIT)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


def _export(mod):
    for name, obj in list(vars(mod).items()):
        if isinstance(obj, type) and issubclass(obj, unittest.TestCase) and obj.__module__ == mod.__name__:
            globals()[name] = obj        # unittest collects the classes of this module's namespace (a loop variable left behind would be collected twice)


_UNIT = _load_unit_tests()
_export(_UNIT)


def run_validator(path):
    """The real command line on one file: (exit status, the codes of its errors, the whole text)."""
    r = subprocess.run([sys.executable, '-I', VALIDATOR, path, '--json'], capture_output=True, text=True, cwd=ROOT)
    out = r.stdout
    i = out.find('\n{\n')
    codes, ok = set(), None
    if i >= 0:
        rep = json.loads(out[i + 1:])
        for v in rep.values():
            codes |= {e[0] for e in v.get('errors', [])}
            ok = v.get('ok')
    return r.returncode, codes, ok, out + r.stderr


class PlantedDefects(unittest.TestCase):
    """One defect at a time in a copy of the valid fixture (a complete resolution of C-001 built from the real register and two real passages of the Official Records)."""

    @classmethod
    def setUpClass(cls):
        os.makedirs(SCRATCH, exist_ok=True)
        cls.dir = tempfile.mkdtemp(prefix='planted-', dir=SCRATCH)
        with open(FIXTURE, encoding='utf-8') as f:
            cls.base = json.load(f)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.dir, ignore_errors=True)
        vd = os.path.join(L.TMP, 'validation')                    # the validator leaves one summary file per file it checked
        if os.path.isdir(vd):
            for n in os.listdir(vd):
                if n.startswith(('planted-', 'control-')):
                    os.remove(os.path.join(vd, n))

    def write(self, name, obj):
        p = os.path.join(self.dir, name + '.json')
        with open(p, 'w', encoding='utf-8', newline='\n') as f:
            json.dump(obj, f, ensure_ascii=False, indent=1)
        return p

    def pos(self, o, pid):
        return next(p for p in o['positions'] if p['id'] == pid)

    def test_control_the_untouched_fixture_passes(self):
        code, codes, ok, text = run_validator(self.write('control-valid', copy.deepcopy(self.base)))
        self.assertEqual((code, codes, ok), (0, set(), True), text[-600:])

    def test_fabricated_quote_is_caught(self):
        o = copy.deepcopy(self.base)
        self.pos(o, 'C-001-P3')['support'][0]['quote'] = 'arriving there at 4 a. m. of the 2d in a drenching rain'
        code, codes, ok, text = run_validator(self.write('planted-fabricated-quote', o))
        self.assertEqual(code, 1, text[-600:])
        self.assertIn('quote_not_found', codes)

    def test_dropped_value_is_caught(self):
        o = copy.deepcopy(self.base)
        o['positions'] = [p for p in o['positions'] if p['id'] != 'C-001-P2']       # the plan's second value, "about 04:00 (EPP)"
        code, codes, ok, text = run_validator(self.write('planted-dropped-value', o))
        self.assertEqual(code, 1, text[-600:])
        self.assertIn('pdf_value_dropped', codes)
        self.assertIn('about 04:00', text)                                           # the message names the value that was dropped

    def test_documented_tier_on_a_value_that_only_a_lead_supports_is_caught(self):
        o = copy.deepcopy(self.base)
        self.pos(o, 'C-001-P2')['tier'] = 'documented'                                # the 04:00 value rests on a web page of the PDF (a lead) and nothing else
        code, codes, ok, text = run_validator(self.write('planted-documented-no-source', o))
        self.assertEqual(code, 1, text[-600:])
        self.assertTrue(codes & {'lead_cannot_document', 'documented_needs_non_lead'}, sorted(codes))

    def test_documented_tier_on_a_citation_of_a_lead_is_caught(self):
        o = copy.deepcopy(self.base)
        quote = 'arriving there at 1 a. m. of the 2d'
        led = L.new_ctx().ledger()['LEAD-R03-1']
        with open(os.path.join(ROOT, led['text']), encoding='utf-8', newline='') as f:
            off = f.read().find(quote)
        self.assertGreaterEqual(off, 0, 'the lead file must carry the quote for this test to mean anything')
        p = self.pos(o, 'C-001-P3')
        p['support'] = [{'source': 'LEAD-R03-1', 'source_class': 'lead', 'page_basis': 'none', 'page': None, 'page_note': 'a working file with no pages', 'text_offset': off,
                         'quote': quote, 'witness': {'name': 'project working file', 'role': 'a lead', 'side': 'institution'}, 'written': {'date': '2026-11-04', 'kind': 'lead'},
                         'vantage': 'not_applicable', 'knew_by': 'not_applicable', 'clock': 'not_applicable', 'group': 'lead', 'exact': True, 'states': {'times': ['01:00']}}]
        p['flags'] = ['lead_only']
        code, codes, ok, text = run_validator(self.write('planted-documented-on-lead', o))
        self.assertEqual(code, 1, text[-600:])
        self.assertIn('lead_cannot_document', codes)

    def test_missing_reason_is_caught(self):
        o = copy.deepcopy(self.base)
        del self.pos(o, 'C-001-P4')['reason_not_chosen']
        code, codes, ok, text = run_validator(self.write('planted-missing-reason', o))
        self.assertEqual(code, 1, text[-600:])
        self.assertIn('reason_missing', codes)

    def test_the_self_test_command_catches_them_all(self):
        r = subprocess.run([sys.executable, '-I', VALIDATOR, '--self-test'], capture_output=True, text=True, cwd=ROOT)
        self.assertEqual(r.returncode, 0, r.stdout[-800:])
        self.assertIn('SELF-TEST OK', r.stdout)
        for line in ('caught: fabricated quote -> quote_not_found', 'caught: dropped value of the PDF row -> pdf_value_dropped',
                     'caught: documented tier on a lead-only source -> lead_cannot_document', 'caught: missing reason -> reason_missing'):
            self.assertIn(line, r.stdout)
        self.assertNotIn('FAIL', r.stdout)


class Kit(unittest.TestCase):
    def test_47_dossiers_exist_with_every_section(self):
        import build_dossiers as B
        missing = [c for c in L.IDS if not os.path.exists(os.path.join(L.DOSSIERS, c + '.md'))]
        self.assertEqual(missing, [], 'dossiers not built: run tools/bt/conflicts/build_dossiers.py through tools/horde/bench.sh')
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            code = B.check()
        self.assertEqual(code, 0, buf.getvalue())

    def test_the_ledger_holds_every_source_the_dossiers_cite(self):
        import check_dossier_sources as K
        res = K.check()
        self.assertEqual(res['problems'], [])
        self.assertGreater(res['distinct_ids_cited'], 100)

    def test_the_self_test_result_file_is_true(self):
        res = L.load_json(os.path.join(L.CONF, 'selftest', 'RESULT.json'))
        self.assertTrue(res['ok'])
        self.assertEqual(res['caught'], res['cases'])
        self.assertGreaterEqual(res['caught'], 40)
        self.assertEqual((res['valid_fixture_errors'], res['valid_fixture_warnings']), (0, 0))

    def test_ready_json_tells_the_truth_when_it_exists(self):
        if not os.path.exists(L.READY_JSON):
            self.skipTest('READY.json is written by tools/bt/conflicts/write_ready.py once the self-test passes and the 47 dossiers exist')
        r = L.load_json(L.READY_JSON)
        self.assertTrue(r['ready'])
        self.assertEqual(r['ids'], L.IDS)
        self.assertEqual(len(r['ids']), 47)
        self.assertIn('validate_resolution.py', r['validator'])
        self.assertTrue(os.path.isdir(os.path.join(ROOT, r['dossier_folder'])))
        self.assertTrue(os.path.isdir(os.path.join(ROOT, r['resolutions_folder'])))
        self.assertTrue(r['self_test']['ok'])
        for c in L.IDS:
            self.assertTrue(os.path.exists(os.path.join(L.DOSSIERS, c + '.md')), c)


if __name__ == '__main__':
    unittest.main(verbosity=2)
