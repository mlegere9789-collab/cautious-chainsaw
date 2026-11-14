#!/usr/bin/env python3
"""Probe the public hosts that the town and buildings evidence pass may use, and log every request.

Planning step of the bt-town workstream. One request per second per host (5 seconds for www.loc.gov, whose robots.txt
states a crawl delay of 5). Public pages only; no login, no CAPTCHA, no bot-block circumvention: a refusal is recorded as
blocked and not retried. Every request is one line of GOVERNANCE/horde/ws-town/lookups.jsonl (append only):
  {at, id, url, http, bytes, sha256, outcome, note, saved}
Saved bodies go under tmp/town/probe/ (untracked).

    python3 tools/bt/town/probe_hosts.py            # run the built-in list (skips ids already logged as ok)
    python3 tools/bt/town/probe_hosts.py --list     # print the list
"""
import hashlib, json, os, subprocess, sys, time, urllib.parse

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
LOG = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-town', 'lookups.jsonl')
OUT = os.path.join(ROOT, 'tmp', 'town', 'probe')
UA = 'Mozilla/5.0 (compatible; public-domain-study/1.0)'

# (id, url, what it is for)
PROBES = [
    ('loc-hopkins-1858', 'https://www.loc.gov/item/2004629149/?fo=json', 'Hopkins 1858 Adams County map with the Gettysburg borough inset (LOC item record)'),
    ('loc-warren-1869', 'https://www.loc.gov/item/99448794/?fo=json', 'Warren survey sheet used by the 1863 base map (LOC item record)'),
    ('loc-habs-gettysburg', 'https://www.loc.gov/collections/historic-american-buildings-landscapes-and-engineering-records/?q=gettysburg+pennsylvania&fo=json&c=10', 'HABS/HAER/HALS records for Gettysburg (collection listing)'),
    ('loc-sanborn-gettysburg', 'https://www.loc.gov/collections/sanborn-maps/?q=gettysburg+pennsylvania&fo=json&c=10', 'Sanborn fire insurance maps of Gettysburg (later than 1863: storeys, walls, roofs as a continuity check only)'),
    ('loc-cwp-town', 'https://www.loc.gov/collections/civil-war-glass-negatives/?q=gettysburg+street&fo=json&c=10', 'LOC Civil War photographs of the town (collection listing)'),
    ('ca-search-1863', 'https://www.loc.gov/collections/chronicling-america/?fo=json&at=results%2Cpagination&dl=page&c=5&q=gettysburg+court+house+hospital&dates=1863-07-04/1863-07-31', '1863 Pennsylvania newspapers on Chronicling America (page search)'),
    ('archive-hoke-1887', 'https://archive.org/advancedsearch.php?q=title%3A%28great+invasion%29+AND+creator%3Ahoke&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=year&rows=10&output=json', 'Hoke, The Great Invasion of 1863 (1887): town damage and hospital use'),
    ('archive-adams-history-1886', 'https://archive.org/advancedsearch.php?q=title%3A%28history+of+cumberland+and+adams+counties%29&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=year&rows=10&output=json', 'History of Cumberland and Adams Counties (1886): borough churches, schools, hotels, mills'),
    ('archive-lady-diary', 'https://archive.org/advancedsearch.php?q=title%3A%28diary+of+a+lady+of+gettysburg%29&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=year&rows=10&output=json', 'Broadhead, Diary of a Lady of Gettysburg (1864): the town in the days of the battle'),
    ('archive-census-1860', 'https://archive.org/advancedsearch.php?q=title%3A%28eighth+census%29+AND+date%3A%5B1860-01-01+TO+1866-12-31%5D&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=year&rows=10&output=json', 'Published volumes of the 1860 census (county and borough totals only; the manuscript schedules are not on this host)'),
    ('archive-claims-pa', 'https://archive.org/advancedsearch.php?q=%28damage+claims+AND+gettysburg%29+AND+mediatype%3Atexts&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=year&rows=10&output=json', 'Printed lists of the Pennsylvania damage claims of 1863 (Adams County)'),
    ('npshistory-gett-index', 'https://www.npshistory.com/publications/gett/index.htm', 'Park Service historic structure reports and landscape studies of Gettysburg (listing)'),
    ('nps-gett-wills-house', 'https://www.nps.gov/gett/learn/historyculture/index.htm', 'Park Service history and culture index (building pages of the borough, e.g. the Wills house)'),
    ('nara-catalog', 'https://catalog.archives.gov/', 'National Archives catalog (host reachability only)'),
    ('achs-gettysburghistory', 'https://gettysburghistory.org/our-holdings/', 'Adams County Historical Society holdings (damage claims index, 1858 and 1872 name indexes)'),
    ('npgallery-nrhp', 'https://npgallery.nps.gov/', 'National Register documentation host (Gettysburg Historic District nomination)'),
    ('gutenberg-search', 'https://www.gutenberg.org/ebooks/search/?query=gettysburg+town', 'Project Gutenberg texts that describe the borough in 1863'),
]


def sh(cmd, timeout=60):
    return subprocess.run(cmd, capture_output=True, timeout=timeout)


def already_ok():
    ok = set()
    if os.path.exists(LOG):
        for l in open(LOG, encoding='utf-8'):
            l = l.strip()
            if l:
                try:
                    r = json.loads(l)
                except Exception:
                    continue
                if r.get('outcome') in ('ok', 'refused', 'blocked'):
                    ok.add(r['id'])
    return ok


def main():
    if '--list' in sys.argv:
        for i, u, w in PROBES:
            print(i, u, '-', w)
        return
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    done = already_ok()
    last = {}
    for pid, url, what in PROBES:
        if pid in done:
            continue
        host = urllib.parse.urlparse(url).netloc
        gap = 5.5 if host.endswith('www.loc.gov') else 1.2
        w = last.get(host, 0) + gap - time.time()
        if w > 0:
            time.sleep(w)
        body = os.path.join(OUT, pid + '.body')
        r = sh(['curl', '-sS', '-L', '--max-time', '45', '-A', UA, '-o', body, '-w', '%{http_code} %{size_download} %{url_effective}', url], 70)
        last[host] = time.time()
        out = r.stdout.decode('utf-8', 'replace').strip()
        parts = out.split(' ', 2)
        http = int(parts[0]) if parts and parts[0].isdigit() else 0
        size = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 0
        sha = ''
        note = ''
        if os.path.exists(body) and size:
            data = open(body, 'rb').read()
            sha = hashlib.sha256(data).hexdigest()
            head = data[:600].decode('utf-8', 'replace').replace('\n', ' ')
            note = head[:200]
        if r.returncode != 0:
            outcome, note = 'failed', (r.stderr.decode('utf-8', 'replace')[:200])
        elif http in (200,):
            outcome = 'ok'
        elif http in (401, 403, 429, 451):
            outcome = 'blocked'
        elif http in (404, 410):
            outcome = 'refused' if http == 410 else 'not_found'
        else:
            outcome = 'failed'
        rec = {'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'id': pid, 'url': url, 'what': what, 'http': http, 'bytes': size,
               'sha256': sha, 'outcome': outcome, 'note': note, 'saved': os.path.relpath(body, ROOT) if size else ''}
        with open(LOG, 'a', encoding='utf-8') as f:
            f.write(json.dumps(rec, ensure_ascii=False) + '\n')
        print(pid, http, size, outcome)


if __name__ == '__main__':
    main()
