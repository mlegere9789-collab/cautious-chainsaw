"""Negative controls of the Q19 runner (claim ledger), GATE-SPEC U-25: the runner passes a clean world and reports each injected defect as FAIL.

    python3 tests/governance/gates/test_q19.py        (python unittest; each test runs the runner on a scratch repository, no node, no network)
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pq_fixtures as fx  # noqa: E402
import pq_world as W  # noqa: E402

BT, GOV = W.BT, W.GOV


class Q19(unittest.TestCase):
    def go(self, world, *extra, expect_exit=None):
        s = fx.Scratch(world)
        self.addCleanup(s.close)
        code, rec, out = s.run('q19_claims.py', *W.paths19(s), *extra)
        self.assertIsNotNone(rec, out)
        if expect_exit is not None:
            self.assertEqual(code, expect_exit, out)
        return rec

    def fails(self, rec, needle, prefix='Q19/'):
        hit = [i for i in rec['items'] if i['result'] == 'FAIL' and i['id'].startswith(prefix) and needle in i['reason']]
        self.assertTrue(hit, 'no FAIL item with %r under %s; FAIL items: %s' % (needle, prefix, [(i['id'], i['reason'][:110]) for i in rec['items'] if i['result'] == 'FAIL']))
        return hit[0]

    def w(self):
        return W.world19()

    # ------------------------------------------------------------------------------------------ clean world
    def test_clean_world_passes_and_covered_counts(self):
        rec = self.go(self.w(), expect_exit=0)
        self.assertEqual(rec['verdict'], 'PASS', [(i['id'], i['result'], i['reason'][:100]) for i in rec['items'] if i['result'] not in ('PASS', 'N/A', 'COVERED')])
        self.assertEqual(rec['gate'], 'Q19')
        by = fx.items_by_id(rec)
        self.assertEqual(by['Q19/Q19.4/t.units']['result'], 'PASS')          # two independent sources
        self.assertEqual(by['Q19/Q19.4/t.claims']['result'], 'COVERED')      # one source, flagged, flag shown, entry for the second source
        self.assertTrue(all(i['pass'] == (i['result'] == 'PASS') for i in rec['items']))

    def test_two_runs_give_identical_items(self):
        w = self.w()
        a, b = self.go(w), self.go(w)
        self.assertEqual(a['items'], b['items'])
        self.assertEqual(a['verdict'], b['verdict'])

    # ------------------------------------------------------------------------------------------ Q19.1 and Q19.2
    def test_visible_class_with_no_claim_id_anywhere_is_listed_by_the_census(self):
        w = self.w()
        for r in W.layer(w)['classes']['layer.units']:
            r['claim_ids'] = []
        it = self.fails(self.go(w, expect_exit=1), 'name no claim id on any member', 'Q19/Q19.1/census')
        self.assertIn('t.units', it['reason'])

    def test_datum_without_a_claim_id_is_fail(self):
        w = self.w()
        del W.things(w)[0]['claims']
        self.fails(self.go(w), 'no claim id', 'Q19/Q19.2/t.things')

    def test_claim_id_that_resolves_in_no_ledger_is_fail(self):
        w = self.w()
        W.things(w)[0]['claims'] = ['C-NOWHERE']
        self.fails(self.go(w), 'resolves in no ledger', 'Q19/Q19.2/t.things')

    def test_claim_without_a_span_is_fail(self):
        w = self.w()
        del w[BT + 'history/positions/positions_A.jsonl'][0]['source']['quote']
        r = self.go(w)
        self.fails(r, 'no span', 'Q19/Q19.2/t.claims')
        self.fails(r, 'no span', 'Q19/Q19.7/claims-have-spans')

    def test_datum_that_cites_a_claim_with_no_span_is_fail(self):
        w = self.w()
        del w[BT + 'history/positions/positions_A.jsonl'][0]['source']['quote']
        self.fails(self.go(w), 'has no span', 'Q19/Q19.2/t.things')

    # ------------------------------------------------------------------------------------------ Q19.3 independence
    def test_two_sources_whose_independence_is_not_recorded_are_not_independent(self):
        w = self.w()
        W.manifest(w, 'SRC-B')['independent_of'] = None
        r = self.go(w)
        self.fails(r, 'independence not recorded', 'Q19/Q19.3/t.units')
        self.fails(r, 'neither two independent sources', 'Q19/Q19.4/t.units')

    def test_a_source_derived_from_the_other_is_not_independent(self):
        w = self.w()
        W.manifest(w, 'SRC-B')['derived_from'] = ['SRC-A']
        self.fails(self.go(w), 'share a root or one derives from the other', 'Q19/Q19.3/t.units')

    def test_two_sources_that_share_a_root_are_not_independent(self):
        w = self.w()
        W.layer(w)['manifest'].append(W.manifest_entry('ROOT', independent_of=[]))
        W.manifest(w, 'SRC-A')['derived_from'] = ['ROOT']
        W.manifest(w, 'SRC-B')['derived_from'] = ['ROOT']
        self.fails(self.go(w), 'share a root', 'Q19/Q19.3/t.units')

    def test_lead_does_not_count_as_a_second_source(self):
        w = self.w()
        for r in W.layer(w)['classes']['layer.units']:
            r['sources'] = ['SRC-A', 'LEAD-1']
        r = self.go(w)
        self.fails(r, 'neither two independent sources', 'Q19/Q19.4/t.units')

    # ------------------------------------------------------------------------------------------ Q19.4 two or a flag
    def test_documented_single_source_without_a_flag_is_fail(self):
        w = self.w()
        W.things(w)[0]['sources'] = ['SRC-A']
        self.fails(self.go(w), 'documented with', 'Q19/Q19.4/t.things')

    def test_flag_that_the_product_never_shows_is_fail(self):
        w = self.w()
        w[BT + 'app/src/ui.mjs'] = '// nothing about flags here\n'
        w[BT + 'app/src/overlay.mjs'] = "// marks\nconst S = TIER_STYLE[tier];\n"
        w['fixture/content_classes.json']['classes'][1]['mark_evidence'][0]['patterns'] = ['TIER_STYLE[tier]']
        self.fails(self.go(w), 'no code of the product shows it', 'Q19/Q19.4/t.claims')

    def test_flagged_datum_with_no_entry_for_the_second_source_is_fail(self):
        w = self.w()
        del w[BT + 'history/positions/positions_A.jsonl'][0]['register']
        self.fails(self.go(w), 'no open register entry names where the second source would come from', 'Q19/Q19.4/t.claims')

    def test_register_entry_that_is_closed_does_not_name_a_second_source(self):
        w = self.w()
        w[GOV + 'register_index.json'][0]['status'] = 'closed'
        self.fails(self.go(w), 'no open register entry names', 'Q19/Q19.4/t.claims')

    def test_inferred_datum_whose_tier_mark_is_not_shown_for_its_class_is_fail(self):
        w = self.w()
        w['fixture/content_classes.json']['classes'][1]['mark_evidence'] = []
        self.fails(self.go(w), 'is not shown in the product for this class', 'Q19/Q19.4/t.things')

    # ------------------------------------------------------------------------------------------ Q19.5 lead-only
    def test_documented_on_lead_only_is_fail(self):
        w = self.w()
        W.things(w)[0]['sources'] = ['LEAD-1']
        self.fails(self.go(w), 'documented on lead or weak sources alone', 'Q19/Q19.5/t.things')

    # ------------------------------------------------------------------------------------------ Q19.6 conflicts
    def test_conflict_without_a_delegated_default_is_fail(self):
        w = self.w()
        w[BT + 'app/data/conflict-defaults.json']['conflicts'] = {}
        self.fails(self.go(w), 'lack their delegated default', 'Q19/Q19.6/defaults-recorded')

    def test_default_without_its_label_is_fail(self):
        w = self.w()
        w[BT + 'app/data/conflict-defaults.json']['label'] = 'default'
        r = self.go(w)
        it = [i for i in r['items'] if i['id'] == 'Q19/Q19.6/defaults-recorded'][0]
        self.assertEqual(it['result'], 'FAIL')
        self.assertIn('label', str(it['evidence']['reasons']))

    def test_default_without_a_tier_is_fail(self):
        w = self.w()
        del w[BT + 'app/data/conflict-defaults.json']['conflicts']['C-001']['tier']
        self.fails(self.go(w), 'lack their delegated default', 'Q19/Q19.6/defaults-recorded')

    def test_conflict_whose_values_have_no_recorded_independence_has_no_computable_support(self):
        w = self.w()
        W.manifest(w, 'SRC-B')['independent_of'] = None
        self.fails(self.go(w), 'not computable', 'Q19/Q19.6/value-support')

    def test_conflicts_with_link_to_nothing_is_fail(self):
        w = self.w()
        w[BT + 'history/positions/positions_A.jsonl'][0]['conflicts_with'] = ['C-999']
        self.fails(self.go(w), 'point at neither a claim nor a conflict', 'Q19/Q19.6/claim-conflict-links')

    def test_conflicts_with_link_to_a_register_conflict_resolves(self):
        w = self.w()
        w[BT + 'history/positions/positions_A.jsonl'][0]['conflicts_with'] = ['C-001']
        r = self.go(w)
        self.assertEqual(fx.items_by_id(r)['Q19/Q19.6/claim-conflict-links']['result'], 'PASS')

    # ------------------------------------------------------------------------------------------ Q19.7 built once
    def test_missing_ledger_of_section_p_is_blocked_never_a_pass(self):
        w = self.w()
        del w[GOV + 'claim_ledger.json']
        r = self.go(w)
        it = fx.items_by_id(r)['Q19/Q19.7/section-p-ledger']
        self.assertEqual(it['result'], 'BLOCKED-INPUT')
        self.assertTrue(it['reason'].startswith('input missing:'))
        self.assertNotEqual(r['verdict'], 'PASS')

    def test_disposition_table_that_misses_a_claim_is_fail(self):
        w = self.w()
        w[BT + 'app/data/claim-dispositions.json']['rows'] = []
        self.fails(self.go(w), 'disposition table has 0 rows', 'Q19/Q19.7/disposition-rows')

    def test_missing_registry_is_blocked_not_a_pass(self):
        s = fx.Scratch(self.w())
        self.addCleanup(s.close)
        code, rec, out = s.run('q19_claims.py', '--registry', os.path.join(s.root, 'fixture', 'nope.json'))
        self.assertNotEqual(rec['verdict'], 'PASS')
        self.assertEqual(rec['items'][0]['result'], 'BLOCKED-INPUT')


if __name__ == '__main__':
    unittest.main(verbosity=2)
