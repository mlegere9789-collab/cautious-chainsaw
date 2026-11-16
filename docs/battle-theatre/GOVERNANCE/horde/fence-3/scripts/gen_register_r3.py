"""Writes the proposed register entries fence-3-EG-01..18 of the fence-3 close-out as updated by the third reading (2026-11-16).
The entries of 2026-11-13 (gen_register.py, data part) are loaded unchanged and the findings of 2026-11-16 are overlaid; every figure and quotation is in
evidence_corrections/fence-3.jsonl (the row id is named in each overlay); nothing is added from memory.
Run: python3 -I tmp/fence-3/scripts/gen_register_r3.py"""
import os, sys, re

ROOT = '/home/user/cautious-chainsaw'
src = open(ROOT + '/tmp/fence-3/scripts/gen_register.py', encoding='utf-8').read().split('def main():')[0]
ns = {}
exec(compile(src, 'gen_register_data', 'exec'), ns)
E = ns['E']
OUT, REV, DEC = ns['OUT'], ns['REV'], ns['DEC']
by = {e['n']: e for e in E}
R3 = 'Round 3 (2026-11-16): '
STATUS_UPD = '; updated 2026-11-16 (third reading)'


def app(n, field, text, sep=' '):
    by[n][field] = by[n][field].rstrip() + sep + text


def rep(n, field, old, new):
    if old not in by[n][field]:
        raise SystemExit('overlay anchor not found in EG-%02d %s: %r' % (n, field, old[:70]))
    by[n][field] = by[n][field].replace(old, new)


def stat(n):
    s = by[n]['status']
    if STATUS_UPD not in s:
        by[n]['status'] = re.sub(r'\)$', STATUS_UPD + ')', s) if s.endswith(')') else s + STATUS_UPD


# ---- EG-01 Taney
app(1, 'desc', R3 + 'the NPS Boundary Study (1988, pdf p.22) calls the Taney Farm (about 30 acres) "the site of intense skirmishing between Union and Confederate troops during the battle" and names no house, ruin or fence; "Taney" with ruin, razed, demolished or destroyed was searched again in all local texts, including the 51 Historic American Buildings Survey records: no statement that the house was ruined (R14.S-053).')
stat(1)

# ---- EG-02 Rummel
app(2, 'desc', R3 + 'the NPS Boundary Study (1988, pdf p.40) lists the Rummel barn among the historic farm buildings that remain and calls it "a Confederate hospital site" (no date, unit or number); "loop-hole", "loophole" and "port-hole" with Rummel or barn were searched again in every local text (no file); the barn is documented as a Confederate hospital site, still without plank walls or loopholes (R14.S-054).')
rep(2, 'tier', 'documented (occupation, shelling, fences standing, openings made, 30 horses)', 'documented (occupation, shelling, fences standing, openings made, 30 horses, a Confederate hospital site undated)')
stat(2)

# ---- EG-06 Leister
app(6, 'desc', R3 + 'the NPS Historic Structure Report on the Leister barn (1985, pdf pp.13-14) says Mrs. Leister left the farm on the evening of 1 Jul and, returning several days later, found it "in literal ruins": dead horses littered the yard, the crops were trampled and both barn and house were damaged by shell fire "and troops who scrounged the siding for firewood and grave markers"; the house was repaired within a few weeks and the barn re-sided; '
                 'the NPS Record of Treatment vol. I says the park replanted the Leister Fruit Garden in 1980 and that it was "extant and representing battle-era character" (a battle-era fruit garden is implied); the bedstead, the destroyed apple trees, the dead peach tree and the spoiled spring were searched again in all local texts and stay open gaps (R14.S-059).')
stat(6)

# ---- EG-08 Emmitsburg Road fences
app(8, 'desc', R3 + 'the NPS study "A Common Pride and Fame" part I quotes two participants whose accounts of the road fences at the charge differ: Swallow (writing within twenty years; Stine, p. 538) says that near the Codori house "the fences of the Emmitsburg road ... had been nearly destroyed the day before in the battle on our right" (pdf p.131), and Finley of the 56th Virginia (the extreme left of Garnett\'s line) that "the board fences were still mostly standing and there was a momentary check until our men went against and over them" (pdf p.155); '
                 'the NPS Record of Treatment vol. II quotes Aiken of the 7th South Carolina that on the afternoon of 2 Jul "Sharpshooters injured us while climbing the two fences that lined the pike" in the Rose fields (pdf p.103). The 836-hole rail and "perforated slabs" were searched again in all local texts (no file) (R14.S-062).')
app(8, 'competing', 'Near the Codori house nearly destroyed the day before (Swallow, via NPS) against mostly standing on the Garnett left (Finley, via NPS): sector values, no default', sep='; ')
rep(8, 'tier', 'inferred (breaches)', 'inferred (breaches); conflict by sector (nearly destroyed near the Codori house against mostly standing on the Garnett left)')
stat(8)

# ---- EG-09 Brien: the digits read from the page image
for f in ('desc', 'subst', 'recon', 'tier'):
    by[9][f] = by[9][f].replace('195 panels', '194 panels').replace('$175', '$174')
app(9, 'desc', R3 + 'the page image of the study (typewriter digits) reads 194 panels and $174, not the text layer\'s 195 and $175 (crop tmp/library/web/nps/_img/brien/p15-crop.png, viewed 2026-11-16; the figures $15 and $1,028 were read on the page image of pdf p.7 and agree with the text layer) (R14.S-063).')
stat(9)

# ---- EG-10 hospital and farm claims
rep(10, 'desc', 'S-071: the Hummelbaugh farm as a Second Corps hospital where Barksdale died and as Pleasonton\'s headquarters on 4-6 Jul (SS-Hummelbaugh): the house stood in 1863 (NPS 1999); the rest has no local source; OR27 has no Hummelbaugh text and Pleasonton\'s report (OR27-1-R336) names no headquarters site. ',
    'S-071: the Hummelbaugh farm as a Second Corps hospital where Barksdale died and as Pleasonton\'s headquarters on 4-6 Jul (SS-Hummelbaugh). ' + R3 + 'HABS PA-1961 (Library of Congress record pa1357) says the house "was used by General Alfred Pleasonton of the Union as a headquarters during the Battle of Gettysburg and also as a hospital by U.S. troops" and that "Confederate Gen. William Barksdale died at the house and was buried on the grounds", and the NPS Record of Treatment vol. I (pdf p.219) puts Pleasonton\'s headquarters at the farm "during the early stages of the battle" and names "hospital use"; '
    'the house stood in 1863 (NPS 1999); no local text names the corps, the days of the hospital use or the hour of Barksdale\'s death, or dates Pleasonton\'s stay to 4-6 Jul; OR27 has no Hummelbaugh text and Pleasonton\'s report (OR27-1-R336) names no headquarters site. ')
rep(10, 'desc', 'S-072: he died on 5 Jul at about 9 a. m. (Holland via NPS),', 'S-072: he died on 5 Jul at about 9 a. m. (Holland via NPS; ' + R3 + 'the NPS web page "Confederate Commanders at Gettysburg", as served 2026-11-13, says he "died in a Federal field hospital the day after his wounding", i.e. 4 Jul, a second selectable value; the NPS Boundary Study of 1988, pdf p.39, puts his death at the 11th Corps hospital on the George Spangler farm),')
rep(10, 'desc', 'no local text dates the end of the hospital use or says "abandoned by Jul 6".', 'no local text dates the end of the hospital use or says "abandoned by Jul 6". ' + R3 + 'the NPS inventory of the Emmitsburg Road Ridge (pdf p.82) says the house "was used for temporary hospital purposes after the evacuation of the Confederate army on July 5" and that the barn likely served so (hedged); Letterman (Medical Recollections, 1866, pp.158-159) has the army moving toward the Potomac on 6-7 Jul with more than a hundred medical officers ordered to remain.')
rep(10, 'tier', 'documented (Armistead arrival and death, Trostle brief hospital and barn damage, Hummelbaugh house standing); inferred (none); open gap (Granite Schoolhouse hospital, Hummelbaugh hospital and headquarters, summer kitchen, Trostle end date)',
    'documented (Armistead arrival, death and place, Trostle brief hospital with use after 5 Jul and barn damage, Hummelbaugh house standing, hospital use, Pleasonton\'s headquarters in the early stages of the battle and Barksdale\'s death at the house); conflict (Armistead\'s death date: 4 Jul or 5 Jul); inferred (none); open gap (Granite Schoolhouse hospital, the corps and dates of the Hummelbaugh hospital, summer kitchen, Trostle end date)')
rep(10, 'competing', 'summer kitchen (PDF) against a cot under trees (Holland)', 'summer kitchen (PDF) against a cot under trees (Holland); death on 4 Jul (NPS web page) against 5 Jul about 09:00 (Holland via NPS); Pleasonton\'s headquarters 4-6 Jul (PDF) against the early stages of the battle (NPS Record of Treatment)')
rep(10, 'subst', 'Granite Schoolhouse and Hummelbaugh hospital and headquarters states as marked open gaps; Trostle hospital use "brief" with the end date open.',
    'Granite Schoolhouse hospital as a marked open gap; Hummelbaugh farm drawn with hospital use (undated) and Pleasonton\'s headquarters in the early stages of the battle (documented, day open) and Barksdale\'s death at the house, with the corps and dates marked open; Armistead\'s death date a selector (5 Jul about 09:00 default, 4 Jul selectable); Trostle hospital use "brief" with use after 5 Jul documented and the end date open.')
rep(10, 'recon', 'Armistead\'s hour, place and death, the Trostle brief hospital and the standing Hummelbaugh house are documented; everything else of the five rows is open.',
    'Armistead\'s hour, place and death (with a one-day conflict on the date), the Trostle brief hospital with use after 5 Jul, and the Hummelbaugh farm\'s hospital use, Pleasonton\'s headquarters and Barksdale\'s death are documented; the Granite Schoolhouse hospital, the corps and dates of the Hummelbaugh hospital and the Trostle end date are open.')
rep(10, 'rec', 'Read the HistoryNet Spangler article and the Stone Sentinels farm pages from a machine that can reach them; do not carry the PDF values as documented.',
    'Read the HistoryNet Spangler article and the Stone Sentinels farm pages from a machine that can reach them (they would settle the Granite Schoolhouse, the summer kitchen and the corps and dates of the Hummelbaugh hospital); do not carry the PDF values as documented.')
stat(10)

# ---- EG-12 rain and hospital sites
app(12, 'desc', R3 + 'Letterman (Medical Recollections of the Army of the Potomac, 1866, pp.156-157) says the wagons with the tents "could not reach the field in time to protect the wounded from the drenching rain which fell after the battle", that "houses and barns, but chiefly the woods, were used as hospitals" and that "had the weather been pleasant, much of this suffering would not have occurred": the exposure of the wounded to the rain is now documented; "cold" is in no text and Plum Run overflowing was searched again (only a modern NPS statement that the stream floods the valley in heavy rain today) (R14.S-069, S-070).')
rep(12, 'tier', 'inferred (exposed wounded, drowning by Rock Creek)', 'documented (wounded exposed to the drenching rain after the battle, hospitals chiefly in the woods: Letterman 1866); inferred (drowning by Rock Creek)')
stat(12)

# ---- EG-14 railroad
app(14, 'desc', R3 + 'the 246 local newspaper pages dated 6-15 Jul 1863 were scanned for the reopening of the Gettysburg railroad: six matches, all about the capture of a wagon train or a resort advertisement; the date the line reached the town station stays unsupported (R14.S-076).')
stat(14)

# ---- EG-15 Camp Letterman, Rose and Codori barns
app(15, 'desc', R3 + 'HABS PA-5348 (Library of Congress record pa1692) dates the Rose barn to about 1812 and says "the roof was destroyed in a 1934 windstorm and the barn was allowed to deteriorate" until the NPS acquired the site in 1958; it names no fire and no year 1910; the Codori demolition of 1882 and the Rose fire of 1910 were searched again in all local texts including the HABS records and the NPS landscape documents (no statement) (R14.S-079).')
stat(15)

# ---- EG-17 cemetery
app(17, 'desc', R3 + 'the NPS CLR 2017 dates the iron boundary fence: the sale condition of 14 Aug 1863 was met by "a simple iron fence installed in the fall of 1864" (three feet tall, 1,726 feet long; printed pp.58-59, pdf pp.77-78), the caption of Figure 1.52 says the pipe-rail fence and the arborvitae hedge were "built and planted in 1864", the committee approved the first major works on 29 Jul 1864 (the boundary fence "likely" among them) and in December 1864 Wills reported "a fence between the two cemeteries" almost complete (printed p.57, pdf p.76): '
                  'the iron fence of the PDF row therefore did not stand on 19 Nov 1863 (an inference from the dated installation; no text describes an earlier iron fence). What stood on the line itself that day is not documented: the CLR says most field fences were "probably" taken down during the battle (pdf p.49) and before the battle a wood fence and the grove bounded the Weirick field on the Evergreen side (pdf p.45). The CLR also says the flagstaff stood "at the center of the semi-circular plot of Union graves where the central monument was to be placed", a two-section pole of about seventy-five feet (pdf pp.70-71), and the Becker sketch of about 18 Nov shows the grandstand to its left within Evergreen Cemetery (R14.S-082, S-083, S-084).')
rep(17, 'tier', 'open gap (fence standing on 19 Nov, footprint, Blue Ridge)', 'documented that the iron boundary fence was installed in the fall of 1864 (so, by inference, not standing on 19 Nov 1863), the flagstaff at the centre of the planned semicircle; open gap (what stood on the dividing line on 19 Nov, footprint, Blue Ridge)')
rep(17, 'competing', 'Boundary fence: open iron railing / low pipe-rail fence with hedge / low iron fence; platform:', 'Boundary fence (scenes after its construction in 1864 only): open iron railing / low pipe-rail fence with hedge / low iron fence; platform:')
rep(17, 'subst', 'the boundary fence on 19 Nov an open-gap state with three selectable forms and no default (open iron railing as stipulated, low pipe-rail fence with hedge, low iron fence); no iron fence and no stone wall as built facts in the dedication scene until a source dates them;',
    'no iron boundary fence and no stone wall on 19 Nov 1863 (the fence is dated to the fall of 1864, the wall to a start in July 1864); the line between the soldiers\' ground and Evergreen on 19 Nov a marked open gap; the iron fence enters later scenes as a construction of 1864 with three selectable built forms (open iron railing as stipulated, low pipe-rail fence with hedge, low iron fence) and no default;')
rep(17, 'recon', 'the fence\'s state on 19 Nov, the platform\'s dimensions and the detail of the cemetery ground are open.', 'the iron fence\'s date (fall of 1864) and the flagstaff anchor are documented; what stood on the line on 19 Nov, the platform\'s dimensions and the detail of the cemetery ground are open.')
stat(17)

# ---- EG-18 season, sun, crowd, torches
app(18, 'desc', R3 + '"torch" was searched in the 601 local newspaper pages dated 18-25 Nov 1863: twelve pages, none about Gettysburg (torches and alcohol in the streets on 18 Nov stay unsupported); the Chicago Daily Tribune digits "between 30,000 and 50,000" were read again on the page image and are recorded as an image reading; the Indianapolis Daily State Sentinel of 24 Nov 1863 is cited as a second newspaper that prints the prayer line about foliage (garbled OCR) (R14.S-085, S-087, S-088).')
stat(18)

for e in E:
    pid = 'fence-3-EG-%02d' % e['n']
    rows = [('ID', pid), ('Requirement IDs', e['rids']), ('Category', e['cat']), ('Description', e['desc']),
            ('Why literal 100% is not possible or blocked', e['why']), ('Evidence searched', e['searched']),
            ('Autonomous substitute applied', e['subst']), ('Strongest evidence-based reconstruction', e['recon']),
            ('Confidence tier', e['tier']), ('Competing values', e['competing']), ('Product marking', e['marking']),
            ('Visual and audio impact', e['impact']), ('Review status', REV),
            ('Owner decision requested', e['owner_q']), ('Agent recommendation', e['rec']),
            ('Status', e['status']), ('Owner decision and date', DEC)]
    body = '# %s: %s\n\n| Field | Content |\n|---|---|\n' % (pid, e['title']) + ''.join(
        '| %s | %s |\n' % (a, str(b).replace('|', '/').replace('\n', ' ')) for a, b in rows)
    open(os.path.join(OUT, pid + '.md'), 'w', encoding='utf-8').write(body)
print('wrote', len(E), 'entries to', OUT)
