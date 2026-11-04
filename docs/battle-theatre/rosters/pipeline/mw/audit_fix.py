"""Audit repair pass for family MW (30 Oct 2026, independent audit, seed 41). Run AFTER wis_gen/build_unit/boies_merge/final_stats
(final_stats with MW_KEEP_6WI=1 is re-run afterwards to refresh stats.json). Operates on data/MW/*.csv in place.
The frozen pre-audit copy is data/MW/_pre_audit/. Every change is logged to data/MW/AUDIT-CHANGES.csv; removed rows to AUDIT-REMOVED.csv.

Rules (all derived from defects found by the 60-row sample; see data/MW/AUDIT.md):
 R1  EVENT-DATED-IN-BATTLE was applied to ANY date of 1-3 July 1863 in the remarks, including administrative events (transfer to the
     Veteran Reserve Corps, muster out, discharge, desertion, promotion) and misread dates ("July 1.3, '64" read as 1 July 1863).
     Only a casualty event (killed, wounded, captured, prisoner, missing) dated in the window documents presence (PLAN 2.2 rule 2).
     Other rows are demoted to Unknown (or Absent-Documented when the enlistment is after 3 July 1863).
 R2  The Wisconsin parser did not treat "M. O." (mustered out) as a separation, so men mustered out before 1 July 1863 stayed Unknown.
 R3  A transfer to another company of the same regiment is not a separation (PLAN 2.2 rule 7: "transfer out"); such rows were Absent-Documented.
 R4  A rank heading glued to the end of a name (name_clean) is stripped; rows whose whole name is a rank heading are removed (tombstoned).
"""
import csv, os, re, sys, json, datetime
from collections import Counter
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..'))
import cls_gen
from common import parse_dates as lenient_dates

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '..'))
D = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data', 'MW')
GB0, GB1 = cls_gen.GB0, cls_gen.GB1
APPLY = '--dry' not in sys.argv

CAS = re.compile(r"in\s+action|^\W*(?:and\s+)?w[a-z;]{1,3}\.?\s|kill|kiil|kil+ed|wnd|wnl|w'?nd\b|wd\b|w'd\b|wound|woun|wiid|wud|capt|pris|prlsoner|missing", re.I)
ADMIN_WORD = re.compile(r"trans|disch|dis\.|m\.\s*o\.|must|res\.|resign|desert|prom|dism|mustered|tr\.", re.I)
MO = re.compile(r"\b(?:M\.\s*O\.|[BJAI][lI1]\.\s*O\.|Must'?d\.?\s+out|Mustered\s+out)", re.I)
# heading words glued to names
HEADS = r"(?:Colonels?|Lieutenant\s+Colonels?|Majors?|Captains?|(?:First|Second|1st|2nd|2d)\s+(?:Asst\.?\s+)?Lieutenants?|1st\s+Asst\.?\s+Surgeons?|2d\s+Asst\.?\s+Surgeons?|Asst\.?\s+Surgeons?|Surgeons?|Adjutants?|Quartermasters?|Q\.\s*M\.\s*Sergeants?|Chaplains?|Sergeant\s+Majors?|Sergeants?|Corporals?|Musicians?|Principal\s+Musicians?|Wagoners?|Privates?|Hospital\s+Stewards?|Com(?:mis)?\.?\s+Sergeants?|Commissary\s+Sergeants?|Quartermaster\s+Sergeants?|Drummers?|Fifers?|Artificers?|Teamsters?|Recruits?|Veterans?|Buglers?|Farriers?|Saddlers?|Blacksmiths?|Lieutenants?|Sergt\.?\s+Majors?)"
GLUED = re.compile(r"^(.*\S)\s+" + HEADS + r"\.?\s*$", re.I)
HEADONLY = re.compile(r"^\W*" + HEADS + r"\W*$|^\W*(?:BAND|Field\s+and\s+Staff|Non-?commissioned\s+Staff|Officers|Enlisted\s+Men)\W*$", re.I)


def fixdots(s):
    return re.sub(r"(?<=\d)\.(?=\d\s*[,.]\s*['\"‘’`“”]?\s*\d)", '', s)


def segs(rem):
    return [s.strip(' .*') for s in re.split(r"[;]|(?<=\d)\.\s+(?=[A-Z])|(?<=\')\d\d\.\s+(?=[A-Z])", rem) if s.strip(' .*')]


def window_dates(seg):
    a = [d for d, _, _, _ in cls_gen.find_dates(fixdots(seg), None) if GB0 <= d <= GB1]
    b = [d for d, _, _ in lenient_dates(fixdots(seg)) if GB0 <= d <= GB1]
    return a or b


def keyname(nm):
    nm = (nm or '').strip()
    if ',' in nm:
        sur, giv = nm.split(',', 1)
    else:
        t = nm.split()
        sur, giv = (t[-1], ' '.join(t[:-1])) if t else ('', '')
    sur = re.sub(r'[^a-z]', '', sur.lower())[:5]
    giv = re.sub(r'[^a-z]', '', giv.lower())[:1]
    return sur, giv


import difflib
LATE = re.compile(r"Wilderness|Spott|Cold\s*Harbor|Petersburg|Peach\s*Tree|Peachtree|Resaca|Kenesaw|Kenesa|Atlanta|Jonesboro|Laurel\s*Hill|North\s*Anna|Mine\s*Run|Hatcher|Five\s*Forks|Averys|Bentonville|Chattanooga|Lookout\s*(?:Valley|Mount)|Missionary|Cedar\s*Creek|Opequon|Fisher|Appomattox|Dabney|Weldon|Deep\s*Bottom|Dallas|Andersonville|Savannah|Raleigh|Bermuda|Reams|Boydton", re.I)
RANKSEG = re.compile(r"^\W*(?:[12I1l]\w{0,2}\s+)?(?:Lieut|Capt|Major|Col|Adjt|Adjutant|Q\.\s*M|Sergt|Corp)|^\W*(?:\w{1,3}\s+)?Lieut", re.I)
FKW = [('Discharged', 'disch'), ('Died', 'died'), ('Killed', 'killed'), ('Deserted', 'deserted'), ('Transferred', 'trans'), ('Resigned', 'resigned'), ('Dismissed', 'dismissed')]


def before_events(rem, fuzzy):
    """(kind, date, segment) for every separation-like event dated before the battle: strict classifier events plus, for Wisconsin, the parser's fuzzy keyword reading
    (so OCR-damaged keywords such as 'Uisch' still count) minus segments that are rank promotions ('Isc Lieut.' read as Disch)."""
    out = []
    for s in re.split(r"[;:]|(?<=\d)\.\s+(?=[A-Z])", rem):
        s = s.strip(' .*')
        if not s:
            continue
        kind = None
        for k, rx in cls_gen.SEPRE:
            mm = rx.search(s)
            if mm:
                kind, tail = k, s[mm.end():]
                break
        if kind is None and fuzzy:
            w = re.sub(r'[^A-Za-z]', '', s.split(' ')[0])
            if w and not RANKSEG.match(s):
                best = max(((difflib.SequenceMatcher(None, w.lower(), kw).ratio(), k) for k, kw in FKW), default=(0, None))
                if best[0] >= 0.66 or w.lower().startswith('res'):
                    kind, tail = best[1] if best[0] >= 0.66 else 'Resigned', s
        if kind is None:
            continue
        if fuzzy:
            ds = [(d, 0, 0, True) for d, _, _ in lenient_dates(fixdots(tail))]
        else:
            ds = cls_gen.find_dates(fixdots(tail), None)
        if ds and ds[0][0] < GB0 and ds[0][3] and ds[0][0].year >= 1861:
            out.append((kind, ds[0][0], s))
    return out


log = []
removed = []
stat = Counter()


def change(r, unit, rule, label, basis, roll, flag=None):
    log.append(dict(unit_id=unit, name_as_printed=r['name_as_printed'], company=r['company'], page=r['source_page_idx_ia'], rule=rule, old_label=r['presence_label'],
                    new_label=label, old_basis=r['presence_basis'][:140], new_basis=basis[:260], remarks=r['remarks_as_printed'][:140]))
    r['presence_label'] = label
    r['presence_basis'] = basis
    r['roll_status'] = roll
    r['parse_flags'] = ';'.join(x for x in (r['parse_flags'], flag or ('audit-' + rule)) if x)
    stat[(unit, rule, label)] += 1


COLS = None
for path in sorted(os.listdir(D)):
    if not path.endswith('.csv') or path.startswith('AUDIT'):
        continue
    full = os.path.join(D, path)
    rows = list(csv.DictReader(open(full, encoding='utf-8', newline='')))
    if not rows:
        continue
    COLS = list(rows[0].keys())
    unit = rows[0]['unit_id']
    keep = []
    for r in rows:
        # R4 heading-only rows are not persons
        if HEADONLY.match(r['name_as_printed'].strip()) and r['section'] != 'participant-only':
            removed.append(dict(unit_id=unit, **{k: r[k] for k in ('company', 'section', 'name_as_printed', 'remarks_as_printed', 'presence_label', 'source_page_idx_ia')}, reason='R4: the printed name is a rank/section heading, not a soldier'))
            stat[(unit, 'R4-removed', '')] += 1
            continue
        keep.append(r)
    rows = keep
    # R4 glued headings: fix name_clean only (name_as_printed stays as parsed)
    for r in rows:
        nm = r['name_clean']
        m = GLUED.match(nm) if nm else None
        if m and r['section'] != 'participant-only' and len(m.group(1).split()) >= 2:
            old = r['name_clean']
            r['name_clean'] = m.group(1).strip(' .,')
            r['parse_flags'] = ';'.join(x for x in (r['parse_flags'], 'audit-R4-heading-stripped:' + old[len(m.group(1)):].strip(' .')) if x)
            stat[(unit, 'R4-name', '')] += 1
    # index for R3
    idx = {}
    for i, r in enumerate(rows):
        idx.setdefault(keyname(r['name_clean']), []).append(i)
    for r in rows:
        lab, basis, rem = r['presence_label'], r['presence_basis'], r['remarks_as_printed']
        if r['section'] == 'participant-only':
            continue
        # R1
        if lab == 'Present-Documented' and (basis.startswith('EVENT-DATED-IN-BATTLE') or ('event dated' in basis and 'in remarks' in basis)):
            ok = None
            adm = None
            if cls_gen.GETT.search(rem) or re.search(r'tysb|Get-\s*ty', rem, re.I):
                r['presence_basis'] = 'GETTYSBURG-REMARK: the remarks name Gettysburg (OCR-split word); date inside the battle window [audit recheck]: ' + rem[:80]
                stat[(unit, 'R1-kept', lab)] += 1
                continue
            for s in segs(rem):
                wd = window_dates(s)
                if wd:
                    if CAS.search(s):
                        ok = (s, wd[0])
                    elif adm is None:
                        adm = (s, wd[0])
            if ok:
                r['presence_basis'] = 'CAS-REMARK: casualty event dated ' + str(ok[1]) + ' in the remarks (' + ok[0][:70] + ') [audit recheck: casualty verb present]'
                stat[(unit, 'R1-kept', lab)] += 1
                continue
            enl = r['enlist_or_rank_date']
            if enl and enl >= '1863-07-04':
                change(r, unit, 'R1', 'Absent-Documented', 'ENL-AFTER: enlistment/muster date %s is after the battle (audit: the remark date inside 1-3 July 1863 is not a casualty)' % enl, 'not-yet-enlisted')
                continue
            why = ('the only date inside 1-3 July 1863 belongs to an administrative event (%s), which does not document presence at the battle' % adm[0][:60]) if adm else \
                  'the date read as 1-3 July 1863 was an OCR misreading (a period inside the day number, for example July 1.3 = 13 July); no date in the remarks falls inside the battle'
            change(r, unit, 'R1', 'Unknown', 'ADMIN-EVENT-IN-BATTLE-WINDOW: ' + why + '; previously Present-Documented by EVENT-DATED-IN-BATTLE (audit repair 30 Oct 2026). No other presence evidence; ' + ('enlistment %s' % enl if enl else 'enlistment date not legible'), 'on-roll-undetermined' if enl else 'unreadable-or-ambiguous')
            continue
        # R7 Drafted men whose printed date is after the battle (the parser applied the "draft year not legible" rule before the ENL-AFTER rule)
        if lab == 'Unknown' and basis.startswith('Drafted man') and r['enlist_or_rank_date'] >= '1863-07-04':
            change(r, unit, 'R7', 'Absent-Documented', 'ENL-AFTER: drafted man whose printed date %s is after the battle (audit repair: the date was legible; the parser tested the draft rule first)' % r['enlist_or_rank_date'], 'not-yet-enlisted')
            continue
        # R5/R6 Absent-Documented resting on a misread or misparsed separation
        if lab == 'Absent-Documented' and re.match(r'(SEP-BEFORE|Disch|Died|Killed|Trans|Resigned|Deserted|Dismissed|Mustered out)', basis) and 'Mustered-Out column' not in basis:
            ev = before_events(rem, unit.endswith('WI'))
            good = [e for e in ev if not LATE.search(e[2])]
            if not good and not any(e[0] == 'Transferred' for e in ev):
                if ev:
                    why = 'DATE-CONFLICT: the separation event (%s) names a battle that happened after 3 July 1863 (%s), so the printed year was misread by the OCR (4 read as 1, 2 or 3); the separation date is unknown' % (ev[0][2][:50], LATE.search(ev[0][2]).group(0))
                else:
                    why = 'NO-SEPARATION-VERB: the entry that produced the Absent label is a rank promotion or an unreadable word, not a separation; no separation before 1 July 1863 is documented'
                enl = r['enlist_or_rank_date']
                change(r, unit, 'R5', 'Unknown', why + ' (audit repair 30 Oct 2026)', 'unreadable-or-ambiguous' if not enl else 'on-roll-undetermined')
                continue
        # R3
        if lab == 'Absent-Documented' and re.match(r'(Trans dated|SEP-BEFORE: Transferred)', basis):
            before = []
            for s in segs(rem):
                for kind, rx in cls_gen.SEPRE:
                    mm = rx.search(s)
                    if mm:
                        ds = cls_gen.find_dates(fixdots(s[mm.end():]), None)
                        before.append((kind, ds[0][0] if ds else None, s))
                        break
            if not before:
                continue
            intra = []
            other_before = False
            for kind, d, s in before:
                tm = re.search(r"(?:to|toCo)\s*(?:Co\.?|Company)?\s*([A-K])\b\W*(.*)$", s, re.I) if kind == 'Transferred' else None
                if tm and not re.search(r"\d+\s*(?:st|nd|rd|th|d)\b|Wis|Ind|Ill|Mich|Minn|U\.\s*S|V\.\s*R|Inv|Batt|Reg|Art|Cav|Inf|N\.\s*C|Vol", tm.group(2), re.I) and re.match(r'^[A-Za-z]?\W*(?:[A-Z][a-z]{2,5}\.?\s*\d{1,2}.*)?$', tm.group(2).strip() or ''):
                    intra.append((tm.group(1).upper(), d, s))
                elif d is not None and d < GB0:
                    other_before = True
                elif d is None:
                    other_before = True
            if intra and not other_before:
                tgt, d, s = intra[0]
                sur, ini = keyname(r['name_clean'])
                cand = [j for j in idx.get((sur, ini), []) if rows[j] is not r and rows[j]['company'].split('-')[0] == tgt and rows[j]['presence_label'] != 'Duplicate-Xref']
                if len(cand) == 1:
                    r['dup_group'] = rows[cand[0]]['dup_group'] or r['dup_group']
                    change(r, unit, 'R3', 'Duplicate-Xref', 'INTRA-REGIMENT-TRANSFER: moved to Co. %s of the same regiment (%s); the man is counted through his row in Co. %s (audit repair: a transfer inside the regiment is not a separation, PLAN 2.2 rule 7)' % (tgt, d, tgt), 'xref')
                else:
                    change(r, unit, 'R3', 'Unknown', 'INTRA-REGIMENT-TRANSFER: moved to Co. %s of the same regiment (%s); not a separation from the regiment, so no absence is documented (audit repair; the receiving-company row could not be matched uniquely)' % (tgt, d), 'on-roll-undetermined')
                continue
        # R2
        if lab == 'Unknown' and r['roll_status'] in ('unreadable-or-ambiguous', 'on-roll-undetermined') and not r['source_id'].startswith('MI-') and MO.search(rem):
            hit = None
            for s in segs(rem):
                mm = MO.search(s)
                if mm:
                    ds = cls_gen.find_dates(fixdots(s[mm.end():]), None)
                    if ds and ds[0][3] and ds[0][0] < GB0 and ds[0][0].year >= 1861:
                        full4 = bool(re.search(r"18\d\d", s))
                        if (full4 or (ds[0][0].year == 1862 and not re.search(r'term|exp', s, re.I))) and not re.search(r'to\s+date', s, re.I):
                            hit = (s, ds[0][0])
                            break
            if hit and not cls_gen.GETT.search(rem):
                change(r, unit, 'R2', 'Absent-Documented', 'SEP-BEFORE: mustered out dated %s (before the battle): "%s" (audit repair: the Wisconsin parser did not read M. O. as a separation)' % (hit[1], hit[0][:60]), 'off-roll-before-battle')
    if APPLY:
        with open(full, 'w', newline='', encoding='utf-8') as f:
            w = csv.DictWriter(f, fieldnames=COLS)
            w.writeheader()
            w.writerows(rows)

lf = os.path.join(D, 'AUDIT-CHANGES.csv')
with open(lf, 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=['unit_id', 'name_as_printed', 'company', 'page', 'rule', 'old_label', 'new_label', 'old_basis', 'new_basis', 'remarks'])
    w.writeheader()
    w.writerows(log)
if removed:
    with open(os.path.join(D, 'AUDIT-REMOVED.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(removed[0].keys()))
        w.writeheader()
        w.writerows(removed)
print('changes', len(log), 'removed', len(removed))
for k, v in sorted(stat.items()):
    print(k, v)
