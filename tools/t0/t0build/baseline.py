"""The build baseline: what production serves, reconstructed at SOURCE level (baseline/dist), pinned, mirrored and checked against live.

Background (docs/baseline-drift.md): legacy/dist is the byte-exact copy of the downloaded Netlify deploy 6aa16d61, but production moved on
(a later deploy changed index.html and data/terrain.json).  This module

* mirrors the live site with curl (`mirror`): every path of the baseline tree, both URL forms of every page, plus everything the served
  pages/scripts/manifest/sitemap reference that the tree does not contain;
* reconstructs the uploaded SOURCE files from what is served (`reconstruct`): non-HTML files are served byte-for-byte, HTML files have
  Netlify's post-processing undone (t0build/netlify.py);
* proves the reconstruction (`prove`): the post-processing model applied to baseline/dist gives back, byte for byte, every response;
* pins baseline/dist in tools/t0/baseline.lock.json (`lock`) - build.py refuses to build on a baseline that differs from the lock;
* checks live against baseline/dist at any time (`verify-live`), post-processing aware: IDENTICAL or DRIFTED with a per-file diff.

Everything here is read-only against the network and against legacy/.  Files are written only under baseline/, tools/t0/baseline.lock.json
and tmp/.
"""
import concurrent.futures as cf
import difflib
import json
import os
import re
import shutil
import subprocess
import tempfile
import time
import urllib.parse

from . import netlify
from .util import BuildError, REPO, T0, load_json, read_bytes, sha256_bytes, tree_digest, walk_files, write_bytes

DEFAULT_ORIGIN = 'https://gettysburginteractivemap.com'
UA = 'gbg-t0-baseline/1 (read-only release verification; curl)'
# Files that Netlify processes instead of serving (netlify.toml, _headers, _redirects): a byte comparison with live is impossible.
CONFIG_FILES = ('netlify.toml', '_headers', '_redirects')
REF_DIRS = ('assets', 'data', 'icons', 'screenshots')
LOCK_PATH = os.path.join(T0, 'baseline.lock.json')
VOLATILE_HEADERS = {'date', 'age', 'x-nf-request-id', 'cache-status', 'etag', 'server', 'vary', 'accept-ranges', 'content-length', 'transfer-encoding',
                    'connection', 'keep-alive'}
KEY_URLS = ['/', '/index.html', '/privacy', '/privacy.html', '/embed.html', '/sw.js', '/manifest.json', '/sitemap.xml', '/robots.txt',
            '/assets/index-Cg8FAMXN.js', '/assets/index-B4G7Z_2G.css', '/data/terrain.json', '/icons/icon-192.png', '/favicon.ico',
            '/diagnostics.html', '/site-nav.js']


def cfg():
    return load_json(os.path.join(T0, 'trains.json'))


def base_dir(c=None):
    c = c or cfg()
    return os.path.join(REPO, c['base']['dir'])


def rel_to_repo(p):
    return os.path.relpath(p, REPO).replace(os.sep, '/')


def is_html(p):
    return p.endswith('.html')


def pretty_of(path):
    """URL path of the pretty form of an html file path ('index.html' -> '/', 'x.html' -> '/x')."""
    return '/' if path == 'index.html' else '/' + path[:-len('.html')]


# ------------------------------------------------------------------------------------------------------------------ lock
def read_tree(root):
    """{relpath: bytes} of every file under root."""
    return {rel: read_bytes(os.path.join(root, rel)) for rel in walk_files(root)}


def make_lock(root, origin, meta):
    tree, n, files = tree_digest(root)
    return {'schema': 1, 'what': 'per-file sha256 pins of the build baseline (baseline/dist); build.py refuses to build when the tree differs',
            'origin': origin, 'tree_sha256': tree, 'file_count': n,
            'total_bytes': sum(v[0] for v in files.values()),
            'files': {k: {'bytes': v[0], 'sha256': v[1]} for k, v in sorted(files.items())}, **meta}


def check_lock(root, lock_path=LOCK_PATH):
    """Compare a baseline tree with its lock.  Returns a list of problem strings (empty = identical)."""
    if not os.path.isfile(lock_path):
        return ['baseline lock %s does not exist (run: python tools/t0/baseline.py lock)' % rel_to_repo(lock_path)]
    if not os.path.isdir(root):
        return ['baseline tree %s does not exist' % rel_to_repo(root)]
    lock = load_json(lock_path)
    _, _, files = tree_digest(root)
    want = lock['files']
    problems = []
    for p in sorted(set(want) | set(files)):
        if p not in files:
            problems.append('missing from the baseline tree: %s' % p)
        elif p not in want:
            problems.append('not in the lock (extra file): %s' % p)
        elif files[p][1] != want[p]['sha256']:
            problems.append('changed: %s (sha256 %s, locked %s)' % (p, files[p][1][:12], want[p]['sha256'][:12]))
    if not problems:
        tree, n, _ = tree_digest(root)
        if tree != lock['tree_sha256'] or n != lock['file_count']:
            problems.append('tree digest %s (%d files) != locked %s (%d files)' % (tree, n, lock['tree_sha256'], lock['file_count']))
    return problems


# ------------------------------------------------------------------------------------------------------------------ fetching
class Resp:
    __slots__ = ('url', 'status', 'headers', 'body', 'error')

    def __init__(self, url, status=0, headers=None, body=b'', error=None):
        self.url, self.status, self.headers, self.body, self.error = url, status, headers or {}, body, error

    def meta(self):
        return {'status': self.status, 'bytes': len(self.body), 'sha256': sha256_bytes(self.body), 'headers': self.headers,
                **({'error': self.error} if self.error else {})}


def _parse_header_dump(text):
    blocks = [b for b in re.split(r'\r?\n\r?\n', text.strip()) if b.strip()]
    if not blocks:
        return 0, {}
    lines = blocks[-1].splitlines()
    m = re.match(r'HTTP/\S+\s+(\d+)', lines[0])
    status = int(m.group(1)) if m else 0
    hdr = {}
    for ln in lines[1:]:
        if ':' in ln:
            k, v = ln.split(':', 1)
            k = k.strip().lower()
            hdr[k] = (hdr[k] + ', ' if k in hdr else '') + v.strip()
    return status, hdr


class Fetcher:
    """curl with identity encoding and a cache-busting query string (Netlify ignores the query for static files).  Never follows redirects
    (a 3xx is a finding, not something to hide)."""

    def __init__(self, origin, tmp_dir, timeout=40, retries=2, delay=0.0):
        self.origin, self.tmp, self.timeout, self.retries, self.delay = origin.rstrip('/'), tmp_dir, timeout, retries, delay
        os.makedirs(tmp_dir, exist_ok=True)
        self._n = 0
        self.count = 0

    def get(self, path):
        assert path.startswith('/')
        self._n += 1
        self.count += 1
        nonce = '%d%03d' % (int(time.time() * 1000), self._n % 1000)
        q = ('&' if '?' in path else '?') + 't0cb=' + nonce
        fd, hp = tempfile.mkstemp(dir=self.tmp, suffix='.hdr')
        os.close(fd)
        fd, bp = tempfile.mkstemp(dir=self.tmp, suffix='.body')
        os.close(fd)
        try:
            cmd = ['curl', '-sS', '--http1.1', '--max-time', str(self.timeout), '--retry', str(self.retries), '--retry-delay', '1',
                   '-A', UA, '-H', 'Accept-Encoding: identity', '-H', 'Cache-Control: no-cache', '-H', 'Pragma: no-cache',
                   '-D', hp, '-o', bp, '-w', '%{http_code}', self.origin + path + q]
            if self.delay:
                time.sleep(self.delay)
            r = subprocess.run(cmd, capture_output=True, text=True)
            if r.returncode != 0:
                return Resp(path, 0, {}, b'', 'curl exit %d: %s' % (r.returncode, r.stderr.strip()[:200]))
            status, hdr = _parse_header_dump(open(hp, 'r', encoding='latin-1').read())
            body = read_bytes(bp)
            if status == 0:
                status = int(r.stdout.strip() or 0)
            return Resp(path, status, hdr, body)
        finally:
            for f in (hp, bp):
                try:
                    os.remove(f)
                except OSError:
                    pass


def fetch_many(fetcher, paths, concurrency=4):
    out = {}
    with cf.ThreadPoolExecutor(max(1, concurrency)) as ex:
        for p, r in zip(paths, ex.map(fetcher.get, paths)):
            out[p] = r
    return out


# ------------------------------------------------------------------------------------------------------------------ references
_ATTR_URL_RE = re.compile(r'''\b(?:src|href|action|poster|data-src|content)\s*=\s*["'](/[^"'\s<>]*)["']''', re.I)
_STR_URL_RE = re.compile(r'''["'`](/(?:%s)/[A-Za-z0-9._~%%/-]+)["'`]''' % '|'.join(REF_DIRS))
_REL_IMPORT_RE = re.compile(r'''["'`]\./([A-Za-z0-9._-]+\.(?:m?js|css))["'`]''')
_CSS_URL_RE = re.compile(r'''url\(\s*["']?(/[^"')\s]+)["']?\s*\)''')
_LOC_RE = re.compile(r'<loc>\s*([^<\s]+)\s*</loc>')


def _norm_ref(u, origin):
    if u.startswith('//'):
        return None
    if re.match(r'^[a-z][a-z0-9+.-]*:', u, re.I):
        pu = urllib.parse.urlparse(u)
        if (pu.scheme + '://' + pu.netloc) != origin.rstrip('/'):
            return None
        u = pu.path or '/'
    u = u.split('#')[0].split('?')[0]
    if not u.startswith('/') or u.startswith('/.netlify') or u.startswith('/api/') or u.endswith('/'):
        return None
    return urllib.parse.unquote(u)


def extract_refs(path, data, origin):
    """Same-origin paths (url paths with a leading slash) referenced by one served file."""
    out = set()
    try:
        text = data.decode('utf-8')
    except UnicodeDecodeError:
        return out
    cand = []
    if path.endswith('.html') or path == '/' or not os.path.splitext(path)[1]:
        cand += _ATTR_URL_RE.findall(text) + _STR_URL_RE.findall(text)
    elif path.endswith(('.js', '.mjs')):
        cand += _STR_URL_RE.findall(text)
        if path.startswith('/assets/'):
            cand += ['/assets/' + m for m in _REL_IMPORT_RE.findall(text)]
    elif path.endswith('.css'):
        cand += _CSS_URL_RE.findall(text)
    elif path.endswith(('.json', '.webmanifest')):
        try:
            j = json.loads(text)
        except ValueError:
            j = None

        def walk(x):
            if isinstance(x, dict):
                for k, v in x.items():
                    if k in ('src', 'start_url', 'scope', 'url', 'icon') and isinstance(v, str):
                        cand.append(v)
                    walk(v)
            elif isinstance(x, list):
                for v in x:
                    walk(v)
        walk(j)
        cand += _STR_URL_RE.findall(text)
    elif path.endswith('.xml'):
        cand += _LOC_RE.findall(text)
    elif path.endswith('.txt'):
        cand += [m for m in re.findall(r'(?im)^sitemap:\s*(\S+)', text)]
    for u in cand:
        n = _norm_ref(u, origin)
        if n and n != '/':
            out.add(n)
    return out


# ------------------------------------------------------------------------------------------------------------------ expectations
def forced_404_paths(toml_text):
    """Paths the baseline netlify.toml redirects to 404 with force = true (a file that exists but is not served under its own name)."""
    out = set()
    for blk in re.split(r'(?m)^\[\[redirects\]\]', toml_text)[1:]:
        blk = blk.split('\n[[')[0]
        f = re.search(r'from\s*=\s*"([^"]+)"', blk)
        st = re.search(r'status\s*=\s*(\d+)', blk)
        fo = re.search(r'force\s*=\s*true', blk)
        if f and st and st.group(1) == '404' and fo and '*' not in f.group(1):
            out.add(f.group(1))
    return out


# ------------------------------------------------------------------------------------------------------------------ comparison
def text_diff(a, b, limit=40, label_a='baseline', label_b='live'):
    """Short human diff of two byte strings (line-ending aware).  Returns a list of lines."""
    if a == b:
        return []
    try:
        ta, tb = a.decode('utf-8'), b.decode('utf-8')
    except UnicodeDecodeError:
        return ['binary: %s %d B %s, %s %d B %s' % (label_a, len(a), sha256_bytes(a)[:12], label_b, len(b), sha256_bytes(b)[:12])]
    la, lb = ta.replace('\r\n', '\n'), tb.replace('\r\n', '\n')
    crlf_a, crlf_b = ta.count('\r\n'), tb.count('\r\n')
    out = []
    if la == lb:
        return ['line endings only: %s has %d CRLF / %d LF, %s has %d CRLF / %d LF' % (label_a, crlf_a, ta.count('\n') - crlf_a, label_b, crlf_b, tb.count('\n') - crlf_b)]
    if (crlf_a > 0) != (crlf_b > 0):
        out.append('(line endings also differ: %s %s, %s %s)' % (label_a, 'CRLF' if crlf_a else 'LF', label_b, 'CRLF' if crlf_b else 'LF'))
    n = 0
    for ln in difflib.unified_diff(la.split('\n'), lb.split('\n'), label_a, label_b, n=1, lineterm=''):
        out.append(ln[:170])
        n += 1
        if n >= limit:
            out.append('... (diff truncated at %d lines)' % limit)
            break
    return out


def find_rum(responses):
    """The RUM snippet of the site: taken from the index page (pretty form first)."""
    for p in ('/', '/index.html'):
        r = responses.get(p)
        if r is not None and r.status == 200:
            try:
                s = netlify.extract_rum(r.body)
            except (netlify.Unmodelled, UnicodeDecodeError):
                s = None
            if s:
                return s
    return None


def compare(tree, responses, rum, toml_text=''):
    """Compare a source tree {path: bytes} with the responses {urlpath: Resp} (the post-processing model for html).  Returns a list of
    findings {path, state, detail:[...]}; state is one of ok, drift, missing, config, unexpected."""
    forced = forced_404_paths(toml_text)
    findings = []
    for p in sorted(tree):
        src = tree[p]
        f = {'path': p, 'state': 'ok', 'detail': []}
        if p in CONFIG_FILES:
            r = responses.get('/' + p)
            if r is None:
                f['state'], f['detail'] = 'config', ['not requested']
            elif r.status == 200:
                f['state'], f['detail'] = 'unexpected', ['a config file is publicly served (HTTP 200)']
            else:
                f['state'], f['detail'] = 'config', ['not served (HTTP %d), as Netlify processes it: byte comparison impossible; header snapshot is the indirect check' % r.status]
            findings.append(f)
            continue
        if is_html(p):
            try:
                expected = netlify.forward(src, rum)
                model_error = None
            except (netlify.Unmodelled, UnicodeDecodeError) as e:
                expected, model_error = None, str(e)
            if model_error:
                f['state'], f['detail'] = 'drift', ['post-processing model cannot be applied to the baseline file: ' + model_error]
                findings.append(f)
                continue
            bad_forms = []
            for form, up in (('extension', '/' + p), ('pretty', pretty_of(p))):
                r = responses.get(up)
                if r is None:
                    bad_forms.append((form, None, 'not requested'))
                    continue
                if form == 'extension' and ('/' + p) in forced:
                    # e.g. /diagnostics.html: netlify.toml forces a 404 for this spelling (the pretty form is still the file)
                    if r.status != 404:
                        bad_forms.append((form, r, 'HTTP %d: netlify.toml forces a 404 for this spelling (a dev page became reachable)' % r.status))
                    continue
                if r.status != 200:
                    bad_forms.append((form, r, 'HTTP %d%s' % (r.status, (' ' + r.error) if r.error else '')))
                    continue
                if r.body != expected:
                    bad_forms.append((form, r, 'bytes differ from the post-processed baseline'))
            if not bad_forms:
                findings.append(f)
                continue
            f['state'] = 'drift'
            shown = False
            for form, r, why in bad_forms:
                f['detail'].append('%s form (%s): %s' % (form, '/' + p if form == 'extension' else pretty_of(p), why))
                if r is not None and r.status == 200 and not shown:
                    shown = True
                    try:
                        live_src, info = netlify.inverse(r.body, src, tolerant=True)
                    except (netlify.Unmodelled, UnicodeDecodeError) as e:
                        f['detail'].append('  cannot undo post-processing: %s' % e)
                        continue
                    d = text_diff(src, live_src)
                    if not d:
                        f['detail'].append('  source-level content is IDENTICAL; only the post-processing differs from the model (RUM snippet or link rewriting changed): update t0build/netlify.py')
                    else:
                        f['detail'].append('  live (post-processing undone) vs baseline/dist:')
                        f['detail'] += ['    ' + x for x in d]
                        if info['inferred']:
                            f['detail'].append('  (%d rewritten link(s) had no counterpart in the baseline; their source form is inferred)' % len(info['inferred']))
            findings.append(f)
            continue
        r = responses.get('/' + p)
        if r is None:
            f['state'], f['detail'] = 'drift', ['not requested']
        elif r.status == 404:
            f['state'], f['detail'] = 'missing', ['the baseline file is not served by live (HTTP 404)']
        elif r.status != 200:
            f['state'], f['detail'] = 'drift', ['HTTP %d %s' % (r.status, r.error or '')]
        elif r.body != src:
            f['state'] = 'drift'
            f['detail'] = ['live %d B sha256 %s, baseline %d B sha256 %s' % (len(r.body), sha256_bytes(r.body)[:12], len(src), sha256_bytes(src)[:12])]
            f['detail'] += ['  ' + x for x in text_diff(src, r.body)]
        findings.append(f)
    return findings


def discover(tree, responses, origin, is_known):
    """Same-origin paths referenced by the served pages/scripts that the baseline tree does not contain (only what `is_known` says is new)."""
    new = {}
    for up, r in sorted(responses.items()):
        if r.status != 200:
            continue
        for ref in extract_refs(up, r.body, origin):
            if is_known(ref):
                continue
            new.setdefault(ref, up)
    return new


def known_path_factory(tree):
    pages = {pretty_of(p) for p in tree if is_html(p)}
    files = {'/' + p for p in tree}

    def known(u):
        return u in files or u in pages or u == '/' or u.rstrip('/') in pages
    return known


# ------------------------------------------------------------------------------------------------------------------ mirror
def _raw_path(out, url_path, kind):
    if kind == 'pretty':
        return os.path.join(out, 'raw', 'pretty', ('index' if url_path == '/' else url_path.lstrip('/')) + '.html')
    return os.path.join(out, 'raw', 'ext', url_path.lstrip('/'))


def mirror(out, origin=DEFAULT_ORIGIN, seeds=(), concurrency=4, cap=300, say=print):
    """Fetch the live site into `out`/raw (git-ignored) and write `out`/SHA256.tsv, MIRROR.json and headers.key.json.  `seeds` are tree roots
    whose file lists define the paths to request (legacy/dist, and baseline/dist when it exists)."""
    paths = set()
    for s in seeds:
        if os.path.isdir(s):
            paths.update(walk_files(s))
    if not paths:
        raise BuildError('mirror: no seed file list (no tree among %s)' % list(seeds))
    tmp = os.path.join(REPO, 'tmp', 't0-baseline', 'curl')
    fetcher = Fetcher(origin, tmp)
    reqs = {}          # url path -> (file path, kind)
    for p in sorted(paths):
        reqs['/' + p] = (p, 'ext')
        if is_html(p):
            reqs[pretty_of(p)] = (p, 'pretty')
    probe404 = '/t0-mirror-probe-%d' % int(time.time())
    reqs[probe404] = (None, 'probe')
    say('mirror %s: %d paths -> %d requests' % (origin, len(paths), len(reqs)))
    resp = fetch_many(fetcher, sorted(reqs), concurrency)
    # crawl: everything the served files reference that is not in the seed list
    known = known_path_factory({p: b'' for p in paths})
    discovered = {}
    for _round in range(3):
        new = {}
        for up, r in resp.items():
            if r.status != 200:
                continue
            for ref in extract_refs(up, r.body, origin):
                if known(ref) or ref in resp or ref in discovered:
                    continue
                new.setdefault(ref, up)
        if not new:
            break
        if len(discovered) + len(new) > cap:
            raise BuildError('mirror: discovery would fetch more than %d extra paths; look at: %s' % (cap, sorted(new)[:10]))
        got = fetch_many(fetcher, sorted(new), concurrency)
        for ref, r in got.items():
            resp[ref] = r
            discovered[ref] = {'found_in': new[ref], 'status': r.status}
            fp = ref.lstrip('/')
            reqs[ref] = (fp, 'ext')
            if r.status == 200 and is_html(ref):
                pr = fetch_many(fetcher, [pretty_of(fp)], concurrency)
                resp.update(pr)
                reqs[pretty_of(fp)] = (fp, 'pretty')
    # write raw files
    raw = os.path.join(out, 'raw')
    if os.path.isdir(raw):
        shutil.rmtree(raw)
    rows, meta = [], {}
    for up in sorted(resp):
        r = resp[up]
        fp, kind = reqs[up]
        if kind == 'probe':
            label = 'probe-404'
        elif r.status == 404 and (fp in CONFIG_FILES or kind == 'ext' and is_html(fp)):
            label = 'expected-404' if fp in CONFIG_FILES else 'html-ext-404'
        else:
            label = ('html-' + kind) if is_html(fp) else 'file'
        if r.status == 200 and kind != 'probe':
            write_bytes(_raw_path(out, up if kind == 'ext' else up, kind), r.body)
        elif kind == 'probe' or r.status == 404:
            write_bytes(os.path.join(out, 'raw', 'status', 'probe' if kind == 'probe' else up.lstrip('/') + '.404.html'), r.body)
        rows.append((up, label, r.status, len(r.body), sha256_bytes(r.body)))
        meta[up] = r.meta()
    write_bytes(os.path.join(raw, 'headers.json'), (json.dumps(meta, indent=1, sort_keys=True) + '\n').encode('utf-8'))
    tsv = ['# live mirror of %s; path, kind, HTTP status, bytes, sha256 of the raw response body (identity encoding)' % origin,
           'path\tkind\tstatus\tbytes\tsha256']
    tsv += ['\t'.join(str(x) for x in row) for row in rows]
    tsv.append('# requests: %d' % len(rows))
    write_bytes(os.path.join(out, 'SHA256.tsv'), ('\n'.join(tsv) + '\n').encode('utf-8'))
    rum = find_rum(resp)
    key = {u: {k: v for k, v in meta[u]['headers'].items() if k not in VOLATILE_HEADERS} | {'_status': meta[u]['status']} for u in KEY_URLS if u in meta}
    key['(unknown path)'] = {k: v for k, v in meta[probe404]['headers'].items() if k not in VOLATILE_HEADERS} | {'_status': meta[probe404]['status']}
    write_bytes(os.path.join(out, 'headers.key.json'), (json.dumps(key, indent=1, sort_keys=True) + '\n').encode('utf-8'))
    summary = {'origin': origin, 'requests': len(rows), 'curl_calls': fetcher.count, 'paths_seeded': len(paths),
               'discovered': discovered, 'rum_deploy_id': netlify.deploy_id(rum) if rum else None,
               'rum_snippet_bytes': len(rum.encode('utf-8')) + 2 if rum else None,
               'status_counts': {str(s): sum(1 for r in resp.values() if r.status == s) for s in sorted({r.status for r in resp.values()})}}
    write_bytes(os.path.join(out, 'MIRROR.json'), (json.dumps(summary, indent=1, sort_keys=True) + '\n').encode('utf-8'))
    say('mirrored: %s; status counts %s; live deploy %s' % (len(rows), summary['status_counts'], summary['rum_deploy_id']))
    return summary


def load_raw(out):
    """The mirror on disk as {urlpath: Resp} (status and headers from raw/headers.json; bodies from raw/)."""
    hp = os.path.join(out, 'raw', 'headers.json')
    if not os.path.isfile(hp):
        raise BuildError('no mirror in %s: raw/ is git-ignored (it carries the RUM token); run "python tools/t0/baseline.py mirror" first' % rel_to_repo(out))
    meta = load_json(hp)
    resp = {}
    for up, m in meta.items():
        body = b''
        is_page = up == '/' or not os.path.splitext(up)[1]
        pth = _raw_path(out, up, 'pretty') if is_page and not up.startswith('/assets') else _raw_path(out, up, 'ext')
        if m['status'] == 200 and os.path.isfile(pth):
            body = read_bytes(pth)
        resp[up] = Resp(up, m['status'], m['headers'], body, m.get('error'))
    return resp


# ------------------------------------------------------------------------------------------------------------------ reconstruct / prove
def reconstruct(out, seed_dirs, dest, say=print):
    """Write the source-level live tree into `dest`: seed files whose live bytes are identical stay as they are; every other file takes
    the live bytes (html: post-processing undone against the seed file as reference).  Returns the per-file report."""
    resp = load_raw(out)
    rum = find_rum(resp)
    if rum is None:
        raise BuildError('reconstruct: no RUM snippet on the served index page: the post-processing model has nothing to undo')
    seed = {}
    for s in seed_dirs:
        if os.path.isdir(s):
            for rel in walk_files(s):
                seed.setdefault(rel, read_bytes(os.path.join(s, rel)))      # first seed dir wins (legacy/dist)
    paths = set(seed)
    for up, r in resp.items():
        if r.status == 200 and up not in ('/',) and not up.startswith('/t0-mirror-probe'):
            fp = up.lstrip('/')
            if fp and os.path.splitext(fp)[1]:
                paths.add(fp)
    toml = seed.get('netlify.toml', b'').decode('utf-8', 'replace')
    forced = forced_404_paths(toml)
    tree, report = {}, []
    for p in sorted(paths):
        rec = {'path': p}
        if p in CONFIG_FILES:
            if p in seed:
                tree[p] = seed[p]
                rec.update(origin='legacy', note='config file: not served by Netlify, not verifiable by bytes; kept from legacy/dist')
            report.append(rec)
            continue
        if is_html(p):
            cands = [r for r in (resp.get(pretty_of(p)), resp.get('/' + p)) if r is not None and r.status == 200]
            if not cands:
                rec.update(origin='dropped', note='not served by live in either URL form')
                report.append(rec)
                continue
            served = cands[0].body
            if any(c.body != served for c in cands):
                rec['warning'] = 'the two URL forms serve different bytes'
            src, info = netlify.inverse(served, seed.get(p))
            if p in seed and src == seed[p]:
                tree[p] = seed[p]
                rec.update(origin='legacy', note='identical to legacy/dist once the post-processing is undone')
            else:
                tree[p] = src
                rec.update(origin='live', note='differs from legacy/dist' if p in seed else 'not in legacy/dist (new on live)',
                           inferred_links=len(info['inferred']), links_from_reference=info['reference_matched'])
            if ('/' + p) in forced and resp.get('/' + p) is not None and resp['/' + p].status == 404:
                rec['extension_form'] = 'forced 404 by netlify.toml; reconstructed from the pretty URL'
        else:
            r = resp.get('/' + p)
            if r is None or r.status != 200:
                if p in seed:
                    rec.update(origin='dropped', note='served by live as HTTP %s' % (r.status if r else 'n/a'))
                report.append(rec)
                continue
            if p in seed and r.body == seed[p]:
                tree[p] = seed[p]
                rec.update(origin='legacy', note='identical')
            else:
                tree[p] = r.body
                rec.update(origin='live', note='differs from legacy/dist' if p in seed else 'not in legacy/dist (new on live)')
        report.append(rec)
    if os.path.isdir(dest):
        shutil.rmtree(dest)
    for p, b in tree.items():
        write_bytes(os.path.join(dest, p), b)
    changed = [r['path'] for r in report if r.get('origin') == 'live']
    dropped = [r['path'] for r in report if r.get('origin') == 'dropped']
    say('reconstructed %d files into %s: %d from live (%s), %d dropped %s' % (len(tree), rel_to_repo(dest), len(changed), ', '.join(changed), len(dropped), dropped))
    return {'files': len(tree), 'from_live': changed, 'dropped': dropped, 'rum_model': 'before </body>: "\\n" + snippet + "\\n"', 'per_file': report}


def prove(out, tree_dir, say=print):
    """Apply the post-processing model to baseline/dist and compare with the mirror, byte for byte.  Returns (ok, report)."""
    resp = load_raw(out)
    rum = find_rum(resp)
    tree = read_tree(tree_dir)
    toml = tree.get('netlify.toml', b'').decode('utf-8', 'replace')
    findings = compare(tree, resp, rum, toml)
    n_html = sum(1 for p in tree if is_html(p))
    by = {}
    for f in findings:
        by[f['state']] = by.get(f['state'], 0) + 1
    ok = all(f['state'] in ('ok', 'config') for f in findings)
    # extra live files / pages that the tree lacks
    lacking = [u for u, r in resp.items() if r.status == 200 and not u.startswith('/t0-mirror-probe') and not known_path_factory(tree)(u)]
    ok = ok and not lacking
    report = {'ok': ok, 'files': len(tree), 'html_pages': n_html, 'states': by, 'live_paths_not_in_tree': lacking, 'live_deploy_id': netlify.deploy_id(rum) if rum else None,
              'findings': [f for f in findings if f['state'] != 'ok']}
    say('prove: %d files (%d html pages, both URL forms each): %s%s' % (len(tree), n_html, ', '.join('%d %s' % (v, k) for k, v in sorted(by.items())),
                                                                     ('; live paths missing from the tree: %s' % lacking) if lacking else ''))
    return ok, report


# ------------------------------------------------------------------------------------------------------------------ verify-live
def _norm_header(name, value):
    """Netlify answers an edge-cache MISS with `Strict-Transport-Security: max-age=31536000` and a cached copy of the same file with
    `max-age=31536000; includeSubDomains; preload` (observed on /robots.txt, 2026-09-30), so only the max-age directive is compared."""
    if value is not None and name == 'strict-transport-security':
        return value.split(';')[0].strip().lower()
    return value


def verify_live(tree_dir, origin=DEFAULT_ORIGIN, concurrency=4, headers_ref=None, say=print, discover_new=True):
    """The pre-deploy check.  Returns (state, report): state is 'IDENTICAL', 'DRIFTED' or 'ERROR'."""
    tree = read_tree(tree_dir)
    toml = tree.get('netlify.toml', b'').decode('utf-8', 'replace')
    tmp = os.path.join(REPO, 'tmp', 't0-baseline', 'curl')
    fetcher = Fetcher(origin, tmp)
    reqs = []
    for p in sorted(tree):
        reqs.append('/' + p)
        if is_html(p):
            reqs.append(pretty_of(p))
    probe = '/t0-verify-probe-%d' % int(time.time())
    reqs.append(probe)
    first = fetcher.get('/')              # preflight: an unreachable origin fails fast instead of after 150 timeouts
    if first.error:
        return 'ERROR', {'error': 'cannot reach %s (%s); this is not a drift result' % (origin, first.error)}
    resp = fetch_many(fetcher, reqs, concurrency)
    errs = [u for u, r in resp.items() if r.error]
    if errs:                              # a network hiccup must never read as drift: retry once, then report ERROR (exit 2)
        for u in errs:
            resp[u] = fetcher.get(u)
        errs = [u for u, r in resp.items() if r.error]
    if errs:
        return 'ERROR', {'error': 'could not fetch %d of %d URL(s) from %s (first: %s %s); this is not a drift result' % (len(errs), len(resp), origin, errs[0], resp[errs[0]].error)}
    rum = find_rum(resp)
    new_on_live = {}
    if discover_new:
        known = known_path_factory(tree)
        for _r in range(2):
            new = {ref: where for ref, where in discover(tree, resp, origin, known).items() if ref not in resp}
            if not new:
                break
            resp.update(fetch_many(fetcher, sorted(new), concurrency))
            for ref, where in new.items():
                if resp[ref].status == 200:
                    new_on_live[ref] = where
    findings = compare(tree, resp, rum, toml)
    for ref, where in sorted(new_on_live.items()):
        findings.append({'path': ref.lstrip('/'), 'state': 'new', 'detail': ['served by live (HTTP 200, %d B) and referenced from %s, but not in baseline/dist' % (len(resp[ref].body), where)]})
    dangling = sorted(ref for ref, r in resp.items() if ref not in reqs and r.status != 200)
    hdr_findings = []
    if headers_ref and os.path.isfile(headers_ref):
        ref = load_json(headers_ref)
        for u, want in sorted(ref.items()):
            if u.startswith('('):
                r = resp.get(probe)
            else:
                r = resp.get(u)
            if r is None:
                continue
            got = {k: v for k, v in r.headers.items() if k not in VOLATILE_HEADERS}
            for k in sorted(set(want) | set(got)):
                if k == '_status':
                    if want[k] != r.status:
                        hdr_findings.append('%s: HTTP status %s (snapshot %s)' % (u, r.status, want[k]))
                    continue
                if k in VOLATILE_HEADERS or k.startswith('x-nf'):
                    continue
                if _norm_header(k, want.get(k)) != _norm_header(k, got.get(k)):
                    hdr_findings.append('%s: header %s is %r (snapshot %r)' % (u, k, got.get(k), want.get(k)))
    drifted = [f for f in findings if f['state'] in ('drift', 'missing', 'unexpected', 'new')]
    deploy = netlify.deploy_id(rum) if rum else None
    report = {'origin': origin, 'requests': fetcher.count, 'live_deploy_id': deploy, 'files_checked': len(tree),
              'html_pages': sum(1 for p in tree if is_html(p)), 'drifted': [f['path'] for f in drifted],
              'headers_changed': hdr_findings, 'findings': [f for f in findings if f['state'] != 'ok'], 'dangling_refs_on_live': dangling}
    return ('DRIFTED' if drifted else 'IDENTICAL'), report


# ------------------------------------------------------------------------------------------------------------------ a downloaded deploy zip
def zip_files(zip_path):
    """{relpath: bytes} of the FILES of a Netlify "Download deploy" zip.  Directory entries are skipped; when every entry sits under one
    folder (a zip made of a folder) that folder is stripped.  Raises BuildError for anything that is not a readable zip."""
    import zipfile
    try:
        zf = zipfile.ZipFile(zip_path)
    except (OSError, zipfile.BadZipFile) as e:
        raise BuildError('cannot read %s as a zip: %s' % (zip_path, e))
    out = {}
    with zf:
        for info in zf.infolist():
            name = info.filename.replace('\\', '/')
            if name.endswith('/') or name.startswith('__MACOSX/'):
                continue
            if name.startswith('/') or '..' in name.split('/'):
                raise BuildError('unsafe path in the zip: %s' % name)
            out[name] = zf.read(info)
    firsts = {n.split('/', 1)[0] for n in out if '/' in n}
    if out and len(firsts) == 1 and all('/' in n for n in out):
        pre = next(iter(firsts)) + '/'
        out = {n[len(pre):]: b for n, b in out.items()}
    return out


def compare_zip(zip_path, lock_path=LOCK_PATH):
    """Compare a downloaded deploy zip with the LOCKED baseline (per-file sha256 of baseline/dist).  This is the only byte comparison of
    netlify.toml that exists (Netlify does not serve it).  Returns (state, report): IDENTICAL or DIFFERENT."""
    lock = load_json(lock_path)
    want = lock['files']
    got = zip_files(zip_path)
    lower = {p.lower(): p for p in got}
    findings = []
    for p in sorted(set(want) | set(got)):
        if p not in got:
            hint = ' (the zip has %s: names differ only by case)' % lower[p.lower()] if p.lower() in lower else ''
            findings.append({'path': p, 'state': 'missing', 'detail': ['in the baseline, not in the zip' + hint]})
        elif p not in want:
            findings.append({'path': p, 'state': 'extra', 'detail': ['in the zip (%d B), not in the baseline: a deploy that carries it behaves differently from one built on the baseline (_headers, _redirects and netlify.toml change what Netlify serves)' % len(got[p])]})
        elif sha256_bytes(got[p]) != want[p]['sha256']:
            detail = ['sha256 %s, baseline %s, %d B vs %d B' % (sha256_bytes(got[p])[:12], want[p]['sha256'][:12], len(got[p]), want[p]['bytes'])]
            bp = os.path.join(base_dir(), p)
            if os.path.isfile(bp):
                detail += text_diff(read_bytes(bp), got[p], 30, 'baseline', 'zip')
            findings.append({'path': p, 'state': 'differs', 'detail': detail})
    report = {'zip': os.path.basename(zip_path), 'zip_sha256': sha256_bytes(read_bytes(zip_path)), 'files_in_zip': len(got), 'files_in_baseline': len(want),
              'differing': [f['path'] for f in findings], 'findings': findings}
    return ('DIFFERENT' if findings else 'IDENTICAL'), report
