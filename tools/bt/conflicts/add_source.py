#!/usr/bin/env python3
"""Append one source to the ledger docs/battle-theatre/GOVERNANCE/conflicts/SOURCES.md (section 10, append-only, under a file lock).

    python3 -I tools/bt/conflicts/add_source.py --id HOOD-1880 --class book --title "Advance and Retreat" --author "J. B. Hood" --date 1880 \\
        --text tmp/library/conflicts/C-005/hood-1880_djvu.txt --url https://archive.org/details/<identifier> --kind postwar_narrative \\
        --notes "fetched 2026-11-17 from https://archive.org/cors/<identifier>/<identifier>_djvu.txt for C-005"
    python3 -I tools/bt/conflicts/add_source.py --from-town ID        adopt a row of docs/battle-theatre/town/SOURCES.md (re-hashed here)
    python3 -I tools/bt/conflicts/add_source.py --from-life ID        adopt a row of docs/battle-theatre/life/evidence/sources.json
    python3 -I tools/bt/conflicts/add_source.py ... --dry-run         print the row, append nothing

The program computes the sha256, the page model (markers when the text carries `=== PAGE n ===` lines, else none) and the format; it refuses a duplicate id, a
text path that another row already carries, a path outside tmp/library/ or docs/battle-theatre/, and a text of fewer than 3000 bytes (a failed scan). The class is one
of primary, official, book, lead (PLAN.md section 4). A row is never edited or deleted: to correct one, append a new id and say so in notes.
Download first (one request per second, public sources only, a failure is recorded), then run this; never write the row by hand unless you append one complete line.
"""
import fcntl
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cfl_lib as L
import build_sources as B

L.utf8_stdout()
KINDS = ('order_or_dispatch', 'official_report', 'private_letter_or_diary', 'newspaper_1863', 'early_narrative', 'postwar_narrative', 'later_history', 'proceedings_or_tablet',
         'reference_table', 'institutional', 'lead', 'mixed')


def parse(argv):
    opts, i = {}, 0
    flags = set()
    while i < len(argv):
        a = argv[i]
        if a in ('--dry-run',):
            flags.add(a)
            i += 1
        elif a.startswith('--') and i + 1 < len(argv):
            opts[a[2:]] = argv[i + 1]
            i += 2
        else:
            print('unexpected argument %r' % a)
            sys.exit(2)
    return opts, flags


def main(argv):
    if not argv or '-h' in argv or '--help' in argv:
        print(__doc__)
        return 2
    opts, flags = parse(argv)
    ctx = L.new_ctx()
    led = ctx.ledger()
    T = L.town()
    row = None
    if 'from-town' in opts:
        tl = T.Ctx(L.ROOT).ledger()
        r = tl.get(opts['from-town'])
        if r is None:
            print('%r is not in the town ledger' % opts['from-town'])
            return 1
        opts = {'id': r['id'], 'class': r.get('class'), 'title': r.get('title'), 'author': '-', 'date': r.get('date'), 'text': r.get('text'), 'url': r.get('url'), 'kind': None,
                'rights': r.get('rights'), 'notes': 'adopted from docs/battle-theatre/town/SOURCES.md on %s; %s' % (L.today(), r.get('notes') or '')}
    elif 'from-life' in opts:
        ls = {s['id']: s for s in L.load_json(os.path.join(L.BT, 'life', 'evidence', 'sources.json'))['sources']}
        s = ls.get(opts['from-life'])
        if s is None:
            print('%r is not in the life registry' % opts['from-life'])
            return 1
        cls = {'park_report': 'official', 'newspaper_1863': 'primary', 'official_report': 'primary', 'official_correspondence': 'primary', 'official_other': 'primary'}.get(s.get('class'), 'book')
        opts = {'id': s['id'], 'class': cls, 'title': s.get('title'), 'author': '-', 'date': s.get('date'), 'text': s.get('local_path'), 'url': ('https://archive.org/details/' + s['archive_identifier']) if s.get('archive_identifier') else '-',
                'kind': None, 'rights': 'public domain', 'notes': 'adopted from docs/battle-theatre/life/evidence/sources.json on %s (life class %s)' % (L.today(), s.get('class'))}
    for k in ('id', 'class', 'title', 'text'):
        if not opts.get(k):
            print('--%s is required' % k)
            return 2
    sid = opts['id']
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]{1,60}', sid):
        print('id %r: letters, digits, dot, hyphen and underscore, 2 to 61 characters' % sid)
        return 1
    if sid in led:
        print('id %s is already in the ledger' % sid)
        return 1
    if opts['class'] not in T.SOURCE_CLASSES:
        print('class must be one of %s' % ', '.join(T.SOURCE_CLASSES))
        return 1
    path = opts['text'].replace('\\', '/')
    if '..' in path.split('/') or path.startswith('/') or not (path.startswith('tmp/library/') or path.startswith('docs/battle-theatre/')):
        print('text path %r must be repository-relative under tmp/library/ or docs/battle-theatre/' % path)
        return 1
    if '{part}' in path:
        print('a family of parts (a path with {part}) is added by hand: put a MANIFEST.sha256 in the folder, list every part there, and append one complete row')
        return 1
    ap = os.path.join(L.ROOT, path)
    if not os.path.isfile(ap):
        print('the text %s does not exist' % path)
        return 1
    if os.path.getsize(ap) < 3000:
        print('the text has only %d bytes: a failed scan is not citable' % os.path.getsize(ap))
        return 1
    for k, r in led.items():
        if k != '__duplicates__' and r.get('text') == path:
            print('the text %s is already the text of source %s' % (path, k))
            return 1
    kind = opts.get('kind')
    if kind and kind not in KINDS:
        print('kind must be one of %s' % ', '.join(KINDS))
        return 1
    notes = opts.get('notes') or ''
    if not re.search(r'20\d\d-\d\d-\d\d', notes):
        notes = (notes + ' ' if notes else '') + 'added %s' % L.today()
    row = B.build_row(sid, opts['class'], opts['title'], opts.get('author'), opts.get('date'), path, opts.get('rights') or '-', opts.get('url') or '-', notes, kind=kind)
    if row is None:
        print('cannot build the row')
        return 1
    line = '| ' + ' | '.join(B.cell(row[c]) for c in B.COLS) + ' |'
    print(line)
    if '--dry-run' in flags:
        return 0
    lock = L.SOURCES_MD + '.lock'
    with open(lock, 'a') as lf:
        fcntl.flock(lf, fcntl.LOCK_EX)
        with open(L.SOURCES_MD, encoding='utf-8', newline='') as f:
            cur = f.read()
        if re.search(r'^\| ' + re.escape(sid) + r' \|', cur, re.M):
            print('id %s was appended meanwhile by another researcher' % sid)
            return 1
        last = cur.rstrip('\n').split('\n')[-1]
        if not (last.startswith('|') or last.startswith('<!-- APPEND-ONLY')):
            print('the last line of SOURCES.md is not part of the section-10 table: refusing to append')
            return 1
        with open(L.SOURCES_MD, 'a', encoding='utf-8', newline='\n') as f:
            if not cur.endswith('\n'):
                f.write('\n')
            f.write(line + '\n')
        fcntl.flock(lf, fcntl.LOCK_UN)
    c2 = L.new_ctx()
    got = c2.ledger().get(sid)
    if not got or got.get('text') != path:
        print('WARNING: the appended row does not parse back; check the last line of SOURCES.md')
        return 1
    print('appended %s (%s, pages %s, %d bytes)' % (sid, got.get('class'), got.get('pages'), os.path.getsize(ap)))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
