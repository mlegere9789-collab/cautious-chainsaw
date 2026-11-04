"""15th Alabama Infantry: Oates, The War Between the Union and the Confederacy (1905), Appendix A (company rolls with a record for every man)."""
import sys, re, json
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\docs\battle-theatre\rosters\data\C-ALMSTX\scripts')
from rlib import *

SRC = CACHE + r'\norm\01897724_3053_djvu.txt'
BOUNDS = [('A', 27134), ('B', 28063), ('C', 29013), ('D', 29701), ('E', 30307), ('F', 31506), ('G', 32512), ('H', 34411), ('I', 35283), ('K', 36292), ('L', 37177), (None, 37845)]
RANKS = [('lieutenant colonel', 'Lieutenant Colonel'), ('colonel', 'Colonel'), ('major', 'Major'), ('captain', 'Captain'),
         ('first lieutenant', '1st Lieutenant'), ('senior second lieutenant', '2nd Lieutenant'), ('junior second lieutenant', '2nd Lieutenant'),
         ('second lieutenant', '2nd Lieutenant'), ('third lieutenant', '3rd Lieutenant'), ('brevet second lieutenant', '2nd Lieutenant'),
         ('first sergeant', '1st Sergeant'), ('second sergeant', '2nd Sergeant'), ('third sergeant', '3rd Sergeant'), ('fourth sergeant', '4th Sergeant'),
         ('fifth sergeant', '5th Sergeant'), ('first corporal', '1st Corporal'), ('second corporal', '2nd Corporal'), ('third corporal', '3rd Corporal'),
         ('fourth corporal', '4th Corporal'), ('musician', 'Musician'), ('drummer', 'Musician'), ('fifer', 'Musician')]
START = re.compile(r"^(?:\([a-z]\)\s*)?((?:[A-Z][A-Za-z.'\-]*\.?\s+){0,3}[A-Z][A-Za-z'\-]+(?:\s+(?:Jr|Sr)\.?)?)"
                   r"(?:,\s+([a-z][a-z \-]{3,30}?),)?\s+(?:was|enlisted|died|had|served|came|joined|entered|deserted|volunteered|resigned|did|being|at the age|a |an |the |\()")
BAD_START = ('He ', 'The ', 'This ', 'His ', 'In ', 'After ', 'It ', 'Company ', 'When ', 'On ', 'At ', 'Of ', 'Was ', 'Her ', 'There ', 'During ', 'Upon ', 'Having ', 'These ', 'They ', 'Soon ', 'Some ', 'Many ', 'One ', 'Two ', 'But ', 'And ', 'As ', 'For ', 'Being ', 'By ')


def paragraphs(lo, hi):
    lines = open(SRC, encoding='utf-8', errors='replace').read().split('\n')[lo - 1:hi - 1]
    paras = []; cur = []
    for ln in lines:
        s = ln.strip()
        if re.fullmatch(r'(APPENDIX A\s*\d*|\d+\s*APPENDIX A|\d{3})', s):
            continue
        if not s:
            if cur:
                paras.append(cur); cur = []
            continue
        cur.append(s)
    if cur:
        paras.append(cur)
    out = []
    for p in paras:
        t = ''
        for s in p:
            if t.endswith('-') and not t.endswith(' -') and len(t) > 1 and t[-2].isalpha():
                t = t[:-1] + s
            else:
                t = (t + ' ' + s).strip()
        out.append(t)
    return out


def main():
    wr = Writer('15th-alabama')
    for (comp, lo), (_, hi) in zip(BOUNDS[:-1], BOUNDS[1:]):
        paras = paragraphs(lo, hi)
        cur = None
        def flush():
            nonlocal cur
            if not cur:
                return
            rem = cur['text']
            label, basis, rs, fl = classify(rem)
            name = cur['name']
            fl = fl + name_flags(name)
            wr.add(unit_id='C-15AL', regiment='15th Alabama Infantry', company=comp, section=cur['rank'] if cur['rank'] != 'Private' else 'Enlisted men',
                   name_as_printed=name, rank=cur['rank'], enlist_or_commission_date='', source_entry=rem[:600],
                   presence_label=label, presence_basis=basis, source_id='AL-OATES-1905', locator='App. A, Co. %s, p.%s' % (comp, cur.get('page', '')),
                   parse_flags=';'.join(sorted(set(fl))), roll_status=rs)
            cur = None
        for t in paras:
            if t.startswith(BAD_START) or len(t) < 25:
                if cur: cur['text'] += ' ' + t
                continue
            m = START.match(t)
            if not m:
                if cur: cur['text'] += ' ' + t
                continue
            name = m.group(1).strip()
            if len(name.split()) < 2 or name.split()[0] in ('Captain', 'Lieutenant', 'Colonel', 'Major', 'Sergeant', 'Corporal', 'Private'):
                if len(name.split()) < 2:
                    if cur: cur['text'] += ' ' + t
                    continue
            flush()
            head = t[:160].lower()
            rank = 'Private'
            tail = (m.group(2) or '') + ' ' + head[len(name):len(name) + 70]
            for key, val in RANKS:
                if key in tail.lower():
                    rank = val; break
            cur = dict(name=name, text=t, rank=rank)
        flush()
    p = wr.save('alabama')
    print(p, wr.stats())
    progress('alabama 15th Alabama (Oates App. A) parsed: %d rows' % len(wr.rows))


main()
