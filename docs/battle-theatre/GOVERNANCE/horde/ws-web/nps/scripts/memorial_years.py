#!/usr/bin/env python3
"""Per-memorial years from the chronology tables of the National Park Service Cultural Landscapes Inventories
(workstream bt-web, task nps-landscape; answers the request GOVERNANCE/horde/requests/ws-world-memorial-years-for-web.md).

One row per memorial NAMED in a 'Memorialized' entry of the chronology tables of NPS-CLI-PCB, NPS-CLI-LRT and NPS-CLI-ERR
(and, from the park-wide inventory NPS-CLI-LANDSCAPE, the two entries that name a memorial). A table cell that lists several
memorials gives one row each. Nothing is matched to the site's own names here (that is the requester's job).

How a row is made (nothing is retyped):
  * the entry is cut from the saved reading-order text of the report (tmp/library/web/nps/<ID>/<ID>.txt), page by page; the
    page footer ('Cultural Landscapes Inventory Page n of m') is not part of the entry;
  * the items of the entry are the words of the list as printed: split at the semicolons (lists written with semicolons) or at the
    commas (lists of tablets and the like, in which no name contains a comma), or, for a sentence that names memorials, given in
    RULES below and then looked up in the entry (every item must be a substring of the entry, in order; the build stops otherwise);
  * `name_as_printed` is the item exactly as the entry prints it (the list word 'and' in front of the last item and one trailing
    full stop or semicolon removed); `name` is the same without a leading 'the'. Neither is matched to anything;
  * `quote` is the whole entry, verbatim, so that a card can show the report's own wording; `year`/`year_to` are the header years
    of the entry ('CE 1885 - 1886'); `text_years` are the years the entry's own sentence gives ('In 1909-1911'); when the two
    differ `years_differ` is true and both are carried.

Entries that name no memorial (anniversaries, fences, pillars, the unnamed guns of batteries) are not rows; each is listed with its
reason in extracts/memorial_years_left.json, so that nothing is hidden.

  memorial_years.py            build extracts/memorial_years.jsonl, memorial_years_left.json and memorial_years.md
  memorial_years.py --check    rebuild in memory and compare with the files (exit 1 on a difference)
  memorial_years.py --list     print the rows
Run with python3 -I.
"""
import hashlib, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
NPS = os.path.dirname(HERE)
ROOT = os.path.abspath(os.path.join(NPS, '..', '..', '..', '..', '..', '..'))
LIB = os.path.join(ROOT, 'tmp', 'library', 'web', 'nps')
OUT = os.path.join(NPS, 'extracts')
RETRIEVED = '2026-11-13'
SHORT = {'NPS-CLI-PCB': 'PCB', 'NPS-CLI-LRT': 'LRT', 'NPS-CLI-ERR': 'ERR', 'NPS-CLI-LANDSCAPE': 'LSC'}
CHRON_SOURCES = ('NPS-CLI-PCB', 'NPS-CLI-LRT', 'NPS-CLI-ERR')


def norm(s):
    return re.sub(r'\s+', ' ', s).strip()


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for c in iter(lambda: f.read(1 << 20), b''):
            h.update(c)
    return h.hexdigest()


def load_pages(sid, variant=None):
    p = os.path.join(LIB, sid, sid + ('.layout.txt' if variant == 'layout' else '.txt'))
    txt = open(p, encoding='utf-8').read()
    parts = re.split(r'^=== PAGE (\d+) ===\n', txt, flags=re.M)
    return {int(parts[i]): parts[i + 1] for i in range(1, len(parts), 2)}, sha256_file(p), os.path.relpath(p, ROOT)


FOOTER = re.compile(r'\s*Cultural Landscapes Inventory(?: Part \w+)? Page \d+(?: of \d+)?\s*$')
PRINTED = re.compile(r'Page (\d+) of (\d+)')
HEAD = re.compile(r'\b(CE|AD) (\d{4})(?: - (\d{4}))? Memorialized ')
NEXT = re.compile(r'\b(?:CE|AD) \d{4}(?: - \d{4})? [A-Z]')

# How each 'Memorialized' entry is read. Key: (source, pdf page, header years as printed [+ '#k' when the header repeats on the page]).
#   ('semi',)            'head: item; item; and item.'    items split at the semicolons after the first colon
#   ('semi_tail', S)     as 'semi', with the closing words S that are not part of the last item (kept in also_in_entry)
#   ('comma',)           'head: item, item, and item.'    items split at the commas after the first colon
#   ('items', [...])     the items are given (strings found in the entry, in order); an item may be (string, note)
#   ('none', reason)     the entry names no memorial
RULES = {
    # ---- Pickett's Charge Battlefield (NPS-CLI-PCB)
    ('NPS-CLI-PCB', 41, 'CE 1884'): ('semi',),
    ('NPS-CLI-PCB', 42, 'CE 1885 - 1886'): ('semi',),
    ('NPS-CLI-PCB', 42, 'CE 1886'): ('semi',),
    ('NPS-CLI-PCB', 42, 'CE 1888'): ('semi',),
    ('NPS-CLI-PCB', 42, 'CE 1889'): ('semi',),
    ('NPS-CLI-PCB', 42, 'CE 1892'): ('semi',),
    ('NPS-CLI-PCB', 42, 'CE 1893'): ('semi',),
    ('NPS-CLI-PCB', 43, 'CE 1896 - 1920#1'): ('items', ['Berdan Avenue', 'Birney Avenue', 'Confederate Avenue']),
    ('NPS-CLI-PCB', 43, 'CE 1896 - 1920#2'): ('semi',),
    ('NPS-CLI-PCB', 43, 'CE 1894 - 1915'): ('comma',),
    ('NPS-CLI-PCB', 43, 'CE 1896 - 1920#3'): ('comma',),
    ('NPS-CLI-PCB', 43, 'CE 1897'): ('semi',),
    ('NPS-CLI-PCB', 43, 'CE 1907'): ('comma',),
    ('NPS-CLI-PCB', 43, 'CE 1908'): ('semi',),
    ('NPS-CLI-PCB', 43, 'CE 1909'): ('comma',),
    ('NPS-CLI-PCB', 43, 'CE 1909 - 1910'): ('comma',),
    ('NPS-CLI-PCB', 44, 'CE 1910 - 1911'): ('comma',),
    ('NPS-CLI-PCB', 44, 'CE 1911 - 1912'): ('comma',),
    ('NPS-CLI-PCB', 44, 'CE 1913'): ('none', 'an anniversary: no memorial is named'),
    ('NPS-CLI-PCB', 44, 'CE 1913 - 1920'): ('semi',),
    ('NPS-CLI-PCB', 44, 'CE 1929'): ('semi',),
    ('NPS-CLI-PCB', 44, 'CE 1938'): ('items', ['The Peace Memorial']),
    ('NPS-CLI-PCB', 45, 'CE 1963#1'): ('none', 'an anniversary: no memorial is named'),
    ('NPS-CLI-PCB', 45, 'CE 1963#2'): ('semi',),
    ('NPS-CLI-PCB', 45, 'CE 1971'): ('semi_tail', ' Sponsor Tablet is also installed.'),
    ('NPS-CLI-PCB', 45, 'CE 1973'): ('semi_tail', ' is also installed.'),
    ('NPS-CLI-PCB', 45, 'CE 1982'): ('semi',),
    ('NPS-CLI-PCB', 45, 'CE 1998'): ('semi_tail', ' Includes two tablets: Biography and Battle History.'),
    ('NPS-CLI-PCB', 45, 'CE 2000'): ('semi',),
    # ---- Little Round Top (NPS-CLI-LRT)
    ('NPS-CLI-LRT', 29, 'CE 1863 - 1864'): ('items', ['Strong Vincent Inscribed Boulder', 'Weed-Hazlett Inscribed Boulder']),
    ('NPS-CLI-LRT', 29, 'CE 1878'): ('items', ['the Strong Vincent Marker']),
    ('NPS-CLI-LRT', 29, 'CE 1880 - 1890'): ('items', ['the 146th New York Infantry Monument']),
    ('NPS-CLI-LRT', 29, 'CE 1883 - 1889'): ('items', ['Weed and Hazlett Monument']),
    ('NPS-CLI-LRT', 30, 'CE 1884'): ('semi',),
    ('NPS-CLI-LRT', 30, 'CE 1885'): ('items', ['3rd Massachusetts Battery Monument']),
    ('NPS-CLI-LRT', 30, 'CE 1886'): ('semi',),
    ('NPS-CLI-LRT', 30, 'CE 1887'): ('items', ['Battery L, 1st Ohio Artillery Monument']),
    ('NPS-CLI-LRT', 30, 'CE 1888'): ('semi',),
    ('NPS-CLI-LRT', 30, 'CE 1889'): ('semi',),
    ('NPS-CLI-LRT', 30, 'CE 1890'): ('items', ['9th Pennsylvania Reserves (38th Infantry) Monument']),
    ('NPS-CLI-LRT', 30, 'CE 1893'): ('items', ['44th and 12th New York Infantry Monument']),
    ('NPS-CLI-LRT', 31, 'CE 1896 - 1920#1'): ('comma',),
    ('NPS-CLI-LRT', 31, 'CE 1896 - 1920#2'): ('semi',),
    ('NPS-CLI-LRT', 31, 'CE 1906 - 1907'): ('semi',),
    ('NPS-CLI-LRT', 31, 'CE 1907 - 1908'): ('semi',),
    ('NPS-CLI-LRT', 31, 'CE 1909 - 1910'): ('semi',),
    ('NPS-CLI-LRT', 31, 'CE 1911 - 1912'): ('comma',),
    ('NPS-CLI-LRT', 31, 'CE 1919'): ('items', ['United States Signal Corps Marker']),
    ('NPS-CLI-LRT', 31, 'CE 1938'): ('none', 'a reunion of veterans on the 75th anniversary: no memorial is named'),
    ('NPS-CLI-LRT', 32, 'CE 1988'): ('items', ['Brigadier General Samuel W. Crawford Statue']),
    # ---- Emmitsburg Road Ridge (NPS-CLI-ERR)
    ('NPS-CLI-ERR', 33, 'CE 1880'): ('none', 'the battery guns and shell pyramids that the GBMA placed from 1880 to mark Union batteries are not named individually; the saved text of this cell also carries the page heading words inside the entry'),
    ('NPS-CLI-ERR', 34, 'CE 1886'): ('items', ['the 16th Massachusetts Infantry Monument', 'the 118th Pennsylvania Infantry (2nd position) Monument']),
    ('NPS-CLI-ERR', 34, 'CE 1888'): ('comma',),
    ('NPS-CLI-ERR', 34, 'CE 1889'): ('items', ['the 120th New York Infantry Monument', 'the 150th New York Infantry Monument', 'the 105th Pennsylvania Infantry Monument',
                                               ('the 139th Pennsylvania Infantry Monument', 'the entry says this fourth monument is relocated into the project area in this year; it does not say when it was first erected')]),
    ('NPS-CLI-ERR', 34, 'CE 1892'): ('items', ['The 16th Vermont Infantry Monument']),
    ('NPS-CLI-ERR', 35, 'CE 1893'): ('comma',),
    ('NPS-CLI-ERR', 35, 'CE 1896'): ('none', 'shell and chain fencing placed in front of three tablets: the tablets are named only as the place of the fence'),
    ('NPS-CLI-ERR', 35, 'CE 1897'): ('none', 'stone pillars topped with shells at two road intersections: no memorial is named'),
    ('NPS-CLI-ERR', 35, 'CE 1900'): ('comma',),
    ('NPS-CLI-ERR', 35, 'CE 1901'): ('items', ['The Sickles (Wounded) Marker']),
    ('NPS-CLI-ERR', 36, 'CE 1907'): ('comma',),
    ('NPS-CLI-ERR', 36, 'CE 1910'): ('items', ['Humphreys’ Division Tablet']),
    ('NPS-CLI-ERR', 36, 'CE 1912'): ('comma',),
    ('NPS-CLI-ERR', 36, 'CE 1913#1'): ('none', 'an anniversary: no memorial is named'),
    ('NPS-CLI-ERR', 36, 'CE 1913#2'): ('items', ['General Sickles’ Headquarters Marker']),
    ('NPS-CLI-ERR', 36, 'CE 1914'): ('items', ['General Humphreys Monument']),
    ('NPS-CLI-ERR', 36, 'CE 1915'): ('items', [
        ('the 701\\ 7151, 72"\'1', 'the report prints four markers (the entry says four) but its printed text is garbled for three of the regiment numbers (the page image of PDF p. 36, looked at, shows the same characters); not repaired or guessed here'),
        '74th New York Infantry Markers']),
    ('NPS-CLI-ERR', 37, 'CE 1938'): ('none', 'an anniversary: no memorial is named'),
    ('NPS-CLI-ERR', 37, 'CE 1963'): ('none', 'an anniversary: no memorial is named'),
}


def clean_item(it):
    it = it.strip()
    it = re.sub(r'[.;]+$', '', it).strip()
    it = re.sub(r'^and\s+', '', it)
    return it


def split_on(sep, body):
    return [clean_item(x) for x in re.split(sep, body) if clean_item(x)]


def entries_of(sid):
    pages, tsha, tpath = load_pages(sid)
    out = []
    for p in sorted(pages):
        N = norm(pages[p])
        heads = list(HEAD.finditer(N))
        for m in heads:
            nm = NEXT.search(N, m.end())
            ent = N[m.start():(nm.start() if nm else len(N))].strip()
            ent = FOOTER.sub('', ent).strip()
            hdr = '%s %s%s' % (m.group(1), m.group(2), (' - ' + m.group(3)) if m.group(3) else '')
            pm = PRINTED.search(N)
            out.append({'sid': sid, 'page': p, 'hdr': hdr, 'entry': ent, 'printed': ('Page %s of %s' % pm.groups()) if pm else None})
    # ordinal of the entry among the page's entries, and '#k' for a header that repeats on the page
    per_page = {}
    for e in out:
        per_page.setdefault((e['page']), []).append(e)
    for p, lst in per_page.items():
        for i, e in enumerate(lst, 1):
            e['ord'] = i
            same = [x for x in lst if x['hdr'] == e['hdr']]
            e['key'] = (e['sid'], p, e['hdr'] + ('#%d' % (same.index(e) + 1) if len(same) > 1 else ''))
    return out, tsha, tpath


def years_of(hdr):
    m = re.match(r'(?:CE|AD) (\d{4})(?: - (\d{4}))?', hdr)
    return int(m.group(1)), (int(m.group(2)) if m.group(2) else None)


def build():
    rows, left, meta = [], [], {}
    for sid in CHRON_SOURCES:
        entries, tsha, tpath = entries_of(sid)
        meta[sid] = {'text_sha256': tsha, 'text_path': tpath}
        seen = set()
        for e in entries:
            key = e['key']
            seen.add(key)
            rule = RULES.get(key)
            if rule is None:
                raise SystemExit('no rule for entry %r: %s' % (key, e['entry'][:160]))
            y1, y2 = years_of(e['hdr'])
            text = e['entry'][e['entry'].find('Memorialized ') + len('Memorialized '):]
            kind = rule[0]
            if kind == 'none':
                left.append({'source_id': sid, 'pdf_page': e['page'], 'printed_page': e['printed'], 'header_years': e['hdr'], 'entry': e['entry'], 'why_not_a_row': rule[1]})
                continue
            list_head, tail, items = None, None, []
            if kind in ('semi', 'semi_tail', 'comma'):
                if ':' not in text:
                    raise SystemExit('no colon in %r' % (key,))
                list_head, body = text.split(':', 1)
                body = body.strip()
                if kind == 'semi_tail':
                    if not body.endswith(rule[1].strip()):
                        raise SystemExit('expected closing words %r in %r' % (rule[1], key))
                    tail = rule[1].strip()
                    body = body[:-len(rule[1].strip())].strip()
                items = [(x, None) for x in split_on(r',\s*' if kind == 'comma' else r';\s*', body)]
                # a list of memorials written with 'and' between the last two items and no comma ('the A and the B') is not used by these reports
            elif kind == 'items':
                items = [(x, None) if isinstance(x, str) else x for x in rule[1]]
                list_head = None
            else:
                raise SystemExit('unknown rule %r' % (rule,))
            # every item must be found in the entry, in order
            pos = 0
            for it, _ in items:
                i = e['entry'].find(it, pos)
                if i < 0:
                    raise SystemExit('item %r of %r is not in the entry, in order' % (it, key))
                pos = i + len(it)
            tm = re.search(r'\b[Ii]n (\d{4})(?: ?[-–] ?(\d{4}))?', text)
            text_years = ([int(tm.group(1))] + ([int(tm.group(2))] if tm.group(2) else [])) if tm else None
            differ = bool(text_years and (text_years[0], text_years[-1]) != (y1, y2 or y1))
            for k, (it, note) in enumerate(items, 1):
                ca = re.findall(r'\(ca\.\s*\d{4}(?:\s*[-–]\s*\d{4})?\)', it)
                rows.append({
                    'id': 'NPSMY-%s-p%03d-e%02d-i%02d' % (SHORT[sid], e['page'], e['ord'], k),
                    'source_id': sid, 'pdf_page': e['page'], 'printed_page': e['printed'],
                    'name': re.sub(r'^the ', '', it, flags=re.I), 'name_as_printed': it,
                    'year': y1, 'year_to': y2, 'header_years': e['hdr'],
                    'list_head': norm(list_head) if list_head else None,
                    'item_index': k, 'items_in_entry': len(items),
                    'quote': e['entry'],
                    'text_years': text_years, 'years_differ': differ,
                    'also_in_entry': tail, 'ca_in_item': ca[0] if ca else None,
                    'note': note,
                    'state_date': 'erected or installed in %d%s as the chronology prints it (a later memorial; not an 1863 state)' % (y1, ('-%d' % y2) if y2 else ''),
                    'use_for_1863': 'none',
                    'tier_proposed': 'inferred' if ca else 'documented',
                    'tier_basis': ('the chronology gives the year with ca. for this item; carry as inferred' if ca else
                                   'a National Park Service inventory prints the year of this memorial in its chronology table; the inventory does not name the records behind the cell'),
                    'retrieved': RETRIEVED, 'text_variant': 'reading-order',
                    'text_path': tpath, 'text_sha256': tsha,
                })
        for key in RULES:
            if key[0] == sid and key not in seen:
                raise SystemExit('rule %r matched no entry (the saved text changed?)' % (key,))
    # park-wide chronology (layout text: the 2000 scan has no punctuation, so the entry is quoted as the layout text prints it)
    pages, tsha, tpath = load_pages('NPS-CLI-LANDSCAPE', 'layout')
    meta['NPS-CLI-LANDSCAPE'] = {'text_sha256': tsha, 'text_path': tpath, 'text_variant': 'layout'}
    LSC = [
        (22, 1878, 'markers to General Vincent and Colonel Taylor',
         '1878 AD Memorialized The Pennsylvania Grand Army of the Republic GAR held week-long reunion at the battlefield early monumentation was ushered in by dedication of markers to General Vincent and Colonel Taylor both Pennsylvania heroes for whom the GAR posts were named',
         'the entry names two persons the markers honour, not the markers; no marker name is printed'),
        (22, 1879, '24th Mass',
         '1879 AD Memorialized First regimental monument marking battle position 24th Mass erected',
         'the entry names the regiment (24th Mass) only; the printed words do not give the monument\'s full name'),
    ]
    for p, y, name, quote, note in LSC:
        N = norm(pages[p])
        if N.count(quote) != 1:
            raise SystemExit('LANDSCAPE entry not found once on p.%d: %r' % (p, quote[:60]))
        rows.append({
            'id': 'NPSMY-LSC-p%03d-%d' % (p, y), 'source_id': 'NPS-CLI-LANDSCAPE', 'pdf_page': p, 'printed_page': None,
            'name': name, 'name_as_printed': name, 'year': y, 'year_to': None, 'header_years': '%d AD' % y,
            'list_head': None, 'item_index': 1, 'items_in_entry': 1, 'quote': quote, 'text_years': None, 'years_differ': False,
            'also_in_entry': None, 'ca_in_item': None, 'note': note,
            'state_date': 'erected or dedicated in %d as the park-wide chronology prints it (a later memorial; not an 1863 state)' % y,
            'use_for_1863': 'none', 'tier_proposed': 'documented',
            'tier_basis': 'the park-wide inventory prints the year in its chronology table (layout text of a 2000 print scan, no punctuation)',
            'retrieved': RETRIEVED, 'text_variant': 'layout', 'text_path': tpath, 'text_sha256': tsha})
    return rows, left, meta


def sources_meta():
    return {s['id']: s for s in json.load(open(os.path.join(NPS, 'sources.json')))['sources']}


def write(rows, left, meta):
    src = sources_meta()
    for r in rows:
        s = src[r['source_id']]
        r['source_title'], r['source_date'], r['source_author'], r['url'] = s['title'], s['date'], s['author'], s['url']
        r['rights_basis'] = s.get('rights_basis')
    with open(os.path.join(OUT, 'memorial_years.jsonl'), 'w', encoding='utf-8') as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False, sort_keys=True) + '\n')
    json.dump({'_doc': 'Chronology entries of the Cultural Landscapes Inventories that carry the event word Memorialized and name no memorial; read, and left out of memorial_years.jsonl with the reason. Generated by scripts/memorial_years.py.',
               'items': left}, open(os.path.join(OUT, 'memorial_years_left.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    with open(os.path.join(OUT, 'memorial_years.md'), 'w', encoding='utf-8') as f:
        f.write('# Memorials named in the chronology tables of the National Park Service inventories, with the year each table prints\n\n')
        f.write('Generated by `scripts/memorial_years.py` (do not edit by hand) for the request of the world-content workstream. One row per memorial named in a chronology entry of the event type Memorialized; '
                'the name is the list item exactly as the entry prints it (`name_as_printed`); nothing is matched to any other list of names. The quote is the whole entry, verbatim from the saved text '
                '(`scripts/verify_memorial_years.py` finds it again). Every row is a later memorial: use for the July 1863 scene is `none`. The year is the chronology year of the cell (a range where the cell prints a range); '
                'the report does not say which record gives it.\n\n')
        f.write('%d rows from %d sources; %d chronology entries with the event type Memorialized that name no memorial are listed in `memorial_years_left.json`.\n\n' % (len(rows), len({r['source_id'] for r in rows}), len(left)))
        cur = None
        for r in sorted(rows, key=lambda r: (r['source_id'], r['pdf_page'], r['id'])):
            if r['source_id'] != cur:
                cur = r['source_id']
                f.write('\n## %s\n\n%s (%s). %s\n\n| id | year | name as printed | PDF page [printed] | note |\n|---|---|---|---|---|\n' % (cur, r['source_title'], r['source_date'], r['url']))
            yr = str(r['year']) + ('-%d' % r['year_to'] if r['year_to'] else '')
            notes = []
            if r['years_differ']:
                notes.append('the sentence of the entry prints years %s' % '-'.join(str(x) for x in r['text_years']))
            if r['ca_in_item']:
                notes.append('item carries %s' % r['ca_in_item'])
            if r['also_in_entry']:
                notes.append('entry continues: %s' % r['also_in_entry'])
            if r['note']:
                notes.append(r['note'])
            f.write('| `%s` | %s | %s | %d%s | %s |\n' % (r['id'], yr, r['name_as_printed'].replace('|', '/'), r['pdf_page'], (' [%s]' % r['printed_page']) if r['printed_page'] else '', '; '.join(notes).replace('|', '/')))


if __name__ == '__main__':
    rows, left, meta = build()
    if '--list' in sys.argv:
        for r in rows:
            print('%-26s p%-3d %s%s | %s | %s' % (r['id'], r['pdf_page'], r['year'], ('-%d' % r['year_to']) if r['year_to'] else '', r['name_as_printed'], r['name']))
        print(len(rows), 'rows;', len(left), 'entries left out')
    elif '--check' in sys.argv:
        src = sources_meta()
        have = [json.loads(l) for l in open(os.path.join(OUT, 'memorial_years.jsonl'), encoding='utf-8')]
        for r in rows:
            s = src[r['source_id']]
            r['source_title'], r['source_date'], r['source_author'], r['url'] = s['title'], s['date'], s['author'], s['url']
            r['rights_basis'] = s.get('rights_basis')
        a = [json.dumps(r, ensure_ascii=False, sort_keys=True) for r in rows]
        b = [json.dumps(r, ensure_ascii=False, sort_keys=True) for r in have]
        if a != b:
            print('DIFFERENT: %d rows built, %d in the file' % (len(a), len(b)))
            sys.exit(1)
        print('memorial_years.jsonl equals the rebuild (%d rows)' % len(rows))
    else:
        write(rows, left, meta)
        print('%d rows, %d entries left out; written to %s' % (len(rows), len(left), OUT))
