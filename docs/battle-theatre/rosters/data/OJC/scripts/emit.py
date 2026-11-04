import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import csv, re, json, datetime, collections
from ojc_common import *
import lab

COLS = ['unit_id', 'regiment', 'company', 'section', 'rank_as_printed', 'name_as_printed', 'name_clean', 'age', 'residence',
        'enlist_or_rank_date', 'remarks_as_printed', 'presence_label', 'presence_basis', 'basis_code', 'dup_group', 'source_id',
        'source_page_idx_ia', 'parse_flags', 'roll_status']

OFFICER_RANK = re.compile(r"^(Colonel|Lieut|Major|Adjutant|Adj|Qr|Quarter|Q\.?\s*M|Surgeon|Asst|Assistant|Chaplain|Captain|Capt|1st\s*Lieut|2d\s*Lieut|3d\s*Lieut|1st\s+Asst|2d\s+Asst|Lt|Commissary)", re.I)


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def name_flags(name):
    f = []
    n = name or ''
    if re.search(r"[0-9\|\[\]\{\}\\<>_=~^*@#$%&+]", n) and not re.match(r"^\*", n):
        f.append('name-garbled')
    if re.search(r"[A-Za-z]{1}[^A-Za-z .,'\-’()‘\"]", n):
        f.append('ocr-noise-in-name')
    toks = re.findall(r"[A-Za-z']+", n)
    if len(toks) < 2:
        f.append('name-incomplete')
    return sorted(set(f))


def clean_name(n):
    n = re.sub(r"\s+", ' ', n or '').strip()
    n = re.split(r"\.{2,}|[\.\-_=~]{3,}|\s\.\s", n)[0]
    n = re.sub(r"[\.\-_=~\|,;:'•·\s]+$", '', n)
    n = n.strip(' ,;:.')
    n = re.sub(r"^[\*•·]+\s*", '', n)
    return n


def norm_key(n):
    return re.sub(r'[^a-z]', '', (n or '').lower())


EVENTW = re.compile(r"^(?:killed|k.lled|wounded|wouuded|captured|missing|discharged|mustered|transferred|died|deserted|resigned|dismissed|appointed|promoted|substitute|drafted|recruit|detached|reduced|absent|prisoner|dropped|taken|sent|accidentally|drowned|supposed|re-?enlisted|wounds?)", re.I)
PERW = re.compile(r"^(?:yrs?|vrs?|mos?|days?|years?|months?|yr|3|1|9|100)$", re.I)


def leaked_remark(date_txt, per_txt):
    """AUDIT: on some pages the remark column starts left of the measured boundary and its first word ('Killed', 'Wounded', 'Discharged') lands in the
    date or period cell; return that leaked text (printed words, in order) so the label rules see the whole remark."""
    out = ''
    dt = (date_txt or '').split()
    k = next((i for i, w in enumerate(dt) if EVENTW.match(re.sub(r"[^A-Za-z\-]", '', w))), None)
    if k is not None:
        out = ' '.join(dt[k:]) + ' ' + (per_txt or '')
        out = re.sub(r"\s+", ' ', out).strip()
        return out
    pt = (per_txt or '').split()
    k = next((i for i, w in enumerate(pt) if EVENTW.match(re.sub(r"[^A-Za-z\-]", '', w))), None)
    if k is not None:
        return ' '.join(pt[k:])
    return ''


FURNITURE = re.compile(r"""^\W*(?:mustered|mustering|names?\b|nam[«e]|naiue|x\.imes|name\*|\W*name\W*$|officers?\b|recruits\W*$|volunteers?\W*$|cavalry\W*$|infantry\W*$|ohio volunteer|
 this\s+(?:battery|regiment|band|rand)|t[a-z]{1,2}s\s+regiment|t[a-z]{2,3}\s+regiment|\W*\d+\w*\s+regiment|\w{0,3}\s*regiment\W*$|ath\s+regiment|\w+th\s+regiment|fifth regiment|sixth regiment|and staff|nnd\.staff|original company|new company|a new company|
 battalion|veterans|\(except veterans\)|bers\s*\(except|retained in service|into service from|were mustered|the battery|battery (?:bore|continued)|which this battery|active service|term of service|of service the original|it was mustered|serve three years|
 ans and recruits|accounted|I\W*\.?\s*S\.\s*A\.|u\.\s*s\.\s*a\.\s*mustered|non-commissioned officers|other mustering|john service|T\. Note|joseph t\. note)""", re.I | re.X)
REMOVED = []


def is_furniture(r):
    n = clean_name(r.get('name', ''))
    if re.search(r"Appointm|Date of (?:Muster|Appoint)", r.get('enl_text', ''), re.I) and not (r.get('rem') or '').strip():
        return True   # a sub-table column heading ('Date of Appointment') caught as a row
    et = r.get('enl_text', '') or ''
    if re.match(r"^\W*OFFIC\w*\s*\|?\s*A\w*D\W*$", et.strip()):
        return True   # NJ running title 'OFFICERS AND MEN OF NEW JERSEY' split over the columns
    L = lambda x: re.sub(r'[^A-Za-z]', '', x or '')
    if len(L(n)) <= 3 and len(L(r.get('rank', ''))) <= 3 and not re.search(r'[A-Za-z]{5,}', r.get('rem', '') or '') and             not re.search(r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d", et) and             not re.search(r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d", r.get('rem', '') or ''):
        return True   # a text fragment (stray numerals and punctuation) with no name, rank, month or word: not a man
    if not n or ',' in n:
        return False
    if n.lower() in ('john service',):
        return False
    return bool(FURNITURE.search(n))


def merge_parts(rem):
    """AUDIT: split a remark at a sentence boundary that opens with a terminal-event verb; two or more such events = the remarks of more than one man
    joined by the line grouping (Ohio and New Jersey print one sentence per man, events inside one man's entry are joined by semicolons)."""
    t = re.sub(r'\s+', ' ', rem or '')
    parts = re.split(r"(?<=[a-z0-9\)\]])\.\s+(?=(?:Killed|Died|Deserted|Discharged|Mustered|Missing|Captured|Resigned|Dismissed|Drowned|Wounded|Transferred)\b)", t)
    term = 0
    for p in parts:
        if re.match(r"^(?:Recruit|Substitute|Drafted|Re-?enlisted)?\W*(?:Killed|Died|Deserted|Discharged|Mustered|Missing|Captured|Resigned|Dismissed|Drowned)\b", p.strip(), re.I) or re.search(r"\b(?:Killed|Died|Deserted|Discharged|Mustered out)\b", p, re.I):
            term += 1
    return parts if (len(parts) >= 2 and term >= 2) else None


def merge_suspect(rem):
    return merge_parts(rem) is not None


def process(rows, unit_id, regiment, out_name, source_id, extra_flags=None):
    """rows: list of dicts with keys: company, section, rank, name, age, res, enl_text, enl (date|None), enl_note, enl_ok(bool), rem, page, flags(list)"""
    out = []
    keys = collections.defaultdict(list)
    kept = []
    removed = []
    for r in rows:
        (removed if is_furniture(r) else kept).append(r)
    rows = kept
    os.makedirs(os.path.join(DATA, '_audit_removed'), exist_ok=True)
    with open(os.path.join(DATA, '_audit_removed', out_name + '.csv'), 'w', newline='', encoding='utf-8') as fh:
        w = csv.writer(fh); w.writerow(['unit_id', 'company', 'section', 'rank', 'name', 'enlist_or_rank_date', 'remarks', 'page', 'reason'])
        for r in removed:
            w.writerow([unit_id, r.get('company', ''), r.get('section', ''), r.get('rank', ''), r.get('name', ''), r.get('enl_text', ''), r.get('rem', ''), r.get('page', ''), 'page furniture, narrative text or a text fragment, not a roster row (header, running title, regimental narrative, stray numerals)'])
    for i, r in enumerate(rows):
        c = lab.classify((r['rem'] + ' ' + r.get('label_extra', '')).strip(), enl=r.get('enl'), enl_note=r.get('enl_note', ''), section=r.get('section', ''), ctx=r)
        if not r.get('enl_ok', True):
            # officer table: rank-from / appointment date is never used as an enlistment date
            if c['code'] == 'ENL-AFTER':
                c = dict(label='Unknown', roll_status='on-roll-undetermined', code='ONROLL-NO-STATUS',
                         basis='officer or staff entry: the printed date is a commission/appointment date and is not used as an enlistment date; no separation before the battle, no source placing him at Gettysburg',
                         flags=c['flags'] + ['officer-date-not-used'], events=[])
            elif c['code'] == 'OCR-DATE-LOST' and 'no-enlist-date' in c['flags'] and not c['basis'].startswith('separation'):
                c = dict(label='Unknown', roll_status='on-roll-undetermined', code='ONROLL-NO-STATUS',
                         basis='officer or staff entry: no separation before the battle in the remark, no source placing him at Gettysburg',
                         flags=[x for x in c['flags'] if x != 'no-enlist-date'] + ['officer-date-not-used'], events=[])
            elif c['code'] == 'ONROLL-NO-STATUS':
                c['flags'] = c['flags'] + ['officer-date-not-used']
        mp = merge_parts(r['rem'])
        if mp:
            c = dict(c)
            c['flags'] = list(c['flags']) + ['remark-merge-suspected']
            if c['code'] in ('CAS-REMARK', 'SEP-BEFORE', 'POW-BURIAL'):
                # the label came from the remark: keep it only if every joined entry would give the same label (then it holds whichever man's entry is his)
                same = all(lab.classify(p, enl=r.get('enl'), section=r.get('section', ''))['label'] == c['label'] for p in mp)
                if not same:
                    c = dict(label='Unknown', roll_status='unreadable-or-ambiguous', code='MERGED-REMARK',
                             basis='remark holds the entries of more than one man (joined by the line grouping) and they would not give one label; the label it would give (%s, %s) is withheld' % (c['label'], c['code']),
                             flags=c['flags'], events=[])
        name = r['name']
        nf = name_flags(clean_name(name))
        flags = sorted(set(r.get('flags', []) + c['flags'] + nf + (extra_flags or [])))
        row = dict(unit_id=unit_id, regiment=regiment, company=r['company'], section=r.get('section', ''), rank_as_printed=r.get('rank', ''),
                   name_as_printed=name, name_clean=clean_name(name), age=r.get('age', ''), residence=r.get('res', ''),
                   enlist_or_rank_date=r.get('enl_text', ''), remarks_as_printed=r['rem'], presence_label=c['label'], presence_basis=c['basis'],
                   basis_code=c['code'], dup_group='', source_id=source_id, source_page_idx_ia=r['page'], parse_flags=';'.join(flags),
                   roll_status=c['roll_status'])
        out.append(row)
        # key for duplicates: normalised name with initials stripped to the surname + first given token
        k = norm_key(clean_name(name))
        if k:
            keys[k].append(i)
    n = 0
    for k, idx in keys.items():
        if len(idx) > 1:
            n += 1
            for i in idx:
                out[i]['dup_group'] = 'd%d' % n
                out[i]['parse_flags'] = ';'.join(sorted(set(x for x in out[i]['parse_flags'].split(';') if x) | {'duplicate-group'}))
    path = os.path.join(DATA, out_name + '.csv')
    with open(path, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=COLS)
        w.writeheader()
        w.writerows(out)
    st = stats_of(out)
    return out, st


def stats_of(out):
    lab_c = collections.Counter(r['presence_label'] for r in out)
    rs = collections.Counter(r['roll_status'] for r in out)
    code = collections.Counter(r['basis_code'] for r in out)
    nflag = sum(1 for r in out if 'name-garbled' in r['parse_flags'] or 'ocr-noise-in-name' in r['parse_flags'] or 'name-incomplete' in r['parse_flags'])
    unreadable = sum(1 for r in out if r['roll_status'] == 'unreadable-or-ambiguous')
    groups = collections.Counter(r['dup_group'] for r in out if r['dup_group'])
    uniq = len(out) - sum(n - 1 for n in groups.values())
    return dict(rows=len(out), unique_names_if_all_same_name_merged=uniq, dup_groups=len(groups), labels=dict(lab_c), roll_status=dict(rs),
                basis_codes=dict(code), name_flagged_rows=nflag, unreadable_or_ambiguous_rows=unreadable,
                unreadable_share=round(unreadable / len(out), 4) if out else None)
