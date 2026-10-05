#!/usr/bin/env python3
"""Self-test of the baseline machinery (docs/baseline-drift.md): the Netlify post-processing model, the lock, the build refusal, the
overlay guard, CRLF-aware patching, and the whole mirror -> reconstruct -> prove -> verify-live pipeline against a LOCAL fake of Netlify
(a tiny HTTP server that serves baseline/dist through the post-processing model).  No network, no browser.

    python tools/t0/tests/baseline_selftest.py [--only <substring>]

Everything is built under tmp/baseline-agent/selftest/ (git-ignored).  The fake server uses T0_PORT_BASE+9 (default 8609).
"""
import http.server
import json
import os
import shutil
import subprocess
import sys
import threading

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(REPO, 'tools', 't0'))
from t0build import baseline as B   # noqa: E402
from t0build import netlify          # noqa: E402
from t0build import patches          # noqa: E402
from t0build.util import copy_tree, eol_adapt, is_pure_crlf, load_json, read_bytes, tree_digest, write_bytes   # noqa: E402

BUILD = os.path.join(REPO, 'tools', 't0', 'build.py')
CLI = os.path.join(REPO, 'tools', 't0', 'baseline.py')
CFG = load_json(os.path.join(REPO, 'tools', 't0', 'trains.json'))
BASE = os.path.join(REPO, CFG['base']['dir'])
LEGACY = os.path.join(REPO, CFG['legacy']['dir'])
ST = os.path.join(REPO, 'tmp', 'baseline-agent', 'selftest')
PORT = int(os.environ.get('T0_PORT_BASE', '8600')) + 9
FAKE_RUM = ('<script async id="netlify-rum-container" src="/.netlify/scripts/rum" data-netlify-rum-site-id="00000000-0000-0000-0000-000000000000" '
            'data-netlify-deploy-branch="main" data-netlify-deploy-context="production" data-netlify-cwv-token="a.eyJkZXBsb3lfaWQiOiAidGVzdGRlcGxveTAxIn0.b"></script>')
results = []


def case(name):
    def deco(fn):
        results.append((name, fn))
        return fn
    return deco


def run(cmd, expect_rc=None, env=None):
    p = subprocess.run(cmd, cwd=REPO, capture_output=True, text=True, encoding='utf-8', env=dict(os.environ, PYTHONIOENCODING='utf-8', **(env or {})))
    out = p.stdout + p.stderr
    if expect_rc is not None and p.returncode != expect_rc:
        raise AssertionError('exit %d (wanted %d)\n%s' % (p.returncode, expect_rc, out[-2500:]))
    return p.returncode, out


def fresh(name):
    d = os.path.join(ST, name)
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d)
    return d


# ------------------------------------------------------------------ the fake Netlify
class FakeNetlify:
    """Serves a source tree the way production does: html with the RUM snippet and pretty-URL link rewriting, both URL forms, forced 404 for
    `/diagnostics.html`, config files not served, a custom 404 page.  `tree` may be edited between requests to simulate live drift."""

    _active = [None]          # the instance that answers right now
    _server = [None]          # ONE listening socket for the whole process (re-binding the port between cases is flaky on Windows: WinError 10013)

    def __init__(self, tree, rum=FAKE_RUM):
        self.tree = dict(tree)
        self.rum = rum
        self.hits = 0
        self.extra = {}             # url path -> bytes served although not in the tree (a new file on live)
        if FakeNetlify._server[0] is None:
            class H(http.server.BaseHTTPRequestHandler):
                protocol_version = 'HTTP/1.0'

                def log_message(self, *a):
                    pass

                def do_GET(self):
                    fake = FakeNetlify._active[0]
                    fake.hits += 1
                    path = self.path.split('?')[0]
                    code, body, ctype = fake.respond(path)
                    self.send_response(code)
                    self.send_header('Content-Type', ctype)
                    self.send_header('Content-Length', str(len(body)))
                    self.send_header('Cache-Control', 'public,max-age=0,must-revalidate')
                    self.end_headers()
                    self.wfile.write(body)

            srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), H)
            threading.Thread(target=srv.serve_forever, daemon=True).start()
            FakeNetlify._server[0] = srv

    def page(self, src):
        return netlify.forward(src, self.rum)

    def respond(self, path):
        t = self.tree
        for k, v in self.extra.items():
            if path == k or (k.endswith('.html') and path == k[:-5]):
                return 200, v, 'application/octet-stream'
        cand = 'index.html' if path == '/' else path.lstrip('/')
        if path == '/diagnostics.html':
            return 404, self.page(t['404.html']), 'text/html; charset=UTF-8'
        if cand in ('netlify.toml', '_headers', '_redirects'):
            return 404, self.page(t['404.html']), 'text/html; charset=UTF-8'
        if cand in t and not cand.endswith('.html') or (cand in t and cand.endswith('.html')):
            return 200, (self.page(t[cand]) if cand.endswith('.html') else t[cand]), 'text/html; charset=UTF-8' if cand.endswith('.html') else 'application/octet-stream'
        if cand + '.html' in t:
            return 200, self.page(t[cand + '.html']), 'text/html; charset=UTF-8'
        return 404, self.page(t['404.html']), 'text/html; charset=UTF-8'

    def __enter__(self):
        FakeNetlify._active[0] = self
        return self

    def __exit__(self, *a):
        FakeNetlify._active[0] = None

    @property
    def origin(self):
        return 'http://127.0.0.1:%d' % PORT


def baseline_tree():
    return B.read_tree(BASE)


# ------------------------------------------------------------------ cases
@case('1 post-processing model: forward/inverse round trip on all 27 baseline pages, exact rewrite form')
def _():
    tree = baseline_tree()
    n = 0
    for p, src in sorted(tree.items()):
        if not p.endswith('.html'):
            continue
        served = netlify.forward(src, FAKE_RUM)
        assert served.count(b'netlify-rum-container') == 1, p
        back, info = netlify.inverse(served, src)
        assert back == src, '%s: inverse(forward(x)) != x' % p
        assert not info['inferred'], p
        n += 1
    assert n == 27, n
    a = netlify.rewrite_tag('<a class="back" href="/index.html">')
    b = netlify.rewrite_tag('<a class="gtbg-historian-pin" href="/historian.html" title="Ask" aria-label="Ask">')
    assert a == "<a class='back' href='/'>", a
    assert b == "<a aria-label='Ask' class='gtbg-historian-pin' href='/historian' title='Ask'>", b
    return '%d pages round-trip' % n


@case('2 model only touches what it has evidence for (script bodies, comments, other hrefs); everything else raises Unmodelled')
def _():
    keep = ['<a href="/">x</a>', '<a href="https://x.org/a.html">x</a>', '<a href="mailto:a@b.c">x</a>', '<a class="c">x</a>']
    for k in keep:
        assert netlify.forward_a_tags(k)[0] == k, k
    assert netlify.forward_a_tags("<script>var s = '<a href=\"/x.html\">';</script><!-- <a href=\"/y.html\"> -->")[1] == 0
    assert netlify.forward_a_tags('<a href="/x.html">')[0] == "<a href='/x'>"
    for bad in ['<a href="/x.html#f">', '<a href="/x.html?q=1">', '<a href="x.html">', '<a href="/x.html" download>', '<a href="/x.html" title="a&amp;b">']:
        try:
            netlify.forward_a_tags(bad)
        except netlify.Unmodelled:
            continue
        raise AssertionError('no Unmodelled for %r' % bad)
    try:
        netlify.forward(b'<html><body></body></body></html>', FAKE_RUM)
    except netlify.Unmodelled:
        return 'unknown forms raise'
    raise AssertionError('two </body> must raise')


@case('3 inverse: a rewritten link with no source counterpart is reported as inferred, never silently guessed')
def _():
    served = netlify.forward(b'<body><a class="x" href="/new-page.html">n</a></body>', FAKE_RUM)
    src, info = netlify.inverse(served, b'<body></body>')
    assert len(info['inferred']) == 1 and src == b'<body><a class="x" href="/new-page.html">n</a></body>', (src, info)
    return 'inferred: %s' % info['inferred'][0]['source_guess']


@case('4 EOL adaptation: LF-authored anchors match a pure-CRLF target, explicit CRLF strings are untouched, counts stay strict')
def _():
    crlf = 'a\r\nb\r\nc\r\n'
    assert is_pure_crlf(crlf) and not is_pure_crlf('a\nb\r\n') and not is_pure_crlf('abc')
    assert eol_adapt(crlf, 'a\nb') == 'a\r\nb' and eol_adapt(crlf, 'a\r\nb') == 'a\r\nb' and eol_adapt('a\nb\n', 'a\nb') == 'a\nb'
    p = {'id': 'x', 'target': 'index.html', 'find': 'a\nb\n', 'repl': 'A\nB\nB2\n', 'expect': 1, '_group': 'T'}
    new, rec = patches.apply_patch(crlf, p, {'rid': 'r', 'entry': 'e', 'help': 'h', 'bookmark': 'b', 'css': 'c', 'train': 'R0'})
    assert rec['ok'] and new == 'A\r\nB\r\nB2\r\nc\r\n', repr(new)
    p2 = dict(p, expect=2)
    new2, rec2 = patches.apply_patch(crlf, p2, {'rid': 'r', 'entry': 'e', 'help': 'h', 'bookmark': 'b', 'css': 'c', 'train': 'R0'})
    assert not rec2['ok'] and new2 == crlf and rec2['found'] == 1, rec2
    return 'strict count kept (1 found, 2 expected -> fail)'


@case('5 lock: the committed baseline matches baseline.lock.json; one changed byte / an extra / a missing file are each reported')
def _():
    assert B.check_lock(BASE, B.LOCK_PATH) == [], B.check_lock(BASE, B.LOCK_PATH)[:3]
    d = fresh('lock')
    copy_tree(BASE, d)
    p = os.path.join(d, 'index.html')
    data = bytearray(read_bytes(p))
    data[500] ^= 1
    write_bytes(p, bytes(data))
    write_bytes(os.path.join(d, 'stray.txt'), b'x')
    os.remove(os.path.join(d, 'robots.txt'))
    probs = B.check_lock(d, B.LOCK_PATH)
    txt = '\n'.join(probs)
    assert 'changed: index.html' in txt and 'extra file): stray.txt' in txt and 'missing from the baseline tree: robots.txt' in txt, txt
    return '%d problems listed' % len(probs)


@case('6 build.py refuses a baseline that differs from the lock and names the file; the override flags behave')
def _():
    d = fresh('refuse')
    bd = os.path.join(d, 'base')
    copy_tree(BASE, bd)
    p = os.path.join(bd, 'index.html')
    write_bytes(p, read_bytes(p) + b' ')
    rc, out = run([sys.executable, BUILD, '--train', 'R0', '--out', 'tmp/baseline-agent/selftest/refuse/out', '--base-dir', 'tmp/baseline-agent/selftest/refuse/base', '--no-gate'], 2)
    assert 'differs from tools/t0/baseline.lock.json' in out and 'changed: index.html' in out, out[-900:]
    assert not os.path.isdir(os.path.join(d, 'out', 'dist')), 'a dist was written for a refused baseline'
    # --legacy skips the lock (alternative input trees of the older self-tests) but keeps the entry md5 pin
    rc, out = run([sys.executable, BUILD, '--train', 'R0', '--out', 'tmp/baseline-agent/selftest/refuse/out2', '--legacy', 'tmp/baseline-agent/selftest/refuse/base', '--no-gate'])
    assert rc == 0 and 'TREE PIN SKIPPED' in out, out[-500:]
    return 'refused the altered baseline naming index.html; --legacy skips the lock as before'


@case('7 a build on the locked baseline keeps every live change: index.html (CRLF) and data/terrain.json in all four trains; R0/R1a keep the hide-bar block, R1b+ drop it')
def _():
    out = {}
    base_idx = B.read_tree(BASE)['index.html']
    terrain = B.read_tree(BASE)['data/terrain.json']
    for t in ('R0', 'R1a', 'R1b', 'R1c'):
        od = 'tmp/baseline-agent/selftest/build-%s' % t
        shutil.rmtree(os.path.join(REPO, od), ignore_errors=True)
        run([sys.executable, BUILD, '--train', t, '--out', od, '--no-gate'], 0)
        idx = read_bytes(os.path.join(REPO, od, 'dist', 'index.html'))
        assert idx.count(b'\n') == idx.count(b'\r\n'), '%s: index.html has a bare LF (mixed line endings)' % t
        assert b"overlay.addEventListener('animationend'" in idx and b'OR real visible text' in idx, '%s: live hunks lost' % t
        assert b'gtbg-monuments-overlay' not in idx, '%s: the monuments overlay that live removed came back' % t
        has_block = b'Hides the legacy desktop-style bottom timeline bar' in idx
        assert has_block == (t in ('R0', 'R1a')), '%s: hide-bar block present=%s' % (t, has_block)
        assert read_bytes(os.path.join(REPO, od, 'dist', 'data', 'terrain.json')) == terrain, '%s: terrain.json is not the live one' % t
        out[t] = len(idx)
    assert base_idx.count(b'\r\n') == base_idx.count(b'\n')
    return 'index.html CRLF bytes %s' % out


@case('8 the overlay may not clobber a file production changed (merge with a patch instead)')
def _():
    d = fresh('overlay')
    ov = os.path.join(d, 'overlay', 'R0')
    os.makedirs(ov)
    write_bytes(os.path.join(ov, 'index.html'), b'<html></html>')
    sys.path.insert(0, os.path.join(REPO, 'tools', 't0'))
    import importlib.util
    spec = importlib.util.spec_from_file_location('t0_build_mod', BUILD)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    dist = os.path.join(d, 'dist')
    copy_tree(BASE, dist)
    try:
        mod.apply_overlay(dist, ['R0'], os.path.join(d, 'overlay'), [], live_changed={'index.html', 'data/terrain.json'})
    except Exception as e:      # BuildError
        assert 'would REPLACE a file that production changed' in str(e), e
    else:
        raise AssertionError('overlay replaced a live-changed file')
    assert read_bytes(os.path.join(dist, 'index.html')) == B.read_tree(BASE)['index.html'], 'the file was modified before the refusal'
    # an ordinary replacement (a file production did not change) is fine
    os.remove(os.path.join(ov, 'index.html'))
    write_bytes(os.path.join(ov, 'robots.txt'), b'User-agent: *' + chr(10).encode())
    mod.apply_overlay(dist, ['R0'], os.path.join(d, 'overlay'), [], live_changed={'index.html'})
    return 'refused index.html, allowed robots.txt'


@case('9 verify-live against a local fake Netlify: IDENTICAL on the baseline itself')
def _():
    tree = baseline_tree()
    with FakeNetlify(tree) as fake:
        state, rep = B.verify_live(BASE, fake.origin, concurrency=4, say=lambda *a: None)
    assert state == 'IDENTICAL', json.dumps(rep['findings'], indent=1)[:1500]
    assert rep['html_pages'] == 27 and rep['live_deploy_id'] == 'testdeploy01', rep
    cfg = [f for f in rep['findings'] if f['state'] == 'config']
    assert [f['path'] for f in cfg] == ['netlify.toml'], cfg
    return '%d files, %d requests, deploy %s' % (rep['files_checked'], rep['requests'], rep['live_deploy_id'])


@case('10 verify-live reports drift per file: a changed non-HTML file, a changed page (source-level diff), a forgotten pretty-URL rewrite, a new page on live')
def _():
    tree = baseline_tree()
    live = dict(tree)
    live['data/terrain.json'] = tree['data/terrain.json'].replace(b'39.821763', b'39.821764')
    live['privacy.html'] = tree['privacy.html'].replace(b'Privacy', b'Privacy Notice', 1)
    live['sitemap.xml'] = tree['sitemap.xml'] + b' '
    with FakeNetlify(live) as fake:
        fake.extra['/brand-new.html'] = b'<html><body><a href="/brand-new.html">x</a></body></html>'
        # a page on live that links to the new page -> discovered by the reference crawl
        fake.tree['search.html'] = tree['search.html'].replace(b'</body>', b'<a href="/brand-new.html">n</a></body>')
        state, rep = B.verify_live(BASE, fake.origin, concurrency=4, say=lambda *a: None)
    assert state == 'DRIFTED', state
    drifted = set(rep['drifted'])
    assert {'data/terrain.json', 'privacy.html', 'sitemap.xml', 'search.html'} <= drifted, drifted
    by = {f['path']: f for f in rep['findings']}
    newp = [k for k in by if k.startswith('brand-new')]
    assert newp and by[newp[0]]['state'] == 'new', list(by)
    txt = '\n'.join(by['privacy.html']['detail'])
    assert 'Privacy Notice' in txt and 'live (post-processing undone)' in txt, txt
    assert any('39.821764' in d or 'sha256' in d for d in by['data/terrain.json']['detail']), by['data/terrain.json']
    return 'drifted: %s' % ', '.join(sorted(drifted))


@case('11 verify-live: a change of Netlify itself (RUM snippet format changed) is reported as a post-processing change, not as content drift')
def _():
    tree = baseline_tree()
    with FakeNetlify(tree) as fake:
        orig = fake.page

        def page(src):
            out = orig(src)
            if src == tree['privacy.html']:      # simulate: Netlify stops appending the newline after the snippet
                out = out.replace(b'></script>' + chr(10).encode() + b'</body>', b'></script></body>', 1)
            return out
        fake.page = page
        state, rep = B.verify_live(BASE, fake.origin, concurrency=4, say=lambda *a: None)
    f = {x['path']: x for x in rep['findings']}
    assert state == 'DRIFTED' and 'privacy.html' in f, (state, list(f))
    assert any('only the post-processing differs' in d for d in f['privacy.html']['detail']), f['privacy.html']['detail']
    return 'classified as post-processing change'


@case('12 verify-live: the forced-404 extension form (/diagnostics.html) is expected; serving it (200) or losing the pretty form is drift')
def _():
    tree = baseline_tree()
    with FakeNetlify(tree) as fake:
        orig = fake.respond
        fake.respond = lambda path: (200, fake.page(tree['diagnostics.html']), 'text/html; charset=UTF-8') if path == '/diagnostics.html' else orig(path)
        state, rep = B.verify_live(BASE, fake.origin, concurrency=4, say=lambda *a: None)
    assert state == 'DRIFTED' and 'diagnostics.html' in rep['drifted'], rep['drifted']
    return 'the dev page became publicly reachable in its .html form: flagged'


@case('13 verify-live exit codes and wording through the CLI: IDENTICAL 0, DRIFTED 1, altered baseline 2 (not a live result)')
def _():
    # CLI needs an origin override and uses the committed baseline
    tree = baseline_tree()
    with FakeNetlify(tree) as fake:
        rc, out = run([sys.executable, CLI, 'verify-live', '--origin', fake.origin, '--no-headers'])
        assert rc == 0 and out.strip().splitlines()[-1].startswith('IDENTICAL: live == baseline/dist'), out[-600:]
        fake.tree['index.html'] = tree['index.html'].replace(b'800);', b'900);')
        rc, out = run([sys.executable, CLI, 'verify-live', '--origin', fake.origin, '--no-headers'])
        assert rc == 1 and 'DRIFTED: 1 file(s)' in out and 'index.html' in out and 'DO NOT DEPLOY' in out, out[-900:]
        assert '-' in out and '+' in out
    return 'IDENTICAL -> 0; DRIFTED -> 1 with the diff and DO NOT DEPLOY'


@case('14 mirror -> reconstruct -> prove against the fake reproduces baseline/dist byte for byte from legacy/dist + what is served')
def _():
    tree = baseline_tree()
    d = fresh('mirror')
    out = os.path.join(d, 'mirror')
    dest = os.path.join(d, 'dist')
    with FakeNetlify(tree) as fake:
        summ = B.mirror(out, fake.origin, [LEGACY], concurrency=4, say=lambda *a: None)
        rep = B.reconstruct(out, [LEGACY], dest, say=lambda *a: None)
    t1, n1, _f = tree_digest(dest)
    t2, n2, _g = tree_digest(BASE)
    assert sorted(rep['from_live']) == ['data/terrain.json', 'index.html'], rep['from_live']
    assert (t1, n1) == (t2, n2), 'reconstructed tree differs from baseline/dist (%s vs %s)' % (t1[:12], t2[:12])
    ok, prep = B.prove(out, dest, say=lambda *a: None)
    assert ok and prep['states'].get('ok') == 118 and prep['states'].get('config') == 1, prep['states']
    assert summ['rum_deploy_id'] == 'testdeploy01'
    tsv = open(os.path.join(out, 'SHA256.tsv'), encoding='utf-8').read()
    assert '/diagnostics.html\thtml-ext-404\t404' in tsv and '/netlify.toml\texpected-404\t404' in tsv, tsv[:400]
    return 'tree %s (%d files), %d requests' % (t1[:12], n1, summ['requests'])


@case('15 legacy/ is untouched (pinned tree digest, git clean) and baseline/dist differs from it only in the two locked files')
def _():
    tree, n, _f = tree_digest(LEGACY)
    assert tree == CFG['legacy']['tree_sha256'] and n == CFG['legacy']['file_count'], (tree, n)
    st = subprocess.run(['git', 'status', '--porcelain', '--', 'legacy'], cwd=REPO, capture_output=True, text=True).stdout.strip()
    assert st == '', 'git status legacy/: ' + st
    lock = load_json(B.LOCK_PATH)
    leg, bas = B.read_tree(LEGACY), B.read_tree(BASE)
    diff = sorted(p for p in set(leg) | set(bas) if leg.get(p) != bas.get(p))
    assert diff == sorted(lock['changed_vs_legacy']) == ['data/terrain.json', 'index.html'], diff
    return 'legacy tree %s; drift %s' % (tree[:12], diff)


@case('16 the JS mirror of the model (ops/sha-list.mjs forwardModel, used by verify-url --tree) gives the same bytes as the Python model on all 27 pages')
def _():
    import hashlib
    d = fresh('jsmodel')
    rum_file = os.path.join(d, 'rum.txt')
    write_bytes(rum_file, FAKE_RUM.encode('utf-8'))
    rc, out = run(['node', os.path.join(HERE, 'forward_model_js.mjs'), BASE, rum_file], 0)
    js = json.loads(out.strip().splitlines()[-1])
    tree = baseline_tree()
    bad = []
    n = 0
    for p, src in sorted(tree.items()):
        if not p.endswith('.html') or '/' in p:
            continue
        n += 1
        want = hashlib.sha256(netlify.forward(src, FAKE_RUM)).hexdigest()
        if js.get(p) != want:
            bad.append('%s: js %s python %s' % (p, js.get(p), want[:12]))
    assert n == 27 and not bad, bad[:3]
    # and ops/sha-list.mjs verify-url --tree treats model-explained html as OK* and an unexplained difference as DIFF (never WARN)
    with FakeNetlify(tree) as fake:
        lst = os.path.join(d, 'base.tsv')
        run(['node', os.path.join(REPO, 'ops', 'sha-list.mjs'), 'list', BASE, '--out', lst], 0)
        rc, out = run(['node', os.path.join(REPO, 'ops', 'sha-list.mjs'), 'verify-url', lst, fake.origin, '--tree', BASE, '--expect-missing', 'netlify.toml,_headers,_redirects,diagnostics.html'], 0)
        assert '0 differ' in out and '26 identical apart from' in out, out[-500:]
        fake.tree['privacy.html'] = tree['privacy.html'].replace(b'Privacy', b'Privacy Notice', 1)
        rc, out = run(['node', os.path.join(REPO, 'ops', 'sha-list.mjs'), 'verify-url', lst, fake.origin, '--tree', BASE, '--html-warn', '--expect-missing', 'netlify.toml,_headers,_redirects,diagnostics.html'], 1)
        assert 'DIFF privacy.html' in out and 'WARN' not in out, out[-600:]
    return '27 pages identical in both implementations; verify-url --tree: explained -> OK*, content drift -> DIFF (exit 1)'


@case('17 compare-zip: a downloaded deploy zip against the locked baseline (identical, folder-prefixed zip, one changed file with a diff, a missing file, an extra _headers, a case-only name, CLI exit codes, the archived 6aa16d61 zip differs in exactly the two live files)')
def _():
    import zipfile
    d = fresh('zip')
    tree = baseline_tree()

    def make(name, files, prefix=''):
        p = os.path.join(d, name)
        with zipfile.ZipFile(p, 'w', zipfile.ZIP_DEFLATED) as z:
            if prefix:
                z.writestr(prefix, b'')
            for k, v in sorted(files.items()):
                z.writestr(prefix + k, v)
        return p
    ident = make('ident.zip', tree)
    st, rep = B.compare_zip(ident)
    assert st == 'IDENTICAL' and rep['files_in_zip'] == rep['files_in_baseline'] == 119, rep
    rc, out = run([sys.executable, CLI, 'compare-zip', ident], 0)
    assert 'IDENTICAL' in out and 'netlify.toml included' in out, out[-400:]
    st, rep = B.compare_zip(make('prefixed.zip', tree, 'dist/'))
    assert st == 'IDENTICAL', rep['differing'][:3]
    changed = dict(tree)
    changed['privacy.html'] = tree['privacy.html'].replace(b'Privacy', b'Privacy Notice', 1)
    changed['netlify.toml'] = tree['netlify.toml'] + b'\n# edited\n'
    del changed['robots.txt']
    changed['_headers'] = b'/*\n  X-Test: 1\n'
    changed['Sitemap.XML'] = changed.pop('sitemap.xml')
    z = make('changed.zip', changed)
    st, rep = B.compare_zip(z)
    states = {f['path']: f['state'] for f in rep['findings']}
    assert st == 'DIFFERENT' and states == {'privacy.html': 'differs', 'netlify.toml': 'differs', 'robots.txt': 'missing', '_headers': 'extra',
                                            'Sitemap.XML': 'extra', 'sitemap.xml': 'missing'}, states
    assert any('differ only by case' in x for f in rep['findings'] if f['path'] == 'sitemap.xml' for x in f['detail'])
    assert any('Privacy Notice' in x for f in rep['findings'] if f['path'] == 'privacy.html' for x in f['detail'])
    rc, out = run([sys.executable, CLI, 'compare-zip', z, '--out', 'tmp/baseline-agent/selftest/zip/report.json'], 1)
    assert 'DIFFERENT: 6 file(s)' in out and os.path.isfile(os.path.join(d, 'report.json')), out[-500:]
    rc, out = run([sys.executable, CLI, 'compare-zip', os.path.join(d, 'nope.zip')], 2)
    assert 'cannot read' in out, out[-300:]
    bad = os.path.join(d, 'bad.zip')
    write_bytes(bad, b'not a zip')
    run([sys.executable, CLI, 'compare-zip', bad], 2)
    run([sys.executable, CLI, 'compare-zip'], 2)
    note = 'identical/prefixed ok; 6 findings classified; exit codes 0/1/2'
    arch = 'C:/Users/mlege/gettysburg-archive/zips/6aa16d6080cc621d7501ebde-d9edb0ae93d265ba.zip'
    if os.path.isfile(arch):
        st, rep = B.compare_zip(arch)
        assert sorted(rep['differing']) == ['data/terrain.json', 'index.html'], rep['differing']
        note += '; archived 6aa16d61 zip differs in %s' % rep['differing']
    else:
        note += '; archived 6aa16d61 zip not on this machine (skipped that check)'
    return note


def main():
    only =sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None
    os.makedirs(ST, exist_ok=True)
    fails = 0
    for name, fn in results:
        if only and only not in name:
            continue
        try:
            note = fn()
            print('PASS %s%s' % (name, (' -- ' + str(note)) if note else ''))
        except Exception as e:     # noqa: BLE001
            fails += 1
            print('FAIL %s\n     %s: %s' % (name, type(e).__name__, str(e)[:1500]))
    print('baseline selftest: %s' % ('all passed' if not fails else '%d FAILED' % fails))
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())
