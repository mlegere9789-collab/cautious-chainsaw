"""Alabama: Brewer, Alabama: her history, resources, war record, and public men (1872), 'War Record' regimental lists (field officers and company captains by county; the book states the rosters are incomplete)."""
import sys, re, os, json
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\docs\battle-theatre\rosters\data\C-ALMSTX\scripts')
from rlib import *

SRC = CACHE + r'\norm\alabamaherhistor00brew_djvu.txt'
LINES = open(SRC, encoding='utf-8', errors='replace').read().split('\n')
UNITS = [
    ('C-3AL', '3rd Alabama Infantry', 39260, 39400), ('C-4AL', '4th Alabama Infantry', 39401, 39538), ('C-5AL-R', '5th Alabama Infantry (Rodes)', 39539, 39640),
    ('C-6AL', '6th Alabama Infantry', 39641, 39821), ('C-8AL', '8th Alabama Infantry', 39822, 39953), ('C-9AL', '9th Alabama Infantry', 39954, 40068),
    ('C-10AL', '10th Alabama Infantry', 40069, 40197), ('C-11AL', '11th Alabama Infantry', 40198, 40314), ('C-12AL', '12th Alabama Infantry', 40315, 40441),
    ('C-13AL', '13th Alabama Infantry', 40442, 40542), ('C-14AL', '14th Alabama Infantry', 40543, 40641), ('C-15AL', '15th Alabama Infantry', 40642, 40760),
    ('C-26AL', '26th Alabama Infantry', 41741, 41834), ('C-44AL', '44th Alabama Infantry', 43374, 43473), ('C-47AL', '47th Alabama Infantry', 43668, 43757),
    ('C-48AL', '48th Alabama Infantry', 43758, 43860), ('C-5AL-H', '5th Alabama Battalion (Archer)', 45734, 45781), ('C-ART-Hurt', "Hardaway's Battery (Hurt's; Alabama artillery)", 46270, 46310),
]
ROLE = r"(Colonels?|Lieutenant[- ]Colonels?|Majors?|Adjutants?|Surgeons?|Assistant[- ]Surgeons?|Captains?|Lieutenants?|Quartermasters?|Commissar(?:y|ies))"
RE_ROLE = re.compile(r"^" + ROLE + r"\.?\s*[—\-–]+\s*(.*)$", re.S | re.I)
RE_COUNTY = re.compile(r"^([A-Z][A-Za-z\.\s,&']{2,45}?)\.?\s*[—\-–]+\s*(.*)$", re.S)
HDRS = re.compile(r"^(WAR RECORD\.?|\d{1,3}|0\d\d|[A-Z]{3,5}\s*\d+)$")


def paragraphs(lo, hi):
    ps = []; cur = []
    for ln in range(lo, hi + 1):
        s = LINES[ln - 1].strip()
        if not s:
            if cur: ps.append(cur); cur = []
            continue
        if HDRS.match(s):
            continue
        cur.append((ln, s))
    if cur: ps.append(cur)
    res = []
    for p in ps:
        t = ''
        for _, s in p:
            if t.endswith('-') and len(t) > 1 and t[-2].isalpha():
                t = t[:-1] + s
            else:
                t = (t + ' ' + s).strip()
        res.append((p[0][0], t))
    return res


def entries(text):
    text = re.sub(r"\s+", ' ', text)
    parts = re.split(r"(?<=[a-z]{2}\.)\s+(?=[A-Z\.])|(?<=[a-z]{2};)\s+(?=\S)", text)
    # re-glue: split only at '. ' after a lowercase word (entry end); inside an entry 'Name ; remark' keeps its ';'
    out = []
    for e in re.split(r"(?<=[a-z]{2}\.)\s+(?=[A-Z\.])", text):
        e = e.strip(' .')
        if not e: continue
        if out and re.fullmatch(r"[A-Z][a-z]{0,4}", out[-1]):   # 'Wm' / 'Wrn' / 'Jas' abbreviations split off by the period
            out[-1] = out[-1] + '. ' + e
        else:
            out.append(e)
    return out


def main():
    os.makedirs(DATA + r'\alabama', exist_ok=True)
    allstats = {}
    for uid, reg, lo, hi in UNITS:
        wr = Writer('brewer-officers-' + re.sub(r'[^a-z0-9]+', '-', reg.lower()).strip('-'))
        n_county = 0
        mode = 'prelim'
        cur_block = None
        blocks = []
        for ln0, t in paragraphs(lo, hi):
            if re.match(r"^(FIELD AND STAFF|CAPTAINS,? AND COUNTIES|captains, and counties)", t, re.I):
                mode = 'cap' if re.match(r"^(CAPTAINS|captains)", t) else 'fs'
                rest = re.sub(r"^(CAPTAINS,? AND COUNTIES FROM WHICH THE COMPANIES CAME\.?|FIELD AND STAFF\.?\*?|captains, and counties from which the companies came\.?)\s*", '', t, flags=re.I)
                if not rest: cur_block = None; continue
                t = rest
            if mode == 'prelim':
                # narrative before the lists; the lists may begin with a role marker directly
                if not RE_ROLE.match(t): continue
                mode = 'fs'
            if t.startswith(('*', '†', '‡', 'f ', '^', '1', 't ')) and not RE_ROLE.match(t) and len(t) > 40:
                continue    # footnote paragraph
            mr = RE_ROLE.match(t)
            mc = RE_COUNTY.match(t) if not mr else None
            if mr and mode in ('fs', 'cap') and not (mode == 'cap' and re.match(r'^Lieutenants?\b', mr.group(1), re.I) and False):
                role = re.sub(r's$', '', mr.group(1)); cur_block = dict(role=role, company='', body=mr.group(2), ln=ln0, kind='role')
                blocks.append(cur_block)
            elif mc and mode == 'cap' and len(mc.group(1).split()) <= 8 and not re.search(r"\bthe\b|\bwas\b|\bwere\b", mc.group(1)):
                n_county += 1
                cur_block = dict(role='Captain', company='order %d: %s' % (n_county, mc.group(1).strip()), body=mc.group(2), ln=ln0, kind='county')
                blocks.append(cur_block)
            elif cur_block is not None and mode in ('fs', 'cap'):
                cur_block['body'] += ' ' + t
        for b in blocks:
            for e in entries(b['body']):
                nm, _, rem = e.partition(';')
                nm = re.sub(r"\s+of\s+[A-Z][A-Za-z]+(?:\s+and\s+[A-Z][A-Za-z]+)?\s*$", '', nm).strip(' .*†')
                nm = re.sub(r"[\*†‡]", '', nm).strip()
                if not nm or not re.search(r"[A-Za-z]{3}", nm) or len(nm) > 60:
                    continue
                if len(nm.split()) > 6:
                    continue
                label, basis, rs, fl = classify(rem.strip())
                fl = fl + name_flags(nm)
                wr.add(unit_id=uid, regiment=reg, company=b['company'] or 'FS', section='field and staff' if b['kind'] == 'role' else 'company captains (by county, in company order)',
                       name_as_printed=nm, rank=b['role'], source_entry=e[:300], presence_label=label, presence_basis=basis,
                       dup_group=re.sub(r'[^a-z]', '', nm.lower()), source_id='AL-BREWER-1872', locator='Brewer 1872 War Record, djvu line %d' % b['ln'],
                       parse_flags=';'.join(sorted(set(fl + ['company-letter-inferred-from-order'] if b['kind'] == 'county' else fl))), roll_status=rs)
        wr.save('alabama')
        allstats[uid] = wr.stats()
        print(uid, len(wr.rows), wr.stats()['labels'])
        progress('alabama %s (Brewer 1872 officers) parsed: %d rows' % (uid, len(wr.rows)))
    json.dump(allstats, open(DATA + r'\alabama\stats_brewer.json', 'w'), indent=1)


main()
