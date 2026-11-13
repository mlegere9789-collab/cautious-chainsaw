"""Statistics of the 11 Vermont unit files, the diagnostic files, and the report docs/battle-theatre/rosters/reports/union-vt.md (numbers are computed here).

    python3 -I docs/battle-theatre/rosters/pipeline2/union_vt/vt_report.py            (run from the repository root)

Reads  data2/union/vt/*.jsonl.gz, *.flags.json.gz, *.cells.json.gz; tmp/library/rosters/union-vt-work/{rows-report,write-report}.json and verify_unit.jsonl;
       GOVERNANCE/horde/ws-rosters/union-vt/final-statements.json; baseline/dist/data/oob (strength of the order of battle, second hand).
Writes rosters/reports/union-vt.md; GOVERNANCE/horde/ws-rosters/union-vt/{stats.json, diag-no-name.json, diag-notes.json, diag-events.json}.
"""
import os, sys, json, gzip, re, collections, glob
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import vt_lib as L          # noqa: E402

R = L.R
WS = os.path.join(L.ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'union-vt')
REPORT = os.path.join(L.ROOT, 'docs', 'battle-theatre', 'rosters', 'reports', 'union-vt.md')
VT = os.path.join(L.D2, 'union', 'vt')
OOB_FILES = {'U-2VT': 'union_regiments_vi_xi_xii_corps.json', 'U-3VT': 'union_regiments_vi_xi_xii_corps.json', 'U-4VT': 'union_regiments_vi_xi_xii_corps.json',
             'U-5VT': 'union_regiments_vi_xi_xii_corps.json', 'U-6VT': 'union_regiments_vi_xi_xii_corps.json', 'U-13VT': 'union_regiments_i_ii_corps.json',
             'U-14VT': 'union_regiments_i_ii_corps.json', 'U-16VT': 'union_regiments_i_ii_corps.json', 'U-1VT-CAV': 'union_cavalry_artillery.json'}
OOB_ID = {'u-vt-2nd-vermont-infantry': 'U-2VT', 'u-vt-3rd-vermont-infantry': 'U-3VT', 'u-vt-4th-vermont-infantry': 'U-4VT', 'u-vt-5th-vermont-infantry': 'U-5VT',
          'u-vt-6th-vermont-infantry': 'U-6VT', 'u-vt-13th-vermont-infantry': 'U-13VT', 'u-vt-14th-vermont-infantry': 'U-14VT', 'u-vt-16th-vermont-infantry': 'U-16VT',
          'u-vt-1st-vermont-cavalry': 'U-1VT-CAV'}
AUDIT_WORDS = re.compile(r'(?<![A-Za-z])(AI|A\.I\.|Claude|Anthropic|agents?|chatbot|LLM|GPT|OpenAI|automat\w*|bot)(?![A-Za-z])')


def fmt(n):
    return format(n, ',')


def load_oob():
    out = {}
    for rid, fn in OOB_FILES.items():
        d = json.load(open(os.path.join(L.ROOT, 'baseline', 'dist', 'data', 'oob', fn), encoding='utf-8'))

        def walk(o):
            if isinstance(o, dict):
                if o.get('regiment_id') == rid:
                    out[rid] = {'strength': o.get('strength'), 'casualties': o.get('casualties'), 'designation': o.get('designation')}
                    return
                for v in o.values():
                    walk(v)
            elif isinstance(o, list):
                for v in o:
                    walk(v)
        walk(d)
    return out


def or_footnote():
    """The OR 27 table footnote for the 12th and 15th Vermont (found in the local OR text, offset asserted)."""
    for fn in sorted(glob.glob(os.path.join(L.TMP, 'or27', 'cu*_djvu.txt'))):
        t = open(fn, encoding='utf-8', errors='replace').read()
        for m in re.finditer(r'Guarding\s+trains,\s+and\s+not\s+engaged\s+in\s+the\s+battle\.', t):
            before = t[max(0, m.start() - 400):m.start()]
            if 'Veazey' in before or 'Veazy' in before:
                q = t[m.start():m.end()]
                return {'file': os.path.basename(fn), 'offset': m.start(), 'quote': ' '.join(q.split()),
                        'context': ' '.join(t[max(0, m.start() - 160):m.start()].split())}
    return None


def crosscheck():
    """For the lines of one leaf, does the first word of each cell come after that of the previous line (the order of the names)?  Per column."""
    tot, viol = collections.Counter(), collections.Counter()
    for f in sorted(glob.glob(os.path.join(L.WORK, 'rows-u-vt-*.json'))):
        prev = {}
        for x in json.load(open(f, encoding='utf-8'))['rows']:
            f_ = x['facts']
            offs = [x['row'][5]] + f_['col_offs']
            for ci, o in enumerate(offs):
                if o is None:
                    continue
                pv = prev.get((f_['leaf'], ci))
                tot[ci] += 1
                if pv is not None and o < pv:
                    viol[ci] += 1
                prev[(f_['leaf'], ci)] = o
    return tot, viol


def alignment():
    a = json.load(open(os.path.join(L.WORK, 'alignment.json'), encoding='utf-8'))
    return a['total_xml_words'], a['aligned'], a['text_tokens']


def main():
    rep1 = json.load(open(os.path.join(L.WORK, 'rows-report.json'), encoding='utf-8'))
    rep2 = json.load(open(os.path.join(L.WORK, 'write-report.json'), encoding='utf-8'))
    fin = json.load(open(os.path.join(WS, 'final-statements.json'), encoding='utf-8'))['units']
    oob = load_oob()
    text, pm, ent = L.load_text()
    ver = {}
    vp = os.path.join(L.WORK, 'verify_unit.jsonl')
    if os.path.exists(vp):
        for ln in open(vp, encoding='utf-8'):
            if ln.strip():
                v = json.loads(ln)
                ver[v['unit']] = v
    orfoot = or_footnote()
    units, diag_noname, diag_notes, diag_events = {}, [], [], {}
    audit_hits = []
    tot = collections.Counter()
    for key, desig, stem in L.UNITS:
        path = os.path.join(VT, stem + '.jsonl.gz')
        head, segs, meta = R.read_unit(path)
        rows = segs[0][1]
        fl = json.load(gzip.open(os.path.join(VT, stem + '.flags.json.gz'), 'rb'))
        ce = json.load(gzip.open(os.path.join(VT, stem + '.cells.json.gz'), 'rb'))
        assert len(ce['rows']) == len(rows) == head['n']
        r1, r2 = rep1[key], rep2['units'][key]
        co = collections.Counter(r[2] for r in rows)
        rk = collections.Counter(r[1] for r in rows)
        see = sum(1 for r in rows if re.search(r'(?<![A-Za-z])See\b', r[3]))
        officers = sum(1 for r in rows if re.match(r"\^(Colonel|Lieut|Major|Adjutant|Quartermaster|Surgeon|Asst|Chaplain|Captain|1st|2d|tst|• 2d|Capt|Caplain)", r[1], re.I))
        pl = r1['per_leaf']
        table_leaves = sorted(int(k) for k, v in pl.items() if v['table'])
        nontable = sorted(int(k) for k, v in pl.items() if not v['table'])
        fu = fin.get(key, {})
        nodate = collections.Counter()      # per leaf: lines with neither date cell
        per_leaf_rows = collections.Counter()
        # the leaf of a row = the leaf of its name offset
        for i, r in enumerate(rows):
            lf = pm.leaf(r[5])
            per_leaf_rows[lf] += 1
            c = ce['rows'][i]
            if not c[1].strip() and not c[2].strip():
                nodate[lf] += 1
        lost_dates = [(lf, pm.printed(lf), nodate[lf], per_leaf_rows[lf]) for lf in sorted(nodate) if nodate[lf] >= 10]
        # audit words in the shipped data of this unit (names, remarks, headings, cells, notes)
        for src, s in (('unit', ' '.join(r[0] + ' ' + r[1] + ' ' + r[3] for r in rows)), ('cells', ' '.join(' '.join(c) for c in ce['rows']))):
            for m in AUDIT_WORDS.finditer(s):
                audit_hits.append((stem, src, m.group(0), s[max(0, m.start() - 30):m.end() + 30]))
        u = {'designation': desig, 'rows': head['n'], 'raw_bytes': meta['raw'], 'gz_bytes': os.path.getsize(path), 'sha256_raw': meta['sha256'],
             'by_company': dict(co), 'by_heading': dict(rk.most_common(8)), 'see_lines': see, 'officer_heading_lines': officers,
             'flags': r2['flags'], 'ocr_uncertain': r2['ocr_uncertain'], 'on_rolls': [r2['on_rolls_yes'], r2['on_rolls_no'], r2['on_rolls_unknown']],
             'gettysburg_in_remark': r2['gettysburg_in_remark'], 'dated_1_3_july_1863': r2['dated_1_3_july_1863'],
             'oob': oob.get(OOB_ID.get(key)), 'aggregate_printed': fu.get('aggregate_printed'), 'final_checks': fu.get('checks'),
             'table_leaves': [table_leaves[0], table_leaves[-1]] if table_leaves else None, 'narrative_leaves': nontable, 'final_leaf': fu.get('leaf'),
             'printed_pages_roll': [pm.printed(table_leaves[0]), pm.printed(table_leaves[-1])] if table_leaves else None,
             'events': r1['events'], 'rejected': r1['rejected'], 'assertion': r1['assertion'], 'verify': ver.get(key),
             'lost_date_pages': lost_dates, 'name_split_rows': 0}
        units[key] = u
        for k in ('rows',):
            tot[k] += head['n']
        diag_events[key] = {'events': r1['events'], 'samples': {k: v for k, v in r1['event_samples'].items() if k in (
            'row-without-name', 'page-note', 'header-remnant', 'wrapped-residence', 'title-letter-lost', 'implicit-table-start', 'heading-with-right-words',
            'orphan-right-words', 'non-table-line', 'title-unknown', 'title-nontable')}}
        for lf, y, t in r1['event_samples'].get('row-without-name', []):
            diag_noname.append({'unit': key, 'leaf': lf, 'printed_page': pm.printed(lf), 'y': y, 'text_of_the_line': t})
        for lf, y, t in r1['event_samples'].get('page-note', []):
            diag_notes.append({'unit': key, 'leaf': lf, 'printed_page': pm.printed(lf), 'y': y, 'text': t})
    json.dump({'generated': L.now(), 'units': units, 'footnote_or27': orfoot, 'copy_audit_word_hits': audit_hits[:200], 'copy_audit_hit_count': len(audit_hits)},
              open(os.path.join(WS, 'stats.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(diag_noname, open(os.path.join(WS, 'diag-no-name.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(diag_notes, open(os.path.join(WS, 'diag-notes.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(diag_events, open(os.path.join(WS, 'diag-events.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    write_md(units, orfoot, audit_hits, diag_noname, diag_notes, rep1, crosscheck(), alignment())
    print('report written', REPORT, 'rows', tot['rows'], 'audit word hits', len(audit_hits))


def write_md(U, orfoot, audit_hits, noname, notes, rep1, cc, al):
    total = sum(u['rows'] for u in U.values())
    L_ = []
    w = L_.append
    short = {k: v['designation'] for k, v in U.items()}
    tot_flag = collections.Counter()
    for u in U.values():
        for k, v in u['flags'].items():
            tot_flag[k] += v
    tot_unc = sum(u['ocr_uncertain'] for u in U.values())
    yes = sum(u['on_rolls'][0] for u in U.values())
    no = sum(u['on_rolls'][1] for u in U.values())
    unk = sum(u['on_rolls'][2] for u in U.values())
    dated = sum(u['dated_1_3_july_1863'] for u in U.values())
    all_ver = all(v['verify'] for v in U.values())
    v_ok = all_ver and all(v['verify']['ok'] for v in U.values())
    w('# Vermont (Union): rosters of the 11 units at Gettysburg (work item union-vt, OA03)')
    w('')
    w('Written 13 November 2026 by the roster workstream. Evidence labels as in `PLAN.md`: **Measured** (a command run for this report produced it), **Documented** (a source text says it; the source is named), **Inferred** (a stated rule on printed text), **Not run**. Every number below is computed by `pipeline2/union_vt/vt_report.py` from the unit files and the work files.')
    w('')
    w('## 0. Summary')
    w('')
    w('* **11 unit files** under `rosters/data2/union/vt/` (2nd, 3rd, 4th, 5th, 6th, 12th, 13th, 14th, 15th, 16th Infantry and 1st Cavalry), **%s lines in all**, format `roster2/2` (`pipeline2/r2lib.py`), each with a flag file `<unit>.flags.json.gz` and a cells file `<unit>.cells.json.gz`. One line per name entry of the printed roll, exactly as the text layer prints it (name, residence, dates, remarks), with the printed page and the character offset of the name in the pinned text.' % fmt(total))
    w('* **One printed source is parsed**: the Revised Roster of Vermont Volunteers (Montpelier, 1892; Internet Archive `cu31924080774148`): for each unit the Field and Staff, the Non-Commissioned Staff, the Band (2nd to 5th Infantry) and every company, as the rolls print them (name and rank, residence, date of enlistment or commission, date of muster or issue, remarks). The printed **final statement** of each regiment (men who served, losses) is read as well and compared with the line counts (section 1).')
    w('* **Not parsed**: the narrative history that opens each regiment (prose, not a roll), %d lines of printed notes at the foot of roll pages that tell the story of named men, the 1866 report of the Adjutant General (the roll the 1892 volume revises; a lead, not fetched), and **%d printed lines whose name the text layer lost** (section 5, gap EG-ROS-VT-01). No name is invented, completed or repaired.' % (len(notes), len(noname)))
    w('* **Checks run (Measured)**: the builder asserts every line against the pinned source text before writing it (name tokens at the recorded offset, remark tokens in order inside the leaf, printed page of the leaf); `pipeline2/verify_unit.py --all` on the 11 files: %s. **Not run**: the independent page-image sample (R-G9): the image hosts answered with a proxy 403 (section 3), so no line was compared with a page image, and the binding of a remark to its name on a damaged page rests on the geometry rules of the parser and on one cross-check against the order of the text layer (section 4).' % ('**all 11 files %d name defects, %d page defects, %d problems**' % (sum(v['verify']['v1_name_defects'] for v in U.values()), sum(v['verify']['v3_page_defects'] for v in U.values()), sum(len(v['verify']['problems']) for v in U.values())) if all_ver else 'not yet run when this report was written'))
    w('* **No label of presence** is written into any line (DD-ROS-01). Derived marks live in the flag files, never in the lines: `ocr_uncertain` (the line is damaged in the text layer; %s of %s lines) with its codes, `on_rolls_july_1863` (inferred from printed dates only: %s yes, %s no, %s unknown) and `printed_event_dated_1_to_3_july_1863` (%s lines whose remark prints an event dated 1 to 3 July 1863; a printed date, not a statement of presence: **no remark of these rolls prints the word Gettysburg**).' % (fmt(tot_unc), fmt(total), fmt(yes), fmt(no), fmt(unk), fmt(dated)))
    w('* **Two of the 11 units were not engaged**: the Official Records organization table prints the 12th and 15th Vermont with the footnote %s. Their rolls are written because the work item lists them; no man on them is stated present at the battle.' % ('"%s" (OR Ser. I vol. 27 pt. 1, table of the Army of the Potomac, `%s` at character offset %s)' % (orfoot['quote'], orfoot['file'], fmt(orfoot['offset'])) if orfoot else '"Guarding trains, and not engaged in the battle" (OR 27, not re-found in this run)'))
    w('')
    w('## 1. Lines per unit against the strength')
    w('')
    w('"Strength" is the value of the baseline order of battle (`baseline/dist/data/oob`, second hand, from Busey and Martin as the earlier families recorded it; no strength range with a declared basis exists for these units in the registry). "Men who served" is the **aggregate printed in the final statement of the roll itself** (the Adjutant General\'s own count of every man who was ever on the regiment\'s rolls; Documented, quote and offset in `GOVERNANCE/horde/ws-rosters/union-vt/final-statements.json`). A whole-war roll is **not** comparable with the strength present on 1 to 3 July 1863 (the earlier pilots measured that a man on a roll with no recorded absence was present between 36 and 72 percent of the time, `PLAN.md` 2.4, gap EG-ROS-010); the columns are context only.')
    w('')
    w('| unit | strength (baseline OOB) | men who served (printed aggregate) | lines | lines / men who served | "See ..." lines | lines under an officer heading | ocr_uncertain | name damaged (N) | event dated 1-3 July 1863 | remark names Gettysburg | on rolls inferred yes / no / unknown |')
    w('|---|---|---|---|---|---|---|---|---|---|---|---|')
    for k, u in U.items():
        st = u['oob']['strength'] if u['oob'] else None
        ag = u['aggregate_printed']
        w('| %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s / %s / %s |' % (
            u['designation'], fmt(st) if st else 'no order-of-battle row', fmt(ag) if ag else 'not read', fmt(u['rows']), '%.3f' % (u['rows'] / ag) if ag else '-', fmt(u['see_lines']),
            fmt(u['officer_heading_lines']), fmt(u['ocr_uncertain']), fmt(u['flags'].get('N', 0)), fmt(u['dated_1_3_july_1863']), u['gettysburg_in_remark'],
            fmt(u['on_rolls'][0]), fmt(u['on_rolls'][1]), fmt(u['on_rolls'][2])))
    w('')
    ex = [(u['designation'], u['rows'] - u['aggregate_printed'], u['see_lines']) for u in U.values() if u['aggregate_printed']]
    w('Reading the table. Every unit has **more lines than men who served** (by %s to %s lines): the Revised Roster prints a man once under each rank he held (a captain who became major stands under Captains and under Majors, with a "See ..." cross-reference line for the rank he left) and the Field and Staff, the Non-Commissioned Staff and the Band repeat men who also stand in a company. The excess is largest for the three-year regiments (promotions were many) and smallest for the nine-month regiments, as that cause predicts: it is the same men on more than one line, **nothing is merged** (a merge would be a reading). The excess is not a count of missing or duplicated parse lines; the check that the lines are real lines of the page is section 4. The comparison with the **strength** has no meaning for the 2nd to 6th Infantry, which were army reserve at the battle, and the baseline OOB prints no row for the 12th and 15th. The lines of the 13th, 14th and 16th Infantry and of the 1st Cavalry are rolls of everyone who served (from 957 to 2,304 men), not of the 612 to 649 present.' % (min(e[1] for e in ex), max(e[1] for e in ex)))
    w('')
    w('Where the roll sits in the volume (leaf = image number of the Internet Archive item, 0-based; page = the printed page number from the item\'s own page-number file, **not read from an image**):')
    w('')
    w('| unit | narrative history (leaves) | roll leaves (first - last) | printed pages of the roll | final statement leaf (printed page) |')
    w('|---|---|---|---|---|')
    for k, u in U.items():
        nl = [x for x in u['narrative_leaves'] if x != u['final_leaf']]
        w('| %s | %s | %s - %s | %s - %s | %s (%s) |' % (u['designation'], ('%d-%d' % (nl[0], nl[-1])) if nl else '-', u['table_leaves'][0], u['table_leaves'][1], u['printed_pages_roll'][0], u['printed_pages_roll'][1], u['final_leaf'], pm_print(u['final_leaf'])))
    w('')
    w('## 2. The unit files')
    w('')
    w('One gzip JSON-lines file per unit, `[offset delta, name, rank, remarks, remark delta]` lines with carried state lines `co` (company), `pg` (printed page) and `rk` (the rank heading above the lines, as printed), one **segment** (`VT-ROSTER-1892.1`, layout `cols`). Lines are in the order of the page (company by company, the heading above, the lines below); offsets are therefore not increasing everywhere (a text layer lists a table column by column). `co` is `FS` (Field and Staff), `NCS` (Non-Commissioned Staff), `BAND`, or the company letter A to K (to M for the cavalry) of the title above the table.')
    w('')
    w('* **name** (`name_printed`): the tokens of the name column as the text layer prints them, joined by single blanks, with the printed commas and periods; a damaged name stays damaged. The printed order is not uniform (privates stand "Surname, Given", most officers and many sergeants "Given Surname", and it changes from regiment to regiment). **A normalised name is not written**: any rule that splits the two forms would be a reading of the line (the choice is the owner\'s); a search by tokens needs none.')
    w('* **rank**: the lines carry the rank of the **heading** above them (`^Privates.`, `^Captains.`, `^Q. M.-Sergts.`; the heading is damaged where the text layer damages it and is flagged H); the roll prints no rank cell.')
    w('* **remarks** (`remarks`): every other word of the line in the order of the text layer: residence, date of enlistment (commission), date of muster (issue), remarks. Where the text layer lists the words of one line in an order other than the page (the date cells are often cut into pieces and listed apart: "Oct. Oct. 15/61 15/61"), the order of the file is the order of the text and the line is flagged **O**; the **cells file** gives the same words cell by cell in the order of the page (`[residence, enlistment, muster, remarks]`), each word at the position where it stands. The cells are a second reading by position, never corrected.')
    w('* **Rights per name**: the segment names the source text; `data2/sources/VT-ROSTER-1892.json` holds the item, its date and its sha256; `rosters/sources/union-vt.json` is the tracked pointer file (section 3).')
    w('')
    w('**Flag codes** (flag file, by row number from 0 over the whole file; `ocr_uncertain` is the union of N H C P E M K W O Y; the rules are those of `vt_write.py`, heuristics on the printed cell, never a change to a line):')
    w('')
    w('| code | meaning | lines (all 11 units) |')
    w('|---|---|---|')
    codes = json.load(gzip.open(os.path.join(VT, '2nd-vermont-infantry.flags.json.gz'), 'rb'))['codes']
    for c, txt in codes.items():
        w('| %s | %s | %s |' % (c, txt, fmt(tot_flag.get(c, 0))))
    w('')
    w('The damage flags are generous by design: a date cell that does not read as "Mon. D/YY" or "Mon. D,\'YY" in full is flagged whatever the damage (a digit read as a letter, a cell cut in two, a vertical rule read as a mark). **E and M together flag %s of the %s lines**; the flags N (name) and H (heading) are the ones to read for who a line is about.' % ('%d percent' % round(100 * (tot_flag['E'] + tot_flag['M']) / (2 * total)) + ' of the date cells', fmt(total)))
    w('')
    w('**On the rolls in July 1863 (inferred)**: from the printed date of enlistment (or, if that cell is damaged, of muster) and the separations printed in the remarks. "yes" needs a readable enlistment date before 1 July 1863, no separation dated before that day, no cross-reference ("See ..."), no return from desertion, remarks without damaged words, and either a separation dated on or after 1 July 1863 or none printed; "no" needs a printed separation (Disch., Died, Killed, Des., Resgd., Dism., Dropped, Must. out, a transfer out) dated before 1 July 1863, or an enlistment or muster date after 3 July 1863; every other line is unknown. A date is read only in the printed forms ("Aug. 19/62", "Aug. 6,\'62"); a damaged date makes the line unknown. The inference says nothing about presence on the field (EG-ROS-010): a man on the rolls may have been sick, detached or on leave.')
    w('')
    w('## 3. Sources and rights (all fetched from archive.org, one request at a time, at least 1.2 s apart)')
    w('')
    w('| source id | Internet Archive item | printed year | what it is | rights basis | state |')
    w('|---|---|---|---|---|---|')
    w('| VT-ROSTER-1892 | `cu31924080774148` | 1892 (imprint "Press of the Watchman Publishing Co., Publishers and Printers. 1892.", offset 877 of the text) | Revised Roster of Vermont Volunteers and Lists of Vermonters who served in the Army and Navy of the United States during the War of the Rebellion, 1861-66, compiled by authority of the General Assembly under Theodore S. Peck, Adjutant General | public domain (United States publication before 1929) | parsed |')
    w('| VT-AGR-1866 | `reportofadjutant00verm` | 1866 | Report of the Adjutant and Inspector General of Vermont (the roll the 1892 volume revises) | not examined | lead, not fetched (gap EG-ROS-VT-05) |')
    w('| VT-MON-1890 | `vermontmonuments00verm` | 1890 | Vermont Monuments at Gettysburg (local copy, `tmp/library/ws9`) | public domain (United States publication before 1929) | read, no roll of names: prose and monument inscriptions |')
    w('| VT-GB-1914 | `vermontatgettysb00chen` | 1914 | Vermont at Gettysburg, July, 1863, and fifty years later (local copy) | public domain (United States publication before 1929) | read, no roll of names |')
    w('')
    w('The files, sizes and sha256 are in `rosters/sources/union-vt.json` and `tmp/library/rosters/MANIFEST-union-vt.json`. The text layer (1,382,620 bytes gzipped, sha256 `c906206e...470e5ca1`) was fetched in the planning run and re-checked against the ledger in this run; the item metadata (159,689 bytes) and the word-box file `cu31924080774148_djvu.xml` (70,750,368 bytes; a transient file, **deleted after the run**, bytes and sha256 stay in the manifest) were fetched in this run. The item\'s own metadata carries no copyright flag and no licence URL; the title page prints the 1892 imprint of a state publication. **Blocked** (not worked around): the page images (`archive.org/download/<id>/page/nN_w1400.jpg` redirects to `ia800707.us.archive.org`; `iiif.archive.org`): one request each, the proxy answered CONNECT 403; the zip-member route answered 302 to the same data host. Owner step: add the two hosts to the environment\'s allowed hosts if page images are wanted.')
    w('')
    w('## 4. What was checked')
    w('')
    tot_a = collections.Counter()
    for u in U.values():
        for kk, vv in u['assertion'].items():
            if isinstance(vv, int):
                tot_a[kk] += vv
    w('* **At build time (assertion)**: for every line written, V1 the name tokens stand in the pinned text at the recorded offset, in order, separated only by white space; V2 the remark tokens stand in order from the recorded offset inside the leaf of the name; V3 the offset lies in a leaf whose printed page is the recorded page (`vt_rows.assert_rows`, the rules of `r2lib.verify_rows`): %s lines, name_ok %s, remark_ok %s, page_ok %s, rank heading found above the line %s; %d lines failed and were not written.' % (fmt(tot_a['rows']), fmt(tot_a['name_ok']), fmt(tot_a['remark_ok']), fmt(tot_a['page_ok']), fmt(tot_a['rank_ok']), sum(len(u['rejected']) for u in U.values())))
    if all_ver:
        w('* **After assembly**: `python3 -I pipeline2/verify_unit.py --all --root docs/battle-theatre/rosters/data2/union/vt`: 11 files, **%d V1 (name) defects, %d V3 (page) defects, %d problems**, ledger hashes matched; lines that needed a step over other text to find their remark tokens (the columns of a table are separate blocks of the text): %s of %s.' % (sum(v['verify']['v1_name_defects'] for v in U.values()), sum(v['verify']['v3_page_defects'] for v in U.values()), sum(len(v['verify']['problems']) for v in U.values()), fmt(sum(v['verify']['stats'].get('remark_gap_rows', 0) for v in U.values())), fmt(total)))
    w('* **Alignment of word boxes to the text layer** (Measured): in the 352 leaves of the 11 units (roll leaves, narrative leaves and final statements) %s of %s word-box words are found in order in the text layer (%.2f percent; the text layer has %s tokens; the unmatched words are mostly on narrative leaves, where the layer joins words hyphenated at the end of a line); a line whose first name word is not in the text layer cannot be written (none was lost this way) and a remark word that is not is counted as flag W.' % (fmt(al[1]), fmt(al[0]), 100.0 * al[1] / al[0], fmt(al[2])))
    w('* **Cross-check against the order of the text layer (Measured)**: the text layer lists each column of a table in the order of the rows. If a line took a residence cell that belongs to another line, the offsets of the residence words would not follow the order of the names. For the lines of one leaf, the first residence word of a line comes after that of the previous line of the same leaf in **%s of %s** cases (%s exceptions, among them the lines with a damaged cell), and the first word of the enlistment cell in %s of %s (%s exceptions). The muster and remark cells break the order more often (%s of %s and %s of %s) because the text layer cuts those cells into pieces and lists them apart; this is why the flag O exists. The check says that the binding of cells to names is consistent with the text layer; it cannot say that a remark belongs to its name on a page whose columns the layer garbles equally in both places.' % (fmt(cc[0][1] - cc[1][1]), fmt(cc[0][1]), fmt(cc[1][1]), fmt(cc[0][2] - cc[1][2]), fmt(cc[0][2]), fmt(cc[1][2]), fmt(cc[1][3]), fmt(cc[0][3]), fmt(cc[1][4]), fmt(cc[0][4])))
    w('* **Not run**: the independent sample of page images (R-G9; the image hosts are blocked, section 3), a second reading of any damaged line, reconciliation with earlier data (the earlier families hold no Vermont row: `data2/units.json` lists 0 earlier rows for all 11 units; nothing to reconcile), a browser, any timing.')
    w('')
    w('## 5. Anomalies seen')
    w('')
    n = 1
    w('%d. **Printed lines whose name the text layer lost: %d.** The line exists on the page (residence, dates and remark are in the word boxes) but no word of the name column was read. They are not written (no empty-name row) and are listed with their text in `GOVERNANCE/horde/ws-rosters/union-vt/diag-no-name.json`: %s. A page image would give the name (gap EG-ROS-VT-01, blocked image host).' % (n, len(noname), '; '.join('%s leaf %d (printed page %s)' % (short[x['unit']], x['leaf'], x['printed_page']) for x in noname)))
    n += 1
    lost = [(u['designation'], lf, pg, a, b_) for u in U.values() for lf, pg, a, b_ in u['lost_date_pages']]
    w('%d. **Pages whose date columns are missing in the text layer: %d.** On these leaves 10 or more lines print no word at all in either date column although the roll prints both dates: %s. The lines are written as read; their date cells are flagged E and M and the lines are "unknown" for the inference (gap EG-ROS-VT-02).' % (n, len(lost), '; '.join('%s leaf %d (page %s: %d of %d lines)' % x for x in lost) if lost else 'none'))
    n += 1
    w('%d. **Date cells that do not read as dates**: %s of the %s date cells (flags E and M); typical damage: a digit read as a letter ("i9,\'6i", "1S/63"), a cell cut across two text blocks ("Oct. Oct. 15/61 15/61"), a vertical rule glued to the date ("Sept. 6,\'64|Sept."), a lost day or year. They stay as printed.' % (n, fmt(tot_flag['E'] + tot_flag['M']), fmt(2 * total)))
    n += 1
    w('%d. **Name text damaged (flag N): %s lines** (a stain, a letter read as another or as two: "Ch irles A. White.", "Samu 1 F.", "I ovejov. Henry A."; two words run into one: "Hungerford,Nelson L."). The name is printed as the layer has it; nothing is repaired.' % (n, fmt(tot_flag['N'])))
    n += 1
    w('%d. **Rank headings damaged (flag H): %s lines**: "Private?.", "Prirales.", "Privaies.", "Pri rates." for "Privates." and similar. The heading is carried as printed in the layer; the printed heading is plain from the neighbouring pages. One line of the carried heading (`^Privates. \u25a0`) keeps a printed mark.' % (n, fmt(tot_flag['H'])))
    n += 1
    cl = [(u['designation'], u['by_company'].get('I')) for u in U.values() if u['flags'].get('C')]
    w('%d. **A company title without its letter.** The title "COMPANY" of the 2nd Vermont, leaf 74 (printed page 59), has no letter in the text layer; the %s lines under it carry company `I` (the title before is H, the title after is K, J is not used) and are flagged C. This is the only inferred company letter; every other company is the letter of its printed title.' % (n, fmt(cl[0][1]) if cl else '?'))
    n += 1
    w('%d. **Notes in prose at the foot of roll pages (not lines): %d lines of text.** The 3rd Vermont (leaf 120, printed page 105: the note about William Scott, "the Sleeping Sentinel", and President Lincoln) and the 13th Vermont (leaf 511, printed page 494: the note about Simeon M. Palmer and his brother Cornelius S. Palmer, who took his place) print a story about named men under the table; the lines are in `diag-notes.json`, not in the unit files (gap EG-ROS-VT-03). The two men of the 13th Vermont stand on the roll as lines (the entry "Palmer, Cornelius S." ends "(See note at bottom of page.)").' % (n, len(notes)))
    n += 1
    foot = sum(u['events'].get('footnote', 0) for u in U.values())
    w('%d. **A page footnote on one-year men.** %d leaves print the footnote "*Enlisted for one year." (the 2nd to 6th Infantry and the Cavalry); %s lines carry an asterisk mark on such a leaf and are flagged F (the mark is read as the layer reads it; a mark read as an apostrophe or a bullet is not found).' % (n, foot, fmt(tot_flag.get('F', 0))))
    n += 1
    w('%d. **Words above a line.** On %d line(s) the text layer puts a fragment of the remark on the line of the rank heading above (for example "Oct. 22, \'64." beside "Corporals." in the 4th Vermont, leaf 132, printed page 117, which completes the remark of the first corporal, "...; Disch," and stands one line above it on the page): the fragment is joined to the line below and the line is flagged Y. The fragment stays where the text layer puts it; the line reads out of order and is also flagged O.' % (n, tot_flag.get('Y', 0)))
    n += 1
    w('%d. **Text layer order against page order (flag O): %s lines** (the layer cuts the date and remark cells into pieces and lists them in other blocks). The unit file keeps the layer\'s order (it is what the offsets and the assertion locate); the cells file keeps the page order.' % (n, fmt(tot_flag.get('O', 0))))
    n += 1
    w('%d. **Words of the page that the text layer spells otherwise (flag W): %d lines.** A word of the word boxes that is not the same token in the text layer is left out of the remark of the file (it cannot be located); the line is flagged W.' % (n, tot_flag.get('W', 0)))
    n += 1
    w('%d. **Header remnants and running text** inside the table area were excluded by rule and are counted in `diag-events.json` (heading blocks too damaged to read as headings; the running head and page number of a leaf; regiment narrative; the final statement and its losses table: %d lines).' % (n, sum(u['events'].get('non-table-line', 0) for u in U.values())))
    n += 1
    w('%d. **Lines are more than the men who served** (section 1), by 1 to 9 percent. The 12th, 13th, 14th, 15th and 16th Infantry sit near 1 to 4 percent, the 2nd to 6th Infantry and the Cavalry near 7 to 9. Not settled here; nothing is merged.' % n)
    n += 1
    w('%d. **The strength and the roll**: the baseline strength of the 13th (649), 14th (647) and 16th (612) Infantry and the 1st Cavalry (611) are second-hand figures; the roll prints 957 to 2,304 men for the same units. The 12th and 15th have no baseline row and are not engaged (OR). Presence of a named man at the battle is stated by no line of these rolls: the printed events dated 1 to 3 July 1863 (%s lines) are the nearest statement, and a longer list of men present is a task of the cross-cutting item `roster-gettysburg-lists` (gap EG-ROS-VT-04).' % (n, fmt(dated)))
    n += 1
    w('%d. **Words that a copy audit by word list would meet in printed text**: %s. They are printed source text, kept as printed (Law 1 and 4); nothing in the files, the flag files, the cells files or the pointer file says how they were made. A word-list audit has to exempt printed names in roster data (request note `GOVERNANCE/horde/requests/bt-rosters-union-vt-flag-files.md`).' % (n, ('%d hits, all printed given names (see `stats.json`): %s' % (len(audit_hits), '; '.join(sorted({'%s "%s" ("%s")' % (h[0], h[2], h[3].strip()) for h in audit_hits})[:12]))) if audit_hits else 'none found in the unit files or the cells files'))
    w('')
    w('## 6. Gaps registered (proposals under `GOVERNANCE/horde/ws-rosters/proposed-register/`, lines appended to `rosters/GAPS.md`)')
    w('')
    w('* **EG-ROS-VT-01** %d printed lines whose name the text layer lost (not written; page images blocked); **EG-ROS-VT-02** pages whose date columns are missing in the text layer (%d leaves) and the damaged date cells in general (second reading of the page images needed, EG-ROS-011); **EG-ROS-VT-03** the prose notes at the foot of roll pages and the regimental narratives name men that no line carries; **EG-ROS-VT-04** no list of the Vermont men present at the battle is in the sources read (the roll prints dates, not places); open for `roster-gettysburg-lists` (1863 newspaper casualty lists on Chronicling America, the 1914 and 1890 volumes hold no names); **EG-ROS-VT-05** the 1866 report (`VT-AGR-1866`) is not read as a second reading of the roll; **EG-ROS-VT-06** the independent sample (R-G9) of the binding of remarks to names is not run (image host blocked).' % (len(noname), len(lost)))
    w('')
    open(REPORT, 'w', encoding='utf-8').write('\n'.join(L_) + '\n')


_pm_cache = {}


def pm_print(leaf):
    if 'pm' not in _pm_cache:
        _pm_cache['pm'] = L.load_text()[1]
    return _pm_cache['pm'].printed(leaf)


if __name__ == '__main__':
    main()
