#!/usr/bin/env python3
"""Pack a built train (release/<train>/dist) into the Netlify drag-and-drop zip.

  python tools/ship/pack_zip.py --train R1c --out deliver/gettysburg-map-R1c.zip
  python tools/ship/pack_zip.py --dist release/R1c/dist --out x.zip [--staging]

What it guarantees (each one is checked after the zip is written, by reading the zip back):
  * the site files are at the ROOT of the zip (index.html is entry "index.html", no wrapper folder);
  * every file of the dist is in the zip, byte for byte, and nothing else is (no directory entries, no extra files);
  * the zip is deterministic: sorted entries, one fixed timestamp, fixed permissions, one compression level, so two
    packs of the same dist give the same SHA-256;
  * the dist's own build record (manifest.json next to dist/, written by tools/t0/build.py) agrees with the files: same file set, same size and sha256 per
    file, same tree digest (a dist without a manifest is packed too, and the output says that nothing was cross-checked);
  * --staging adds `X-Robots-Tag: noindex` as the first line of the /* block of _headers (exactly the change that
    `ops/sha-list.mjs stage` makes, so a zip of a staging copy equals that copy file for file) so a throw-away test site never competes with the real one in search; the
    PRODUCTION zip never has it.
Prints the SHA-256 of the zip, its size and the file count. Writes <out>.sha256 and <out>.files.tsv (path, size, sha256).
Never touches the dist, never uploads anything.
"""
import argparse, hashlib, io, json, os, re, sys, zipfile

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
STAMP = (2026, 1, 1, 0, 0, 0)  # fixed, so the zip is reproducible
NOINDEX = 'X-Robots-Tag: noindex'
HAS_ROBOTS = re.compile(r'^\s*x-robots-tag\s*:', re.I | re.M)


def sha256(b):
    return hashlib.sha256(b).hexdigest()


def tree_digest(files):
    """The tree digest of tools/t0/t0build/util.py tree_digest: sha256 over the sorted lines  <path> NUL <sha256 hex> LF."""
    h = hashlib.sha256()
    for rel in sorted(files):
        h.update(rel.encode('utf-8') + b'\0' + sha256(files[rel]).encode('ascii') + b'\n')
    return h.hexdigest()


def collect(dist):
    out = {}
    for root, dirs, files in os.walk(dist):
        dirs.sort()
        for f in sorted(files):
            full = os.path.join(root, f)
            rel = os.path.relpath(full, dist).replace(os.sep, '/')
            with open(full, 'rb') as fh:
                out[rel] = fh.read()
    return out


def staging_headers(raw):
    """Add the noindex header as the first line of the first `/*` block of _headers and change nothing else (the edit of `ops/sha-list.mjs stage`)."""
    text = raw.decode('utf-8')
    if HAS_ROBOTS.search(text):
        raise SystemExit('FAIL: _headers already sets X-Robots-Tag; refusing to build the staging variant from it')
    nl = '\r\n' if '\r\n' in text else '\n'
    lines = text.split(nl)
    for i, ln in enumerate(lines):
        if ln.strip() == '/*':
            lines.insert(i + 1, '  ' + NOINDEX)
            return nl.join(lines).encode('utf-8')
    raise SystemExit('FAIL: no "/*" block in _headers; cannot build the staging variant')


def verify_written(out, files, dist, staging):
    """Read the zip back from disk and prove it holds exactly `files`, with no directory entries and index.html at the root."""
    with zipfile.ZipFile(out) as z:
        bad = z.testzip()
        if bad:
            raise SystemExit('FAIL: corrupt entry ' + bad)
        names = z.namelist()
        if names != sorted(files):
            raise SystemExit('FAIL: zip entry list differs from the dist file list')
        if any(n.endswith('/') or n.startswith('/') or '..' in n.split('/') or '\\' in n for n in names):
            raise SystemExit('FAIL: a directory entry, an absolute path or a backslash is in the zip')
        if 'index.html' not in names:
            raise SystemExit('FAIL: index.html is not at the zip root')
        for n in names:
            if sha256(z.read(n)) != sha256(files[n]):
                raise SystemExit('FAIL: %s differs from the dist after zipping' % n)
    if not staging:
        # a production zip must hold exactly the dist, byte for byte (the dist is read a second time: it must not have changed while packing)
        for rel, b in files.items():
            with open(os.path.join(dist, *rel.split('/')), 'rb') as fh:
                if fh.read() != b:
                    raise SystemExit('FAIL: %s changed between reading and packing' % rel)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--train')
    ap.add_argument('--dist')
    ap.add_argument('--out', required=True)
    ap.add_argument('--staging', action='store_true')
    a = ap.parse_args()
    if bool(a.train) == bool(a.dist):
        raise SystemExit('give exactly one of --train or --dist')
    dist = os.path.abspath(a.dist or os.path.join(REPO, 'release', a.train, 'dist'))
    if not os.path.isfile(os.path.join(dist, 'index.html')):
        raise SystemExit('FAIL: %s has no index.html' % dist)
    side = os.path.dirname(dist)
    if os.path.isfile(os.path.join(side, 'BUILD-FAILED.json')):
        raise SystemExit('FAIL: %s exists: the build of this dist failed, it is not deployable' % os.path.join(side, 'BUILD-FAILED.json'))
    gp = os.path.join(side, 'gate.json')
    if os.path.isfile(gp):
        try:
            if json.load(open(gp, encoding='utf-8')).get('ok') is False:
                raise SystemExit('FAIL: %s says the build gate FAILED for this dist' % gp)
        except ValueError:
            raise SystemExit('FAIL: cannot read %s' % gp)
    files = collect(dist)

    # manifest cross-check: build.py writes release/<train>/manifest.json next to dist/ with "files": {path: {"bytes": n, "sha256": h}} for every file of the
    # dist.  The set of files and every digest must agree with what is about to be zipped (a hand-edited or half-rebuilt dist fails here).  A dist without a
    # manifest (a private build under tmp/ that kept none) is allowed but said so; a manifest that cannot be read, or that has no per-file digests, is an error
    # (an earlier version of this check silently compared nothing because it expected the digest to be a bare string).
    man = os.path.join(os.path.dirname(dist), 'manifest.json')
    manifest_note = 'no manifest.json beside the dist: files not cross-checked against a build record'
    if os.path.isfile(man):
        try:
            m = json.load(open(man, encoding='utf-8'))
        except (OSError, ValueError) as e:
            raise SystemExit('FAIL: cannot read %s: %s' % (man, e))
        listed = m.get('files')
        if not isinstance(listed, dict) or not listed:
            raise SystemExit('FAIL: %s has no "files" table; cannot cross-check the dist' % man)
        want = {}
        for p, v in listed.items():
            h = v.get('sha256') if isinstance(v, dict) else v
            if not isinstance(h, str) or len(h) != 64:
                raise SystemExit('FAIL: manifest.json has no sha256 for %s' % p)
            want[p] = (h, v.get('bytes') if isinstance(v, dict) else None)
        missing = sorted(set(want) - set(files))
        extra = sorted(set(files) - set(want))
        if missing or extra:
            raise SystemExit('FAIL: the dist and manifest.json list different files (in the manifest only: %s; in the dist only: %s)' % (', '.join(missing[:5]) or '-', ', '.join(extra[:5]) or '-'))
        bad = [p for p, (h, n) in want.items() if h != sha256(files[p]) or (n is not None and n != len(files[p]))]
        if bad:
            raise SystemExit('FAIL: manifest.json disagrees with the dist for %d file(s), first: %s' % (len(bad), bad[0]))
        if isinstance(m.get('file_count'), int) and m['file_count'] != len(files):
            raise SystemExit('FAIL: manifest.json says %d files, the dist has %d' % (m['file_count'], len(files)))
        tree = tree_digest(files)
        if isinstance(m.get('tree_sha256'), str) and m['tree_sha256'] != tree:
            raise SystemExit('FAIL: tree digest of the dist is %s, manifest.json says %s' % (tree, m['tree_sha256']))
        manifest_note = 'manifest.json agrees: %d files, same set, same sha256 and size, tree %s' % (len(files), tree[:12])
    if '_headers' not in files:
        raise SystemExit('FAIL: the dist has no _headers (every train ships one: the rules of the site)')
    if a.staging:
        files['_headers'] = staging_headers(files['_headers'])
        manifest_note += ' (checked before the staging change; the staging zip differs from the build in _headers only)'
    elif HAS_ROBOTS.search(files['_headers'].decode('utf-8', 'replace')):
        raise SystemExit('FAIL: the production _headers sets X-Robots-Tag (a staging copy packed as production?)')

    out = os.path.abspath(a.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for rel in sorted(files):
            zi = zipfile.ZipInfo(rel, STAMP)
            zi.compress_type = zipfile.ZIP_DEFLATED
            zi.external_attr = (0o100644 << 16)
            zi.create_system = 3
            z.writestr(zi, files[rel], zipfile.ZIP_DEFLATED, 9)
    data = buf.getvalue()
    with open(out, 'wb') as fh:
        fh.write(data)
    try:
        verify_written(out, files, dist, a.staging)
    except SystemExit:
        os.remove(out)          # a zip that failed its own proof must not sit there looking finished
        raise

    z_sha = sha256(data)
    with open(out + '.sha256', 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('%s  %s\n' % (z_sha, os.path.basename(out)))
    with open(out + '.files.tsv', 'w', encoding='utf-8', newline='\n') as fh:
        for rel in sorted(files):
            fh.write('%s\t%d\t%s\n' % (rel, len(files[rel]), sha256(files[rel])))
    print('OK %s: %d files, %d bytes, sha256 %s%s' % (os.path.basename(out), len(files), len(data), z_sha, '  [STAGING: noindex]' if a.staging else ''))
    print('   ' + manifest_note)


if __name__ == '__main__':
    main()
