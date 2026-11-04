"""Maryland: Goldsborough, The Maryland Line in the Confederate Army (1869; IA marylandlineinco00gold = 1900 reprint) rosters.
Rosters are name lists for the whole service (no per-man remarks). Presence for Gettysburg comes only from the narrative (officers named in the
Culp's Hill account) and is entered as OFFICER-HISTORY with the quoted passage located by line number."""
import sys, re
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\docs\battle-theatre\rosters\data\C-ALMSTX\scripts')
from rlib import *

SRC = CACHE + r'\norm\marylandlineinco00gold_djvu.txt'
LINES = open(SRC, encoding='utf-8', errors='replace').read().split('\n')
RANK = r"(Lieutenant[- ]Colonel|Colonel|Major|Captain|First Lieutenant|Second Lieutenant|Third Lieutenant|Lieutenant|First Sergeant|Orderly Sergeant|Sergeant[- ]Major|Sergeant|Corporal|Musician|Bugler|Surgeon|Assistant Surgeon|Adjutant|Chaplain|Quartermaster|Commissary|Drum Major|Chief Musician)"
RE_R_AFTER = re.compile(r"^\W*(.+?),?\s+" + RANK + r"\.?\s*$", re.I)
RE_R_BEFORE = re.compile(r"^" + RANK + r"\.?,?\s+(.+?)\.?\s*$", re.I)
RE_PRIV = re.compile(r"^\W{0,2}([A-Z][A-Za-z'\-\s]{1,22}),\s*([A-Z][A-Za-z\.\s]{0,28}?)\.?\s*(?:,?\s*(?:Jr|Sr)\.?)?\s*$")

# Presence from the narrative (Goldsborough, Culp's Hill account, djvu lines 4615-4640): officers named there
NARR = {
    'james r herbert': ('Lieutenant-Colonel James R. Herbert fell wounded in three places (narrative, djvu line 4615)', 'wounded'),
    'w w goldsborough': ('author in command of the regiment after Herbert fell (djvu line 4622-4625)', 'in command'),
    'john w torsch': ('Captain Torsch sent forward to feel through the darkness (djvu line 4631-4636)', 'present'),
    'thomas r stewart': ('Captain Stewart named with Torsch and Crane commanding the three left companies (djvu line 4620-4622); identified with the roster captain of that surname by surname only', 'present'),
    'j parran crane': ('Captain Crane named with Torsch and Stewart commanding the three left companies (djvu line 4620-4622); identified with the roster captain of that surname by surname only', 'present'),
    'william h murray': ('Company A commanded by Captain William H. Murray suffered severely (djvu line 4617-4618)', 'present'),
}


def key(n):
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z ]', ' ', n.lower())).strip()


def parse(lo, hi, uid, reg, slug, slugdir, source, note, narr=False, extra_flag=''):
    wr = Writer(slug)
    comp = 'FS'; sect = 'field and staff'; in_priv = False
    letters = 'ABCDEFGHIK'; li = -1; seen_priv = False
    for ln in range(lo, hi + 1):
        raw = LINES[ln - 1].strip()
        if not raw:
            continue
        mc = re.match(r'^COMPANY\s+([A-K])\.?\s*$', raw)
        if mc:
            comp = mc.group(1); seen_priv = False; li = letters.index(comp) if comp in letters else li; sect = 'company officers'; in_priv = False; continue
        if re.match(r'^(FIELD AND STAFF|OFFICERS|ROSTER|\(?BALTIMORE|\(?CHESAPEAKE|Privates|Captains|Lieutenants|Sergeants|Corporals|Musicians)\.?\s*[\.\)]*$', raw, re.I) or re.fullmatch(r'[\d\s\.\-—_]+', raw) or len(raw) < 5:
            if raw.lower().startswith('privates'): in_priv = True; sect = 'privates'
            if raw.upper().startswith('FIELD'): comp = 'FS'
            continue
        name = rank = None
        m = RE_R_AFTER.match(raw)
        m2 = RE_R_BEFORE.match(raw)
        if m and len(m.group(1)) < 40:
            name, rank = m.group(1), m.group(2)
        elif m2 and len(m2.group(2)) < 40 and not in_priv:
            name, rank = m2.group(2), m2.group(1)
        else:
            mp = RE_PRIV.match(raw)
            if mp and len(raw) < 45:
                name, rank = '%s, %s' % (mp.group(1).strip(), mp.group(2).strip()), 'Private'
                if not in_priv: in_priv = True; sect = 'privates'
        if not name:
            continue
        if narr is not None and slug.startswith('maryland-infantry') and rank and rank.lower() == 'captain' and seen_priv:
            li += 1
            if li < len(letters): comp = letters[li]
            in_priv = False; seen_priv = False; sect = 'company officers'
        if rank == 'Private': seen_priv = True
        name = name.strip(' .*†f')
        fl = name_flags(name)
        label, basis, rs = 'Unknown', 'ONROLL-NO-STATUS: name on a service roster; the roster carries no dates or per-man status', 'on-roll-undetermined'
        k = key(name)
        if narr and k in NARR and rank != 'Private':
            label, basis, rs = 'Present-Documented', 'OFFICER-HISTORY: ' + NARR[k][0], 'named-present'
            if NARR[k][1] == 'wounded': basis = 'CAS-REMARK: ' + NARR[k][0]
        wr.add(unit_id=uid, regiment=reg, company=comp, section=sect, name_as_printed=name, rank=rank, source_entry=raw[:200],
               presence_label=label, presence_basis=basis, dup_group='', source_id=source, locator='Goldsborough roster, djvu line %d' % ln,
               parse_flags=';'.join(sorted(set(fl + ([extra_flag] if extra_flag else [])))), roll_status=rs)
    p = wr.save(slugdir)
    print(p, wr.stats())
    progress('maryland %s parsed: %d rows' % (slug, len(wr.rows)))
    return wr


if __name__ == '__main__':
    import os
    os.makedirs(DATA + r'\maryland', exist_ok=True)
    parse(6753, 7600, 'C-1MD-CSA', "Maryland Infantry (Goldsborough 'Second Maryland Infantry', the battalion at Culp's Hill)", 'maryland-infantry-second-roster-goldsborough', 'maryland', 'MD-GOLDSBOROUGH-1869',
          'identity: OOB id C-1MD-CSA named 1st Maryland Infantry (Confederate); Goldsborough calls the Gettysburg battalion the Second Maryland Infantry', narr=True, extra_flag='unit-identity-contested')
    parse(2652, 3740, 'C-1MD-CSA', "1st Maryland Infantry 1861-62 (Goldsborough 'First Maryland Infantry')", 'maryland-infantry-first-roster-1861-62-goldsborough', 'maryland', 'MD-GOLDSBOROUGH-1869',
          'the 1861-62 regiment (disbanded Aug 1862); carried because the OOB id C-1MD-CSA carries the name 1st Maryland', extra_flag='unit-identity-contested')
    parse(13341, 14500, 'C-ART-Dement', "1st Maryland Artillery (Dement's Battery)", 'maryland-artillery-first-dement', 'maryland', 'MD-GOLDSBOROUGH-1869', '')
    parse(14506, 15725, 'C-ART-Doll', "2nd Maryland Artillery (Baltimore Light; OOB label 'Doll's')", 'maryland-artillery-second-baltimore-light', 'maryland', 'MD-GOLDSBOROUGH-1869', '', extra_flag='oob-captain-name-not-found')
    parse(16613, 16884, 'C-ART-Brown-C', "4th Maryland Artillery (Chesapeake; OOB ids C-ART-Brown-C and C-ART-Brown-J)", 'maryland-artillery-fourth-chesapeake', 'maryland', 'MD-GOLDSBOROUGH-1869', '', extra_flag='oob-duplicate-entry')
