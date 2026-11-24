"""The layer data adopts the verified order-of-battle table (tools/bt/oob_adopt.py, called by build_arrivals.py): commanders with their succession, documented strength ranges with basis key and date,
conflict sets carried without a default, nothing else changed.

    python3 -m unittest discover -s tests/governance/gates -p 'test_oob_adopt.py' -v"""
import copy
import json
import os
import sys
import unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
import oob_adopt as A  # noqa: E402


def fig(basis, men, lo, hi, as_of='1863-07-01', tier='documented', alt=None, ev='g:0001', rid='OR27-1-R037'):
    f = {'basis': basis, 'men': men, 'low': lo, 'high': hi, 'as_of': as_of, 'tier': tier, 'evidence_ids': [ev], 'cite': {'source_id': 'OR27-1', 'report_id': rid}}
    if alt:
        f['alt'] = alt
    return f


def row(figs, status='verified', commanders=None):
    ranges = {}
    for f in figs:
        k = f['basis'] + '|' + f['men']
        r = ranges.setdefault(k, {'low': f['low'], 'high': f['high'], 'tier': f['tier'], 'lines': 0, 'basis': 'meaning of ' + k, 'by_as_of': {}})
        r['low'], r['high'] = min(r['low'], f['low']), max(r['high'], f['high'])
        b = r['by_as_of'].setdefault(f['as_of'] or 'undated', {'low': f['low'], 'high': f['high'], 'lines': 0})
        b['low'], b['high'], b['lines'] = min(b['low'], f['low']), max(b['high'], f['high']), b['lines'] + 1
        r['lines'] += 1
    for r in ranges.values():
        r['spans_dates'] = len(r['by_as_of']) > 1
    return {'fields': {'strength': status}, 'strength': {'figures': figs, 'ranges': ranges}, 'commanders': commanders or []}


class Strength(unittest.TestCase):
    def test_a_documented_range_is_adopted_with_its_basis_key_date_and_sources(self):
        r = A.strength_record(row([fig('taken_into_action', 'officers_and_men', 380, 380)]))
        self.assertEqual((r['status'], r['basis_key'], r['min'], r['max'], r['as_of'], r['tier']), ('adopted', 'taken_into_action|officers_and_men', 380, 380, '1863-07-01', 'documented'))
        self.assertEqual(r['sources'], ['OR27-1'])
        self.assertEqual(r['cites'], [{'report_id': 'OR27-1-R037', 'evidence_id': 'g:0001'}])

    def test_a_report_id_is_never_listed_as_a_source_so_other_basis_keys_of_the_report_do_not_tie_to_the_figure(self):
        r = A.strength_record(row([fig('taken_into_action', 'officers_and_men', 380, 380, ev='g:1'), fig('taken_into_action', 'not_stated', 380, 380, as_of='1863-07-03', ev='g:2')]))
        self.assertTrue(all('-R' not in x for x in r['sources']))
        self.assertIn('basis kind', A.strength_record(row([fig('taken_into_action', 'officers_and_men', 380, 380)]))['basis'].replace('meaning of taken_into_action|officers_and_men', 'basis kind'))

    def test_evidence_lines_that_differ_give_a_range_not_a_single_figure(self):
        r = A.strength_record(row([fig('present_for_duty', 'not_stated', 280, 280, ev='g:1'), fig('present_for_duty', 'not_stated', 320, 320, ev='g:2')]))
        self.assertEqual((r['min'], r['max']), (280, 320))

    def test_a_conflict_set_is_carried_with_every_alternative_and_no_default(self):
        r = A.strength_record(row([fig('present_for_duty', 'officers_and_men', 267, 267, alt='A'), fig('present_for_duty', 'not_stated', 277, 277, alt='B')], status='conflict'))
        self.assertEqual(r['status'], 'conflict')
        self.assertNotIn('basis_key', r)
        self.assertNotIn('min', r)
        self.assertIsNone(r['default'])
        self.assertEqual([a['key'] for a in r['alternatives']], ['present_for_duty|officers_and_men', 'present_for_duty|not_stated'])

    def test_the_basis_that_counts_the_men_in_the_battle_is_drawn_and_the_others_are_alternatives(self):
        r = A.strength_record(row([fig('present_for_duty', 'officers_and_men', 400, 400, as_of='1863-06-30', ev='g:1'), fig('taken_into_action', 'officers_and_men', 350, 350, ev='g:2')]))
        self.assertEqual((r['basis_key'], r['min'], r['max']), ('taken_into_action|officers_and_men', 350, 350))
        self.assertEqual({a['key'] for a in r['alternatives']}, {'present_for_duty|officers_and_men', 'taken_into_action|officers_and_men'})

    def test_a_range_that_spans_dates_is_adopted_on_the_figure_at_the_units_entry(self):
        mk = lambda *pairs: A.strength_record(row([fig('taken_into_action', 'officers_and_men', v, v, as_of=d, ev='g:%d' % i) for i, (d, v) in enumerate(pairs)]))
        inside = mk(('1863-06-30', 300), ('1863-07-01', 340), ('1863-07-03', 310))
        self.assertEqual((inside['min'], inside['max'], inside['as_of']), (340, 340, '1863-07-01'), 'earliest figure inside the battle')
        before = mk(('1863-06-30', 532), ('1863-07-13', 401))
        self.assertEqual((before['max'], before['as_of']), (532, '1863-06-30'), 'latest before the battle, not the post-battle return')
        after = mk(('1863-07-05', 100), ('1863-07-13', 90))
        self.assertEqual(after['as_of'], '1863-07-05')
        same = mk(('1863-07-01/1863-07-03', 149), ('1863-07-02/1863-07-03', 149))
        self.assertEqual((same['min'], same['max'], same['as_of']), (149, 149, '1863-07-01/1863-07-03'))
        self.assertIn('same figure on every date', same['basis'])
        self.assertEqual({a['key'] for a in same['alternatives']}, {'taken_into_action|officers_and_men'})
        self.assertEqual(set(same['alternatives'][0]['by_as_of']), {'1863-07-01/1863-07-03', '1863-07-02/1863-07-03'}, 'every date stays in the alternatives')

    def test_an_inferred_range_is_never_adopted(self):
        r = A.strength_record(row([fig('estimate_in_report', 'not_stated', 500, 500, tier='inferred')], status='inferred'))
        self.assertEqual(r['status'], 'no_documented_range')
        self.assertEqual(len(r['alternatives']), 1)

    def test_no_range_no_record(self):
        self.assertIsNone(A.strength_record({'fields': {}, 'strength': {'figures': [], 'ranges': {}}}))


class Commanders(unittest.TestCase):
    CM = [{'order': 2, 'name': 'Leonard', 'tier': 'documented', 'evidence_ids': ['x:2'], 'rank_printed': 'Col.'}, {'order': 1, 'name': 'Paul', 'tier': 'documented', 'evidence_ids': ['x:1'], 'rank_printed': 'Brig. Gen.'}]

    def test_the_succession_is_kept_in_order(self):
        r = A.commanders_record({'commanders': self.CM})
        self.assertEqual([(c['order'], c['name'], c['rank']) for c in r], [(1, 'Paul', 'Brig. Gen.'), (2, 'Leonard', 'Col.')])

    def test_inferred_lines_alone_are_not_adopted(self):
        self.assertIsNone(A.commanders_record({'commanders': [dict(self.CM[0], tier='inferred')]}))
        self.assertIsNone(A.commanders_record({'commanders': []}))


class Apply(unittest.TestCase):
    def units(self):
        return [{'id': 'b', 'children': ['b-r'], 'commanders_printed': ['X']}, {'id': 'b-r', 'children': [], 'commanders_printed': []}, {'id': 'other', 'children': []}]

    def table(self):
        return {'units': {'b': {'commanders': Commanders.CM, 'strength': {'figures': [], 'ranges': {}}}, 'b-r': dict(row([fig('taken_into_action', 'officers_and_men', 380, 380)]), commanders=Commanders.CM)}}

    def test_apply_changes_only_the_two_keys_and_is_idempotent(self):
        us = self.units()
        before = copy.deepcopy(us)
        s = A.apply(us, table=self.table())
        self.assertTrue(s['applied'])
        for a, b in zip(before, us):
            self.assertEqual({k: v for k, v in b.items() if k not in ('commanders_verified', 'strength_verified')}, a)
        self.assertIn('commanders_verified', us[0])
        self.assertNotIn('strength_verified', us[0], 'a formation carries its leaves, not a figure')
        self.assertEqual(us[1]['strength_verified']['basis_key'], 'taken_into_action|officers_and_men')
        self.assertNotIn('commanders_verified', us[2])
        again = copy.deepcopy(us)
        A.apply(again, table=self.table())
        self.assertEqual(again, us)


class GeneratedLayerData(unittest.TestCase):
    """The checked-in history/units.json is what the builder gives from the checked-in verified table (red until build_arrivals.py calls the adoption)."""

    def test_units_json_is_not_stale(self):
        self.assertEqual(A.check(), [])

    def test_a_stale_units_file_is_detected(self):
        doc = json.load(open(A.UNITS, encoding='utf-8'))
        victim = next(u for u in doc['units'] if u.get('strength_verified', {}).get('status') == 'adopted')
        victim['strength_verified']['min'] += 1
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, 'units.json')
            json.dump(doc, open(p, 'w', encoding='utf-8'))
            self.assertTrue(any(victim['id'] in x for x in A.check(p)))

    def test_every_adopted_strength_is_a_documented_range_of_the_table(self):
        table = json.load(open(A.TABLE, encoding='utf-8'))['units']
        doc = json.load(open(A.UNITS, encoding='utf-8'))
        n = 0
        for u in doc['units']:
            s = u.get('strength_verified')
            if not s or s['status'] != 'adopted':
                continue
            n += 1
            r = table[u['id']]['strength']['ranges'][s['basis_key']]
            self.assertEqual(r['tier'], 'documented')
            lo, hi = (r['by_as_of'][s['as_of']]['low'], r['by_as_of'][s['as_of']]['high']) if s.get('as_of') and r['by_as_of'].get(s['as_of']) else (r['low'], r['high'])
            self.assertEqual((s['min'], s['max']), (lo, hi))
            self.assertNotEqual(table[u['id']]['fields'].get('strength'), 'conflict', u['id'])
        self.assertGreater(n, 100)


if __name__ == '__main__':
    unittest.main()
