import sys, re, json, csv, os, collections
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\tmp\bt\rosters\NE\scripts')
import fetchlib as f
import me_gen as g
import mass_run as mr

# unit: (return first, return last, kwargs, participants pages, designation)
UNITS = {
    'U-3ME': (345, 377, {}, range(185, 191), '3rd Maine Volunteer Infantry'),
    'U-4ME': (377, 408, {}, range(218, 223), '4th Maine Volunteer Infantry'),
    'U-5ME': (408, 439, {}, range(441, 448), '5th Maine Volunteer Infantry'),
    'U-6ME': (439, 470, {}, range(474, 482), '6th Maine Volunteer Infantry'),
    'U-7ME': (470, 504, {}, range(511, 516), '7th Maine Volunteer Infantry'),
    'U-16ME': (685, 723, {}, range(87, 95), '16th Maine Volunteer Infantry'),
    'U-17ME': (723, 756, {}, range(259, 266), '17th Maine Volunteer Infantry'),
    'U-19ME': (756, 791, {}, range(363, 372), '19th Maine Volunteer Infantry'),
    'U-1ME-CAV': (225, 261, dict(first_company='A'), range(551, 563), '1st Maine Cavalry'),
    'U-ART-2ME': (303, 306, dict(first_company='BTY', fixed_company='BTY'), None, '2nd Maine Battery (Hall\'s Battery)'),
}
RANKS = r'(Colonel|Lieutenant[\- ]Colonel|Lieut\.?[\- ]Colonel|Major|Adjutant|Quartermaster|Surgeon|Assistant Surgeon|Chaplain|Sergeant[\- ]Major|Q\. ?M\.? Sergeant|Commissary Sergeant|Hospital Steward|Captain|First Lieutenant|Second Lieutenant|Lieutenant|Acting [A-Za-z ]+|First Sergeant|Orderly Sergeant)'


def key_tokens(n):
    t = g.norm_tokens(n)
    return t


def build(uid):
    first, last, kw, ppages, des = UNITS[uid]
    rows = g.parse_returns(first, last, None, **kw)
    # FS rows: dedupe by name
    seen = {}
    out_rows = []
    for r in rows:
        if r['co'] == 'FS':
            k = re.sub(r'[^a-z]', '', r['name'].lower())
            if k in seen:
                seen[k]['rem'] = (seen[k]['rem'] + ' | present organization: ' + r['rem']).strip(' |')
                continue
            seen[k] = r
        out_rows.append(r)
    cl = g.classify_all(out_rows)
    people = g.parse_participants(ppages) if ppages else []
    P, unmatched = g.merge(cl, people) if people else ([], [])
    # officers from participants lines
    off_unmatched = []
    for p in people:
        if p.get('kind') != 'officer_line':
            continue
        parts = [x.strip() for x in p['raw'].split(',')]
        if len(parts) < 3 or not re.match(RANKS, parts[0], re.I):
            continue
        nm = parts[1]
        toks = key_tokens(nm)
        if not toks:
            continue
        sur = toks[-1].lower()
        hit = None
        for r in cl:
            if r['sec'] in ('officers',) or r['co'] == 'FS':
                rt = key_tokens(r['name'])
                if rt and rt[-1].lower() == sur and (r['co'] == p['co'] or r['co'] == 'FS' or p['co'] == 'FS'):
                    hit = r
                    break
        if hit:
            hit.setdefault('participant', []).append(dict(name=nm, res=','.join(parts[2:]), kind='officer', score=1.0, page=p['page']))
        else:
            off_unmatched.append(dict(co=p['co'], name=nm, res=','.join(parts[2:]), kind='officer', rank=parts[0], page=p['page']))
    out = []
    for r in cl:
        lab, why, code, rs = r['label'], r['why'], r['code'], r['roll_status']
        flags = []
        if r.get('participant'):
            if lab == 'Absent-Documented':
                lab, rs, code = 'Unknown', 'unreadable-or-ambiguous', 'CONFLICT'
                why = 'CONFLICT: return says absent/separated (%s) but the 1898 participants list names him' % r['why']
                flags.append('contested')
            else:
                lab, rs, code = 'Present-Documented', 'named-present', 'PART-LIST'
                why = 'named on the 1898 Maine at Gettysburg participants list (book p.%s)%s' % (r['participant'][0].get('page'), '; return remark: ' + r['remarks'][:60] if r['remarks'] else '')
        if r.get('participant') and r['participant'][0].get('company_mismatch'):
            flags.append('company-differs-between-return-and-participants-list')
        if len(r['participant'] if r.get('participant') else []) > 1:
            flags.append('multiple-participant-matches')
        nm = r['name']
        if re.search(r"[^A-Za-z\.\,\s'\-]", nm) or len(nm) < 4:
            flags.append('name-garbled')
        out.append(dict(unit_id=uid, regiment=des, company=r['co'], section=r['sec'], name_as_printed=nm, name_clean=nm, rank_as_printed=r['sec'], rank_class=mr.rank_class(r['sec'] if r['sec'] != 'privates' else 'Priv.'),
                        age=re.sub(r'[^0-9]', '', r['age'])[:3], residence=r['res'], enlisted_or_commissioned=clean_join(r['ms'], r['mustered']),
                        remarks_as_printed=r['remarks'], presence_label=lab, presence_basis=why, basis_code=code, roll_status=rs,
                        evidence_label={'Present-Documented': 'Documented', 'Absent-Documented': 'Documented'}.get(lab, 'Unknown'), dup_group='',
                        source_id='ME-AGR-1863-AppD' + ('+ME-GETT-1898' if r.get('participant') else ''), source_locator='AG report 1863 App. D, IA page index %d' % r['page'],
                        parse_flags=';'.join(flags)))
    for p in unmatched + off_unmatched:
        out.append(dict(unit_id=uid, regiment=des, company=p['co'], section='participants-only', name_as_printed=p['name'], name_clean=p['name'], rank_as_printed=p.get('rank', p.get('kind', '')),
                        rank_class=mr.rank_class(p.get('rank', 'Priv.')), age='', residence=p['res'], enlisted_or_commissioned='', remarks_as_printed='',
                        presence_label='Present-Documented', presence_basis='named on the 1898 Maine at Gettysburg participants list (book p.%s); no matching row on the 1 Dec 1863 returns (OCR spelling variant, man not on the 1863 roll, or parser miss)' % p['page'],
                        basis_code='PART-LIST', roll_status='named-present', evidence_label='Documented', dup_group='', source_id='ME-GETT-1898',
                        source_locator='Maine at Gettysburg 1898, IA page index %s' % p['page'], parse_flags='no-return-row'))
    # duplicate groups (same normalised name within the unit)
    cnt = collections.defaultdict(list)
    for i, o in enumerate(out):
        cnt[(re.sub(r'[^a-z]', '', o['name_as_printed'].lower()))].append(i)
    n = 0
    for k, idxs in cnt.items():
        if len(idxs) > 1 and k:
            n += 1
            for i in idxs:
                out[i]['dup_group'] = 'me%s-%d' % (uid.split('-')[1], n)
                out[i]['parse_flags'] = (out[i]['parse_flags'] + ';duplicate-group').strip(';')
    return out, dict(returns=len(out_rows), participants_named=len(P), unmatched=len(unmatched), officers_unmatched=len(off_unmatched))


def clean_join(a, b):
    return re.sub(r'\s+', ' ', (a + ' ' + b)).strip()


if __name__ == '__main__':
    os.makedirs(os.path.join(f.DATA, 'maine'), exist_ok=True)
    stats = {}
    for uid in (sys.argv[1:] or UNITS):
        rows, st = build(uid)
        p = os.path.join(f.DATA, 'maine', mr.slug(UNITS[uid][4]) + '.csv')
        mr.write_csv(p, rows)
        c = collections.Counter(r['presence_label'] for r in rows)
        print(uid, len(rows), dict(c), st, sorted(collections.Counter(r['company'] for r in rows).items()), flush=True)
