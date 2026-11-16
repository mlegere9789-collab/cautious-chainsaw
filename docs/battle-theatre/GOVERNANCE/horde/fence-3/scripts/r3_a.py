"""Round-3 patches for fence-3 (2026-11-16), applied after the round-2 patches.
New local evidence used here: the NPS Cultural Landscape Report of the national cemetery (2017), the Common Pride study (1981), the Record of Treatment (vols I, II),
the Emmitsburg Road Ridge inventory, the 1988 Boundary Study, the HABS records held by the Library of Congress, the NPS web page on the Confederate commanders (as served 2026-11-13),
Letterman's Medical Recollections (1866) and the page image of the Brien study (digits).
Every new or widened quote is cut from the raw local text between two anchors (r3lib / r2lib), so it cannot be typed wrong."""
import sys
sys.path.insert(0, '/home/user/cautious-chainsaw/tmp/fence-3/scripts')
from r3lib import (P3, OR_span, SV_span, LIB_span, WEB_span, NPSX, NPSWEB_CONFED, LET, BOUNDARY_URL, RUN, _fix)  # noqa

PATCHES = {}


def patch(sid):
    def deco(fn):
        PATCHES[sid] = fn
        return fn
    return deco


HABS_TITLE = 'Library of Congress record %s: %s (National Park Service, Historic American Buildings Survey %s)'


def HABS(n, a, b, title, survey, note=None):
    return NPSX('NPS-HABS-pa%s' % n, a, b, title=HABS_TITLE % ('pa' + n, title, survey), note=note)


def NPSBLDGS(a, b=None, note=None):
    """The saved NPS web page 'Buildings and Farms Then and Now' (tmp/fence-3/web/nps_bldgs.txt, as served 2026-11-13)."""
    return _fix(WEB_span('tmp/fence-3/web/nps_bldgs.txt', a, b, source_id='NPS-WEB-BLDGS',
                         source='NPS web page: Buildings and Farms Then and Now (last updated 18 Nov 2022); the PDF source key NPS-Bldgs', page=None, note=note,
                         extra={'url': 'https://www.nps.gov/gett/learn/photosmultimedia/buildings-and-farms-then-and-now.htm', 'fetched': '2026-11-13',
                                'page_basis': 'web page, no pagination'}))


# --------------------------------------------------------------------------------------------------
@patch('S-053')
def S053(d):
    p = P3(d)
    c = p.cite(NPSX('NPS-BOUNDARY-1988', 'donate 30 acres, known as the Taney Farm', 'during the battle.',
                    note='NPS Boundary Study (August 1988), pdf p.22 (the section on the boundary understanding of 1974): in 1986 a private conservation association tried to donate 30 acres known as the Taney Farm to the park. '
                         'The study names no building, no ruin and no fence; it does not say that the farm is the one on which the stone house of the New York volumes stood (an identification neither text makes).'))
    p.add('taney_farm_site_of_intense_skirmishing_nps_1988', 'The NPS Boundary Study of 1988 says that the Taney Farm (about 30 acres) "was the site of intense skirmishing between Union and Confederate troops during the battle"; it names no house, ruin or fence.',
          'documented', [c], support='partial',
          why='A secondary statement of the park about the farm as a whole; it fits the sharpshooter fight of S-053.2 but does not date it and does not mention the house, so it supports neither "ruins" nor any fence.')
    p.lookup('all local texts (3 Nov 2026 library, the 51 HABS records, the NPS Boundary Study 1988, 933 newspaper pages): "Taney" with ruin, razed, demolished or destroyed',
             'tmp/library (rg), pg.py', 'no statement that the Taney house was ruined or razed; the only new text is the Boundary Study (the farm was the scene of intense skirmishing; donation of 30 acres attempted in 1986)', 'done')
    p.rev('Round 3: the NPS Boundary Study of 1988 added (the Taney Farm, about 30 acres, "the site of intense skirmishing"); the end state "ruins" was searched again in all local texts including the HABS records and stays an open gap.')
    p.d['product_consequence'].append('Round 3: the NPS Boundary Study (1988) calls the Taney Farm "the site of intense skirmishing"; no house, ruin or fence is described: the Taney house stays standing with a breached front after the forenoon of 3 Jul; "ruins" remains a marked gap.')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-054')
def S054(d):
    p = P3(d)
    c = p.cite(NPSX('NPS-BOUNDARY-1988', 'Some historic farm buildings remain, including the Rummel barn', 'hospital site',
                    note='NPS Boundary Study (August 1988), pdf p.40, the paragraph on the East Cavalry Field. OCR "Con.federate" is Confederate; the sentence continues (OCR) ",qti/l IJearing scars of battle damage", '
                         'which reads "still bearing scars of battle damage": the PDF is not held locally, so the words after "site" were not checked on a page image and are not carried as a claim.'))
    p.add('confederate_hospital_site_nps_1988', 'The NPS Boundary Study of 1988 lists the Rummel barn among the historic farm buildings that remain and calls it "a Confederate hospital site"; the study gives no date, unit or number.',
          'documented', [c], support='partial',
          why='A secondary statement of the park: Confederate wounded were treated in or at the barn at some time during or after the fight of 3 Jul; the dismounted Confederates who held it on the afternoon of 3 Jul are in S-054.2. It does not support "plank walls" or "loopholes".')
    p.lookup('all local texts including the 51 HABS records and the NPS landscape documents: "loop-hole", "loophole", "port-hole" with Rummel or barn; Rummel with fence or rail',
             'tmp/library (rg)', 'no loophole statement for this barn (0 files); the only Rummel fence texts are Kidd (Michigan at Gettysburg) and the 2nd PA Cavalry history already cited', 'failed')
    p.rev('Round 3: the NPS Boundary Study of 1988 added ("the Rummel barn, a Confederate hospital site"); loopholes searched again in all local texts and still unsupported.')
    p.d['product_consequence'].append('Round 3: the NPS Boundary Study (1988) calls the Rummel barn "a Confederate hospital site" (undated): show Confederate wounded at the barn after the fight as a documented, undated use; loopholes remain a marked gap.')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-059')
def S059(d):
    p = P3(d)
    c = p.cite(NPSX('NPS-CLR-ROT-V1', 'In 1980, the park replanted the Brian Orchard and Leister Fruit Garden and both these features were extant', 'completion of the park’s GMP.',
                    raw=True, note='NPS Cultural Landscape Report, Record of Treatment vol. I, the chapter on David Ziegler and Frey fields: the park replanted the Brian Orchard and the Leister Fruit Garden in 1980; the report calls both "extant and representing battle-era character". '
                                    'OCR curly apostrophe in "park’s". (A drawing label of the same report, "Leister Orchard (existing, no rehab)", is a modern existing-conditions label and is not cited.)'))
    p.add('leister_fruit_garden_replanted_1980_as_a_battle_era_feature', 'The NPS Record of Treatment says the park replanted the Leister Fruit Garden in 1980 and that it was "extant and representing battle-era character": a battle-era fruit garden on the farm is implied; the statement says nothing about apple trees destroyed, a peach tree dying or any damage date.',
          'documented', [c], support='partial',
          why='A statement of the park about a replanted feature that represents the battle-era one, not about its loss in July 1863: the loss in S-059.6 stays an open gap.')
    p.lookup('all local texts including the 51 HABS records, NPS-HSR-LEISTER-BARN, NPS-CLR-ROT-V1/V2 and NPS-CLI landscape documents: "bedstead", Leister with peach, apple, orchard, spring, well',
             'tmp/library (rg, pg.py)', 'no bedstead, no destroyed apple trees, no peach tree dying and no spoiled spring at the Leister farm; new: the Leister Fruit Garden is called a battle-era feature (replanted 1980)', 'failed')
    p.rev('Round 3: the Leister Fruit Garden (NPS Record of Treatment: replanted 1980, "extant and representing battle-era character") added as a documented statement; the bedstead, the destroyed apple trees, the dead peach tree and the spoiled spring were searched again and stay open gaps.')
    hs = p.cite(NPSX('NPS-HSR-LEISTER-BARN', 'Mrs. Leister had left the farm on the evening of July 1', 'grave markers.', layout=True,
                     note='NPS Historic Structure Report on the Leister barn (1985), historical overview, printed p.5 of the section (pdf p.13); layout text variant. OCR "b a m" is barn.'))
    hs2 = p.cite(NPSX('NPS-HSR-LEISTER-BARN', 'The house was repaired within a few weeks', 'new siding.', layout=True,
                      note='Same report, next page (pdf p.14): the sentences after the passage above; OCR as printed.'))
    p.add('hsr_leister_found_the_farm_in_literal_ruins_siding_taken_for_firewood_and_grave_markers', 'The NPS Historic Structure Report (1985) says Mrs. Leister left the farm on the evening of 1 Jul and, returning several days later, "found the farm in literal ruins": dead horses littered the yard, the crops were trampled and both barn and house were damaged by shell fire "and troops who scrounged the siding for firewood and grave markers"; '
          'the house was repaired within a few weeks and the barn re-sided.',
          'documented', [hs, hs2], support='supported',
          why='An NPS secondary statement for the state after the battle: it names troops taking the barn siding (not the fence rails) for firewood and grave markers, and gives no list of items (bedstead, trees, spring), no date for the damage and no hay or rail count. It dates Mrs. Leister\'s absence (evening of 1 Jul to "several days later"), not the return to 7 Jul.')
    p.d['product_consequence'].append('Round 3: the NPS Historic Structure Report (1985) adds that troops took the barn siding for firewood and grave markers and that the house and the barn were repaired within a few weeks: show the barn stripped of siding after the battle (documented, no day) and repaired within weeks; the rails are a separate claim (NPS web page: "her fence rails had been burned").')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-062')
def S062(d):
    p = P3(d)
    sw_a = p.cite(NPSX('NPS-COMMON-PRIDE-1', 'W. H. Swallow was one of those writing within twenty years of the battle', None, pick=0,
                       note='NPS study "A Common Pride and Fame" part I, printed p.115 (pdf p.130): the study introduces W. H. Swallow, who wrote within twenty years of the battle (the long quotation that follows, from Stine, p. 538, runs on to pdf p.131).'))
    sw = p.cite(NPSX('NPS-COMMON-PRIDE-1', 'The fences of the Emmitsburg road, near', 'on our right.',
                     note='In the quotation of Swallow that the study prints (Stine, p. 538): "Garnett moved on Cemetery Hill by marching eastward to Gettysburg, north of Cordovie\'s house and outbuildings. The fences of the Emmitsburg road, near Cordovie\'s house, '
                          'had been nearly destroyed the day before in the battle on our right." Cordovie is the Codori house. A secondary account printed 1893 or earlier and quoted by the NPS; the soft hyphen "bat- tle" is in the text layer.'))
    fin = p.cite(NPSX('NPS-COMMON-PRIDE-1', 'G. W. Finley of Company K', 'against and over them.',
                      note='NPS study part I, printed p.139 (pdf p.155): Finley, Company K, 56th Virginia (the extreme left of Garnett\'s line), recalled it; the study itself carries the two accounts as a conflict in its note. OCR "Captáin".'))
    aik = p.cite(NPSX('NPS-CLR-ROT-V2', 'Colonel Aiken, commanding the 7th South Carolina', 'documented in the 1868 Warren Map.', raw=True, pick=0,
                      note='NPS Cultural Landscape Report, Record of Treatment vol. II, printed p.85 (pdf p.103): Aiken (7th South Carolina, Kershaw\'s brigade) on the afternoon of 2 Jul, having advanced across Rose Field 2. '
                           'The text layer holds this passage twice; the first occurrence is cited. The report adds that the worm fencing on the east boundary of Rose Fields 1-3 and Snyder Field 1 is documented in the 1868 Warren map.'))
    n = p.add('road_fences_at_the_charge_two_accounts', 'Two participants\' accounts of the Emmitsburg Road fences at the charge differ (carried as sector values, no default): Swallow (via the NPS study) says that near the Codori house the road fences "had been nearly destroyed the day before in the battle on our right"; '
              'Finley of the 56th Virginia (Garnett\'s left) says that when his regiment struck the road "the board fences were still mostly standing and there was a momentary check until our men went against and over them".',
              'documented', [sw_a, sw, fin], support='supported',
              why='Both statements are documented as statements (second-hand through the NPS study; Swallow wrote within twenty years, Finley recalled); they refer to different stretches of the road, so they are not necessarily contradictory. They narrow the printed "Intact -> Splintered / breached" to a sector-by-sector state: nearly destroyed near the Codori house before the charge, mostly standing on the Garnett left.')
    m = p.add('two_fences_lined_the_pike_on_2_jul_south_sector', 'On the afternoon of 2 Jul, in the Rose fields (Kershaw\'s brigade), two fences lined the pike: Aiken of the 7th South Carolina recalled that "Sharpshooters injured us while climbing the two fences that lined the pike [Emmitsburg Road]"; '
              'the NPS report adds worm fencing on the east boundary of Rose Fields 1-3 and Snyder Field 1 (Warren map, 1868).',
              'documented', [aik], support='supported',
              why='A participant\'s recollection quoted by the NPS: on 2 Jul, in the Rose-field sector (south of the Third Corps front), the pike was still lined by two fences (after the removals of the Third Corps front in S-062.4); not the sector of the charge.')
    p.edit(4, add_cites=[sw], why=p.sc(4)['why'] + ' Round 3: Swallow (via the NPS study) puts the fences near the Codori house "nearly destroyed the day before" (S-062.%d), and Finley the board fences "still mostly standing" on the Garnett left.' % n)
    p.verdict(corrected_claim=p.d['corrected_claim'] + ' Round 3: two participants disagree on the state at the charge (Swallow via the NPS: near the Codori house the fences "had been nearly destroyed the day before"; Finley, 56th Virginia: "the board fences were still mostly standing"), '
                              'and in the Rose and Snyder fields two fences still lined the pike on the afternoon of 2 Jul (Aiken): the road is a mosaic by sector and date, not "Intact" at 15:30.')
    p.lookup('NPS landscape documents (Common Pride I-III, CLR Record of Treatment I-II, CLI Pickett\'s Charge, CLI Emmitsburg Road Ridge) and all local texts: Emmitsburg Road fences before and at the charge; "836", "perforated"',
             'tmp/library/web/nps, tmp/library (rg)', 'new: Swallow (nearly destroyed near Codori\'s), Finley (mostly standing), Aiken (two fences on 2 Jul); the 836-hole rail and the perforated slabs are in no local text (0 files)', 'done')
    p.rev('Round 3: Swallow ("nearly destroyed the day before", via the NPS), Finley ("still mostly standing") and Aiken (two fences along the pike on 2 Jul) added from the NPS Common Pride study and the Record of Treatment vol. II; the 836-hole rail searched again and still unsupported.')
    p.d['product_consequence'].append('Round 3: the road fences at the charge are a mosaic by sector, two selectable sector values with no default: nearly destroyed near the Codori house before the charge (Swallow, via the NPS) and mostly standing on the Garnett left (Finley, 56th Virginia); in the Rose and Snyder fields two fences still lined the pike on the afternoon of 2 Jul (Aiken). "Intact" for the whole road at 15:30 must not be drawn.')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-063')
def S063(d):
    p = P3(d)
    # sub-claim 3: digits read from the page image (the text layer prints 195 panels and $175; the page image prints 194 and $174)
    s3 = p.sc(3)
    cid = s3['cites'][1]            # the "195 panels of fence" citation
    c7 = p.d['citations'][cid]
    assert c7['quote'] == '195 panels of fence', c7['quote']
    c7['note'] = ('Page 13 of the typescript (pdf p.15 of the file as served), the full line: "(195 panels of fence- part post and rail and part worm - worth $ 175; stone fence destroyed worth $5.00)" in the text layer. '
                  'The text layer is typewriter OCR in which the typewriter 4 is read as 5: the page image reads "(194 panels of fence--part post and rail and part worm - worth $174; stone fence destroyed worth $5.00)". '
                  'The claim carries the page-image reading (see image_reading).')
    p.image_reading(cid, '195 panels of fence ... worth $ 175', '194 panels of fence ... worth $174', 'the typewriter 4 of "194" and "$174" (the text layer reads 5)',
                    'crop of the page image of pdf p.15 of tmp/library/web/nps/NPS-BRIEN-FARM/NPS-BRIEN-FARM.pdf made by the web-evidence workstream (tmp/library/web/nps/_img/brien/p15-crop.png), viewed 2026-11-16; the digits "$5.00" and "75 years" on the neighbouring pages show the typewriter 5 as a distinct glyph. '
                    'The same two figures are recorded as corrected in horde/ws-web/nps/extracts/CORRECTIONS.md (NPSX-BRIEN-FARM-p015-03).',
                    ['tmp/library/web/nps/_img/brien/p15-crop.png', 'tmp/library/web/nps/_img/brien/p-15.png'])
    s3['kind'] = 'claim_194_panels_page_image_reading'
    s3['claim'] = s3['claim'].replace('195 panels', '194 panels').replace('$175', '$174')
    assert '194 panels' in s3['claim'] and '$174' in s3['claim'], s3['claim']
    s3['why'] = s3['why'] + ' Round 3: the figures are the page-image reading (194 panels, $174), not the text layer (195, $175).'
    for sc in p.d['subclaims']:
        if sc is s3:
            continue
        for k in ('claim', 'why'):
            if k in sc and ('195 panels' in sc[k] or '$175' in sc[k]):
                sc[k] = sc[k].replace('195 panels', '194 panels').replace('$175', '$174')
    # the other places that carried the OCR digits
    for k in ('corrected_claim',):
        if '195 panels' in p.d[k]:
            p.d[k] = p.d[k].replace('195 panels', '194 panels')
    p.d['product_consequence'] = [x.replace('195 panels', '194 panels').replace('$175', '$174') for x in p.d['product_consequence']]
    p.lookup('page image of pdf p.7 and p.15 of NPS-BRIEN-FARM.pdf (typewriter digits)', 'tmp/library/web/nps/NPS-BRIEN-FARM/NPS-BRIEN-FARM.pdf, tmp/library/web/nps/_img/brien',
             'p.15: 194 panels and $174 (the text layer reads 195 and $175); p.7: "$15, out of $1,028" read as printed (legible)', 'done')
    p.rev('Round 3: the page image of the Brien study (typewriter digits) reads 194 panels and $174, not the text layer\'s 195 and $175; the figures $15 and $1,028 were read on the page image of p.7 and agree with the text layer.')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-066')
def S066(d):
    p = P3(d)
    b88 = p.cite(NPSX('NPS-BOUNDARY-1988', 'The 11th Corps hospital located here was the site of General Armistead', 'death',
                      note='NPS Boundary Study (August 1988), pdf p.39, on the George Spangler Farm (85 acres): "Used by Union forces as a hospital site, artillery park and troop movement area ... The 11th Corps hospital located here was the site of General Armistead\'s death" '
                           '(the OCR continues "and lntrial", read as "and burial"; not carried).'))
    rot = p.cite(NPSX('NPS-CLR-ROT-V1', 'The complex provided cover and concealment for Union reserve units of the 5th Corps and the Artillery Reserve', 'Corps feld hospital', raw=True,
                      note='NPS Cultural Landscape Report, Record of Treatment vol. I, printed p.307 (pdf p.333), the George Spangler Farm complex; OCR "feld" is field.'))
    p.edit(1, add_cites=[b88, rot], why=p.sc(1)['why'] + ' Round 3: the NPS Boundary Study (1988) and the Record of Treatment vol. I name the 11th Corps hospital at the George Spangler farm and the first adds that it was "the site of General Armistead\'s death".')
    p.rev('Round 3: the NPS Boundary Study (1988) and the Record of Treatment vol. I added to the place of the hospital (11th Corps, George Spangler farm).')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-072')
def S072(d):
    p = P3(d)
    web = p.cite(NPSWEB_CONFED('Brigadier General Lewis Armistead led his troops on foot', 'the day after his wounding.',
                               note='NPS web page "Confederate Commanders at Gettysburg", the entry on Lewis Armistead (wounded and captured in the charge of 3 Jul): "He died in a Federal field hospital the day after his wounding." The page names neither the farm nor the hour and cites no basis. '
                                    'The text is the page as served on 2026-11-13 (saved by the web-evidence workstream); the NPS pages are replaced from time to time.'))
    b88 = p.cite(NPSX('NPS-BOUNDARY-1988', 'The 11th Corps hospital located here was the site of General Armistead', 'death',
                      note='NPS Boundary Study (August 1988), pdf p.39, the George Spangler Farm entry (the OCR continues "and lntrial", read as "and burial"; not carried).'))
    p.add('death_date_two_nps_statements_4_jul_or_5_jul', 'The NPS gives two dates for Armistead\'s death: its web page "Confederate Commanders at Gettysburg" says he "died in a Federal field hospital the day after his wounding" (4 Jul for a wound of 3 Jul), '
          'while the NPS study "A Common Pride and Fame" reports Holland\'s recollection of "about 9:00 A. M. on July 5, 1863" (S-072.1). Both values stay selectable; no default is chosen here.',
          'documented', [web], support='partial',
          why='The web page is a general NPS statement with no basis cited and no place or hour; the study\'s date and hour rest on Holland (1921, second-hand through the NPS). They differ by one day. Brinton, the attending surgeon, gives no date of death in the letter the study quotes. '
              'The delegated decision DD-F3-10 records the default and keeps the other value.')
    p.add('place_the_11th_corps_hospital_at_the_george_spangler_farm_nps_1988', 'The NPS Boundary Study of 1988 puts Armistead\'s death at the 11th Corps hospital on the George Spangler farm ("the site of General Armistead\'s death"), agreeing with the Common Pride study (Brinton, 2nd Division, 11th Corps hospital at the George Spangler farm); neither names a building.',
          'documented', [b88, 'c3'], support='supported',
          why='Two NPS documents name the same hospital and farm; the building (summer kitchen or trees) is in no local text (S-072.3).')
    p.lookup('all local texts: Armistead with "summer kitchen" or kitchen; Armistead with George Spangler; NPS pages and the 1988 Boundary Study', 'tmp/library (rg)',
             'no kitchen statement (0 files); new: the NPS web page ("the day after his wounding", a conflict with 5 Jul) and the Boundary Study (the 11th Corps hospital at the George Spangler farm was the site of his death)', 'done')
    p.rev('Round 3: the NPS web page (died "the day after his wounding": 4 Jul) added as a second selectable value against Holland\'s 5 Jul 09:00; the Boundary Study (1988) added for the place; the summer kitchen searched again and still unsupported.')
    p.d['product_consequence'].append('Round 3: Armistead\'s death date has two selectable values from the NPS: 5 Jul about 09:00 (Holland, via the Common Pride study) and 4 Jul (the NPS web page: "the day after his wounding"); the place is the 11th Corps hospital at the George Spangler farm (Boundary Study 1988, Common Pride study); no building is documented.')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-071')
def S071(d):
    p = P3(d)
    habs = p.cite(HABS('1357', 'The farm house was used by General Alfred Pleasonton of the Union as a headquarters', 'suffered various amounts of damage.',
                       'Hummelbaugh Farm, Pleasonton Avenue, Gettysburg', 'HABS PA-1961',
                       note='The record\'s "Significance" note (the structure is dated ca. 1845; "Documentation compiled after 1933"). The note does not say on which days Pleasonton was there, which corps used the house as a hospital or when Barksdale died.'))
    rot = p.cite(NPSX('NPS-CLR-ROT-V1', 'The Hummelbaugh Farm, similar to the other farms', 'Pleasonton’s headquarters.',
                      note='NPS Cultural Landscape Report, Record of Treatment vol. I, printed p.193 (pdf p.219), "Hummelbaugh Orchard Replanting": the farm stood behind the main Union line on Cemetery Ridge on the west side of the Taneytown Road. '
                           'The next sentences place the 149th Pennsylvania at the picket line on the morning of 3 Jul (footnote 24); footnote 23 is the source of the headquarters sentence.'))
    # 71.2 and 71.3 are rewritten from open gaps into documented statements; a new open gap keeps what is still unsupported
    p.edit(2, kind='hospital_use_by_union_troops_and_barksdale_died_at_the_house',
           claim='The Hummelbaugh farm house was used as a hospital by U.S. troops and Confederate Brig. Gen. Barksdale "died at the house and was buried on the grounds" (HABS PA-1961, NPS); the Record of Treatment names "hospital use" among the farm\'s uses during the battle.',
           tier='documented', support='supported', cites=[habs, rot],
           why='Two NPS documents agree on hospital use; HABS adds Barksdale\'s death at the house. Neither names the corps, the dates of use or the hour of Barksdale\'s death. Round 3: this replaces the round-1 open gap "no local text".')
    p.edit(3, kind='pleasonton_headquarters_during_the_early_stages_of_the_battle',
           claim='General Pleasonton\'s headquarters stood at the Hummelbaugh farm "during the early stages of the battle" (NPS Record of Treatment) or "during the Battle of Gettysburg" (HABS); neither text gives 4-6 Jul.',
           tier='documented', support='supported', cites=[rot, habs],
           why='The printed "Jul 4-6" is not what the NPS says: the Record of Treatment puts the headquarters in the early stages of the battle (before the farm lay behind the main line under fire), HABS says "during the Battle". Pleasonton\'s own report (OR27-1 R336) names no headquarters site.')
    p.add('second_corps_hospital_2_3_jul_and_the_dates_4_6_jul', 'The farm was a Second Corps hospital on 2-3 Jul, Barksdale died there on 2 or 3 Jul, and Pleasonton\'s headquarters stood there on 4-6 Jul (printed).',
          'open_gap', [], support='none',
          why='No local text names the corps, the days of the hospital use or the hour of Barksdale\'s death, and none dates Pleasonton\'s stay to 4-6 Jul (the NPS puts it in the early stages of the battle). The plan\'s source SS-Hummelbaugh is a lead source (refused host).')
    p.verdict(verdict='corrected', corrected_claim='Hummelbaugh farm (Taneytown Road, behind Cemetery Ridge): the NPS documents hospital use by Union troops and Confederate Brig. Gen. Barksdale\'s death at the house (HABS PA-1961), and Pleasonton\'s headquarters "during the early stages of the battle" '
                                                  '(Record of Treatment; HABS: "during the Battle of Gettysburg"), not on 4-6 Jul as printed; the house stood in 1863 (NPS 1999). No local text names the corps, the dates of the hospital use or the hour of Barksdale\'s death.')
    p.unsupported_set(['That the farm was a Second Corps hospital on 2-3 Jul, the dates of the hospital use and the hour of Barksdale\'s death (no local text; PDF source SS-Hummelbaugh, refused host).',
                       'Pleasonton\'s headquarters on 4-6 Jul (the NPS places it in the early stages of the battle).'])
    p.product(['State schedule S-071: replace the printed window "Jul 4-6" by "headquarters of Pleasonton during the early stages of the battle (day not documented)" and keep the hospital use as documented without dates; Barksdale\'s death at the house is documented (HABS); '
               'mark the corps and the dates of the hospital use as an open gap. The house stands in 1863 (NPS 1999); no yard or garden fence is created from this row (the picket fences of the yard and garden are documented in the 1872 survey and the Tipton photographs, not for 1863).'])
    p.lookup('all local texts including the new HABS records and the NPS Record of Treatment: Hummelbaugh with hospital, Pleasonton, headquarters, Barksdale',
             'tmp/library/web/nps (NPS-HABS-pa1357, NPS-CLR-ROT-V1), tmp/library (rg)',
             'found: HABS PA-1961 (Pleasonton\'s headquarters during the battle, hospital use by U.S. troops, Barksdale died at the house) and the Record of Treatment ("during the early stages of the battle", "hospital use"); the corps, the dates and the hour are not given', 'done')
    p.rev('Round 3: HABS PA-1961 (Library of Congress record pa1357) and the Record of Treatment vol. I document hospital use, Pleasonton\'s headquarters in the early stages of the battle and Barksdale\'s death at the house; the row moves from unsupported to corrected and the printed "Jul 4-6" is contradicted.')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-073')
def S073(d):
    p = P3(d)
    h = p.cite(NPSX('NPS-CLI-ERR', 'It was used for temporary hospital purposes after the evacuation', 'July 5.',
                    note='NPS Cultural Landscapes Inventory: Emmitsburg Road Ridge Battlefield (2024), printed p.77 (pdf p.82), the entry "Abraham (Catherine) Trostle Farm House" (National Register 2004, Section 7, p.14).'))
    b = p.cite(NPSX('NPS-CLI-ERR', 'It is likely that the barn served temporarily', 'July 5.',
                    note='Same inventory, the entry "Abraham (Catherine) Trostle Farm Barn" (National Register 2004, Section 7, p.11): the statement is hedged ("It is likely").'))
    p.add('hospital_use_after_the_evacuation_of_5_jul_nps', 'The NPS says the Trostle farm house "was used for temporary hospital purposes after the evacuation of the Confederate army on July 5" and that "it is likely that the barn served temporarily for hospital purposes after close of the fighting on July 5"; neither says when the use ended.',
          'documented', [h, b], support='partial',
          why='Hospital use is documented to have continued after 5 Jul (the house) and is likely for the barn (hedged); this does not give an end date and does not support "abandoned by Jul 6": the printed end state remains an open gap (S-073.3) and the use may have run past 6 Jul.')
    p.verdict(corrected_claim=p.d['corrected_claim'] + ' Round 3: the NPS says the farm house "was used for temporary hospital purposes after the evacuation of the Confederate army on July 5" and the barn likely so (hedged), so use after 5 Jul is documented and "abandoned by 6 Jul" is not supported.')
    p.lookup('NPS landscape documents (CLI Emmitsburg Road Ridge), the HABS records (Trostle barn, Trostle summer kitchen) and all local texts: Trostle hospital end, abandoned, closed, removed',
             'tmp/library/web/nps (NPS-CLI-ERR, NPS-HABS-pa1728, NPS-HABS-pa4187), tmp/library (rg)', 'new: use after the evacuation of 5 Jul (house) and likely (barn); no end date; the HABS records give Sickles\'s headquarters on 2 Jul and the summer kitchen under construction in July 1863, not the hospital end', 'done')
    p.rev('Round 3: the NPS inventory of the Emmitsburg Road Ridge (hospital use of the house after the evacuation of 5 Jul; likely the barn) added; the printed end "abandoned by Jul 6" stays an open gap and the use may have run past it.')
    p.d['product_consequence'].append('Round 3: hospital use of the house after the evacuation of 5 Jul is documented (NPS) and likely for the barn (hedged); the end date stays an open-gap marker and "abandoned by 6 Jul" must not be drawn as fact.')
    la = p.cite(LET('it was discovered on the 6th that he was in', 'the Army moved toward the Potomac.', page='158', note='Letterman, Medical Recollections (1866), the Gettysburg chapter.'))
    lb = p.cite(LET('As I was obliged to leave with the Commanding General', 'U. S. Volunteers.', page='158'))
    lc = p.cite(LET('Six hundred and fifty Medical officers had been busily', 'night of the 6th.', page='158'))
    ld = p.cite(LET('One-third of the operating', 'were ordered to remain.', page='159', note='Printed p.159 (after the running head "THE ARMY OF THE POTOMAC. 159").'))
    le = p.cite(LET('four wagons and six ambulances from each corps were', 'railroad depot.', page='158', note='The text layer prints "away,," (a doubled comma).'))
    p.add('army_and_hospital_staffs_moved_on_6_7_jul_letterman_1866', 'Letterman (1866): on 6 Jul the enemy was found to be in retreat and "on that day and the next the Army moved toward the Potomac"; he left the wounded under the general charge of Surgeon Henry Janes, retained four wagons and six ambulances from each corps to carry supplies to the hospitals and the wounded to the railroad depot, '
          'the medical officers had been "busily employed ... until the night of the 6th" and "one-third of the operating staff, with other Medical officers, numbering over one hundred, were ordered to remain".',
          'documented', [la, lb, lc, ld, le], support='partial',
          why='Supports the printed trigger "Staff move" and the date "by Jul 6" only in general: the corps hospitals lost most of their staffs when the army marched on 6-7 Jul, a third of the operating staff and more than a hundred medical officers remained. It names no corps hospital and not the Trostle farm, and it does not say that any hospital was abandoned.')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-070')
def S070(d):
    p = P3(d)
    l1 = p.cite(LET('These were of much service when they arrived', 'after the battle.', page='156',
                    note='Letterman, Medical Director of the Army of Potomac, on the wagons with the tents and extra supplies that the Commanding General at first kept back (printed p.156).'))
    l2 = p.cite(LET('As soon as the battle terminated, I requested the Commanding General', 'half the number of wagons.', page='156',
                    note='The sentences before the quotation above: Letterman asked for the wagons with the tents at once and got leave for half of them.'))
    l3 = p.cite(LET('Houses and barns, but chiefly the woods, were used as hospitals', 'and the wounded, necessarily,', page='156',
                    note='The sentence runs on to the next page: "endured much suffering." (printed p.157, after the running head).'))
    l4 = p.cite(LET('Had the weather been pleasant', 'would not have occurred.', page='157',
                    note='Printed p.157; OCR line break "pleas- ant".'))
    p.edit(3, tier='documented', support='partial', kind='exposed_wounded_in_rain_after_the_battle',
           claim='Wounded men lay exposed to the rain at the hospital sites after the battle: Letterman (1866) says the wagons with the tents "could not reach the field in time to protect the wounded from the drenching rain which fell after the battle", that "houses and barns, but chiefly the woods, were used as hospitals" and that "had the weather been pleasant, much of this suffering would not have occurred"; Haskell dates the floods of rain to 4 Jul. '
                 '"Cold" and the individual sites are not documented.',
           cites=['c1', 'c3', 'c4', l1, l2, l3, l4],
           why='Round 3: the Medical Director of the army states the exposure in his own account (retrospective, 1866); the date 4 Jul comes from Haskell and Lee; the temperature ("cold") is in no text. The printed "cold rain on exposed wounded at the hospital sites" is therefore documented for the exposure and the rain, not for "cold" or for named sites.')
    p.verdict(corrected_claim='On 4 Jul it rained heavily (Haskell, Lee) and the tents and appliances for the wounded had not reached the field until 5 Jul (Letterman, report): the wounded lay unprotected in "the drenching rain which fell after the battle", in houses, barns and "chiefly the woods" (Letterman, Medical Recollections, 1866: "much of this suffering" would not have occurred in pleasant weather); the temperature ("cold") and the individual sites are not documented.')
    p.product(['State schedule S-070 / GROUP-hospital-sites: rain on 4 Jul (documented: Haskell, Lee); the wounded lay unsheltered in "the drenching rain which fell after the battle" with the hospitals "chiefly the woods" and few tents until 5 Jul (documented: Letterman, report and Recollections of 1866); '
               'show exposed wounded in the rain at the sites without cover as a documented state (no named site list); no temperature claim ("cold" is in no text).'])
    p.lookup('Letterman, Medical Recollections of the Army of the Potomac (1866; local PDF, text layer extracted 2026-11-16): Gettysburg, rain, tents, hospitals; all local texts for "cold" rain at the hospitals',
             'tmp/library/medical/LETTERMAN-1866-PDF (pdftotext), tmp/library (rg)', 'found: pp.156-157 (drenching rain after the battle, tents and wagons delayed, houses, barns and chiefly the woods as hospitals); "cold" is in no text', 'done')
    p.rev('Round 3: Letterman\'s Medical Recollections (1866, pp.156-157) document that the wounded lay exposed to "the drenching rain which fell after the battle" with the hospitals chiefly in the woods; S-070.3 moves from inferred to documented (exposure and rain), "cold" and the sites stay unsupported.')
    return p.finish()


@patch('S-069')
def S069(d):
    p = P3(d)
    l1 = p.cite(LET('These were of much service when they arrived', 'after the battle.', page='156',
                    note='Letterman, Medical Director of the Army of the Potomac (printed p.156): the wagons with the tents reached the field too late "to protect the wounded from the drenching rain which fell after the battle".'))
    p.edit(1, add_cites=[l1], why=p.sc(1)['why'] + ' Round 3: Letterman (1866) adds "the drenching rain which fell after the battle" as a fourth witness (no day named).')
    p.lookup('NPS landscape documents and all local texts: Plum Run with overflow, flooded, swollen, drowned in 1863', 'tmp/library/web/nps (CLI Little Round Top, Record of Treatment), tmp/library (rg)',
             'only modern statements (the stream floods the valley in periods of heavy rain today: CLI Little Round Top); no 1863 overflow and no drowned wounded at Plum Run', 'failed')
    p.rev('Round 3: Letterman (1866) added to the heavy-rain sub-claim; the overflow of Plum Run searched again (only a modern NPS statement) and stays unsupported.')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-078')
def S078(d):
    p = P3(d)
    c = p.cite(NPSBLDGS('The McPherson barn is the only remnant of the farm today.', 'in 1895',
                        note='NPS web page "Buildings and Farms Then and Now" (as served 2026-11-13): "The McPherson barn is the only remnant of the farm today. The home burned down in 1895 and the center wagon shed no longer stands."'))
    p.edit(2, add_cites=[c], why=p.sc(2)['why'] + ' Round 3: the sentence "The McPherson barn is the only remnant of the farm today" is now inside a cited quotation (it was named here but not quoted).')
    p.rev('Round 3: the NPS sentence "The McPherson barn is the only remnant of the farm today" added as a quotation to S-078.2, which named it without quoting it.')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-079')
def S079(d):
    p = P3(d)
    h = p.cite(HABS('1692', 'The barn was constructed approximately 1812', 'acquired the site in 1958.', 'Rose Barn, Emmitsburg Road (U.S. Route 15), Gettysburg', 'HABS PA-5348',
                    note='The record\'s "Significance" note on the 225-acre George Washington Rose Farm: built about 1812, a stone-gabled barn that became a battlefield landmark on the second day; "a number of Confederate soldiers were once buried in the immediate vicinity of the barn" (not quoted). '
                         'The span includes the sentences that name Semmes\'s brigade and General Semmes.'))
    p.add('rose_barn_built_ca_1812_roof_lost_in_a_1934_windstorm_no_fire_named', 'The HABS record of the Rose barn dates it to about 1812 and says "the roof was destroyed in a 1934 windstorm and the barn was allowed to deteriorate" until the NPS acquired the site in 1958; it names no fire and no year 1910.',
          'documented', [h], support='partial',
          why='A different later history from the plan\'s "Rose barn burned 1910": the HABS note (compiled after 1933, so it can know of 1910) names only the 1934 windstorm. This does not prove that no fire occurred; it shows the claim is unsupported by the NPS record and conflicts in emphasis. The barn that stood in 1863 survives in its stone gables.')
    p.lookup('all local texts including the 51 HABS records and the NPS landscape documents: Codori with 1882, torn down, razed, demolished; Rose barn with burned, fire, 1910', 'tmp/library (rg)',
             'no 1882 demolition of the Codori barn and no 1910 fire of the Rose barn (0 files); new: HABS PA-5348 (Rose barn: built about 1812; roof destroyed in a 1934 windstorm; no fire named)', 'failed')
    p.rev('Round 3: HABS PA-5348 (Rose barn: about 1812; roof destroyed in a 1934 windstorm; no fire named) added; the Codori demolition of 1882 and the Rose fire of 1910 were searched again in all local texts and stay unsupported.')
    p.d['product_consequence'].append('Round 3: the Rose barn of about 1812 stands in its stone gables (HABS PA-5348: roof destroyed in a 1934 windstorm; no fire named); the printed fire of 1910 and the Codori demolition of 1882 stay unsupported markers (out of the battle animation).')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-082')
def S082(d):
    p = P3(d)
    fall = p.cite(NPSX('NPS-CLR-CEMETERY', 'Along the boundary with Evergreen Cemetery', 'installed in the fall of', raw=True,
                       note='CLR 2017, printed p.58 (pdf p.77), section "Site History 1863-1872": the sentence is broken by the caption of Figure 1.50 in the text layer and continues on the next page with the year ("1864. This three-foot tall, 1,726-foot long fence", cited next). '
                            'The hyphenation "Ever- green" is the line break.'))
    fence = p.cite(NPSX('NPS-CLR-CEMETERY', '1864. This three-foot tall, 1,726-foot long fence', '(fig. 1.52)', raw=True,
                        note='CLR 2017, printed p.59 (pdf p.78): the continuation of the sentence of the previous citation ("... was a simple iron fence installed in the fall of 1864"); the report goes on that the local paper said the fence gave "much satisfaction".'))
    cap = p.cite(NPSX('NPS-CLR-CEMETERY', 'Later photograph of the pipe-rail fence and declining', 'photographed ca. 1908', raw=True,
                      note='Caption of Figure 1.52 (printed p.59, pdf p.78): the pipe-rail fence and the arborvitae hedge on the Evergreen boundary were built and planted in 1864.'))
    wills = p.cite(NPSX('NPS-CLR-CEMETERY', 'In December 1864, David Wills reported', 'were almost complete', raw=True,
                        note='CLR 2017, printed p.57 (pdf p.76): Wills\'s report of December 1864 on the works of the national cemetery.'))
    jul = p.cite(NPSX('NPS-CLR-CEMETERY', 'On July 29, 1864, the cemetery', 'design of the central monument', raw=True,
                      note='CLR 2017, printed p.57 (pdf p.76): the first major construction project approved on 29 Jul 1864 was the enclosure wall; the report says the committee "likely" approved the requests for proposals for the other features, among them the iron fence on the boundary with Evergreen (a hedged statement).'))
    wf = p.cite(NPSX('NPS-CLR-CEMETERY', 'Most of the fences were probably taken down during the battle', 'reinforce breastworks.', raw=True,
                     note='CLR 2017, printed p.30 (pdf p.49): the fences of the four fields of the cemetery site in July 1863 (hedged: "probably"); OCR "fiverail" is five-rail.'))
    wr = p.cite(NPSX('NPS-CLR-CEMETERY', 'The Weirick field at the south end', 'Evergreen Cemetery to the east.', raw=True,
                     note='CLR 2017, printed p.26 (pdf p.45): the field fences of the cemetery site in July 1863; the boundary between the Weirick field and Evergreen Cemetery was "the grove of trees and a wood fence along Evergreen Cemetery to the east".'))
    # 82.5 is rewritten: the printed claim is contradicted for 19 Nov 1863 by the dated installation
    p.edit(5, kind='iron_boundary_fence_installed_in_the_fall_of_1864', tier='documented', support='supported',
           claim='The iron fence on the boundary with Evergreen Cemetery was installed in the fall of 1864: the NPS CLR (2017) says the sale condition of 14 Aug 1863 ("an open iron railing enclosure of ordinary height") was met by "a simple iron fence installed in the fall of 1864" (three feet tall, 1,726 feet long, cast in Philadelphia), the caption of its Figure 1.52 says the pipe-rail fence and the arborvitae hedge were "built and planted in 1864", the executive committee approved the enclosure wall on 29 Jul 1864 '
                 'and "likely" also the requests for proposals for the iron fences (the boundary with Evergreen among them) and in December 1864 Wills reported "a fence between the two cemeteries" almost complete.',
           cites=[fall, fence, cap, wills, jul, 'c7'],
           why='The printed state "an iron fence separated the new cemetery from Evergreen Cemetery" on 19 Nov 1863 is therefore an anachronism for the fence of the Saunders design (S-082.7); the stipulation of 14 Aug 1863 (S-082.3) is a requirement, not a fence. Round 3: this replaces the round-2 open gap. '
               'What stood on the line itself on 19 Nov 1863 is a separate open gap (S-082.8).')
    p.add('iron_fence_not_standing_on_19_nov_1863_inference', 'Consequently the iron boundary fence of the Saunders design did not stand on 19 Nov 1863: an inference from the dated installation (fall of 1864), the sale condition of 14 Aug 1863 being still a requirement and the cemetery being "unfinished" on 19 Nov; no local text describes an earlier iron fence on the line.',
          'inferred', [fall, cap, 'c3'], support='partial',
          why='The installation date is documented (S-082.5); that no iron fence stood on the line on the dedication day follows from it unless a temporary iron fence existed, which no text says. The Tribune correspondent of that morning mentions no iron fence in the legible part of his description (S-082.2).')
    p.add('dividing_line_on_19_nov_1863_not_documented', 'What marked the line between the soldiers\' ground and Evergreen Cemetery on 19 Nov 1863 (a temporary fence, a remnant of a field fence, the grove, nothing) is not documented: the CLR says the field fences of the site were "probably" mostly taken down during the battle, '
          'and before the battle the Weirick field was bounded on the Evergreen side by "the grove of trees and a wood fence".',
          'open_gap', [wf, wr], support='none',
          why='Hedged statements about July 1863 (fences "probably" taken down) and a pre-battle layout; no text describes the line on the dedication day. Marked as a visible gap: no iron fence and no stone wall may be drawn; the field fences are documented before the battle, not on 19 Nov.')
    p.verdict(status='closed', corrected_claim=p.d['corrected_claim'] + ' Round 3: the iron fence on the Evergreen line is dated to the fall of 1864 by the CLR (installed in the fall of 1864; "built and planted in 1864"; "almost complete" in December 1864), so it did not stand on 19 Nov 1863 (an inference from the installation date: no text describes an earlier iron fence); the state of the line itself on that day is not documented.')
    p.unsupported_set(['What stood on the line between the soldiers\' ground and Evergreen Cemetery on 19 Nov 1863 (no text; the CLR says only that the field fences were probably mostly taken down during the battle).',
                       'The plan\'s "iron fence" for 19 Nov 1863 is contradicted by the dated installation of the fall of 1864 (the plan\'s key W-CONS is Wikipedia, not admissible).'])
    p.product(['State schedule S-082 / WS-082-layout: keep the semicircle (documented). Do NOT draw the iron boundary fence on 19 Nov 1863: the NPS CLR (2017) dates it to the fall of 1864 (installed in the fall of 1864; fence and arborvitae hedge "built and planted in 1864"; "almost complete" in December 1864); '
               'it enters the scene as a construction in 1864, never as a pre-placed object, and its three built forms (low pipe-rail fence and hedge, three-foot iron fence behind arborvitae, low iron fence) stay selectable for scenes after it was built. '
               'The line between the soldiers\' ground and Evergreen Cemetery on 19 Nov 1863 is a marked open gap: nothing is documented on the line itself (the CLR says the field fences of the site were probably mostly taken down during the battle; before the battle a wood fence and a grove bounded the Weirick field on the Evergreen side). '
               'Evergreen\'s frontage fence in 1863: temporary white-painted wood plank fence (CLR). The stone enclosure of the whole grounds is future on 19 Nov (Tribune, 21 Nov 1863; the first construction project approved on 29 Jul 1864): do not draw a stone wall as built.'])
    p.lookup('NPS CLR of the national cemetery (2017, full text, content-stream variant): the boundary fence with Evergreen Cemetery, installation date; the field fences of July 1863', 'tmp/library/web/nps/NPS-CLR-CEMETERY',
             'found: "a simple iron fence installed in the fall of 1864"; Figure 1.52 "built and planted in 1864"; Wills, December 1864: "a fence between the two cemeteries" almost complete; the field fences "probably" taken down during the battle', 'done')
    p.rev('Round 3: the NPS CLR (2017) dates the iron boundary fence to the fall of 1864 (also "built and planted in 1864" and "almost complete" in December 1864): the printed claim for 19 Nov 1863 is contradicted, S-082.5 moves from open gap to documented, the consequence for 19 Nov 1863 is an inferred sub-claim (S-082.7), the state of the line itself becomes a new open gap (S-082.8) and the row is closed.')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-083')
def S083(d):
    p = P3(d)
    cap = p.cite(NPSX('NPS-CLR-CEMETERY', 'Figure 1.40. Sketch of Evergreen Cemetery', 'annotated by SUNY ESF)', raw=True,
                      note='CLR 2017, printed p.52 (pdf p.71), the whole caption: a sketch looking west across Baltimore Pike, circa 18 Nov 1863, detail of a Joseph Becker sketch in the Becker Collection (Boston College).'))
    f1 = p.cite(NPSX('NPS-CLR-CEMETERY', 'The flagstaff, erected at the center of the semi-circular plot', 'was to be placed,', raw=True,
                     note='CLR 2017, printed p.51 (pdf p.70): the account of the dedication arrangements; the sentence continues on the next page (cited next).'))
    f2 = p.cite(NPSX('NPS-CLR-CEMETERY', 'was a two-section pole', 'feet tall.', raw=True,
                     note='CLR 2017, printed p.52 (pdf p.71): the continuation of the sentence of the previous citation (the caption of Figure 1.40 stands between them in the text layer).'))
    p.edit(1, cites=['c2', cap], why=p.sc(1)['why'] + ' Round 3: the first quotation was the second sentence of the caption of the Becker sketch; the caption is now quoted whole, with its date ("circa November 18, 1863") and the sketch named.')
    p.add('flagstaff_at_the_centre_of_the_semi_circular_plot_where_the_monument_was_to_stand', 'The CLR says the flagstaff stood "at the center of the semi-circular plot of Union graves where the central monument was to be placed" (a two-section pole about seventy-five feet tall); the Becker sketch shows the grandstand to the left of the flagstaff within Evergreen Cemetery, and the flagstaff "roughly on the border between the two cemeteries".',
          'documented', [f1, f2, cap], support='supported',
          why='Gives the platform an anchor in the product: next to a 75-ft pole at the centre of the planned semicircle (the later monument site); the sketch, not a measurement, puts the stand on the Evergreen side of it. The Sentinel and the Evening Star put it "in the centre" of the grounds (S-083.3); no text gives the footprint.')
    p.rev('Round 3: the caption of the Becker sketch is quoted whole (the first quotation was its second sentence); the CLR statement that the flagstaff stood at the centre of the semi-circular plot where the monument was to be placed (about 75 ft) added as an anchor for the platform.')
    p.d['product_consequence'].append('Round 3: anchor the platform to the flagstaff, a two-section pole of about seventy-five feet at the centre of the semi-circular plot where the central monument was to be placed (CLR 2017); the Becker sketch of about 18 Nov puts the grandstand to the left of the flagstaff within Evergreen Cemetery; the three placements stay selectable and no dividing fence is drawn (S-082: the iron fence dates from the fall of 1864).')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-084')
def S084(d):
    p = P3(d)
    c = p.cite(NPSX('NPS-CLR-CEMETERY', 'After fighting ceased on July 3, 1863, the site', 'torn-up fields.', raw=True,
                    note='CLR 2017, printed p.24 (pdf p.43): the state of the national cemetery site after the fighting; hedged, the report says "At least one regiment held its position ... until July 5th, while others retreated immediately".'))
    rp = p.cite(NPSX('NPS-CLR-CEMETERY', 'the Evergreen Cemetery Association probably made some initial repairs in time for the national cemetery dedication on', 'November 19, 1863', raw=True,
                     note='CLR 2017, printed p.54 (pdf p.73): the sentence begins "To the south, the Evergreen Cemetery Association probably made some initial repairs ..." and goes on to the repair of monuments, the plank fence on Baltimore Pike and the gatehouse; hedged ("probably").'))
    p.edit(5, add_cites=[c, rp], why=p.sc(5)['why'] + ' Round 3: the NPS CLR (2017) says that after the fighting the site was left with "broken fences, clothing and supplies, damaged buildings, and torn-up fields" (July 1863, not 19 Nov); the CLR also says the Evergreen Association "probably made some initial repairs" in time for the dedication.')
    p.rev('Round 3: the NPS CLR (2017) statement on the state of the cemetery site after the fighting ("broken fences, clothing and supplies, damaged buildings, and torn-up fields") added to S-084.5 as July 1863 context; the state on 19 Nov 1863 stays inferred.')
    return p.finish()
