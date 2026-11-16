"""Tests of the conflict-resolution tools (tools/bt/conflicts). Each check is its own test.

    python3 -I -m unittest discover -s tools/bt/conflicts/tests -v        (or: python3 -I tools/bt/conflicts/tests/test_validate_resolution.py)

They need the local library (tmp/library/or27 and tmp/library/ws9) for the quote checks, like the validator itself. A copy of this file is to be placed in
tests/governance/conflicts/ (request note docs/battle-theatre/GOVERNANCE/horde/requests/bt-conflicts-tests-dir.md): it locates the tools by its own path or by
the repository root, so the same file runs from either place.
"""
import copy
import json
import os
import subprocess
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
CANDIDATES = [os.path.join(HERE, '..'), os.path.join(HERE, '..', '..', '..', 'tools', 'bt', 'conflicts'), os.path.join(os.getcwd(), 'tools', 'bt', 'conflicts')]
TOOLS = next(c for c in CANDIDATES if os.path.exists(os.path.join(c, 'validate_resolution.py')))
sys.path.insert(0, TOOLS)
import cfl_lib as L
import cfl_parse as P
import cfl_cite as C
import cfl_selftest as ST
import validate_resolution as V

CTX = None


def ctx():
    global CTX
    if CTX is None:
        CTX = L.new_ctx()
    return CTX


def base():
    return copy.deepcopy(V.load_file(ST.FIX)[0])


class Parsers(unittest.TestCase):
    def test_clock_readings(self):
        self.assertEqual(P.clock_set('arriving there at 1 a. m. of the 2d'), {'01:00'})
        self.assertEqual(P.clock_set('at 4.30 a. m. these batteries opened'), {'04:30'})
        self.assertEqual(P.clock_set('at 3.45 o\'clock I ordered'), {'03:45', '15:45'})
        self.assertEqual(P.clock_set('About 2 p. m. General Sickles'), {'14:00'})
        self.assertEqual(P.clock_set('half past ten in the morning'), {'10:30'})
        self.assertIn('06:50', P.clock_set('ten minutes before seven'))
        self.assertEqual(P.clock_set('a quarter before 5 in the afternoon'), {'16:45'})
        self.assertIn('12:00', P.clock_set('at noon'))
        self.assertTrue({'07:00', '08:00'} <= P.clock_set('between 7 and 8 o\'clock'))
        self.assertTrue(P.clock_in('24:00', 'at midnight'))
        self.assertFalse(P.clock_in('07:00', 'arriving there at 1 a. m. of the 2d'))

    def test_numbers(self):
        n = P.numbers_in('Four hundred and twenty-five prisoners, 1,500 wounded, thirteen hundred men, 386 all told')
        for v in (425, 1500, 1300, 386):
            self.assertIn(v, n)
        self.assertTrue(P.number_in(400, '400 prisoners and 25 more'))
        self.assertFalse(P.number_in(401, '400 prisoners and 25 more'))

    def test_days(self):
        d, m = P.days_in('on July 3d and the 2nd of July')
        self.assertEqual(d, {2, 3})
        self.assertTrue(P.date_in('07-02', 'arriving there at 1 a. m. of the 2d'))
        self.assertFalse(P.date_in('07-04', 'arriving there at 1 a. m. of the 2d'))

    def test_banned_words(self):
        self.assertEqual(P.banned_words('Meade arrived at one in the morning.'), [])
        self.assertTrue(P.banned_words('written with an AI model'))
        self.assertTrue(P.banned_words('Claude says so'))
        self.assertTrue(P.banned_words('an automated check'))


class Registers(unittest.TestCase):
    def test_47_conflicts_everywhere(self):
        self.assertEqual(sorted(L.register()), L.IDS)
        self.assertEqual(sorted(L.structured()), L.IDS)
        self.assertEqual(sorted(L.defaults()), L.IDS)

    def test_every_pdf_row_is_found_in_the_plan_text(self):
        for cid in L.IDS:
            self.assertTrue(L.pdf_row_lines(cid), cid)

    def test_every_source_key_of_the_rows_is_in_the_glossary(self):
        import re
        g = L.pdf_glossary()
        for cid in L.IDS:
            for k in L.keys_in_text(L.register()[cid]['text']):
                self.assertIn(k, g)

    def test_schema_matches_the_code(self):
        S = json.load(open(L.SCHEMA_JSON, encoding='utf-8'))
        self.assertEqual(tuple(S['written_kinds']), C.WRITTEN_KINDS)
        self.assertEqual(tuple(S['vantages']), C.VANTAGES)
        self.assertEqual(tuple(S['knew_by']), C.KNEW_BY)
        self.assertEqual(tuple(S['clocks']), C.CLOCKS)
        self.assertEqual(tuple(S['hedges']), C.HEDGES)
        self.assertEqual(tuple(S['page_bases']), C.PAGE_BASES)
        self.assertEqual(S['tiers'], list(L.TIER_RANK))
        self.assertEqual(sorted(S['class_tiers']), sorted(S['classes']))
        for k in S['documented_kinds']:
            self.assertIn(k, S['written_kinds'])
        for code in S['error_codes']:
            self.assertRegex(code, r'^[a-z_]+$')


class Ledger(unittest.TestCase):
    def test_ledger_hashes(self):
        T = L.town()
        ok, errs, n = T.check_ledger(ctx())
        self.assertTrue(ok, errs[:5])
        self.assertGreater(n, 150)

    def test_ledger_has_the_official_records_and_the_leads(self):
        led = ctx().ledger()
        for sid in ('OR27-1', 'OR27-2', 'OR27-3', 'LONGSTREET-1896', 'NPS-HB9-1954', 'BL-3', 'LEAD-R03-1'):
            self.assertIn(sid, led)
        self.assertEqual(led['LEAD-R03-1']['class'], 'lead')
        self.assertEqual(led['OR27-1']['pages'], 'or27')


class Validator(unittest.TestCase):
    def test_valid_fixture_has_no_error(self):
        R = V.validate_obj(base(), 'fixture', ctx(), 'C-001')
        self.assertEqual(R.errors, [])

    def test_every_planted_defect_is_caught(self):
        for name, fn, expect in ST.CASES:
            with self.subTest(defect=name):
                o = base()
                if name.startswith('documented tier on a lead-only'):
                    ST._lead_documented(ctx())(o)
                else:
                    fn(o)
                codes = V.validate_obj(o, name, ctx(), 'C-001').codes()
                self.assertTrue(any(e in codes for e in expect), 'expected %s, got %s' % (expect, sorted(codes)))

    def test_the_four_named_defects(self):
        names = ['fabricated quote', 'dropped value of the PDF row', 'documented tier on a lead-only source', 'missing reason']
        got = [n for n, _, _ in ST.CASES[:4]]
        self.assertEqual(got, names)

    def test_a_dropped_value_names_the_value(self):
        o = base()
        ST._dropped_value(o)
        R = V.validate_obj(o, 'x', ctx(), 'C-001')
        self.assertTrue(any('about 04:00' in m for c, m in R.errors if c == 'pdf_value_dropped'))

    def test_exact_quote_stays_exact_when_page_moves(self):
        o = base()
        o['positions'][2]['support'][0]['page'] = '116'
        self.assertIn('page_mismatch', V.validate_obj(o, 'x', ctx(), 'C-001').codes())

    def test_a_citation_of_another_text_is_not_confused(self):
        o = base()
        c = o['positions'][2]['support'][0]
        c['source'], c['part'] = 'OR27-2', 'OR27-2-R426'
        codes = V.validate_obj(o, 'x', ctx(), 'C-001').codes()
        self.assertTrue(codes & {'quote_not_found', 'offset_mismatch', 'page_mismatch'})

    def test_irreducible_needs_a_range_and_failed_searches(self):
        o = base()
        o['class'] = 'irreducible'
        codes = V.validate_obj(o, 'x', ctx(), 'C-001').codes()
        self.assertIn('class_mode', codes)
        self.assertIn('failed_searches_missing', codes)

    def test_gap_tier_must_be_a_gap_tier(self):
        o = base()
        o['class'] = 'gap'
        self.assertIn('class_tier', V.validate_obj(o, 'x', ctx(), 'C-001').codes())

    def test_numeric_default_needs_its_range(self):
        o = base()
        for p in o['positions']:
            p['kind'] = 'count'
            p['value'] = {'n': 386}
        o['positions'][2]['support'][0]['states'] = {'numbers': [386]}
        codes = V.validate_obj(o, 'x', ctx(), 'C-001').codes()
        self.assertIn('default_range', codes)

    def test_command_line(self):
        exe = [sys.executable, '-I', os.path.join(TOOLS, 'validate_resolution.py')]
        r = subprocess.run(exe + [ST.FIX], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stdout[-300:])
        r = subprocess.run(exe + ['C-001'], capture_output=True, text=True)
        self.assertIn(r.returncode, (0, 1))
        r = subprocess.run(exe, capture_output=True, text=True)
        self.assertEqual(r.returncode, 2)


class Dossiers(unittest.TestCase):
    def test_47_dossiers_with_their_sections(self):
        import build_dossiers as B
        missing = [c for c in L.IDS if not os.path.exists(os.path.join(L.DOSSIERS, c + '.md'))]
        if missing:
            self.skipTest('dossiers not built yet: %s' % missing[:3])
        self.assertEqual(B.check(), 0)


if __name__ == '__main__':
    unittest.main(verbosity=2)
