"""NY family build: Register PDFs -> labelled CSV per unit.

Run (below normal priority, isolated):  python -I -X utf8 ny_build.py [unit_id ...]
Inputs : tmp/library/rosters/NY/*.pdf (see data/NY/acquired.json), data/NY/unit_map.json
Outputs: data/NY/rosters/<unit_id>.csv, data/NY/build_stats.json
"""
import sys, os, re, json, csv, collections, ctypes, datetime
try:
    ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x4000)
except Exception:
    pass
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import pymupdf
from ny_register import *

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
DATA = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data', 'NY')
CACHE = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'NY')
OUT = os.path.join(DATA, 'rosters')
os.makedirs(OUT, exist_ok=True)

COLS = ['unit_id', 'regiment', 'company', 'attached_to_unit_id', 'section', 'name_as_printed', 'name_clean', 'age', 'rank_as_printed', 'enlisted_or_mustered',
        'residence_as_printed', 'remarks_as_printed', 'presence_label', 'presence_basis', 'basis_code', 'roll_status', 'dup_group',
        'source_id', 'source_page_pdf', 'parse_flags', 'cross_source']

FS_RANKS = re.compile(r'(colonel|lieutenant.colonel|major|adjutant|quartermaster|surgeon|chaplain|sergeant.major|hospital steward|principal musician|drum.major|commissary)', re.I)


def regiment_name(u):
    d = u['designation']
    return re.sub(r'\s*\(.*?\)\s*', ' ', d).strip()


def load_map():
    return json.load(open(os.path.join(DATA, 'unit_map.json'), encoding='utf-8'))


def residence(body):
    m = re.search(r'Enlisted(?:,\s*[A-Z][a-z]+ \d{1,2},\s*\d{4},)?\s*(?:at|in)\s+([^,;]+?)(?:,|;|$)', body)
    return m.group(1).strip() if m else ''


def known_given_names(all_entries):
    c = collections.Counter()
    for es in all_entries:
        for e in es:
            g = e['given'].split(' ')[0].rstrip('.') if e['given'] else ''
            if g.isalpha():
                c[g] += 1
    return c


def name_fix(surname, given, known):
    """repair the letter-spaced ABBYY merge of a middle initial into the given name (JOHND -> JOHN D., DENNISB. W. -> DENNIS B. W.)."""
    flags = []
    toks = given.split(' ')
    first = toks[0] if toks else ''
    core = first.rstrip('.')
    if core.isalpha() and len(core) >= 5 and known.get(core[:-1], 0) >= 3 and known.get(core, 0) * 3 <= known.get(core[:-1], 0):
        toks = [core[:-1], core[-1] + '.'] + toks[1:]
        flags.append('initial-split')
    g = ' '.join(toks)
    return tidy_name(surname, g), flags


def surname_suspect(surname):
    s = re.sub(r"[^A-Za-z]", '', surname)
    if len(s) < 3:
        return True
    if not re.search(r'[AEIOUY]', s.upper()):
        return True
    return bool(re.search(r"(.)\1\1", s.upper()))



UNITS_ONES = {'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5, 'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9, 'tenth': 10, 'eleventh': 11, 'twelfth': 12, 'thirteenth': 13,
              'fourteenth': 14, 'fifteenth': 15, 'sixteenth': 16, 'seventeenth': 17, 'eighteenth': 18, 'nineteenth': 19, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9}
TENS = {'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90, 'twentieth': 20, 'thirtieth': 30, 'fortieth': 40, 'fiftieth': 50, 'sixtieth': 60, 'seventieth': 70, 'eightieth': 80, 'ninetieth': 90}


def ordinal_words_to_num(txt):
    t = re.sub(r'[^a-z\- ]', '', txt.lower()).replace('-', ' ')
    toks = t.split()
    n = 0
    seen = False
    for w in toks:
        if w == 'hundred' or w == 'hundredth':
            n = (n or 1) * 100 if n < 100 else n + 100
            seen = True
        elif w in TENS:
            n += TENS[w]
            seen = True
        elif w in UNITS_ONES:
            n += UNITS_ONES[w]
            seen = True
        elif w in ('and', 'new', 'york'):
            continue
    return n if seen and 0 < n < 300 else None


ATT_RX = re.compile(r'attached to ([A-Za-z\- ]{3,60}?) (Infantry|Cavalry|Artillery)[^;]*?((?:[A-Z][a-z]+\.? \d{1,2}, ?\d{4}))?', re.I)


def attached_unit(body, known_ids):
    m = ATT_RX.search(body)
    if not m:
        return '', []
    n = ordinal_words_to_num(m.group(1))
    if not n:
        return '', []
    kind = m.group(2).lower()
    uid = 'U-%dNY' % n if kind == 'infantry' else ('U-%dNY-CAV' % n if kind == 'cavalry' else '')
    if not uid:
        return '', ['attached-to-artillery-not-resolved']
    return uid, ([] if uid in known_ids else ['attached-unit-not-in-OOB'])



ORD_ONES = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth', 'Nineteenth']
CARD_TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
ORD_TENS = ['', '', 'Twentieth', 'Thirtieth', 'Fortieth', 'Fiftieth', 'Sixtieth', 'Seventieth', 'Eightieth', 'Ninetieth']


def ordinal_words(n):
    if n < 20:
        return ORD_ONES[n]
    if n < 100:
        return ORD_TENS[n // 10] if n % 10 == 0 else CARD_TENS[n // 10] + '-' + ORD_ONES[n % 10]
    if n % 100 == 0:
        return 'One Hundredth'
    return 'One Hundred and ' + ordinal_words(n - 100)


def self_names_for(uid):
    m = re.match(r'(?:U|EXTRA)-(\d+)NY(?:-XII)?$', uid)
    if m:
        return [ordinal_words(int(m.group(1))) + ' Infantry']
    m = re.match(r'U-(\d+)NY-CAV', uid)
    if m:
        return [ordinal_words(int(m.group(1))) + ' Cavalry']
    m = re.match(r'U-ART-(\d+)(?:NY|NYIND)$', uid)
    if m:
        w = ordinal_words(int(m.group(1)))
        return [w + ' Battery', w + ' Independent Battery']
    return []


def build_unit(u, pdf_path, source_id, known_cache):
    d = pymupdf.open(pdf_path)
    pages = [d[i].get_text() for i in range(d.page_count)]
    txt = pdf_text_to_register_text(pages)
    ents = split_stream(txt)
    return d.page_count, ents


def rows_for(u, ents, source_id, known):
    reg = regiment_name(u)
    set_self_names(self_names_for(u['unit_id']))
    rows = []
    floors = []
    parsed = []
    for e in ents:
        if e['xref']:
            parsed.append((e, None))
            continue
        p = parse_body(e['body'])
        parsed.append((e, p))
        if p['mustered'] and p['rank_in'] and not p['transfer_in']:
            floors.append(p['mustered'])
    floors.sort()
    floor = floors[max(0, int(len(floors) * 0.01))] - datetime.timedelta(days=45) if floors else None
    seq = collections.Counter()
    for e, p in parsed:
        nm, nflags = name_fix(e['surname'], e['given'], known)
        if p is None:
            rows.append(dict(unit_id=u['unit_id'], regiment=reg, company='', section='xref', name_as_printed='%s, %s' % (e['surname'], e['given']), name_clean=nm, age='', rank_as_printed='', enlisted_or_mustered='',
                             residence_as_printed='', remarks_as_printed=e['raw'][:200], presence_label='Duplicate-Xref', presence_basis='cross-reference line of the Register (see %s); not a separate man' % e['xref'], basis_code='XREF',
                             roll_status='xref', dup_group='', source_id=source_id, source_page_pdf=e['page'], parse_flags='|'.join(nflags), cross_source=''))
            continue
        # impossible dates before the regiment existed are treated as unreadable (OCR 4->1)
        if floor:
            for key in ('transfer_in',):
                if p[key] and p[key] < floor:
                    p[key] = None
                    p['bad_enter'] = True
        label, rs, code, basis, flags = classify(p)
        flags = list(flags) + nflags
        if surname_suspect(e['surname']):
            flags.append('name-suspect')
        if p['bad_enter']:
            flags.append('entry-date-unreadable')
        if re.search(r'also borne as', e['body']):
            flags.append('has-alias')
        comp = p['company'] or ''
        if u.get('arm') == 'artillery' and u.get('regiment_level'):
            comp = p.get('battery_at_gb') or comp
            if p.get('battery_ambiguous'):
                flags.append('battery-assignment-ambiguous')
        rank = p['rank_in'] or ''
        sect = 'FS' if (not comp and FS_RANKS.search(rank)) or FS_RANKS.search(rank) and not comp else ('company' if comp else 'unassigned')
        if comp.lower() == 'unassigned':
            sect = 'unassigned'
            comp = ''
        if not comp and p['prior']:
            mc = re.search(r'transferred to Co\.?\s*([A-Z0-9])\b', e['body'])
            comp = mc.group(1) if mc else ''
        ent = p['transfer_in'] or p['mustered'] or p['enlisted']
        seq[(e['surname'], e['given'])] += 1
        att, aflags = attached_unit(e['body'], KNOWN_UNIT_IDS)
        flags = flags + aflags
        rows.append(dict(unit_id=u['unit_id'], regiment=reg, company=comp, attached_to_unit_id=att, section=sect, name_as_printed='%s, %s' % (e['surname'], e['given']), name_clean=nm, age=p['age'] or '',
                         rank_as_printed=rank, enlisted_or_mustered=ent.isoformat() if ent else '', residence_as_printed=residence(e['body']),
                         remarks_as_printed=e['body'], presence_label=label, presence_basis=basis, basis_code=code, roll_status=rs, dup_group='',
                         source_id=source_id, source_page_pdf=e['page'], parse_flags='|'.join(flags), cross_source=''))
    # duplicate groups: same printed name more than once (distinct men are possible; not merged)
    keys = collections.Counter((r['name_as_printed']) for r in rows if r['section'] != 'xref')
    gi = 0
    gmap = {}
    for r in rows:
        k = r['name_as_printed']
        if r['section'] != 'xref' and keys[k] > 1:
            if k not in gmap:
                gi += 1
                gmap[k] = 'n%d' % gi
            r['dup_group'] = gmap[k]
    return rows


import ny_roh
ROH_UNMATCHED = []
ROH_BY_UNIT = {}
for _o in ny_roh.load_roh()[0]:
    for _u in _o['unit_ids']:
        ROH_BY_UNIT.setdefault(_u, []).append(_o)
KNOWN_UNIT_IDS = set()
READABLE = re.compile(r"^[A-Z][A-Za-z'\-]{2,}, [A-Z][A-Za-z\.' ]{1,25}$")


def apply_roh(uid, u, rows, roh_by_unit, unresolved):
    """merge the Roll of Honor of 'New York at Gettysburg' (killed or mortally wounded) into the unit's Register rows"""
    ents = roh_by_unit.get(uid, [])
    if uid == 'U-ART-L1NY':
        ents = roh_by_unit.get('U-ART-L1NY', [])
    st = collections.Counter()
    st['roh_lines'] = len(ents)
    res = ny_roh.match_unit(rows, ents)
    st['roh_name_lines'] = len(res)
    for e, r, score, how in res:
        cs = 'NYG1900-ROH leaf %d (%s): "%s"' % (e['leaf'], e['heading'], e['ocr_text'][:80])
        if how == 'match':
            st['matched'] += 1
            r['cross_source'] = (r['cross_source'] + ' || ' if r['cross_source'] else '') + cs
            if r['presence_label'] == 'Present-Documented':
                st['confirmed_existing_PD'] += 1
            elif r['presence_label'] == 'Absent-Documented':
                st['conflict_register_absent'] += 1
                r['parse_flags'] = (r['parse_flags'] + '|' if r['parse_flags'] else '') + 'contested'
                r['presence_label'] = 'Unknown'
                r['roll_status'] = 'contested'
                r['presence_basis'] = 'CONFLICT: Roll of Honor names him killed or mortally wounded at Gettysburg; Register says: ' + r['presence_basis']
                r['basis_code'] = 'CONFLICT'
            else:
                st['upgraded_to_PD'] += 1
                r['presence_label'] = 'Present-Documented'
                r['roll_status'] = 'named-present'
                r['basis_code'] = 'ROH-LIST'
                r['presence_basis'] = 'Named on the 1900 Roll of Honor (killed or mortally wounded at Gettysburg) as read: "%s"' % e['ocr_text'][:80]
        elif how == 'unmatched' and READABLE.match(e['name_ocr']) and e['minconf'] >= 40 and e['rank_ocr']:
            st['added_roh_only'] += 1
            sn, gv = ny_roh.split_name(e['name_ocr'])
            rows.append(dict(unit_id=uid, regiment=regiment_name(u), company=e['co_ocr'], section='roll-of-honor-only', name_as_printed=e['name_ocr'], name_clean=tidy_name(sn, gv), age='', rank_as_printed=e['rank_ocr'],
                             enlisted_or_mustered='', residence_as_printed='', remarks_as_printed='', presence_label='Present-Documented', presence_basis='Named on the 1900 Roll of Honor (killed or mortally wounded at Gettysburg) as read: "%s"; no matching Register entry found' % e['ocr_text'][:80],
                             basis_code='ROH-LIST', roll_status='named-present', dup_group='', source_id='NYG1900-ROH', source_page_pdf='', parse_flags='roh-only|name-ocr-read-not-verified', cross_source=cs))
        else:
            st['unresolved_' + how] += 1
            unresolved.append(dict(unit_ids='|'.join(e['unit_ids']), heading=e['heading'], leaf_index=e['leaf'], column=e['side'], ocr_text_as_read=e['ocr_text'], rank_ocr=e['rank_ocr'], company_ocr=e['co_ocr'], min_word_confidence=e['minconf'], reason=how))
    return dict(st)


def write_csv(path, rows):
    with open(path, 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=COLS, extrasaction='ignore')
        w.writeheader()
        w.writerows(rows)


BATT_MAP = {'C': 'U-ART-C1NY', 'D': 'U-ART-D1NY', 'G': 'U-ART-G1NY', 'L': 'U-ART-L1NY', 'M': 'U-ART-M1NY', 'B': 'EXTRA-B1NY', 'I': 'EXTRA-I1NY', 'K': 'EXTRA-K1NY'}


def main():
    um = load_map()
    units = dict(um['units'])
    KNOWN_UNIT_IDS.update(units.keys())
    for k, v in um.get('extra_units', {}).items():
        units[k] = v
    units['U-1NYLA-REG'] = dict(designation='1st New York Light Artillery', arm='artillery', roster_from=None, regiment_level=True)
    for k, v in units.items():
        v['unit_id'] = k
    acq = json.load(open(os.path.join(DATA, 'acquired.json'), encoding='utf-8'))
    pdfs = {}
    for f in acq['files']:
        if f.get('label', '').startswith('Unit Roster'):
            for uid in f.get('unit_ids', []):
                pdfs[uid] = (os.path.join(CACHE, f['file']), f)
    only = set(sys.argv[1:])
    stats = {}
    todo = [(uid, u) for uid, u in units.items() if u.get('roster_from') is None and not u.get('oob_defect') and uid in pdfs and not u.get('battery') and (not only or uid in only)]
    cache = {}
    for uid, u in todo:  # pass 1: split
        path, f = pdfs[uid]
        n, ents = build_unit(u, path, None, None)
        cache[uid] = (n, ents)
        print('split', uid, n, 'pages', len(ents), 'entries', flush=True)
    known = known_given_names([e for _, e in cache.values()])
    for uid, u in todo:  # pass 2: label
        path, f = pdfs[uid]
        n, ents = cache[uid]
        source_id = 'NY-AGR-' + os.path.basename(path)
        rows = rows_for(u, ents, source_id, known)
        parts = [(uid, u, rows)]
        if u.get('regiment_level'):
            parts = []
            by = collections.defaultdict(list)
            for r in rows:
                by[r['company'] if r['section'] != 'xref' else ''].append(r)
            for letter, uid2 in BATT_MAP.items():
                u2 = units.get(uid2) or {}
                u2 = dict(u2)
                u2['unit_id'] = uid2
                u2['designation'] = u2.get('designation') or ('Battery %s, 1st New York Light Artillery' % letter)
                sub = [dict(r, unit_id=uid2, regiment=regiment_name(u2)) for r in by.get(letter, [])]
                parts.append((uid2, u2, sub))
            rest = [r for k, v in by.items() if k not in BATT_MAP for r in v]
            write_csv(os.path.join(OUT, 'U-1NYLA-REG_other-batteries-and-unassigned.csv'), rest)
            stats['U-1NYLA-REG'] = dict(rows=len(rows), pdf_pages=n, rows_in_gettysburg_batteries=sum(len(p[2]) for p in parts), rows_other_batteries_or_unassigned=len(rest), source_file=os.path.basename(path), sha256=f['sha256'],
                                        note='regiment-level Register of the 1st NY Light Artillery split by battery at 3 July 1863; batteries not at Gettysburg per OR 27/1 are in the other-batteries file')
        for uid3, u3, rows3 in parts:
            roh_stat = apply_roh(uid3, u3, rows3, ROH_BY_UNIT, ROH_UNMATCHED)
            if uid3 in ('U-76NY', 'U-77NY', 'U-78NY', 'U-80NY'):
                import ny_xocr
                roh_stat['second_ocr'] = ny_xocr.compare(rows3, ny_xocr.readings(uid3))
            slug = re.sub(r'[^a-z0-9]+', '-', regiment_name(u3).lower()).strip('-')
            write_csv(os.path.join(OUT, '%s_%s.csv' % (uid3, slug)), rows3)
            c = collections.Counter(r['presence_label'] for r in rows3)
            rs = collections.Counter(r['roll_status'] for r in rows3)
            stats[uid3] = dict(rows=len(rows3), pdf_pages=n, labels=dict(c), roll_status=dict(rs), source_file=os.path.basename(path), sha256=f['sha256'], roh=roh_stat, register_entries=len(ents), register_image_only=(len(ents) == 0))
            print('built', uid3, len(rows3), dict(c), roh_stat, flush=True)
    if ROH_UNMATCHED:
        with open(os.path.join(DATA, 'roh_unresolved.csv'), 'w', encoding='utf-8', newline='') as fh:
            w = csv.DictWriter(fh, fieldnames=['unit_ids', 'heading', 'leaf_index', 'column', 'ocr_text_as_read', 'rank_ocr', 'company_ocr', 'min_word_confidence', 'reason'])
            w.writeheader()
            w.writerows(ROH_UNMATCHED)
    sp = os.path.join(DATA, 'build_stats.json')
    old = json.load(open(sp, encoding='utf-8')) if os.path.exists(sp) and only else {}
    old.update(stats)
    json.dump(old, open(sp, 'w', encoding='utf-8'), indent=1)


if __name__ == '__main__':
    main()
