import sys, re, csv, os, collections, json
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\tmp\bt\rosters\NE\scripts')
import fetchlib as f
import me_gen as g
import mass_run as mr

PIL = os.path.join(f.ROOT, 'docs', 'battle-theatre', 'rosters', 'pilot', '20th-maine.csv')
rows = list(csv.DictReader(open(PIL, encoding='utf-8')))
OOB = mr.oob_units()['U-20ME']
CODE = [('NOT named in the 1898', 'ONROLL-NO-STATUS'), ('named', 'PART-LIST'), ('listed in Maine at Gettysburg', 'PART-LIST'), ('separation event', 'SEP-BEFORE'),
        ('mustered', 'ENL-AFTER'), ('CONFLICT', 'CONFLICT'), ('undated', 'DATE-NOT-SHOWN'), ('without legible date', 'DATE-NOT-SHOWN'), ('not decidable', 'OCR-DATE-LOST')]


def code_of(why, lab):
    for k, c in CODE:
        if k.lower() in why.lower():
            return c
    return {'Present-Documented': 'PART-LIST', 'Absent-Documented': 'SEP-BEFORE'}.get(lab, 'ONROLL-NO-STATUS')


out = []
moved = []
fs_seen = 0
for r in rows:
    flags = r['parse_flags']
    if r['company'] == 'FS' and r['source_page_idx_ia'] == '791':
        fs_seen += 1
        if fs_seen <= 11:
            moved.append(r)
            continue
    lab = r['presence_label']
    why0, rs0, code0 = r['presence_basis'], r['roll_status'], None
    if r['section'] == 'joined' and lab == 'Unknown' and rs0 == 'on-roll-undetermined' and g.joined_after(r['mustered']):
        lab, why0, rs0, code0 = 'Absent-Documented', 'mustered %s after the battle (rule added by the NE run: joined-since-Nov-1862 section, muster month July to October)' % r['mustered'], 'not-yet-enlisted', 'ENL-AFTER'
    if lab == 'Unknown' and rs0 == 'on-roll-undetermined' and re.search(r'G[eo]tt?[yv]s|Gett|Gcttys|Get\w{0,3}sb', r['remarks_as_printed'], re.I):
        lab, why0, rs0, code0 = 'Present-Documented', 'return remark names Gettysburg: ' + r['remarks_as_printed'][:80] + ' (rule added by the NE run: OCR-tolerant Gettysburg match)', 'named-present', 'CAS-REMARK'
    out.append(dict(unit_id='U-20ME', regiment=OOB['designation'], company=r['company'], section=r['section'], name_as_printed=r['name_as_printed'], name_clean=r['name_as_printed'],
                    rank_as_printed=r['section'], rank_class=mr.rank_class(r['section'] if r['section'] != 'privates' else 'Priv.'), age=r['age'], residence=r['residence'],
                    enlisted_or_commissioned=r['mustered'], remarks_as_printed=r['remarks_as_printed'], presence_label=lab, presence_basis=why0,
                    basis_code=code0 or code_of(r['presence_basis'], lab), roll_status=rs0,
                    evidence_label={'Present-Documented': 'Documented', 'Absent-Documented': 'Documented'}.get(lab, 'Unknown'), dup_group=r['dup_group'],
                    source_id=r['source_ids'], source_locator='AG report 1863 App. D, IA page index %s' % r['source_page_idx_ia'], parse_flags=r['parse_flags']))
# the 20th Maine present organisation of field and staff (IA page index 822, book p.602), top half only
P = g.ME()
words = P['822']
ty = None
for w in words:
    if w[4].startswith('TWENTY-FIRST'):
        ty = (w[1] + w[3]) / 2
fsrows = g.parse_returns(822, 822, None, first_company='FS', cut_first=False, cut_last=False)
fsrows = [r for r in fsrows if ty is None or r['y'] < ty - 5]
cl = g.classify_all(fsrows)
for r in cl:
    out.append(dict(unit_id='U-20ME', regiment=OOB['designation'], company='FS', section='fs-present-organization', name_as_printed=r['name'], name_clean=r['name'], rank_as_printed=r['res'], rank_class=mr.rank_class(r['res']),
                    age='', residence='', enlisted_or_commissioned=g.clean(r['ms'] + ' ' + r['mustered']), remarks_as_printed=r['remarks'], presence_label=r['label'], presence_basis=r['why'], basis_code=r['code'],
                    roll_status=r['roll_status'], evidence_label={'Present-Documented': 'Documented', 'Absent-Documented': 'Documented'}.get(r['label'], 'Unknown'), dup_group='',
                    source_id='ME-AGR-1863-AppD', source_locator='AG report 1863 App. D, IA page index 822 (book p.602), added by the NE family run', parse_flags='added-not-in-pilot'))
os.makedirs(os.path.join(f.DATA, 'maine'), exist_ok=True)
p = os.path.join(f.DATA, 'maine', mr.slug(OOB['designation']) + '.csv')
mr.write_csv(p, out)
# tombstones for moved rows
tp = os.path.join(f.DATA, 'maine', 'pilot-corrections-20th-maine-fs-rows.csv')
with open(tp, 'w', encoding='utf-8', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=list(moved[0].keys()) + ['correction'])
    w.writeheader()
    for r in moved:
        r = dict(r)
        r['correction'] = 'pilot row from IA page index 791 top table: the page image shows this is the Present Organization of Field and Staff of the 19th Maine (Lieut Col Cunningham, Major Welch), not the 20th; the 20th Maine return begins lower on the same page. Removed from the 20th Maine file; the 19th Maine file carries the same table from its own parse.'
        w.writerow(r)
c = collections.Counter(r['presence_label'] for r in out)
print(len(out), dict(c), 'moved', len(moved))
