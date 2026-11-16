#!/usr/bin/env python3
"""Seed docs/battle-theatre/GOVERNANCE/conflicts/SOURCES.md (the ledger of the sources the conflict research may cite) and ledger-families.json.

    python3 -I tools/bt/conflicts/build_sources.py            rebuild sections 1-9 (section 10, the rows researchers appended, is kept byte for byte)
    python3 -I tools/bt/conflicts/build_sources.py --check    re-hash every local text of the ledger (exit 1 on a missing file or a changed hash)

The ledger is read by tools/bt/conflicts/validate_resolution.py through the engine of tools/bt/town/validate_evidence.py (parse_ledger, check_cite): the first column is
`id`, and the columns `class` (primary | official | book | lead), `text`, `sha256` and `pages` (markers | or27 | none) mean what they mean there. This ledger adds `author`,
`format` and `kind` (the usual kind of writing of the source: the citation's own `written` block states the real date and kind of the passage).
Seeded from the town ledger (docs/battle-theatre/town/SOURCES.md, read only), the library indexes (GOVERNANCE/library/acquired*.json) and the files on disk; every
hash is computed here from the file. New sources are appended with tools/bt/conflicts/add_source.py (see section 1 of the ledger).
"""
import collections
import glob
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cfl_lib as L

COLS = ['id', 'class', 'title', 'author', 'date', 'text', 'sha256', 'pages', 'format', 'kind', 'rights', 'url', 'notes']
MARK = '<!-- APPEND-ONLY BELOW: tools/bt/conflicts/add_source.py appends here; rebuilds of sections 1-9 keep everything under this line -->'

# town-ledger ids that have nothing to say about the 47 conflicts (buildings, maps, college catalogues, claims lists): not seeded; add_source.py --from-town ID adopts any of them
EXCLUDE_WEB = re.compile(r'^(NPS-HABS|NPS-NEWSLETTER|NPS-TOURIST|NPS-TRAILS|NPSGOV-(NATURE|NEWS|EISE|ART))')
EXCLUDE = re.compile(r'^(HABS|PACOLLEGE|WARREN|HOPKINS|SANBORN|LOC-PHOTO|SEM-IMAGES|WAUD|WENTZ|RUPP|WARCLAIMS|ADAMS-SENTINEL-OTHER|GBG-COMPILER-OTHER|CENSUS|NPS-ROAD|LOC-CA|BACHELDER-18|COPE|HOTCHKISS|ELLIOTT|GNMP-1900|WOELTJE|NY-MONUMENTS|PLAN-PDF|CONEWAGO|NPS-DESIGN|NPS-EISE|NPS-GETTYSBURG-COLLEGE|NPS-BRYAN|NPS-DCP-GUINN|NPS-NRCA|NPS-BRT-ECOLOGY|NPSGOV-(GRASSLANDS|PLANTS|NATURAL|PLANNING|BATTLEFIELD-REHAB))')

KIND_BY_ID = {
    'FREMANTLE-1864': 'private_letter_or_diary', 'HASKELL-1908': 'private_letter_or_diary', 'JACOBS-1864': 'early_narrative', 'HOSPSCENES-1864': 'early_narrative',
    'BACH-KEY-1864': 'early_narrative', 'LETTERMAN-1866': 'early_narrative', 'MEADE-LL-v1': 'private_letter_or_diary', 'MEADE-LL-v2': 'private_letter_or_diary',
    'LONGSTREET-1896': 'postwar_narrative', 'ALEXANDER-1907': 'postwar_narrative', 'BL-3': 'postwar_narrative', 'TPIERCE-1889': 'postwar_narrative',
    'HOKE-1887': 'later_history', 'LOSSING-FIELDBOOK-V3': 'later_history', 'PIERCE-F-1914': 'later_history', 'BACH-REPULSE-1870': 'early_narrative',
    'BACH-STORY-1904': 'postwar_narrative', 'BACH-WHATTOSEE-1873': 'postwar_narrative', 'BACH-WHATTOSEE-1889': 'postwar_narrative', 'FOX-1889': 'reference_table',
    'DTIC-ADA207999': 'later_history', 'USSM-1864-V1': 'early_narrative', 'USSC-GETTYSBURG-1863': 'official_report', 'SOUDER-LEAVES-1864': 'private_letter_or_diary',
    'MN-1ST-1916': 'later_history', 'OH-8TH-1889': 'postwar_narrative', 'BARTON-ANGELS-1898': 'later_history', 'HISTORY-ADAMS-1886': 'later_history',
    'CEM-REPORT-1867': 'official_report', 'CEM-INDIANA-1865': 'official_report', 'MA-BURIAL-1863': 'official_report', 'EVERETT-1864': 'early_narrative',
    'CEM-BARTLETT-1874': 'proceedings_or_tablet', 'NJ-TOOMBS-1888': 'later_history',
}


def kind_for(sid, cls, title):
    if sid in KIND_BY_ID:
        return KIND_BY_ID[sid]
    if cls == 'lead':
        return 'lead'
    if sid.startswith(('OR27-', 'OR-', 'ORSER')):
        return 'mixed'
    if sid.startswith(('ADAMS-SENTINEL', 'GBG-COMPILER', 'CA-1863')):
        return 'newspaper_1863'
    if sid.startswith('NPS'):
        return 'institutional'
    if sid.startswith('SHSP'):
        return 'postwar_narrative'
    if re.match(r'^(NY|PA|ME|MI|VT|NJ|OH|IN|MA|CT|DE|MD|WI|MN|NH|RI|WV)-', sid):
        return 'proceedings_or_tablet'
    if cls == 'primary':
        return 'mixed'
    return 'later_history'


def cell(s):
    s = '' if s is None else str(s)
    return ' '.join(s.replace('|', '/').split()) or '-'


def fmt_of(path, text_head):
    b = os.path.basename(path)
    if b.endswith('.jsonl'):
        return 'json lines'
    if b.endswith('.json'):
        return 'json'
    if b.endswith('.md'):
        return 'markdown'
    if b.endswith('_djvu.txt'):
        return 'djvu OCR text of a scanned book or paper, no page marks (raw, unproofread)'
    if re.search(r'^=== PAGE \d+ ===\s*$', text_head, re.M):
        return 'text layer of a PDF with === PAGE n === markers (n is the PDF page index)'
    return 'plain text'


def pages_of(path, sid):
    if sid.startswith('OR27-'):
        return 'or27'
    try:
        with open(path, encoding='utf-8', errors='replace', newline='') as f:
            head = f.read(2000000)
    except OSError:
        return 'none'
    return 'markers' if re.search(r'^=== PAGE \d+ ===\s*$', head, re.M) else 'none'


def build_row(sid, cls, title, author, date, path, rights, url, notes, kind=None):
    ap = os.path.join(L.ROOT, path)
    if '{part}' in path:
        sha, pages, fmt = '-', 'none', 'one plain text per part (a weekly issue, a newspaper page)'
    else:
        if not os.path.exists(ap):
            return None
        sha = L.sha256_file(ap)
        pages = pages_of(ap, sid)
        with open(ap, encoding='utf-8', errors='replace', newline='') as f:
            head = f.read(400000)
        fmt = fmt_of(path, head)
    if '{part}' not in path and os.path.getsize(ap) < 3000 and cls != 'lead':
        notes = 'WARNING: the local text has only %d bytes (a failed scan): a stub, not citable. ' % os.path.getsize(ap) + (notes or '')
    return dict(id=sid, **{'class': cls}, title=title, author=author or '-', date=date or '-', text=path, sha256=sha, pages=pages, format=fmt,
                kind=kind or kind_for(sid, cls, title), rights=rights or '-', url=url or '-', notes=notes or '-')


def gather():
    T = L.town()
    ctx = T.Ctx(L.ROOT)
    led = ctx.ledger()
    a2 = {i['id']: i for i in L.load_json(os.path.join(L.GOV, 'library', 'acquired_2.json'))['items']}
    a3 = {i['id']: i for i in L.load_json(os.path.join(L.GOV, 'library', 'acquired_3.json'))['items']}
    a1 = {i['source_id']: i for i in L.load_json(os.path.join(L.GOV, 'library', 'acquired.json'))['items']}
    life = {s['id']: s for s in L.load_json(os.path.join(L.BT, 'life', 'evidence', 'sources.json'))['sources']}
    secs = collections.OrderedDict((k, []) for k in ('or', 'books', 'news', 'nps', 'medical', 'other', 'leads'))
    seen_paths = {}

    def add(sec, row):
        if row is None:
            return
        key = row['text']
        if key in seen_paths:
            return
        seen_paths[key] = row['id']
        secs[sec].append(row)

    def meta(sid, row):
        i = a2.get(sid) or a3.get(sid) or {}
        author = i.get('creator') or ''
        if isinstance(author, list):
            author = '; '.join(str(a) for a in author[:3])
        author = re.sub(r'\s*\[from old catalog\]', '', str(author))[:140]
        if not author and sid.startswith(('NPS', 'GNMP')):
            author = 'National Park Service'
        if not author and sid.startswith('OR'):
            author = 'War Department (compiled), US Government Printing Office'
        return author

    order = list(led.keys())
    for sid in order:
        if sid == '__duplicates__':
            continue
        r = led[sid]
        if EXCLUDE.match(sid):
            continue
        t = r.get('text', '')
        cls = r.get('class')
        if (not t or t in ('-', 'none')) and cls != 'lead':
            continue
        if cls == 'lead':
            continue            # the leads are written by lead_rows() below, with their PDF keys
        if sid.startswith('OR27-') or sid in ('OR-25-1', 'OR-29-1', 'ORSER3-v2'):
            sec = 'or'
        elif sid.startswith('NPS'):
            sec = 'nps'
        elif sid.startswith(('ADAMS-SENTINEL', 'GBG-COMPILER', 'CA-1863')):
            sec = 'news'
        elif sid.startswith(('USSC', 'SOUDER', 'LETTERMAN')):
            sec = 'medical'
        else:
            sec = 'books'
        notes = r.get('notes') or '-'
        row = build_row(sid, cls, r.get('title'), meta(sid, r), r.get('date'), t, r.get('rights'), r.get('url'), notes)
        if row:
            add(sec, row)
    # the library index of workstream 9 and the web index: items the town ledger did not carry
    for sid, i in list(a2.items()):
        p = i.get('local_path')
        if p and p not in seen_paths and not EXCLUDE.match(sid) and not sid.startswith(('ADAMS-SENTINEL-1863-', 'GBG-COMPILER-1863-')):
            cls = 'book'
            row = build_row(sid, cls, i.get('title'), i.get('creator'), i.get('date'), p, i.get('licence_basis'), i.get('details_url'), 'acquired %s from archive.org %s; raw OCR text, unverified' % ((i.get('fetched_at') or '')[:10], i.get('archive_identifier')))
            add('books', row)
    for sid, i in list(a3.items()):
        p = i.get('local_path')
        if p and p.endswith('.txt') and p not in seen_paths and not EXCLUDE.match(sid) and not EXCLUDE_WEB.match(sid) and sid.startswith('NPS'):
            row = build_row(sid, 'official', i.get('title'), i.get('creator') or 'National Park Service', i.get('date'), p, i.get('rights_basis'), i.get('url'), 'acquired %s; %s' % ((i.get('fetched_at') or '')[:10], i.get('text_quality') or ''))
            add('nps', row)
    # medical library (Official statistics and the surgeons' reports on the wounded)
    for sid, rel in (('MSHWR-P1V2-1870', 'tmp/library/medical/MSHWR-P1V2-1870/MSHWRSurgical1_djvu.txt'),):
        if os.path.exists(os.path.join(L.ROOT, rel)):
            add('medical', build_row(sid, 'primary', 'The Medical and Surgical History of the War of the Rebellion, Part I, Volume II (Surgical History; Washington, 1870): tables of the wounded of the principal battles', 'Surgeon General\'s Office (J. K. Barnes), US Army', '1870', rel, 'public domain (US government publication)', 'https://archive.org/', 'text of the archive.org item as saved by the medical workstream (docs/battle-theatre/medical/SOURCES.md)', kind='reference_table'))
    return secs, led


def lead_rows():
    rows = []
    shard = [
        ('LEAD-R03-1', 'docs/battle-theatre/GOVERNANCE/horde/r03-1/results.jsonl', 'First research pass on C-001..C-023 (shard r03-1, 2026-11-04): per conflict the Official Records passages found, tiers and register proposals'),
        ('LEAD-R03-2', 'docs/battle-theatre/GOVERNANCE/horde/r03-2/results.jsonl', 'First research pass on C-024..C-047 (shard r03-2, 2026-11-04)'),
        ('LEAD-R03-1-REPORT', 'docs/battle-theatre/GOVERNANCE/horde/r03-1/REPORT.md', 'Report of shard r03-1'),
        ('LEAD-R03-2-REPORT', 'docs/battle-theatre/GOVERNANCE/horde/r03-2/REPORT.md', 'Report of shard r03-2'),
        ('LEAD-CLAIM-CHECKS', 'docs/battle-theatre/library/or27_claim_checks.json', 'Library claim checks of Official Records passages (second local witness of OR27 quotes)'),
        ('LEAD-CLAIM-CHECKS-MD', 'docs/battle-theatre/library/OR27-CLAIM-CHECKS.md', 'Notes to the library claim checks'),
        ('LEAD-AUDIT-T1', 'docs/battle-theatre/library/timeline_audit_T1.jsonl', 'Official Records audit of the Jul 1 timeline rows (T1-xxx)'),
        ('LEAD-AUDIT-T2', 'docs/battle-theatre/library/timeline_audit_T2.jsonl', 'Official Records audit of the Jul 2 timeline rows (T2-xxx)'),
        ('LEAD-AUDIT-T3', 'docs/battle-theatre/library/timeline_audit_T3.jsonl', 'Official Records audit of the Jul 3 and later timeline rows (T3-xxx)'),
    ]
    for i in range(1, 13):
        shard.append(('LEAD-TL-%02d' % i, 'docs/battle-theatre/GOVERNANCE/horde/tl-%02d/results.jsonl' % i, 'Timeline shard tl-%02d: per timeline row the verdict, citation and notes of the verification pass' % i))
    for nm in ('tl-01', 'tl-02', 'tl-03', 'tl-04', 'web-lookups', 'web-newspapers', 'web-nps-landscape', 'web-photomatch'):
        shard.append(('LEAD-TLCORR-' + nm.upper(), 'docs/battle-theatre/GOVERNANCE/timeline_corrections/%s.jsonl' % nm, 'Timeline corrections file %s (citations with page and offset, scenarios)' % nm))
    for nm in ('fence-1', 'fence-2', 'fence-3', 'terrain-1', 'terrain-2', 'sources-a', 'web-lookups', 'web-newspapers', 'web-nps-landscape', 'web-photomatch'):
        shard.append(('LEAD-EVCORR-' + nm.upper(), 'docs/battle-theatre/GOVERNANCE/evidence_corrections/%s.jsonl' % nm, 'Evidence corrections file %s' % nm))
    for sid, p, title in shard:
        ap = os.path.join(L.ROOT, p)
        if not os.path.exists(ap):
            continue
        r = build_row(sid, 'lead', title, 'working notes of the project (not a source)', '2026-11', p, 'project file', '-', 'a lead: it points to passages, it proves nothing and cannot make a value documented or inferred (Law 4); read the passage in the primary text it names', kind='lead')
        if r and re.search(r'/horde/tl-\d|/timeline_corrections/|/evidence_corrections/', p):
            r['sha256'] = '-'
            r['notes'] = 'a living working file of another workstream (rewritten while it works): not hash-pinned, its offsets drift. ' + r['notes']
        rows.append(r)
    return [r for r in rows if r]


PDF_LEADS = [
    ('PDF-EPP', 'J. F. Epperson timeline (web page; PDF key EPP)', 'terse, unreferenced; the plan calls it weak and says some of its times disagree with better sources'),
    ('PDF-CWT', 'Civil War Talk forum threads (PDF keys CWT, CWT-SHERFY, CWT-WHEAT, CALEF-CWT)', 'forum, low reliability'),
    ('PDF-PADRE', 'Padre Steve, Confederate deployments (blog; PDF key PADRE)', 'blog'),
    ('PDF-WIKI', 'Wikipedia pages (PDF keys W-D1, W-D2, W-PC, W-GC, W-RET, OOB-C ...)', 'encyclopaedia, not a source'),
    ('PDF-SS', 'Stone Sentinels timelines (PDF keys SS1, SS2, SS-CALEF ...)', 'a website that compiles from the Official Records and later accounts; a lead until its page is read and its own source found'),
    ('PDF-FREE', 'Freeman, R. E. Lee, appendix on times, as shown on the Thayer site (PDF key FREE)', 'a book of 1934-35 that is in copyright; the Thayer page is a lead until the passage is read'),
    ('PDF-HESS', 'Hessler, The Peach Orchard (PDF key HESS)', 'a modern book (not public domain); its footnotes point to the Official Records'),
    ('PDF-PHIF', 'Phifer, Warfare History Network, Peach Orchard day 2 (PDF key PHIF)', 'a magazine article'),
    ('PDF-OLLI', 'OLLI course handout 5 (PDF key OLLI)', 'course handout'),
    ('PDF-WHN', 'Warfare History Network, HistoryNet and other magazine pages (PDF keys WHN-*, HN-*)', 'magazine pages'),
]


def render(secs, leads):
    out = []
    w = out.append
    w('# Source ledger: the research of the 47 source conflicts (C-001..C-047)')
    w('')
    w('Written for the resolution files `docs/battle-theatre/GOVERNANCE/conflicts/resolutions/C-0xx.json` and read by `tools/bt/conflicts/validate_resolution.py`, which takes the source classes, the local text paths, '
      'the hashes and the page model of every citation from the tables of this file (through the engine of `tools/bt/town/validate_evidence.py`: `parse_ledger`, `check_cite`). '
      'Seeded by `tools/bt/conflicts/build_sources.py` on %s from the town ledger (read only), the library indexes `GOVERNANCE/library/acquired*.json` and the files on disk; every hash below was computed from the file.' % L.today())
    w('')
    w('## 1. How a citation uses this ledger, and how to add a source')
    w('')
    w('- `id` is what a citation writes in `source`. `class` decides what the source may do: **primary** (made in 1863-1869 by a witness or an official actor, or a page of a paper of 1863, or a compiled Official Records volume), '
      '**official** (a Park Service, Library of Congress or National Archives record), **book** (any later published account, public domain), **lead** (a web page, an encyclopaedia, a forum, a blog, a project working file: '
      'it points to a primary source, it never proves; a lead cannot make a value documented or inferred, and a default never rests on a lead alone).')
    w('- `text` is the repository-relative path of the local text the quote is matched in. A path with `{part}` is a family of texts (one issue, one newspaper page): the citation names the part. `-` means there is no local text: the source cannot be quoted yet.')
    w('- `pages` is the page model: `or27` (Official Records vol. 27: the citation\'s `part` is a record id of `docs/battle-theatre/library/or27_index.json`, e.g. `OR27-1-R006`, and `page` is the printed page of the scan leaf, DD-TL02-04 item 4); '
      '`markers` (the text carries `=== PAGE n ===` lines: `page` is that n, the PDF page index, and `printed_page` may carry the printed number); `none` (the text has no page marks: `page` is the printed page as read in the text or on the page image, or null with `page_note`).')
    w('- Offsets are character offsets into the file decoded as UTF-8 with `newline=\'\'` (the convention of `tools/bt/or27_lib.py`). `tools/bt/or27_find.py` prints them for the Official Records; `tools/bt/conflicts/find_passage.py` prints them for every other text of this ledger.')
    w('- `kind` is the usual kind of writing of the source (order_or_dispatch, official_report, private_letter_or_diary, newspaper_1863, early_narrative, postwar_narrative, later_history, proceedings_or_tablet, reference_table, institutional, lead, mixed). '
      'It is a hint: the citation\'s own `written` block states the date and kind of the passage, because one book holds several (the letters in Meade\'s Life and Letters were written in 1863; the narrative around them in 1913).')
    w('- **To add a source** (a text you fetched, or a source of the town ledger or the life registry you want to cite): run `python3 -I tools/bt/conflicts/add_source.py --id NEWID --class primary|official|book|lead --title "..." --author "..." --date "..." --text tmp/library/conflicts/<C-0xx>/<file>.txt --url https://... --kind <kind> --notes "..."` '
      '(it computes the hash, the page model and the format, refuses a duplicate id or a path that is already in the ledger, and appends one row under the marker line of section 10 under a file lock). '
      '`--from-town ID` adopts a row of docs/battle-theatre/town/SOURCES.md, `--from-life ID` a row of life/evidence/sources.json. Downloads go under `tmp/library/conflicts/<C-0xx>/` with at most one request per second; the ledger row carries the url and the date fetched in `notes`. '
      'A hand-written row is allowed only as a single shell `>>` append of one complete line under the marker; never rewrite the file.')
    w('- Public sources only, one request per second, no login, no CAPTCHA, no bot-block circumvention; a refusal is recorded in a failed lookup, never worked around.')
    w('- `python3 -I tools/bt/conflicts/build_sources.py --check` re-hashes every local text of this ledger.')
    w('')
    titles = collections.OrderedDict([
        ('or', ('2. The Official Records (the primary record of the campaign; public domain, US government publication)', 'Series I volume 27 in three parts holds the reports, returns and correspondence of the campaign; the other volumes are here for the Chancellorsville and Falling Waters background, and for Series III. Search with `tools/bt/or27_find.py`.')),
        ('books', ('3. Books, reports, proceedings and papers already local (tmp/library/ws9; public domain)', 'Memoirs and narratives are weighed as reminiscence unless the passage itself was written in 1863 (a letter, a diary): see PLAN.md section 5.')),
        ('news', ('4. Newspapers of 1863', 'The Gettysburg weeklies (the Compiler and the Sentinel) and the pages of Chronicling America saved by the web workstream; a family of texts: the citation names the part (the issue date, or `<lccn>/<date>/ed-1/seq-<n>`).')),
        ('nps', ('5. National Park Service documents and pages (tmp/library/web/nps; United States government works)', 'Reading-order text with `=== PAGE n ===` markers (n is the PDF page index). A modern study relays the record: it is weighed as institutional text unless it quotes a primary passage, and then the primary passage is cited.')),
        ('medical', ('6. Medical library texts', 'Surgeons\' reports and statistics of the wounded; the medical workstream keeps its own ledger (docs/battle-theatre/medical/SOURCES.md).')),
        ('other', ('7. Other local texts', 'Texts on disk that no index lists are added here by `add_source.py`.')),
        ('leads', ('8. Leads: project working files and the web sources the PDF names (class lead)', 'These point; they prove nothing. The project working files are the shards of the horde and the correction files: read the passage they cite in its primary text and cite that. The PDF web sources have no local text (`-`).')),
    ])
    for key, (title, intro) in titles.items():
        w('## ' + title)
        w('')
        w(intro)
        w('')
        w('| ' + ' | '.join(COLS) + ' |')
        w('|' + '---|' * len(COLS))
        rows = secs.get(key, [])
        if key == 'leads':
            rows = leads
        for r in rows:
            w('| ' + ' | '.join(cell(r[c]) for c in COLS) + ' |')
        if key == 'leads':
            for sid, title2, note in PDF_LEADS:
                r = dict(id=sid, **{'class': 'lead'}, title=title2, author='-', date='-', text='-', sha256='-', pages='none', format='web page (no local text)', kind='lead', rights='-', url='-', notes=note)
                w('| ' + ' | '.join(cell(r[c]) for c in COLS) + ' |')
        w('')
    return out


def section9_and_10(keep10):
    out = []
    w = out.append
    w('## 9. Planned sources (reachable hosts; acquired by the research of a conflict, then appended in section 10 under the same id)')
    w('')
    cand = os.path.join(L.TMP, 'candidates_probe.json')
    if os.path.exists(cand):
        d = L.load_json(cand)
        w('Probed %s with the metadata API of archive.org (one request per second). `text` is `-` until a researcher fetches the file; the row cannot be cited before then.' % d.get('probed'))
        w('')
        w('| ' + ' | '.join(COLS) + ' |')
        w('|' + '---|' * len(COLS))
        for c in d['items']:
            r = dict(id=c['id'], **{'class': c['class']}, title=c['title'], author=c.get('author') or '-', date=c.get('date') or '-', text='-', sha256='-', pages='none', format=c.get('format') or 'djvu OCR text (not fetched)', kind=c.get('kind') or 'later_history', rights='public domain (pre-1929 US publication)' if c['status'] == 'reachable' else '-', url=c.get('url') or '-', notes=c['notes'])
            w('| ' + ' | '.join(cell(r[k]) for k in COLS) + ' |')
    else:
        w('(run tools/bt/conflicts/probe_candidates.py to list the planned sources)')
    w('')
    if keep10 is None:
        w('## 10. Acquired by the conflict researchers (append-only)')
        w('')
        w('One row per newly acquired source, appended by `tools/bt/conflicts/add_source.py` (or by one shell `>>` of one complete line) under the marker line, in the column order of the tables above. Never edit or delete a row; to correct one, append a row with a new id and say so in `notes`.')
        w('')
        w('| ' + ' | '.join(COLS) + ' |')
        w('|' + '---|' * len(COLS))
        w(MARK)
    else:
        out.append(keep10)
    return out


def build():
    secs, led = gather()
    leads = lead_rows()
    keep10 = None
    if os.path.exists(L.SOURCES_MD):
        cur = L.read_text(L.SOURCES_MD)
        i = cur.find('## 10. Acquired by the conflict researchers')
        if i >= 0:
            keep10 = cur[i:].rstrip('\n')
    lines = render(secs, leads)
    tail = section9_and_10(keep10)
    text = '\n'.join(lines + tail)
    if not text.endswith('\n'):
        text += '\n'
    os.makedirs(L.CONF, exist_ok=True)
    with open(L.SOURCES_MD, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    # families
    ctx = L.new_ctx()
    T = L.town()
    fams = {}
    for sid, row in ctx.ledger().items():
        if sid == '__duplicates__' or '{part}' not in row.get('text', ''):
            continue
        parts = {}
        for part, relp in T.list_texts(ctx, sid):
            parts[part] = L.sha256_file(os.path.join(L.ROOT, relp))
        if parts:
            fams[sid] = parts
    L.dump_json(L.FAMILIES_JSON, {'_doc': 'sha256 of every part of the families of texts of SOURCES.md (a weekly issue, a newspaper page), computed by tools/bt/conflicts/build_sources.py on %s; read by the validator (check_cite) to prove that a text did not change since its offsets were recorded' % L.today(), 'families': fams}, indent=None)
    counts = {k: len(v) for k, v in secs.items()}
    counts['leads'] = len(leads) + len(PDF_LEADS)
    print('SOURCES.md written:', counts, '| families', {k: len(v) for k, v in fams.items()})


def check():
    ctx = L.new_ctx()
    T = L.town()
    ok, errs, n = T.check_ledger(ctx)
    print('ledger: %d sources with a local text checked; %s' % (n, 'OK' if ok else 'FAIL'))
    for e in errs[:80]:
        print('  ERROR', e)
    return 0 if ok else 1


if __name__ == '__main__':
    L.utf8_stdout()
    if '--check' in sys.argv:
        sys.exit(check())
    build()
