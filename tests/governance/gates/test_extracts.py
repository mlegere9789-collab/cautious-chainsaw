"""Tests of the shared extract matcher (tools/bt/gates/lib/extracts.py): folding, the length rule, the numbers of a claim in a span, the sentence span, the stored-text store.

    python3 tests/governance/gates/test_extracts.py
"""
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'tools', 'bt', 'gates', 'lib'))
import extracts as ex  # noqa: E402
import pq_common as pq  # noqa: E402


class Fold(unittest.TestCase):
    def test_case_punctuation_quotes_and_hyphenation_are_folded(self):
        self.assertEqual(ex.fold('The “Quick” brown-\nfox, jumps!'), 'the quick brownfox jumps')
        self.assertEqual(ex.fold("Meade’s  army"), ex.fold("meade's army"))

    def test_digits_are_kept(self):
        self.assertEqual(ex.fold('1,200 men at 4 p. m.'), '1 200 men at 4 p m')


class Quote(unittest.TestCase):
    def test_fourteen_words_pass_fifteen_fail(self):
        self.assertTrue(ex.quote_ok(' '.join(['w'] * 14)))
        self.assertFalse(ex.quote_ok(' '.join(['w'] * 15)))
        self.assertFalse(ex.quote_ok(''))
        self.assertFalse(ex.quote_ok(None))

    def test_the_limit_is_the_recorded_threshold(self):
        self.assertEqual(pq.MAX_QUOTE_WORDS, 14)


class Numbers(unittest.TestCase):
    def test_numbers_of_a_claim(self):
        self.assertEqual(ex.numbers('1,200 men and 3.5 miles on June 30'), ['1200', '3.5', '30'])
        self.assertEqual(ex.numbers('the Twentieth Maine'), [])

    def test_number_in_the_span(self):
        self.assertEqual(ex.numbers_in_span('moved 8 miles', 'moved 8 miles at noon'), (True, []))
        self.assertEqual(ex.numbers_in_span('moved 8 miles', 'moved at noon'), (False, ['8']))

    def test_number_written_in_words_or_as_an_ordinal_counts(self):
        self.assertTrue(ex.numbers_in_span('3 miles', 'about three miles')[0])
        self.assertTrue(ex.numbers_in_span('on July 1', 'on the 1st we marched')[0])
        self.assertTrue(ex.numbers_in_span('held on the 2 and 3', 'which we held on the 2d and 3d')[0])
        self.assertTrue(ex.numbers_in_span('the 46th Pa.', 'Forty-sixth Pennsylvania'.replace('-', ' '))[0])
        self.assertTrue(ex.numbers_in_span('over 125 guns', 'from over one hundred and twenty-five guns')[0])
        self.assertTrue(ex.numbers_in_span('50th', 'the Fiftieth')[0])

    def test_a_number_that_is_not_there_is_missing(self):
        ok, missing = ex.numbers_in_span('3 miles at 10 a. m.', 'a few miles at about ten')
        self.assertFalse(ok)
        self.assertEqual(missing, ['3'])

    def test_a_fraction_needs_a_fraction_word_or_the_same_fraction(self):
        self.assertTrue(ex.numbers_in_span('3/4 mile west', 'three-quarters of a mile west')[0])
        self.assertTrue(ex.numbers_in_span('3/4 mile west', 'the 3/4 mile west')[0])
        self.assertFalse(ex.numbers_in_span('3/4 mile west', 'one mile west')[0])

    def test_the_subject_unit_is_not_counted(self):
        self.assertEqual(ex.strip_subject('24th Michigan marched 3 miles', 'us-1c-1d-meredith-24mi').split()[0], 'Michigan')
        self.assertIn('24th', ex.strip_subject('the 24th hour', 'us-1c-1d-meredith-7mi'))


class Sentence(unittest.TestCase):
    TEXT = 'The first sentence ends here. About 8 a. m., the division moved from Marsh Creek toward Gettysburg, under Maj. Gen. Reynolds. The next sentence follows.'

    def test_abbreviations_do_not_end_a_sentence(self):
        a = self.TEXT.index('the division'), self.TEXT.index('toward')
        s = ex.TextStore._sentence(self.TEXT, a[0], a[1])
        self.assertIn('About 8 a. m.', s)
        self.assertIn('Maj. Gen. Reynolds', s)
        self.assertNotIn('first sentence', s)
        self.assertNotIn('next sentence', s)


class Store(unittest.TestCase):
    def setUp(self):
        self.d = tempfile.mkdtemp(prefix='ext-')
        os.makedirs(os.path.join(self.d, 'docs', 'battle-theatre', 'GOVERNANCE', 'library'))
        os.makedirs(os.path.join(self.d, 'tmp'))
        with open(os.path.join(self.d, 'tmp', 't.txt'), 'w') as f:
            f.write('A passage in which the Twentieth Maine held the left, with 358 men.\n')
        import json
        with open(os.path.join(self.d, 'docs', 'battle-theatre', 'GOVERNANCE', 'library', 'acquired_2.json'), 'w') as f:
            json.dump({'items': [{'id': 'SRC', 'local_path': 'tmp/t.txt'}]}, f)
        self.ts = ex.TextStore(pq.Env(self.d))

    def test_found_and_not_found(self):
        self.assertEqual(self.ts.find('SRC', 'the Twentieth Maine held the left')['status'], 'found')
        self.assertEqual(self.ts.find('SRC', 'the Twentieth Maine held the right')['status'], 'not_found')

    def test_text_that_is_not_on_the_machine_is_no_text_never_found(self):
        self.assertEqual(self.ts.find('OTHER', 'anything at all here')['status'], 'no_text')
        self.assertEqual(self.ts.find(None, 'anything')['status'], 'no_source')

    def test_a_quote_over_the_limit_is_refused_whatever_the_text_says(self):
        q = 'A passage in which the Twentieth Maine held the left, with 358 men.'
        self.assertEqual(self.ts.find('SRC', q + ' and more words follow here ok')['status'], 'bad_quote')

    def test_the_span_of_a_found_extract_is_returned(self):
        r = self.ts.find('SRC', 'the Twentieth Maine held the left')
        self.assertIn('358', r['span_text'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
