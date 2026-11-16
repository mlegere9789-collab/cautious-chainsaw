"""Wave 5 (2026-11-15) additions and corrections to the fence-1 row specs (third pass; ROWS stays empty, apply(rows_by_id) edits the rows of the earlier spec files).

What this pass rests on (all local, all read in the text, nothing from memory):
 - a systematic sweep of Official Records Ser. I vol. 27 parts 1 and 2 (tools/bt/or27_find) for statements of construction (threw up, constructed, built,
   erected, intrenched ... breastwork, rifle-pit, earthwork, abatis ...) in reports that no fence shard cited yet: the First Division of the Second Corps
   (Caldwell and his brigades and regiments), the Artillery Reserve (Tyler, McGilvery, Dow), Wiedrich's battery, the Twelfth Corps regiments (Slocum, Williams,
   McDougall, Packer, Price, Selfridge, Fesler, Crane, Morse, Grimes, Walker), the 61st Ohio (Bown) and the 4th Alabama (Scruggs)
 - texts that became local after the pass of 2026-11-14: the Sanitary Commission's report on Gettysburg (1863), Reily's Conewago (1885), the History of Cumberland
   and Adams Counties (1886), and two books downloaded from archive.org to read what the NPS reports quote: Nash (44th NY, 1911) and Brainard (146th NY, 1915)
 - four page images looked at on 2026-11-15 (images/, image_checks.json): the Adams Sentinel of 21 Jul 1863, the inscription of the 95th NY monument (printed page 732
   of the New York Monuments Commission volume: the hour is 10:30, the OCR's 10:50 is a misread digit) and three pages of the Sanitary Commission report
Nothing here lowers a tier without a source; every new quote is resolved by build_corrections.py exactly as the old ones are."""
from spec_lib import *

ROWS = []


def sub(row, sc):
    for s in row['sub_claims']:
        if s['sc'] == sc:
            return s
    raise KeyError('%s has no sub-claim %s' % (row['id'], sc))


def add(row, s, after=None):
    if after is None:
        row['sub_claims'].append(s)
        return
    for i, x in enumerate(row['sub_claims']):
        if x['sc'] == after:
            row['sub_claims'].insert(i + 1, s)
            return
    raise KeyError(after)


def more(row, sc, *cits, note=None):
    s = sub(row, sc)
    s['citations'].extend(cits)
    if note:
        s['note'] = ((s.get('note') or '') + ' ' + note).strip()


def setsub(row, sc, **kw):
    sub(row, sc).update(kw)


def lines(row, field, *items):
    row[field] = list(row[field]) + list(items)


def tail(row, text):
    row['corrected_claim'] = row['corrected_claim'].rstrip() + ' ' + text


def sub_text(row, old, new):
    if old not in row['corrected_claim']:
        raise KeyError('%s: %r not in corrected_claim' % (row['id'], old[:60]))
    row['corrected_claim'] = row['corrected_claim'].replace(old, new, 1)


def cons(row, *new, replace=None):
    if replace:
        for prefix, text in replace.items():
            hit = [i for i, x in enumerate(row['product_consequence']) if x.startswith(prefix)]
            if len(hit) != 1:
                raise KeyError('%s: consequence prefix %r matches %d' % (row['id'], prefix, len(hit)))
            row['product_consequence'][hit[0]] = text
    row['product_consequence'] = list(row['product_consequence']) + list(new)


def apply(R_):
    # ============================================================ S-007: the 95th NY inscription reads 10:30, not 10:50 (page image)
    r = R_['R14.S-007']
    setsub(r, 'b', claim="Clock: Reynolds fell about 10:15; Cutler's brigade in action from 10 a.m.; the 95th NY's monument inscription puts the change of front and the advance to the railroad cut with the 84th NY and 6th Wisconsin at 10:30 a.m. (printed hour, page image looked at 2026-11-15; the OCR text of the volume prints '10:50', a misread digit; the OR reports print no clock for the charge).",
           tier='documented', support='partial')
    for c in sub(r, 'b')['citations']:
        if c.get('ref') == 'NY-GB-1900-v2':
            c['reading'] = ("At 10:30 a. m. changed front, advanced to this position with the 84th New York and 6th Wisconsin, repulsed and captured a large part of Davis' Mississippi Brigade in the Railroad cut. "
                            "(inscription of the 95th NY monument as printed on p. 732 of the New York Monuments Commission volume; the OCR text prints 'At 10:50 a. M.', the page image shows 10:30: the digit after the colon is the same glyph as the 3 of '1863' on the line above)")
            c['image'] = 'ny-gb-1900-v2-p732-95th-inscription'
            c['pp'] = '732'
    sub(r, 'b')['note'] = ("A commemorative inscription (printed 1900), source of the hour not stated. WAVE 5 CORRECTION: the 2026-11-14 pass took the OCR digits '10:50' as legible; the page image shows 10:30 (the OCR misreads the 3). "
                           "'Changed front, advanced to this position ... repulsed and captured a large part of Davis' Mississippi Brigade in the railroad cut' is the inscription's own sentence; 10:30 is therefore the hour of the change of front and the start of the advance, not necessarily of the capture in the cut.")
    sub_text(r, "gives 10:50 a.m. for the change of front and the advance to the cut with the 84th NY and 6th Wisconsin (the OCR of the inscription is garbled around the hour, which is legible).",
             "gives 10:30 a.m. for the change of front and the advance to the cut with the 84th NY and 6th Wisconsin (WAVE 5 CORRECTION of 2026-11-15: the page image of p. 732 shows 10:30; the OCR text of the volume prints 10:50, a misread digit, which the 2026-11-14 pass took as legible).")
    r['stays_unsupported'] = ["A clock printed in an 1863 report for the charge at the cut (the 10:30 is a monument inscription, source not stated)"]
    lines(r, 'lookups', L('page image (wave 5)', "95th NY inscription, printed p. 732 of the New York Monuments Commission volume (PDF page 297, 300 dpi crop, viewed 2026-11-15)", 1, "prints 'At 10:30 A. M. changed front'; the digit after the colon equals the 3 of '1863'; the OCR '10:50' is a misread"))
    lines(r, 'changes_vs_previous', "wave 5 (2026-11-15): CORRECTION: the 95th NY monument inscription reads 10:30 a.m. (page image), not 10:50 a.m. as the OCR and the 2026-11-14 pass had it")
    cons(r, "S-007 CORRECTION: the inscription's hour is 10:30 a.m. (not 10:50): show 'about 10:30' as the documented clock of the change of front and the advance to the cut (commemorative source, hour of the capture not stated); the PDF 'about 11:00' stays as the inferred clock of the fight in the cut",
         replace={"S-007: the 95th NY monument inscription gives 10:50 a.m.": "S-007 (see the correction below): the 95th NY monument inscription gives the hour of the change of front and the advance to the railroad cut; the PDF 'about 11:00' stays as the inferred clock of the fight in the cut"})

    r = R_['R14.S-001']
    for sc_ in r['sub_claims']:
        for c in sc_['citations']:
            if c.get('ref') == 'GBG-COMPILER-1863-06-29' and not c.get('pp'):
                c['pp'] = '1'      # leaf 1 of the four-page issue (image_checks.json: gbg-compiler-1863-06-29-bridge)
    # ============================================================ S-012: Adams Sentinel image read; S-010 / S-013 get its other sentences
    r = R_['R14.S-012']
    for c in sub(r, 'b')['citations']:
        if c.get('ref') == 'ADAMS-SENTINEL-1863-07-21':
            c['reading'] = ("The Theological Seminary was struck by a number of shells and balls, and several serious fractures caused, which will probably require part of one gable end to be taken down. "
                            "(page image of the Adams Sentinel, 21 Jul 1863, page 2, looked at 2026-11-15: the OCR text prints 'shello aud balls' and garbles the rest of the sentence)")
            c['image'] = 'adams-sentinel-1863-07-21-seminary'
            c['pp'] = '2'
    sub(r, 'b')['note'] = ("The Adams Sentinel of 21 Jul 1863 (contemporary, local, page image read 2026-11-15) says the Seminary was struck by a number of shells and balls and several serious fractures caused, which will probably require part of one gable end to be taken down; "
                           "the NPS says the main building and two professors' houses were damaged by shells.")
    setsub(r, 'c', claim="Fractures, lost window glass and bullet holes at the seminary: the main building had 'several serious fractures' caused by shells and balls (part of one gable end to be taken down); 'window frames were shattered, and nearly all the glass destroyed' at Dr. Schmucker's house, a Professor's house on the seminary grounds (Adams Sentinel, page image); window glass of the MAIN building is not stated.",
           tier='documented', support='partial')
    more(r, 'c',
         C('LIB', 'ADAMS-SENTINEL-1863-07-21', "number of shello aud balls, and several", image='adams-sentinel-1863-07-21-seminary', pp='2',
           reading="...a number of shells and balls, and several serious fractures caused, which will probably require part of one gable end to be taken down. (image reading; see sub-claim b)"),
         C('LIB', 'ADAMS-SENTINEL-1863-07-21', "The house occupied by J)r. Suhnmtker, was pu-foi tiled by thu teen", image='adams-sentinel-1863-07-21-seminary', pp='2',
           reading="The house occupied by Dr. Schmucker, was perforated by thirteen shells and cannon balls, several large fissures were made in the walls, window frames were shattered, and nearly all the glass destroyed. (image reading)"),
         C('LIB', 'ADAMS-SENTINEL-1863-07-21', "iramcs weie bhattcied. and nearly all the", image='adams-sentinel-1863-07-21-seminary', pp='2',
           reading="...window frames were shattered, and nearly all the glass destroyed. (image reading; the sentence is the house of Dr. Schmucker's)"),
         note="WAVE 5: the image of the Adams Sentinel closes the owed check of 2026-11-14: the glass loss is documented for Dr. Schmucker's house, not for the seminary main building; for the main building only 'serious fractures' and one gable end are documented.")
    add(r, S('d', "The fences and some out-houses on 20 acres of Seminary land were 'almost wholly destroyed' (Adams Sentinel, 21 Jul 1863, page image; cause and day not stated).", 'documented', 'supported', [
        C('LIB', 'ADAMS-SENTINEL-1863-07-21', "on 20 acres of rfeminaiy land,", image='adams-sentinel-1863-07-21-seminary', pp='2',
          reading="...the fences and some out-houses on 20 acres of Seminary land, almost wholly destroyed. (image reading)")],
        note="The Sentinel says nothing about who destroyed the fences or when; it supports 'the fences on the Seminary land were gone' as a state at the time of writing (three weeks after the battle), not as the origin of the barricade rails."), after='c')
    add(r, S('e', "The Seminary and the College 'are, and for a month to come probably will be, occupied as hospitals for the sick and wounded of both armies' (Adams Sentinel, 21 Jul 1863, page image).", 'documented', 'supported', [
        C('LIB', 'ADAMS-SENTINEL-1863-07-21', "dettrficd. The Seminary", image='adams-sentinel-1863-07-21-seminary', pp='2',
          reading="...almost wholly destroyed. The Seminary and College are, and for a month to come, probably will, be occupied as hospitals for the sick and wounded of both armies, and will require not only many repairs, but also much purification and painting, before they can again be occupied for their appropriate purposes. (image reading; the quoted OCR words only mark the place: the flat OCR text interleaves the neighbouring columns)")],
        note="A contemporary local newspaper; the hospital use by both armies is documented for the Seminary and the College as a state of July 1863."), after='d')
    sub_text(r, "Lost window glass is not stated for the seminary building in any source read; the broken-sash and glass passage in the NPS text belongs to the McPherson farmhouse.",
             "Window glass of the seminary main building is not stated in any source read (the broken-sash and glass passage in the NPS text belongs to the McPherson farmhouse); the Adams Sentinel's 'nearly all the glass destroyed' is Dr. Schmucker's house.")
    tail(r, "Wave 5 (2026-11-15): the page image of the Adams Sentinel (21 Jul 1863) is read: the Seminary 'was struck by a number of shells and balls, and several serious fractures caused, which will probably require part of one gable end to be taken down'; Dr. Schmucker's house was perforated by thirteen shells and cannon balls, with large fissures, shattered window frames and nearly all the glass destroyed; the other Professors' houses were injured; the fences and some out-houses on 20 acres of Seminary land were almost wholly destroyed; the Seminary and the College were, and for a month to come probably would be, hospitals for the sick and wounded of both armies.")
    r['stays_unsupported'] = ["Window glass of the seminary MAIN building (the Sentinel's glass loss is Dr. Schmucker's house); bullet holes by count or place"]
    lines(r, 'lookups', L('page image (wave 5)', "Adams Sentinel 21 Jul 1863 page 2, middle column (200 ppi CCITT scan, 1.5x crop, viewed 2026-11-15)", 1, "serious fractures and a gable end (main building); glass destroyed at Dr. Schmucker's house; fences on 20 acres destroyed; Seminary and College hospitals for both armies"))
    lines(r, 'changes_vs_previous', "wave 5: Adams Sentinel page image read (owed since 2026-11-14): fractures documented for the main building, glass loss belongs to the Schmucker house, fences on 20 acres destroyed, hospital for both armies")
    cons(r, "S-012 / H-03: add 'several serious fractures' and 'part of one gable end to be taken down' (Adams Sentinel, page image) to the main building's damage state; the glass loss and the thirteen shells belong to Dr. Schmucker's house (a separate Professor's house record), not to the main building",
         replace={"S-012 / H-03: add 'struck by a number of shells and balls'": "S-012 / H-03: add 'struck by a number of shells and balls' (Adams Sentinel, 21 Jul 1863, contemporary, page image read) and 'main building and two professors' houses damaged by shells' (NPS) to the damage state; glass loss of the MAIN building stays a marked gap"})

    r = R_['R14.S-010']
    add(r, S('e', "The fences and some out-houses on 20 acres of Seminary land were 'almost wholly destroyed' by 21 Jul 1863 (Adams Sentinel, page image): a state, not a cause; it does not say that the barricade rails came from them.", 'documented', 'partial', [
        C('LIB', 'ADAMS-SENTINEL-1863-07-21', "on 20 acres of rfeminaiy land,", image='adams-sentinel-1863-07-21-seminary', pp='2',
          reading="...the fences and some out-houses on 20 acres of Seminary land, almost wholly destroyed. (image reading)")],
        note="Same sentence as S-012 sub-claim d; carried here because the barricade rails and the destroyed fences are the same question (which fences were taken)."), after='b')

    r = R_['R14.S-013']
    add(r, S('c', "By 21 Jul 1863 'the Seminary and College are, and for a month to come probably will be, occupied as hospitals for the sick and wounded of both armies' (Adams Sentinel, page image): the building held wounded of both armies after the battle.", 'documented', 'supported', [
        C('LIB', 'ADAMS-SENTINEL-1863-07-21', "dettrficd. The Seminary", image='adams-sentinel-1863-07-21-seminary', pp='2',
          reading="The Seminary and College are, and for a month to come, probably will, be occupied as hospitals for the sick and wounded of both armies. (image reading)")],
        note="Contemporary local newspaper; it does not give the hour the building passed to Confederate control."), after='a')
    tail(r, "Wave 5 (2026-11-15): the Adams Sentinel of 21 Jul 1863 (page image read) says the Seminary and the College were hospitals for the sick and wounded of both armies and would be for a month to come; the hour the building passed to Confederate control is still not printed.")
    lines(r, 'changes_vs_previous', "wave 5: both-armies hospital use of the Seminary and the College documented by the Adams Sentinel of 21 Jul 1863 (page image)")

    # ============================================================ S-002.d: the cupola of the College main building (History of Adams County, 1886)
    r = R_['R14.S-002']
    setsub(r, 'd', claim="The building with the cupola is the College's main building ('Pennsylvania Hall' in the PDF): the college proper is a four-storey centre building with two wings (built 1836-38) 'surmounted by an octagonal cupola 17 feet in diameter and 24 feet in height, with observatory'; the name 'Pennsylvania Hall' is not printed in any text read.",
           tier='documented', support='partial')
    more(r, 'd',
         C('XF', 'HISTORY-ADAMS-1886', "The college proper consists of a center building and two wings, with end projections, the whole length being 150 feet."),
         C('XF', 'HISTORY-ADAMS-1886', "The building is four stories high, surmounted by an octagonal cupola 17 feet in diameter and 24 feet in height, with observatory."),
         C('LIB', 'BL-3', "The cupola was first used by Union officers, and then by Confederate, as a station for observation and signals.", role='context',
           note="Battles and Leaders vol. 3 caption under the picture 'Pennsylvania College, Gettysburg', which names the cupola of the college; the caption is the Editors' (1888), secondary."),
         note="WAVE 5: the History of Cumberland and Adams Counties (1886) describes the College's main building ('the college proper', built 1836-1838) with an octagonal cupola and observatory; the Battles and Leaders caption names the cupola of Pennsylvania College as the Union and then Confederate signal station. That the College building is the building named 'Pennsylvania Hall' is not printed in either text; the identification stays at 'documented partial'.")
    r['stays_unsupported'] = ["Whether the Jun 30 'steeple of the college' (Norton) is the cupola of the College main building or another college building (no source read ties Norton's steeple to a named building); the name 'Pennsylvania Hall' (not printed in the texts read); hour on Jun 30"]
    tail(r, "Wave 5 (2026-11-15): the History of Cumberland and Adams Counties (1886) describes the College's main building ('the college proper': a four-storey centre building and two wings, built 1836-38) with an octagonal cupola, 17 ft in diameter and 24 ft high, with observatory, so a 'college cupola' (Jacobs, Hoke, Battles and Leaders) is a feature of that building; the name 'Pennsylvania Hall' is not printed in the texts read.")
    lines(r, 'lookups', L('town library (wave 5)', "cupola/steeple/belfry/observatory near college/seminary/Pennsylvania Hall in History of Adams County 1886, Hoke 1887, Rupp 1846, Barton 1898, GATE library", 6, "History of Adams County 1886 describes the college main building's octagonal cupola with observatory; Battles and Leaders caption; no hit names 'Pennsylvania Hall'"))
    lines(r, 'changes_vs_previous', "wave 5: sub-claim d inferred/unsupported -> documented/partial (the College main building's cupola and observatory are described in the History of Cumberland and Adams Counties, 1886); the name Pennsylvania Hall stays unsupported")
    cons(r, "S-002: the College cupola is a feature of the College's main building (octagonal, 17 ft across and 24 ft high, with observatory: History of Adams County 1886): model it on that building, tier documented for the cupola, the building name marked a gap")

    # ============================================================ S-004 / S-008 / S-016: Sanitary Commission report (1863) and Reily (1885)
    r = R_['R14.S-004']
    add(r, S('a2', "A Presbyterian church on Baltimore street was the Cavalry Corps hospital, with the two school-houses in the immediate vicinity: three buildings, 300 of our wounded, Dr. Rulison in charge (Sanitary Commission report, 1863, printed p. 24); most of the wounded of Jul 1 were carried into the churches and public buildings of the town under the organization of the First and Cavalry Corps (printed p. 15, Major Bush).", 'documented', 'supported', [
        C('XF', 'USSC-GETTYSBURG-1863', "The Cavalry Corps Hospital was in town, and occupied the Presbyterian Church on Baltimore street, and the two school-houses in the immediate vicinity.", pp='24', image='ussc-1863-p24'),
        C('XF', 'USSC-GETTYSBURG-1863', "It was under the charge of Dr. Rulison, and the three buildings contained 300 of our wounded.", pp='24', image='ussc-1863-p24'),
        C('XF', 'USSC-GETTYSBURG-1863', "were carried into the churches and public buildings of the town, under the organization of the first and cavalry corps", pp='15', image='ussc-1863-p15')],
        note="A contemporary printed report (1863) by the Sanitary Commission; the statement of p. 24 is the report author's footnote on the corps hospitals, the statement of p. 15 is Major Bush's account of Wednesday Jul 1 (in parentheses, his words). Neither gives the hour or the day the church became a hospital; p. 15 puts the use of churches on the day of the first fight."), after='a')
    sub_text(r, "A Presbyterian church near the centre of the town was used as a hospital on Jul 1, not on Jun 30:",
             "A Presbyterian church near the centre of the town was used as a hospital on Jul 1, not on Jun 30 (the Sanitary Commission's report of 1863 names it as the Cavalry Corps hospital, on Baltimore street, with two school-houses and 300 of our wounded):")
    tail(r, "Wave 5 (2026-11-15): the Sanitary Commission's report of 1863 (printed pp. 15 and 24, page images looked at) says that most of the wounded of Jul 1 were carried into the churches and public buildings of the town under the organization of the First and Cavalry Corps, and that the Cavalry Corps hospital was 'in town, and occupied the Presbyterian Church on Baltimore street, and the two school-houses in the immediate vicinity' (Dr. Rulison; 300 wounded); no 1863 source gives a Jun 30 date.")
    lines(r, 'lookups', L('medical library, town library (wave 5)', "Presbyterian church + hospital/wounded in USSC report 1863, Souder 1864, Reily 1885, History of Adams County 1886, War claims of churches 1912, Hoke 1887", 1, "USSC report 1863 pp. 15 and 24; no Jun 30 statement"))
    lines(r, 'changes_vs_previous', "wave 5: contemporary 1863 statement (Sanitary Commission report) that the Presbyterian church on Baltimore street was the Cavalry Corps hospital and that churches received the wounded of Jul 1; the Jun 30 date and the address 208 Baltimore St stay marker-page only")

    r = R_['R14.S-008']
    add(r, S('a2', "St. Francis Xavier's 'was used as a hospital during the Battle of Gettysburg. It was first occupied as such before noon of July 1, 1863, and was used for this purpose for several weeks'; Mass was said meanwhile in a room at the house of Nicholas Codori (Reily, Conewago, 1885, printed p. 164).", 'documented', 'supported', [
        C('XF', 'REILY-1885', "Xavier’s was used as a hospital during the Battle of Gettysburg.", pp='164'),
        C('XF', 'REILY-1885', "occupied as such before noon of July 1, 1863", pp='164'),
        C('XF', 'REILY-1885', "Mass was said in a room at the house of Nicholas Codori.", pp='164')],
        note="A published parish history of 1885 (secondary, written 22 years after; the text layer of the archive.org PDF, one block per PDF page, printed page 164 read at the top of the page block, the same text read by pdftotext of the PDF page 178). The 'before noon of July 1' is the book's own statement without a source named."), after='a')
    setsub(r, 'b', claim="The pews were removed and boards laid on the arrival of wounded (Aleteia); the 'by noon Jul 1' part is now documented (sub-claim a2: 'before noon of July 1, 1863', Reily 1885).",
           tier='open_gap', support='blocked_host')
    sub(r, 'b')['note'] = ("Rests on the Aleteia page (blocked) for the pews and boards. No hit for pews removed or boards laid at this church (the one 'pews ... boards' passage in the sources, in Stoever's account, is an Episcopal church). WAVE 5: 'before noon of July 1, 1863' is documented by Reily 1885 (a2).")
    r['stays_unsupported'] = ["Pews removed and boards laid (no source read; Aleteia page blocked)"]
    sub_text(r, "That it became a hospital by noon on Jul 1, and that the pews were removed and boards laid, rests on an Aleteia page that cannot be read here; no source read dates the conversion or mentions the pews.",
             "That it became a hospital before noon on Jul 1 is documented by Reily's Conewago (1885, printed p. 164: 'first occupied as such before noon of July 1, 1863', used 'for several weeks'; a secondary parish history without a source named); that the pews were removed and boards laid rests on an Aleteia page that cannot be read here, and no source read mentions the pews.")
    tail(r, "Wave 5 (2026-11-15): Reily's Conewago (1885, p. 164) is the first source read that dates the conversion: 'before noon of July 1, 1863'.")
    lines(r, 'lookups', L('town library (wave 5)', "Catholic church / St. Francis Xavier + hospital/wounded in Reily 1885, History of Adams County 1886, Barton 1898, USSC report", 3, "Reily 1885 p. 164: first occupied as a hospital before noon of July 1, 1863; Barton 1898 (already cited)"))
    lines(r, 'changes_vs_previous', "wave 5: 'before noon of July 1, 1863' documented by Reily 1885 (secondary parish history); only the pews and boards remain web-only")
    cons(r, "S-008 / H-02: the Catholic church is a hospital from before noon on Jul 1 (documented-secondary: Reily 1885) for several weeks; the PDF's 'by noon Jul 1' is therefore supported, the 'pews removed and boards laid' stays a marked gap",
         replace={"S-008 / H-02:": "S-008 / H-02: the Catholic church is a hospital from before noon on Jul 1 (Reily 1885, secondary) and for wounded of both armies on Jul 2-3 (Bates) through at least Jul 5 (Stoever; NPS), documented-secondary; the PDF's 'pews removed and boards laid' stays a marked gap (web page only); do not show pews removed as a fact"})
    for b in r['blocked_host']:
        if b['source_key'] == 'Aleteia':
            b['what_to_read'] = ("Aleteia page on the St. Francis Xavier parish (the exact article URL is not recorded in the PDF; the only Aleteia URL recorded in the repository is https://aleteia.org/2024/07/09/the-daughters-of-charity-at-gettysburg-part-2-photos/ - unconfirmed as this source; host refused here, probed again 2026-11-15): "
                                 "read only the passage on the removal of the pews and the laying of boards and the page's own source; 'before noon on Jul 1' is already documented by Reily 1885 (p. 164), and the hospital use on Jul 2-5 by Bates 1875 and Stoever 1868.")

    r = R_['R14.S-016']
    add(r, S('a3', "The Eleventh Corps Hospital 'occupied the house and farm of Geo. Spangler'; the divisions were consolidated under Dr. Armstrong; 1,900 wounded, of whom 100 were said to be confederates (Sanitary Commission report, 1863, printed p. 24).", 'documented', 'supported', [
        C('XF', 'USSC-GETTYSBURG-1863', "The Eleventh Corps Hospital occupied the house and farm of Geo. Spangler.", pp='24', image='ussc-1863-p24'),
        C('XF', 'USSC-GETTYSBURG-1863', "The divisions were consolidated under the charge of Dr. Armstrong.", pp='24', image='ussc-1863-p24'),
        C('XF', 'USSC-GETTYSBURG-1863', "It contained 1,900 wounded, of whom 100 were said to be confederates.", pp='24', image='ussc-1863-p24')],
        note="A contemporary printed report (1863): it names GEORGE Spangler's house and farm, which settles the Eleventh Corps hospital for the George Spangler farm (see the town workstream's request note bt-town-structures-spangler-identity.md about the two Spangler farms); no day or hour of opening."), after='a2')
    tail(r, "Wave 5 (2026-11-15): the Sanitary Commission's report of 1863 (printed p. 24, page image looked at) is a contemporary statement that 'the Eleventh Corps Hospital occupied the house and farm of Geo. Spangler' (1,900 wounded, Dr. Armstrong); the day and hour it opened are still not printed anywhere read.")
    lines(r, 'lookups', L('medical library (wave 5)', "Spangler + hospital/Eleventh Corps in USSC report 1863, Souder 1864, MSHWR, Letterman", 1, "USSC report 1863 p. 24; no opening hour"))
    lines(r, 'changes_vs_previous', "wave 5: a contemporary 1863 printed source (Sanitary Commission report p. 24) now names George Spangler's house and farm as the Eleventh Corps hospital")

    for b in R_['R14.S-004']['blocked_host']:
        if b['source_key'] == 'HMDB-17939':
            b['what_to_read'] = b['what_to_read'].rstrip('. ') + ". WAVE 5: the Sanitary Commission's report of 1863 (printed p.24) already documents the Presbyterian church on Baltimore street as the Cavalry Corps hospital and p.15 the use of churches for the wounded of Jul 1; the marker page is needed only for the Jun 30 date, the address (208 Baltimore St) and the trigger."
    for b in R_['R14.S-016']['blocked_host']:
        if b['source_key'] in ('HN-Spangler', 'Gettysburg Foundation George Spangler Farm'):
            b['what_to_read'] = b['what_to_read'].rstrip('. ') + ". WAVE 5: George Spangler's house and farm as the Eleventh Corps hospital is documented by the Sanitary Commission's report of 1863 (printed p.24); only the day and hour of the opening need the page."
    # ============================================================ S-005: fences as a line of defence by the Eleventh Corps (Sanitary Commission report)
    r = R_['R14.S-005']
    add(r, S('g', "Afternoon of Jul 1: 'the eleventh corps formed a line between the college and the town, making the fences their line of defence'; the Confederates advanced 'about four P. M.' (Major Bush, in the Sanitary Commission report of 1863, printed pp. 14-15).", 'documented', 'supported', [
        C('XF', 'USSC-GETTYSBURG-1863', "formed a line between tlie college and the town, making the fences their line of defence", pp='14', image='ussc-1863-p14',
          reading="...the eleventh corps formed a line between the college and the town, making the fences their line of defence. (the OCR prints 'tlie' for 'the')"),
        C('XF', 'USSC-GETTYSBURG-1863', "about four P. M., formed in line of battle", pp='14', image='ussc-1863-p14')],
        note="A civilian eyewitness account printed in 1863 (Sanitary Commission relief agent), not an OR report; the fences are not described and the place is 'between the college and the town' (north side), not McPherson Ridge."), after='f')
    tail(r, "Wave 5 (2026-11-15): another unit used fences as a line of defence on Jul 1: the Eleventh Corps 'between the college and the town' on the afternoon (Major Bush in the Sanitary Commission's report of 1863, printed p. 14, page image looked at).")
    lines(r, 'changes_vs_previous', "wave 5: the Eleventh Corps' fence line between the college and the town on the afternoon of Jul 1 (Sanitary Commission report, printed p. 14)")
    cons(r, "S-005 / S-006: add a fence-line use on the afternoon of Jul 1 north of the college grounds (the Eleventh Corps 'making the fences their line of defence', Sanitary Commission report 1863): documented-secondary, no fence type or length")

    # ============================================================ E-17: Cemetery Ridge (the Official Records sweep)
    r = R_['R14.E-17']
    add(r, S('o', "Jul 3 morning, the First Division of the Second Corps (Caldwell), in line 'to the right of the field in which it was engaged the day previous' (Chapman): the division, its brigades and eleven regiments threw up breastworks, earthworks or rifle-pits early on the morning of the 3d, serviceable before the cannonade ('Before noon we had a work which served to protect the men', Caldwell; 'by 11 a. m. had quite a formidable breastwork thrown up', 116th Pa. after Hancock moved the line forward; 'completed early on the morning of the 3d', 88th NY; 'the forenoon was spent in throwing up intrenchments', 5th NH; 'the greater part of the forenoon', 145th Pa.).", 'documented', 'supported', [
        C('OR1', 'R077', "I then formed what was left of the division in one line on a slight crest, and began to throw up breastworks. Before noon we had a work which served to protect the men during the artillery fire which followed."),
        C('OR1', 'R078', "Early on the morning of the 3d, breastworks were thrown up by the brigade."),
        C('OR1', 'R082', "Early next morning (3d), we were ordered to throw up breastworks"),
        C('OR1', 'R092', "Here we were directed by General Caldwell to throw up riflepits."),
        C('OR1', 'R079', "The forenoon was spent in throwing up intrenchments"),
        C('OR1', 'R080', "Having thrown up earthworks in front, we remained here"),
        C('OR1', 'R084', "returned to the position they at first occupied, threw up breastworks"),
        C('OR1', 'R085', "Next morning the line was advanced to the front and left under a heavy artillery fire. Most of the day engaged in throwing up earthworks and strengthening our position."),
        C('OR1', 'R086', "assisted, with the other regiments of the brigade, in throwing up breastworks, which we completed early on the morning of the 3d"),
        C('OR1', 'R087', "We immediately commenced to intrench our new position, and by 11 a. m. had quite a formidable breastwork thrown up."),
        C('OR1', 'R088', "On the morning of July 3, the regiment, pursuant to orders, constructed breastworks immediately in front of its line."),
        C('OR1', 'R090', "was directed to erect slight breastworks in front of my regiment"),
        C('OR1', 'R094', "Breastworks were built to our front, which proved a defense against the heavy cannonading received from the enemy on that day."),
        C('OR1', 'R095', "During the morning of the 3d, my command was engaged in throwing up earthworks."),
        C('OR1', 'R096', "On Friday, the regiment built a line of intrenchments just in front of its position occupied on Thursday"),
        C('OR1', 'R097', "we were engaged the greater part of the forenoon in throwing up intrenchments, in which we remained for the rest of the day")],
        note="WAVE 5: found by the Official Records sweep for construction statements in reports that no fence shard had cited. The reports are those of Caldwell (division), McKeen, Kelly and Brooke (brigades) and the 5th NH (Cross), 61st NY (Broady), 63rd NY (Touhy), 69th NY (Smith), 88th NY (Burke), 116th Pa. (Mulholland), 140th Pa. (Fraser), 57th NY (Chapman), 64th NY (Bradley), 53rd Pa. (McMichael) and 145th Pa. (Reynolds, Oliver). Clocks are the reports' own words: 'early on the morning of the 3d' (McKeen, Kelly, Fraser, Chapman), 'before noon' (Caldwell), 'by 11 a. m.' (Mulholland), 'the forenoon' (Cross, Oliver); the 88th NY began in the night; Touhy's battalion 'returned to the position they at first occupied' (after the relief of the evening) and built. No report gives a length or a profile; materials are 'breastworks', 'earthworks', 'intrenchments' or 'rifle-pits' (no rails named)."), after='e')
    add(r, S('p', "Artillery earthworks on the same line on the morning of Jul 3: 'In front of these guns I had a slight earthwork thrown up, which proved sufficient to resist all the projectiles which struck it' (McGilvery: thirty-nine guns of the First Volunteer Brigade); 'I built earthworks in front of my guns' (Dow, 6th Maine Battery, ordered into position on the morning of the 3d between the 2nd Connecticut and Ames' batteries).", 'documented', 'supported', [
        C('OR1', 'R318', "In front of these guns I had a slight earthwork thrown up, which proved sufficient to resist all the projectiles which struck it"),
        C('OR1', 'R331', "I built earthworks in front of my guns."),
        C('OR1', 'R331', "was ordered into position between the Second Connecticut Battery and Ames' (First New York) battery")],
        note="Artillery positions belong to the R13 gun-position shards (terrain-1, terrain-2); carried here because the same line and morning are the subject. McGilvery's report does not say when the earthwork was thrown up; Dow's is the morning of Jul 3."), after='o')
    add(r, S('q', "The Angle (Webb's front): the low stone wall 'had been thrown down in places to let the guns through on the second day, and at these gaps and in other places rails had been used for additional shelter. That was the only breastwork or fortification that protected Webb's infantry, on the left of the trees'; Captain Cowan: the wall was 'very low in the angle, certainly not over two feet high', made high enough to turn cattle by 'three or four rails, stake and rider fashion', with not enough soil there to strengthen it (NPS 'Common Pride', quoting accounts; a pre-existing wall with rails added, no construction animation).", 'documented', 'partial', [
        C('NPS', 'NPS-COMMON-PRIDE-1', "This low stone wall had been thrown down in places to let the guns through on the second day, and at these gaps and in other places rails had been used for additional shelter."),
        C('NPS', 'NPS-COMMON-PRIDE-1', "That was the only breastwork or fortification that protected Webb's infantry, on the left of the trees."),
        C('NPS', 'NPS-COMMON-PRIDE-1', "because it was very low in the angle, certainly not over two feet high.", reading="Our infantry at the wall had very slight protection, because it was very low in the angle, certainly not over two feet high. (the text layer reads 'veryyslight')"),
        C('NPS', 'NPS-COMMON-PRIDE-1', "Three or four rails, stake and rider fashion, had previously made it high enough to turn", reading="Three or four rails, stake and rider fashion, had previously made it high enough to turn cattle. (the text layer breaks 'cat-tle' across a line with a soft hyphen)"),
        C('NPS', 'NPS-COMMON-PRIDE-1', "There was not enough soil there to strengthen the wall and raise it higher.")],
        note="WAVE 5: found in the NPS 'Common Pride' study (secondary; it quotes accounts, the first an unnamed one, the second Captain Cowan's): they give the state of the pre-existing Angle wall (height not over two feet, rails on top, thrown down in places for the guns on Jul 2, rails used at the gaps), not a new construction; it bears on the PDF's 'no works' for the Angle and on FEN-cemetery-ridge-walls."), after='p')
    setsub(r, 'g', claim="A continuous line of rail breastworks along Cemetery Ridge: not stated by any source as a continuous line of RAILS; Tyler (Artillery Reserve) found on the morning of Jul 3 that 'the infantry had constructed a slight breastwork of such materials as the ground afforded along the entire crest of the hill, and some shelter had been thrown up for the artillery'.",
           tier='documented', support='partial')
    more(r, 'g',
         C('OR1', 'R315', "The infantry had constructed a slight breastwork of such materials"),
         C('OR1', 'R315', "along the entire crest of the hill"),
         C('OR1', 'R315', "Had been thrown up for the artillery", note="the sentence reads 'and some shelter Had been thrown up for the artillery'; the page break (printed pp. 873-874) falls inside 'shel-ter', so the quote starts on p. 874"),
         C('OR1', 'R315', "At daylight on July 3, Captain Rigby's battery", role='context'),
         note="WAVE 5: Tyler's statement is the first read that speaks of a breastwork 'along the entire crest of the hill' (his 'hill' is where he found the twelve reserve batteries in position near the Taneytown road, on riding along the lines after daylight Jul 3; the OCR garbles 'such materials as the ground afforded'). It is one officer's summary of the crest he rode, not a survey: no source names a gap, none gives a total length, and the PDF's 'gap south of the Copse on Jul 2 evening' is neither confirmed nor contradicted.")
    setsub(r, 'h', claim="Dimensions (length, height, profile) of Cemetery Ridge works: one printed profile, the 20th Mass.'s 'slight rifle-pit, a foot deep and a foot high', dug with a single shovel on the night of Jul 2 ('too thin to stop anything more than a spent ball', Abbott); 'a little over knee-high' (an unnamed regiment of Harrow's brigade, NPS); 'not more than three feet high' (Olmsted, NPS); traverses about thirty feet apart (Bachelder); no length of any work.",
           tier='documented', support='partial')
    more(r, 'h',
         C('OR1', 'R111', "with a single shovel, they threw up a slight rifle-pit, a foot deep and a foot high"),
         C('OR1', 'R111', "being sheltered more by the slight depression in the ground where the pit was dug than by the earth thrown up, which was too thin to stop anything more than a spent ball"),
         C('OR1', 'R111', "After the repulse of the enemy on this night (the 2d), the regiment was moved up into the front line", role='context'),
         note="WAVE 5: Abbott (20th Mass., OR27-1-R111 p. 445) gives the only measured 1863 profile of a Cemetery Ridge work read: one foot deep, one foot high, one shovel, one night (the night of Jul 2); it is a rifle-pit with its earth thrown to the front, not the NPS's 'slight breastwork made by throwing some earth up against a low stone fence topped with rails' (sub-claim i), which is a different statement about the same regiment: both are carried.")
    r['stays_unsupported'] = ["Any length of a Cemetery Ridge work (none is printed) and the total length of the line; continuity beyond Tyler's 'along the entire crest of the hill' (one officer, morning of Jul 3)",
                              "Dimensions of any work other than the 20th Mass. rifle-pit (a foot deep and a foot high; Abbott), the one 'a little over knee-high' (regiment not named) and the traverse spacing of about 30 ft on the Emmitsburg road wall (Bachelder, day and builder not stated)",
                              "Fabric of the Caldwell division works (the reports say breastworks, earthworks, intrenchments or rifle-pits, never rails); clock of most works other than 'early on the morning of the 3d', 'before noon', 'by 11 a. m.' and 'the forenoon'"]
    tail(r, "Wave 5 (2026-11-15): an Official Records sweep for construction statements in reports not cited before adds the whole First Division of the Second Corps (Caldwell; McKeen, Kelly and Brooke; eleven regiments) throwing up breastworks, earthworks or rifle-pits on the morning of Jul 3, serviceable before noon (the 116th Pa. 'by 11 a. m. had quite a formidable breastwork thrown up'); one printed profile (the 20th Mass.: 'a slight rifle-pit, a foot deep and a foot high', dug with a single shovel on the night of Jul 2, 'too thin to stop anything more than a spent ball': Abbott); a statement of near-continuity ('a slight breastwork ... along the entire crest of the hill', Tyler, Artillery Reserve, morning of Jul 3); and artillery earthworks in front of McGilvery's thirty-nine guns and Dow's battery on the morning of Jul 3. The PDF's 'no source found' is contradicted a fifth time and its 'gap south of the Copse' stays unevidenced.")
    lines(r, 'lookups', L('Official Records vol. 27 parts 1-2 (wave 5, tools/bt/or27_find)', "(threw up|erect*|construct*|built|piled|commenced|began|made|dug|ordered) ... (breastwork|barricade|intrench*|rifle-pit|epaulement|earthwork|parapet|traverse|abatis|lunette|rail fence|stone wall) in every report not yet cited by fence-1", 259, "164 hits in 97 reports not cited; read and sorted: First Division of the Second Corps (R077-R097), Artillery Reserve (R315, R318, R331), Twelfth Corps (R271-R306), Eleventh Corps (R258, R265), Confederate (R443); the rest are Jul 4-14 works, Harpers Ferry, Winchester and Harrisburg"),
          L('Second Corps first-division books, unit books, life library, GATE library (wave 5, tmp/fence-1/run5/ms5.py)', "breastwork|rail fence|rails|barricade|rifle-pit|intrench near Cemetery Ridge/Cemetery Hill/Gettysburg/Hancock/Gibbon/Hays/Webb/Caldwell, and a printed dimension (feet or inches high, deep, thick) near breastwork/rifle-pit/works", 59, "the books repeat the OR statements (the 5th NH history: 'On the morning of the 3rd it threw up a slight line of breastworks'; Fraser's 140th Pa. and Chapman's 57th NY reports quoted); no dimension of a Gettysburg work in them"))
    lines(r, 'changes_vs_previous', "wave 5: Caldwell's First Division (Jul 3 morning, OR R077-R097), a printed profile (20th Mass.: a foot deep and a foot high, Abbott R111), a statement of near-continuity (Tyler R315) and artillery earthworks (McGilvery R318, Dow R331) added; the dimension and continuity gaps are narrowed, not closed")
    cons(r, "E-17: add Jul 3 morning works for Caldwell's First Division of the Second Corps (units and clocks in sub-claim o): short breastworks, earthworks or rifle-pits in front of each regiment's line, begun early on the morning of the 3d, serviceable before noon; the 116th Pa.'s begins after Hancock moved the line forward and is 'quite formidable' by 11:00; no rails are named, so draw them as earth and stones (plausible-procedural fabric), not as rail piles",
         "E-17: the 20th Mass. rifle-pit of the night of Jul 2 to 3 has a printed profile (a foot deep, a foot high, one shovel, 'too thin to stop anything more than a spent ball'): use it as the documented size of an overnight single-shovel work; the NPS 'earth against a low stone fence topped with rails' stays a selectable second form for the same regiment",
         "E-17: show a 'slight breastwork along the entire crest' at the Artillery Reserve's position on the morning of Jul 3 (Tyler) as a documented, low line (one officer's statement for the crest he rode); keep the continuity of the whole ridge a marked gap; add the artillery earthworks of the First Volunteer Brigade (McGilvery) and of Dow's battery on the morning of Jul 3 (R13 gun positions)")

    cons(r, "E-17 / FEN-cemetery-ridge-walls: the Angle wall's 1863 state: 'certainly not over two feet high' with three or four rails stake and rider on top, thrown down in places on Jul 2 to let the guns through and rails used at the gaps and elsewhere (NPS 'Common Pride' quoting accounts; documented-secondary, partial): a state of the pre-existing wall, not a construction animation")

    # ============================================================ E-04 / E-12: Cemetery Hill breastworks and Wiedrich's intrenchments
    r = R_['R14.E-04']
    add(r, S('g', "The 61st Ohio (Eleventh Corps) fell back 'to the cemetery, upon the south of Gettysburg' on Jul 1; its report has it on Jul 2 'still in position behind the breastworks' and on Jul 5 'still in our old position behind the breastworks': breastworks existed at that regiment's place on Cemetery Hill by the morning of Jul 2; no builder, hour or form is stated.", 'documented', 'partial', [
        C('OR1', 'R258', "we were ordered to fall back to the cemetery, upon the south of Gettysburg"),
        C('OR1', 'R258', "July 2. — Still in position behind the breastworks"),
        C('OR1', 'R258', "July 5. — Still in our old position behind the breastworks")],
        note="WAVE 5: Bown (Lieut. Col., 61st Ohio) writes a day-by-day account; the breastworks are at the regiment's position at the cemetery (the Jul 2 evening move to support the Twelfth Corps is followed by 'we were ordered to our old position behind the breastworks'). The report does not say who built them or when (the night of Jul 1 or the morning of Jul 2 are the bounds); it neither supports nor refutes the books' lunettes of Steinwehr's division."), after='f')
    sub_text(r, "No 1863 source says Cemetery Hill was fortified as a whole or that von Steinwehr built works",
             "No 1863 source says Cemetery Hill was fortified as a whole or that von Steinwehr built works; the 61st Ohio's report does have breastworks at its own place on the hill by Jul 2 (wave 5, last sentences)")
    tail(r, "Wave 5 (2026-11-15): the report of the 61st Ohio (Lieut. Col. Bown, OR27-1-R258 p. 738) puts the regiment 'to the cemetery, upon the south of Gettysburg' on Jul 1 and 'still in position behind the breastworks' on Jul 2 and Jul 5: breastworks existed at one regiment's place on Cemetery Hill by the morning of Jul 2 (no builder, hour or form).")
    r['stays_unsupported'] = list(r['stays_unsupported']) + ["Who built the breastworks of the 61st Ohio's position, when (night of Jul 1 or morning of Jul 2) and in what form"]
    lines(r, 'changes_vs_previous', "wave 5: the 61st Ohio's report (OR27-1-R258) documents breastworks at its position on Cemetery Hill on Jul 2 and Jul 5")
    cons(r, "E-04: add a short breastwork at the 61st Ohio's position on Cemetery Hill (south of the town), existing by the morning of Jul 2 (OR27-1-R258; builder and form open, so a plausible-procedural low earth-and-stone breastwork): it does not turn Cemetery Hill into a 'fortified hill' as a whole")

    r = R_['R14.E-12']
    more(r, 'd', C('OR1', 'R265', "got into the intrenchments of my battery"),
         note="WAVE 5: Wiedrich (Battery I, 1st NY) says that about 8 p. m. on Jul 2 a Confederate brigade 'got into the intrenchments of my battery': the works were in use at about 20:00 Jul 2 (the guns outside the cemetery gate).")
    tail(r, "Wave 5 (2026-11-15): Wiedrich (Battery I, 1st NY) says the Louisiana brigade about 8 p. m. on Jul 2 'got into the intrenchments of my battery' (OR27-1-R265 p. 752), a second hour (about 20:00) at which the works existed.")
    lines(r, 'changes_vs_previous', "wave 5: Wiedrich's battery intrenchments were in use about 20:00 Jul 2 (OR27-1-R265)")

    r = R_['R14.E-12']
    more(r, 'e', C('NPS', 'NPS-TPG-COMMEM', "Examples include artillery lunettes on East Cemetery Hill rebuilt with added earth and turf in the 1880s", role='context', reading="Examples include artillery lunettes on East Cemetery Hill rebuilt with added earth and turf in the 1880s (the NPS treatment guidelines for the commemorative area; the East Cemetery Hill lunettes were rebuilt, so no 1863 profile may be taken from them)"),
         note="WAVE 5: the NPS treatment guidelines (TPG-COMMEM, p. 10) say the East Cemetery Hill lunettes were 'rebuilt with added earth and turf in the 1880s' (the CLR of 2014 says 1878): the preserved profile is a rebuilt one.")
    r = R_['R14.E-18']
    more(r, 'g', C('NPS', 'NPS-TPG-COMMEM', "and Rodes’s CS Division breastworks along Seminary Avenue rebuilt around 1896", role='context', reading="...Rodes's CS Division breastworks along Seminary Avenue rebuilt around 1896 with a stone wall in place of the original parapet wall of stacked rails that had disappeared after the battle (NPS treatment guidelines, p. 10)"),
         note="WAVE 5: the NPS treatment guidelines name Rodes's Division breastworks along Seminary Avenue, whose original parapet wall was of stacked rails and 'had disappeared after the battle' (rebuilt about 1896 as a stone wall): the 1863 form is stacked rails, the standing wall is a rebuild; no day of building is given.")
    # ============================================================ E-05 / E-07 / E-08 / E-10 / E-03: Culp's Hill, Twelfth Corps reports not cited before
    r = R_['R14.E-05']
    add(r, S('h', "Abatis: after the Twelfth Corps was established on its new line on the morning of Jul 2 'a strong force was detailed for the construction of breastworks and abatis' (Slocum); the 145th NY 'built breastworks and abatis' (Price).", 'documented', 'supported', [
        C('OR1', 'R271', "a strong force was detailed for the construction of breastworks and abatis"),
        C('OR1', 'R280', "built breastworks and abatis")],
        note="WAVE 5: abatis is documented for the Twelfth Corps line on Jul 2 (corps-wide: it does not say which front). 'Boughs and logs in front as concealment' (the PDF) is not the same statement and stays unsupported; the head logs are not mentioned."), after='g')
    setsub(r, 'f', claim="Head logs on much of the line; boughs and logs in front as concealment; rifle pits.", tier='open_gap', support='partial')
    sub(r, 'f')['note'] = ("No hit for head-log/head log/boughs in front near Culp's Hill in OR 1-3, the library, Eddy, Morhous, Dawes or the NPS reports (searches 2026-11-13). WAVE 5: 'rifle-pit' is documented as a name of the works (the 111th Pa.: 'a rifle-pit of logs and stone', E-07 sub-claim d; the 107th NY: 'breastworks, or rifle-pits'; Maulsby and Ketcham: 'the rifle-pits on the right') and abatis is documented (sub-claim h); head logs and boughs in front stay open.")
    tail(r, "Wave 5 (2026-11-15): the Twelfth Corps detailed 'a strong force ... for the construction of breastworks and abatis' on Jul 2 (Slocum, OR27-1-R271 p. 759; the 145th NY also 'built breastworks and abatis', R280 p. 802), so abatis is documented for the line; rifle-pits are a name the reports give the works (111th Pa., 107th NY).")
    r['stays_unsupported'] = [x if not x.startswith('Head logs') else "Head logs, boughs in front as concealment (abatis is documented, wave 5); rifle pits as a separate work from the breastwork" for x in r['stays_unsupported']]
    lines(r, 'changes_vs_previous', "wave 5: abatis documented for the Twelfth Corps line (Slocum R271, Price R280); rifle-pit is the name the 111th Pa. and the 107th NY give the works")
    cons(r, "E-05 / E-08: add an abatis in front of the Twelfth Corps works on Culp's Hill from the morning of Jul 2 (documented: Slocum R271, Price R280; extent and form open): felled trees with their branches toward the enemy, plausible-procedural beyond the word")

    r = R_['R14.E-07']
    add(r, S('d', "Second Brigade (Kane; Cobham of the 111th commanded it until Kane arrived), 111th Pa. (Walker): 'moved into line of battle on the right of the Baltimore pike during the forenoon of the 2d instant', the 109th Pa. on its left and the First Division on its right; 'we at once began building a rifle-pit of logs and stone, which was finished in about three hours'; it stayed 'until a little before dark, when we were ordered to move to the rear and abandon our works'.", 'documented', 'supported', [
        C('OR1', 'R306', "during the forenoon of the 2d instant, the One hundred and ninth Pennsylvania Volunteers on our left, and connections with the First Division on the right"),
        C('OR1', 'R306', "We at once began building a rifle-pit of logs and stone, which was finished in about three hours."),
        C('OR1', 'R306', "remained until a little before dark, when we were ordered to move to the rear and abandon our works")],
        note="WAVE 5: a per-regiment clock for one of Kane's regiments (the PDF's 'per-regiment times not found'): start in the forenoon of Jul 2, three hours to finish, left a little before dark (about 19:00). It agrees with Kane's 'before sundown' (sub-claim a) and puts the Second Brigade's work earlier in the day than the 18:30-19:00 withdrawal."), after='c')
    sub_text(r, "no per-regiment times exist.", "no per-regiment times exist except the 111th Pa.'s (wave 5: forenoon of Jul 2, finished in about three hours, left 'a little before dark').")
    r['stays_unsupported'] = ["Per-regiment clock times for the other regiments of Kane's brigade (the 29th Pa. fortified 'on the 2d', E-08 c; the 109th Pa. none) and for Wadsworth's regiments", "Whether Wadsworth's works are 'on Greene's left' regiment by regiment"]
    lines(r, 'changes_vs_previous', "wave 5: the 111th Pa.'s report (R306) gives a per-regiment clock: forenoon of Jul 2, a rifle-pit of logs and stone finished in about three hours, abandoned a little before dark")
    cons(r, "E-07: the 111th Pa.'s rifle-pit of logs and stone on the right of the Baltimore pike (Second Brigade) is built from the forenoon of Jul 2 and finished in about three hours (documented): use as the build duration of one Second Brigade work; the brigade's works are left a little before dark")

    r = R_['R14.E-08']
    add(r, S('e', "Williams (First Division and the corps): at 8 a. m. orders were received 'to unite the two divisions of the corps, and occupy a new line on the right of Wadsworth's division'; the position 'was at once strengthened by construction of log breastworks along the entire crest of the ridge'; 'a thick stone fence parallel to the ridge, less than 50 yards behind it, furnished an excellent cover for this second line'.", 'documented', 'supported', [
        C('OR1', 'R272', "At 8 a. m. orders were received to unite the two divisions of the corps, and occupy a new line on the right of Wadsworth's division"),
        C('OR1', 'R272', "This strong natural position was at once strengthened by construction of log breastworks along the entire crest of the ridge."),
        C('OR1', 'R272', "A thick stone fence parallel to the ridge, less than 50 yards behind it, furnished an excellent cover for this second line.")],
        note="WAVE 5: the corps commander's own words. Clocks differ among the reports of one division: orders at 8 a. m. (Williams), about 9 a. m. (Ruger, sub-claim a), a move at about 11 a. m. (McDougall, sub-claim f); the distance of the stone wall behind the works is less than 50 yards (Williams), about 75 yards (Ruger, E-03 c) and a front line about 40 paces ahead of the wall (McDougall). All are carried; none is chosen."), after='b2')
    add(r, S('f', "First Brigade (McDougall) of the First Division: withdrawn about 11 a. m. from its first position, it marched across Rock Creek and 'formed in the woods about half a mile to the right of Cemetery Hill, in two lines of battle ... our rear line behind a stone wall, our front line parallel to the stone wall and about 40 paces in advance, when we immediately built breastworks to protect the front line'; the 5th Conn. 'on the morning of the 2d ... proceeded to fortify by throwing up breastworks'; the 145th NY in the second line was 'repairing the stone wall ... the regiments in the first line building breastworks' until 6.30 p. m.; the 46th Pa. 'commenced making breastworks in great haste, which were completed in the afternoon of the same day'.", 'documented', 'supported', [
        C('OR1', 'R274', "held this position until about 11 a. m., when we were withdrawn, and marched by the way of Littlestown and Gettysburg turnpike across Rock Creek"),
        C('OR1', 'R274', "our rear line behind a stone wall, our front line parallel to the stone wall and about 40 paces in advance, when we immediately built breastworks to protect the front line"),
        C('OR1', 'R275', "which moved forward, taking a new position, which we proceeded to- fortify by throwing up breastworks"),
        C('OR1', 'R280', "repairing the stone wall in the meantime, the regiments in the first line building breastworks"),
        C('OR1', 'R281', "commenced making breastworks in great haste, which were completed in the afternoon of the same day")],
        note="WAVE 5: McDougall's own report puts the First Brigade's works after a move at about 11 a. m. (after Ruger's 'about 9 a. m.' for the division, sub-claim a): the two clocks are carried. The 46th Pa.'s place is 'nearer the town and south of it, and to the right of the Gettysburg and Littlestown pike' (OCR garbled): the east side of the Baltimore pike."), after='e')
    add(r, S('g', "Regiments on the First Division's right toward Rock Creek (Colgrove's brigade, sub-claim b): the 27th Ind. 'had breastworks of stone erected' for its two left companies after being ordered at about 8 a. m. to the brigade's position (Fesler); the 107th NY, in position about daybreak of the 2d on the right of the First Brigade, was 'ordered to build breastworks, or rifle-pits, forming a line in connection with the Second Division' and 'about 7 p. m., the works being finished' was ordered to the pike (Crane).", 'documented', 'supported', [
        C('OR1', 'R287', "about 8 a. m., to march the regiment to a position occupied by the remainder of the brigade"),
        C('OR1', 'R287', "I had breastworks of stone erected to shelter them from the fire of the enemy's sharpshooters"),
        C('OR1', 'R290', "About daybreak of the 2d ultimo, I moved with the brigade"),
        C('OR1', 'R290', "Here we were ordered to build breastworks, or rifle-pits, forming a line in connection with the Second Division, Twelfth Corps. About 7 p. m., the works being finished")],
        note="WAVE 5: per-regiment builders and clocks the PDF did not have (start about daybreak to 8 a. m.; the 107th NY's works finished by about 19:00)."), after='f')
    setsub(r, 'c', claim="The 29th Pa. (Rickards; Cobham's Second Brigade, with the 109th and 111th Pa.) began to fortify its own position on the 2d and was ordered by General Geary to leave its breastworks at 19:00.")
    more(r, 'c', C('OR1', 'R303', "The Twenty-ninth, One hundred and ninth, and One hundred and eleventh Regiments Pennsylvania Volunteers are deserving of much praise"),
         note="WAVE 5 CORRECTION: the earlier text called this regiment 'Candy's 29th PA'; Cobham's report of the Second Brigade (R303 p. 849) lists the 29th, 109th and 111th Pa. as his regiments, so it belongs to the Second Brigade (Kane, Cobham), not to Candy's First Brigade.")
    r['stays_unsupported'] = ["Exact hour the first Williams-division works were finished for the regiments not named in sub-claims f and g (the 46th Pa.: 'the afternoon'; the 107th NY: about 19:00; the 111th Pa. of Geary's division: about three hours from the forenoon)",
                              "Where Lockwood's regiments stood on the morning of Jul 3 before 17:00 ('various places')"]
    tail(r, "Wave 5 (2026-11-15): the corps and division commanders and eight more regiments' reports are now cited: Williams (orders at 8 a. m.; 'log breastworks along the entire crest of the ridge'; a thick stone fence less than 50 yards behind), McDougall (the First Brigade withdrawn at about 11 a. m., then 'immediately built breastworks' with its front line about 40 paces ahead of the stone wall), the 5th Conn. (fortified 'on the morning of the 2d'), the 145th NY (the first line building breastworks until 6.30 p. m.), the 46th Pa. (completed 'in the afternoon'), the 27th Ind. (breastworks of stone for two companies, ordered at about 8 a. m.) and the 107th NY (works finished about 7 p. m.).")
    lines(r, 'lookups', L('Official Records vol. 27 part 1 (wave 5)', "construction statements in the Twelfth Corps reports R271-R309 not cited before", 53, "Slocum, Williams, McDougall, Packer, Price, Selfridge, Fesler, Crane, Morse, Grimes, Walker read in context; Ketcham, Maulsby, Flynn, Creighton, Stevens, Pardee, Redington only mention the works of Jul 3-4"))
    lines(r, 'changes_vs_previous', "wave 5: CORRECTION of E-08 sub-claim c: the 29th Pa. is in the Second Brigade (Cobham R303), not Candy's; Williams (R272), McDougall (R274), Packer (R275), Price (R280), Selfridge (R281), Fesler (R287) and Crane (R290) give per-brigade and per-regiment builders, clocks and distances; the 'about 9 a. m.' (Ruger) and 'about 11 a. m.' (McDougall) clocks are a carried conflict")
    cons(r, "E-08: the First Division's works have per-brigade clocks: Williams' orders 8 a. m., Ruger's about 9 a. m., McDougall's brigade moved about 11 a. m. and 'immediately built' its breastworks (front line about 40 paces ahead of the stone wall), the 27th Ind. and 107th NY start about daybreak to 8 a. m. and the 107th NY's are finished about 19:00, the 46th Pa.'s 'in the afternoon': carry the 9 and 11 o'clock clocks as a selector, no default; the stone fence behind the works is less than 50 yd (Williams) or about 75 yd (Ruger)")

    r = R_['R14.E-03']
    add(r, S('e', "Distance from the breastworks to the stone wall behind them: 'less than 50 yards' (Williams); a front line 'about 40 paces' ahead of the stone wall (McDougall, First Brigade); about 75 yd (Ruger, sub-claim c); 'about 10 rods' (a soldier's letter, web page only, sub-claim d).", 'documented', 'conflict', [
        C('OR1', 'R272', "A thick stone fence parallel to the ridge, less than 50 yards behind it, furnished an excellent cover for this second line."),
        C('OR1', 'R274', "our rear line behind a stone wall, our front line parallel to the stone wall and about 40 paces in advance")],
        note="WAVE 5: two more OR witnesses for the distance; the values differ and are carried as selectable (no default)."), after='d')
    tail(r, "Wave 5 (2026-11-15): Williams (R272) puts the stone fence 'less than 50 yards' behind the breastworks and McDougall (R274, whose First Brigade included the 123rd NY) a front line 'about 40 paces' ahead of the wall: with Ruger's 75 yd and the web letter's 10 rods the distance is a four-value conflict; McDougall also dates the brigade's move to the new position at about 11 a. m.")
    lines(r, 'changes_vs_previous', "wave 5: the stone-wall distance is a four-value conflict (Williams, McDougall, Ruger, web letter); McDougall: the First Brigade moved at about 11 a. m.")

    r = R_['R14.E-10']
    add(r, S('f', "Night of Jul 2-3, after the Confederates took part of the works: the Union regiments that returned built new breastworks across their front: the 2nd Mass. 'formed in line at right angles with the line of breastworks. ... During the night breastworks were constructed along our new line'; the 13th NJ, at midnight in its old position, 'assisted in building breastworks, which formed the extreme right of our line, resting on Rock Creek, and which position flanked to some extent the enemy, who for the time occupied a portion of our works'.", 'documented', 'supported', [
        C('OR1', 'R288', "formed in line at right angles with the line of breastworks"),
        C('OR1', 'R288', "During the night breastworks were constructed along our new line."),
        C('OR1', 'R289', "when we were ordered to our old position, where we arrived at midnight"),
        C('OR1', 'R289', "we assisted in building breastworks, which formed the extreme right of our line, resting on Rock Creek, and which position flanked to some extent the enemy, who for the time occupied a portion of our works")],
        note="WAVE 5: new construction in the night of Jul 2-3 (the PDF searched for none): these are new works built across the Confederate hold on the old works, not the lower-hill works of the day; no hour except 'at midnight' (the 13th NJ arrived) is printed."), after='e')
    tail(r, "Wave 5 (2026-11-15): the First Division regiments that returned in the night found part of their works held by the Confederates and built new breastworks across their front: the 2nd Mass. 'During the night breastworks were constructed along our new line' (R288) and the 13th NJ, arriving at midnight, 'assisted in building breastworks, which formed the extreme right of our line, resting on Rock Creek' (R289).")
    lines(r, 'changes_vs_previous', "wave 5: new breastworks built in the night of Jul 2-3 across the Confederate hold on the lower works (2nd Mass. R288, 13th NJ R289)")
    cons(r, "E-10 / E-09: add a Jul 2-3 night construction on the lower hill: new breastworks at right angles to the old line (2nd Mass.) and on the extreme right resting on Rock Creek (13th NJ, from about midnight), built while the Confederates held part of the old works; this is the only documented construction of the night, not an extension at 18:30")
    r = R_['R14.E-09']
    sub(r, 'd')['note'] = ((sub(r, 'd').get('note') or '') + " WAVE 5: documented NEW construction exists for the night of Jul 2-3 (E-10 sub-claim f: the 2nd Mass. and the 13th NJ), not for 18:30.").strip()

    # ============================================================ E-13 / E-14: the books behind the NPS quotations (Nash 1911, Brainard 1915)
    r = R_['R14.E-13']
    more(r, 'f',
         C('XF', 'NASH-1911', "LETTER BY A MEMBER OF COMPANY A.", pp='326', role='context'),
         C('XF', 'NASH-1911', "Middletown, Md., July 8, 1863.", pp='326', role='context'),
         C('XF', 'NASH-1911', "Our brigade lay on the side hill. It was covered with large stones. We threw up a small breast-work to protect us.", pp='326'),
         note="WAVE 5: read in the regimental history itself (Nash 1911, printed p. 326): the passage is a letter 'by a member of Company A', unnamed, dated Middletown, Md., July 8, 1863, six days after the fight, printed in the history of 1911; the letter puts the breastwork in the sequence 'maneuvered around until 4 p. m., when the rebels advanced, and from that time until dark we had hot work. ... Our brigade lay on the side hill ... We threw up a small breast-work'. It is a contemporary letter (secondary print), not an official report.")
    sub(r, 'f')['claim'] = ("The 44th NY on Little Round Top threw up a small breastwork during the fighting of Jul 2: 'Our brigade lay on the side hill. It was covered with large stones. We threw up a small breast-work to protect us.' (a letter by an unnamed member of Company A written at Middletown, Md., on July 8, 1863, printed in Nash's regimental history of 1911, p. 326; also quoted by the NPS).")
    tail(r, "Wave 5 (2026-11-15): the 44th NY passage is read in its own book: Nash 1911, p. 326, prints it as a 'letter by a member of Company A', dated Middletown, Md., July 8, 1863.")
    lines(r, 'changes_vs_previous', "wave 5: the 44th NY small breastwork is read in Nash 1911 p. 326 (a letter of July 8, 1863 by an unnamed member of Company A), not only through the NPS")

    r = R_['R14.E-14']
    more(r, 'i',
         C('XF', 'BRAINARD-1915', "As soon as the regiments took their positions, men from each went down the slope to the front and stationed themselves behind the rocks which thickly strewed the side of the hill."),
         C('XF', 'BRAINARD-1915', "They were also instructed by Colonel Garrard to erect a rough stone wall to afford better protection for themselves."),
         C('XF', 'BRAINARD-1915', "This fight took place between 4.00 and 5.00 o'clock p.m.", role='context'),
         note="WAVE 5: read in the regimental history itself (Brainard, Campaigns of the 146th NY, 1915): the order to erect a rough stone wall is given as the regiments took their positions, before the attack ('Soon after this disposition was made, the Confederates attacked vigorously'), and the book dates the fight between 4.00 and 5.00 p. m.; the printed page is not recoverable from the OCR running heads. Garrard's own report (sub-claim a) dates the wall 'at night'.")
    tail(r, "Wave 5 (2026-11-15): the 146th NY passage is read in its own book (Brainard 1915): 'They were also instructed by Colonel Garrard to erect a rough stone wall' as the regiments took their positions, before the attack of between 4.00 and 5.00 p. m.")
    lines(r, 'changes_vs_previous', "wave 5: the 146th NY's instruction to erect a rough stone wall is read in Brainard 1915 itself, with the clock of the fight (4.00 to 5.00 p. m.)")

    # ============================================================ E-18: Confederate right, Round Top front, Jul 3 morning
    r = R_['R14.E-18']
    add(r, S('l', "On 'the mountain' side (the Round Top slopes by position) early on Jul 3: the 4th Alabama (Scruggs), having attacked 'up the mountain' on Jul 2 and remained 'in the enemy's front, some 200 yards distant, during the night', 'early on the next morning ... threw up a line of breastworks composed of rock, and assumed the defensive', held 'during the day until late in the afternoon'.", 'documented', 'supported', [
        C('OR2', 'R443', "we remained in the enemy's front, some 200 yards distant, during the night"),
        C('OR2', 'R443', "Early on the next morning, we threw up a line of breastworks composed of rock, and assumed the defensive")],
        note="WAVE 5: the OR does document a Confederate rock breastwork built early on Jul 3 (the PDF's 'No Confederate works found in the notes for July 2-3'); it is on the Round Top slopes where the 4th Alabama had attacked on Jul 2 (the report says 'the mountain'), not one of the PDF's five sites. Benning (R458) and Waddell (R462) are the Union-side witnesses of the night's building (E-14 sub-claim f); no length or profile."), after='k')
    r['stays_unsupported'] = ["Confederate works on Jul 2 and the morning of Jul 3 at Seminary Ridge, Oak Hill and Benner's Hill (works on the Round Top slopes on Jul 3, after Pickett's Charge at McMillan and Shultz Woods and Johnson's division breastworks on the Forney farm are documented, the last without a day)", 'Dimensions of any Confederate work', 'Length/form of the Middle Street barricade']
    tail(r, "Wave 5 (2026-11-15): the 4th Alabama (Scruggs, OR27-2-R443 p. 391) 'early on the next morning' (Jul 3) 'threw up a line of breastworks composed of rock' on 'the mountain' side where it had attacked on Jul 2 (the Round Top slopes by position) and held it until late in the afternoon: a documented Confederate work on the morning of Jul 3, though not at the PDF's five sites.")
    lines(r, 'lookups', L('Official Records vol. 27 part 2 (wave 5)', "construction statements in the reports of part 2 not cited before", 34, "Scruggs (4th Alabama) documents a rock breastwork early on Jul 3; the other hits are Jul 4-14, Harpers Ferry, Winchester, Harrisburg and Wrightsville; White's 'threw up breastworks' (R448) is the action at Funkstown, not Gettysburg"))
    lines(r, 'changes_vs_previous', "wave 5: a Confederate rock breastwork of early Jul 3 on the Round Top slopes (4th Alabama, R443)")
    cons(r, "E-18: add a Confederate rock breastwork on the Round Top slopes early on Jul 3 (4th Alabama; OR27-2-R443; the report says 'the mountain'): a line of piled rock, built before the morning's fighting and held until late in the afternoon; the 'no Confederate works Jul 2-3' gap stays true for Seminary Ridge, Oak Hill and Benner's Hill")

    # ============================================================ aggregate
    r = R_['R14.0000']
    r['corrected_claim'] = r['corrected_claim'].rstrip() + (" Third pass 2026-11-15: an Official Records sweep for construction statements in reports not yet cited (97 reports, read and sorted), the texts that became local after 2026-11-14 (Sanitary Commission report 1863, Reily 1885, History of Adams County 1886) and two books read behind NPS quotations (Nash 1911, Brainard 1915) were folded in; four page images were looked at, one of which CORRECTS an earlier claim (the 95th NY inscription reads 10:30 a.m., not 10:50); the rows that changed are listed in REPORT.md.")
    r['sub_claims'][2]['claim'] = "Open gaps remain (1863 dimensions of most works and any length, clocks of many works, the 600-yd barricade, damage state of the works, web-only claims)."

    # ============================================================ S-006 CORRECTION: the Dawes memoir sentence about 'the two post and rail fences' is Antietam, not Gettysburg
    r = R_['R14.S-006']
    e = sub(r, 'e')
    e['citations'] = [c for c in e['citations'] if not (c.get('src') == 'KIT' and c.get('ref') == 'servsixthwiscon00dawerich')]
    e['citations'] = [
        C('KIT', 'servsixthwiscon00dawerich', "The regiment halted at the fence along the Cashtown Turnpike, and I gave the order to fire."),
        C('KIT', 'servsixthwiscon00dawerich', "our carefully aimed muskets, resting on the fence rails"),
        C('KIT', 'servsixthwiscon00dawerich', "I ordered my men to climb over the turnpike fences and advance."),
        C('KIT', 'servsixthwiscon00dawerich', "fell dead while climbing the second fence, and many were struck on the fences")] + e['citations']
    e['claim'] = ("Fences stood on both sides of the Chambersburg turnpike where the 6th Wisconsin charged the railroad cut on Jul 1, and the 6th Wisconsin men climbed them: Dawes's memoir (1890): the regiment 'halted at the fence along the Cashtown Turnpike', fired 'resting on the fence rails' (a rail fence), then climbed 'the turnpike fences' (two: Captain Ticknor 'fell dead while climbing the second fence'), type not named; "
                  "Fairfield (National Tribune, quoted by the NPS): the first fence on the south side 'was an old one, and we pulled it down', the fence on the north side 'was a new post-and-rail fence'; Sullivan (memoir, quoted by the NPS): 'a stake and rider fence on each side of it'.")
    e['note'] = ("Three participants of the same charge (a memoir of 1890, a National Tribune piece quoted by the NPS, a memoir quoted by the NPS): fences on both sides of the pike at the McPherson farm; the type is a conflict (a rail fence, type not named / new post-and-rail on the north and an old fence on the south / stake and rider). None says the type for the whole pike. The two NPS quotations are endnotes of the NPS report (each printed twice in its notes). "
                 "WAVE 5 CORRECTION (2026-11-15): the passes of 2026-11-14 cited Dawes's sentence 'In climbing the two post and rail fences that lined the turnpike, great numbers of men were killed' for the Chambersburg pike; the page map of the book (archive.org page-by-page OCR) puts it on printed p. 95, in the Antietam chapter: it is the Sharpsburg and Hagerstown turnpike of 19 Sept 1862. It is withdrawn here. Dawes's Gettysburg chapter has the four statements now cited (fence along the Cashtown Turnpike, rail fence, turnpike fences, second fence) and names no fence type other than 'fence rails'.")
    sub_text(r, "his memoir (1890) names 'the two post and rail fences that lined the turnpike',", "his memoir (1890) has the regiment halt 'at the fence along the Cashtown Turnpike', fire 'resting on the fence rails' and climb 'the turnpike fences' (two; no type named; WAVE 5 CORRECTION: the memoir's 'two post and rail fences that lined the turnpike' is the Antietam turnpike and was cited here in error until 2026-11-15),")
    r['stays_unsupported'] = ["Post-and-rail along the whole pike (no source covers more than the McPherson-farm stretch; Dawes's memoir names no type)"]
    r['conflicts_carried'] = [x.replace("post and rail at the McPherson farm (Dawes 1890; Fairfield: new post-and-rail on the north side, an old fence on the south)", "at the McPherson farm a rail fence of unnamed type (Dawes 1890), new post-and-rail on the north side and an old fence on the south (Fairfield)") for x in r['conflicts_carried']]
    r['product_consequence'] = [x.replace("(three participants of the 6th Wisconsin's charge, documented-secondary) with the type a selector: post and rail (Dawes), new post-and-rail", "(three participants of the 6th Wisconsin's charge, documented-secondary) with the type a selector: a rail fence of unnamed type (Dawes), new post-and-rail") for x in r['product_consequence']]
    for l_ in r['lookups']:
        l_['result'] = l_['result'].replace("Dawes 1890 (post and rail)", "Dawes 1890 (turnpike fences, rail fence, no type; the memoir's 'two post and rail fences' is Antietam)")
    lines(r, 'changes_vs_previous', "wave 5: CORRECTION: Dawes's 'two post and rail fences that lined the turnpike' is the Antietam turnpike (printed p. 95), not the Chambersburg pike; replaced by Dawes's Gettysburg statements (fence along the Cashtown Turnpike, fence rails, two turnpike fences)")
    cons(r, "S-006 CORRECTION: do not use 'post and rail (Dawes)' for the McPherson-farm stretch: Dawes's Gettysburg chapter names no type (fence rails, two turnpike fences); the type stays a selector among Fairfield (new post-and-rail north, old south), Sullivan (stake and rider), the NPS (Virginia worm, north side) and the rail fence of unnamed type")

    # ============================================================ register references (the rows that had open gaps but no proposed entry)
    R_['R14.E-04']['register_refs'] = ['fence-1-EG-06']
    R_['R14.S-001']['register_refs'] = ['fence-1-EG-21']
    R_['R14.S-002']['register_refs'] = ['fence-1-EG-17']
    R_['R14.S-005']['register_refs'] = ['fence-1-EG-22']
    R_['R14.S-007']['register_refs'] = ['fence-1-EG-20']
    R_['R14.E-08']['register_refs'] = ['fence-1-EG-04', 'fence-1-EG-14']
    R_['R14.E-17']['register_refs'] = ['fence-1-EG-08', 'fence-1-EG-19']
    R_['R14.0000']['register_refs'] = ['fence-1-EG-%02d' % i for i in range(1, 23)]
