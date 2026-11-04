"""Company K, 14th South Carolina Volunteers (McGowan's brigade): Tompkins, Company K, Fourteenth South Carolina Volunteers (1897),
IA 06269758.3416.emory.edu (also companykfourteen00tomp). One company only (the book is a company history); rows come from the original roll plus the
killed, wounded and prisoner rolls printed in the same book. Run: python -X utf8 tompkins14sc_parse.py"""
import re, sys, collections
sys.path.insert(0, 'C:/Users/mlege/gettysburg-map/docs/battle-theatre/rosters/data/C-VASCGA/scripts')
from vscommon import *

SID = 'SC-TOMPKINS-1897-COK14-v1'
L = open(CACHE + '06269758.3416.emory.edu_djvu.txt', encoding='utf-8', errors='replace').read().splitlines()
UID, REGN = 'C-14SC', '14th South Carolina Infantry'


def norm(s):
    return re.sub(r'\s+', ' ', s).strip()


def keyof(name):
    """(surname lower, given initials, given letters) from 'Surname, Given' or 'Given Surname'."""
    n = norm(name).strip(' .,')
    if ',' in n:
        sur, giv = n.split(',', 1)
    else:
        p = n.split(' ')
        sur, giv = p[-1], ' '.join(p[:-1])
    ini = ''.join(w[0].lower() for w in re.findall(r'[A-Za-z]+', giv))
    return re.sub(r'[^a-z]', '', sur.lower()), ini, re.sub(r'[^a-z]', '', giv.lower())


# ---- original roll (the OCR text puts the private names in blocks between the officer/sergeant/corporal headings)
roll = []
sect = 'Officers'
RANKS = r'(Captain|First\s+[Ll]ieutenant|Second\s+[Ll]ieutenant|Third\s+[Ll]ieutenant|First|Second|Third|Fourth|Fifth|Sixth)'
for i in range(37, 330):
    s = norm(L[i])
    if len(s) <= 3:
        continue
    if re.match(r'^Sergeants\.?$', s):
        sect = 'Sergeants'
        continue
    if re.match(r'^Corporals\.?$', s):
        sect = 'Corporals'
        continue
    if re.match(r'^Privates\.?$', s):
        sect = 'Privates'
        continue
    m = re.match(r'^(.+?),\s+' + RANKS + r'\.?$', s)
    if m:
        roll.append(dict(name=norm(m.group(1)), section=sect, rank=m.group(2)))
        continue
    m = re.match(r"^([A-Z][a-z]+),\s+([A-Za-z][A-Za-z\.\s]{0,22}?)\.?\s*$", s)
    if m:
        roll.append(dict(name=norm(m.group(1) + ', ' + m.group(2).strip(' .')), section='Privates', rank='Private'))
        continue
    m = re.match(r"^([A-Z][a-z]+),\s+([A-Za-z\.\s]+?)\s+([A-Z][a-z]+),\s+([A-Za-z\.\s]+?)\.?$", s)
    if m:
        roll.append(dict(name=norm(m.group(1) + ', ' + m.group(2)), section='Privates', rank='Private'))
        roll.append(dict(name=norm(m.group(3) + ', ' + m.group(4)), section='Privates', rank='Private'))
        continue
    if sect == 'Privates' and (len(s.split()) > 5 or re.match(r'^[a-z]', s)):
        break

# ---- event lists
text = re.sub(r'[ \t]+', ' ', '\n'.join(L))
a = text.index('Roll of Those Killed in Battle')
b = text.index('Roll of Those Wounded in Battle')
c = text.index('Roll of Those Taken Prisoners')
d = text.index('Roll of Those Who Returned')
killed_txt, wounded_txt, pris_txt = text[a:b], text[b:c], text[c:d]

NM = r'(?:[A-Z][A-Za-z\.]*\s+){1,3}[A-Z][a-z]+'
START = re.compile(r'(?:(?:Sergeant|Sergt\.?|Corporal|Lieutenant|Lieut\.?|Capt\.?|Captain)\s+' + NM + r',|[A-Z][a-z]+,\.?\s+[A-Z][A-Za-z\.]*(?:\s[A-Z][A-Za-z\.]*)?,)')
NOTGIVEN = re.compile(r'^(Va|Pa|Md|Ga|S\. ?C|N\. ?C)\b')


def split_entries(block):
    block = '\n'.join(l for l in block.split('\n') if len(l.strip()) > 3)
    block = norm(block.replace('-\n', '').replace('\n', ' '))
    starts = []
    for m in START.finditer(block):
        if m.start() == 0 or re.search(r'[a-z\.]\s?$', block[:m.start()]):
            tail = block[m.end():m.end() + 8].strip()
            if NOTGIVEN.match(tail):
                continue
            starts.append(m.start())
    return [block[st:(starts[k + 1] if k + 1 < len(starts) else len(block))].strip() for k, st in enumerate(starts)]


def parse_events(block, kind):
    out = []
    for e in split_entries(block):
        m = re.match(r'^(Sergeant|Sergt\.?|Corporal|Lieutenant|Lieut\.?|Capt\.?|Captain)\s+(' + NM + r'),\s*(.*)$', e)
        if m:
            nm = norm(m.group(2))
            out.append(dict(kind=kind, key=keyof(nm), name=nm, text=norm(m.group(3)), rank=norm(m.group(1))))     # AUDIT: the printed rank was dropped
            continue
        mm = re.match(r'^([A-Z][a-z]+),\.?\s+((?:[A-Z][A-Za-z\.]*\s?){1,3}),\s*(.*)$', e)
        if mm and not re.match(r'^(Va|Ga|Pa|Md|Ala|S\. ?C|N\. ?C)\b', mm.group(2).strip()):
            nm = norm(mm.group(1) + ', ' + mm.group(2).strip(' ,'))
            out.append(dict(kind=kind, key=keyof(nm), name=nm, text=norm(mm.group(3)), rank=''))
    return out


ev = parse_events(killed_txt, 'killed') + parse_events(wounded_txt, 'wounded') + parse_events(pris_txt, 'prisoner')
PRE = r"(Gaines|Fra[sz]e?i?er|Frazer|Chancellorsville|Fredericksburg|Manassas|Sharpsburg|Antietam|Harper|Ox\s+Hill|round\s+Richmond|around\s+Richmond|Seven\s+Pines|Williamsburg)"


def match_roll(key):
    sur, ini, giv = key
    cand = [r for r in roll if keyof(r['name'])[0] == sur]
    exact = [r for r in cand if keyof(r['name'])[2] == giv and giv]
    if len(exact) == 1:
        return exact[0], 'exact'
    byini = [r for r in cand if keyof(r['name'])[1] == ini and ini]
    if len(byini) == 1:
        return byini[0], 'initials'
    return None, ('ambiguous(%d)' % len(byini or cand))


rows = {}
for r in roll:
    rows.setdefault(r['name'], dict(r, events=[]))
unmatched = []
for e in ev:
    r, how = match_roll(e['key'])
    if r is None:
        unmatched.append((e, how))
        continue
    rows[r['name']]['events'].append((e['kind'], e['text'], how))

out = []
for k, r in rows.items():
    ev_txt = ' | '.join('%s: %s' % (kd, tx) for kd, tx, hw in r['events'])
    label, basis, bc, rs = 'Unknown', 'on the original roll of Company K, 14th SC (printed 1897); no status for 30 June 1863 and no Gettysburg entry', 'ONROLL-NO-STATUS', 'on-roll-undetermined'
    flags = list(name_flags(r['name']))
    g = [(kd, tx) for kd, tx, hw in r['events'] if re.search(r'Gettysburg', tx, re.I)]
    pre_sep = [(kd, tx) for kd, tx, hw in r['events'] if kd == 'killed' and re.search(PRE, tx)]
    if g and not pre_sep:
        kd, tx = g[0]
        label, bc, rs = 'Present-Documented', 'CAS-REMARK', 'named-present'
        basis = '%s list, Company K 14th SC (1897): "%s"' % (kd, tx[:120])
    elif g and pre_sep:
        label, bc, rs, basis = 'Unknown', 'CONFLICT', 'unreadable-or-ambiguous', 'killed list gives both Gettysburg and an earlier battle'
        flags.append('contested')
    elif pre_sep:
        label, bc, rs = 'Absent-Documented', 'SEP-BEFORE', 'off-roll-before-battle'
        basis = 'killed list, Company K 14th SC (1897): "%s" (battle dated before 1 July 1863)' % pre_sep[0][1][:120]
    elif any(kd == 'killed' for kd, tx, hw in r['events']):
        label, bc, rs = 'Unknown', 'OCR-DATE-LOST', 'unreadable-or-ambiguous'
        basis = 'listed among the dead but the place or date is not before, and not at, Gettysburg: ' + '; '.join(tx for kd, tx, hw in r['events'] if kd == 'killed')[:120]
    if any(hw != 'exact' for kd, tx, hw in r['events']):
        flags.append('event-matched-by-initials')
    out.append(dict(regiment=REGN, unit_id=UID, company='K', section=r['section'], name_as_printed=r['name'], rank_as_printed=r['rank'],
                    enlist_or_commission_date='', residence_or_county='Edgefield District (per the book)', remarks_as_printed=ev_txt,
                    presence_label=label, presence_basis=basis, basis_code=bc, dup_group='', source_id=SID, source_locator='pamphlet rolls',
                    parse_flags=';'.join(sorted(set(flags))), roll_status=rs))
# event-list names that match no roll name stay as their own rows (the lists print men the roll spells differently or omits)
for e, how in unmatched:
    gb = re.search(r'Gettysburg', e['text'], re.I)
    label, bc, rs = ('Present-Documented', 'CAS-REMARK', 'named-present') if gb else ('Unknown', 'OCR-DATE-LOST', 'unreadable-or-ambiguous')
    out.append(dict(regiment=REGN, unit_id=UID, company='K', section='event list (not matched to the original roll)', name_as_printed=e['name'], rank_as_printed=e.get('rank', ''),
                    enlist_or_commission_date='', residence_or_county='', remarks_as_printed='%s: %s' % (e['kind'], e['text']), presence_label=label,
                    presence_basis=('%s list: "%s"' % (e['kind'], e['text'][:120])) if gb else 'named in the %s list; not matched to a roll name (%s); place or date does not decide' % (e['kind'], how),
                    basis_code=bc, dup_group='', source_id=SID, source_locator='pamphlet rolls', parse_flags='unmatched-to-roll:' + how, roll_status=rs))

write_csv(OUT + 'csv/C-14SC.csv', out)
print(len(roll), 'roll names;', len(ev), 'events;', len(unmatched), 'unmatched;', len(out), 'rows', dict(collections.Counter(r['presence_label'] for r in out)))
for e, how in unmatched[:14]:
    print('  UNMATCHED', e['kind'], e['name'], '|', e['text'][:60], how)
