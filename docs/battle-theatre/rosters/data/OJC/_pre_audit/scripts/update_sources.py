import csv, io, os
BASE = r'C:\Users\mlege\gettysburg-map\docs\battle-theatre\rosters'
p = os.path.join(BASE, 'SOURCES.csv')
raw = open(p, encoding='utf8', newline='').read()
rows = list(csv.reader(io.StringIO(raw)))
H = rows[0]


def setrow(r, **kw):
    for k, v in kw.items():
        r[H.index(k)] = v


for r in rows[1:]:
    if r[0] == 'U12':
        setrow(r, status='FETCHED',
               locator='archive.org/details/ohiowarroster03howerich (v3), ohiowarroster05howerich (v5), ohiowarroster06howerich (v6), officialrosterof07ohio (v7), ohiowarroster10howerich (v10), officialrosterof11ohio (v11), bwb_W9-BTC-637 (v2)',
               notes='OJC family, 2026-10-30: parsed from djvu.xml word boxes; 13 infantry, 6th Ohio Cavalry, 1st Ohio Light Artillery batteries H, I, K, L. Vol 2 comes from the Better World Books copy bwb_W9-BTC-637 (no IA copyright flag; published 1886) because officialrosters02commgoog answered HTTP 504 three times (transient, not a block). Unreadable-or-ambiguous rows 8 to 34 percent by unit. See data/OJC/README.md')
    if r[0] == 'U14':
        setrow(r, status='FETCHED',
               notes='OJC family, 2026-10-30: vols 1 and 2 parsed (12 infantry, 1st Cavalry, Battery B 1st Artillery). Stryker text layer is the weakest of the three: 38 to 71 percent of infantry rows unreadable-or-ambiguous. 23rd NJ conflicts with the OOB (mustered out 27 June 1863). See data/OJC/README.md')
    if r[0] == 'U17':
        setrow(r, status='FETCHED',
               notes='OJC family, 2026-10-30: 5 infantry and 1st Heavy Artillery batteries B and M parsed. Remarks give fate (killed, died, discharged), not survived wounds; ditto marks resolved from the row above and flagged. 2 to 6 percent unreadable-or-ambiguous. See data/OJC/README.md')
new = [
    ['OJC01', 'Union', 'Ohio', 'Official Roster of the Soldiers of the State of Ohio, vol 2, second IA copy (Better World Books scan, 1st to 20th infantry)', '1886', '4th, 5th, 7th, 8th Ohio',
     'djvu.xml 57 MB; lower-quality OCR than the Ohio Valley copies (dot leaders, stray marks); smaller page scale (parser scales columns by 0.79).',
     'Item has no possible-copyright-status and no access-restricted-item flag; published 1886, treated as public domain by date; owner may confirm.', 'IA download, one request per file', 'FETCHED',
     'archive.org/details/bwb_W9-BTC-637', 'Used because officialrosters02commgoog returned HTTP 504 on 3 attempts (txt and xml).'],
    ['OJC02', 'Union', 'Ohio, New Jersey, Connecticut', 'OR Series I vol 27 part 1, lists of Union officers killed and mortally wounded (Ohio, New Jersey, Connecticut blocks)', '1889',
     '40 officers; 31 in OJC units; 9 upgraded roster rows, 13 confirmed', 'IA plain text (cached by earlier work, tmp/library/or27); two-column OCR, locator = list heading and state block',
     'US government publication, public domain', 'already cached; not downloaded again', 'FETCHED', 'archive.org/details/cu31924077699761', 'data/OJC/OR27-officer-casualties.csv'],
    ['OJC03', 'Union', 'Ohio, New Jersey, Connecticut', 'IA page images used for the page-image sample (page/nN_w1500.jpg)', 'n/a', '6 pages', 'JPEG', 'as the parent items', 'one request per image', 'FETCHED',
     'archive.org/download/ID/page/', 'data/OJC/QA-SAMPLE.md'],
    ['OJC04', 'Union', 'Connecticut', 'Storrs, The Twentieth Connecticut; Page, History of the Fourteenth Connecticut; Case, Lockwood and Brainard, Record of Service of Connecticut Men (1889)', '1886-1906',
     '5th, 14th, 17th, 20th, 27th Connecticut', 'not fetched', 'public domain by date; IA copies not verified for access restrictions', 'n/a', 'CANDIDATE',
     'archive.org/details/twentiethconnec00storgoog (Google scan, from a search result)', 'Open alternative that would add survived-wound and present names; lead from a web search, unverified.'],
    ['OJC05', 'Union', 'New Jersey', 'Final report of the Gettysburg Battle-field Commission of New Jersey (1891) and Report of the Commissioners to care for Gettysburg Battle Monuments (1892)', '1891-92',
     '12 NJ infantry, 1st Cavalry, Battery B', 'not fetched', 'public domain by date; copies not verified', 'n/a', 'CANDIDATE',
     'archive.org/download/reportofcommissi00newj/reportofcommissi00newj.pdf (from a search result)', 'Search snippets show monument and site work; whether names are listed is not determined.'],
]
# merge against a fresh copy to avoid clobbering concurrent edits by other families
cur = open(p, encoding='utf8', newline='').read()
rows2 = list(csv.reader(io.StringIO(cur)))
upd = {r[0]: r for r in rows[1:] if r[0] in ('U12', 'U14', 'U17')}
have = {r[0] for r in rows2}
for r in rows2[1:]:
    if r[0] in upd:
        r[:] = upd[r[0]]
for n in new:
    if n[0] not in have:
        rows2.append(n)
buf = io.StringIO()
csv.writer(buf, lineterminator='\n').writerows(rows2)
open(p, 'w', encoding='utf8', newline='').write(buf.getvalue())
print('SOURCES.csv updated', len(rows2))
