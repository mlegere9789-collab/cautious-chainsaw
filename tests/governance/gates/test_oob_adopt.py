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
        mk = lambda basis, *pairs: A.strength_record(row([fig(basis, 'officers_and_men', v, v, as_of=d, ev='g:%d' % i) for i, (d, v) in enumerate(pairs)]))
        inside = mk('taken_into_action', ('1863-06-30', 300), ('1863-07-01', 340), ('1863-07-03', 310))
        self.assertEqual((inside['min'], inside['max'], inside['as_of']), (340, 340, '1863-07-01'), 'earliest figure inside the battle; the 30 June engagement figure is another engagement')
        before = mk('present_for_duty', ('1863-06-30', 532), ('1863-07-13', 401))
        self.assertEqual((before['max'], before['as_of']), (532, '1863-06-30'), 'a return of the day before the battle, not the post-battle return')
        self.assertEqual(A.strength_record(row([fig('taken_into_action', 'officers_and_men', 532, 532, as_of='1863-06-30')]))['status'], 'no_eligible_figure', 'an engagement figure dated before the battle is not the battle')
        self.assertEqual(mk('taken_into_action', ('1863-07-05', 100), ('1863-07-13', 90))['status'], 'no_eligible_figure', 'a figure dated after the battle is not the battle')
        self.assertEqual(A.strength_record(row([fig('present_for_duty', 'officers_and_men', 400, 400, as_of='1863-06-21')]))['status'], 'no_eligible_figure', 'a return older than 7 days is not the unit on the field')
        same = A.strength_record(row([fig('taken_into_action', 'officers_and_men', 149, 149, as_of=d, ev='g:%d' % i) for i, d in enumerate(('1863-07-01/1863-07-03', '1863-07-02/1863-07-03'))]))
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


def ev(**kw):
    """evidence lines by id for the hedge: {id: {'text_figure': ...}}"""
    return {k: {'text_figure': v, 'quote': v} for k, v in kw.items()}


class QC3Cases(unittest.TestCase):
    """The six units QC 3 found wrongly adopted (tmp/review-notes/QC-kit-evidence-3.md, Downstream), as the table holds them (kit/verified_oob.json) with the evidence text of their lines."""

    def test_14ct_draws_its_gettysburg_figure_not_the_chancellorsville_one(self):
        t = row([fig('taken_into_action', 'not_stated', 219, 219, as_of='1863-05-03', ev='us-2c:1'), fig('taken_into_action', 'rank_and_file', 160, 160, as_of='1863-07-02/1863-07-03', ev='us-2c:2')])
        r = A.strength_record(t, evidence=ev(**{'us-2c:1': '219', 'us-2c:2': 'about 160 muskets'}))
        self.assertEqual((r['status'], r['basis_key'], r['min'], r['max'], r['as_of']), ('adopted', 'taken_into_action|rank_and_file', 160, 160, '1863-07-02/1863-07-03'))
        self.assertFalse(r['exact'])
        self.assertIn('about 160 muskets', r['basis'])
        self.assertEqual(r['figure_kind'], 'muskets')
        by = {a['key']: a for a in r['alternatives']}
        self.assertEqual(by['taken_into_action|not_stated']['by_as_of_status']['1863-05-03']['eligible'], False)
        self.assertIn('another engagement', by['taken_into_action|not_stated']['by_as_of_status']['1863-05-03']['why_not'])

    def test_the_order_does_not_depend_on_the_key_order(self):
        a = A.strength_record(row([fig('taken_into_action', 'not_stated', 219, 219, as_of='1863-05-03', ev='1'), fig('taken_into_action', 'officers_and_men', 160, 160, as_of='1863-07-02', ev='2')]))
        b = A.strength_record(row([fig('taken_into_action', 'officers_and_men', 160, 160, as_of='1863-07-02', ev='2'), fig('taken_into_action', 'not_stated', 219, 219, as_of='1863-05-03', ev='1')]))
        self.assertEqual((a['max'], b['max']), (160, 160))

    def test_52ny_less_than_100_is_a_bound_not_a_count(self):
        t = row([fig('estimate_in_report', 'not_stated', 0, 100, as_of='1863-07-02', ev='us-2c-1d:0167')])
        r = A.strength_record(t, evidence=ev(**{'us-2c-1d:0167': 'less than 100 men'}))
        self.assertEqual(r['status'], 'bound_only')
        self.assertEqual(r['flag'], 'bound_only')
        self.assertNotIn('min', r)
        self.assertNotIn('max', r)
        self.assertEqual((r['bound']['kind'], r['bound']['value'], r['bound']['hedge']), ('upper', 100, 'less than 100 men'))
        self.assertIn('less than 100 men', r['basis'])
        self.assertIn('not a count', r['basis'])
        self.assertIsNone(r['default'])

    def test_78ny_not_more_than_200_is_a_bound_not_a_count(self):
        t = row([fig('estimate_in_report', 'not_stated', 0, 200, as_of='1863-07-02/1863-07-03', ev='us-12c:0181')])
        r = A.strength_record(t, evidence=ev(**{'us-12c:0181': 'not more than 200'}))
        self.assertEqual((r['status'], r['bound']['kind'], r['bound']['value']), ('bound_only', 'upper', 200))

    def test_a_bound_stated_with_equal_low_and_high_is_still_a_bound(self):
        r = A.strength_record(row([fig('taken_into_action', 'enlisted_only', 550, 550, ev='b:1')]), evidence=ev(**{'b:1': 'not more than 550 muskets'}))
        self.assertEqual((r['status'], r['bound']['value']), ('bound_only', 550))

    def test_a_lower_bound_is_carried_as_a_lower_bound(self):
        r = A.strength_record(row([fig('taken_into_action', 'not_stated', 300, 300, ev='b:2')]), evidence=ev(**{'b:2': 'a fraction of over 300 men'}))
        self.assertEqual((r['status'], r['bound']['kind'], r['bound']['value']), ('bound_only', 'lower', 300))

    def test_a_count_is_preferred_over_a_bound_and_the_bound_stays_an_alternative(self):
        t = row([fig('estimate_in_report', 'not_stated', 0, 100, ev='x:1'), fig('present_for_duty', 'officers_and_men', 90, 90, as_of='1863-06-30', ev='x:2')])
        r = A.strength_record(t, evidence=ev(**{'x:1': 'less than 100 men'}))
        self.assertEqual((r['status'], r['min'], r['max'], r['basis_key']), ('adopted', 90, 90, 'present_for_duty|officers_and_men'))
        self.assertTrue(r['exact'])
        self.assertEqual({a['key'] for a in r['alternatives']}, {'estimate_in_report|not_stated', 'present_for_duty|officers_and_men'})

    def test_114pa_draws_the_men_in_the_fight_not_the_aggregate(self):
        t = row([fig('aggregate_present', 'aggregate', 463, 463, as_of='1863-07-02', ev='us-3c-1d:1'), fig('estimate_in_report', 'rank_and_file', 383, 400, as_of='1863-07-02', ev='us-3c-1d:2')])
        r = A.strength_record(t, evidence=ev(**{'us-3c-1d:1': '463', 'us-3c-1d:2': 'less than 400'}))
        self.assertEqual(r['status'], 'bound_only', '"less than 400" is a bound on the rank and file; the 463 aggregate is not the men in the fight')
        self.assertEqual(r['bound']['value'], 400)
        t2 = row([fig('aggregate_present', 'aggregate', 463, 463, as_of='1863-07-02', ev='us-3c-1d:1'), fig('estimate_in_report', 'rank_and_file', 383, 400, as_of='1863-07-02', ev='us-3c-1d:2')])
        r2 = A.strength_record(t2, evidence=ev(**{'us-3c-1d:1': '463', 'us-3c-1d:2': 'from 383 to 400'}))
        self.assertEqual((r2['status'], r2['min'], r2['max'], r2['basis_key']), ('adopted', 383, 400, 'estimate_in_report|rank_and_file'))
        self.assertEqual({a['key'] for a in r2['alternatives']}, {'aggregate_present|aggregate', 'estimate_in_report|rank_and_file'})

    def test_an_aggregate_alone_is_not_the_fighting_strength(self):
        r = A.strength_record(row([fig('aggregate_present', 'aggregate', 463, 463, as_of='1863-07-02')]))
        self.assertEqual(r['status'], 'no_eligible_figure')
        self.assertIn('463', json.dumps(r['alternatives']))
        self.assertIn('not the fighting strength', r['note'])

    def test_6us_cavalry_figure_of_the_21_june_engagement_is_not_the_battle(self):
        t = row([fig('taken_into_action', 'officers_and_men', 356, 356, as_of='1863-06-21', ev='us-cav:0187')])
        r = A.strength_record(t, evidence=ev(**{'us-cav:0187': '356'}))
        self.assertEqual(r['status'], 'no_eligible_figure')
        self.assertEqual(r['flag'], 'no_eligible_figure')
        self.assertNotIn('min', r)
        self.assertIn('1863-06-21', r['note'])
        self.assertEqual(r['alternatives'][0]['by_as_of'], {'1863-06-21': [356, 356]}, 'the figure stays visible as an alternative')

    def test_27va_officers_are_added_from_the_documented_line_of_the_same_sentence(self):
        t = row([fig('taken_into_action', 'enlisted_only', 114, 114, as_of='1863-07-01/1863-07-03', ev='cs-johnson:0135', rid='OR27-2-R493'),
                 fig('taken_into_action', 'officers_only', 15, 15, as_of='1863-07-01/1863-07-03', ev='cs-johnson:0136', rid='OR27-2-R493')])
        r = A.strength_record(t, evidence=ev(**{'cs-johnson:0135': '114 muskets', 'cs-johnson:0136': '1 field officer, 2 staff officers and 12 company officers'}))
        self.assertEqual((r['status'], r['min'], r['max'], r['figure_kind'], r['officers_documented']), ('adopted', 129, 129, 'officers_and_men', True))
        self.assertEqual([c['key'] for c in r['composition']], ['taken_into_action|enlisted_only', 'taken_into_action|officers_only'])
        self.assertEqual(r['basis_key'], 'taken_into_action|enlisted_only')
        self.assertEqual(sorted(r['evidence_ids']), ['cs-johnson:0135', 'cs-johnson:0136'])

    def test_officers_of_another_report_or_date_are_not_added(self):
        t = row([fig('taken_into_action', 'enlisted_only', 114, 114, as_of='1863-07-01/1863-07-03', ev='a:1', rid='R1'), fig('taken_into_action', 'officers_only', 15, 15, as_of='1863-07-01/1863-07-03', ev='a:2', rid='R2')])
        r = A.strength_record(t)
        self.assertEqual((r['min'], r['max'], r['figure_kind'], r['officers_documented']), (114, 114, 'muskets', False))
        self.assertIn('officers are not counted', r['basis'])

    def test_muskets_without_an_officers_line_are_muskets_not_the_total(self):
        r = A.strength_record(row([fig('taken_into_action', 'enlisted_only', 330, 335, as_of='1863-07-02')]))
        self.assertEqual((r['figure_kind'], r['officers_documented'], r['min'], r['max']), ('muskets', False, 330, 335))

    def test_officers_only_is_never_a_total(self):
        r = A.strength_record(row([fig('taken_into_action', 'officers_only', 15, 15, as_of='1863-07-02')]))
        self.assertEqual(r['status'], 'no_eligible_figure')

    def test_a_conflict_set_is_carried_even_when_a_figure_is_ineligible(self):
        t = row([fig('taken_into_action', 'officers_and_men', 267, 267, alt='A', as_of='1863-06-21'), fig('taken_into_action', 'not_stated', 277, 277, alt='B')], status='conflict')
        r = A.strength_record(t)
        self.assertEqual((r['status'], r['default']), ('conflict', None))
        self.assertEqual(len(r['alternatives']), 2)

    def test_a_pre_battle_return_is_used_only_when_no_figure_lies_inside_the_battle(self):
        t = row([fig('present_for_duty', 'officers_and_men', 420, 420, as_of='1863-06-30', ev='p:1'), fig('estimate_in_report', 'officers_and_men', 300, 300, as_of='1863-07-02', ev='p:2')])
        r = A.strength_record(t)
        self.assertEqual((r['basis_key'], r['max']), ('estimate_in_report|officers_and_men', 300))
        self.assertEqual({a['key'] for a in r['alternatives']}, {'present_for_duty|officers_and_men', 'estimate_in_report|officers_and_men'})


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
            self.assertEqual(s['tier'], 'documented')
            parts = s.get('composition') or [{'key': s['basis_key']}]
            lo = hi = 0
            for c in parts:
                r = table[u['id']]['strength']['ranges'][c['key']]
                self.assertEqual(r['tier'], 'documented')
                b = r['by_as_of'].get(s['as_of'])
                a, z = (b['low'], b['high']) if s.get('as_of') and b else (r['low'], r['high'])
                lo, hi = lo + a, hi + z
            self.assertEqual((s['min'], s['max']), (lo, hi))
            self.assertIn('exact', s)
            self.assertIn(s['figure_kind'], ('officers_and_men', 'not_stated', 'muskets'))
            if s['max'] - s['min'] == 0 and s['exact'] is False:
                self.assertIn('hedge', s)
            self.assertNotEqual(table[u['id']]['fields'].get('strength'), 'conflict', u['id'])
        self.assertGreater(n, 100)


if __name__ == '__main__':
    unittest.main()
