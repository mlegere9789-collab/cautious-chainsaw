"""The used-names ledger (chapter 02 rule 2: never reuse a filename for different bytes).

ops/used-names.txt is a TSV: `name<TAB>sha256<TAB>bytes<TAB>zips<TAB>first-source`, one line per distinct (case-folded name,
sha256).  It is seeded from EVERY file that sits in an `assets/` folder inside the archived deploy zips plus legacy/dist, and
later trains append their own names with `record`.  Names are compared case-insensitively (Netlify serves /assets/ that way;
the downloaded "deploy" zip lower-cases five names).
"""
import os
import zipfile

from .util import BuildError, REPO, read_bytes, sha256_bytes, walk_files

LEDGER = os.path.join(REPO, 'ops', 'used-names.txt')
DEFAULT_ZIPS = 'C:/Users/mlege/gettysburg-archive/zips'
HEADER = [
    '# used-names ledger v1 (tools/t0/t0build/ledger.py).  DO NOT hand-edit; regenerate with `python tools/t0/ledger.py seed`.',
    '# Columns: name <TAB> sha256 <TAB> bytes <TAB> zips-containing-it <TAB> first-source.',
    '# Names are compared case-insensitively.  A new asset name must not appear here; an existing name must keep its bytes.',
]


def _split_parts(path):
    return path.replace(chr(92), '/').split('/')


def scan_zips(zip_dir):
    """{(lname, sha): {'name','bytes','zips':set}} for every non-directory entry inside an `assets` folder of any zip."""
    found = {}
    if not os.path.isdir(zip_dir):
        raise BuildError('zip archive directory not found: %s' % zip_dir)
    n_zip = 0
    for fn in sorted(os.listdir(zip_dir)):
        if not fn.lower().endswith('.zip'):
            continue
        n_zip += 1
        with zipfile.ZipFile(os.path.join(zip_dir, fn)) as zf:
            for info in zf.infolist():
                if info.is_dir():
                    continue
                parts = _split_parts(info.filename)
                if 'assets' not in [x.lower() for x in parts[:-1]]:
                    continue
                data = zf.read(info)
                key = (parts[-1].lower(), sha256_bytes(data))
                e = found.setdefault(key, {'name': parts[-1], 'bytes': len(data), 'zips': set()})
                e['zips'].add(fn)
                if parts[-1] < e['name']:
                    e['name'] = parts[-1]
    return found, n_zip


def scan_dir(assets_dir, source):
    found = {}
    if os.path.isdir(assets_dir):
        for rel in walk_files(assets_dir):
            data = read_bytes(os.path.join(assets_dir, rel))
            found[(os.path.basename(rel).lower(), sha256_bytes(data))] = {
                'name': os.path.basename(rel), 'bytes': len(data), 'zips': {source}}
    return found


def merge(a, b):
    for k, v in b.items():
        if k in a:
            a[k]['zips'] |= v['zips']
            a[k]['name'] = min(a[k]['name'], v['name'])
        else:
            a[k] = v
    return a


def render(entries):
    lines = list(HEADER)
    for (lname, sha), e in sorted(entries.items()):
        zips = sorted(e['zips'])
        lines.append('\t'.join(['assets/' + e['name'], sha, str(e['bytes']), str(len(zips)), zips[0]]))
    return '\n'.join(lines) + '\n'


def seed(zip_dir=DEFAULT_ZIPS, legacy_assets=None, out=LEDGER):
    entries, n_zip = scan_zips(zip_dir)
    if legacy_assets:
        merge(entries, scan_dir(legacy_assets, 'legacy/dist'))
    with open(out, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(render(entries))
    return len(entries), n_zip


def load(path=LEDGER):
    """{lname: {sha: {'name','bytes','source'}}}"""
    if not os.path.isfile(path):
        raise BuildError('ledger %s does not exist; run `python tools/t0/ledger.py seed` first' % path)
    out = {}
    with open(path, encoding='utf-8') as fh:
        for line in fh:
            line = line.rstrip('\n')
            if not line or line.startswith('#'):
                continue
            f = line.split('\t')
            if len(f) < 5:
                raise BuildError('malformed ledger line: %r' % line)
            name = f[0][len('assets/'):] if f[0].startswith('assets/') else f[0]
            out.setdefault(name.lower(), {})[f[1]] = {'name': name, 'bytes': int(f[2]), 'source': f[4]}
    return out


def check(dist, ledger, legacy_names):
    """Problems for the files in dist/assets.  `legacy_names` = case-folded names that legacy/dist already served."""
    problems = []
    seen = {}
    assets = os.path.join(dist, 'assets')
    if not os.path.isdir(assets):
        return problems
    for rel in walk_files(assets):
        name = os.path.basename(rel)
        ln = name.lower()
        sha = sha256_bytes(read_bytes(os.path.join(assets, rel)))
        if ln in seen:
            problems.append('assets/%s and assets/%s differ only by case' % (seen[ln], name))
        seen[ln] = name
        prior = ledger.get(ln)
        if prior is None:
            continue
        if sha not in prior:
            problems.append('assets/%s reuses a name that was published with different bytes (%s)' % (
                name, ', '.join(sorted(v['source'] for v in prior.values()))))
        elif ln not in legacy_names and not all(v['source'].startswith('release:') for v in prior.values()):
            problems.append('new asset name assets/%s collides with an archived asset name (%s)' % (
                name, ', '.join(sorted(v['source'] for v in prior.values()))))
    return problems


def record(dist, train, rid, path=LEDGER, legacy_names=()):
    """Append this release's NEW asset names (not in legacy/dist) to the ledger.  Idempotent."""
    entries = {}
    with open(path, encoding='utf-8') as fh:
        existing = [ln.rstrip('\n') for ln in fh if ln.strip() and not ln.startswith('#')]
    have = {(ln.split('\t')[0][len('assets/'):].lower(), ln.split('\t')[1]) for ln in existing}
    added = []
    assets = os.path.join(dist, 'assets')
    for rel in walk_files(assets):
        name = os.path.basename(rel)
        data = read_bytes(os.path.join(assets, rel))
        sha = sha256_bytes(data)
        if name.lower() in legacy_names or (name.lower(), sha) in have:
            continue
        added.append('\t'.join(['assets/' + name, sha, str(len(data)), '1', 'release:%s:%s' % (train, rid)]))
    if added:
        lines = HEADER + sorted(existing + added, key=lambda s: (s.split('\t')[0].lower(), s.split('\t')[1]))
        with open(path, 'w', encoding='utf-8', newline='\n') as fh:
            fh.write('\n'.join(lines) + '\n')
    return added
