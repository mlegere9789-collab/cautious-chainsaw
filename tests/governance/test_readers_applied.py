"""Checks on tools/bt/conflicts/apply_readers.py: all 229 reader items are accounted for, floors are unchanged, nothing is written as an owner decision.
Run: python3 tests/governance/test_readers_applied.py"""
import json, os, re, subprocess, sys, unittest
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
L = json.load(open(os.path.join(G, 'conflicts', 'readers_applied.json'), encoding='utf-8'))
A = json.load(open(os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'arrivals.json'), encoding='utf-8'))
ROW = {r['id']: r for r in A['rows']}

class Readers(unittest.TestCase):
    def test_all_items_accounted_for(self):
        self.assertEqual(len(L['items']), 229)
        self.assertEqual([i for i in L['items'] if i['status'] in ('pending', 'skipped', 'partial')], [])
    def test_check_mode(self):
        r = subprocess.run([sys.executable, '-I', os.path.join(ROOT, 'tools', 'bt', 'conflicts', 'apply_readers.py'), '--check'], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
    def test_q04_floors_not_moved(self):
        floors = {'cs-1c-hood': '1863-07-02T05:30', 'cs-1c-mclaws': '1863-07-02T08:00', 'us-3c-2d': '1863-07-02T00:00', 'us-5c': '1863-07-02T05:00', 'us-2c': '1863-07-01T22:30',
                  'us-6c': '1863-07-02T14:00', 'cs-anv-hq': '1863-07-01T13:30', 'us-hancock-acting': '1863-07-01T15:00', 'cs-cav-hampton': '1863-07-02T19:32',
                  'cs-cav-flee-chambliss': '1863-07-02T19:32', 'cs-cav-jenkins': '1863-07-02T19:32'}
        for k, v in floors.items():
            self.assertEqual(ROW[k]['gate']['earliest'], v, k)
        for k, r in ROW.items():
            g = r['gate']
            if g.get('earliest') and g.get('default'):
                self.assertGreaterEqual(g['default'], g['earliest'], k)
    def test_defaults_follow_resolutions(self):
        want = {'us-3c-2d': '1863-07-02T00:00', 'us-5c': '1863-07-02T07:00', 'us-6c': '1863-07-02T15:00', 'cs-anv-hq': '1863-07-01T14:00', 'us-hancock-acting': '1863-07-01T16:00', 'cs-1c-hood': '1863-07-02T05:30'}
        for k, v in want.items():
            self.assertEqual(ROW[k]['gate']['default'], v, k)
            self.assertIn('delegated resolution v2', ROW[k]['gate']['default_basis'])
    def test_no_owner_decision_written(self):
        dl = open(os.path.join(G, 'decision_log.md'), encoding='utf-8').read()
        for l in dl.split('\n'):
            if 'reader-applied' in l:
                self.assertNotIn('DECIDED', l)
                self.assertIn('not an owner decision', l)
    def test_overlay_covers_every_timeline_item(self):
        ov = {json.loads(l)['id'] for l in open(os.path.join(G, 'timeline_conflict_updates.jsonl'), encoding='utf-8')}
        for i in L['items']:
            m = re.match(r'^(T\d-\d{3})', i['ref'])
            if i['kind'] == 'timeline_row' and m:
                self.assertIn(m.group(1), ov)

if __name__ == '__main__':
    unittest.main(verbosity=2)
