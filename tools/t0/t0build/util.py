"""Small shared helpers.  Everything here is deterministic and newline-preserving (bytes in, bytes out)."""
import hashlib
import json
import os
import re
import shutil

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
T0 = os.path.join(REPO, 'tools', 't0')


class BuildError(Exception):
    """A build precondition, anchor or gate failed; the message is safe to print."""


def sha256_bytes(b):
    return hashlib.sha256(b).hexdigest()


def md5_bytes(b):
    return hashlib.md5(b).hexdigest()


def read_bytes(path):
    with open(path, 'rb') as fh:
        return fh.read()


def read_text(path):
    """UTF-8 text with NO newline translation (CRLF stays CRLF)."""
    return read_bytes(path).decode('utf-8')


def write_bytes(path, data):
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    with open(path, 'wb') as fh:
        fh.write(data)


def write_text(path, text):
    write_bytes(path, text.encode('utf-8'))


def load_json(path):
    with open(path, encoding='utf-8') as fh:
        return json.load(fh)


def dump_json(path, obj):
    """Stable JSON: sorted keys, 2-space indent, ASCII-escaped, trailing newline."""
    write_text(path, json.dumps(obj, indent=2, sort_keys=True) + '\n')


def walk_files(root):
    """Sorted list of posix-relative file paths under root."""
    out = []
    for base, dirs, files in os.walk(root):
        dirs.sort()
        for f in sorted(files):
            full = os.path.join(base, f)
            out.append(os.path.relpath(full, root).replace(os.sep, '/'))
    out.sort()
    return out


def tree_digest(root):
    """Return (tree sha256, file count, {relpath: (bytes, sha256)}); the tree hash covers sorted path+sha lines."""
    files = {}
    h = hashlib.sha256()
    for rel in walk_files(root):
        data = read_bytes(os.path.join(root, rel))
        s = sha256_bytes(data)
        files[rel] = (len(data), s)
        h.update(rel.encode('utf-8') + b'\0' + s.encode('ascii') + b'\n')
    return h.hexdigest(), len(files), files


def rmtree_safe(path):
    """Delete a build output directory, but only when it is inside the repo's release/ or tmp/ folders."""
    ap = os.path.abspath(path)
    allowed = [os.path.join(REPO, 'release'), os.path.join(REPO, 'tmp')]
    if not any(ap == a or ap.startswith(a + os.sep) for a in allowed):
        raise BuildError('refusing to delete %s: output directories must live under release/ or tmp/' % path)
    if os.path.exists(ap):
        shutil.rmtree(ap)


def copy_tree(src, dst):
    """Deterministic byte copy of a directory tree (no mtimes/permissions preserved)."""
    for rel in walk_files(src):
        write_bytes(os.path.join(dst, rel), read_bytes(os.path.join(src, rel)))


_PLACEHOLDER = re.compile(r'\{\{(RID|ENTRY|HELP|BOOK|CSS|TRAIN)\}\}')


def has_placeholder(s):
    return bool(_PLACEHOLDER.search(s))


def expand_placeholders(s, rel):
    """Expand the release placeholders in a page-phase replacement string."""
    table = {'RID': rel['rid'], 'ENTRY': rel['entry'], 'HELP': rel['help'], 'BOOK': rel['bookmark'],
             'CSS': rel['css'], 'TRAIN': rel['train']}
    return _PLACEHOLDER.sub(lambda m: table[m.group(1)], s)


CRLF, LF = chr(13) + chr(10), chr(10)


def is_pure_crlf(text):
    """True when every line break of `text` is CRLF (at least one)."""
    return CRLF in text and LF not in text.replace(CRLF, '')


def eol_adapt(text, s):
    """Patch strings are authored with LF.  When the TARGET text is pure CRLF (index.html since the 2026-09-30 re-baseline, several legacy
    pages) an LF-only string is converted to CRLF so the same anchor matches and the inserted text keeps the file's line endings.  A string
    that already contains a CRLF is left exactly as authored (the existing page patches for CRLF pages spell their CRLF out).  The anchor
    count assertion stays strict either way."""
    if LF in s and CRLF not in s and is_pure_crlf(text):
        return s.replace(LF, CRLF)
    return s
