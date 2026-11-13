"""Build rosters/data2/units.json: the canonical unit list of both armies with cross-references.

    python3 -I docs/battle-theatre/rosters/pipeline2/build_units.py        (run from the repository root)

Inputs: units_data.py (the list, typed from the two OR organization tables), tmp/library/or27 (OR text, used
to re-find every unit), docs/battle-theatre/history/units.json (PDF B.3 registry), docs/battle-theatre/kit
(batteries, cavalry), baseline/dist/data/oob (ids used by rosters/data), rosters/data (existing roll files).
Nothing is fetched.  A cross-reference that cannot be made by rule is listed, never guessed.
"""
import os, re, sys, json, csv, glob, collections

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
sys.path.insert(0, HERE)
import units_data as UD

BT = os.path.join(ROOT, 'docs', 'battle-theatre')
OR1 = os.path.join(ROOT, 'tmp', 'library', 'or27', 'cu31924077699761_djvu.txt')
OR2 = os.path.join(ROOT, 'tmp', 'library', 'or27', 'cu31924077728255_djvu.txt')

ABBR = {'me': 'ME', 'nh': 'NH', 'vt': 'VT', 'ma': 'MA', 'ri': 'RI', 'ct': 'CT', 'ny': 'NY', 'nj': 'NJ', 'pa': 'PA',
        'de': 'DE', 'md': 'MD', 'wv': 'WV', 'oh': 'OH', 'in': 'IN', 'il': 'IL', 'mi': 'MI', 'wi': 'WI', 'mn': 'MN',
        'us': 'US', 'va': 'VA', 'nc': 'NC', 'sc': 'SC', 'ga': 'GA', 'al': 'AL', 'ms': 'MS', 'la': 'LA', 'fl': 'FL',
        'tn': 'TN', 'tx': 'TX', 'ar': 'AR', 'cs': 'CS'}
ARM = {'inf': 'Infantry', 'cav': 'Cavalry', 'art': 'Artillery', 'eng': 'Engineers', 'ss': 'Sharpshooters', 'staff': 'Staff'}


def ordinal(n):
    if 10 <= n % 100 <= 20:
        return '%dth' % n
    return '%d%s' % (n, {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th'))


def slugify(s):
    s = s.lower().replace('&', ' and ')
    s = re.sub(r"[’']", '', s)
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def or_ord(n):
    """Ordinal as the OR prints it (2d, 3d, 22d, 23d)."""
    if 10 <= n % 100 <= 20:
        return '%dth' % n
    return '%d%s' % (n, {1: 'st', 2: 'd', 3: 'd'}.get(n % 10, 'th'))


def load(path):
    return open(path, encoding='utf-8', newline='').read()


def or_table(text, start_pat, end_pat):
    a = re.search(start_pat, text)
    b = re.search(end_pat, text[a.end():])
    return a.start(), text[a.start():a.end() + b.start()]


def index_block(text, state):
    """The 'X Troops. Mentioned.' entries of the volume index (OCR spellings of Mentioned tolerated)."""
    out = []
    for m in re.finditer(re.escape(state).replace(r'\ ', r'\s+') + r'\s+Troops\.\s+M\S{3,12}', text):
        seg = text[m.start():m.start() + 5000]
        if re.search(r'(Artil|Caval|Infan|Engin|lufan|Batter|Regim|Compan|Regul)', seg[:160]):
            out.append(seg)
    return ' '.join(' '.join(out).split())


def refind(des, num, st, sname, arm, note, ntab, idx, pages):
    """Re-find one unit in the OR organization table (OCR text) or in the volume index.  Returns (check, how)."""
    label = 'United States' if st == 'us' else sname
    lab = re.escape(label).replace(r'\ ', r'\s+')
    n = num
    rest = ''
    if n is None:
        m = re.match(r'^(\d+)(?:st|nd|rd|th)\s+(.*)$', des)
        if m:
            n, rest = int(m.group(1)), m.group(2)
    pats = []
    if n is not None:
        o = re.escape(or_ord(n))
        if num is not None:
            pats.append(r'(?<![0-9])%s\s+%s' % (o, lab))
        else:
            words = [w for w in re.findall(r'[A-Za-z]+', rest)]
            if words:
                pats.append(r'(?<![0-9])%s\s+%s' % (o, r'[\s,(]+'.join(re.escape(w) for w in words[:3])))
            mb = re.match(r'^(.+?)\s+Battery(?:\s+\(([A-Z])\))?$', rest)
            if mb:                      # "6th Maine Battery (F)" is printed "Maine Light, 6th Battery (F)"
                pats.append(r'%s\s+Li\w+,\s+%s\s+Battery' % (re.escape(mb.group(1)).replace(r'\ ', r'\s+'), o))
            mi = re.match(r'^(.+?)\s+Independent\s+Battery$', rest)
            if mi:
                pats.append(r'%s\s+Li\w+,\s+%s\s+Battery' % (re.escape(mi.group(1)).replace(r'\ ', r'\s+'), o))
    mb = re.match(r'^Batter(?:y|ies)\s+([A-Z](?:\s+and\s+[A-Z])?),\s+(\d+)(?:st|nd|rd|th)\s+(.+?)\s+(?:Light|Heavy)?\s*Artillery', des)
    if mb:
        pats.append(r'%s\s+%s\s*(?:Li\w+|Heavy)?,\s+Batter\w+\s+%s' % (re.escape(or_ord(int(mb.group(2)))),
                    re.escape(mb.group(3)).replace(r'\ ', r'\s+'), mb.group(1).replace(' and ', r'\s+and\s+')))
    mb = re.match(r'^Battery\s+([A-Z]),\s+(.+?)\s+Light\s+Artillery$', des)
    if mb:
        pats.append(r'%s\s+Light,\s+Battery\s+%s' % (re.escape(mb.group(2)).replace(r'\ ', r'\s+'), mb.group(1)))
    if des == 'United States Engineer Battalion':
        pats.append(r'United\s+States\s+Battalion')
    for pat in pats:
        if re.search(pat, ntab):
            return 'exact', 'organization table line'
    stop = set('Battery Batteries Artillery Light Company Independent United States Infantry Cavalry Battalion First Virginia Georgia '
               'Maryland Louisiana Mississippi Alabama North South Carolina New York Jersey Hampshire Pennsylvania Massachusetts '
               'Connecticut Maine Ohio Michigan Rhode Island West Heavy Reserves Army Provisional Tennessee Minnesota Sharpshooters '
               'General Potomac Northern Legion Stuart Horse Second Third Corps Division brigade'.split())
    words = [w for w in re.findall(r"[A-Z][a-z]+", des) if w not in stop]
    cmd = [w for w in re.findall(r"[A-Z][a-z]+", note.split(';')[0]) if w not in stop]
    cand = [w for w in words + cmd if len(w) > 3]
    hit = [w for w in cand if w in ntab]
    if hit:
        return 'exact', 'organization table prints: ' + ', '.join(hit[:3])
    hit = [w for w in cand if len(w) >= 6 and w[:5] in ntab]
    if hit:
        return 'ocr-spelling', 'organization table prints the first letters of: ' + ', '.join(hit[:3])
    if n is not None and idx:
        for var, tag in ((re.escape(or_ord(n)), 'this ordinal'), (r'%d[A-Za-z(]{1,3}' % n, 'this number (OCR ordinal ending)')):
            for m in re.finditer(r'(?<![0-9])%s[,.]?\s((?:[0-9IlSstndrhda.,;\s-]){3,80})' % var, idx):
                nums = [int(v) for v in re.findall(r'(?<![0-9])(\d{3})(?![0-9])', m.group(1))]
                if any(pages[0] <= v <= pages[1] for v in nums):
                    return 'ocr-numeral', 'table prints another numeral or spelling; the volume index lists %s on a table page (arm not distinguished)' % tag
    if arm == 'staff':
        return 'n/a', 'collective entry'
    return 'not-found', ''


def main():
    t1, t2 = load(OR1), load(OR2)
    off1, tab1 = or_table(t1, r'Organization\s+of\s+the\s+Army\s+of\s+the\s+Potomac,\s+Maj', r'No\.\s*10\.\s')
    off2, tab2 = or_table(t2, r'Organization\s+of\s+the\s+Army\s+of\s+Northern\s+Virginia\s+at', r'No\.\s*425\.')
    n1, n2 = ' '.join(tab1.split()), ' '.join(tab2.split())

    units = []
    for army, table, ntab, full, pages in (('union', UD.U, n1, t1, (155, 168)), ('confederate', UD.C, n2, t2, (283, 291))):
        for st, blk in table.items():
            state = blk['state']
            sname = state.split(' (')[0]
            idx = index_block(full, 'Union' if st == 'us' else sname) if st not in ('cs',) else ''
            for ent in blk['units']:
                x, arm, note = ent
                if isinstance(x, int):
                    if st == 'us':
                        des = '%s United States %s' % (ordinal(x), ARM[arm])
                    else:
                        des = '%s %s %s' % (ordinal(x), sname, ARM[arm])
                    num = x
                else:
                    des, num = x, None
                chk, how = refind(des, num, st, sname, arm, note, ntab, idx, pages)
                slug = slugify(des)
                ukey = '%s-%s-%s' % (army[0], st, slug)
                if chk == 'not-found' and ukey in UD.OR_QUOTE:
                    qchk, quote, where = UD.OR_QUOTE[ukey]
                    hay = {'table': ntab, 'part': ' '.join(full.split())}[where]
                    assert quote in hay, 'OR_QUOTE for %s is not in the %s text' % (ukey, where)
                    chk, how = qchk, 'OCR text prints "%s" (%s)' % (quote, 'organization table' if where == 'table' else 'volume text')
                if ukey in UD.PDF_ONLY:                       # listed by PDF B.3 / the kit, not printed by the OR table
                    chk, how = 'pdf-only', UD.PDF_ONLY[ukey]
                units.append({'key': ukey, 'army': army, 'st': st, 'state': sname,
                              'designation': des, 'arm': ARM[arm].lower(), 'number': num,
                              'path': '%s/%s/%s.jsonl.gz' % (army, st, slug), 'or_note': note,
                              'or_check': chk, 'or_check_how': how,
                              'registry': {'history': [], 'oob': [], 'kit': []}, 'existing': []})
    by_key = {u['key']: u for u in units}
    assert len(by_key) == len(units), 'duplicate unit key'

    # ------------------------------------------------ crosswalk: history/units.json
    lookup = collections.defaultdict(list)
    for u in units:
        if u['number'] is not None:
            lookup[(u['army'], u['st'], u['arm'], u['number'])].append(u)
    hist = json.load(open(os.path.join(BT, 'history', 'units.json'), encoding='utf-8'))['units']
    code2st = {v: k for k, v in ABBR.items()}
    unmatched_hist = []
    for h in hist:
        if h['level'] not in ('regiment', 'battalion', 'company', 'battery'):
            continue
        army = 'union' if h['army'] == 'US' else 'confederate'
        name = h['name'].replace('’', "'")
        m = re.match(r'^(\d+)(?:st|nd|rd|th)\s+([A-Z]{2})\b(.*)$', name)
        hit = None
        if m and h['arm'] in ('infantry', 'cavalry'):
            n, code, rest = int(m.group(1)), m.group(2), m.group(3).strip()
            st = code2st.get(code)
            if st:
                rest_l = rest.lower()
                for u in units:
                    if u['army'] != army or u['st'] != st or u['arm'] not in (h['arm'], 'sharpshooters'):
                        continue
                    d = u['designation'].lower()
                    if rest_l in ('', 'a and c', 'company c') and u['number'] == n and u['arm'] == h['arm']:
                        hit = u
                    elif rest_l == 'reserves' and d == '%s pennsylvania reserves' % ordinal(n):
                        hit = u
                    elif rest_l == 'sharpshooters' and d.startswith('%s united states sharpshooters' % ordinal(n)):
                        hit = u
                    elif rest_l == 'phb' and 'potomac home brigade' in d:
                        hit = u
                    elif rest_l == 'eastern shore' and 'eastern shore' in d:
                        hit = u
                    elif rest_l in ('bn', 'cavalry bn') and d.startswith(ordinal(n) + ' ') and 'battalion' in d and u['arm'] == h['arm']:
                        hit = u
                    elif rest_l == 'bn' and u['number'] == n and u['arm'] == h['arm'] and 'battalion' in u['or_note']:
                        hit = u
                    elif rest_l == 'prov' and d.startswith(ordinal(n) + ' ') and 'provisional' in d:
                        hit = u
                    elif rest_l == 'rifles' and d.startswith(ordinal(n) + ' ') and 'rifles' in d:
                        hit = u
                    elif rest_l == 'sharpshooters' and d.startswith(ordinal(n) + ' ') and 'sharpshooters' in d:
                        hit = u
                    if hit:
                        break
        if hit is None:
            low = name.lower()
            for u in units:
                if u['army'] != army:
                    continue
                d = u['designation'].lower()
                if ('legion' in low and low.split(' legion')[0].replace("'s", '') in d.replace("'s", '') and 'legion' in d
                        and (h['arm'] or '') in d) or (low == '1st co. massachusetts sharpshooters' and d.startswith('1st company massachusetts')):
                    hit = u
                    break
        if hit is not None:
            hit['registry']['history'].append(h['id'])
        else:
            unmatched_hist.append({'id': h['id'], 'name': h['name'], 'arm': h['arm'], 'level': h['level'], 'status': h['status']})

    # ------------------------------------------------ crosswalk: baseline OOB ids (regiments) and existing roll files
    oob = {}
    for f in glob.glob(os.path.join(ROOT, 'baseline', 'dist', 'data', 'oob', '*.json')):
        d = json.load(open(f, encoding='utf-8'))

        def walk(x):
            if isinstance(x, dict):
                i = x.get('regiment_id') or x.get('battery_id')
                if i and x.get('designation'):
                    oob[i] = x['designation']
                for v in x.values():
                    walk(v)
            elif isinstance(x, list):
                for v in x:
                    walk(v)
        walk(d)
    unmatched_oob = []
    for i, des in sorted(oob.items()):
        army = 'union' if i.startswith('U-') else 'confederate'
        m = re.match(r'^[UC]-(\d+)([A-Z]{2})(-CAV)?(?:-(.+))?$', i)
        hit = None
        if m:
            n, code, cav, suf = int(m.group(1)), m.group(2), m.group(3), m.group(4)
            st = code2st.get(code)
            arm = 'cavalry' if cav else 'infantry'
            cands = [u for u in units if u['army'] == army and u['st'] == st]
            dl = des.lower()
            for u in cands:
                d = u['designation'].lower()
                if 'reserves' in dl and d == '%s pennsylvania reserves' % ordinal(n):
                    hit = u
                elif 'battalion' in dl and 'battalion' in d and d.startswith(ordinal(n) + ' ') and u['arm'] == arm:
                    hit = u
                elif 'sharpshooters' in dl and 'sharpshooters' in d and d.startswith(ordinal(n) + ' '):
                    hit = u
                elif 'eastern shore' in dl and 'eastern shore' in d:
                    hit = u
                elif 'provisional' in dl and 'provisional' in d and d.startswith(ordinal(n) + ' '):
                    hit = u
                elif 'rifles' in dl and 'rifles' in d and d.startswith(ordinal(n) + ' '):
                    hit = u
                if hit:
                    break
            if hit is None and not any(k in dl for k in ('reserves', 'battalion', 'sharpshooters', 'eastern shore', 'provisional', 'rifles')):
                for u in cands:
                    if u['number'] == n and u['arm'] == arm:
                        hit = u
                        break
        if hit is not None:
            hit['registry']['oob'].append(i)
        else:
            unmatched_oob.append({'id': i, 'designation': des})

    # ------------------------------------------------ hand tables of units_data.py (ALIAS, NO_UNIT): every id is attached with
    # its stated basis, or listed with the reason it is attached to no unit, or stays in "unmatched"
    by_des = {(u['army'], u['st'], u['designation']): u for u in units}
    no_unit = []

    def alias_unit(i):
        a = UD.ALIAS.get(i)
        if a is None:
            return None, None
        army_, st_, des_, basis_ = a
        u_ = by_des.get((army_, st_, des_))
        assert u_ is not None, 'ALIAS %s -> %s/%s/%s names no unit' % (i, army_, st_, des_)
        return u_, basis_

    still = []
    for h in unmatched_hist:
        i = 'H:%s:%s' % ('US' if h['id'].startswith('us') else 'CS', h['name'])
        u_, basis_ = alias_unit(i)
        if u_ is not None:
            u_['registry']['history'].append(h['id'])
            u_.setdefault('registry_basis', {})[h['id']] = basis_
        elif i in UD.NO_UNIT:
            no_unit.append({'kind': 'history', 'id': h['id'], 'name': h['name'], 'reason': UD.NO_UNIT[i]})
        else:
            still.append(h)
    unmatched_hist = still
    still = []
    for o in unmatched_oob:
        u_, basis_ = alias_unit(o['id'])
        if u_ is not None:
            u_['registry']['oob'].append(o['id'])
            u_.setdefault('registry_basis', {})[o['id']] = basis_
        elif o['id'] in UD.NO_UNIT:
            no_unit.append({'kind': 'oob', 'id': o['id'], 'name': o['designation'], 'reason': UD.NO_UNIT[o['id']]})
        else:
            still.append(o)
    unmatched_oob = still

    # existing roll files of rosters/data (earlier run), matched through the unit_id column
    csv.field_size_limit(10 ** 9)
    oob2unit = {}
    for u in units:
        for i in u['registry']['oob']:
            oob2unit[i] = u
    existing_unmatched = []
    skip = ('_pre_audit', '_quarantine', '_audit_removed', '/qa/', 'AUDIT', 'tombstone', 'sample', 'coverage', 'company_totals',
            'roh_unresolved', 'OR27-officer', 'reconciliation', 'strength_', 'heitman', 'pilot-corrections', 'structural')
    base = os.path.join(BT, 'rosters', 'data')
    for f in sorted(glob.glob(os.path.join(base, '**', '*.csv'), recursive=True)):
        rel = os.path.relpath(f, os.path.join(BT, 'rosters')).replace(os.sep, '/')
        if any(s in rel for s in skip) or rel.endswith('/units.csv'):
            continue
        with open(f, encoding='utf-8', errors='replace', newline='') as fh:
            rd = csv.DictReader(fh)
            if not rd.fieldnames or 'name_as_printed' not in rd.fieldnames or 'unit_id' not in rd.fieldnames:
                continue
            cnt = collections.Counter()
            reg = {}
            for r in rd:
                cnt[r['unit_id']] += 1
                reg.setdefault(r['unit_id'], r.get('regiment', ''))
        for uid, n in cnt.items():
            u = oob2unit.get(uid)
            basis_ = None
            if u is None:
                u, basis_ = alias_unit(uid)
            rec = {'file': rel, 'unit_id': uid, 'rows': n, 'regiment_as_in_file': reg.get(uid, '')}
            if basis_:
                rec['basis'] = basis_
            if u is not None:
                u['existing'].append(rec)
            elif uid in UD.NO_UNIT:
                rec['reason'] = UD.NO_UNIT[uid]
                no_unit.append({'kind': 'existing-file', **rec})
            else:
                existing_unmatched.append(rec)

    # ------------------------------------------------ kit ids (batteries and cavalry): hand table KIT_ALIAS, cavalry rule, KIT_NO_UNIT
    kit_b = json.load(open(os.path.join(BT, 'kit', 'artillery_batteries.json'), encoding='utf-8'))['units']
    kit_c = json.load(open(os.path.join(BT, 'kit', 'cavalry_units.json'), encoding='utf-8'))['units']
    kit_list = []
    unmatched_kit = []
    for kid, v in list(kit_b.items()) + list(kit_c.items()):
        army_ = v.get('army')
        targets = []
        if kid in UD.KIT_ALIAS:
            for a_, st_, d_ in UD.KIT_ALIAS[kid]:
                u_ = by_des.get((a_, st_, d_))
                assert u_ is not None, 'KIT_ALIAS %s -> %s/%s/%s names no unit' % (kid, a_, st_, d_)
                targets.append(u_)
        else:
            m = re.match(r'^(US|CS)\.CAV\.(\d+)([A-Z]+)$', kid)
            if m:                                    # US.CAV.3IN, CS.CAV.1VA, US.CAV.1MICH
                st_ = {'MICH': 'mi'}.get(m.group(3), m.group(3).lower())
                a_ = 'union' if m.group(1) == 'US' else 'confederate'
                n_ = int(m.group(2))
                hits = [u_ for u_ in units if u_['army'] == a_ and u_['st'] == st_ and u_['arm'] == 'cavalry' and u_['number'] == n_]
                if len(hits) == 1:
                    targets = hits
            if not targets:                          # kit name equal to a history alias name (H:US:1st US H)
                i = 'H:%s:%s' % ('US' if army_ == 'union' else 'CS', v.get('name'))
                u_, _b = alias_unit(i)
                if u_ is not None:
                    targets = [u_]
        for u_ in targets:
            u_['registry']['kit'].append(kid)
        row = {'id': kid, 'name': v.get('name'), 'army': army_, 'units': [u_['key'] for u_ in targets]}
        if kid in UD.KIT_NOTES:
            row['note'] = UD.KIT_NOTES[kid]
        if not targets:
            row['reason'] = UD.KIT_NO_UNIT.get(kid, 'no unit of units.json matched by rule or hand table')
            unmatched_kit.append(row)
        kit_list.append(row)

    counts = collections.Counter((u['army'], u['arm']) for u in units)
    out = {
        'format': 'roster2-units/1', 'generated': '2026-11-13',
        'authority': 'OR Ser. I vol. 27 pt. 1 No. 9 (pp. 155-168) and pt. 2 organization of the Army of Northern Virginia (pp. 283-291); numerals follow history/units.json (PDF B.3) where the OR OCR misreads them; see or_check per unit',
        'or_text': {'part1': {'file': 'tmp/library/or27/cu31924077699761_djvu.txt', 'table_offset': off1},
                    'part2': {'file': 'tmp/library/or27/cu31924077728255_djvu.txt', 'table_offset': off2}},
        'counts': {'units': len(units), 'by_army_arm': {'%s/%s' % k: v for k, v in sorted(counts.items())},
                   'or_check': dict(collections.Counter(u['or_check'] for u in units)),
                   'with_existing_roll_file': sum(1 for u in units if u['existing'])},
        'units': units,
        'not_in_or_table': [dict(zip(('army', 'st', 'designation', 'note'), x)) for x in UD.NOT_IN_OR_TABLE],
        'unmatched': {'history_registry_entries': unmatched_hist, 'oob_ids': unmatched_oob,
                      'existing_roll_files': existing_unmatched, 'kit_ids': unmatched_kit,
                      'note': 'entries that no rule and no hand table (units_data.py ALIAS, KIT_ALIAS) attached to a unit; nothing is guessed'},
        'attached_to_no_unit': no_unit,
        'kit_ids': kit_list,
        'units_without_kit_id': [u['key'] for u in units if u['arm'] in ('artillery', 'cavalry') and not u['registry']['kit']],
    }
    dest = os.path.join(BT, 'rosters', 'data2', 'units.json')
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    json.dump(out, open(dest, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(json.dumps(out['counts'], indent=1))
    print('unmatched history', len(unmatched_hist), 'oob', len(unmatched_oob), 'existing files', len(existing_unmatched), 'kit', len(unmatched_kit), 'no-unit', len(no_unit))
    for u in units:
        if u['or_check'] == 'not-found':
            print('NOT FOUND IN OR TEXT:', u['key'])
    print('units without kit id (artillery, cavalry):', len(out['units_without_kit_id']))


if __name__ == '__main__':
    main()
