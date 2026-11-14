#!/usr/bin/env python3
"""Write the seeded part of docs/battle-theatre/town/SOURCES.md (the source ledger of the town and buildings evidence pass) and evidence/ledger-families.json.

    python3 tools/bt/town/build_sources.py

Everything above the line `<!-- APPEND-ONLY BELOW -->` is regenerated from the local library files; everything below that line (the rows the group passes append with
`>>`) is kept as it is. Every local text is hashed here (sha256 of the file as it is on disk now); the validator re-hashes the files named by a row.
Sources: GOVERNANCE/library/acquired_2.json (the 99 books and papers of tmp/library/ws9 and the 9 books of ws9/prior), horde/ws-web/nps/sources.json (73 Park
Service documents), library/or27_index.json (Official Records vol. 27), horde/ws-web/ca/pages.jsonl (1863 newspaper pages), docs/basemap1863/maps/sources.json
(maps), tools/bt/photomatch/photograph_registry.json (photographs). Classes: primary = made in 1863-1869 by a witness or an official actor, or a page of an 1863 paper;
official = a Park Service or Library of Congress record; book = any later published account; lead = may point to evidence, may never make a claim documented.
"""
import glob, hashlib, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
BT = os.path.join(ROOT, 'docs', 'battle-theatre')
OUT = os.path.join(BT, 'town', 'SOURCES.md')
FAM = os.path.join(BT, 'town', 'evidence', 'ledger-families.json')
MARK = '<!-- APPEND-ONLY BELOW -->'
HEAD = '| id | class | title | date | text | sha256 | pages | rights | url | notes |\n|---|---|---|---|---|---|---|---|---|---|\n'


def jl(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def sha(p):
    h = hashlib.sha256()
    with open(os.path.join(ROOT, p), 'rb') as f:
        h.update(f.read())
    return h.hexdigest()


def cell(s):
    return re.sub(r'\s+', ' ', str(s if s is not None else '-')).replace('|', '/').strip() or '-'


def row(*c):
    return '| ' + ' | '.join(cell(x) for x in c) + ' |\n'


PRIMARY_IDS = {'JACOBS-1864', 'LETTERMAN-1866', 'FREMANTLE-1864', 'EVERETT-1864', 'HOSPSCENES-1864', 'MA-BURIAL-1863', 'CEM-INDIANA-1865', 'CEM-REPORT-1867',
               'BACH-KEY-1864'}


def klass(sid, date):
    if sid in PRIMARY_IDS:
        return 'primary'
    return 'book'


def main():
    acq = jl(os.path.join(BT, 'GOVERNANCE', 'library', 'acquired_2.json'))
    fam = {'GBG-COMPILER-1863': {}, 'ADAMS-SENTINEL-1863': {}, 'CA-1863': {}}
    out = []
    out.append('# Source ledger: the town and buildings evidence pass (OA10)\n\n')
    out.append('Written for the evidence files `docs/battle-theatre/town/evidence/<group>.jsonl` and read by `tools/bt/town/validate_evidence.py`, which takes the source classes, the local '
               'text paths, the hashes and the page model of every row from the tables of this file. Seeded by `tools/bt/town/build_sources.py` from the local library; the group passes '
               'append the sources they acquire at the end of the file (section 10).\n\n')
    out.append('## 1. How a row of an evidence file uses this ledger\n\n')
    out.append('- `source` is an id of the first column. `class` decides what the source may do: **primary** (made in 1863-1869 by a witness or an official actor, or a page of a paper of 1863), '
               '**official** (a Park Service, Library of Congress or National Archives record), **book** (any later published account, public domain), **lead** (a web page, an encyclopaedia, a '
               'forum, a blog, an aggregator, the owner\'s plan itself: it may point to a source to read, it can never make a claim `documented` or `inferred`: the validator refuses a lead as the source of such a row).\n')
    out.append('- `text` is the repository-relative path of the local text the quote is matched in. A path with `{part}` is a family of texts (the weekly papers, the newspaper pages): the row names the part '
               '(for the papers the issue date, for the newspaper pages `<lccn>/<date>/ed-1/seq-<n>`). `-` means there is no local text: the source can be cited only as an image reading (`image_ref`).\n')
    out.append('- `pages` is the page model: `markers` (the text carries `=== PAGE n ===` lines; the row\'s `page` is checked against them), `or27` (Official Records: the row\'s `part` is a record id of '
               '`docs/battle-theatre/library/or27_index.json`; offset and page are checked against the record), `none` (the text has no page marks: `page` is the printed page as read, or null with `page_note`; the offset is the locator).\n')
    out.append('- Offsets are character offsets into the file decoded as UTF-8 with `newline=\'\'` (the convention of `tools/bt/or27_lib.py`).\n')
    out.append('- A row of a later date than the battle describes a later state: the validator will not let it make an 1863 value `documented` without a `continuity` citation (a statement that the feature is unchanged since 1863).\n')
    out.append('- Public sources only, one request per second (five seconds for www.loc.gov), no login, no CAPTCHA, no bot-block circumvention; a refusal is recorded as blocked and never worked around.\n\n')

    # ---- 2. books and papers of ws9
    out.append('## 2. Books, reports and papers already local (tmp/library/ws9; public domain)\n\n' + HEAD)
    items = {it['id']: it for it in acq['items']}
    prior = {p['source_id']: p for p in acq.get('reverified_prior_items', [])}
    n_books = 0
    for sid in sorted(items):
        it = items[sid]
        if sid.startswith(('GBG-COMPILER-1863-', 'ADAMS-SENTINEL-1863-')):
            base = 'GBG-COMPILER-1863' if sid.startswith('GBG') else 'ADAMS-SENTINEL-1863'
            part = sid[len('GBG-COMPILER-'):] if sid.startswith('GBG') else sid[len('ADAMS-SENTINEL-'):]   # 1863-MM-DD
            fam[base][part] = sha(it['local_path'])
            continue
        p = it['local_path']
        if not os.path.exists(os.path.join(ROOT, p)):
            continue
        n_books += 1
        out.append(row(sid, klass(sid, it.get('date')), it['title'][:150], it.get('date') or '-', p, sha(p), 'none', it.get('licence_basis') or 'public domain',
                       it.get('details_url') or it.get('url') or '-', 'archive.org %s; OCR text, unverified (raw djvu text)' % it.get('archive_identifier')))
    acq1 = {it.get('source_id'): it for it in jl(os.path.join(BT, 'GOVERNANCE', 'library', 'acquired.json')).get('items', [])}
    for sid, pr in sorted(prior.items()):
        p = pr['local_path']
        if not os.path.exists(os.path.join(ROOT, p)):
            continue
        n_books += 1
        a1 = acq1.get(sid) or acq1.get(sid.split('-v')[0]) or {}
        out.append(row(sid, 'book', (a1.get('title') or 'book acquired in the first library pass (title in GOVERNANCE/library/acquired.json)')[:150], a1.get('date') or '-', p, sha(p), 'none', 'public domain (pre-1929 US publication)',
                       'https://archive.org/details/' + pr['archive_identifier'], 'archive.org %s; OCR text' % pr['archive_identifier']))
    out.append('\nWeekly papers of 1863 (families: the row names the issue date as `part`):\n\n' + HEAD)
    out.append(row('GBG-COMPILER-1863', 'primary', 'The Gettysburg Compiler, weekly, issues of %s to %s (%d issues)' % (min(fam['GBG-COMPILER-1863']), max(fam['GBG-COMPILER-1863']), len(fam['GBG-COMPILER-1863'])),
                   '1863', 'tmp/library/ws9/GBG-COMPILER-{part}__gettysburg-compiler-{part}_djvu.txt',
                   '-', 'none', 'public domain', 'https://archive.org/details/gettysburg-compiler-1863-06-01', 'per-issue hashes in evidence/ledger-families.json; part = 1863-MM-DD; a Gettysburg weekly: advertisements, local notices, accounts of the battle and the damage'))
    out.append(row('ADAMS-SENTINEL-1863', 'primary', 'The Adams Sentinel (Gettysburg), weekly, issues of %s to %s (%d issues)' % (min(fam['ADAMS-SENTINEL-1863']), max(fam['ADAMS-SENTINEL-1863']), len(fam['ADAMS-SENTINEL-1863'])),
                   '1863', 'tmp/library/ws9/ADAMS-SENTINEL-{part}__adams-sentinel-{part}_djvu.txt', '-', 'none', 'public domain', 'https://archive.org/details/adams-sentinel-1863-06-02',
                   'per-issue hashes in evidence/ledger-families.json; part = 1863-MM-DD; a Gettysburg weekly'))

    # ---- 3. Official Records
    ors = jl(os.path.join(BT, 'library', 'or27_index.json'))['sources']
    out.append('\n## 3. The Official Records, series I, volume 27 (the Gettysburg campaign; public domain, US government publication)\n\n' + HEAD)
    for k, lab in (('1', 'Part 1 (Union reports)'), ('2', 'Part 2 (Confederate reports)'), ('3', 'Part 3 (correspondence)')):
        s = ors[k]
        out.append(row('OR27-' + k, 'primary', 'The War of the Rebellion, Official Records, Ser. I, vol. 27, ' + lab, '1889', s['file'], sha(s['file']), 'or27', 'public domain (US government publication)',
                       'https://archive.org/details/' + s['archive_identifier'], 'row part = a record id of library/or27_index.json (e.g. OR27-1-R043); search with tools/bt/or27_find.py'))

    # ---- 4. NPS
    nps = jl(os.path.join(BT, 'GOVERNANCE', 'horde', 'ws-web', 'nps', 'sources.json'))['sources']
    out.append('\n## 4. National Park Service documents and pages (tmp/library/web/nps; United States government works)\n\nReading-order text with `=== PAGE n ===` markers (n is the PDF page index, not the printed page). '
               'A modern survey describes modern or reconstructed features unless the passage says otherwise: set `describes` by what the passage says, and see `GOVERNANCE/horde/ws-web/nps/INDEX.md`.\n\n' + HEAD)
    n_nps = 0
    for s in sorted(nps, key=lambda x: x['id']):
        tp = s.get('text_path')
        if s.get('status') != 'acquired' or not tp or not os.path.exists(os.path.join(ROOT, tp)):
            continue
        n_nps += 1
        pages = 'markers' if s['kind'].startswith('official secondary') else 'none'
        note = []
        if s.get('text_defect'):
            note.append('text defect: %s' % s['text_defect'])
        if s.get('text_quality'):
            note.append('text quality: %s' % s['text_quality'])
        out.append(row(s['id'], 'official', s.get('title') or s.get('listing_title'), s.get('date') or '-', tp, sha(tp), pages, s.get('rights_basis') or 'United States government work', s.get('url') or '-',
                       '; '.join(note) or s.get('kind')))

    # ---- 5. Newspapers of Chronicling America
    ca = [json.loads(l) for l in open(os.path.join(BT, 'GOVERNANCE', 'horde', 'ws-web', 'ca', 'pages.jsonl'), encoding='utf-8') if l.strip()]
    n_ca = 0
    for p in ca:
        lp = p['local_path']
        if not os.path.exists(os.path.join(ROOT, lp)):
            continue
        part = lp[len('tmp/library/web/ca/pages/'):-len('.txt')]
        fam['CA-1863'][part] = sha(lp)
        n_ca += 1
    out.append('\n## 5. Newspaper pages of 1863 (Chronicling America, Library of Congress; %d pages local, %d of them of July 1863)\n\n' % (n_ca, sum(1 for k in fam['CA-1863'] if '/1863-07-' in k)) + HEAD)
    out.append(row('CA-1863', 'primary', 'Chronicling America newspaper pages of June to November 1863 saved by the web workstream (national dailies and weeklies; not the Gettysburg weeklies, which are section 2)', '1863',
                   'tmp/library/web/ca/pages/{part}.txt', '-', 'none', 'public domain (LOC: no known restrictions on pre-1929 newspapers)', 'https://www.loc.gov/collections/chronicling-america/',
                   'part = <lccn>/<date>/ed-1/seq-<n> (the saved page text); per-page hashes in evidence/ledger-families.json; more pages: the loc.gov collection JSON used by horde/ws-web/ca/scripts/run_searches.py'))

    # ---- 6. maps, photographs, drawings: no local text
    out.append('\n## 6. Maps, photographs and drawings (images; cited with `image_ref`, never with a quote)\n\nNo text is local: a reading of an image is an observation made by someone who looked at it (`viewed: true`). '
               'Scans: tile.loc.gov (public); the georeferenced Hopkins inset and Warren plate are described in `docs/basemap1863/maps/README.md` (leave-one-out error 2.9 m inside the borough for the inset, 16.5 m for the Warren plate).\n\n' + HEAD)
    maps = jl(os.path.join(ROOT, 'docs', 'basemap1863', 'maps', 'sources.json'))
    seen_loc = set()
    mapid = {'hopkins-1858': ('HOPKINS-1858-INSET', 'primary'), 'warren-1869': ('WARREN-1869', 'primary'), 'cope-1863-sketch': ('COPE-1863', 'primary'), 'cope-culps-1898': ('COPE-CULPS-1898', 'primary'),
             'gnmp-1900': ('GNMP-1900', 'official'), 'elliott-1864': ('ELLIOTT-1864', 'primary'), 'hotchkiss-jacobs': ('HOTCHKISS-JACOBS', 'primary'), 'woeltje-1888': ('WOELTJE-1888', 'book'),
             'ny-monuments-1894': ('NY-MONUMENTS-1894', 'book')}
    for m in maps:
        if m['id'] in mapid:
            sid, cl = mapid[m['id']]
            out.append(row(sid, cl, m['title'][:160], m.get('date'), '-', '-', 'none', m.get('licence') or 'Library of Congress: no rights advisory on the item', m.get('loc'),
                           ('%s; %s' % (m.get('role'), m.get('call') or '')) + ('; the borough inset of the same sheet (resource g3823a.la000697)' if m['id'] == 'hopkins-1858' else '')))
            if m['id'] == 'hopkins-1858':
                out.append(row('HOPKINS-1858-COUNTY', 'primary', 'Map of Adams Co., Pennsylvania (the county sheet of the same map: farm owners, roads, mills)', '1858', '-', '-', 'none',
                               'Library of Congress: free to use and reuse, no rights advisory', m.get('loc'), 'owners and farm sites; scale too small for a footprint; leave-one-out 376 m'))
        elif m['id'].startswith('bachelder'):
            if 'BACHELDER-1876' not in seen_loc:
                seen_loc.add('BACHELDER-1876')
                out.append(row('BACHELDER-1876', 'primary', m['title'][:160], '1876', '-', '-', 'none', m.get('licence') or 'public domain by age', m.get('loc'), 'troop positions on the Warren topography; not a building survey'))
    out.append(row('HABS', 'official', 'Historic American Buildings Survey records of Gettysburg buildings at the Library of Congress (collection listing: 68 items for "gettysburg pennsylvania"; probe of 2026-11-14)', '1930s-1990s', '-', '-', 'none',
                   'Library of Congress: read the rights statement of each item at acquisition', 'https://www.loc.gov/collections/historic-american-buildings-landscapes-and-engineering-records/?q=gettysburg+pennsylvania',
                   'data pages, photographs and measured drawings; later than 1863: cite for form and fabric only with a continuity statement'))
    for hid, what in (('pa0004', 'Adams County Courthouse'), ('pa0009', 'Pennsylvania College, Pennsylvania Hall'), ('pa0008', 'McPherson Barn'), ('pa0005', 'Bushman House'), ('pa1728', 'Trostle Barn'),
                      ('pa2625', 'Klingel Farm, House'), ('pa2627', 'Biggs Farm, House'), ('pa1894', 'Gettysburg College, Glatfelder Hall')):
        out.append(row('HABS-' + hid, 'official', 'HABS %s, Gettysburg, Adams County, PA' % what, 'later than 1863', '-', '-', 'none', 'Library of Congress: read the rights statement of the item', 'https://www.loc.gov/item/%s/' % hid, 'listed by the probe of 2026-11-14; not yet read'))
    out.append(row('SANBORN-1886', 'primary', 'Sanborn Fire Insurance Map from Gettysburg, Adams County, Pennsylvania, November 1886 (also 1891, 1896, 1902, 1907, 1912, 1924: items sanborn07682_001 to _007)', '1886', '-', '-', 'none',
                   'Library of Congress: read the rights statement of the item', 'https://www.loc.gov/item/sanborn07682_001/', '23 years after the battle: storeys, walls and roofs as a continuity check only, never as the 1863 state by itself'))
    reg = jl(os.path.join(ROOT, 'tools', 'bt', 'photomatch', 'photograph_registry.json'))
    out.append(row('LOC-PHOTO', 'primary', 'Library of Congress photographs of July 1863 and later in the photo-match ledger (%d records; ledger tools/bt/photomatch/photograph_registry.json, report GOVERNANCE/horde/ws10-photomatch/REPORT.md)' % reg['count'],
                   '1863', '-', '-', 'none', 'public domain (LOC: no known restrictions)', 'https://www.loc.gov/pictures/collection/cwp/',
                   'cite by LOC record id in image_ref.item; the ledger holds no documented camera position, so a measurement from a photograph is at best inferred; staged photographs are for terrain only'))

    # ---- 7. planned
    out.append('\n## 7. Planned sources (reachable and public domain; a group pass acquires them and appends the acquired row, same id, in section 10)\n\n' + HEAD)
    planned = [
        ('HOKE-1887', 'book', 'Hoke, The Great Invasion of 1863; or, General Lee in Pennsylvania (1887): the town in the days of the battle, damage, hospital use', '1887', 'https://archive.org/details/greatinvasionof102hoke',
         'archive.org identifiers found by the probe: greatinvasionof102hoke, greatinvasionem00hokegoog, cu31924030913846, greatinvasionofo00hokeiala'),
        ('HISTORY-ADAMS-1886', 'book', 'History of Cumberland and Adams Counties, Pennsylvania (Warner, Beers and Co., 1886): the Gettysburg chapter (churches, schools, public buildings, hotels, mills)', '1886',
         'https://archive.org/details/cu31924028852619', 'identifiers found by the probe: cu31924028852619, historyofcumberl01chic, historyofcumberl00wtay'),
        ('RUPP-1846', 'book', 'Rupp, The History and Topography of Dauphin, Cumberland, Franklin, Bedford, Adams and Perry Counties (1846): the borough as of 1846', '1846', 'https://archive.org/details/historytopograph00rupp_1',
         'identifiers found by the probe: historytopograph00rupp_1, historytopograph00rup, historyandtopog00ruppgoog'),
        ('CENSUS-1860-PUBLISHED', 'official', 'Published volumes of the eighth census of 1860 (Population, Agriculture, Manufactures): county and borough totals only; the manuscript schedules (household, occupation, real estate) are on FamilySearch and Ancestry (login) and are an owner step',
         '1864', 'https://archive.org/details/populationofusin00kennrich', 'identifiers found by the probe: populationofusin00kennrich, agricultureofusa00censrich, cu31924096440940'),
        ('NPS-GETTYSBURG-COLLEGE-EA-1995', 'official', 'Gettysburg College - National Park Service Land Exchange: Study of Alternatives / Environmental Assessment (1995)', '1995', 'https://www.npshistory.com/publications/gett/gettysburg-college-sa-ea-1995.pdf',
         'listed on the npshistory.com index of 2026-11-14 and not in the local set'),
        ('NPS-ROAD-INVENTORY', 'official', 'The Road Inventory of Gettysburg National Military Park (pubs.nps.gov eTIC GETT_305_D82_0402pg)', 'not stated', 'https://pubs.nps.gov/eTIC/GATE-GICL/GETT_305_D82_0402pg.pdf', 'listed on the npshistory.com index; road widths and surfaces of today'),
        ('LOC-CA-QUERIES', 'primary', 'More 1863 newspaper pages through the loc.gov Chronicling America collection JSON (probe of 2026-11-14: "gettysburg court house hospital", 4-31 July 1863, 202 results), then the page text through tile.loc.gov word-coordinates service as horde/ws-web/ca/scripts do',
         '1863', 'https://www.loc.gov/collections/chronicling-america/', 'queries per group are in evidence/groups.json'),
    ]
    for sid, cl, title, date, url, note in planned:
        out.append(row(sid, cl, title, date, '-', '-', 'none', 'public domain / US government work (confirm at acquisition)', url, 'PLANNED: ' + note))

    # ---- leads
    out.append('\n## 8. Lead sources (class lead: they point, they never prove)\n\n' + HEAD)
    leads = [('PLAN-PDF', 'The owner\'s plan, "Gettysburg Total War animation plan, version 2" (docs/battle-theatre/BIBLE/plan-clean.txt): a research plan whose rows rest on the web sources below; its own text says "Leads to verify (not asserted)"'),
             ('WIKIPEDIA', 'Wikipedia (any page; the keys Wiki-* of the plan)'), ('STONE-SENTINELS', 'Stone Sentinels (keys SS-* of the plan): a secondary aggregator'), ('HMDB', 'Historical Marker Database (keys HMDB-*)'),
             ('CIVILWARTALK', 'CivilWarTalk and other forums (keys CWT*)'), ('GETTYSBURG-DAILY', 'Gettysburg Daily (keys GD-*)'), ('ECW-BLOG', 'Emerging Civil War and other blogs (keys ECW-*, WHB*)'),
             ('HISTORYNET-ABT', 'HistoryNet and American Battlefield Trust articles (keys HN-*, ABT-*)')]
    for sid, t in leads:
        out.append(row(sid, 'lead', t, '-', '-', '-', 'none', '-', '-', 'lead only: find the primary source it points to'))

    # ---- hosts
    out.append('\n## 9. Hosts: what answered on 2026-11-14 (GOVERNANCE/horde/ws-town/lookups.jsonl holds every request)\n\n| host | result | note |\n|---|---|---|\n')
    hosts = [('www.loc.gov', 'reachable (HTTP 200)', 'item records and collection listings as JSON; crawl delay 5 s; HABS, Sanborn, Civil War photographs and Chronicling America collections answer; the old chroniclingamerica.loc.gov search path answered 404 (the loc.gov collection is the working route)'),
             ('tile.loc.gov / cdn.loc.gov', 'reachable (per the network note)', 'image scans'), ('archive.org', 'reachable (HTTP 200)', 'advanced search JSON and /cors/<identifier>/<file> downloads'),
             ('www.npshistory.com', 'reachable (HTTP 200)', 'index of 81 Park Service PDFs; 32 not yet local, 2 relevant (section 7)'), ('www.nps.gov', 'reachable (HTTP 200)', 'history and culture index page'),
             ('catalog.archives.gov', 'reachable (HTTP 200)', 'a script shell: the catalog pages are not readable by a plain request'), ('www.gutenberg.org', 'reachable (HTTP 200)', 'search page only; no Gettysburg town text identified'),
             ('gettysburghistory.org', 'BLOCKED (CONNECT tunnel refused, HTTP 403)', 'Adams County Historical Society: damage claims index, 1858 and 1872 name indexes, deed and tax indexes; not worked around; owner step in the plan (a request to the Society is a third-party contact)'),
             ('npgallery.nps.gov', 'BLOCKED (CONNECT tunnel refused, HTTP 403)', 'National Register nomination of the Gettysburg Historic District not reachable; not worked around'),
             ('babel.hathitrust.org, ehistory.osu.edu', 'BLOCKED (bot block, per the network note)', 'do not retry')]
    for h, r, n in hosts:
        out.append('| %s | %s | %s |\n' % (cell(h), cell(r), cell(n)))

    out.append('\n## 10. Acquired by the group passes (append-only)\n\nAppend one row per newly acquired source with a single shell `>>`, in the column order of the tables above, as the last lines of this file: id, class, title, date, '
               'repository-relative path of the local text (under tmp/library/town/<id>/), sha256 of that file, page model, rights basis, url, notes. A planned source of section 7 is completed by appending a row with the same id and a real `text` path. '
               'Never edit a row above this line.\n\n' + HEAD + MARK + '\n')

    seeded = ''.join(out)
    tail = ''
    if os.path.exists(OUT):
        cur = open(OUT, encoding='utf-8').read()
        if MARK in cur:
            tail = cur.split(MARK, 1)[1]
            # keep appended rows; the generated text above the marker already ends with the marker line
            seeded = seeded[:seeded.index(MARK)] + MARK
            seeded += tail
            with open(OUT, 'w', encoding='utf-8') as f:
                f.write(seeded)
            finish(fam, n_books, n_nps, n_ca)
            return
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(seeded)
    finish(fam, n_books, n_nps, n_ca)


def finish(fam, n_books, n_nps, n_ca):
    os.makedirs(os.path.dirname(FAM), exist_ok=True)
    with open(FAM, 'w', encoding='utf-8') as f:
        json.dump({'_doc': 'sha256 of every member file of the text families of SOURCES.md (part -> hash), written by tools/bt/town/build_sources.py', 'families': {k: dict(sorted(v.items())) for k, v in fam.items()}}, f, indent=0, ensure_ascii=False)
        f.write('\n')
    print('wrote', os.path.relpath(OUT, ROOT), '| books and reports', n_books, '| NPS', n_nps, '| newspaper pages', n_ca, '| papers', len(fam['GBG-COMPILER-1863']), len(fam['ADAMS-SENTINEL-1863']))


if __name__ == '__main__':
    main()
