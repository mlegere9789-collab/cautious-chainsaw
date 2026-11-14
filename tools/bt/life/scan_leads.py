"""Lead scan for the OA11 evidence pass: where do the local texts speak of soldiers' work and routine?

    python3 -I tools/bt/life/scan_leads.py [--cap N]

Writes docs/battle-theatre/life/leads/<group>.leads.jsonl and leads/SUMMARY.json.  A LEAD is a keyword hit with its source, record, page,
raw character offsets and a verbatim context; it is NOT evidence (nothing is read, classified or dated here).  Each text or record is owned
by exactly one group (assign_groups.py for the Official Records, SOURCE_GROUP below for the other texts), so every passage is read once.
At most --cap (default 40) hits per record and class are written; the rest are counted in `more`, never silently dropped.
"""
import os, re, sys, json, bisect, collections, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from life_lib import *
import assign_groups as AG

utf8_stdout()

CLASSES = {
    'works': r"breast-?works?|earth-?works?|rifle-?pits?|abatis|epaulements?|barricad\w+|intrench\w*|entrench\w*|slight works?|field works?|log works?|"
             r"rail (?:piles?|barricades?|breastworks?)|trenches|fortif\w+|(?:thr[eo]w(?:n|ing)?|threw) up|loop-?holes?|embrasures?|traverses?|gun-?pits?|"
             r"gabions?|fascines?|sand-?bags?|slashing|slashed",
    'tools': r"\b(?:spades?|shovels?|picks|pick-?axes?|axes?|hatchets?|intrenching tools?|entrenching tools?|tool-?wagons?|pioneers?|working parties|"
             r"working party|fatigue (?:parties|party|duty|men)|details? (?:of|for) \w+ (?:men|to (?:dig|build|cut|construct)))",
    'bridge_road': r"pontoons?|\bbridges?\b|(?:made|opened|cut|repaired|built|constructed|corduroy|new) (?:a |the )?roads?|corduroy|causeway|trestle",
    'meal': r"breakfast|\bcoffee|supper|dinner|\bmeals?\b|\bcook(?:ed|ing|s)?\b|hard-?tack|hard bread|haversacks?|\brations?\b|salt (?:pork|beef|meat)|"
            r"\bbacon|fresh beef|beef cattle|\bcommissary|\bsutlers?",
    'rest': r"bivouac\w*|encamp\w*|\bcamped\b|camp-?fires?|went into camp|\bslept|\bsleep|asleep|\brested\b|\brest\b|lay down|laid down|stacked arms|"
            r"stack arms|\bblankets?|\btents?\b|halted for the night|rolled up in",
    'picket': r"\bpickets?\b|picketed|picketing|videttes?|vedettes?|outposts?|sentinels?|sentries|\bsentry|on guard|camp guard|guard duty|patrol(?:s|ling|led)?",
    'water_wash_burial': r"canteens?|drew water|watering|water(?:ed)? (?:the )?(?:horses|animals|teams|men|command)|\bwell\b|\bspring\b|bath(?:e|ed|ing)|"
                         r"wash(?:ed|ing|es)?\b|launder\w*|burial|\bbur(?:y|ied|ying)|\bgraves?\b|interred|interment",
}
RX = {k: re.compile(v.replace(' ', r'\s+'), re.I) for k, v in CLASSES.items()}
DATE_HINT = re.compile(r'\b(June|July)\s+(\d{1,2})', re.I)

# non-OR texts: one owner group each (the register of ownership; the unindexed state volumes and narratives go to the narratives groups)
SOURCE_GROUP = {}
for sid in ('REGS-US-1861', 'REGS-CS-1863', 'BUTTERFIELD-1863', 'MAHAN-1862', 'BILLINGS-1887'):
    SOURCE_GROUP[sid] = 'period-manuals'
SOURCE_GROUP['DUANE-1862'] = 'bridges-roads'
for sid in ('HASKELL-1908', 'MEADE-LL-v1', 'MEADE-LL-v2', 'PIERCE-F-1914', 'BL-3', 'BACH-KEY-1864', 'BACH-REPULSE-1870', 'BACH-WHATTOSEE-1873',
            'BACH-WHATTOSEE-1889', 'BACH-STORY-1904', 'LONG-GBV-1891', 'NJ-TOOMBS-1888', 'NJ-FINAL-1891', 'VT-MON-1890', 'VT-GB-1914', 'MN-1ST-1916',
            'IN-1913', 'OH-DED-1887', 'OH-8TH-1889'):
    SOURCE_GROUP[sid] = 'narratives-us'
for sid in ('ALEXANDER-1907', 'LONGSTREET-1896', 'FREMANTLE-1864', 'SHSP-04', 'SHSP-05', 'SHSP-06', 'SHSP-11', 'SHSP-12'):
    SOURCE_GROUP[sid] = 'narratives-cs'
for sid in ('JACOBS-1864', 'TPIERCE-1889', 'HOSPSCENES-1864', 'CEM-REPORT-1867', 'CEM-BARTLETT-1874', 'CEM-INDIANA-1865', 'MA-BURIAL-1863',
            'NPS-CLR-CEMETERY', 'NPS-CLI-CEMETERY', 'NPS-CEM-ENCLOSURES', 'NPS-HCSR', 'NPSGOV-CEMETERY', 'NPSGOV-TOWN', 'NPSGOV-CIVILIANS',
            'NPS-CARE-WOUNDED-GUIDE', 'NPS-HS-SPANGLER-HENRY'):
    SOURCE_GROUP[sid] = 'town-burial'
NPS_AREA = {'us-1c': ('NPS-CLI-1STDAY', 'NPS-CLR-1STDAY', 'NPSGOV-FIRST-DAY', 'NPS-HS-MCPHERSON', 'NPS-HB9-1954', 'NPS-HB9-1962'),
            'us-5c': ('NPS-CLI-LRT', 'NPS-CLR-LRT', 'NPS-DCP-LRT', 'NPS-BRT-ECOLOGY', 'NPSGOV-LRT-REHAB', 'NPS-VISTA-CUTTING'),
            'us-12c': ('NPSGOV-CULPS-HILL-REHAB', 'NPS-SPANGLERS-SPRING', 'NPS-HARMON-FARM', 'NPS-ROCK-CREEK'),
            'us-3c': ('NPS-CLI-ERR', 'NPSGOV-DEVILS-DEN-REHAB', 'NPS-SLAUGHTER-PEN', 'NPSGOV-WARFIELD-HOUSE', 'NPSGOV-WISLER-HOUSE', 'NPS-SLYDER-GUIDE', 'NPS-HSR-SLYDER'),
            'us-2c': ('NPS-CLI-PCB', 'NPS-COMMON-PRIDE-1', 'NPS-COMMON-PRIDE-2', 'NPS-COMMON-PRIDE-3', 'NPS-HSR-LEISTER-BARN', 'NPS-BRIEN-FARM', 'NPSGOV-US-LINE'),
            'us-cav': ('NPSGOV-EAST-CAVALRY',),
            'cs-3c': ('NPSGOV-CONFED-LINE',),
            'us-army': ('NPS-MCCLEAN-HOUSE-BARN', 'NPS-HSR-MCCLEAN-BARN')}
for g, ids in NPS_AREA.items():
    for sid in ids:
        SOURCE_GROUP[sid] = g
# newspapers of 1863 belong to the town group
NEWS = re.compile(r'^(ADAMS-SENTINEL|GBG-COMPILER)-1863-(0[6-8])')


def ctx_of(text, a, b, w=150):
    s = max(0, a - w)
    e = min(len(text), b + w)
    return ' '.join(text[s:e].split())


def date_hint(text, a):
    m = None
    for m in DATE_HINT.finditer(text[max(0, a - 400):a + 200]):
        pass
    return ('%s %s' % (m.group(1).title(), m.group(2))) if m else None


def main():
    cap = 40
    if '--cap' in sys.argv:
        cap = int(sys.argv[sys.argv.index('--cap') + 1])
    phases = set(sys.argv[sys.argv.index('--phases') + 1].split(',')) if '--phases' in sys.argv else {'or', 'statevol', 'texts'}
    asg = load_json(os.path.join(EVID, 'report_assignments.json'))['assignments']
    srcs = sources()
    buckets = collections.defaultdict(list)       # group -> rows
    counts = collections.defaultdict(lambda: collections.Counter())
    more = collections.Counter()
    per_rec = collections.Counter()
    # --- Official Records
    import or27_find as F
    for p in ((1, 2, 3) if 'or' in phases else ()):
        P = F.get_part(p)
        nt, nm = P.ntext, P.nmap
        for cls, rx in RX.items():
            for m in rx.finditer(nt):
                a, b = nm[m.start()], nm[m.end() - 1] + 1
                rec = P.record_at(a)
                if not rec:
                    continue
                ent = asg.get(rec['id'])
                if not ent or not ent.get('group'):
                    continue
                g = ent['group']
                counts[g]['%s:%s' % ('OR-27-%d' % p, cls)] += 1
                key = (rec['id'], cls)
                per_rec[key] += 1
                if per_rec[key] > cap:
                    more[key] += 1
                    continue
                pg = P.pm.page_at(a)
                buckets[g].append({'source_id': 'OR-27-%d' % p, 'part': p, 'report_id': rec['id'], 'class': cls, 'page': pg.get('page'), 'page_conf': pg.get('conf'),
                                   'offset_start': int(a), 'offset_end': int(b), 'match': m.group(0)[:60], 'date_hint': date_hint(nt, m.start()), 'ctx': ctx_of(nt, m.start(), m.end())})
    # --- state volumes with a section index: owner = group of the section's regiment
    svx = load_json(STATEVOL_INDEX_PATH)
    dk = AG.digit_keys()
    sec_group = {}
    for s in svx['sections']:
        vol = [v for v in svx['volumes'] if v['key'] == s['volume']][0]
        if vol['source_id'] not in srcs or vol['key'] in ('FOX', 'BL3', 'PA1B'):
            continue
        g = 'narratives-us'
        if s.get('number') and vol.get('state') and s.get('arm') == 'infantry':
            ids = [u for u in dk.get((s['number'], vol['state']), []) if u.startswith('us-')]
            if len(ids) == 1 and corps_of(ids[0]):
                g = corps_of(ids[0])
        elif s.get('arm') == 'cavalry':
            g = 'us-cav'
        sec_group[s['id']] = (g, vol['source_id'])
    by_vol = collections.defaultdict(list)
    for s in svx['sections']:
        if 'statevol' in phases and s['id'] in sec_group:
            by_vol[sec_group[s['id']][1]].append(s)
    done_src = set()
    for sid, secs in by_vol.items():
        st_path = os.path.join(ROOT, srcs[sid]['local_path'])
        raw = read_text(st_path)
        secs.sort(key=lambda s: s['start'])
        starts = [s['start'] for s in secs]
        for cls, rx in RX.items():
            for m in rx.finditer(raw):
                a, b = m.start(), m.end()
                i = bisect.bisect_right(starts, a) - 1
                if i < 0 or a >= secs[i]['end']:
                    continue
                sec = secs[i]
                g = sec_group[sec['id']][0]
                counts[g]['%s:%s' % (sid, cls)] += 1
                key = (sec['id'], cls)
                per_rec[key] += 1
                if per_rec[key] > cap:
                    more[key] += 1
                    continue
                buckets[g].append({'source_id': sid, 'part': None, 'report_id': sec['id'], 'class': cls, 'page': sec.get('printed_pages'), 'page_conf': 'section',
                                   'offset_start': a, 'offset_end': b, 'match': m.group(0)[:60], 'date_hint': date_hint(raw, a), 'ctx': ctx_of(raw, a, b)})
        done_src.add(sid)
    # --- the other texts: one owner group per text
    for sid, s in srcs.items():
        if 'texts' not in phases or sid in done_src or sid.startswith('OR-'):
            continue
        g = SOURCE_GROUP.get(sid)
        if g is None and NEWS.match(sid):
            g = 'town-burial'
        if g is None:
            continue
        raw = read_text(os.path.join(ROOT, s['local_path']))
        pdfpos = [m.start() for m in re.finditer(r'=== PAGE (\d+) ===', raw)] if s.get('page_model') == 'pdf_markers' else None
        pdfnum = [int(m.group(1)) for m in re.finditer(r'=== PAGE (\d+) ===', raw)] if pdfpos else None
        for cls, rx in RX.items():
            for m in rx.finditer(raw):
                a, b = m.start(), m.end()
                counts[g]['%s:%s' % (sid, cls)] += 1
                key = (sid, cls)
                per_rec[key] += 1
                if per_rec[key] > cap * 4:
                    more[key] += 1
                    continue
                pdf = None
                if pdfpos:
                    j = bisect.bisect_right(pdfpos, a) - 1
                    pdf = pdfnum[j] if j >= 0 else None
                buckets[g].append({'source_id': sid, 'part': None, 'report_id': None, 'class': cls, 'page': pdf, 'page_conf': 'pdf_marker' if pdf else 'none',
                                   'offset_start': a, 'offset_end': b, 'match': m.group(0)[:60], 'date_hint': date_hint(raw, a), 'ctx': ctx_of(raw, a, b)})
    os.makedirs(LEADS, exist_ok=True)
    for old in os.listdir(LEADS):
        if old.endswith('.leads.jsonl'):
            os.remove(os.path.join(LEADS, old))
    summary = {'_doc': 'Lead scan (tools/bt/life/scan_leads.py). A lead is a keyword hit, not evidence. `hits` counts every hit; `written` the rows in <group>.leads.jsonl; '
                       '`more` are hits beyond the per-record cap (counted, not written).', 'built': datetime.date.today().isoformat(), 'cap_per_record_and_class': cap, 'phases_run': sorted(phases), 'complete': phases == {'or', 'statevol', 'texts'},
               'classes': CLASSES, 'groups': {}}
    for g in sorted(set(list(buckets) + list(counts))):
        rows = buckets.get(g, [])
        with open(os.path.join(LEADS, g + '.leads.jsonl'), 'w', encoding='utf-8', newline='\n') as f:
            for n, r in enumerate(rows, 1):
                r = dict(lead_id='%s-lead-%05d' % (g, n), **r)
                f.write(json.dumps(r, ensure_ascii=False) + '\n')
        byc = collections.Counter(r['class'] for r in rows)
        bys = collections.Counter(r['source_id'] for r in rows)
        total_hits = sum(counts[g].values())
        summary['groups'][g] = {'hits': total_hits, 'written': len(rows), 'by_class_written': dict(byc), 'by_source_written': dict(bys.most_common(40))}
    summary['more_total'] = sum(more.values())
    dump_json(os.path.join(LEADS, 'SUMMARY.json'), summary)
    for g, v in summary['groups'].items():
        print('%-18s hits %6d written %6d' % (g, v['hits'], v['written']))
    print('over-cap hits not written:', summary['more_total'])


if __name__ == '__main__':
    main()
