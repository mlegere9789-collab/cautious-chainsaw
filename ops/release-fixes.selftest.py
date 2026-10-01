#!/usr/bin/env python3
"""Self-test of the release-verifier fixes of 2026-09-30 (build robustness, gate cache, kill switch, opt-in legal group, sha-list stage guard).

    python ops/release-fixes.selftest.py [--only <substring>]

Everything is built under tmp/<T0_AGENT or release-fix>/selftest/ (git-ignored); release/ and legacy/ are never written.  No network.
Each case was seen RED before the fix (the verifier's reproductions) and is GREEN now:

  1  a malformed ledger line gives a clear BuildError (exit 2), not an IndexError traceback, and writes nothing
  2  a build that fails AFTER it started writing (ledger conflict) leaves no dist, no manifest.json, no gate.json of an earlier good build, only BUILD-FAILED.json
  3  an anchor failure does the same; --keep-failed keeps the partial tree as dist.failed (never as dist)
  4  a gate failure (exit 3) keeps the dist for inspection and adds the BUILD-FAILED.json marker
  5  gate.mjs / build.py --out write their eslint cache beside the output, never into release/.cache
  6  the kill switch is not in the public dist; the build keeps an identical copy in <out>/_ops/; a sw-kill.js inside dist fails the gate
  7  the legal group PG-legal is opt-in: absent from every default train, one flag includes it, the date is the pinned trains.json value, no owner marker ships;
     an invalid pinned date and a stray {{LEGAL_DATE}} are build errors; a leftover owner marker fails the gate (no-owner-notes)
  8  ops/sha-list.mjs stage refuses the dist of a failed build and prints that --html-warn is gone
"""
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, os.path.join(REPO, 'tools', 't0'))
AGENT = os.environ.get('T0_AGENT', 'release-fix')
ROOT = os.path.join(REPO, 'tmp', AGENT, 'selftest')
BUILD = os.path.join(REPO, 'tools', 't0', 'build.py')
CASES = []
ONLY = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None


def case(name):
    def deco(fn):
        CASES.append((name, fn))
        return fn
    return deco


def rel(p):
    return os.path.relpath(p, REPO).replace(os.sep, '/')


def out_dir(name):
    d = os.path.join(ROOT, name)
    shutil.rmtree(d, ignore_errors=True)
    return d


def run(args, expect=0, cmd=None):
    r = subprocess.run(cmd or [sys.executable, BUILD] + args, cwd=REPO, capture_output=True, text=True, encoding='utf-8', errors='replace')
    text = r.stdout + r.stderr
    assert r.returncode == expect, 'exit %d (wanted %d)\n%s' % (r.returncode, expect, text[-1800:])
    assert 'Traceback' not in text, 'a traceback leaked:\n' + text[-1500:]
    return text


def ls(d):
    return sorted(os.listdir(d)) if os.path.isdir(d) else None


def patches_copy(name):
    d = os.path.join(ROOT, name)
    shutil.rmtree(d, ignore_errors=True)
    shutil.copytree(os.path.join(REPO, 'tools', 't0', 'patches'), d)
    return d


def jload(p):
    with open(p, encoding='utf-8') as fh:
        return json.load(fh)


@case('1 a malformed ledger line is a clear error, not a traceback, and nothing is written')
def _():
    led = os.path.join(ROOT, 'ledger-bad.txt')
    os.makedirs(ROOT, exist_ok=True)
    shutil.copyfile(os.path.join(REPO, 'ops', 'used-names.txt'), led)
    with open(led, 'a', encoding='utf-8', newline='\n') as fh:
        fh.write('this line has no tabs at all\n')
    o = out_dir('badledger')
    text = run(['--train', 'R0', '--out', rel(o), '--ledger', rel(led)], 2)
    assert 'is malformed' in text and 'ledger' in text, text[-600:]
    assert not os.path.exists(o), 'the output directory was created: %s' % ls(o)
    return 'exit 2 with "%s"' % text.strip().splitlines()[-1][:110]


@case('2 a ledger conflict after the dist exists: no dist, no manifest.json, no gate.json from an earlier build, BUILD-FAILED.json says so')
def _():
    o = out_dir('conflict')
    run(['--train', 'R0', '--out', rel(o)], 0)
    assert ls(os.path.join(o, 'dist')) and os.path.isfile(os.path.join(o, 'manifest.json')) and os.path.isfile(os.path.join(o, 'gate.json'))
    rid = jload(os.path.join(o, 'dist', 'version.json'))['release']
    led = os.path.join(ROOT, 'ledger-conflict.txt')
    shutil.copyfile(os.path.join(REPO, 'ops', 'used-names.txt'), led)
    with open(led, 'a', encoding='utf-8', newline='\n') as fh:
        fh.write('assets/index-%s.js\t%s\t100\t1\trelease:R0:%s\n' % (rid, '0' * 64, rid))
    text = run(['--train', 'R0', '--out', rel(o), '--ledger', rel(led)], 2)
    assert 'reuses a name' in text, text[-500:]
    assert ls(o) == ['BUILD-FAILED.json'], ls(o)
    m = jload(os.path.join(o, 'BUILD-FAILED.json'))
    assert m['deployable'] is False and m['exit'] == 2 and m['dist'] == 'removed', m
    return 'only BUILD-FAILED.json is left (%s)' % m['dist']


@case('3 an anchor failure removes dist; --keep-failed keeps it only as dist.failed')
def _():
    pd = patches_copy('patches-bad')
    p = os.path.join(pd, 'PG-core.json')
    d = jload(p)
    victim = next(x for x in d['patches'] if x['target'].endswith('.html'))
    victim['find'] += 'ZZZ-not-there'
    json.dump(d, open(p, 'w', encoding='utf-8'))
    o = out_dir('anchor')
    run(['--train', 'R1a', '--out', rel(o), '--patches', rel(pd)], 2)
    assert ls(o) == ['BUILD-FAILED.json', 'anchors.json'], ls(o)
    run(['--train', 'R1a', '--out', rel(o), '--patches', rel(pd), '--keep-failed'], 2)
    assert ls(o) == ['BUILD-FAILED.json', 'anchors.json', 'dist.failed'], ls(o)
    return 'failed patch %s; dist never left in place' % victim['id']


@case('4 a gate failure (exit 3) keeps the dist for inspection and marks it')
def _():
    pd = patches_copy('patches-inject')
    json.dump({'group': 'R0', 'patches': [{'id': 'selftest-inject-undefined', 'target': 'js', 'expect': 1,
                                           'find': 'const Ie=setTimeout(()=>{x("done"),c()},0)',
                                           'repl': 'const Ie=setTimeout(()=>{x("done"),c(),notDefinedAnywhereXyz()},0)'}]},
              open(os.path.join(pd, 'R0+inject.json'), 'w'))
    o = out_dir('gatefail')
    run(['--train', 'R0', '--out', rel(o), '--patches', rel(pd)], 3)
    assert os.path.isdir(os.path.join(o, 'dist')) and os.path.isfile(os.path.join(o, 'gate.json'))
    m = jload(os.path.join(o, 'BUILD-FAILED.json'))
    assert m['exit'] == 3 and m['deployable'] is False, m
    return 'dist kept, BUILD-FAILED.json exit 3, deployable false'


@case('5 the gate cache lives beside --out, never in release/.cache')
def _():
    cache = os.path.join(REPO, 'release', '.cache')
    before = {f: os.stat(os.path.join(cache, f)).st_mtime_ns for f in os.listdir(cache)} if os.path.isdir(cache) else None
    o = out_dir('cache')
    run(['--train', 'R0', '--out', rel(o)], 0)
    beside = os.path.join(o, '.cache')
    assert os.path.isdir(beside) and os.listdir(beside), 'no cache beside the output'
    after = {f: os.stat(os.path.join(cache, f)).st_mtime_ns for f in os.listdir(cache)} if os.path.isdir(cache) else None
    assert before == after, 'release/.cache changed: %s' % (sorted(set(after or {}) ^ set(before or {})) or 'mtimes')
    return '%d cache files beside the output, release/.cache untouched (%s files)' % (len(os.listdir(beside)), len(before or {}))


@case('6 the kill switch is not in dist; a copy sits beside it; a sw-kill.js in dist fails the gate')
def _():
    o = out_dir('kill')
    run(['--train', 'R0', '--out', rel(o)], 0)
    d = os.path.join(o, 'dist')
    found = [os.path.join(b, f) for b, _, fs in os.walk(d) for f in fs if 'sw-kill' in f]
    assert not found, found
    copy = os.path.join(o, '_ops', 'sw-kill.js')
    assert open(copy, 'rb').read() == open(os.path.join(REPO, 'ops', 'sw-kill.js'), 'rb').read(), 'copy differs from ops/sw-kill.js'
    man = jload(os.path.join(o, 'manifest.json'))
    assert man['kill_switch']['public'] is False and not any('sw-kill' in k for k in man['files']), man['kill_switch']
    gate = jload(os.path.join(o, 'gate.json'))
    assert next(c for c in gate['checks'] if c['id'] == 'r0-mechanism')['ok']
    # red: put a copy into the dist and re-run the gate
    shutil.copyfile(copy, os.path.join(d, 'sw-kill.js'))
    r = subprocess.run(['node', os.path.join('tools', 't0', 'gate.mjs'), '--train', 'R0', '--dist', rel(d), '--anchors', rel(os.path.join(o, 'anchors.json')),
                        '--out', rel(os.path.join(o, 'gate-red.json'))], cwd=REPO, capture_output=True, text=True, encoding='utf-8', errors='replace')
    assert r.returncode == 1 and 'inside the public dist' in r.stdout, (r.returncode, r.stdout[-600:])
    return 'not in dist, identical copy in _ops/, gate fails when one is put back'


@case('7 PG-legal is opt-in; date pinned in trains.json; no owner marker ships; bad pin / stray placeholder / leftover marker are errors')
def _():
    import datetime
    from t0build import util, baseline as _b  # noqa: F401
    import build as B
    cfg = jload(os.path.join(REPO, 'tools', 't0', 'trains.json'))
    want = B.legal_date_text(cfg)
    y, m, d = (int(x) for x in cfg['legal']['effective_date'].split('-'))
    assert want == '%s %d, %d' % (datetime.date(y, m, d).strftime('%B'), d, y), want
    for bad in ('2026-13-40', '11/03/2026', None, '2026-1-3'):
        try:
            B.legal_date_text({'legal': {'effective_date': bad}})
        except util.BuildError as e:
            assert 'effective_date' in str(e)
        else:
            raise AssertionError('accepted the pinned date %r' % (bad,))
    try:
        util.expand_placeholders('x {{LEGAL_DATE}}', {'rid': 'a', 'entry': 'b', 'help': 'c', 'bookmark': 'd', 'css': 'e', 'train': 'R1c'})
    except util.BuildError as e:
        assert 'LEGAL_DATE' in str(e)
    else:
        raise AssertionError('{{LEGAL_DATE}} expanded without a legal date')
    # default R1c: no legal group
    a = out_dir('legal-default')
    t = run(['--train', 'R1c', '--out', rel(a)], 0)
    assert 'PG-legal' not in jload(os.path.join(a, 'dist', 'version.json'))['groups'] and 'opt-in with --with' in t, t[-700:]
    assert not any('legal:' in p['id'] for p in jload(os.path.join(a, 'anchors.json'))['patches'])
    # --with PG-legal in a train that predates it says so and adds nothing
    r1 = out_dir('legal-r1a')
    t = run(['--train', 'R1a', '--with', 'PG-legal', '--out', rel(r1), '--no-gate'], 0)
    assert 'is not part of train R1a' in t, t[-500:]
    # one flag includes it
    b = out_dir('legal-on')
    run(['--train', 'R1c', '--with', 'PG-legal', '--out', rel(b)], 0)
    assert 'PG-legal' in jload(os.path.join(b, 'dist', 'version.json'))['groups']
    pv = open(os.path.join(b, 'dist', 'privacy.html'), encoding='utf-8', newline='').read()
    tm = open(os.path.join(b, 'dist', 'terms.html'), encoding='utf-8', newline='').read()
    assert 'Last updated: %s' % want in pv and 'Effective date: %s' % want in tm
    assert 'OWNER' not in (pv + tm).upper().replace('DOWNER', '') and 'September 30, 2026' not in pv + tm and '{{' not in pv + tm
    assert 'motion sensors' in pv
    # unknown --with name
    run(['--train', 'R1c', '--with', 'PG-nope', '--out', rel(out_dir('legal-nope'))], 2)
    # a leftover owner marker fails the gate (check no-owner-notes)
    with open(os.path.join(b, 'dist', 'privacy.html'), 'a', encoding='utf-8', newline='') as fh:
        fh.write('\n<!-- [OWNER TO CONFIRM] leftover -->\n')
    r = subprocess.run(['node', os.path.join('tools', 't0', 'gate.mjs'), '--train', 'R1c', '--dist', rel(os.path.join(b, 'dist')), '--anchors', rel(os.path.join(b, 'anchors.json')),
                        '--out', rel(os.path.join(b, 'gate-red.json'))], cwd=REPO, capture_output=True, text=True, encoding='utf-8', errors='replace')
    assert r.returncode == 1 and 'owner-review marker' in r.stdout, (r.returncode, r.stdout[-500:])
    return 'default has no legal; --with adds it dated "%s"; no marker in the page; leftover marker -> gate exit 1' % want


@case('8 ops/sha-list.mjs stage refuses the dist of a failed build; --html-warn is announced as removed')
def _():
    side = out_dir('stage-src')
    os.makedirs(os.path.join(side, 'dist'))
    open(os.path.join(side, 'dist', 'index.html'), 'w').write('<html></html>')
    json.dump({'deployable': False}, open(os.path.join(side, 'BUILD-FAILED.json'), 'w'))
    stage = os.path.join(ROOT, 'stage-out')
    shutil.rmtree(stage, ignore_errors=True)
    r = subprocess.run(['node', os.path.join('ops', 'sha-list.mjs'), 'stage', rel(os.path.join(side, 'dist')), rel(stage)], cwd=REPO, capture_output=True, text=True)
    assert r.returncode == 2 and 'BUILD-FAILED.json' in r.stderr and not os.path.exists(stage), (r.returncode, r.stderr)
    os.remove(os.path.join(side, 'BUILD-FAILED.json'))
    json.dump({'ok': False, 'checks': []}, open(os.path.join(side, 'gate.json'), 'w'))
    r = subprocess.run(['node', os.path.join('ops', 'sha-list.mjs'), 'stage', rel(os.path.join(side, 'dist')), rel(stage)], cwd=REPO, capture_output=True, text=True)
    assert r.returncode == 2 and 'gate FAILED' in r.stderr, (r.returncode, r.stderr)
    json.dump({'ok': True, 'checks': []}, open(os.path.join(side, 'gate.json'), 'w'))
    r = subprocess.run(['node', os.path.join('ops', 'sha-list.mjs'), 'stage', rel(os.path.join(side, 'dist')), rel(stage)], cwd=REPO, capture_output=True, text=True)
    assert r.returncode == 0, (r.returncode, r.stderr, r.stdout)
    r = subprocess.run(['node', os.path.join('ops', 'sha-list.mjs'), 'verify-url', rel(os.path.join(ROOT, 'none.tsv')), 'http://127.0.0.1:9', '--html-warn'], cwd=REPO, capture_output=True, text=True)
    assert 'html-warn is removed' in r.stderr, r.stderr
    return 'failed builds are not staged; a good one is; --html-warn says it is removed'


def main():
    os.makedirs(ROOT, exist_ok=True)
    failed = 0
    for name, fn in CASES:
        if ONLY and ONLY not in name:
            continue
        try:
            detail = fn()
            print('PASS  %s -- %s' % (name, detail))
        except Exception as e:  # noqa: BLE001
            failed += 1
            print('FAIL  %s -- %s: %s' % (name, type(e).__name__, str(e)[:1500]))
    print('release-fixes selftest: %s' % ('all passed' if not failed else '%d FAILED' % failed))
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
