"""Tests for tools/bt/merge_timeline_verification.py (promotion rule, idempotence, --check). Run: python3 tests/governance/test_timeline_merge.py"""
import os, sys, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'tools', 'bt'))
import merge_timeline_verification as M

def good():
    cit = {'key': 'c1', 'source_id': 'OR27', 'quote': 'x', 'text_offset': 0, 'text_offset_end': 1, 'source_file': 'nope'}
    corr = {'id': 'T1-001', 'shard': 'tl-01', 'verdict': 'confirmed', 'default': None, 'scenarios': [], 'remains_unsupported': [],
            'sub_claims': [{'n': 1, 'tier': 'documented', 'support': 'supported', 'citations': ['c1']}], 'citations': [cit]}
    return corr, {'id': 'T1-001', 'tier': 'documented'}

def run(corr, seed, ok=True):
    orig = M.check_quote
    M.check_quote = lambda c, cache, stats: (ok, 'ok' if ok else 'quote not found at the stored offsets')
    try:
        return M.evaluate(corr, seed, {}, {'hits': 0, 'misses': 0})
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
