"""Red-first tests of the kit evidence rules added after QC 3 (tools/bt/kit_evidence_rules.py, run by kit_evidence_check.py).
Seven classes of defect that sampling kept missing are now checker ERRORS: ASOF_NARROW, ASOF_POINT, TIER_UNIT, VALUE_NAMES, FIGURE_DISAGREE, ENLISTED, HEDGE
(plus WAIVER for a malformed waiver and ANCHOR for an anchor that is not in the source).
Run: python3 -I tests/governance/test_kit_evidence_rules.py"""
import copy, json, os, sys, unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
import kit_evidence_lib as K
import kit_evidence_check as C
import kit_evidence_rules as RU

TMP = os.path.join(ROOT, 'tmp', 'kit-plan', 'selftest')
os.makedirs(TMP, exist_ok=True)

REG = {'name': '57th PA', 'name_printed': '57th', 'level': 'regiment', 'search_terms': ['57th Pennsylvania', 'Fifty-seventh Pennsylvania']}
BRIG = {'name': 'Graham', 'name_printed': 'Graham', 'level': 'brigade', 'search_terms': ["Graham's"]}


def ev(**kw):
    o = {'type': 'evidence', 'id': 't:0001', 'unit_id': 'u', 'field': 'commander', 'basis': 'report_text', 'tier': 'documented', 'as_of': '1863-07-02', 'source_id': 'S', 'quote': 'x',
         'value': {'name': 'John Smith', 'rank': 'Colonel', 'order': 1}}
    o.update(kw)
    return o


def codes(o, entry=REG, anchor=''):
    return sorted({c for c, _m in RU.line_findings(o, entry, anchor)})


def final(o, entry=REG, anchor=''):
    errs, waived = RU.resolve(o, RU.line_findings(o, entry, anchor))
    return sorted({c for c, _m in errs}), sorted(waived)


class AsOf(unittest.TestCase):
    def test_point_date_for_a_stated_span(self):
        o = ev(quote='During the three days the Fifty-seventh Pennsylvania lost 40 men and Colonel Smith was in command.')
        self.assertIn('ASOF_NARROW', codes(o))

    def test_range_is_fine_for_a_span(self):
        o = ev(as_of='1863-07-01/1863-07-03', quote='During the three days the Fifty-seventh Pennsylvania was commanded by Colonel Smith.')
        self.assertNotIn('ASOF_NARROW', codes(o))

    def test_invented_hour(self):
        o = ev(as_of='1863-07-01T21:00', quote='That night the Fifty-seventh Pennsylvania, Colonel Smith, marched, July 1.')
        self.assertIn('ASOF_NARROW', codes(o))

    def test_stated_hour_is_fine(self):
        o = ev(as_of='1863-07-02T16:00', quote='At 4 p. m. on the 2d the Fifty-seventh Pennsylvania, Colonel Smith, advanced.')
        self.assertNotIn('ASOF_NARROW', codes(o))

    def test_as_of_narrower_than_the_period_of_the_value(self):
        v = {'killed': {}, 'wounded': {}, 'missing': {}, 'total': 5, 'period': '1863-07-01/1863-07-04'}
        o = ev(field='casualties', basis='report_statement', value=v, as_of='1863-07-02', quote='The Fifty-seventh Pennsylvania lost 5 on July 2.')
        self.assertIn('ASOF_NARROW', codes(o))

    def test_range_mentioned_in_quote_not_covered(self):
        o = ev(as_of='1863-07-02/1863-07-03', quote='On July 1, 2 and 3 the Fifty-seventh Pennsylvania, Colonel Smith, fought.')
        self.assertIn('ASOF_NARROW', codes(o))

    def test_point_date_not_stated_on_narrative(self):
        o = ev(quote='Colonel Smith commanded the Fifty-seventh Pennsylvania.')
        self.assertIn('ASOF_POINT', codes(o))

    def test_point_date_stated(self):
        o = ev(quote='On the 2d Colonel Smith commanded the Fifty-seventh Pennsylvania.')
        self.assertNotIn('ASOF_POINT', codes(o))

    def test_table_basis_point_date_is_fine(self):
        o = ev(basis='organization_table', quote='57th Pennsylvania, Col. John Smith.')
        self.assertNotIn('ASOF_POINT', codes(o))

    def test_relative_day_does_not_pin(self):
        o = ev(quote='On the first day Colonel Smith commanded the Fifty-seventh Pennsylvania.')
        self.assertIn('ASOF_POINT', codes(o))

    def test_waiver_with_reason(self):
        o = ev(quote='Colonel Smith commanded the Fifty-seventh Pennsylvania.', waive_rules={'ASOF_POINT': 'the report states the date in its heading, which is the one day the report covers'})
        self.assertEqual(final(o)[0], [])
        self.assertEqual(final(o)[1], ['ASOF_POINT'])

    def test_waiver_without_reason_is_an_error(self):
        o = ev(quote='Colonel Smith commanded the Fifty-seventh Pennsylvania.', waive_rules={'ASOF_POINT': ''})
        self.assertIn('WAIVER', final(o)[0])
        o = ev(quote='Colonel Smith commanded the Fifty-seventh Pennsylvania.', waive_rules={'NO_SUCH_RULE': 'a reason long enough to be a reason for waiving'})
        self.assertIn('WAIVER', final(o)[0])


class Names(unittest.TestCase):
    def test_documented_unit_not_named(self):
        o = ev(as_of='1863-07-01/1863-07-03', quote='Colonel Smith was wounded and the command devolved on the major.')
        self.assertIn('TIER_UNIT', codes(o))

    def test_unit_named_spelled_out(self):
        o = ev(as_of='1863-07-01/1863-07-03', quote='The Fifty-seventh Pennsylvania was commanded by Colonel Smith.')
        self.assertNotIn('TIER_UNIT', codes(o))

    def test_unit_named_by_figure(self):
        o = ev(as_of='1863-07-01/1863-07-03', quote='The 57th Pa., Colonel Smith, held the road.')
        self.assertNotIn('TIER_UNIT', codes(o))

    def test_brigade_named_by_commander(self):
        o = ev(as_of='1863-07-01/1863-07-03', quote="Graham's brigade, Colonel Smith commanding.")
        self.assertNotIn('TIER_UNIT', codes(o, BRIG))

    def test_inferred_tier_is_not_held_to_it(self):
        o = ev(tier='inferred', note='the report of the division', as_of='1863-07-01/1863-07-03', quote='Colonel Smith was wounded.')
        self.assertNotIn('TIER_UNIT', codes(o))

    def test_anchor_names_the_unit(self):
        o = ev(as_of='1863-07-01/1863-07-03', quote='Colonel Smith was wounded.')
        self.assertIn('TIER_UNIT', codes(o))
        self.assertNotIn('TIER_UNIT', codes(o, anchor='Report of Colonel John Smith, Fifty-seventh Pennsylvania Infantry.'))

    def test_person_not_in_quote(self):
        o = ev(as_of='1863-07-01/1863-07-03', quote='The Fifty-seventh Pennsylvania lost its colonel; the major commanded.')
        self.assertIn('VALUE_NAMES', codes(o))

    def test_person_in_quote_or_anchor(self):
        o = ev(as_of='1863-07-01/1863-07-03', quote='The Fifty-seventh Pennsylvania lost its colonel; the major commanded.')
        self.assertNotIn('VALUE_NAMES', codes(o, anchor='Report of Col. John Smith.'))
        o = ev(as_of='1863-07-01/1863-07-03', quote='The Fifty-seventh Pennsylvania, Col. John Smith, held.')
        self.assertNotIn('VALUE_NAMES', codes(o))

    def test_person_name_tolerates_ocr(self):
        o = ev(as_of='1863-07-01/1863-07-03', quote='The Fifty-seventh Pennsylvania, Col. John Smilh, held.')
        self.assertNotIn('VALUE_NAMES', codes(o))

    def test_inferred_person_named_in_note(self):
        o = ev(tier='inferred', note='Colonel Smith is named in the heading of the report', as_of='1863-07-01/1863-07-03', quote='The Fifty-seventh Pennsylvania held.')
        self.assertNotIn('VALUE_NAMES', codes(o))


def strength(low, high, men='officers_and_men', basis='taken_into_action', **kw):
    return ev(field='strength', basis=basis, value={'low': low, 'high': high, 'men': men}, as_of='1863-07-01/1863-07-03', **kw)


class Enlisted(unittest.TestCase):
    def test_enlisted_only_without_statement(self):
        o = strength(300, 300, men='enlisted_only', quote='The Fifty-seventh Pennsylvania went in with 300 men.')
        self.assertIn('ENLISTED', codes(o))

    def test_enlisted_only_with_statement(self):
        o = strength(300, 300, men='enlisted_only', quote='The Fifty-seventh Pennsylvania went in with 300 enlisted men, exclusive of officers.')
        self.assertNotIn('ENLISTED', codes(o))

    def test_enlisted_only_with_officers_additional(self):
        o = strength(114, 114, men='enlisted_only', quote='The Fifty-seventh Pennsylvania took in 114 muskets and 12 company officers.')
        self.assertNotIn('ENLISTED', codes(o))

    def test_enlisted_only_table_with_officer_column(self):
        o = strength(300, 300, men='enlisted_only', basis='present_for_duty', quote='57th Pennsylvania')
        o['value'].update({'row': [10, 300, 310], 'row_columns': ['present_officers', 'present_men', 'aggregate_present']})
        self.assertNotIn('ENLISTED', codes(o))

    def test_waived(self):
        o = strength(300, 300, men='enlisted_only', quote='The Fifty-seventh Pennsylvania went in with 300 men.', waive_rules={'ENLISTED': 'the heading of the return reads enlisted men and the row has no officer cell'})
        self.assertEqual(final(o)[0], [])


class Hedge(unittest.TestCase):
    def test_bound_without_hedge(self):
        for phrase in ('less than', 'not more than', 'about', 'over', 'upward of'):
            o = strength(100, 100, basis='estimate_in_report', quote='The Fifty-seventh Pennsylvania had %s 100 men.' % phrase)
            self.assertIn('HEDGE', codes(o), phrase)

    def test_bound_with_hedge(self):
        o = strength(0, 100, basis='estimate_in_report', quote='The Fifty-seventh Pennsylvania had less than 100 men.', hedge={'word': 'less than', 'bound': 'upper'})
        self.assertNotIn('HEDGE', codes(o))

    def test_hedge_word_must_be_in_the_quote(self):
        o = strength(100, 100, basis='estimate_in_report', quote='The Fifty-seventh Pennsylvania had 100 men.', hedge={'word': 'about', 'bound': 'approx'})
        self.assertIn('HEDGE', codes(o))

    def test_hedge_bound_must_fit_the_word(self):
        o = strength(0, 100, basis='estimate_in_report', quote='The Fifty-seventh Pennsylvania had less than 100 men.', hedge={'word': 'less than', 'bound': 'lower'})
        self.assertIn('HEDGE', codes(o))

    def test_over_without_a_number_is_not_a_bound(self):
        o = strength(100, 100, quote='The Fifty-seventh Pennsylvania went over the wall with 100 men.')
        self.assertNotIn('HEDGE', codes(o))


def cas(lid, total, basis='report_statement', as_of='1863-07-01/1863-07-03', period=None, **kw):
    v = {'killed': {}, 'wounded': {}, 'missing': {}, 'total': total, 'period': period or as_of}
    return (lid, ev(id=lid, field='casualties', basis=basis, value=v, as_of=as_of, **kw))


class Disagree(unittest.TestCase):
    def test_different_totals_same_unit_same_period(self):
        out = RU.disagreements([cas('t:0001', 904, basis='casualty_return'), cas('t:0002', 897)], set())
        self.assertIn('t:0002', out)

    def test_same_totals_agree(self):
        self.assertEqual(RU.disagreements([cas('t:0001', 904, basis='casualty_return'), cas('t:0002', 904)], set()), {})

    def test_shared_conflict_key_is_fine(self):
        a, b = cas('t:0001', 904), cas('t:0002', 897)
        a[1]['conflict'] = {'key': 'u|casualties|x', 'alt': 'A'}
        b[1]['conflict'] = {'key': 'u|casualties|x', 'alt': 'B'}
        self.assertEqual(RU.disagreements([a, b], {'t:0001', 't:0002'}), {})

    def test_distinct_basis_declaration(self):
        a, b = cas('t:0001', 904), cas('t:0002', 897, period='1863-07-01/1863-07-02')
        b[1]['distinct_basis'] = 'the statement counts the first two days only; the return counts July 1 to 3'
        self.assertEqual(RU.disagreements([a, b], set()), {})

    def test_false_distinct_basis(self):
        a, b = cas('t:0001', 904), cas('t:0002', 897)
        b[1]['distinct_basis'] = 'a different count of the same period and kinds'
        self.assertIn('t:0002', RU.disagreements([a, b], set()))

    def test_disjoint_periods_do_not_compete(self):
        a, b = cas('t:0001', 40, as_of='1863-07-01', period='1863-07-01'), cas('t:0002', 50, as_of='1863-07-03', period='1863-07-03')
        self.assertEqual(RU.disagreements([a, b], set()), {})

    def test_different_units_do_not_compete(self):
        a, b = cas('t:0001', 40), cas('t:0002', 50)
        b[1]['unit_id'] = 'other'
        self.assertEqual(RU.disagreements([a, b], set()), {})

    def test_strength_overlapping_figures_differ(self):
        a = ('t:0001', strength(300, 300, basis='estimate_in_report', id='t:0001'))
        b = ('t:0002', strength(350, 350, id='t:0002'))
        self.assertIn('t:0002', RU.disagreements([a, b], set()))

    def test_strength_different_dates_do_not_compete(self):
        a = ('t:0001', strength(300, 300, id='t:0001'))
        b = ('t:0002', strength(350, 350, id='t:0002'))
        a[1]['as_of'] = '1863-06-30'
        self.assertEqual(RU.disagreements([a, b], set()), {})


class Anchor(unittest.TestCase):
    def test_anchor_must_be_a_list_of_text_and_offset(self):
        errs = RU.shape_errors(ev(anchor='the heading'))
        self.assertIn('ANCHOR', [c for c, _m in errs])
        self.assertEqual(RU.shape_errors(ev(anchor=[{'text': 'Report of Colonel John Smith, Fifty-seventh Pennsylvania Infantry.', 'offset': 10}])), [])

    def test_hedge_shape(self):
        self.assertIn('HEDGE', [c for c, _m in RU.shape_errors(ev(hedge='about'))])


class Integration(unittest.TestCase):
    """Through check_group, on the worked examples."""

    @classmethod
    def setUpClass(cls):
        with open(os.path.join(K.EV, 'examples.jsonl'), encoding='utf-8') as f:
            cls.ex = {o['id']: o for o in map(json.loads, (l for l in f if l.strip()))}

    def run_lines(self, lines, name='rules'):
        p = os.path.join(TMP, '%s.jsonl' % name)
        with open(p, 'w', encoding='utf-8', newline='\n') as f:
            for o in lines:
                f.write(json.dumps(o, ensure_ascii=False) + '\n')
        return C.check_group('examples', p, any_unit=True)

    def test_hour_invented_on_a_real_line(self):
        o = copy.deepcopy(self.ex['examples:0002'])
        o['as_of'] = '1863-07-01T21:00'
        R = self.run_lines([o])
        self.assertIn('ASOF_NARROW', {e['code'] for e in R.errors})

    def test_unmodified_examples_pass_the_new_rules(self):
        R = self.run_lines(list(self.ex.values()), name='rules-base')
        new = {'ASOF_NARROW', 'ASOF_POINT', 'TIER_UNIT', 'VALUE_NAMES', 'FIGURE_DISAGREE', 'ENLISTED', 'HEDGE', 'WAIVER', 'ANCHOR'}
        self.assertEqual([e for e in R.errors if e['code'] in new], [])


if __name__ == '__main__':
    unittest.main()
