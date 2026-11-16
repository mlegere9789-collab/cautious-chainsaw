#!/usr/bin/env python3
"""Plan 10 of the lookup retries (2026-11-16): one request per distinct refused host, plus the reachable-host URLs
that the 2026-11-13 pass had not asked.

Rules built in (owner constraints and the host notes of 2026-11-13):
  * hosts of the do-not-retry list (babel.hathitrust.org, catalog.hathitrust.org, ehistory.osu.edu) are never requested;
  * catalog.archives.gov answers Disallow: / in its robots.txt and is never requested;
  * the loc.gov paths /search and /pictures/search are disallowed by its robots.txt and are never requested;
  * the Project Gutenberg search path /ebooks/search is disallowed; the catalogue feed is used instead;
  * a refused host gets ONE request (the page the rows name, else the root), logged, never worked around.

Output: ../plan10_today.json   (plan entries for retry_urls.py; each carries the lk ids it answers)
Usage:  python3 -I make_plan10.py
"""
import json, os, re, sys, collections
from urllib.parse import urlparse
HERE = os.path.dirname(os.path.abspath(__file__))
RETRY = os.path.abspath(os.path.join(HERE, '..'))

inv = [json.loads(l) for l in open(os.path.join(RETRY, 'lookups-inventory.jsonl'))]

DNR = {'babel.hathitrust.org', 'catalog.hathitrust.org', 'ehistory.osu.edu'}
REACH = {'archive.org', 'www.loc.gov', 'tile.loc.gov', 'cdn.loc.gov', 'chroniclingamerica.loc.gov', 'www.nps.gov', 'nps.gov', 'www.npshistory.com',
         'npshistory.com', 'www.gutenberg.org', 'gutenberg.org', 'catalog.archives.gov', 'gettysburginteractivemap.com', 'api.mapbox.com', 'loc.gov'}
HOSTRE = re.compile(r'\b((?:[a-z0-9-]+\.)+(?:com|org|gov|edu|net|us|mil))\b', re.I)

# host -> the URL to ask once (the page the rows name when there is one, else the root)
PREFERRED = {
    'gettysburg.stonesentinels.com': 'https://gettysburg.stonesentinels.com/battlefield-farms/sherfy-farm/',
    'www.hmdb.org': 'https://www.hmdb.org/m.asp?m=17939',
    'www.historynet.com': 'https://www.historynet.com/',
    'gettysburghistory.org': 'https://gettysburghistory.org/our-holdings/',
    'www.gettysburgdaily.com': 'https://www.gettysburgdaily.com/fences-constructed-along-the-emmitsburg-road/',
    'en.wikipedia.org': 'https://en.wikipedia.org/wiki/Battle_of_Gettysburg,_first_day',
    'museum.dmna.ny.gov': 'https://museum.dmna.ny.gov/unit-history/infantry-1/60th-infantry-regiment/historical-sketch',
    'dmna.ny.gov': 'https://dmna.ny.gov/',
    'emergingcivilwar.com': 'https://emergingcivilwar.com/2022/09/30/fence-friday-post-and-rail/',
    'npgallery.nps.gov': 'https://npgallery.nps.gov/',
    'davidrumsey.com': 'https://davidrumsey.com/maps1100223-26914.html',
    'www.davidrumsey.com': 'https://www.davidrumsey.com/',
    'aleteia.org': 'https://aleteia.org/2024/07/09/the-daughters-of-charity-at-gettysburg-part-2-photos/',
    'www.battlefields.org': 'https://www.battlefields.org/',
    'www.savasbeatie.com': 'https://www.savasbeatie.com/content/Titles/Fall%202014/Pickett%20Hessler/excerpt%20From%20Picketts%20Charge.pdf',
    'civilwartalk.com': 'https://civilwartalk.com/threads/whitworths-at-gettysburg.129286/',
    'scrcguides.libraries.wm.edu': 'https://scrcguides.libraries.wm.edu/repositories/2/archival_objects/212965',
    'www.eyewitnesstohistory.com': 'https://www.eyewitnesstohistory.com/',
    'www.crossroadsofwar.org': 'https://www.crossroadsofwar.org/research/newspapers?id=6816',
    'www.thegettysburgexperience.com': 'https://www.thegettysburgexperience.com/',
    'www.ncpedia.org': 'https://www.ncpedia.org/biography/pettigrew-james-johnston',
    'www.strategypage.com': 'https://www.strategypage.com/',
    'www.civilwarnews.com': 'https://www.civilwarnews.com/',
    'www.thereconstructionera.com': 'https://www.thereconstructionera.com/',
    'digital.library.cornell.edu': 'https://digital.library.cornell.edu/catalog/may904002',
    'forum.game-labs.net': 'https://forum.game-labs.net/robots.txt',
    'geodata.libraries.mit.edu': 'https://geodata.libraries.mit.edu/record/gisogm:edu.umn:3cfe346bdd99',
    'storymaps.esri.com': 'https://storymaps.esri.com/stories/2013/gettysburg',
    'irma.nps.gov': 'https://irma.nps.gov/robots.txt',
    'catalog-beta.data.gov': 'https://catalog-beta.data.gov/',
    'catalog.data.gov': 'https://catalog.data.gov/',
    'www.gettysburg.edu': 'https://www.gettysburg.edu/',
    'libguides.gettysburg.edu': 'https://libguides.gettysburg.edu/gettdigital',
    'www.maine.gov': 'https://www.maine.gov/civilwar/books/index.html',
    'www.si.edu': 'https://www.si.edu/openaccess',
    'acoustics.org': 'https://acoustics.org/pressroom/httpdocs/136th/ross.htm',
    'blogs.loc.gov': 'https://blogs.loc.gov/loc/2023/11/where-did-lincoln-stand-while-delivering-the-gettysburg-address/',
    'gettysburgfoundation.org': 'https://gettysburgfoundation.org/george-spangler-farm',
    'www.civilwarintheeast.com': 'https://www.civilwarintheeast.com/',
    'civilwarintheeast.com': 'https://civilwarintheeast.com/',
}


def norm_host(h):
    h = h.lower()
    return h


# rows that mention each host (URL host, or a host named in the asked / result text)
rows_of = collections.defaultdict(set)
for r in inv:
    seen = set()
    for u in r['urls']:
        try:
            h = urlparse(u).netloc.lower()
        except Exception:
            h = ''
        if h:
            seen.add(h)
    txt = ' '.join([r['asked'] or '', r.get('orig_result') or ''])
    for h in HOSTRE.findall(txt):
        seen.add(h.lower())
    for h in seen:
        rows_of[h].add(r['lk_id'])

# fold bare names into the www form the plan uses (nps.gov is a reachable host and is not in this list)
FOLD = {'historynet.com': 'www.historynet.com', 'gettysburgdaily.com': 'www.gettysburgdaily.com', 'hmdb.org': 'www.hmdb.org',
        'battlefields.org': 'www.battlefields.org', 'wikipedia.org': 'en.wikipedia.org', 'crossroadsofwar.org': 'www.crossroadsofwar.org',
        'strategypage.com': 'www.strategypage.com', 'civilwarnews.com': 'www.civilwarnews.com'}
for a, b in FOLD.items():
    if a in rows_of:
        rows_of[b] |= rows_of.pop(a)

plan = []
n = 200


def add(url, purpose, lk, max_time=30, save=None):
    global n
    e = {'fid': 'F-%d' % n, 'url': url, 'purpose': purpose, 'lk': sorted(lk), 'max_time': max_time}
    if save:
        e['save'] = save
    plan.append(e)
    n += 1


# 1. reachable-host URLs not asked on 2026-11-13
add('https://www.loc.gov/item/2007630423/?fo=json', 'retry ws-town L34 (timeout 2026-11-15): LOC map item record (allowed path /item/, JSON interface)', {'LKR-ws-town-L34'}, 120, 'item-2007630423.json')
add('https://www.npshistory.com/publications/civil_war_series/16/sec8.htm', 'retry terrain-2 R13.P-04 (HTTP 502 three times on 2026-11-13): NPS Civil War Series, The Battle of Gettysburg, section 8', {'LKR-BH-terrain-2-R13.P-04#bh0'}, 120, 'cws16-sec8.htm')
add('https://www.nps.gov/gett/learn/news/gettysburg-foundation-buys-spangler-farm.htm', 'retry of an NPS news page that answered CONNECT 403 on 2026-11-13 (F-051, F-139) although www.nps.gov is reachable', {'LKR-T2-220', 'LKR-BH-fence-1-R14.S-016#bh1'}, 120, 'spangler-news.htm')

# 2. one request per refused host, never the do-not-retry hosts
for h in sorted(rows_of):
    if h in DNR or h in REACH:
        continue
    if re.search(r'archive\.org$', h):
        continue  # download nodes of archive.org (redirect targets); the reachable route is /cors/ on archive.org itself
    if h not in PREFERRED:
        print('NO PREFERRED URL for host', h, sorted(rows_of[h])[:3], file=sys.stderr)
        continue
    add(PREFERRED[h], 'retry of the refused host %s (one request; the rows that name it: %d)' % (h, len(rows_of[h])), rows_of[h], 30)

json.dump(plan, open(os.path.join(RETRY, 'plan10_today.json'), 'w'), indent=1)
print(len(plan), 'entries')
for e in plan:
    print(e['fid'], e['url'][:110], len(e['lk']))
