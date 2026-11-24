"""Every timeline row that is not verified is covered by an open register entry (Law cl.7: no concealed gap).
A row counts as verified only when the seed itself says status == 'verified'; this test never promotes a row.
Run: python3 -I tests/governance/test_timeline_register_coverage.py"""
import json, os, re, unittest
G = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'docs', 'battle-theatre', 'GOVERNANCE')
J = lambda p: json.load(open(os.path.join(G, p), encoding='utf-8'))

class TimelineRegisterCoverage(unittest.TestCase):
    def test_every_non_verified_row_has_an_open_register_entry(self):
        rows = [json.loads(l) for l in open(os.path.join(G, 'timeline_seed.jsonl'), encoding='utf-8')]
        byid = {e['id']: e for e in J('register_index.json')}
        open_ids = {i for i, e in byid.items() if e['status'] != 'closed'}
        sub = {}
        for s in J('requirements.json')['sub_requirements']:
            m = re.match(r'Timeline row (T\d-\d+)', s['text'])
            if m: sub[m.group(1)] = s
        bad = [r['id'] for r in rows if r['status'] != 'verified' and not (set(sub[r['id']]['register_ids']) & open_ids)]
        self.assertEqual(bad, [], 'timeline rows neither verified nor covered by an open register entry: %s' % bad[:20])

    def test_register_ids_unique_and_linked_entries_exist(self):
        idx = J('register_index.json'); ids = [e['id'] for e in idx]
        self.assertEqual(len(ids), len(set(ids)))
        known = set(ids)
        for s in J('requirements.json')['sub_requirements']:
            for i in s['register_ids']:
                if re.fullmatch(r'EG-\d{4}', i): self.assertIn(i, known, s['id'])

if __name__ == '__main__': unittest.main(verbosity=2)
