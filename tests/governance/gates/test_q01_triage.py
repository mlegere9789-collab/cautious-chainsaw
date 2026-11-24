"""Q01 triage: the classifier names a cause for every FAIL and BLOCKED-INPUT item of the stored gate record, and the verified table never marks a unit verified without documented evidence.

    python3 -m unittest discover -s tests/governance/gates -p 'test_q01_triage.py' -v"""
import json
import os
import sys
import unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
import q01_triage as T  # noqa: E402

TABLE = json.load(open(T.TABLE, encoding='utf-8'))
RESULT = json.load(open(T.RESULT, encoding='utf-8'))


class Triage(unittest.TestCase):
    def test_every_failure_and_blocked_item_has_a_cause(self):
        rows = T.tally(RESULT, TABLE)
        self.assertEqual([k for k in rows if k[2] == 'unclassified'], [])
        self.assertEqual(sum(rows.values()), RESULT['counts']['FAIL'] + RESULT['counts']['BLOCKED-INPUT'])

    def test_the_cause_table_names_every_cause_the_classifier_returns(self):
        for k in T.tally(RESULT, TABLE):
            self.assertIn(k[2], T.CAUSE)

    def test_a_kit_default_record_and_a_same_as_row_are_runner_bugs_not_roster_gaps(self):
        units = {'default.x': {'level': 'default'}, 'KIT.A': {'same_as': {'unit_id': 'a'}}, 'KIT.B': {'level': 'battery'}}
        mk = lambda uid: {'check': 'Q01.2', 'result': 'FAIL', 'reason': 'x', 'subjects': [uid]}
        self.assertEqual([T.classify(mk(u), units, set()) for u in ('default.x', 'KIT.A', 'KIT.B')], ['runner-bug', 'runner-bug', 'roster-missing'])


class LayerAdoptionCauses(unittest.TestCase):
    """After the layer adopts the verified table (tools/bt/oob_adopt.py) a Q01.3 or Q01.7 FAIL is one of: the table holds a conflict set (carried, no default), the table holds only inferred lines (not adopted),
    a formation that carries the PDF's printed single figure (not replaced: it feeds the shares of its leaves), or the layer data still lacks a documented figure or commander (the builder's job)."""

    def classify(self, check, fields, tier='documented', layer_kind='procedural', commanders=None):
        units = {'u': {'fields': fields, 'commanders': commanders or [{'tier': tier}], 'level': 'regiment'}}
        item = {'check': check, 'result': 'FAIL', 'reason': 'x', 'subjects': ['u'], 'evidence': {'layer': {'kind': layer_kind}}}
        return T.classify(item, units, set())

    def test_a_conflict_set_in_the_table_is_its_own_class(self):
        self.assertEqual(self.classify('Q01.3', {'strength': 'conflict'}), 'strength-conflict-set')

    def test_an_inferred_only_table_row_is_never_adopted(self):
        self.assertEqual(self.classify('Q01.3', {'strength': 'inferred'}), 'table-inferred-only')
        self.assertEqual(self.classify('Q01.7', {'commander': 'inferred'}, tier='inferred'), 'table-inferred-only')

    def test_a_formation_with_a_printed_single_figure_keeps_it(self):
        self.assertEqual(self.classify('Q01.3', {'strength': 'verified'}, layer_kind='printed'), 'layer-printed-vs-table')

    def test_a_documented_row_the_layer_still_lacks_is_the_builders_job(self):
        self.assertEqual(self.classify('Q01.3', {'strength': 'verified'}), 'layer-procedural-vs-table')
        self.assertEqual(self.classify('Q01.7', {'commander': 'verified'}), 'layer-lacks-commander')

    def test_every_new_class_has_a_proposal_entry_or_is_mapped(self):
        import propose_q01_gaps as P
        mapped = {c for cs in P.MAP.values() for c in cs}
        for c in ('strength-conflict-set', 'table-inferred-only', 'layer-printed-vs-table'):
            self.assertIn(c, T.CAUSE)
            self.assertIn(c, mapped)


class TableNeverPromotes(unittest.TestCase):
    def test_a_verified_unit_has_a_documented_line_for_each_core_field_it_requires(self):
        bad = []
        for uid, u in TABLE['units'].items():
            if u['status'] != 'verified':
                continue
            for f, key in (('roster', 'presence'), ('commander', 'commanders'), ('strength', 'strength')):
                if f in u['required']:
                    rows = u.get(key)
                    tiers = [x['tier'] for x in (rows if isinstance(rows, list) else (rows or {}).get('figures') or [rows] if rows else [])]
                    if 'documented' not in tiers:
                        bad.append((uid, f))
        self.assertEqual(bad, [])

    def test_an_aliased_kit_row_carries_no_evidence_of_its_own_and_is_never_verified(self):
        for uid, u in TABLE['units'].items():
            if u.get('same_as'):
                self.assertEqual(u['status'], 'unverified', uid)
                self.assertIn(u['same_as']['unit_id'], TABLE['units'])
                self.assertTrue(TABLE['units'][u['same_as']['unit_id']]['in_roster'])


if __name__ == '__main__':
    unittest.main()
