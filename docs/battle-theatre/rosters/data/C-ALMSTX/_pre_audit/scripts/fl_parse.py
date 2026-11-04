"""Parse 'Soldiers of Florida in the Seminole Indian, Civil and Spanish-American Wars' (1903) rolls for the 2nd, 5th, 8th Florida Infantry
from the Internet Archive djvu.xml word boxes (columns: name | mustered in | mustered out | remarks)."""
import sys, re, json, datetime
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\docs\battle-theatre\rosters\data\C-ALMSTX\scripts')
from rlib import *

P = json.load(open(CACHE + r'\fl_pages.json'))
UNITS = {  # page ranges (djvu page index, 1-based) -> unit
    'C-2FL': ('2nd Florida Infantry', 83, 105, 'FL-SOLDIERS-1903'),
    'C-5FL': ('5th Florida Infantry', 141, 159, 'FL-SOLDIERS-1903'),
    'C-8FL': ('8th Florida Infantry', 192, 212, 'FL-SOLDIERS-1903'),
}
MONRE = re.compile(r'^(Jan|Feb|Mar|Apr|May|Mav|Jun|Jul|Aug|Sep|Oct|Nov|Dec)', re.I)
RANKHDR = re.compile(r'^(Colonels?|Lieutenant[- ]Colonels?|Majors?|Adjutants?|Surgeons?|Assistant[- ]Surgeons?|Captains?|\d?\w{0,3}\s*Lieutenants?|Sergeants?[- ]Majors?|Quartermasters?|Commissar\w+|Chaplains?|Hospital Stewards?|Ordnance|Principal Musicians?|Musicians?|Non-?[Cc]ommissioned|Color|ENLISTED|OFFICERS|Sergeants?|Corporals?|Privates?|Teamsters?|Wagon)', re.I)


def group_lines(words):
    ws = sorted(words, key=lambda t: (t[1] + t[3]) / 2)
    lines = []
    for w in ws:
        yc = (w[1] + w[3]) / 2
        if lines and yc - lines[-1]['y0'] <= 11:
            lines[-1]['w'].append(w)
        else:
            lines.append({'y0': yc, 'w': [w]})
    for l in lines:
        l['w'].sort(key=lambda t: t[0])
    return lines


def txt(ws):
    return re.sub(r'\s+', ' ', ' '.join(w[4].strip() for w in ws)).strip()


def parse_unit(uid):
    reg, p0, p1, src = UNITS[uid]
    wr = Writer(reg.lower().replace(' ', '-').replace('infantry', '').strip('-'))
    comp = None; sect = ''; cur = None; last_xin = 740; anchors = {}
    def flush():
        nonlocal cur
        if cur is None:
            return
        name = re.sub(r'[\s\.]+$', '', cur['name']).strip(' .,')
        remark = cur['rem'].strip()
        in_d = parse_dates(cur['in'])
        out_d = parse_dates(cur['out'])
        # in/out columns hold 'May 25, '61' ; sometimes only 'July' (day lost): month-only precision
        ind = in_d[0][0] if in_d else None
        outd = out_d[0][0] if out_d else None
        label, basis, rs, fl, = classify(remark, in_date=ind, out_date=outd)
        fl = fl + name_flags(name) + (['name-missing-ocr'] if not name else [])
        if not in_d and cur['in']:
            fl.append('in-year-not-printed' if re.search(r'[A-Za-z]{3}', cur['in']) else 'in-date-unparsed')
        rank = cur['rank']
        wr.add(unit_id=uid, regiment=reg, company=comp or '?', section=cur['section'], name_as_printed=name, rank=rank,
               enlist_or_commission_date=iso(ind), source_entry=(('in: %s | out: %s | ' % (cur['in'], cur['out'])) + remark)[:400],
               presence_label=label, presence_basis=basis, dup_group='', source_id=src, locator='djvu p.%d (book p.%s)' % (cur['page'], cur['page'] - 6),
               parse_flags=';'.join(sorted(set(fl))), roll_status=rs)
        cur = None
    for pg in range(p0, p1 + 1):
        words = P[str(pg)]
        lines = group_lines(words)
        # anchors from the page header words MUSTERED (in) ... MUSTERED (out) ... REMARKS
        hx = sorted(w[0] for w in words if w[4].strip().upper().startswith('MUST') and w[1] < 700)
        xin = None
        if len(hx) >= 2 and 150 < hx[1] - hx[0] < 400:
            xin = hx[0] - 33
        if xin is None:
            xs = [w[0] for l in lines for w in l['w'] if MONRE.match(w[4].strip()) and 600 < w[0] < 1000]
            if xs:
                from collections import Counter
                xin = Counter(round(x / 12) * 12 for x in xs).most_common(1)[0][0]
        if xin is None:
            xin = last_xin
        last_xin = xin
        anchors[pg] = xin
        for l in lines:
            t = txt(l['w'])
            if re.search(r'FLORIDA\s+(INFANTRY|REGIMENT)', t) and not re.search(r'Roll', t, re.I):
                if re.search(r'(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH|ELEVENTH)\s+FLORIDA', t):
                    flush(); comp = None; sect = ''
                    continue
            if re.match(r'^(SOLDIERS|\d+\s+SOLDIERS)', t) and 'FLORIDA' in t:
                continue
            m = re.search(r'Roll,?\s+(?:Company\s+)?([A-M])\b.*?(?:\d?\w*\s+Florida)|Roll,?\s+Field', t)
            if t.startswith('Roll') and ('Florida' in t or 'Field' in t or 'Infantry' in t):
                flush()
                mc = re.match(r'Roll,?\s+(?:Company\s+)?([A-M])\b', t)
                if re.search(r'Field', t): comp = 'FS'
                elif mc: comp = mc.group(1)
                continue
            if re.fullmatch(r'\(?Continued\.?\)?', t) or t in ('MUSTERED', 'OUT.', 'MUSTERED OUT.', 'REMARKS.', 'MUSTERED MUSTERED') or re.fullmatch(r'(MUSTERED\s*)+(OUT\.?)?|REMARKS\.?|IN\.?', t):
                continue
            if comp is None:
                continue
            if xin is None:
                xin_l = 700
            else:
                xin_l = xin
            cols = {'n': [], 'i': [], 'o': [], 'r': []}
            for w in l['w']:
                x = w[0]
                c = 'n' if x < xin_l - 70 else 'i' if x < xin_l + 235 else 'o' if x < xin_l + 478 else 'r'
                cols[c].append(w)
            n, i, o, r = (txt(cols[k]) for k in 'nior')
            mm = re.search(r'\s*(ENLISTED\s*MEN\.?|OFFICERS\.?)$', n)
            if mm and len(n) > mm.end() - mm.start() + 3:
                flush(); sect = 'ENLISTED MEN' if 'ENL' in mm.group(1) else 'OFFICERS'; n = n[:mm.start()].strip()
            # section header line: name-column only, ends with a dash / ENLISTED / OFFICERS
            letters = re.sub(r'[^A-Za-z]', '', t).upper()
            if letters and re.fullmatch(r'(NAMES|MUSTERED|OUT|IN|REMARKS|OFFICERS|ENLISTEDMEN|ENLISTED|MEN|CONTINUED)+', letters):
                if 'OFFICERS' in letters: flush(); sect = 'OFFICERS'
                elif 'ENLISTED' in letters: flush(); sect = 'ENLISTED MEN'
                continue
            if n and not i and not o and not r and (n.endswith('—') or n.endswith('-') or re.fullmatch(r'(ENLISTED\s*MEN\.?|OFFICERS\.?|NON-COMMISSIONED.*)', n, re.I) or (RANKHDR.match(n) and len(n) < 40 and '—' in n)):
                flush()
                sect = re.sub(r'[\s—\-\.]+$', '', n)
                continue
            if n and re.search(r"(Captains?|Lieutenants?|Colonels?|Majors?|Adjutants?|Surgeons?|Sergeants?|Corporals?)\s*[—\-–]+\s*$", n) and len(n) < 40:
                sect = re.sub(r'[\s—\-–\.]+$', '', n)       # rank header; text on the same line continues the previous row
                if cur is not None:
                    if i: cur['in'] = (cur['in'] + ' ' + i).strip()
                    if o: cur['out'] = (cur['out'] + ' ' + o).strip()
                    if r: cur['rem'] = (cur['rem'] + ' ' + r).strip()
                continue
            new_row = False
            if n and (i or o or ',' in n or cur is None):
                new_row = True
            elif not n and i and MONRE.search(i):
                new_row = True      # name lost in the OCR layer; row kept, name flagged
            if new_row:
                flush()
                enl_style = bool(re.match(r"^[A-Z][A-Za-z'\-]+[,.]\s", n)) or (not n)
                if sect.upper().startswith(('ENLISTED', 'NON')) or enl_style or not sect:
                    rank = 'Enlisted man'
                else:
                    rank = re.sub(r's$', '', sect)
                cur = dict(name=n, rem=r, rank=rank, section=('ENLISTED MEN' if rank == 'Enlisted man' else sect), page=pg, **{'in': i, 'out': o})
                continue
            if cur is not None:
                if n: cur['name'] += ' ' + n
                if i: cur['in'] = (cur['in'] + ' ' + i).strip()
                if o: cur['out'] = (cur['out'] + ' ' + o).strip()
                if r: cur['rem'] = (cur['rem'] + ' ' + r).strip()
        # page break does not flush: remarks may continue; but 'Roll ...' header flushes
    flush()
    return wr


if __name__ == '__main__':
    allstats = {}
    for uid in UNITS:
        wr = parse_unit(uid)
        p = wr.save('florida')
        allstats[uid] = wr.stats()
        print(uid, p, wr.stats())
        progress('florida %s parsed: %d rows -> %s' % (uid, len(wr.rows), p))
    json.dump(allstats, open(DATA + r'\florida\stats.json', 'w'), indent=1)
