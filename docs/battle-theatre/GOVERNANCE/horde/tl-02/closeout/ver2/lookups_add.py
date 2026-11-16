"""Append the lookups of 2026-11-15 (second reading) to horde/tl-02/lookups.jsonl, once (guard: an entry whose id starts with LF)."""
import os, json
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
p = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'tl-02', 'lookups.jsonl')
have = [json.loads(l) for l in open(p, encoding='utf-8') if l.strip()]
if any(str(x.get('id', '')).startswith('LF') for x in have):
    print('already appended'); raise SystemExit(0)
E = [
 ('archive.org full-text search (services/search/beta/page_production, fts)', 'Buford cupola seminary Jerome signal (also with a year filter 1860-1930)', 'ok', 'hits: Brown 1896 (already local), The Historical Magazine of Aug 1869 (Buford\'s report reprinted, no Jerome letter) and DTIC ADA207999 (1989), which prints Jerome\'s letter of 18 Oct 1865; one request per query, at most one per second'),
 ('archive.org text layer', 'https://archive.org/cors/DTIC_ADA207999/DTIC_ADA207999_djvu.txt', 'ok', 'DTIC-ADA207999 (A Communicator\'s Guide to the Gettysburg Campaign, U.S. Army War College study project, 1989; U.S. Government work): 142925 bytes, sha256 1479babc578287906e2f7a0cc9c8a00cb38a5cf47d87087c2d59ecba3a91c434; the PDF (3.4 MB) was read on the page images (PDF pages 13-15 = printed pages 8-10); registered in sources_tl02.json'),
 ('archive.org text layer', 'https://archive.org/cors/sim_historical-magazine-biography-of-america_1869-08_6_2/sim_historical-magazine-biography-of-america_1869-08_6_2_djvu.txt', 'ok', 'The Historical Magazine, Aug 1869: Buford\'s report reprinted (already in the Official Records); searched locally, no Jerome letter; not registered as a source'),
 ('archive.org full-text search', 'Buford "Grey Eagle" horse; Buford white horse Gettysburg', 'none', 'hits only horse stud books and modern items; no text of the period names Buford\'s horse; the row\'s "Grey Eagle" stays an open gap'),
 ('archive.org full-text search', 'ladder attic cupola Lutheran Seminary Buford Gettysburg', 'lead-only', 'one snippet in a book of 2006 ("Valor Wore a Green Sash") mentions a ladder and about 9:30 a.m.; not public domain, not read: a lead, not a source'),
 ('archive.org advanced search and full-text search; Project Gutenberg search', 'Broadhead diary Gettysburg; diary of a lady of Gettysburg; McCreary boy\'s experience of the battle', 'none', 'no identifier or text found (title and creator queries returned 0; the full-text hits were unrelated); Gutenberg search "Broadhead Gettysburg" returned no book; the diaries stay not local'),
 ('archive.org full-text search (year filter 1860-1930)', 'Stuart Dover Carlisle paroled; Iron Brigade black hats; Wheelock knapsacks Gettysburg; Calef hollow Gettysburg night; 97th New York knapsacks piled', 'none', 'long queries return no hit (all terms must occur) and short ones return unrelated volumes; nothing acquired'),
 ('HTTPS GET (egress proxy)', 'https://aa.usno.navy.mil/api/rstt/oneday?date=2026-11-15&coords=39.83,-77.23&tz=-5', 'blocked', 'CONNECT tunnel failed, 403 from the egress proxy (host not allowed for this session); not retried, no workaround; the 1863 American Ephemeris was used instead'),
 ('archive.org advanced search', 'title:(american ephemeris and nautical almanac) AND date:[1859-01-01 TO 1865-12-31]', 'ok', 'candidates americanephemer33offigoog (published 1861), americanephemer19offigoog and americanephemer75offigoog (1862), americanephemer59offigoog (1865); the volume for the year 1863 is americanephemer33offigoog (title page: "for the year 1863", Washington 1861)'),
 ('archive.org text layer', 'https://archive.org/cors/americanephemer33offigoog/americanephemer33offigoog_djvu.txt', 'ok', 'AMEPH-1863 (The American Ephemeris and Nautical Almanac for 1863): 2639307 bytes, sha256 b18e800d17f447435fb745775abbc28f711a32eabea90ef1d556cd819cfc44db; the PDF (31 MB) was read on the page image (PDF page 118 = printed page 103, "Phases of the Moon", June 1863); registered in sources_tl02.json'),
 ('archive.org PDF', 'https://archive.org/cors/notesonrebelinva00jaco/notesonrebelinva00jaco.pdf', 'ok', 'Jacobs 1864 PDF (5.3 MB) read on the page images of printed pages 21 and 22 (PDF pages 31, 32): 9 1/2, 10 1/2 and 11 1/2 a.m. of Jun 30; the OCR text reads "9J", "10|", "11J"'),
]
with open(p, 'a', encoding='utf-8', newline='\n') as f:
    for i, (tool, q, outcome, note) in enumerate(E, 1):
        f.write(json.dumps(dict(id='LF%d' % i, tool=tool, query_or_url=q, outcome=outcome, note=note), ensure_ascii=False) + '\n')
print('appended', len(E))
