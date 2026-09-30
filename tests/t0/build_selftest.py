#!/usr/bin/env python3
"""Self-test of the release build system (chapter 02 WP-T0-03 acceptance):

  1. two builds give identical trees (release id = hash of the patched, pre-rename bytes; no timestamps)
  2. a re-run on the build's own output refuses (sentinel) and a modified input refuses (md5 pin)
  3. one changed character in any anchor fails the build with that patch id and writes no dist
  4. an injected undefined identifier fails the gate (exit 3)
  5. group order does not matter (fixed order vs chapter-02 order give identical shipped files)
  6. plugin interface: PG page group (placeholders, delete), overlay, reserved-target rejection, config hook whitelist; data/* edits fail the gate
  7. used-names ledger: a reused name (different bytes) and a collision with an archived name both fail; an idempotent rebuild passes
  8. legacy/ is still byte-identical to the pinned baseline

    python tests/t0/build_selftest.py [--only <substring>]
Everything is built under tmp/t0-core/selftest/ (git-ignored).
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, os.path.join(REPO, 'tools', 't0'))
from t0build.util import copy_tree, load_json, tree_digest, walk_files  # noqa: E402

BUILD = os.path.join(REPO, 'tools', 't0', 'build.py')
ST = os.path.join(REPO, 'tmp', 't0-core', 'selftest')
CFG = load_json(os.path.join(REPO, 'tools', 't0', 'trains.json'))
results = []


def run(args, expect_rc=None):
    env = dict(os.environ, PYTHONIOENCODING='utf-8')
    p = subprocess.run([sys.executable, BUILD] + args, cwd=REPO, capture_output=True, text=True, encoding='utf-8', env=env)
    out = p.stdout + p.stderr
    if expect_rc is not None and p.returncode != expect_rc:
        raise AssertionError('exit code %d (wanted %d)\n%s' % (p.returncode, expect_rc, out[-2500:]))
    return p.returncode, out


def out_dir(name):
    d = os.path.join(ST, name)
    shutil.rmtree(d, ignore_errors=True)
    return d


def rel_path(p):
    return os.path.relpath(p, REPO).replace(os.sep, '/')


def patches_copy(name):
    d = out_dir(name + '-patches')
    os.makedirs(d)
    src = os.path.join(REPO, 'tools', 't0', 'patches')
    for f in os.listdir(src):
        if f.endswith('.json'):
            shutil.copyfile(os.path.join(src, f), os.path.join(d, f))
    return d


def same_files(a, b, skip=()):
    ta, tb = tree_digest(a)[2], tree_digest(b)[2]
    diff = sorted(k for k in set(ta) | set(tb) if ta.get(k) != tb.get(k) and k not in skip)
    return diff


def case(name):
    def deco(fn):
        results.append((name, fn))
        return fn
    return deco


@case('1 determinism: two R1c builds are byte-identical')
def _():
    a, b = out_dir('det-a'), out_dir('det-b')
    run(['--train', 'R1c', '--out', rel_path(a), '--no-gate'], 0)
    run(['--train', 'R1c', '--out', rel_path(b), '--no-gate'], 0)
    ma, mb = load_json(os.path.join(a, 'manifest.json')), load_json(os.path.join(b, 'manifest.json'))
    assert ma['tree_sha256'] == mb['tree_sha256'], 'tree digests differ'
    assert not same_files(os.path.join(a, 'dist'), os.path.join(b, 'dist')), 'files differ'
    return 'tree %s (%d files)' % (ma['tree_sha256'][:16], ma['file_count'])


@case('2a refuses to patch its own output (sentinel)')
def _():
    o = out_dir('refuse-out')
    run(['--train', 'R0', '--out', rel_path(o), '--no-gate'], 0)
    rc, text = run(['--train', 'R0', '--out', rel_path(out_dir('refuse-2')), '--legacy', rel_path(os.path.join(o, 'dist')), '--no-gate'], 2)
    assert 'sentinel' in text, text[-800:]
    return 'refused: ' + [ln for ln in text.splitlines() if 'sentinel' in ln][0][:110]


@case('2b refuses a modified input (entry md5 pin)')
def _():
    m = out_dir('legacy-mut')
    copy_tree(os.path.join(REPO, CFG['legacy']['dir']), m)
    p = os.path.join(m, CFG['legacy']['entry'])
    data = bytearray(open(p, 'rb').read())
    data[1000] ^= 0x01
    open(p, 'wb').write(bytes(data))
    rc, text = run(['--train', 'R0', '--out', rel_path(out_dir('mut-out')), '--legacy', rel_path(m), '--no-gate'], 2)
    assert 'md5' in text and 'pinned' in text, text[-800:]
    return 'refused: ' + [ln for ln in text.splitlines() if 'md5' in ln][0][:110]


@case('3 one changed character in an anchor fails with that patch id and writes no dist')
def _():
    pd = patches_copy('mut')
    path = os.path.join(pd, 'B.json')
    data = json.load(open(path, encoding='utf-8'))
    target = next(p for p in data['patches'] if p['id'] == 'bug:D1-hud-date')
    assert 'July' in target['find']
    target['find'] = target['find'].replace('July', 'Jul1y', 1)
    json.dump(data, open(path, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    o = out_dir('mut-anchor')
    rc, text = run(['--train', 'R1c', '--out', rel_path(o), '--patches', rel_path(pd), '--no-gate'], 2)
    assert 'bug:D1-hud-date' in text and 'expected 1, found 0' in text, text[-1200:]
    assert not os.path.isdir(os.path.join(o, 'dist')), 'a dist was written despite the failed anchor'
    rep = load_json(os.path.join(o, 'anchors.json'))
    assert rep['status'] == 'failed' and rep['summary']['failed'] == 1, rep['summary']
    return 'failed with ' + [ln for ln in text.splitlines() if 'ANCHOR FAIL' in ln][0].strip()[:100]


@case('4 an injected undefined identifier fails the gate')
def _():
    pd = patches_copy('inject')
    json.dump({'group': 'R0', 'patches': [{'id': 'selftest-inject-undefined', 'target': 'js', 'expect': 1,
                                           'find': 'const Ie=setTimeout(()=>{x("done"),c()},0)',
                                           'repl': 'const Ie=setTimeout(()=>{x("done"),c(),notDefinedAnywhereXyz()},0)'}]},
              open(os.path.join(pd, 'R0+inject.json'), 'w'))
    o = out_dir('inject-out')
    rc, text = run(['--train', 'R0', '--out', rel_path(o), '--patches', rel_path(pd)], 3)
    gate = load_json(os.path.join(o, 'gate.json'))
    chk = next(c for c in gate['checks'] if c['id'] == 'unresolved-globals')
    assert not gate['ok'] and 'notDefinedAnywhereXyz' in chk['roles']['entry']['newUnresolved'], chk
    return 'gate reported new unresolved %s' % chk['roles']['entry']['newUnresolved']


@case('5 group order does not matter (fixed vs chapter-02 order)')
def _():
    a, b = out_dir('ord-a'), out_dir('ord-b')
    run(['--train', 'R1c', '--out', rel_path(a), '--no-gate'], 0)
    run(['--train', 'R1c', '--out', rel_path(b), '--order', 'runbook', '--no-gate'], 0)
    diff = same_files(os.path.join(a, 'dist'), os.path.join(b, 'dist'), skip=('version.json', '_ops/asset-manifest.json'))
    assert not diff, diff
    return 'shipped files identical (only version.json/asset-manifest.json record the group order)'


@case('6 plugin interface: PG group + placeholders + delete + overlay + config hook')
def _():
    pd = patches_copy('plug')
    json.dump({'group': 'PG-selftest', 'delete': ['diagnostics.html', 'unit-rendering-reference.html'], 'patches': [
        {'id': 'pg-selftest-title', 'target': 'dashboard.html', 'find': '<title>', 'repl': '<!-- rid {{RID}} train {{TRAIN}} css {{CSS}} --><title>', 'expect': 1}]},
        open(os.path.join(pd, 'PG-selftest.json'), 'w'))
    ov = out_dir('plug-overlay')
    os.makedirs(os.path.join(ov, 'common', 'assets'))
    open(os.path.join(ov, 'common', 'assets', 'selftest-overlay-1.txt'), 'w').write('overlay asset\n')
    open(os.path.join(ov, 'common', 'robots.txt'), 'w').write('User-agent: *\nDisallow: /selftest\n')
    hook = os.path.join(ST, 'hook_ok.mjs')
    os.makedirs(ST, exist_ok=True)
    open(hook, 'w').write("import fs from 'node:fs'; import path from 'node:path';\nconst [dist, json] = process.argv.slice(2);\nconst r = JSON.parse(json);\n"
                          "fs.writeFileSync(path.join(dist, '_headers'), `/version.json\\n  Cache-Control: no-cache\\n# ${r.rid}\\n`);\n")
    o = out_dir('plug-out')
    run(['--train', 'R1c', '--out', rel_path(o), '--patches', rel_path(pd), '--overlay', rel_path(ov), '--config-hook', rel_path(hook)], 0)
    d = os.path.join(o, 'dist')
    rid = load_json(os.path.join(d, 'version.json'))['release']
    css = load_json(os.path.join(d, 'version.json'))['css']
    dash = open(os.path.join(d, 'dashboard.html'), encoding='utf-8').read()
    assert '<!-- rid %s train R1c css %s -->' % (rid, css) in dash, 'placeholders not expanded'
    assert not os.path.exists(os.path.join(d, 'diagnostics.html')) and not os.path.exists(os.path.join(d, 'unit-rendering-reference.html')), 'delete failed'
    assert open(os.path.join(d, 'assets', 'selftest-overlay-1.txt')).read() == 'overlay asset\n'
    assert 'Disallow: /selftest' in open(os.path.join(d, 'robots.txt')).read(), 'overlay did not replace robots.txt'
    assert rid in open(os.path.join(d, '_headers')).read(), 'config hook output missing'
    man = load_json(os.path.join(o, 'manifest.json'))
    assert any(x['path'] == 'robots.txt' and x['replaced'] for x in man['overlay']), man['overlay']
    # negatives
    bad = patches_copy('plug-bad')
    json.dump({'group': 'PG-badtarget', 'patches': [{'id': 'x', 'target': 'sw.js', 'find': 'a', 'repl': 'b', 'expect': 1}]}, open(os.path.join(bad, 'PG-badtarget.json'), 'w'))
    rc, text = run(['--train', 'R1a', '--out', rel_path(out_dir('plug-bad-out')), '--patches', rel_path(bad), '--no-gate'], 2)
    assert 'generated by the build' in text, text[-600:]
    json.dump({'group': 'PG-badbundle', 'patches': [{'id': 'y', 'target': 'js', 'find': 'a', 'repl': 'b', 'expect': 1}]}, open(os.path.join(bad, 'PG-badbundle.json'), 'w'))
    os.remove(os.path.join(bad, 'PG-badtarget.json'))
    rc, text = run(['--train', 'R1a', '--out', rel_path(out_dir('plug-bad-out2')), '--patches', rel_path(bad), '--no-gate'], 2)
    assert 'cannot patch bundle files' in text, text[-600:]
    ov2 = out_dir('plug-overlay2')
    os.makedirs(ov2 + '/common')
    open(ov2 + '/common/sw.js', 'w').write('//x')
    rc, text = run(['--train', 'R1a', '--out', rel_path(out_dir('plug-bad-out3')), '--overlay', rel_path(ov2), '--no-gate'], 2)
    assert 'generated by the build' in text, text[-600:]
    hook_bad = os.path.join(ST, 'hook_bad.mjs')
    open(hook_bad, 'w').write("import fs from 'node:fs'; import path from 'node:path';\nfs.appendFileSync(path.join(process.argv[2], 'index.html'), '<!-- tampered -->');\n")
    rc, text = run(['--train', 'R1c', '--out', rel_path(out_dir('plug-bad-out4')), '--config-hook', rel_path(hook_bad), '--no-gate'], 2)
    assert 'outside its allowed set' in text and 'index.html' in text, text[-600:]
    return 'placeholders, delete, overlay (new+replace), hook whitelist OK; 4 negative cases rejected'


@case('6b gate: editing a data/* file (T0 rule 5) fails the gate; adding one is only reported')
def _():
    pd = patches_copy('data')
    src = open(os.path.join(REPO, CFG['legacy']['dir'], 'data', 'chronology_day1.json'), encoding='utf-8').read()
    head = src[:20]
    json.dump({'group': 'PG-selftestdata', 'patches': [{'id': 'pg-selftest-data-edit', 'target': 'data/chronology_day1.json', 'find': head,
                                                       'repl': head + ' ', 'expect': src.count(head)}]},
              open(os.path.join(pd, 'PG-selftestdata.json'), 'w'))
    o = out_dir('data-out')
    run(['--train', 'R1a', '--out', rel_path(o), '--patches', rel_path(pd)], 3)
    chk = next(c for c in load_json(os.path.join(o, 'gate.json'))['checks'] if c['id'] == 'data-untouched')
    assert not chk['ok'] and chk['modified'] == ['data/chronology_day1.json'], chk
    ov = out_dir('data-overlay')
    os.makedirs(os.path.join(ov, 'common', 'data'))
    open(os.path.join(ov, 'common', 'data', 'moments-selftest.json'), 'w').write('{}')
    o2 = out_dir('data-out2')
    run(['--train', 'R1a', '--out', rel_path(o2), '--overlay', rel_path(ov)], 0)
    chk2 = next(c for c in load_json(os.path.join(o2, 'gate.json'))['checks'] if c['id'] == 'data-untouched')
    assert chk2['ok'] and chk2['added'] == ['data/moments-selftest.json'], chk2
    return 'edit -> gate exit 3 (modified: %s); added file listed, gate green' % chk['modified']


@case('7 ledger: reused name / archived collision fail, idempotent rebuild passes')
def _():
    o = out_dir('ledger-base')
    run(['--train', 'R0', '--out', rel_path(o), '--no-gate'], 0)
    man = load_json(os.path.join(o, 'manifest.json'))
    entry = 'assets/' + man['release']['entry']
    sha = man['files'][entry]['sha256']
    real = open(os.path.join(REPO, 'ops', 'used-names.txt'), encoding='utf-8').read()
    led = os.path.join(ST, 'ledger_a.txt')
    open(led, 'w', encoding='utf-8').write(real + '%s\t%s\t1\t1\tzip:fake.zip\n' % (entry, '0' * 64))
    rc, text = run(['--train', 'R0', '--out', rel_path(out_dir('ledger-a')), '--ledger', rel_path(led), '--no-gate'], 2)
    assert 'reuses a name' in text, text[-600:]
    led2 = os.path.join(ST, 'ledger_b.txt')
    open(led2, 'w', encoding='utf-8').write(real + '%s\t%s\t1\t1\tzip:fake.zip\n' % ('assets/' + os.path.basename(entry).upper(), sha))
    rc, text = run(['--train', 'R0', '--out', rel_path(out_dir('ledger-b')), '--ledger', rel_path(led2), '--no-gate'], 2)
    assert 'collides with an archived' in text, text[-600:]
    led3 = os.path.join(ST, 'ledger_c.txt')
    open(led3, 'w', encoding='utf-8').write(real + '%s\t%s\t1\t1\trelease:R0:%s\n' % (entry, sha, man['release']['rid']))
    run(['--train', 'R0', '--out', rel_path(out_dir('ledger-c')), '--ledger', rel_path(led3), '--no-gate'], 0)
    return 'reuse and (case-insensitive) collision rejected; recorded same-bytes name accepted'


@case('8 legacy/ is untouched (pinned tree digest, git clean)')
def _():
    tree, n, _files = tree_digest(os.path.join(REPO, CFG['legacy']['dir']))
    assert tree == CFG['legacy']['tree_sha256'] and n == CFG['legacy']['file_count'], (tree, n)
    st = subprocess.run(['git', 'status', '--porcelain', '--', 'legacy'], cwd=REPO, capture_output=True, text=True).stdout.strip()
    assert st == '', st
    return 'tree %s (%d files), git status clean' % (tree[:16], n)


def main():
    for _st in (sys.stdout, sys.stderr):      # patch ids / paths may hold non-ASCII text; never die on a cp1252 console
        try:
            _st.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, ValueError):
            pass
    only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None
    os.makedirs(ST, exist_ok=True)
    failed = 0
    for name, fn in results:
        if only and only not in name:
            continue
        t0 = time.time()
        try:
            msg = fn()
            print('PASS  %-88s %5.1fs  %s' % (name, time.time() - t0, msg or ''))
        except Exception as e:  # noqa: BLE001
            failed += 1
            print('FAIL  %-88s %5.1fs\n      %s' % (name, time.time() - t0, str(e).replace('\n', '\n      ')[:1800]))
    print('build selftest: %s' % ('%d FAILED' % failed if failed else 'all passed'))
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
