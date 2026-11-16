"""Negative controls of the Q02 runner (provenance completeness), GATE-SPEC U-25: the runner passes a clean world and reports each injected defect as FAIL.

    python3 tests/governance/gates/test_q02.py        (python unittest; each test runs the runner on a scratch repository, no node, no network)
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pq_fixtures as fx  # noqa: E402
import pq_world as W  # noqa: E402

BT, GOV = W.BT, W.GOV


class Q02(unittest.TestCase):
    def go(self, world, *extra, expect_exit=None):
        s = fx.Scratch(world)
        self.addCleanup(s.close)
        code, rec, out = s.run('q02_provenance.py', *W.paths(s), *extra)
        self.assertIsNotNone(rec, out)
        if expect_exit is not None:
            self.assertEqual(code, expect_exit, out)
        return rec

    def fails(self, rec, needle, prefix='Q02/'):
        hit = [i for i in rec['items'] if i['result'] == 'FAIL' and i['id'].startswith(prefix) and needle in i['reason']]
        self.assertTrue(hit, 'no FAIL item with %r under %s; FAIL items: %s' % (needle, prefix, [(i['id'], i['reason'][:110]) for i in rec['items'] if i['result'] == 'FAIL']))
        return hit[0]

    # ------------------------------------------------------------------------------------------ clean world
    def test_clean_world_passes(self):
        rec = self.go(W.world(), expect_exit=0)
        self.assertEqual(rec['verdict'], 'PASS', [(i['id'], i['result'], i['reason'][:100]) for i in rec['items'] if i['result'] not in ('PASS', 'N/A')])
        self.assertEqual(rec['gate'], 'Q02')
        self.assertTrue(all(i['pass'] == (i['result'] == 'PASS') for i in rec['items']))
        self.assertGreater(len(rec['inputs']), 5)
        self.assertTrue(rec['runnable_here'])
        by = fx.items_by_id(rec)
        self.assertEqual(by['Q02/Q02.3/t.things']['evidence']['extracts_found_again'], 1)      # the extract was found again in the stored text

    def test_two_runs_give_identical_items(self):
        w = W.world()
        a, b = self.go(w), self.go(w)
        self.assertEqual(a['items'], b['items'])
        self.assertEqual(a['inputs'], b['inputs'])
        self.assertEqual(a['verdict'], b['verdict'])

    # ------------------------------------------------------------------------------------------ Q02.2 tier and source
    def test_datum_without_tier_is_fail(self):
        w = W.world()
        del W.things(w)[0]['tier']
        self.fails(self.go(w, expect_exit=1), 'no tier', 'Q02/Q02.2/t.things')

    def test_tier_statement_the_product_cannot_read_is_fail(self):
        w = W.world()
        W.things(w)[0]['tier'] = 'computed (not measured)'
        w['fixture/names.json'] = {'computed (not measured)': None}
        self.fails(self.go(w), 'names no tier', 'Q02/Q02.2/t.things')

    def test_tier_statement_read_as_documented_is_judged_as_documented(self):
        w = W.world()
        W.things(w)[0]['tier'] = 'documented (secondary)'
        del W.things(w)[0]['quote']
        w['fixture/names.json'] = {'documented (secondary)': 'documented'}
        self.fails(self.go(w), 'no source extract', 'Q02/Q02.3/t.things')

    def test_documented_without_source_is_fail(self):
        w = W.world()
        W.things(w)[0]['sources'] = []
        self.fails(self.go(w), 'documented with no source id', 'Q02/Q02.2/t.things')

    def test_open_gap_without_register_entry_is_fail(self):
        w = W.world()
        del W.things(w)[3]['register']
        self.fails(self.go(w), 'an open gap with no register entry', 'Q02/Q02.2/t.things')

    def test_inferred_without_source_or_reasoning_is_fail(self):
        w = W.world()
        t = W.things(w)[1]
        t['sources'] = []
        del t['reasoning']
        self.fails(self.go(w), 'neither a source id nor reasoning', 'Q02/Q02.2/t.things')

    # ------------------------------------------------------------------------------------------ Q02.3 documented needs an extract
    def test_documented_without_extract_is_fail(self):
        w = W.world()
        del W.things(w)[0]['quote']
        self.fails(self.go(w), 'no source extract', 'Q02/Q02.3/t.things')

    def test_extract_of_fifteen_words_is_fail(self):
        w = W.world()
        W.things(w)[0]['quote'] = 'the quick brown fox jumps over the lazy dog at noon. Another sentence follows here, with eleven'
        self.fails(self.go(w), 'words (limit 14)', 'Q02/Q02.3/t.things')

    def test_extract_that_is_not_in_the_stored_text_is_fail(self):
        w = W.world()
        W.things(w)[0]['quote'] = 'a sentence that no text contains'
        self.fails(self.go(w, expect_exit=1), 'not found in the stored text', 'Q02/Q02.3/t.things')

    def test_extract_found_with_other_case_and_punctuation_is_accepted(self):
        w = W.world()
        W.things(w)[0]['quote'] = 'The QUICK brown fox, jumps over the lazy dog'
        rec = self.go(w, expect_exit=0)
        self.assertEqual(fx.items_by_id(rec)['Q02/Q02.3/t.things']['result'], 'PASS')

    def test_number_of_the_claim_missing_from_the_extract_is_fail(self):
        w = W.world()
        W.things(w)[0]['claim_text'] = 'eleven soldiers 1863 and 12 flags'
        self.fails(self.go(w), 'not in the span', 'Q02/Q02.3/t.things')

    def test_documented_on_a_lead_source_only_is_fail(self):
        w = W.world()
        W.things(w)[0]['sources'] = ['LEAD-1']
        r = self.go(w)
        self.fails(r, 'neither a lead nor weak', 'Q02/Q02.3/t.things')
        self.fails(r, 'every source is a lead or weak', 'Q02/Q02.8/t.things')

    def test_documented_on_a_weak_source_only_is_fail(self):
        w = W.world()
        W.manifest(w, 'SRC-B')['weak'] = True
        W.manifest(w, 'SRC-A')['weak'] = True
        self.fails(self.go(w), 'every source is a lead or weak', 'Q02/Q02.8/t.things')

    def test_text_not_on_the_machine_is_not_run_never_a_pass(self):
        w = W.world()
        del w['tmp/library/src-a.txt']
        rec = self.go(w)
        it = fx.items_by_id(rec)['Q02/Q02.3/t.things']
        self.assertEqual(it['result'], 'NOT-RUN', it['reason'])
        self.assertNotEqual(rec['verdict'], 'PASS')

    # ------------------------------------------------------------------------------------------ Q02.4 and Q02.5
    def test_inferred_without_reasoning_is_fail(self):
        w = W.world()
        del W.things(w)[1]['reasoning']
        self.fails(self.go(w), 'no reasoning', 'Q02/Q02.4/t.things')

    def test_inferred_whose_premise_is_not_in_the_ledger_is_fail(self):
        w = W.world()
        W.things(w)[1]['claims'] = ['C-NOPE']
        self.fails(self.go(w), 'not documented claims of the ledger', 'Q02/Q02.4/t.things')

    def test_inferred_without_premise_claim_ids_is_fail(self):
        w = W.world()
        del W.things(w)[1]['claims']
        self.fails(self.go(w), 'no premise claim ids', 'Q02/Q02.4/t.things')

    def test_plausible_procedural_without_a_procedural_block_is_fail(self):
        w = W.world()
        del W.things(w)[2]['procedural']
        self.fails(self.go(w), 'no procedural block', 'Q02/Q02.5/t.things')

    def test_procedural_block_missing_a_key_is_fail(self):
        for k in ('generator', 'seed', 'distribution', 'documented_context', 'substitute'):
            w = W.world()
            del W.things(w)[2]['procedural'][k]
            self.fails(self.go(w), 'procedural block lacks ' + k, 'Q02/Q02.5/t.things')

    def test_plausible_procedural_without_register_id_is_fail(self):
        w = W.world()
        del W.things(w)[2]['register']
        self.fails(self.go(w), 'no register id for the gap', 'Q02/Q02.5/t.things')

    def test_plausible_procedural_with_a_closed_register_entry_is_fail(self):
        w = W.world()
        w[GOV + 'register_index.json'][0]['status'] = 'closed'
        self.fails(self.go(w), 'not an open entry of the register', 'Q02/Q02.5/t.things')

    # ------------------------------------------------------------------------------------------ Q02.6, Q02.7, Q02.9, Q02.1
    def test_source_id_in_no_manifest_is_fail(self):
        w = W.world()
        W.things(w)[0]['sources'] = ['SRC-A', 'SRC-GHOST']
        self.fails(self.go(w), 'in no Source Manifest', 'Q02/Q02.6/t.things')

    def test_manifest_entry_without_reliability_tier_is_fail(self):
        for k in ('date_written', 'rights', 'reliability_tier'):
            w = W.world()
            W.manifest(w, 'SRC-B')[k] = None
            self.fails(self.go(w), 'lack date_written, rights or reliability_tier', 'Q02/Q02.6/manifest-layer')

    def test_conflict_value_without_a_source_key_is_fail(self):
        w = W.world()
        w[GOV + 'conflicts_structured.json']['conflicts'][0]['values'][1]['label'] = 'one o\'clock'
        self.fails(self.go(w), 'have a value with no source key', 'Q02/Q02.7/')

    def test_conflict_with_one_value_is_fail(self):
        w = W.world()
        del w[GOV + 'conflicts_structured.json']['conflicts'][0]['values'][1]
        self.fails(self.go(w), 'have a value with no source key, fewer than two values', 'Q02/Q02.7/')

    def test_kit_item_without_validity_dates_is_fail(self):
        w = W.world()
        W.layer(w)['classes']['layer.kit_items'][0]['extra'] = {}
        self.fails(self.go(w), 'kit item without valid_from and valid_to', 'Q02/Q02.9/t.kit')

    def test_data_file_the_page_loads_that_no_class_names_is_fail(self):
        w = W.world()
        w[BT + 'app/src/data.mjs'] += "export const more = () => fetch(URLS.data + 'unlisted.json');\n"
        w[BT + 'app/data/unlisted.json'] = {'x': 1}
        rec = self.go(w, expect_exit=1)
        it = self.fails(rec, 'in no datum class', 'Q02/Q02.1/census')
        self.assertIn('docs/battle-theatre/app/data/unlisted.json', it['evidence']['not_in_registry'])

    def test_loader_that_names_a_file_that_does_not_exist_is_fail(self):
        w = W.world()
        w[BT + 'app/src/data.mjs'] += "export const gone = () => fetch(URLS.data + 'gone.json');\n"
        self.fails(self.go(w), 'do not exist', 'Q02/Q02.1/census')

    def test_exemption_with_a_tier_inside_is_void(self):
        w = W.world()
        w['fixture/datum_classes.json']['classes'].append({'id': 't.exempt', 'label': 'x', 'source': {'kind': 'json', 'file': BT + 'app/data/things.json', 'members': 'things[]'}, 'files': [], 'exempt': 'a computed report', 'visible': False})
        self.fails(self.go(w), 'the exemption is void', 'Q02/Q02.2/t.exempt')

    # ------------------------------------------------------------------------------------------ missing input is never a pass
    def test_missing_layer_dump_blocks_the_layer_classes(self):
        w = W.world()
        s = fx.Scratch(w)
        self.addCleanup(s.close)
        code, rec, out = s.run('q02_provenance.py', '--registry', os.path.join(s.root, 'fixture', 'datum_classes.json'), '--layer-dump', os.path.join(s.root, 'fixture', 'missing.json'), '--tier-names', os.path.join(s.root, 'fixture', 'names.json'))
        self.assertIsNotNone(rec, out)
        it = fx.items_by_id(rec)['Q02/Q02.2/t.units']
        self.assertEqual(it['result'], 'BLOCKED-INPUT')
        self.assertTrue(it['reason'].startswith('input missing:'))
        self.assertNotEqual(rec['verdict'], 'PASS')
        self.assertEqual(code, 2 if rec['verdict'] == 'INCOMPLETE' else 1)

    def test_missing_registry_is_blocked_not_a_pass(self):
        w = W.world()
        s = fx.Scratch(w)
        self.addCleanup(s.close)
        code, rec, out = s.run('q02_provenance.py', '--registry', os.path.join(s.root, 'fixture', 'nope.json'))
        self.assertNotEqual(rec['verdict'], 'PASS')
        self.assertEqual(rec['items'][0]['result'], 'BLOCKED-INPUT')

    def test_a_subset_of_the_classes_is_incomplete_never_a_pass(self):
        rec = self.go(W.world(), '--classes', 't.things')
        self.assertNotEqual(rec['verdict'], 'PASS')
        self.assertTrue(any('subset' in r for r in rec['incomplete_reasons']))

    def test_class_with_no_member_that_carries_a_tier_is_fail(self):
        w = W.world()
        w[BT + 'app/data/things.json'] = {'things': []}
        self.fails(self.go(w), 'no record carries a tier', 'Q02/Q02.2/t.things')


if __name__ == '__main__':
    unittest.main(verbosity=2)
