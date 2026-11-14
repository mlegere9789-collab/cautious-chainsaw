"""Fetch the public-domain period manuals the OA11 evidence pass needs as the basis of plausible-procedural scenes.

    python3 -I tools/bt/life/acquire_texts.py            # fetch what is missing, 1 request per second, then write the pointer file
    python3 -I tools/bt/life/acquire_texts.py --list     # show the plan and what is local

Source: archive.org only (files from https://archive.org/cors/<identifier>/<file>), public domain (pre-1929 US publications),
no login.  Texts go to tmp/life/lib/ (untracked); the tracked pointer file is docs/battle-theatre/life/evidence/acquired_period.json
with the sha256 of every file, so a changed or missing file is detected.  Idempotent: a file whose sha256 matches is not fetched again.
"""
import os, sys, json, time, subprocess, datetime, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from life_lib import *

utf8_stdout()
LIBDIR = os.path.join(TMP, 'lib')
POINTER = os.path.join(EVID, 'acquired_period.json')

# id, archive identifier, title as expected, purpose
WANT = [
    ('REGS-US-1861', 'revisedregulatio1862unit', 'Revised regulations for the Army of the United States, 1861',
     'rations, daily duties and calls, police of camps, guards and pickets: the regulation the Union army lived by'),
    ('REGS-CS-1863', 'regulationsfora00conf', 'Regulations for the army of the Confederate States, 1863',
     'the Confederate counterpart (rations, camp and guard duty)'),
    ('BUTTERFIELD-1863', '101089097.nlm.nih.gov', 'Camp and outpost duty for infantry (Butterfield, 1863)',
     'camp routine, pickets, outposts, cooking and meals in the field; written by the Army of the Potomac chief of staff of July 1863'),
    ('MAHAN-1862', 'treatiseonfieldf00maha', 'A treatise on field fortification (Mahan, 1862 edition)',
     'profiles, tools, labour per work and the order of building of breastworks, epaulements, gun pits, abatis, rifle pits'),
    ('DUANE-1862', 'manualforenginee00duanrich', 'Manual for engineer troops (Duane, 1862)',
     'pontoon and trestle bridges, roads, tools of engineer troops, working parties'),
    ('BILLINGS-1887', 'hard-tack-and-coffee', 'Hard tack and coffee (Billings, 1887)',
     'a veteran\'s general account of rations, cooking, camp and picket life: general practice only, never specific to a unit or day'),
]


def curl(url, out=None, timeout=300):
    cmd = ['curl', '-sS', '-L', '-m', str(timeout), '-A', 'research-fetch/1.0', url]
    if out:
        cmd += ['-o', out]
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode != 0:
        raise RuntimeError('curl %s: %s' % (url, r.stderr.decode('utf-8', 'replace')[:200]))
    return r.stdout


def main():
    os.makedirs(LIBDIR, exist_ok=True)
    ptr = load_json(POINTER) if os.path.exists(POINTER) else {'_doc': '', 'items': [], 'failed': []}
    have = {i['id']: i for i in ptr['items']}
    if '--list' in sys.argv:
        for sid, ident, title, why in WANT:
            it = have.get(sid)
            ok = it and os.path.exists(os.path.join(ROOT, it['local_path'])) and sha256_file(os.path.join(ROOT, it['local_path'])) == it['sha256']
            print('%-18s %-30s %s' % (sid, ident, 'local' if ok else 'not local'))
        return 0
    failed = []
    for sid, ident, title, why in WANT:
        it = have.get(sid)
        if it:
            p = os.path.join(ROOT, it['local_path'])
            if os.path.exists(p) and sha256_file(p) == it['sha256']:
                print('keep   ', sid)
                continue
        try:
            time.sleep(1.1)
            meta = json.loads(curl('https://archive.org/metadata/' + ident, timeout=60).decode('utf-8', 'replace'))
            files = [f for f in meta.get('files', []) if f.get('name', '').endswith('_djvu.txt')]
            if not files:
                raise RuntimeError('no _djvu.txt file in the item')
            fname = files[0]['name']
            md = meta.get('metadata', {})
            dest = os.path.join(LIBDIR, '%s__%s' % (sid, fname.replace('/', '_').replace(' ', '_')))
            time.sleep(1.1)
            curl('https://archive.org/cors/%s/%s' % (ident, urllib.parse.quote(fname)), out=dest)
            size = os.path.getsize(dest)
            if size < 20000:
                raise RuntimeError('file too small (%d bytes)' % size)
            it = {'id': sid, 'archive_identifier': ident, 'title': md.get('title', title), 'creator': md.get('creator'), 'date': md.get('date'),
                  'purpose': why, 'url': 'https://archive.org/cors/%s/%s' % (ident, urllib.parse.quote(fname)), 'details_url': 'https://archive.org/details/' + ident,
                  'bytes': size, 'sha256': sha256_file(dest), 'local_path': os.path.relpath(dest, ROOT).replace(os.sep, '/'),
                  'fetched_at': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
                  'licence_basis': 'public domain (pre-1929 US publication)', 'ocr_quality': 'UNVERIFIED raw djvu text'}
            have[sid] = it
            print('fetched', sid, size)
        except Exception as e:
            print('FAILED ', sid, e)
            failed.append({'id': sid, 'archive_identifier': ident, 'reason': str(e)[:200], 'at': datetime.date.today().isoformat()})
    ptr['_doc'] = ('Period manuals fetched for the OA11 evidence pass (basis of plausible-procedural scenes; never evidence for a unit on a day). '
                   'archive.org only, 1 request per second, no login. Text under tmp/life/lib/ (untracked); rebuild with tools/bt/life/acquire_texts.py.')
    ptr['items'] = [have[k] for k in sorted(have)]
    ptr['failed'] = failed
    dump_json(POINTER, ptr)
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
