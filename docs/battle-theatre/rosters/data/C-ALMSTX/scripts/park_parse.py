"""12th Alabama Infantry: Park, Sketch of the Twelfth Alabama Infantry (1906; Southern Historical Society Papers 1906): per-company casualty lists, officer lists,
and the Appomattox parole list. Partial roster: only men the sketch names."""
import sys, re, json, os
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\docs\battle-theatre\rosters\data\C-ALMSTX\scripts')
from rlib import *
SRC = CACHE + r'\norm\04680903_3233_djvu.txt'
L = open(SRC, encoding='utf-8', errors='replace').read().split('\n')
RANKS = r"(Captain|First Lieutenant|Second Lieutenant|Lieutenant|Sergeant|Corporal|Ensign|Private|Surgeon|Major|Colonel|Adjutant)"
ENTRY = re.compile(r"^(?:" + RANKS + r"\s+)?([A-Z][A-Za-z\.\s']{2,34}?),\s+((?:killed|mortally|wounded|died|captured|at|near|in|shot|lost|discharged|transferred|deserted|detailed)\b.*)$")
wr = Writer('12th-alabama-park-lists')
comp = None
start = {'A': 284, 'B': 388, 'C': 412, 'D': 485, 'E': 499, 'F': 633, 'G': 748, 'H': 874, 'I': 954, 'K': 1002}
bounds = sorted(start.items(), key=lambda kv: kv[1]) + [(None, 1041)]
for (c, lo), (_, hi) in zip(bounds[:-1], bounds[1:]):
    buf = ''
    entries = []
    for ln in range(lo, hi):
        s = L[ln - 1].strip()
        if not s or re.match(r'^(The Twelfth Alabama Infantry|\d+ ?[;:]? ?The Twelfth)', s): 
            if buf: entries.append(buf); buf = ''
            continue
        # a new entry starts when the line matches ENTRY from the start; otherwise it continues
        if ENTRY.match(s) or re.match(r"^(?:" + RANKS + r"\s+)?[A-Z][A-Za-z\.\s']{2,34},\s+", s) and not buf.strip().endswith(','):
            if buf: entries.append(buf)
            buf = s
        else:
            buf = (buf + ' ' + s).strip() if buf else ''
    if buf: entries.append(buf)
    for e in entries:
        m = ENTRY.match(e)
        if not m: continue
        rank = m.group(1) or 'Private'; nm = m.group(2).strip(' .'); rem = m.group(3)
        if len(nm.split()) > 5 or len(rem) > 250: continue
        if re.search(r"(?i:\b(Mr|Mrs|Dr|Confederate|Congress|Company|Regiment|Court|Society|Lieut|county|court)\b)", nm) or len(nm.split()) < 2: continue
        killed_ctx = bool(re.match(r"^(at|near|in)\b", rem))
        label, basis, rs, fl = classify(('killed ' + rem) if killed_ctx else rem)
        if killed_ctx: fl = fl + ['killed-list-context-inferred']
        wr.add(unit_id='C-12AL', regiment='12th Alabama Infantry', company=c, section='casualty/dead list in company sketch', name_as_printed=nm, rank=rank, source_entry=e[:250],
               presence_label=label, presence_basis=basis, source_id='AL-PARK-1906', locator='Park 1906, Co. %s sketch, djvu line ~%d' % (c, lo),
               parse_flags=';'.join(sorted(set(fl + name_flags(nm)))), roll_status=rs)
# Appomattox paroles (Park copies SHSP vol. 15 pp.244-46): lines 1093-1175
comp = None
for ln in range(1090, 1180):
    s = L[ln - 1].strip()
    m = re.match(r"^Compa[a-z]*\s+([A-K])\.?$", s)
    if m: comp = m.group(1); continue
    m = re.match(r"^(Privates?|Sergeants?|Corporals?|Corporal|Sergeant|Musicians?|Captain|Lieutenants?)\s*:\s*(.*)$", s)
    if m and comp:
        for nm in [x.strip(' .') for x in re.split(r",\s*(?![a-z])|\.\s+(?=[A-Z])", m.group(2)) if x.strip(' .')]:
            nm2 = re.sub(r",?\s+(detailed|teamster|division).*$", '', nm)
            if not re.search(r"[A-Z][a-z]+", nm2): continue
            wr.add(unit_id='C-12AL', regiment='12th Alabama Infantry', company=comp, section='Appomattox parole list 9 Apr 1865', name_as_printed=nm2, rank=m.group(1),
                   source_entry=nm[:150], presence_label='Unknown', presence_basis='ONROLL-NO-STATUS: paroled at Appomattox 9 April 1865; no 1863 status', source_id='AL-PARK-1906',
                   locator='Park 1906 (SHSP 15:244-46), djvu line %d' % ln, parse_flags=';'.join(['appomattox-1865'] + name_flags(nm2)), roll_status='on-roll-undetermined')
os.makedirs(DATA + r'\alabama', exist_ok=True)
print(wr.save('alabama'), wr.stats())
progress('alabama 12th Alabama (Park 1906 lists) parsed: %d rows' % len(wr.rows))
