"""Updates the request note to the world-content workstream after the third reading of shard fence-3 (2026-11-16).
Run once: python3 -I tmp/fence-3/scripts/update_request.py   (the note of 2026-11-13 is backed up in tmp/fence-3/backup-2026-11-16/)"""
import re, json, sys

ROOT = '/home/user/cautious-chainsaw'
P = ROOT + '/docs/battle-theatre/GOVERNANCE/horde/requests/world-content-fence-3-structures.md'
rows = [json.loads(l) for l in open(ROOT + '/docs/battle-theatre/GOVERNANCE/evidence_corrections/fence-3.jsonl', encoding='utf-8')]
nsub = sum(len(r['subclaims']) for r in rows)
ncit = sum(len(r['citations']) for r in rows)
txt = open(P, encoding='utf-8').read()
if 'Third reading 2026-11-16' in txt:
    print('already updated'); sys.exit(0)
lines = txt.split('\n')


def row_idx(prefix):
    for i, l in enumerate(lines):
        if l.startswith(prefix):
            return i
    raise SystemExit('row not found: ' + prefix)


def add_to_row(prefix, change_add=None, evidence_add=None, replace_change=None):
    i = row_idx(prefix)
    cells = lines[i].split(' | ')
    # cells: ['| S-053 / ...', change, evidence |'] ; the change cell is index 1, the evidence cell is the last
    if replace_change is not None:
        cells[1] = replace_change
    elif change_add:
        cells[1] = cells[1].rstrip() + ' ' + change_add
    if evidence_add:
        cells[-1] = cells[-1].rstrip(' |') + '; ' + evidence_add + ' |'
    lines[i] = ' | '.join(cells)


add_to_row('| S-053 /', 'Round 3: the NPS Boundary Study (1988) calls the Taney Farm "the site of intense skirmishing" and describes no house, ruin or fence.', 'NPS-BOUNDARY-1988 pdf p.22')
add_to_row('| S-054 /', 'Round 3: the NPS calls the barn "a Confederate hospital site" (1988, undated): show Confederate wounded at the barn after the fight as a documented, undated use.', 'NPS-BOUNDARY-1988 pdf p.40')
add_to_row('| S-059 /', 'Round 3: the NPS Historic Structure Report (1985) says the owner returned "several days later" to a farm "in literal ruins" and that troops took the barn siding for firewood and grave markers; the house was repaired within a few weeks and the barn re-sided: show the barn stripped of siding after the battle (no day) and repaired within weeks; a Leister fruit garden is called a battle-era feature (NPS Record of Treatment, replanted 1980).',
           'NPS-HSR-LEISTER-BARN pdf pp.13-14; NPS-CLR-ROT-V1')
add_to_row('| S-062 /', 'Round 3: the state at the charge is a mosaic with two selectable sector values and no default: nearly destroyed near the Codori house before the charge (Swallow, via the NPS study) and mostly standing on the Garnett left (Finley, 56th Virginia, via the NPS study); in the Rose fields two fences still lined the pike on the afternoon of 2 Jul (Aiken, via the NPS).',
           'NPS-COMMON-PRIDE-1 pdf pp.131, 155; NPS-CLR-ROT-V2 pdf p.103')
add_to_row('| S-063 /', 'Round 3: the claim figures are 194 panels and $174 (page image of the typewriter digits), not 195 and $175.', 'NPS-BRIEN-FARM pdf p.15 (page image)')
add_to_row('| S-066, S-072 /', 'Round 3: Armistead\'s death date is a selector: 5 Jul about 09:00 (Holland via the NPS study, the default) and 4 Jul (the NPS web page: "the day after his wounding"); the place is the 11th Corps hospital at the George Spangler farm (NPS Boundary Study 1988), no building documented.',
           'NPS-BOUNDARY-1988 pdf p.39; NPS web page Confederate Commanders at Gettysburg (served 2026-11-13)')
add_to_row('| S-069, S-070 /', replace_change='Heavy rain on 4 Jul from dark (Lee), through the night; no tents until 5 Jul (Letterman, report); the wounded lay unsheltered in "the drenching rain which fell after the battle" with the hospitals "chiefly the woods" (Letterman, Medical Recollections 1866, pp.156-157): the exposure is documented, no longer inferred; Plum Run overflow and drowned wounded an inferred marked state, date open; no temperature claim ("cold" is in no text).',
           evidence_add='LETTERMAN-1866 pp.156-157')
add_to_row('| S-073 /', 'Round 3: hospital use of the house after the evacuation of 5 Jul is documented (NPS) and likely for the barn (hedged); do not draw "abandoned by 6 Jul" as fact; the army marched on 6-7 Jul with more than a hundred medical officers ordered to remain (Letterman 1866).',
           'NPS-CLI-ERR pdf p.82; LETTERMAN-1866 pp.158-159')
add_to_row('| S-078, S-079 ', 'Round 3: the Rose barn of about 1812 stands in its stone gables (HABS PA-5348: roof destroyed in a 1934 windstorm; no fire named); the printed fire of 1910 stays a marked gap.', 'NPS-HABS-pa1692')
i = row_idx('| S-082 /')
lines[i] = ('| S-082 / WS-082-layout | Keep the semicircle (also described on 19 Nov as "half circles around a common center"). Do NOT draw the iron boundary fence on 19 Nov 1863: the NPS CLR (2017) dates it to the fall of 1864 ("a simple iron fence installed in the fall of 1864"; the fence and the arborvitae hedge "built and planted in 1864"; "almost complete" in December 1864): it enters later scenes as a construction of 1864, never as a pre-placed object, in one of three selectable built forms (low pipe-rail fence and hedge; three-foot iron fence behind arborvitae; low iron fence). '
            'The line between the soldiers\' ground and Evergreen Cemetery on 19 Nov is a marked open gap: nothing is documented on it (the CLR says most field fences were "probably" taken down during the battle; before the battle a wood fence and a grove bounded the Weirick field on the Evergreen side). No stone wall as built (the stone enclosure is future on 19 Nov; first approved 29 Jul 1864); Evergreen\'s own road frontage in 1863 was a temporary white-painted wood plank fence. '
            '| NPS-CLR-CEMETERY pdf pp.26, 49, 76-78 (content-stream text variant); NPS-ADHI pdf p.22; NPS-CLI-CEMETERY pdf pp.24, 25, 29, 36; CEM-BARTLETT-1874; LOC-NYTRIB-1863-11-21-P2 |')
add_to_row('| S-083 /', 'Round 3: anchor the platform to the flagstaff, a two-section pole of about seventy-five feet at "the center of the semi-circular plot of Union graves where the central monument was to be placed" (NPS CLR 2017); the Becker sketch of about 18 Nov puts the grandstand to the left of the flagstaff within Evergreen Cemetery; no dividing fence is drawn beside it (S-082: the iron fence dates from the fall of 1864).',
           'NPS-CLR-CEMETERY pdf pp.70-71 (caption of Figure 1.40)')
# new row for S-071, inserted after the S-070 row
j = row_idx('| S-069, S-070 /')
lines.insert(j + 1, '| S-071 / bld-hummelbaugh-farm, PERSON-pleasonton | Replace the printed "Hospital -> Pleasonton HQ, Jul 4-6" by: headquarters of General Pleasonton at the farm "during the early stages of the battle" (NPS Record of Treatment) or "during the Battle of Gettysburg" (HABS), the day not documented; hospital use by Union troops (undated); Confederate Brig. Gen. Barksdale died at the house and was buried on the grounds (HABS), the date and hour not given; the corps and the dates of the hospital use stay open-gap markers. The house stands in 1863 (NPS 1999). | NPS-HABS-pa1357 (HABS PA-1961); NPS-CLR-ROT-V1 pdf p.219; NPS-GMP-1999-V1 p.227 |')
txt = '\n'.join(lines)
txt = txt.replace('Tier words follow CLAUDE.md.', 'Tier words follow the standing project instructions.')
# header counts and decisions
txt = txt.replace('165 sub-claims, 283 citations', '%d sub-claims, %d citations' % (nsub, ncit))
txt = txt.replace('Delegated decisions: DD-F3-01 to DD-F3-09, section "Added 2026-11-13 by the evidence close-out of shard fence-3"', 'Delegated decisions: DD-F3-01 to DD-F3-09 (section "Added 2026-11-13 by bt-evidence, shard fence-3") and DD-F3-10 to DD-F3-14 (section "Added 2026-11-16 by bt-evidence, shard fence-3")')
txt = txt.replace('Origin: workstream bt-evidence, shard fence-3, 2026-11-13.', 'Origin: workstream bt-evidence, shard fence-3, 2026-11-13; Third reading 2026-11-16 (the new findings are marked "Round 3" in section A and listed in section F).')
# section B: S-071 is no longer a whole unsupported row
txt = txt.replace('S-071 (whole row: hospital, Barksdale, Pleasonton headquarters); ', 'S-071 (the Second Corps hospital on 2-3 Jul, the dates of the hospital use and Pleasonton\'s headquarters on 4-6 Jul; the NPS documents the hospital use, Pleasonton\'s headquarters in the early stages of the battle and Barksdale\'s death at the house); ')
txt = txt.replace('S-082 an iron fence standing on 19 Nov;', 'S-082 an iron fence standing on 19 Nov (contradicted: installed in the fall of 1864) and what stood on the dividing line that day;')
txt = txt.replace('S-069 Plum Run overflow and "from about 21:00"; S-070 "cold";', 'S-069 Plum Run overflow and "from about 21:00"; S-070 "cold" (the exposure of the wounded to the rain is documented);')
# section C: the rows with verdict confirmed or corrected
ok = [r['schedule_id'][2:] for r in rows if r['verdict'] in ('confirmed', 'corrected')]
closed = [r['schedule_id'][2:] for r in rows if r['status'] == 'closed']
txt = re.sub(r'\(S-053, 055,.*?\)', '(' + ', '.join('S-' + x for x in ok) + ')', txt, count=1, flags=re.S)
txt = re.sub(r'Closed rows \(no open evidence item\):[^.]*\.', 'Closed rows (no open evidence item): ' + ', '.join('S-' + x for x in closed) + '.', txt, count=1)
txt = txt.rstrip('\n') + '''

## F. Third reading 2026-11-16: what is new for the world-content workstream
1. **S-082, S-083 (cemetery)**: the iron fence on the Evergreen line is a construction of the fall of 1864 (NPS CLR 2017, printed pp.57-59); the dedication scene of 19 Nov 1863 must therefore not contain it (an inference from the installation date: no text describes an earlier iron fence), and the dividing line is a marked gap. The flagstaff (about 75 ft) at the centre of the planned semicircle anchors the platform.
2. **S-071 (Hummelbaugh farm)**: now documented as a hospital, Pleasonton's headquarters in the early stages of the battle and the place of Barksdale's death (HABS PA-1961); the printed window Jul 4-6 is contradicted.
3. **S-062 (Emmitsburg Road)**: sector values at the charge (nearly destroyed near the Codori house; mostly standing on the Garnett left), two fences along the pike in the Rose fields on 2 Jul.
4. **S-066, S-072 (Armistead)**: two death dates from the NPS (4 Jul, 5 Jul about 09:00), no default beyond the delegated one (DD-F3-10).
5. **S-073, S-069, S-070 (hospitals and rain)**: hospital use of the Trostle house after 5 Jul; the wounded lay exposed to "the drenching rain which fell after the battle" (Letterman 1866).
6. **S-059, S-054, S-053, S-079**: the Leister barn stripped of siding and repaired within weeks (NPS HSR 1985); the Rummel barn a Confederate hospital site (undated); the Rose barn without a fire in the NPS record.
7. **S-063**: the claim figures 194 panels and $174 replace 195 and $175 (page image).
Delegated decisions: DD-F3-10 (Armistead's death date), DD-F3-11 (the iron boundary fence on 19 Nov 1863), DD-F3-12 (Pleasonton at the Hummelbaugh farm), DD-F3-13 (road-fence sector values), DD-F3-14 (the end of the Trostle hospital). All reversible; every alternative stays selectable.
'''
open(P, 'w', encoding='utf-8').write(txt)
print('updated', P, len(txt), 'chars; documented-or-corrected rows', len(ok), 'closed', closed)
