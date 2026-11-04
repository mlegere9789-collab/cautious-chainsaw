"""AUDIT 2026-10-30 post-pass for the Polley (Texas Brigade) CSVs. Run after polley_parse.py; idempotent.

1. rank: Polley prints ranks inside the name cell ('Moore, D. D., Capt.', '2d Lieut., Tom M. Owens'); the parser left rank = Private for 130 such rows.
   The rank is now read from the name cell (name_as_printed is not changed).
2. labels withheld: a Present-/Absent-Documented label is withheld (Unknown, unreadable-or-ambiguous, flag label-withheld-attribution) when the label
   cannot be tied to one man: (a) the name cell is unreadable (fewer than 3 letters, or two or more '^' marks), (b) the name cell holds two or more
   'Surname, Initials' names, or (c) a bare-name segment sits between the man and the remark ('Benton, B. F., Capt.; Finley, Wm.; killed at Gaines Mill'),
   in which case the remark is Finley's. The original basis stays in presence_basis.
"""
import sys, re, csv, os, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rlib import *

RANKTOK = re.compile(r"\b((?:\d+(?:st|d|nd|rd|th)|first|second|third|fourth|fifth|color|orderly|ordnance)\s+)?"
                     r"(Sergt|Serg|Sgt|Corporal|Corp|Lieutenant|Lieut|Capt|Captain|Colonel|Col|Major|Maj|Surgeon|Surg|Assist(?:ant)?\.?\s+Surg\w*|Adjt|Adjutant|Chaplain|Musician|Bugler|Ensign)\b\.?", re.I)
NAMEONLY = re.compile(r"^\s*(?:[A-Z][A-Za-z'\.\-]*\s*,?\s*){1,5}\.?\s*$")
EVENT = re.compile(r"\b(killed|wounded|died|captured|disabled|discharged|transferred|deserted|promoted|elected|resigned|shot|missing|prisoner|surrender\w*|appointed)\b", re.I)
TWO_NAMES = re.compile(r"[A-Z][A-Za-z']{2,},\s+[A-Z][A-Za-z\.]*\s*[A-Z]?[A-Za-z\.]*.*?[A-Z][A-Za-z']{2,},\s+[A-Z]")


def fix(path):
    with open(path, encoding='utf-8', newline='') as f:
        rows = list(csv.DictReader(f))
    n_rank = n_wh = 0
    for r in rows:
        nm = r['name_as_printed']
        segs0 = r['source_entry'].split(';')
        if re.fullmatch(r"\s*(?:\d+(?:st|d|nd|rd|th)|first|second|third|fourth|fifth)?\s*(?:Lieut|Sergt|Serg|Corp|Capt)\.?\s*", nm, re.I) and len(segs0) > 2 \
                and NAMEONLY.match(segs0[1]) and (EVENT.search(segs0[2]) or has_gb(segs0[2])):
            # name cell holds only the rank ('3d Lieut.'); the man's name is the next segment ('Chas. A. Graham')
            r['rank'] = nm.strip(' .')
            r['name_as_printed'] = segs0[1].strip(' .')
            nm = r['name_as_printed']
            r['parse_flags'] = ';'.join(sorted(set(filter(None, r['parse_flags'].split(';') + ['name-from-next-segment']))))
        if r['rank'] in ('Private', 'Privates') and 'Appomattox' not in r['section']:
            head = nm
            toks = [m.group(0).strip(' .,') for m in RANKTOK.finditer(head)]
            if toks:
                r['rank'] = ', '.join(toks)
                r['parse_flags'] = ';'.join(sorted(set(filter(None, r['parse_flags'].split(';') + ['rank-from-name-cell']))))
                n_rank += 1
        if r['presence_label'] in ('Present-Documented', 'Absent-Documented'):
            letters = len(re.sub(r'[^A-Za-z]', '', nm))
            segs = r['source_entry'].split(';')
            if 'name-from-next-segment' in r['parse_flags']:
                segs = [segs[0]] + segs[2:]
            why = None
            if letters < 3 or nm.count('^') >= 2 or re.search(r'\^[a-z]|[a-z]\^', nm):
                why = 'name cell unreadable'
            elif len(TWO_NAMES.findall(RANKTOK.sub('', nm))) and len(nm) > 20 and not re.search(r'Lieut|Capt|Sergt|Corp', nm):
                why = 'two names in the name cell'
            else:
                ev_i = next((i for i, sg in enumerate(segs) if EVENT.search(sg) or has_gb(sg)), None)
                if ev_i is not None:
                    for sg in segs[1:ev_i]:
                        if NAMEONLY.match(sg) and not EVENT.search(sg):
                            why = 'a bare name stands between the man and the remark'
                            break
                    if not why and ev_i == 0 and len(segs) > 1:
                        pass
            if why:
                r['presence_basis'] = 'LABEL-WITHHELD (audit: %s): was %s | %s' % (why, r['presence_label'], r['presence_basis'])[:400]
                r['presence_label'] = 'Unknown'
                r['roll_status'] = 'unreadable-or-ambiguous'
                r['parse_flags'] = ';'.join(sorted(set(filter(None, r['parse_flags'].split(';') + ['label-withheld-attribution']))))
                n_wh += 1
    with open(path, 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=COLS)
        w.writeheader()
        for r in rows:
            w.writerow({c: r.get(c, '') for c in COLS})
    return n_rank, n_wh


if __name__ == '__main__':
    csv.field_size_limit(10 ** 8)
    for p in sorted(glob.glob(DATA + r'\texas-arkansas\*.csv')):
        a, b = fix(p)
        print(os.path.basename(p), 'rank set', a, 'labels withheld', b)
        progress('audit_postfix %s: rank from name cell %d, labels withheld %d' % (os.path.basename(p), a, b))
