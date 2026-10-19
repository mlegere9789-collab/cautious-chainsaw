#!/usr/bin/env python3
"""Self-test of the MON tooling (group MON, tools/t0/MON-README.md).  No browser, no network, nothing under release/ is touched.

    python tools/t0/mon/selftest.py [--keep]

 1  the committed MON.json is exactly what tools/t0/mon/build-mon.mjs makes from gtmon.js (the source and the patch cannot drift)
 2  an unregistered MON.json inside tools/t0/patches/ would stop every build (why the file lives in patches-next/ until trains.json registers it), and the
    same file loads when trains.json names MON as an optional group (what the wrapper does in memory)
 3  mon_build.py builds R1a, R1b and R1c: every MON anchor matches exactly once, the group is listed, and the entry carries the runtime once
 4  mon_build.py --without-mon builds the same tree as the stock builder (identical tree digest): the wrapper adds nothing of its own
 5  the wrapper refuses to write into release/<train>
Builds go to tmp/mon-fix/selftest/ (git-ignored).  About 3 minutes (builds run without the gates; the gates are run by the owner's release flow).
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
T0 = os.path.dirname(HERE)
REPO = os.path.abspath(os.path.join(T0, '..', '..'))
sys.path.insert(0, T0)
from t0build import patches  # noqa: E402
from t0build.util import BuildError, load_json  # noqa: E402

OUT = os.environ.get('MON_SELFTEST_OUT') or os.path.join(REPO, 'tmp', 'mon-fix', 'selftest')
RESULTS = []


def run(argv, **kw):
    return subprocess.run(argv, cwd=REPO, capture_output=True, text=True, encoding='utf-8', errors='replace', **kw)


CASES = []


def case(name):
    def deco(fn):
        CASES.append((name, fn))
        return fn
    return deco


def mon_json():
    for d in ('patches', 'patches-next'):
        p = os.path.join(T0, d, 'MON.json')
        if os.path.isfile(p):
            return p
    raise AssertionError('MON.json found neither in tools/t0/patches nor in tools/t0/patches-next')


@case('1 MON.json is what build-mon.mjs makes from gtmon.js')
def _():
    r = run(['node', os.path.join(HERE, 'build-mon.mjs'), '--check'])
    assert r.returncode == 0, r.stdout + r.stderr


@case('2 an unregistered MON.json in patches/ stops the loader; registered as an optional group it loads')
def _():
    cfg = load_json(os.path.join(T0, 'trains.json'))
    d = tempfile.mkdtemp()
    try:
        for f in os.listdir(os.path.join(T0, 'patches')):
            if f.endswith('.json'):
                shutil.copy(os.path.join(T0, 'patches', f), d)
        shutil.copy(mon_json(), os.path.join(d, 'MON.json'))
        if 'MON' not in cfg.get('group_order', []) and 'MON' not in cfg.get('optional_groups', []):
            try:
                patches.load_groups(d, cfg)
                raise AssertionError('the loader accepted a group file that trains.json does not name')
            except BuildError as e:
                assert 'MON.json' in str(e) and 'trains.json' in str(e), str(e)
            cfg2 = dict(cfg)
            cfg2['optional_groups'] = list(cfg.get('optional_groups', [])) + ['MON']
            cfg = cfg2
        found = patches.load_groups(d, cfg)
        assert 'MON' in found and len(found['MON']['patches']) == 29, 'MON patches: %s' % (len(found.get('MON', {}).get('patches', [])),)
        tg = sorted(set(p['target'] for p in found['MON']['patches']))
        assert tg == ['css', 'js'], 'MON patches target the entry bundle (js) and the app stylesheet (css, the toolbar rule) only: %s' % (tg,)
        assert [p['id'] for p in found['MON']['patches'] if p['target'] == 'css'] == ['MON:toolbar-narrow'], 'the one css patch is the toolbar rule (nothing in the Walkthrough chunk files or pages)'
        ids = [p['id'] for p in found['MON']['patches']]
        assert all(i.startswith('MON:') for i in ids) and len(set(ids)) == len(ids), ids
    finally:
        shutil.rmtree(d, ignore_errors=True)


@case('3 every MON anchor matches exactly once on R1a, R1b and R1c')
def _():
    for train in ('R1a', 'R1b', 'R1c'):
        out = os.path.join(OUT, 'mon-' + train)
        r = run([sys.executable, os.path.join(HERE, 'mon_build.py'), '--train', train, '--out', os.path.relpath(out, REPO), '--no-gate'])
        assert r.returncode == 0, '%s: %s' % (train, (r.stdout + r.stderr)[-600:])
        a = load_json(os.path.join(out, 'anchors.json'))
        mon = [p for p in a['patches'] if p['group'] == 'MON']
        assert len(mon) == 29 and all(p['ok'] and p['found'] == p['expect'] for p in mon), '%s: %s' % (train, [(p['id'], p['found'], p['expect']) for p in mon])
        assert 'MON' in a['groups'], train
        v = load_json(os.path.join(out, 'dist', 'version.json'))
        entry = open(os.path.join(out, 'dist', 'assets', v['entry']), encoding='utf-8').read()
        assert entry.count('const GTMON=') == 1 and entry.count('function GtMonLegacyKF(') == 1, train


@case('4 --without-mon builds the same tree as the stock builder')
def _():
    for train in ('R1a', 'R1c'):
        a = os.path.join(OUT, 'ctl-' + train)
        b = os.path.join(OUT, 'stock-' + train)
        r = run([sys.executable, os.path.join(HERE, 'mon_build.py'), '--train', train, '--out', os.path.relpath(a, REPO), '--no-gate', '--without-mon'])
        assert r.returncode == 0, (r.stdout + r.stderr)[-500:]
        r = run([sys.executable, os.path.join(T0, 'build.py'), '--train', train, '--out', os.path.relpath(b, REPO), '--no-gate'])
        assert r.returncode == 0, (r.stdout + r.stderr)[-500:]
        ma, mb = load_json(os.path.join(a, 'manifest.json')), load_json(os.path.join(b, 'manifest.json'))
        assert ma['tree_sha256'] == mb['tree_sha256'], '%s: wrapper tree %s != stock tree %s' % (train, ma['tree_sha256'][:12], mb['tree_sha256'][:12])
        assert 'MON' not in ma['groups'], ma['groups']


@case('5 the wrapper refuses to build into release/<train>')
def _():
    r = run([sys.executable, os.path.join(HERE, 'mon_build.py'), '--train', 'R1c', '--out', 'release/R1c', '--no-gate'])
    assert r.returncode != 0 and 'refusing' in (r.stdout + r.stderr), (r.stdout + r.stderr)[-300:]


def main():
    if '--keep' not in sys.argv:
        shutil.rmtree(OUT, ignore_errors=True)
    os.makedirs(OUT, exist_ok=True)
    for name, fn in CASES:
        try:
            fn()
            RESULTS.append((name, True, ''))
            print('PASS  %s' % name, flush=True)
        except AssertionError as e:
            RESULTS.append((name, False, str(e)))
            print('FAIL  %s' % name, flush=True)
            print('      %s' % str(e)[:600], flush=True)
    failed = [n for n, ok, _ in RESULTS if not ok]
    print('%d/%d passed' % (len(RESULTS) - len(failed), len(RESULTS)))
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
