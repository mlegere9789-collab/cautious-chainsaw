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
    commas (lists of tablets, in which no name contains a comma), or, for a sentence that names one memorial, given in ITEMS below
    and then looked up in the entry (every item must be a substring of the entry, in order; the build stops otherwise);
  * `name_as_printed` is the item exactly as the entry prints it (one trailing full stop or semicolon removed); `name` is the same
    without the list words 'the' / 'and' / 'and the' in front of it. Neither is matched to anything.
  * `quote` is the whole entry, verbatim, so that the card shows the report's own wording; `year`/`year_to` are the header years of
    the entry ('CE 1885 - 1886'); `text_years` are the years the entry's own sentence gives ('In 1909-1911'); when the two differ
    `years_differ` is true and both are carried.

Entries that name no memorial (anniversaries, avenues, fences, pillars, the unnamed guns of batteries) are not rows; each is
listed with its reason in extracts/memorial_years_left.json, so that nothing is hidden.

  memorial_years.py            build extracts/memorial_years.jsonl, memorial_years_left.json and memorial_years.md
  memorial_years.py --check    rebuild in memory and compare with the files (exit 1 on a difference)
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


def norm(s):
    return re.sub(r'\s+', ' ', s).strip()


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for c in iter(lambda: f.read(1 << 20), b''):
            h.update(c)
    return h.hexdigest()


def load_pages(sid, layout=False):
    p = os.path.join(LIB, sid, sid + ('.layout.txt' if layout else '.txt'))
    txt = open(p, encoding='utf-8').read()
    parts = re.split(r'^=== PAGE (\d+) ===\n', txt, flags=re.M)
    return {int(parts[i]): parts[i + 1] for i in range(1, len(parts), 2)}, sha256_file(p), os.path.relpath(p, ROOT)


FOOTER = re.compile(r'\s*Cultural Landscapes Inventory(?: Part \w+)? Page \d+(?: of \d+)?\s*$')
HEAD = re.compile(r'\b(CE|AD) (\d{4})(?: - (\d{4}))? Memorialized ')
NEXT = re.compile(r'\b(?:CE|AD) \d{4}(?: - \d{4})? [A-Z]')

# Entries that are lists written with semicolons after a colon ('semi'), lists of tablets written with commas after a colon ('comma'),
# a sentence that names memorials, given by explicit items ('items': the strings are looked up in the entry), or that names no
# memorial ('none': the reason).  Key: (source, pdf page, header years as printed).
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
    ('NPS-CLI-PCB', 45, 'CE 1971'): ('semi_sentence', 'Sponsor Tablet is also installed.'),
    ('NPS-CLI-PCB', 45, 'CE 1973'): ('semi_tail', ' is also installed.'),
    ('NPS-CLI-PCB', 45, 'CE 1982'): ('semi',),
    ('NPS-CLI-PCB', 45, 'CE 1998'): ('semi_sentence', 'Includes two tablets: Biography and Battle History.'),
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
    ('NPS-CLI-LRT', 31, 'CE 1911 - 1912'): ('comma_and',),
    ('NPS-CLI-LRT', 31, 'CE 1919'): ('items', ['United States Signal Corps Marker']),
    ('NPS-CLI-LRT', 31, 'CE 1938'): ('none', 'an anniversary reunion of veterans: no memorial is named'),
    ('NPS-CLI-LRT', 32, 'CE 1988'): ('items', ['Brigadier General Samuel W. Crawford Statue']),
    # ---- Emmitsburg Road Ridge (NPS-CLI-ERR)
    ('NPS-CLI-ERR', 33, 'CE 1880'): ('none', 'the battery guns and shell pyramids that the GBMA placed from 1880 to mark Union batteries are not named individually; the saved text of this cell also carries the page heading words inside the entry'),
    ('NPS-CLI-ERR', 34, 'CE 1886'): ('comma_and_the',),
    ('NPS-CLI-ERR', 34, 'CE 1888'): ('comma_and_the',),
    ('NPS-CLI-ERR', 34, 'CE 1889'): ('comma_and_the',),
    ('NPS-CLI-ERR', 34, 'CE 1892'): ('items', ['the 16th Vermont Infantry Monument']),
    ('NPS-CLI-ERR', 35, 'CE 1893'): ('comma_and_the',),
    ('NPS-CLI-ERR', 35, 'CE 1896'): ('none', 'shell and chain fencing in front of three tablets (the tablets are named only as the place of the fence)'),
    ('NPS-CLI-ERR', 35, 'CE 1897'): ('none', 'stone pillars topped with shells at two road intersections: no memorial is named'),
    ('NPS-CLI-ERR', 35, 'CE 1900'): ('comma_and_the',),
    ('NPS-CLI-ERR', 35, 'CE 1901'): ('items', ['The Sickles (Wounded) Marker']),
    ('NPS-CLI-ERR', 36, 'CE 1907'): ('comma',),
    ('NPS-CLI-ERR', 36, 'CE 1910'): ('items', ['Humphreys’ Division Tablet']),
    ('NPS-CLI-ERR', 36, 'CE 1912'): ('comma',),
    ('NPS-CLI-ERR', 36, 'CE 1913#1'): ('none', 'an anniversary: no memorial is named'),
    ('NPS-CLI-ERR', 36, 'CE 1913#2'): ('items', ['General Sickles’ Headquarters Marker']),
    ('NPS-CLI-ERR', 36, 'CE 1914'): ('items', ['General Humphreys Monument']),
    ('NPS-CLI-ERR', 36, 'CE 1915'): ('damaged', 'Four markers are erected in Excelsior Field (Trostle Field #1)'),
    ('NPS-CLI-ERR', 37, 'CE 1938'): ('none', 'an anniversary: no memorial is named'),
    ('NPS-CLI-ERR', 37, 'CE 1963'): ('none', 'an anniversary: no memorial is named'),
}


def split_semicolons(body):
    out = []
    for it in re.split(r';\s*', body):
        it = it.strip().rstrip('.').strip()
        it = re.sub(r'^and\s+', '', it)
        if it:
            out.append(it)
    return out


def split_commas(body):
    out = []
    for it in re.split(r',\s*', body):
        it = it.strip().rstrip('.').strip()
        it = re.sub(r'^and\s+', '', it)
        if it:
            out.append(it)
    return out


def strip_lead(name):
    return re.sub(r'^(?:and the |and |the )', '', name, flags=re.I)


def entries_of(sid):
    pages, tsha, tpath = load_pages(sid)
    out = []
    for p in sorted(pages):
        N = norm(pages[p])
        heads = list(HEAD.finditer(N))
        counts = {}
        for m in heads:
            ent_end = len(N)
            nm = NEXT.search(N, m.end())
            if nm:
                ent_end = nm.start()
            ent = N[m.start():ent_end].strip()
            ent = FOOTER.sub('', ent).strip()
            hdr = '%s %s%s' % (m.group(1), m.group(2), (' - ' + m.group(3)) if m.group(3) else '')
            counts[hdr] = counts.get(hdr, 0) + 1
            out.append({'sid': sid, 'page': p, 'hdr': hdr, 'n': counts[hdr], 'entry': ent, 'page_text': N})
    # a header that repeats on the same page gets '#k' (k-th on the page) in the rule key
    return out, tsha, tpath, pages


def rule_key(e, entries):
    same = [x for x in entries if x['sid'] == e['sid'] and x['page'] == e['page'] and x['hdr'] == e['hdr']]
    return (e['sid'], e['page'], e['hdr'] + ('#%d' % e['n'] if len(same) > 1 else ''))


def years_of(hdr):
    m = re.match(r'(?:CE|AD) (\d{4})(?: - (\d{4}))?', hdr)
    return int(m.group(1)), (int(m.group(2)) if m.group(2) else None)


def build():
    rows, left = [], []
    srcmeta = {}
    for sid in ('NPS-CLI-PCB', 'NPS-CLI-LRT', 'NPS-CLI-ERR'):
        entries, tsha, tpath, pages = entries_of(sid)
        srcmeta[sid] = {'text_sha256': tsha, 'text_path': tpath}
        seen = set()
        for e in entries:
            key = rule_key(e, entries)
            seen.add(key)
            rule = RULES.get(key)
            if rule is None:
                raise SystemExit('no rule for entry %r: %s' % (key, e['entry'][:160]))
            y1, y2 = years_of(e['hdr'])
            body_start = e['entry'].find('Memorialized ') + len('Memorialized ')
            text = e['entry'][body_start:]
            kind = rule[0]
            if kind == 'none':
                left.append({'source_id': sid, 'pdf_page': e['page'], 'header_years': e['hdr'], 'entry': e['entry'], 'why_not_a_row': rule[1]})
                continue
            list_head, items = None, []
            if kind in ('semi', 'semi_sentence', 'semi_tail'):
                if ':' not in text:
                    raise SystemExit('no colon in %r' % (key,))
                list_head, body = text.split(':', 1)
                body = body.strip()
                extra = None
                if kind == 'semi_sentence':
                    if not body.endswith(rule[1]):
                        raise SystemExit('expected tail sentence %r in %r' % (rule[1], key))
                    extra = rule[1]
                    body = body[:-len(rule[1])].strip()
                if kind == 'semi_tail':
                    if not body.endswith(rule[1]):
                        raise SystemExit('expected tail %r in %r' % (rule[1], key))
                    extra = rule[1].strip()
                    body = body[:-len(rule[1])].strip()
                items = split_semicolons(body)
                tail = extra
            elif kind in ('comma', 'comma_and', 'comma_and_the'):
                if ':' in text:
                    list_head, body = text.split(':', 1)
                else:
                    list_head, body = text.split(' are erected in the project area: ', 1) if ' are erected in the project area: ' in text else (None, text)
                items = split_commas(body.strip())
                tail = None
            elif kind == 'items':
                items = list(rule[1])
                list_head = text
                tail = None
            elif kind == 'damaged':
                raise SystemExit('entry %r needs its page image: add its explicit items to RULES' % (key,))
            else:
                raise SystemExit('unknown rule %r' % (rule,))
            if kind == 'comma_and_the':
                # 'Two monuments are erected in the project area: the A and the B.' / 'the A, the B, and the C.'
                pass
            # ERR lists: 'a, b, and c' or 'a and b' (two items): split at ' and the ' when only two are listed
            if kind == 'comma_and_the' and len(items) == 1 and ' and the ' in items[0]:
                items = [x for x in re.split(r' and (?=the )', items[0])]
            if kind in ('comma_and_the',):
                fixed = []
                for it in items:
                    fixed.append(it)
                items = fixed
            # LRT 1911-1912: 'five Brigade Tablets, Army of the Potomac: Bartlett's Brigade-Wheatfield Road, ..., and Weed's Brigade-Sykes Avenue.'
            # every item must be found in the entry, in order
            pos = 0
            norm_entry = e['entry']
            for it in items:
                i = norm_entry.find(it, pos)
                if i < 0:
                    raise SystemExit('item %r of %r is not in the entry, in order' % (it, key))
                pos = i + len(it)
            thead = re.search(r'\b(?:in|In) (\d{4})(?: ?[-–] ?(\d{4}))?', text)
            text_years = None
            if thead:
                text_years = [int(thead.group(1))] + ([int(thead.group(2))] if thead.group(2) else [])
            cal = re.findall(r'\(ca\.\s*\d{4}(?:\s*[-–]\s*\d{4})?\)', e['entry'])
            for k, it in enumerate(items, 1):
                nm = strip_lead(it)
                row = {
                    'id': 'NPSMY-%s-p%03d-%d-%02d' % (SHORT[sid], e['page'], y1, k) + ('b' if e['n'] > 1 and len([x for x in entries if x['sid'] == sid and x['page'] == e['page'] and x['hdr'] == e['hdr']]) > 1 and e['n'] > 1 else ''),
                    'source_id': sid, 'pdf_page': e['page'],
                    'name': nm, 'name_as_printed': it,
                    'year': y1, 'year_to': y2, 'header_years': e['hdr'],
                    'event_printed': 'Memorialized',
                    'list_head': norm(list_head) if list_head else None,
                    'item_index': k, 'items_in_entry': len(items),
                    'quote': e['entry'],
                    'text_years': text_years,
                    'years_differ': bool(text_years and (text_years[0] != y1 or (len(text_years) > 1 and text_years[1] != (y2 or text_years[1])))),
                    'also_in_entry': tail,
                    'ca_in_entry': cal or None,
                    'state_date': ('erected %d' % y1) + (' to %d' % y2 if y2 else '') + ' (the chronology year of the memorial, not an 1863 state)',
                    'use_for_1863': 'none',
                    'tier_proposed': 'documented',
                    'tier_basis': 'a National Park Service inventory prints the year of this memorial in its chronology table; the inventory\'s own sources are not named in the cell',
                    'retrieved': RETRIEVED,
                    'text_variant': 'reading-order',
                    'text_path': tpath, 'text_sha256': tsha,
                    'url': None,
                }
                rows.append(row)
        # no rule may be left unused (a changed text would otherwise go unnoticed)
        for key in RULES:
            if key[0] == sid and key not in seen:
                raise SystemExit('rule %r matched no entry' % (key,))
    return rows, left, srcmeta


if __name__ == '__main__':
    rows, left, srcmeta = build()
    print(len(rows), 'rows;', len(left), 'entries left out')
    for r in rows:
        print('%-26s p%-3d %s%s | %s | %s' % (r['id'], r['pdf_page'], r['year'], ('-%d' % r['year_to']) if r['year_to'] else '', r['name_as_printed'], r['name']))
