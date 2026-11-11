"""Q17/Q18/Q23 coverage tests. Each check is its own test, so the report shows real pass/fail.
Run: python tests/governance/test_coverage.py   (exit 1 while any coverage check fails: that is unfinished work, not a skip)."""
import os, sys, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'tools', 'bt'))
import check_coverage
C = check_coverage.coverage()

class Coverage(unittest.TestCase):
    def test_q17_every_timeline_row_has_realization_or_open_register_entry(self):
        self.assertTrue(C['Q17']['ok'], C['Q17'])
    def test_q18_every_requirement_has_subrequirements(self):
        self.assertEqual(C['Q18']['requirements_without_subrequirements'], [])
    def test_q18_every_subrequirement_passing_or_linked(self):
        self.assertEqual(C['Q18']['unlinked_and_not_passing'], 0, C['Q18'])
    def test_q23_tier_marking_on_non_documented_content(self):
        self.assertTrue(C['Q23']['ok'], C['Q23'])

if __name__ == '__main__':
    unittest.main(verbosity=2)
