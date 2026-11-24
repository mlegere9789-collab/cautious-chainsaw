"""Tests for tools/bt/merge_timeline_verification.py (promotion rule, idempotence, --check). Run: python3 tests/governance/test_timeline_merge.py"""
import os, sys, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'tools', 'bt'))
import merge_timeline_verification as M

def good():
    cit = {'key': 'c1', 'source_id': 'OR27', 'quote': 'x', 'text_offset': 0, 'text_offset_end': 1, 'source_file': 'nope'}
    corr = {'id': 'T1-001', 'shard': 'tl-01', 'verdict': 'confirmed', 'default': None, 'scenarios': [], 'remains_unsupported': [],
            'sub_claims': [{'n': 1, 'tier': 'documented', 'support': 'supported', 'citations': ['c1']}], 'citations': [cit]}
    return corr, {'id': 'T1-001', 'tier': 'documented'}

def run(corr, seed, ok=True, overlay=None):
    orig = M.check_quote
    M.check_quote = lambda c, cache, stats: (ok, 'ok' if ok else 'quote not found at the stored offsets')
    try:
        return M.evaluate(corr, seed, {}, {'hits': 0, 'misses': 0}, overlay)
    finally:
        M.check_quote = orig

class Rule(unittest.TestCase):
    def test_clean_confirmed_promotes(self):
        p, b = run(*good()); self.assertTrue(p); self.assertEqual(b['state'], 'verified'); self.assertEqual(b['gaps'], [])
    def test_corrected_never_promotes(self):
        c, s = good(); c['verdict'] = 'corrected'; self.assertFalse(run(c, s)[0])
    def test_partial_never_promotes(self):
        c, s = good(); c['verdict'] = 'partially_supported'; self.assertFalse(run(c, s)[0])
    def test_lead_or_non_source_is_not_a_source(self):
        for sid in ('COMPUTED', 'WIKI-GETTYSBURG', 'EPP-1', 'CWT-X', 'PROJECT-DATA', ''):
            c, s = good(); c['citations'][0]['source_id'] = sid; self.assertFalse(run(c, s)[0], sid)
    def test_one_unsupported_subclaim_blocks(self):
        c, s = good(); c['sub_claims'].append({'n': 2, 'tier': 'documented', 'support': 'unsupported', 'citations': []}); self.assertFalse(run(c, s)[0])
    def test_remaining_gap_blocks_and_stays_visible(self):
        c, s = good(); c['remains_unsupported'] = ['x']; p, b = run(c, s); self.assertFalse(p); self.assertTrue(b['gaps'])
    def test_scenario_blocks(self):
        c, s = good(); c['scenarios'] = [{}]; self.assertFalse(run(c, s)[0])
    def test_non_documented_seed_blocks(self):
        c, s = good(); s['tier'] = 'inferred'; self.assertFalse(run(c, s)[0])
    def test_failed_quote_recheck_blocks(self):
        self.assertFalse(run(*good(), ok=False)[0])
    def test_missing_source_file_blocks(self):
        c, s = good(); self.assertFalse(M.evaluate(c, s, {}, {'hits': 0, 'misses': 0})[0])

class Tightened(unittest.TestCase):
    def test_overlay_irreducible_without_scenarios_blocks(self):
        for cls in ('irreducible', 'gap', 'weighted'):
            c, s = good(); p, b = run(c, s, overlay=[{'conflict': 'C-028', 'class': cls}])
            self.assertFalse(p, cls); self.assertTrue(any('C-028' in g for g in b['gaps']))
    def test_overlay_settled_does_not_block(self):
        c, s = good(); self.assertTrue(run(c, s, overlay=[{'conflict': 'C-001', 'class': 'settled'}])[0])
    def test_overlay_with_scenarios_is_blocked_by_scenarios_rule(self):
        c, s = good(); c['scenarios'] = [{}]; self.assertFalse(run(c, s, overlay=[{'conflict': 'C-028', 'class': 'irreducible'}])[0])
    def test_secondary_only_subclaim_blocks(self):
        for sid in ('MEADE-LL-v2', 'WELD-1912'):
            c, s = good(); c['citations'][0]['source_id'] = sid
            p, b = run(c, s); self.assertFalse(p, sid); self.assertTrue(any('primary' in g for g in b['gaps']))
    def test_secondary_with_primary_promotes(self):
        c, s = good(); c['citations'].append(dict(c['citations'][0], key='c2', source_id='MEADE-LL-v2')); c['sub_claims'][0]['citations'] = ['c1', 'c2']
        self.assertTrue(run(c, s)[0])
    def test_window_start_needs_primary(self):
        c, s = good(); c['citations'][0]['source_id'] = 'MEADE-LL-v2'; c['corrected_claim'] = {'time_window': {'start': '1863-06-28T03:00'}}
        self.assertFalse(run(c, s)[0])
    def test_remains_unsupported_any_blocks(self):
        for v in (['x'], [{'a': 1}], 'text'):
            c, s = good(); c['remains_unsupported'] = v; self.assertFalse(run(c, s)[0])

class OnDisk(unittest.TestCase):
    def test_file_matches_evidence(self):
        self.assertEqual(M.check(), [])
    def test_idempotent(self):
        self.assertEqual(M.dump(M.build()[0]), M.dump(M.build(False)[0]))
    def test_verified_rows_carry_evidence(self):
        rows = M.load_jsonl(M.SEED); self.assertEqual(len(rows), 691)
        for r in rows:
            if r['status'] != 'seeded_unverified':
                self.assertEqual(r['verification']['state'], 'verified'); self.assertTrue(r['verification']['non_lead_citations'])
    def test_other_shards_untouched(self):
        ids = {x['id'] for s in M.SHARDS for x in M.load_jsonl(os.path.join(M.CORR, s + '.jsonl'))}
        for r in M.load_jsonl(M.SEED):
            if r['id'] not in ids:
                self.assertEqual(r['status'], 'seeded_unverified'); self.assertNotIn('verification', r)

if __name__ == '__main__':
    unittest.main(verbosity=2)
