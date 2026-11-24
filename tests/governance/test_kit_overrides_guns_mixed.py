"""A battery whose guns lines mix a conflict set and plain dated lines must compile (it used to raise KeyError 'conflict').
Run: python3 -I tests/governance/test_kit_overrides_guns_mixed.py"""
import os, sys, unittest
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
import kit_evidence_lib as K
import kit_overrides as KO
import kit_overrides_selftest as T

U = 'us-1c-art-5me'


def conf(i, n, alt, as_of):
    return T.line(i, U, 'guns', T.guns_val(n, printed='%d 12-pounders' % n), as_of=as_of, conflict={'key': U + '|guns|' + as_of, 'alt': alt})


class Mixed(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base = KO.load_base()
        cls.ctx = KO.Ctx(K.groups_doc(), cls.base)

    def compile(self, lines):
        return KO.compile_lines(self.ctx, 'tg', lines, {})

    def alts(self, out):
        return [o for o in out.ops if o.get('path') and o['path'][-1] == 'guns_alternatives']

    def test_conflict_later_than_plain_line_does_not_crash(self):
        lines = [T.line('tg:0001', U, 'guns', T.guns_val(6), as_of='1863-07-01'), conf('tg:0002', 3, 'A', '1863-07-02'), conf('tg:0003', 4, 'B', '1863-07-02')]
        out = self.compile(lines)
        a = self.alts(out)
        self.assertEqual(len(a), 1)
        self.assertEqual(sorted(x['alt'] for x in a[0]['value']), ['A', 'B'])
        self.assertTrue(any(o['path'][-1] == 'guns' for o in out.ops if o.get('path')), 'the earlier plain line still sets the card')
        skipped = {i for u in out.unapplied for i in u['evidence_ids']}
        self.assertTrue({'tg:0002', 'tg:0003'} <= skipped)

    def test_conflict_on_earliest_date_defers_the_card(self):
        lines = [conf('tg:0001', 3, 'A', '1863-07-02'), conf('tg:0002', 4, 'B', '1863-07-02'), T.line('tg:0003', U, 'guns', T.guns_val(4, printed='four 12-pounders'), as_of='1863-07-03')]
        out = self.compile(lines)
        self.assertEqual(len(self.alts(out)), 1)
        self.assertFalse(any(o['path'][-1] == 'guns' for o in out.ops if o.get('path')), 'no value is chosen while the earliest date is contested')
        skipped = {i for u in out.unapplied for i in u['evidence_ids']}
        self.assertEqual(skipped, {'tg:0001', 'tg:0002', 'tg:0003'})

    def test_only_conflict_lines_unchanged(self):
        out = self.compile([conf('tg:0001', 6, 'A', '1863-07-01'), conf('tg:0002', 4, 'B', '1863-07-01')])
        self.assertEqual(len(self.alts(out)), 1)


if __name__ == '__main__':
    unittest.main(verbosity=2)
