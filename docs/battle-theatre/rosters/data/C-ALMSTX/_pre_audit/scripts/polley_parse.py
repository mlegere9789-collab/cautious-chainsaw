"""Texas Brigade: Polley, Hood's Texas Brigade (1910), 'Muster Rolls of First / Fourth / Fifth Texas' (two-column pages; djvu.xml word boxes)
plus the 'Roll of officers and men belonging to Hood's Texas Brigade who surrendered at Appomattox' (text; includes the Third Arkansas)."""
import sys, re, json, os
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\docs\battle-theatre\rosters\data\C-ALMSTX\scripts')
from rlib import *
from collections import Counter

P = json.load(open(CACHE + r'\poll_pages.json'))
UID = {'FIRST': ('C-1TX', '1st Texas Infantry'), 'FOURTH': ('C-4TX', '4th Texas Infantry'), 'FIFTH': ('C-5TX', '5th Texas Infantry')}
OFFWORD = re.compile(r"^(captain|lieutenant|lieut|surgeon|asst|assistant|sergeant|sergt|serg|corporal|corp|colonel|major|adjutant|musician|first|second|third|elected|1st|2d|3d|4th|5th|promoted|orderly|brevet|chaplain|quartermaster|commissary|ensign|hospital|drummer|fifer|color|ordnance|lt)", re.I)


def lines_in(words):
    rows = []
    for t in sorted(words, key=lambda t: (t[1] + t[3]) / 2):
        yc = (t[1] + t[3]) / 2
        if rows and yc - rows[-1][0] <= 11:
            rows[-1][1].append(t)
        else:
            rows.append([yc, [t]])
    for r in rows: r[1].sort()
    return rows


def parse_rolls():
    out = {k: [] for k in UID}
    st = dict(reg=None, comp=None, cur=None)
    def flush():
        if st['cur']: out[st['cur']['reg']].append(st['cur']); st['cur'] = None
    for pg in range(356, 406):
        words = [w for w in P[str(pg)] if w[1] > 250]
        if not words: continue
        # page-wide headings (they straddle the column split)
        heads = []
        hy = []
        for y, l in lines_in(words):
            tt = re.sub(r'\s+', ' ', ' '.join(w[4].strip() for w in l)).strip()
            mh = re.search(r"MUSTER\s+ROLLS?\s+OF\s+(FIRST|FOURTH|FIFTH)\s+TEXAS", tt, re.I)
            mc = re.match(r"^COMPANY\s+([A-K])\.?$", tt)
            if mh: heads.append((y, 'reg', mh.group(1).upper())); hy.append(y)
            elif mc: heads.append((y, 'comp', mc.group(1))); hy.append(y)
        words = [w for w in words if all(abs((w[1] + w[3]) / 2 - y) > 14 for y in hy)]
        if st['reg'] is None and heads:
            words = [w for w in words if (w[1] + w[3]) / 2 >= heads[0][0] - 6]
        if not words: continue
        rows = lines_in(words)
        firsts = [r[1][0][0] for r in rows]
        base = min(firsts)
        xl = Counter(round(x / 8) * 8 for x in firsts if x < base + 120).most_common(1)[0][0]
        split = xl + 800
        edges = [250] + [h[0] for h in heads] + [10 ** 6]
        for bi in range(len(edges) - 1):
            lo, hi = edges[bi], edges[bi + 1]
            if bi > 0:
                flush(); kind, val = heads[bi - 1][1], heads[bi - 1][2]
                if kind == 'reg': st['reg'] = val; st['comp'] = None
                else: st['comp'] = val
            for colno in (0, 1):
                cw = [w for w in words if lo - 1 <= (w[1] + w[3]) / 2 < hi - 1 and ((w[0] < split) == (colno == 0))]
                if not cw: continue
                fl_ = sorted(r_[1][0][0] for r_ in lines_in(cw))
                cstart = fl_[len(fl_) // 4]
                for y, l in lines_in(cw):
                    t = re.sub(r'\s+', ' ', ' '.join(w[4].strip() for w in l)).strip()
                    if not t: continue
                    if re.fullmatch(r"(HOOD'?S TEXAS BRIGADE|\d{3}|[\d\s]+)", t) or t.startswith('Note'): continue
                    if st['reg'] is None or st['comp'] is None: continue
                    x0 = l[0][0]
                    if x0 <= cstart + 22:
                        flush()
                        st['cur'] = dict(reg=st['reg'], comp=st['comp'], text=t, page=pg, col=colno)
                    elif st['cur'] is not None:
                        c = st['cur']
                        if c['text'].endswith('-') and not c['text'].endswith(' -'):
                            c['text'] = c['text'][:-1] + t
                        else:
                            c['text'] += ' ' + t
    flush()
    return out


def fix_text(t):
    t = re.sub(r"(\w)- (\w)", r"\1\2", t)   # 'Gettys- burg'
    return t


def to_rows(out):
    for key, ents in out.items():
        uid, reg = UID[key]
        wr = Writer(reg.lower().replace(' ', '-'))
        for e in ents:
            t = fix_text(e['text']).strip()
            star = t.startswith('*')
            t = t.lstrip('*').strip()
            name, _, rem = t.partition(';')
            head = name.split(',')
            rank = 'Private'
            nm = name.strip()
            if len(head) >= 2 and OFFWORD.match(head[1].strip()):
                nm = head[0].strip(); rank = head[1].strip() + ((' ' + ','.join(head[2:]).strip()) if len(head) > 2 else '')
            elif re.match(r"^(Dr\.|Maj\.|Capt\.|Col\.|Lieut\.)", nm):
                rank = nm.split()[0]
            remark = (rem or '').strip()
            if rank != 'Private':
                remark = (rank + '; ' + remark).strip('; ')
            label, basis, rs, fl = classify(remark)
            fl = fl + name_flags(nm)
            if nm.count(',') >= 2 or len(nm) > 32:
                fl.append('merged-row-suspected')
            if star:
                fl.append('marked-appomattox-1865')
            wr.add(unit_id=uid, regiment=reg, company=e['comp'], section='muster roll (Polley 1910)', name_as_printed=nm, rank=rank, source_entry=t[:300],
                   presence_label=label, presence_basis=basis, dup_group='', source_id='TX-POLLEY-1910', locator='Polley 1910, muster rolls, djvu p.%d col.%d' % (e['page'], e['col'] + 1),
                   parse_flags=';'.join(sorted(set(fl))), roll_status=rs)
        os.makedirs(DATA + r'\texas-arkansas', exist_ok=True)
        wr.save('texas-arkansas')
        print(uid, wr.stats())
        progress('texas %s (Polley muster rolls) parsed: %d rows' % (uid, len(wr.rows)))
        yield uid, wr


def appomattox():
    lines = open(CACHE + r'\norm\hoodstexasbrigad00poll_djvu.txt', encoding='utf-8', errors='replace').read().split('\n')
    seg = lines[13538:13900]
    regs = {'FIBST TEXAS': 'FIRST', 'FIRST TEXAS': 'FIRST', 'FOURTH TEXAS': 'FOURTH', 'FIFTH TEXAS': 'FIFTH', 'THIRD ARKANSAS': 'ARK'}
    rows = {'FIRST': [], 'FOURTH': [], 'FIFTH': [], 'ARK': []}
    cur = None; comp = 'FS'; buf = ''; ln0 = 0
    def flush():
        nonlocal buf
        if cur and buf.strip():
            rows[cur].append((comp, buf.strip(), ln0))
        buf = ''
    for i, raw in enumerate(seg):
        s = raw.strip()
        if not s: continue
        key = re.sub(r'[^A-Z ]', '', s.upper()).strip()
        if key in regs:
            flush(); cur = regs[key]; comp = 'FS'; ln0 = 13539 + i; continue
        m = re.match(r"^Company\s+([A-K])\.?$", s)
        if m:
            flush(); comp = m.group(1); ln0 = 13539 + i; continue
        if cur:
            buf += ' ' + s
    flush()
    return rows


def appomattox_rows():
    rows = appomattox()
    info = {'FIRST': ('C-1TX', '1st Texas Infantry'), 'FOURTH': ('C-4TX', '4th Texas Infantry'), 'FIFTH': ('C-5TX', '5th Texas Infantry'), 'ARK': ('C-3AR', '3rd Arkansas Infantry')}
    for k, items in rows.items():
        uid, reg = info[k]
        wr = Writer(reg.lower().replace(' ', '-') + '-appomattox-roll')
        for comp, text, ln in items:
            text = re.sub(r"(\w)- (\w)", r"\1\2", text)
            if comp == 'FS':
                segs = [x.strip() for x in text.split(';') if x.strip()]
                for sg in segs:
                    mm = re.match(r"^(.*?),\s*(.+)$", sg)
                    if not mm: continue
                    wr.add(unit_id=uid, regiment=reg, company='FS/officers', section='Appomattox surrender roll', name_as_printed=mm.group(1).strip(), rank=mm.group(2).strip(),
                           source_entry=sg[:200], presence_label='Unknown', presence_basis='ONROLL-NO-STATUS: named as surrendered at Appomattox 9 April 1865; no 1863 status (Polley 1910)',
                           source_id='TX-POLLEY-1910', locator='Polley 1910, Appomattox roll, djvu line %d' % ln, parse_flags='appomattox-1865', roll_status='on-roll-undetermined')
                continue
            for sg in [x.strip() for x in text.split(';') if x.strip()]:
                mm = re.match(r"^(1st|2d|3d|4th|5th|Orderly|Privates?|Musicians?|Corp(?:ls?|orals?)\.?|Sergts?\.?|Hospital Steward|[A-Za-z0-9\./ ]{2,20}?)\s*[,.]\s*(.*)$", sg)
                if not mm: continue
                role = mm.group(1); names = mm.group(2)
                if re.match(r"^(Sergt|Corp|Serg)", names):   # '1st Sergt., H. C. Denson'
                    role2, _, names = names.partition(',')
                    role = role + ' ' + role2.strip()
                for nm in [x.strip() for x in names.split(',') if x.strip()]:
                    if not re.search(r"[A-Za-z]{3}", nm): continue
                    wr.add(unit_id=uid, regiment=reg, company=comp, section='Appomattox surrender roll', name_as_printed=nm, rank=role.strip(),
                           source_entry=sg[:200], presence_label='Unknown', presence_basis='ONROLL-NO-STATUS: named as surrendered at Appomattox 9 April 1865; no 1863 status (Polley 1910)',
                           source_id='TX-POLLEY-1910', locator='Polley 1910, Appomattox roll, djvu line %d' % ln, parse_flags=';'.join(['appomattox-1865'] + name_flags(nm)), roll_status='on-roll-undetermined')
        wr.save('texas-arkansas')
        print(uid, 'appomattox', len(wr.rows))
        progress('texas-arkansas %s Appomattox roll (Polley) parsed: %d rows' % (uid, len(wr.rows)))


if __name__ == '__main__':
    out = parse_rolls()
    list(to_rows(out))
    appomattox_rows()
