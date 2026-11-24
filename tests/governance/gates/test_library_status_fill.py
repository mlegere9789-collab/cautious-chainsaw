"""tools/bt/library_status_fill.py must never write an "ingested" row for a source whose local file is absent or whose hash differs, and must be idempotent.

    python3 tests/governance/gates/test_library_status_fill.py
"""
import hashlib
import json
import os
import subprocess
import sys
import tempfile
import unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
SCRIPT = os.path.join(ROOT, 'tools', 'bt', 'library_status_fill.py')
BODY = b'text of the source'
SHA = hashlib.sha256(BODY).hexdigest()


def world(tmp, items, files):
    gov = os.path.join(tmp, 'docs', 'battle-theatre', 'GOVERNANCE')
    os.makedirs(os.path.join(gov, 'library'))
    os.makedirs(os.path.join(gov, 'register'))
    json.dump({'sources': [{'id': 'KEEP', 'title': 'kept', 'status': 'scheduled', 'note': 'x'}]}, open(os.path.join(gov, 'library', 'status.json'), 'w'))
    json.dump({'items': items}, open(os.path.join(gov, 'library', 'acquired.json'), 'w'))
    json.dump([], open(os.path.join(gov, 'register_index.json'), 'w'))
    for rel, data in files.items():
        p = os.path.join(tmp, *rel.split('/'))
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, 'wb').write(data)
    return gov


def entry(i, path, sha=SHA):
    return {'source_id': i, 'sha256': sha, 'acquired': '2026-11-01', 'licence_note': 'public domain', 'ocr_quality': 'raw', 'local_path': path, 'url': 'https://example.org/' + i}


class T(unittest.TestCase):
    def run_fill(self, tmp):
        return subprocess.run([sys.executable, '-I', SCRIPT, '--root', tmp], capture_output=True, text=True, check=True)

    def rows(self, gov):
        return {r['id']: r for r in json.load(open(os.path.join(gov, 'library', 'status.json')))['sources']}

    def test_ingested_only_when_file_present_and_hash_matches(self):
        with tempfile.TemporaryDirectory() as tmp:
            gov = world(tmp, [entry('ZZ-OK', 'tmp/ok.txt'), entry('ZZ-ABSENT', 'tmp/gone.txt'), entry('ZZ-DIFF', 'tmp/diff.txt'), entry('ZZ-NOPATH', None)],
                        {'tmp/ok.txt': BODY, 'tmp/diff.txt': BODY + b' changed'})
            self.run_fill(tmp)
            r = self.rows(gov)
            self.assertEqual(r['ZZ-OK']['status'], 'ingested')
            for k in ('ZZ-ABSENT', 'ZZ-DIFF', 'ZZ-NOPATH'):
                self.assertIn(k, r)
                self.assertNotEqual(r[k]['status'], 'ingested', k)
            self.assertEqual(r['KEEP']['note'], 'x')

    def test_idempotent(self):
        with tempfile.TemporaryDirectory() as tmp:
            gov = world(tmp, [entry('ZZ-OK', 'tmp/ok.txt'), entry('ZZ-ABSENT', 'tmp/gone.txt')], {'tmp/ok.txt': BODY})
            self.run_fill(tmp)
            a = open(os.path.join(gov, 'library', 'status.json')).read(), open(os.path.join(gov, 'register_index.json')).read()
            self.run_fill(tmp)
            b = open(os.path.join(gov, 'library', 'status.json')).read(), open(os.path.join(gov, 'register_index.json')).read()
            self.assertEqual(a, b)


if __name__ == '__main__':
    unittest.main()
