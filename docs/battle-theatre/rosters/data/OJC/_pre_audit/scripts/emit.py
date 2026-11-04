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


def process(rows, unit_id, regiment, out_name, source_id, extra_flags=None):
    """rows: list of dicts with keys: company, section, rank, name, age, res, enl_text, enl (date|None), enl_note, enl_ok(bool), rem, page, flags(list)"""
    out = []
    keys = collections.defaultdict(list)
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
