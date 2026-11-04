"""Classify the Booth 1920 entries (work/booth_entries.json) and write the Louisiana unit CSVs + stats.
Labels follow PLAN section 2.2 (first rule that fires wins). Booth abstracts the company muster rolls, so rule 6 (30 June 1863 roll present) and rule 9 can fire here.
"""
import json, re, sys, os, csv, datetime
sys.path.insert(0, os.path.dirname(__file__))
from collections import Counter, defaultdict
from ncla_common import DATA, ROOT, low_priority
import booth_parse as bp
import booth_rolls as br

low_priority()
OOB = os.path.join(ROOT, 'baseline', 'dist', 'data', 'oob')
JUN30 = (1863, 6)
GB_START, GB_END = datetime.date(1863, 7, 1), datetime.date(1863, 7, 3)
CASW = re.compile(r"Kill|Wound|Captur|Prison|Missing|Died|Death|Mortal|Disabled|taken|Pris", re.I)
CAS_DATED = re.compile(r"(Killed|Wounded|Captured|Missing|Mortally|Died|Prisoner|Taken)[^.]{0,70}?\b(?:July|Jul)\.?\s*([123])\s*(?:st|nd|rd|d)?\s*,?\s*(?:1863|1S63|1863|18G3|1803)", re.I)
RANKS = r"(?:Pvt|Private|Corpl|Corp|Sergt|Capt|Lt|Lieut|Col|Maj|Surg|Asst|Musician|Mus|Drummer|Ensign|Adjt|Q\.? ?M|Com|Chaplain|Artificer|Driver|Bugler|Blacksmith|Wagoner|Sergeant|Teamster|Fifer|Farrier|Saddler|Ord|Hosp|Steward|Cook|Nurse|Guide|Clerk|Dr|Sgt|Cadet|Vol|Recruit|Sub|Pioneer|Lt\.?\s*Col|Brig|Gen)"


def oob_units():
    out = {}
    for f in ['first', 'second', 'third']:
        d = json.load(open(os.path.join(OOB, f'confederate_regiments_{f}_corps.json'), encoding='utf-8'))
        for r in d['regiments']:
            out[r['regiment_id']] = r
    art = json.load(open(os.path.join(OOB, 'confederate_artillery.json'), encoding='utf-8'))
    for k in ['first_corps_artillery', 'second_corps_artillery', 'third_corps_artillery']:
        for b in art[k]['battalions']:
            for x in b.get('batteries', []):
                out[x['battery_id']] = x
    return out


def covers(st, en, ymv):
    return st <= ymv <= en


RANK_POS = re.compile(r"(?:P[vy]t|[IFl]'?vt|Corpl?|Sergt|Serg|Capt|1st Lt|2nd Lt|3rd Lt|Lt|Lieut|Col|Maj|Surg|Asst|Mus|Drum|Ensign|Adjt|Artif|Driver|Bugl|Black|Wagon|Teams|Fifer|Q" + chr(92) + ".? ?M|Chap|Steward|Cook|Nurse|Cadet|Sub|Recruit)" + chr(92) + "b")


def split_name(p, cmd_start):
    head = p[:cmd_start]
    m = RANK_POS.search(head[:100])
    if m and m.start() > 2:
        name = head[:m.start()]
        rank = head[m.start():]
    else:
        cm = re.search(r"" + chr(92) + "bCos?" + chr(92) + ".?,?" + chr(92) + "s", head)
        name = head[:cm.start()] if cm else head
        rank = head[len(name):]
    name = name.strip(' ,.-;:')
    rank = re.split(r'\bCos?\.?', rank)[0]
    return name, rank.strip(' ,.')


def classify(e):
    p = e['text']
    uid, m = bp.match_unit(p[:170])
    name, rank = split_name(p, m.start())
    flags = []
    # company
    cm = re.search(r"\b(Old|New)?\s*Co\.?,?\s*([A-M])\b", p[:m.end() + 40])
    comp = cm.group(2) if cm else ''
    if cm and cm.group(1):
        flags.append('old-new-company:' + cm.group(1))
    if uid.startswith('C-ART') and uid != 'C-ART-Maurin':
        comp = {'C-ART-Squires': '1st', 'C-ART-Richardson': '2nd', 'C-ART-Miller-WA': '3rd', 'C-ART-Norcom': '4th'}[uid]
    if uid == 'C-ART-Maurin':
        comp = 'Landry/Maurin'
    cmd_printed = re.sub(r'\s+', ' ', p[m.start():m.end() + 1])
    variant = ''
    if uid == 'C-1LA-T':
        v = re.search(r"Nelligan|Strawbridge", p[:170], re.I)
        variant = v.group(0).title() if v else 'unspecified'
        flags.append('1st-La-variant:' + variant)
    enl = bp.enlist(p)
    rolls = br.roll_statements(p)
    seps = bp.sep_events(p)
    gett = bp.GETT.search(p)
    cas_dated = CAS_DATED.search(p)
    # ---- Gettysburg casualty / capture ----
    gb_snip = ''
    gb_cas = False
    if gett:
        a, b = max(0, gett.start() - 110), min(len(p), gett.end() + 90)
        gb_snip = p[a:b]
        gb_cas = bool(CASW.search(gb_snip))
        if not gb_cas:
            flags.append('gettysburg-context-uncertain')
    # ---- roll status on 30 June 1863 and the following roll ----
    sj, sa = [], []
    for st, en, status, txt in rolls:
        if covers(st, en, JUN30):
            sj.append((status, txt))
        if covers(st, en, (1863, 7)) or covers(st, en, (1863, 8)):
            sa.append((status, txt))
    sj_pres = [x for x in sj if x[0] == 'present']
    sj_abs = [x for x in sj if x[0] in ('absent', 'sep')]
    sa_pres = [x for x in sa if x[0] == 'present']
    sa_abs = [x for x in sa if x[0] in ('absent', 'sep')]
    # separation dated before the battle
    sep_before = None
    for kind, d, txt in seps:
        if d < GB_START:
            sep_before = (kind, d, txt)
            break
    for st, en, status, txt in rolls:
        if status == 'sep' and en < (1863, 7) and not sep_before and re.search(r"Died|Killed|Discharg|Resign|Dropped|Dismiss|Disabled|Retired|Transf", txt[-70:], re.I):
            sep_before = ('roll', datetime.date(en[0], en[1], 15), txt)
    # ---- label ----
    lab = why = basis = ''
    if gett and gb_cas and not (sep_before and sep_before[1] < datetime.date(1863, 1, 1) and not cas_dated):
        lab, basis = 'Present-Documented', 'CAS-REMARK'
        why = 'Booth 1920 entry names Gettysburg with a casualty/capture word: ...' + gb_snip.strip()[:150]
    elif cas_dated and not (sep_before and sep_before[1] < datetime.date(1863, 1, 1)):
        lab, basis = 'Present-Documented', 'CAS-REMARK'
        why = 'Booth 1920 event dated 1-3 July 1863: ' + cas_dated.group(0)[:120]
    elif sj_pres and (sa_pres or any(st <= (1863, 8) <= en and status == 'present' and en >= (1863, 7) for st, en, status, _ in rolls)) and not sj_abs and not sep_before:
        lab, basis = 'Present-Documented', 'MUSTER-JUN63-PRESENT'
        why = 'Booth 1920 roll abstract: 30 June 1863 roll Present and following roll Present: ' + sj_pres[0][1][:100]
    elif sj_pres and (sep_before or sj_abs):
        lab, basis = 'Unknown', 'CONFLICT'
        why = 'Booth 1920: 30 June 1863 roll Present but also an earlier separation/absence notation: carried as contested'
        flags.append('contested')
    elif sep_before:
        lab, basis = 'Absent-Documented', 'SEP-BEFORE'
        why = f'Booth 1920: {sep_before[0]} {sep_before[1]} before the battle: ' + sep_before[2][:80]
    elif sj_abs:
        lab, basis = 'Absent-Documented', 'ABS-NOTATION'
        why = 'Booth 1920 roll abstract for the 30 June 1863 period: ' + sj_abs[0][1][:100]
    elif enl and enl > GB_END:
        lab, basis = 'Absent-Documented', 'ENL-AFTER'
        why = f'enlisted {enl} (after 3 July 1863) per Booth 1920'
    elif sj_pres:
        lab, basis = 'Unknown', 'ONROLL-NO-STATUS'
        why = 'on roll (30 June 1863 roll Present; following roll not abstracted): Booth 1920 gives no later roll'
        flags.append('present-30-june-only')
    else:
        # roll data exist but nothing for the Jun-Aug 1863 period
        lab, basis = 'Unknown', 'ONROLL-NO-STATUS'
        why = 'on roll (enlisted before the battle, no separation dated before it); Booth 1920 abstracts no roll for the 30 June 1863 period' if (enl is None or enl <= GB_END) else 'enlistment date not legible'
        if enl is None:
            flags.append('no-legible-enlistment-date')
    if not rolls and not gett:
        flags.append('no-roll-abstract-parsed')
    return dict(uid=uid, name=name, rank=rank, company=comp, command_as_printed=cmd_printed, variant=variant, enl=str(enl) if enl else '', label=lab, basis=basis, why=why, flags=flags,
                n_rolls=len(rolls), gb_snip=gb_snip)


def roll_status(label, basis, flags):
    if label == 'Present-Documented':
        return 'named-present'
    if label == 'Absent-Documented':
        return 'not-yet-enlisted' if basis == 'ENL-AFTER' else 'off-roll-before-battle' if basis == 'SEP-BEFORE' else 'absent-on-30-june-roll'
    if basis == 'CONFLICT':
        return 'contested'
    if 'no-legible-enlistment-date' in flags:
        return 'unreadable-or-ambiguous'
    return 'on-roll-undetermined'


def name_flags(name):
    f = []
    n = name or ''
    if len(n) > 45 or re.search(r'\d', n):
        f.append('name-garbled')
    if re.search(r"[^A-Za-z\.' \-,\(\)]", n):
        f.append('ocr-noise-in-name')
    if len(n) < 4 or ',' not in n:
        f.append('name-garbled')
    return f


def normkey(n):
    return re.sub(r'\s+', ' ', re.sub(r"[^a-z ]", '', (n or '').lower())).strip()


def main():
    data = json.load(open(os.path.join(DATA, 'work', 'booth_entries.json'), encoding='utf-8'))
    oob = oob_units()
    LM = {}
    for tag, ia in bp.FILES:
        fn = os.path.join(DATA, 'work', f'leafmap_{tag}.json')
        if os.path.exists(fn):
            LM[tag] = {int(k): v for k, v in json.load(open(fn))['leaf_of_line'].items()}
    by = defaultdict(list)
    for e in data['entries']:
        by[e['uid']].append(e)
    outdir = os.path.join(DATA, 'units')
    os.makedirs(outdir, exist_ok=True)
    cols = ['regiment', 'company', 'section', 'name_as_printed', 'rank', 'enlist_or_commission_date', 'booth_1920_entry', 'presence_label', 'presence_basis', 'dup_group',
            'source_id', 'parse_flags', 'roll_status', 'unit_id', 'source_locator', 'row_id', 'command_as_printed']
    stats = {}
    for uid in list(bp.INF) + ['C-ART-Maurin', 'C-ART-Squires', 'C-ART-Richardson', 'C-ART-Miller-WA', 'C-ART-Norcom']:
        ents = by.get(uid, [])
        rows = []
        cls = [(e, classify(e)) for e in ents]
        groups = defaultdict(list)
        for i, (e, c) in enumerate(cls):
            groups[(normkey(c['name']), c['company'])].append(i)
        for i, (e, c) in enumerate(cls):
            fl = list(c['flags']) + name_flags(c['name'])
            g = groups[(normkey(c['name']), c['company'])]
            if len(g) > 1 and normkey(c['name']):
                fl.append('same-name-same-company')
            leaf = LM.get(e['src'], {}).get(e['line'])
            loc = f"IA {e['ia']} djvu.txt line {e['line']}" + (f"; scan page index n{leaf}" if leaf is not None else '')
            rows.append({'regiment': oob[uid]['designation'], 'company': c['company'], 'section': 'roll', 'name_as_printed': c['name'], 'rank': c['rank'],
                         'enlist_or_commission_date': c['enl'], 'booth_1920_entry': e['text'], 'presence_label': c['label'], 'presence_basis': f"{c['basis']}: {c['why']}",
                         'dup_group': f"{uid}:{g[0]}", 'source_id': 'LA-BOOTH-1920-' + e['src'].replace('booth_', '').upper(), 'parse_flags': ';'.join(sorted(set(fl))),
                         'roll_status': roll_status(c['label'], c['basis'], c['flags']), 'unit_id': uid, 'source_locator': loc, 'row_id': f'{uid}-{i:04d}',
                         'command_as_printed': c['command_as_printed']})
        excluded = []
        if uid == 'C-1LA-T':
            WEST = re.compile(r'Chickamauga|Port Hudson|Vicksburg|Chattanooga|Murfreesboro|Missionary|Corinth|Shiloh', re.I)
            EAST = re.compile(r'Rappahannock|Gettysburg|Winchester|Sharpsburg|Fredericksburg|Chancellorsville|Manassas|Cold Harbor|Spottsylvania|Petersburg|Appomattox|Seven Pines|Mechanicsville', re.I)
            keep = []
            for r in rows:
                v = re.search(r'1st-La-variant:(\w+)', r['parse_flags'])
                v = v.group(1) if v else ''
                t = r['booth_1920_entry']
                if v == 'Strawbridge' or (v == 'unspecified' and WEST.search(t) and not EAST.search(t)):
                    r = dict(r)
                    r['presence_basis'] = 'UNIT-UNRESOLVED: Booth command "1st La. Infty." variant ' + v + ' with Western-theatre evidence in the entry; not assigned to the Gettysburg 1st Louisiana (Nicholls brigade). Original label withheld: ' + r['presence_label']
                    r['presence_label'] = 'Not-published'
                    r['roll_status'] = 'unit-unresolved'
                    excluded.append(r)
                else:
                    keep.append(r)
            rows = keep
            with open(os.path.join(outdir, 'C-1LA-T_excluded-unit-unresolved.csv'), 'w', newline='', encoding='utf-8') as f:
                w = csv.DictWriter(f, fieldnames=cols)
                w.writeheader()
                w.writerows(excluded)
        fn = os.path.join(outdir, f'{uid}.csv')
        with open(fn, 'w', newline='', encoding='utf-8') as f:
            w = csv.DictWriter(f, fieldnames=cols)
            w.writeheader()
            w.writerows(rows)
        lab = Counter(r['presence_label'] for r in rows)
        rs = Counter(r['roll_status'] for r in rows)
        bas = Counter(r['presence_basis'].split(':')[0] for r in rows)
        flagc = Counter(x for r in rows for x in r['parse_flags'].split(';') if x)
        var = Counter(c['variant'] for e, c in cls if c['variant'])
        stats[uid] = dict(designation=oob[uid]['designation'], army='Confederate', state='Louisiana', source='Booth 1920', oob_strength=oob[uid].get('strength'), rows=len(rows),
                          labels=dict(lab), roll_status=dict(rs), basis=dict(bas), flags=dict(flagc), companies=dict(Counter(r['company'] for r in rows)),
                          variants=dict(var), excluded_unit_unresolved=len(excluded), unique_name_company=len(groups),
                          name_garbled_rows=sum(1 for r in rows if 'name-garbled' in r['parse_flags'] or 'ocr-noise-in-name' in r['parse_flags']), csv=os.path.relpath(fn, DATA).replace('\\', '/'))
        print(uid, len(rows), dict(lab), dict(bas), flush=True)
    json.dump(stats, open(os.path.join(DATA, 'work', 'la_stats.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)


if __name__ == '__main__':
    main()
