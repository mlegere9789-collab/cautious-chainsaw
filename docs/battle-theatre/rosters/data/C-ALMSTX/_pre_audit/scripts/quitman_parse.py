"""16th Mississippi Co. E (Quitman Guards): 'A Historical Sketch of the Quitman Guards' (1866): first muster roll 1861 and muster roll of present and absent 1 April 1864."""
import sys, re, os
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\docs\battle-theatre\rosters\data\C-ALMSTX\scripts')
from rlib import *
L = open(CACHE + r'\norm\historicalsketch00newo_djvu.txt', encoding='utf-8', errors='replace').read().split('\n')
RANKS = r"(Captain|1st Lieutenant|2d Lieutenant|3d Lieutenant|2nd Lieutenant|3rd Lieutenant|1st Sergeant|2d Sergeant|3d Sergeant|4th Sergeant|5th Sergeant|1st Corporal|2d Corporal|3d Corporal|4th Corporal|Ensign|Musician|Private|private|Co\. Commis'r'y|Reg't- Color Serg't|Surgeon|[Ss]ergeant|[Cc]orporal)"
wr = Writer('16th-mississippi-co-e-quitman-guards')
for lo, hi, sect, date in [(101, 240, 'first muster roll 1861 (organized 21 Apr 1861)', '1861'), (242, 335, 'first muster roll 1861, continued', '1861'), (1090, 1235, 'muster roll, present and absent, 1 April 1864', '1864-04-01')]:
    for ln in range(lo, hi):
        s = L[ln - 1].strip()
        m = re.match(r"^[\.'`]?(\d{1,3})['\.]?\s+([A-Z][^\d]{3,60})$", s)
        if not m: continue
        body = m.group(2).strip(' .')
        mr = re.search(r"[\s\.]+" + RANKS + r"$", body)
        if mr:
            rank = mr.group(1); nm = body[:mr.start()].strip(' .')
        else:
            rank = 'Private (ditto or unprinted)'; nm = re.sub(r"[\"'\u2018\u2019•*»~‘]+\s*$", '', body).strip(' .')
        if len(nm) < 4 or not re.search(r"[A-Za-z]{3}", nm): continue
        wr.add(unit_id='C-16MS', regiment='16th Mississippi Infantry', company='E', section=sect, name_as_printed=nm, rank=rank, enlist_or_commission_date=('1861-04-21' if date == '1861' else ''),
               source_entry='roll no. %s: %s' % (m.group(1), body), presence_label='Unknown', presence_basis='ONROLL-NO-STATUS: on a company roll (%s); the roll carries no battle status' % date,
               source_id='MS-QUITMAN-1866', locator='Quitman Guards sketch, djvu line %d' % ln, parse_flags=';'.join(sorted(set(name_flags(nm)))), roll_status='on-roll-undetermined')
os.makedirs(DATA + r'\mississippi', exist_ok=True)
print(wr.save('mississippi'), wr.stats())
progress('mississippi 16th MS Co. E (Quitman Guards 1866) parsed: %d rows' % len(wr.rows))
