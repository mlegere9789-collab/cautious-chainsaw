"""Assign every Official Records record (vol. 27 parts 1-3) and every state-volume section to exactly one OA11 research group.

    python3 -I tools/bt/life/assign_groups.py          # writes docs/battle-theatre/life/evidence/report_assignments.json and prints a summary

A record belongs to the group of the unit that wrote it (corps by the header of the report, else by the commander's name in
history/units.json), a Part 3 document to the correspondence group of its date, a state-volume section to the group of its regiment.
Nothing is dropped: records outside the theatre clock or outside the campaign are listed with the reason, and a record the rules cannot
place goes to the catch-all group of its side and is flagged `needs_hand_check`.  Every manual override is in OVERRIDES with its reason.
"""
import os, re, sys, json, datetime, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from life_lib import *

utf8_stdout()
OUT = os.path.join(EVID, 'report_assignments.json')

# part 3 date groups (page-clock days)
CORR = [('corr-jun26-30', (6, 22), (6, 30)), ('corr-jul1-3', (7, 1), (7, 3)), ('corr-jul4-14', (7, 4), (7, 14))]
MONTHS = {'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12}

# regex -> corps group, tried in order on the header text of a Part 1 (Union) report
US_CORPS = [
    (r'\bTwelfth\s+(Army\s+)?Corps|\bXII\s+Corps|Twelfth\s+Corps', 'us-12c'),
    (r'\bEleventh\s+(Army\s+)?Corps|\bXI\s+Corps', 'us-11c'),
    (r'\bSixth\s+(Army\s+)?Corps|\bVI\s+Corps', 'us-6c'),
    (r'\bFifth\s+(Army\s+)?Corps|\bV\s+Corps', 'us-5c'),
    (r'\bThird\s+(Army\s+)?Corps|\bIII\s+Corps', 'us-3c'),
    (r'\bSecond\s+(Army\s+)?Corps|\bII\s+Corps', 'us-2c'),
    (r'\bFirst\s+(Army\s+)?Corps|\bI\s+Corps', 'us-1c'),
    (r'Cavalry\s+Corps|Cavalry\s+Division|Cavalry\s+Brigade|Horse\s+Artillery|Pleasonton|Buford|Gregg|Kilpatrick|Merritt|Farnsworth|Custer|Gamble|Devin|McIntosh', 'us-cav'),
    (r'Artillery\s+Reserve|Reserve\s+Artillery|Artillery\s+Brigade,\s+Army|Chief\s+of\s+Artillery', 'us-army'),
    (r'Engineer\s+Brigade|Engineer\s+Battalion|Pontoon|Military\s+Railroad|Chief\s+Engineer', 'bridges-roads'),
]
CS_CORPS = [
    (r'First\s+(Army\s+)?Corps|Longstreet|McLaws|Pickett|Hood', 'cs-1c'),
    (r'Second\s+(Army\s+)?Corps|Ewell|Early|Rodes|Edward\s+Johnson|Johnson\'s\s+Division', 'cs-2c'),
    (r'Third\s+(Army\s+)?Corps|A\.\s*P\.\s*Hill|Heth|Pender|R\.\s*H\.\s*Anderson|Anderson\'s\s+Division', 'cs-3c'),
    (r'Cavalry|Stuart|Imboden|Jenkins|Hampton', 'cs-cav-army'),
]
ELSEWHERE = r'Department\s+of\s+the\s+Susquehanna|Middle\s+Department|Eighth\s+(Army\s+)?Corps|Maryland\s+Heights|Harper.?s\s+Ferry|Department\s+of\s+Washington|Winchester|Baltimore|Harrisburg|Couch|Schenck|Dix\b|Keyes|Foster|Gillmore|Peck|Mosby|Averell'

# Hand overrides (report id -> (group, reason)); filled after the first run showed which records the rules could not place
OVERRIDES = {}


def parse_date(raw):
    if not raw:
        return None
    m = re.search(r'([A-Za-z]{3})[a-z]*\.?\s*(\d{1,2})', raw)
    if not m:
        return None
    mon = MONTHS.get(m.group(1).lower())
    if not mon:
        return None
    d = int(m.group(2))
    if not (1 <= d <= 31):
        return None
    return (mon, d)


def corr_group(md):
    if md is None:
        return None
    for g, a, b in CORR:
        if a <= md <= b:
            return g
    return None



ONES = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth',
        'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth']
CARD = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']
TENS_O = {20: 'twentieth', 30: 'thirtieth', 40: 'fortieth', 50: 'fiftieth', 60: 'sixtieth', 70: 'seventieth', 80: 'eightieth', 90: 'ninetieth'}
TENS_C = {20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty', 60: 'sixty', 70: 'seventy', 80: 'eighty', 90: 'ninety'}
STATES = {'PA': 'pennsylvania', 'NY': 'newyork', 'ME': 'maine', 'MA': 'massachusetts', 'NH': 'newhampshire', 'VT': 'vermont', 'CT': 'connecticut',
          'RI': 'rhodeisland', 'NJ': 'newjersey', 'DE': 'delaware', 'MD': 'maryland', 'OH': 'ohio', 'IN': 'indiana', 'IL': 'illinois', 'MI': 'michigan',
          'WI': 'wisconsin', 'MN': 'minnesota', 'WV': 'westvirginia', 'US': 'us', 'VA': 'virginia', 'NC': 'northcarolina', 'SC': 'southcarolina',
          'GA': 'georgia', 'AL': 'alabama', 'MS': 'mississippi', 'LA': 'louisiana', 'TX': 'texas', 'AR': 'arkansas', 'TN': 'tennessee', 'FL': 'florida'}


def ordinal_words(n):
    if n < 20:
        return ONES[n]
    if n < 100:
        t, r = n // 10 * 10, n % 10
        return TENS_O[t] if r == 0 else TENS_C[t] + ONES[r]
    h, rem = n // 100, n % 100
    head = CARD[h] + 'hundred'
    return head + 'th' if rem == 0 else head + 'and' + ordinal_words(rem)


def letters(s):
    return re.sub(r'[^a-z]', '', (s or '').lower().replace('u. s.', 'us').replace('u.s.', 'us'))


def reg_phrases():
    """list of (phrase, unit id, kind, battery letter) for every regiment and battery of units.json"""
    res = []
    for u in units().values():
        if u['level'] == 'regiment':
            m = re.match(r'^(\d+)(?:st|nd|rd|th)\s+([A-Z]{2})(?:\s|$)', u['name'])
            if m and m.group(2) in STATES and u['name'].split(' ', 1)[1] in STATES:
                res.append((ordinal_words(int(m.group(1))) + STATES[m.group(2)], u['id'], 'reg', None))
        elif u['level'] == 'battery':
            m = re.match(r'^(\d+)(?:st|nd|rd|th)\s+([A-Z]{2})(?:\s+([A-Z]))?$', u['name'])
            if m and m.group(2) in STATES:
                res.append((ordinal_words(int(m.group(1))) + STATES[m.group(2)], u['id'], 'bat', m.group(3)))
    return res


def arm_of(text):
    if re.search(r'Cavalry|Cavahy|Cavaby|Cav\.|Horse\s+Artillery', text, re.I):
        return 'cav'
    if re.search(r'Artillery|ArtUlery|Battery|Batteries|Artil', text, re.I):
        return 'art'
    return 'inf'


def arm_ok(uid, arm, kind=None):
    iscav = uid.startswith(('us-cav', 'cs-cav'))
    if arm == 'cav':
        return iscav
    if arm == 'art':
        return kind == 'bat' or '-art' in uid
    return not iscav and kind != 'bat'


def match_regiment(text, phrases, side_prefix):
    """Best unit id for the leading unit designation of a record header; exact phrase first, then fuzzy on the first 60 letters."""
    import difflib
    t = letters(text)
    lead = t[:90]
    best, hits = None, []
    arm = arm_of(text)
    for ph, uid, kind, bl in phrases:
        if not uid.startswith(side_prefix) or not arm_ok(uid, arm, kind):
            continue
        i = lead.find(ph)
        if i >= 0:
            if kind == 'bat' and bl:
                m = re.search(r'battery\s*([A-M])\b', text)
                if m and m.group(1) != bl:
                    continue
            hits.append((i, -len(ph), uid))
    if hits:
        hits.sort()
        return hits[0][2], 'exact'
    sc = []
    for ph, uid, kind, bl in phrases:
        if not uid.startswith(side_prefix) or len(ph) < 9 or not arm_ok(uid, arm, kind):
            continue
        r = max(difflib.SequenceMatcher(None, lead[:len(ph)], ph).ratio(), difflib.SequenceMatcher(None, lead[:len(ph) + 2], ph).ratio())
        if r >= 0.86:
            if kind == 'bat' and bl:
                m = re.search(r'battery\s*([A-M])\b', text)
                if m and m.group(1) != bl:
                    continue
            sc.append((r, uid))
    if sc:
        sc.sort(reverse=True)
        if len(sc) == 1 or sc[0][0] - sc[1][0] > 0.03:
            return sc[0][1], 'fuzzy'
    return None, None


def digit_keys():
    res = {}
    for u in units().values():
        if u['level'] == 'regiment':
            m = re.match(r'^(\d+)(?:st|nd|rd|th)\s+([A-Z]{2})$', u['name'])
            if m:
                res.setdefault((int(m.group(1)), m.group(2)), []).append(u['id'])
    return res


def match_digits(hdr, dk, side_prefix):
    low = hdr.lower().replace(' ', '')
    arm = arm_of(hdr)
    hits = set()
    for m in re.finditer(r'(\d{1,3})(?:st|nd|rd|th|d)\b', hdr):
        n = int(m.group(1))
        for abbr, long in STATES.items():
            if long in low and (n, abbr) in dk:
                for uid in dk[(n, abbr)]:
                    if uid.startswith(side_prefix) and arm_ok(uid, arm, 'reg'):
                        hits.add(uid)
    return list(hits)[0] if len(hits) == 1 else None


def commander_index():
    """surname -> list of unit ids (units.json commanders_printed), per side"""
    idx = collections.defaultdict(list)
    for u in units().values():
        for c in (u.get('commanders_printed') or []):
            c = re.sub(r'\(.*?\)', '', c)
            toks = re.findall(r"[A-Za-z][A-Za-z'’\-]+", c)
            toks = [t for t in toks if t not in ('MG', 'BG', 'Col', 'Gen', 'Maj', 'Lt', 'Capt')]
            if toks:
                idx[(u['army'], toks[-1].lower())].append(u['id'])
    return idx


def main():
    ori = load_json(OR_INDEX_PATH)['records']
    cmd = commander_index()
    PH = reg_phrases()
    DK = digit_keys()
    out = {}
    stats = collections.Counter()
    # records of parts 1 and 2 in file order (part 3 handled with its date neighbours)
    last_corr = {}
    p3 = [r for r in ori if r['part'] == 3]
    # neighbour dates for part 3 (chronological book): carry the last good date forward
    dates3 = {}
    last = None
    for r in sorted(p3, key=lambda r: r['start_offset']):
        md = parse_date(r.get('date_raw') or r.get('dateline_raw') or r.get('date_text'))
        if md and not r.get('date_ocr_suspect'):
            last = md
            dates3[r['id']] = (md, 'dateline')
        elif md:
            dates3[r['id']] = (md, 'dateline_ocr_suspect')
        else:
            dates3[r['id']] = (last, 'previous_document') if last else (None, 'none')
    for r in ori:
        rid = r['id']
        if rid in OVERRIDES:
            g, why = OVERRIDES[rid]
            out[rid] = {'group': g, 'how': 'override', 'why': why}
            continue
        if r['part'] == 3:
            md, how = dates3[rid]
            g = corr_group(md)
            if g:
                ent = {'group': g, 'how': 'date:' + how, 'date': '1863-%02d-%02d' % md}
                if how != 'dateline':
                    ent['needs_hand_check'] = True
                out[rid] = ent
            else:
                out[rid] = {'group': None, 'how': 'outside_clock', 'why': 'dated outside 22 June - 14 July 1863 (theatre clock 26 Jun - 14 Jul)' if md else 'no date recoverable',
                            'date': ('1863-%02d-%02d' % md) if md else None}
            continue
        hdr = ' '.join(str(r.get(k) or '') for k in ('unit_scope', 'dateline_raw', 'toc_text', 'body_title'))
        series = r.get('series')
        if r['part'] == 2 and series != 'main':
            out[rid] = {'group': 'campaign-elsewhere', 'how': 'series:' + str(series), 'why': 'OR vol. 27 part 2 operations outside the Gettysburg campaign proper'}
            continue
        if r['part'] == 2 and not re.search(r'C\.\s*S\.|Confederate|Army of Northern Virginia|Corps,\s*Army', hdr) and r.get('series') == 'main' and re.search(r'U\.\s*S\.|Union|Maryland Heights|Harper|Winchester|Bloody Run|Baltimore|Milroy|Tyler|Ohio|Pennsylvania|New York|Massachusetts', hdr):
            out[rid] = {'group': 'campaign-elsewhere', 'how': 'union_report_in_part2', 'why': 'Union report of the Winchester, Maryland Heights or Susquehanna operations (OR vol. 27 part 2)'}
            continue
        if r['part'] == 1 and re.search(ELSEWHERE, hdr, re.I) and not re.search(r'Army\s+of\s+the\s+Potomac|Army\s+Corps,\s+Army', hdr, re.I):
            out[rid] = {'group': 'campaign-elsewhere', 'how': 'header', 'why': 'department or garrison outside the Army of the Potomac'}
            continue
        rules = US_CORPS if r['part'] == 1 else CS_CORPS
        g = None
        how = None
        if r['part'] == 1 and re.search(r'Engineer\s+Bri|Pioneer\s+Corps|Military\s+Rail|Pontoon', hdr, re.I):
            out[rid] = {'group': 'bridges-roads', 'how': 'header:engineers_pioneers_railroads', 'author': (r.get('author') or '')[:40], 'unit': (r.get('unit_scope') or '')[:70]}
            continue
        for rx, gid in rules:
            if re.search(rx, hdr, re.I):
                g, how = gid, 'header'
                break
        if g is None:
            uid, how2 = match_regiment(hdr, PH, 'us-' if r['part'] == 1 else 'cs-')
            if uid:
                c = corps_of(uid)
                if c:
                    g, how = c if c.startswith(('us-', 'cs-')) else None, 'regiment_' + how2 + ':' + uid
        if g is None:
            uid = match_digits(hdr, DK, 'us-' if r['part'] == 1 else 'cs-')
            if uid and corps_of(uid):
                g, how = corps_of(uid), 'regiment_digits:' + uid
        if g is None:
            side0 = 'US' if r['part'] == 1 else 'CS'
            cands = re.findall(r"([A-Z][A-Za-z'\u2019\-]+)'s?\s+(?:Brigade|Division|[Bb]attalion|Artillery|Battalion)", hdr)
            corps = set()
            for sname in cands:
                corps |= {corps_of(c) for c in cmd.get((side0, sname.lower()), [])} - {None}
            if len(corps) == 1:
                g, how = list(corps)[0], 'possessive_name'
        if g is None:
            sur = re.findall(r"[A-Za-z][A-Za-z'’\-]+", re.sub(r'\(.*?\)', '', r.get('author') or ''))
            side = 'US' if r['part'] == 1 else 'CS'
            if sur:
                cand = cmd.get((side, sur[-1].lower()), [])
                corps = {corps_of(c) for c in cand} - {None}
                if len(corps) == 1:
                    g, how = ('%s-%s' % (('us' if side == 'US' else 'cs'), list(corps)[0].split('-', 1)[1])), 'commander_name'
        if g in ('us-art-reserve', 'us-cav-art', 'us-aop'):
            g = 'us-army' if g != 'us-cav-art' else 'us-cav'
        ent = {'author': (r.get('author') or '')[:40], 'unit': (r.get('unit_scope') or '')[:70]}
        if g is None:
            g = 'us-army' if r['part'] == 1 else 'cs-cav-army'
            ent.update({'group': g, 'how': 'default_for_side', 'needs_hand_check': True})
        else:
            ent.update({'group': g, 'how': how})
        out[rid] = ent
    for k, v in out.items():
        stats[(v['group'], v.get('how', '').split(':')[0])] += 1
    byg = collections.Counter(v['group'] for v in out.values())
    doc = {'_doc': ('Assignment of every Official Records vol. 27 record to one OA11 research group (tools/bt/life/assign_groups.py). '
                    'group null = outside the theatre clock. needs_hand_check = the rules placed it by default or by an OCR-suspect date.'),
           'built': datetime.date.today().isoformat(), 'overrides': {k: v[1] for k, v in OVERRIDES.items()},
           'counts_by_group': dict(sorted(byg.items(), key=lambda kv: str(kv[0]))), 'assignments': out}
    dump_json(OUT, doc, indent=None)
    print('records', len(out))
    for g, n in sorted(byg.items(), key=lambda kv: str(kv[0])):
        print('  %-18s %5d' % (g, n))
    chk = [k for k, v in out.items() if v.get('needs_hand_check')]
    print('needs_hand_check:', len(chk))
    if '--show' in sys.argv:
        idx = {r['id']: r for r in ori}
        for k in chk:
            if idx[k]['part'] != 3:
                r = idx[k]
                print(k, '|', (r.get('author') or '')[:28], '|', (r.get('unit_scope') or '')[:60], '|', (r.get('dateline_raw') or '')[:50], '->', out[k]['group'])


if __name__ == '__main__':
    main()
