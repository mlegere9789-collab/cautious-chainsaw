#!/usr/bin/env python3
"""Per-memorial entries of the inventory sections of the National Park Service Cultural Landscapes Inventories
(workstream bt-web, task nps-landscape; second part of the answer to GOVERNANCE/horde/requests/ws-world-memorial-years-for-web.md).

The three inventories of the Pickett's Charge, Emmitsburg Road Ridge and Little Round Top areas (NPS-CLI-PCB, NPS-CLI-ERR, NPS-CLI-LRT) carry, besides
the chronology table that memorial_years.py reads, an evaluation of every commemorative feature with the year in a parenthesis after its name:
    PCB, ERR   '1st Delaware Infantry Monument Position Marker. (1886, Contributing, map #48) Monument that has one position marker. ...'
    LRT        '(NR 2003, Sec.7: 129; LCS 009723; CLR 2012: 3-12) 91st Pennsylvania Infantry Monument (built 1889; Contributing) Located at ...'
One row per entry whose heading names a monument, marker, tablet, statue or boulder (KIND_WORDS); every other entry with a year tag (a farm building, an
avenue, a wall, earthworks) is not a row and is listed with its heading and tag in extracts/memorial_inventory_skipped.json.

Nothing is retyped: heading, tag and sentences are cut from the saved text and the row records what is printed:
  name_as_printed   the heading exactly as printed (list dashes, page-heading words and the closing full stop removed)
  name_pdf_page     the PDF page on which the heading stands (the page before `pdf_page` when the page break falls between heading and tag)
  tag               the parenthesis exactly as printed ('(1886, Contributing, map #48)' / '(built 1889; Contributing)')
  years             the years that stand in the tag ('ca.' and decade forms stay in `tag`)
  quote             the tag and the rest of the sentence after it (PCB, ERR) / the sentence that carries it (LRT), verbatim, on `pdf_page`
  heading_quote     the heading (with the tag, when they are on one page: '<heading>. <tag>'), verbatim, on `name_pdf_page`
  location_quote    the first sentence of the entry that begins with the word 'Located' (verbatim), or null
  citation          the citation before the heading (LRT: 'NR 2003, Sec.7: 129; LCS 009723; CLR 2012: 3-12'), or null
Every row is a later memorial: use_for_1863 is none. A year printed in this section that differs from the year of the same inventory's chronology table
(memorial_years.jsonl) is not settled here: both are rows, and extracts/memorial_year_conflicts.json lists the pairs whose names are identical.

  memorial_inventory.py            build extracts/memorial_inventory.jsonl, memorial_inventory_skipped.json, memorial_year_conflicts.json, memorial_inventory.md
  memorial_inventory.py --check    rebuild in memory and compare with the files
  memorial_inventory.py --list     print the headings and tags for reading
Run with python3 -I.
"""
import importlib.util, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
NPS = os.path.dirname(HERE)
ROOT = os.path.abspath(os.path.join(NPS, '..', '..', '..', '..', '..', '..'))
OUT = os.path.join(NPS, 'extracts')
RETRIEVED = '2026-11-13'
spec = importlib.util.spec_from_file_location('memorial_years', os.path.join(HERE, 'memorial_years.py'))
my = importlib.util.module_from_spec(spec)
spec.loader.exec_module(my)
norm, load_pages, SHORT = my.norm, my.load_pages, my.SHORT

# (a) PCB / ERR tag: '(1886, Contributing, map #48)', '(1888 Contributing, map #s 25,26,27)', '(1913-1920, Contributing)', '(1971, Noncontributing, map #22)'
TAG_A = re.compile(r'\((?P<y>(?:ca\.? ?)?\d{4}s?(?:[-–]\d{4}s?)?(?:,? ?(?:ca\.? ?)?\d{4}s?(?:[-–]\d{4}s?)?)*)[, ]+(?P<ev>(?:Non ?[Cc]ontributing|Contributing)(?:[ -]+(?:Compatible|or Undetermined|and Undetermined))?)[^()]*\)')
# (b) LRT tag: '(built 1889; Contributing)', '(built 1888-1889; Contributing)'
TAG_B = re.compile(r'\((?P<pre>built|erected|moved|placed)\s+(?P<y>[^;()]{1,40}?);\s*(?P<ev>[^()]{1,60}?)\)')
CITE = re.compile(r'\((?:NR|HSI|LCS|CLR|RoT|HSR)\b[^)]*\)')
BOILER = re.compile(r'^(?:(?:Pickett.s Charge Battlefield|Emmitsburg Road Ridge Battlefield|Little Round Top) Gettysburg National Military Park\s*|Cultural Landscapes Inventory Page \d+ of \d+\s*|Evaluation of Small-Scale Features:\s*(?:MONUMENTS/MARKERS\s*|TABLETS\s*)?|Small-Scale Features at Little Round Top:\s*|Buildings and Structures at Little Round Top:\s*|TABLETS\s*|MONUMENTS/MARKERS\s*|-+\s*)+')
# a heading glued to the end of the previous entry's last sentence (no full stop and no citation between them): cut at the known tablet headings
TABLET_HEAD = re.compile(r'(?:Cast Iron (?:Avenue|Information|Narrative|Site Identification) Tablets|(?:Brigade|Division|Corps) Tablets, Army (?:of|Of|OF) [A-Za-z ]+?|Headquarters Markers|Sponsor Tablet, [A-Za-z ]+ Monument)$')
FOOT = re.compile(r'\s*Cultural Landscapes Inventory(?: Part \w+)? Page \d+(?: of \d+)?\s*$')
KIND_WORDS = re.compile(r'\b(Monuments?|Markers?|Tablets?|Statues?|Boulders?)\b')
BOUNDARY = re.compile(r'(?<=[a-z0-9\)\"’”])\.\s+(?=[A-Z\(\-\[])')


def heading_in(region):
    """The heading at the end of a region of page text: after the last citation group or sentence boundary, page-heading words removed."""
    cut, citation = 0, None
    cites = list(CITE.finditer(region))
    if cites:
        cut, citation = cites[-1].end(), cites[-1].group(0)
    b = list(BOUNDARY.finditer(region))
    if b and b[-1].end() > cut:
        cut, citation = b[-1].end(), None
    h = region[cut:].strip()
    h = BOILER.sub('', h).strip()
    h = re.sub(r'\.$', '', h).strip()
    t = TABLET_HEAD.search(h)
    if t and t.start() > 0:
        h = h[t.start():]
    return h, citation


def sentence_after(N, pos):
    m = re.compile(r'(?<=[a-z0-9\)\"’”])\.\s+(?=[A-Z\(])').search(N, pos)
    return N[pos:(m.start() + 1) if m else len(N)]


def load_all(sid):
    pages, tsha, tpath = load_pages(sid)
    return {p: norm(t) for p, t in pages.items()}, tsha, tpath


def entries(sid):
    P, tsha, tpath = load_all(sid)
    out = []
    for p in sorted(P):
        N = P[p]
        pm = re.search(r'Page (\d+) of (\d+)', N)
        printed = 'Page %s of %s' % pm.groups() if pm else None
        rx, kind = (TAG_A, 'A') if sid in ('NPS-CLI-PCB', 'NPS-CLI-ERR') else (TAG_B, 'B')
        for m in rx.finditer(N):
            rs = max(0, m.start() - 230)
            heading, citation = heading_in(N[rs:m.start()])
            hpage, hstart = p, None
            if heading:
                hstart = N.rfind(heading, rs, m.start() + 1)
            else:
                # the page break falls between the heading and its tag: the heading ends the previous page
                prev = FOOT.sub('', P.get(p - 1, '')).rstrip()
                rs2 = max(0, len(prev) - 230)
                heading, citation = heading_in(prev[rs2:])
                hpage = p - 1
                hstart = prev.rfind(heading, rs2) if heading else None
            out.append({'sid': sid, 'page': p, 'printed': printed, 'N': N, 'tag': m.group(0), 'kind': kind, 'm': m, 'heading': heading, 'hpage': hpage,
                        'hstart': hstart, 'citation': citation, 'tsha': tsha, 'tpath': tpath, 'prevN': FOOT.sub('', P.get(p - 1, '')).rstrip()})
    return out


def years_of(tag):
    return [int(x) for x in re.findall(r'\d{4}', tag)]


def build():
    rows, skipped = [], []
    for sid in my.CHRON_SOURCES:
        ents = entries(sid)
        per_page = {}
        for e in ents:
            per_page.setdefault(e['page'], []).append(e)
        for p, lst in per_page.items():
            for i, e in enumerate(lst):
                e['ord'] = i + 1
                nxt = lst[i + 1] if i + 1 < len(lst) else None
                # the entry ends where the next heading starts (when that heading is on this page), else at the page end
                e['end'] = nxt['hstart'] if nxt and nxt['hpage'] == p and nxt['hstart'] and nxt['hstart'] > e['m'].end() else len(e['N'])
        for e in ents:
            name = e['heading']
            if not (name and KIND_WORDS.search(name)):
                skipped.append({'source_id': sid, 'pdf_page': e['page'], 'heading': name, 'heading_pdf_page': e['hpage'], 'tag': e['tag'],
                                'why_not_a_row': 'the heading names no monument, marker, tablet, statue or boulder' if name else 'no heading could be read before the tag'})
                continue
            N, m = e['N'], e['m']
            s = sentence_after(N, m.end() + 1)
            quote_end = m.end() + 1 + len(s.strip()) if s.strip() else m.end()
            if e['kind'] == 'B':
                # the sentence that carries the tag: from the tag to the end of that sentence
                s2 = sentence_after(N, m.end())
                quote_end = m.end() + len(s2)
            quote = N[m.start():quote_end].strip() if e['kind'] == 'A' else N[m.start():quote_end].strip()
            if e['hpage'] == e['page'] and e['hstart'] is not None:
                heading_quote = N[e['hstart']:m.end()].strip()
            else:
                heading_quote = e['heading']
            location_quote = None
            body = N[m.end():e['end']]
            pos = 0
            for bm in list(BOUNDARY.finditer(body)) + [None]:
                sent = body[pos:(bm.start() + 1) if bm else len(body)].strip()
                if re.search(r'\b[Ll]ocated\b', sent):
                    location_quote = sent
                    break
                if bm:
                    pos = bm.end()
            if e['kind'] == 'A':
                yg = TAG_A.match(e['tag']); pre = None
            else:
                yg = TAG_B.match(e['tag']); pre = yg.group('pre')
            lcs = re.search(r'LCS (\d+)', e['citation'] or '')
            maps = re.search(r'map #s? ?[\w ,\-]+', e['tag'])
            rows.append({
                'id': 'NPSMI-%s-p%03d-%02d' % (SHORT[sid], e['page'], e['ord']),
                'source_id': sid, 'pdf_page': e['page'], 'printed_page': e['printed'], 'name_pdf_page': e['hpage'],
                'name_as_printed': name, 'tag': e['tag'], 'tag_form': e['kind'], 'tag_word': pre,
                'years': years_of(yg.group('y')), 'evaluation_as_printed': yg.group('ev'),
                'map_numbers_as_printed': maps.group(0).strip() if maps else None,
                'lcs': lcs.group(1) if lcs else None, 'citation': (e['citation'] or '')[1:-1] or None,
                'heading_quote': heading_quote, 'quote': quote, 'location_quote': location_quote,
                'state_date': 'year(s) as the inventory prints them in the tag: a later memorial (not an 1863 state)',
                'use_for_1863': 'none', 'tier_proposed': 'documented',
                'tier_basis': 'a National Park Service inventory prints the year in the evaluation tag of the feature; the inventory does not name the records behind the year (the citation, where there is one, names its own base documents)',
                'retrieved': RETRIEVED, 'text_variant': 'reading-order', 'text_path': e['tpath'], 'text_sha256': e['tsha'],
            })
    return rows, skipped


def sources_meta():
    return {s['id']: s for s in json.load(open(os.path.join(NPS, 'sources.json')))['sources']}


def decorate(rows):
    src = sources_meta()
    for r in rows:
        s = src[r['source_id']]
        r['source_title'], r['source_date'], r['source_author'], r['url'], r['rights_basis'] = s['title'], s['date'], s['author'], s['url'], s.get('rights_basis')
    return rows


def key_of(name):
    """Name normalised for the comparison of the two tables of one inventory: lower case, no leading 'the', no ca. group, spaces and punctuation single."""
    n = re.sub(r'\(ca\.[^)]*\)', '', name)
    n = re.sub(r'^(?:the|The) ', '', n.strip())
    n = n.replace('’', "'")
    return re.sub(r'[^a-z0-9]+', ' ', n.lower()).strip()


def conflicts(inv_rows):
    chron = [json.loads(l) for l in open(os.path.join(OUT, 'memorial_years.jsonl'), encoding='utf-8')]
    out = []
    for c in chron:
        for r in inv_rows:
            if r['source_id'] != c['source_id']:
                continue
            if key_of(c['name_as_printed']) == key_of(r['name_as_printed']):
                cy = {c['year']} | ({c['year_to']} if c['year_to'] else set())
                lo, hi = c['year'], (c['year_to'] or c['year'])
                ry = r['years']
                same = ry and min(ry) <= lo <= max(ry) or (ry and lo <= min(ry) and max(ry) <= hi) or set(ry) & cy
                if not (set(ry) & cy or (ry and lo <= min(ry) and max(ry) <= hi)):
                    out.append({'source_id': c['source_id'], 'name_as_printed_chronology': c['name_as_printed'], 'chronology_id': c['id'], 'chronology_header_years': c['header_years'],
                                'name_as_printed_inventory': r['name_as_printed'], 'inventory_id': r['id'], 'inventory_tag': r['tag'], 'inventory_years': ry,
                                'note': 'the same inventory prints different years in its chronology table and in the evaluation of its small-scale features; carry both'})
    return out


def write(rows, skipped):
    decorate(rows)
    with open(os.path.join(OUT, 'memorial_inventory.jsonl'), 'w', encoding='utf-8') as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False, sort_keys=True) + '\n')
    json.dump({'_doc': 'Entries of the evaluation sections of the three inventories that carry a year tag but whose heading names no monument, marker, tablet, statue or boulder (farm buildings, avenues, walls, earthworks), and tags whose heading could not be read. Generated by scripts/memorial_inventory.py.',
               'items': skipped}, open(os.path.join(OUT, 'memorial_inventory_skipped.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    cf = conflicts(rows)
    json.dump({'_doc': 'Pairs of rows of one inventory whose names are identical (lower case, no leading the, no ca. group) and whose years differ between the chronology table (memorial_years.jsonl) and the evaluation section (memorial_inventory.jsonl). Carry both. Generated by scripts/memorial_inventory.py.',
               'items': cf}, open(os.path.join(OUT, 'memorial_year_conflicts.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    with open(os.path.join(OUT, 'memorial_inventory.md'), 'w', encoding='utf-8') as f:
        f.write('# Memorials of the evaluation sections of the National Park Service inventories (year tag as printed)\n\n')
        f.write('Generated by `scripts/memorial_inventory.py` (do not edit by hand). One row per entry whose heading names a monument, marker, tablet, statue or boulder; the heading and the tag are cut from the saved text '
                '(`scripts/verify_memorial_inventory.py` finds them again). Every row is a later memorial (use for the July 1863 scene: `none`). `map` numbers are the inventory\'s own; `LCS` is the List of Classified Structures number printed in the LRT citation.\n\n')
        f.write('%d rows; %d tag entries that are not memorials are listed in `memorial_inventory_skipped.json`; %d name pairs with different years in the two tables of one inventory are in `memorial_year_conflicts.json`.\n\n' % (len(rows), len(skipped), len(cf)))
        cur = None
        for r in sorted(rows, key=lambda r: (r['source_id'], r['pdf_page'], r['id'])):
            if r['source_id'] != cur:
                cur = r['source_id']
                f.write('\n## %s\n\n%s (%s). %s\n\n| id | tag as printed | name as printed | PDF p. | location sentence |\n|---|---|---|---|---|\n' % (cur, r['source_title'], r['source_date'], r['url']))
            f.write('| `%s` | %s | %s | %d | %s |\n' % (r['id'], r['tag'].replace('|', '/'), r['name_as_printed'].replace('|', '/'), r['pdf_page'], (r['location_quote'] or '').replace('|', '/')))
    return cf


if __name__ == '__main__':
    rows, skipped = build()
    if '--list' in sys.argv:
        for r in rows:
            print('%-24s p%-3d(h%d) | %s | %s | %s' % (r['id'], r['pdf_page'], r['name_pdf_page'], r['name_as_printed'], r['tag'], (r['location_quote'] or '')[:70]))
        print('--- skipped')
        for s in skipped:
            print('p%-3d | %s | %s' % (s['pdf_page'], s['heading'][:90], s['tag']))
        print(len(rows), 'rows;', len(skipped), 'entries with a year tag skipped')
    elif '--check' in sys.argv:
        decorate(rows)
        have = [json.loads(l) for l in open(os.path.join(OUT, 'memorial_inventory.jsonl'), encoding='utf-8')]
        a = [json.dumps(r, ensure_ascii=False, sort_keys=True) for r in rows]
        b = [json.dumps(r, ensure_ascii=False, sort_keys=True) for r in have]
        if a != b:
            print('DIFFERENT: %d rows built, %d in the file' % (len(a), len(b)))
            sys.exit(1)
        print('memorial_inventory.jsonl equals the rebuild (%d rows)' % len(rows))
    else:
        cf = write(rows, skipped)
        print('%d rows, %d skipped, %d year conflicts; written to %s' % (len(rows), len(skipped), len(cf), OUT))
