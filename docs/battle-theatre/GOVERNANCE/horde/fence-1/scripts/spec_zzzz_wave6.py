"""Wave 6 (2026-11-16) additions and corrections to the fence-1 row specs (fourth pass; ROWS stays empty, apply(rows_by_id) edits the rows of the earlier spec files).

What this pass rests on (all local, all read in the text, nothing from memory):
 - pages that the web workstream fetched on 2026-11-16 and recorded in its ledger (docs/.../ws-web/retry/fetches.jsonl, one record per F-id): the NPS page of Hazlett's Battery (F-300, the
   PDF key NPS-Hazlett), the NPS Little Round Top pages (F-320, F-321, the PDF key NPS-LRT), the NPS Civil War Series booklet 'The Battle of Gettysburg' (F-330 to F-348, the PDF key
   NPS-CWS10: section 10 read, no statement on rail breastworks), the NPS pages on Culp's Hill (F-322) and buildings and farms (F-325), and Minnigh's guide of 1892 (F-352, F-353)
 - NPS documents that became local after the third pass: the Historic American Buildings Survey records (HABS PA-359 of the seminary main building) and the NPS Cultural Landscapes
   Inventory of Little Round Top and the Landscape Report of Little Round Top (statements the web workstream had also extracted into web-nps-landscape.jsonl)
 - texts downloaded by this shard on 2026-11-16 (one request each): the NPS Gettysburg Seminar Papers (essays of Barnett, Hartwig, Harman and Atkinson on www.npshistory.com) and Clark's
   Histories of the several regiments and battalions from North Carolina vol. 5 (1901) from archive.org (md5 equal to the archive.org record)
Nothing here lowers a tier without a source; every new quote is resolved by build_corrections.py exactly as the old ones are (found verbatim exactly once, offsets and sha256 stored)."""
from spec_lib import *

ROWS = []

P6 = '2026-11-16'


def sub(row, sc):
    for s in row['sub_claims']:
        if s['sc'] == sc:
            return s
    raise KeyError('%s has no sub-claim %s' % (row['id'], sc))


def add(row, s, after=None):
    if any(x['sc'] == s['sc'] for x in row['sub_claims']):
        raise KeyError('%s already has sub-claim %s' % (row['id'], s['sc']))
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


def app(row, sc, text):
    s = sub(row, sc)
    s['claim'] = s['claim'].rstrip() + ' ' + text


def lines(row, field, *items):
    row[field] = list(row[field]) + list(items)


def tail(row, text):
    row['corrected_claim'] = row['corrected_claim'].rstrip() + ' ' + text


def cons(row, *new):
    row['product_consequence'] = list(row['product_consequence']) + list(new)


def drop_blocked(row, key):
    n = len(row['blocked_host'])
    row['blocked_host'] = [b for b in row['blocked_host'] if b['source_key'] != key]
    if len(row['blocked_host']) != n - 1:
        raise KeyError('%s: blocked entry %r not found exactly once' % (row['id'], key))


def drop_stays(row, prefix, replacement=None):
    hit = [i for i, x in enumerate(row['stays_unsupported']) if x.startswith(prefix)]
    if len(hit) != 1:
        raise KeyError('%s: stays_unsupported prefix %r matches %d' % (row['id'], prefix, len(hit)))
    if replacement is None:
        del row['stays_unsupported'][hit[0]]
    else:
        row['stays_unsupported'][hit[0]] = replacement


# the NPS landscape documents carry the printed page of the report in their page footer
P_LRT_CLI_24 = 'Page 24 of 107'
P_LRT_CLI_70 = 'Page 70 of 107'


def apply(R_):
    # ============================================================ E-15: the PDF's NPS-Hazlett page identified and read
    r = R_['R14.E-15']
    more(r, 'c', C('WEBF', 'F-300', "Hazlett’s gunners climbed up the rocky slopes, dragging the guns, caissons, and limbers by hand over the harsh terrain.",
                   note="NPS page 'Hazlett's Battery' (nps.gov/places/hazlett-s-battery.htm, the PDF's NPS-Hazlett), fetched 2026-11-16 by the web workstream; the page cites no basis. The web workstream's evidence line WLK2-hazlett-nps-R14E15-01 prints this sentence without the word 'up'; the page text has 'climbed up the rocky slopes' and the quote here is the verbatim one."))
    app(r, 'c', "WAVE 6 (2026-11-16): a fifth by-hand account: the NPS page on the battery's monument says the gunners climbed up the rocky slopes 'dragging the guns, caissons, and limbers by hand over the harsh terrain' (no basis named; it gives no hour of first fire and says nothing of an emplacement).")
    sub(r, 'c')['note'] = (sub(r, 'c')['note'] + " WAVE 6: the NPS page takes the by-hand version without naming a basis, so it does not settle the conflict; hand-hauled, horse-hauled with infantry help and teams-only stay selectable, no default.").strip()
    drop_blocked(r, 'NPS-Hazlett')
    tail(r, "Wave 6 (2026-11-16): the NPS page 'Hazlett's Battery' (the PDF's NPS-Hazlett, identified and read by the web workstream: https://www.nps.gov/places/hazlett-s-battery.htm) says the gunners climbed up the rocky slopes 'dragging the guns, caissons, and limbers by hand over the harsh terrain': a fifth by-hand account with no basis cited; the page gives no first-fire hour and no emplacement statement, so 17:45 and 'no epaulement' stay unsupported.")
    lines(r, 'lookups', L('web page (wave 6)', "NPS page 'Hazlett's Battery', https://www.nps.gov/places/hazlett-s-battery.htm, fetched 2026-11-16 by the web workstream (fid F-300, ledger docs/battle-theatre/GOVERNANCE/horde/ws-web/retry/fetches.jsonl)", 1,
                   "the hand-hauling sentence (secondary, no basis cited); no hour of first fire; no emplacement; 'Over the span of two hours Battery D helped save Little Round Top' is a duration"))
    lines(r, 'changes_vs_previous', "wave 6 (2026-11-16): the PDF's NPS-Hazlett page is identified and read (no longer blocked/unidentified): one more by-hand account, no basis; the web workstream's line for it quotes the sentence without the word 'up' (the verbatim quote is used here)")
    cons(r, "E-15: the hauling-method selector gains the NPS page's by-hand account (documented-secondary, no basis); still no default; first fire 17:45 and 'no epaulement' stay marked gaps")

    # ============================================================ E-13 / E-14: Little Round Top walls (NPS CLI and CLR, Then-and-Now caption)
    r = R_['R14.E-13']
    more(r, 'd', C('NPSW', 'gett_learn_photosmultimedia_little-round-top-then-and-now', "Natural and manmade fortifications built by Union troops on July 2, 1863 on the southern slope of Little Round Top.", role='supports',
                   note="NPS Then-and-Now page, caption 3 (the left image is a Library of Congress photograph by O'Sullivan, 'just days after the battle')."),
         C('NPS', 'NPS-CLI-LRT', "CE 1863 Built Defensive stone walls are built along the summit of Little Round Top and at Vincent Spur.", pp=P_LRT_CLI_24, role='supports'),
         note="WAVE 6: the NPS also says (CLI chronology) that defensive stone walls were built in 1863 along the summit of Little Round Top and at Vincent Spur, and (Then-and-Now caption) that fortifications were built by Union troops on July 2, 1863 on the southern slope: the PDF's 'no construction' is contradicted by the NPS as well as by R201 (builders, hours and units are not stated there).")
    add(r, S('h', "NPS (Cultural Landscapes Inventory of Little Round Top): the stone walls on the southeast slope of Little Round Top 'were built for defensive purposes by the Union army' in 1863 and restored in the 1890s; the chronology lists for 1863 'Defensive stone walls are built along the summit of Little Round Top and at Vincent Spur', and the same inventory describes Vincent Spur as the rocky and wooded saddle between the two Round Tops that 'provided a strong defensive position for Vincent's Union Brigade on July 2'. Builder unit, day and hour are not stated; the walls as they stand (about 900 ft, about 3 ft wide, 2 ft high) are the 1890s restoration and give no 1863 profile.",
             'documented', 'partial',
             [C('NPS', 'NPS-CLI-LRT', "CE 1863 Built Defensive stone walls are built along the summit of Little Round Top and at Vincent Spur.", pp=P_LRT_CLI_24, role='supports'),
              C('NPS', 'NPS-CLI-LRT', "The stone walls are located on the southeast slope of Little Round Top, and were built for defensive purposes by the Union army and restored in the 1890s.", pp=P_LRT_CLI_70, role='supports'),
              C('NPS', 'NPS-CLI-LRT', "This rocky and wooded saddle between the two Round Tops provided a strong defensive position for Vincent's Union Brigade on July 2.", pp='Page 48 of 107', role='context')],
             note="Secondary (NPS inventory, text of 2012-2020). It contradicts 'no construction attributed' for Vincent's ground without naming a unit; the standing rule applies: no 1863 profile from the rebuilt walls."), after='g')
    add(r, S('i', "NPS (Cultural Landscape Report of Little Round Top): the hill's terrain was 'not greatly changed by the battle' except that several stone walls that delineated properties were dismantled to create stone breastworks 'stacked rapidly by Union forces immediately before and during' the battle; individual soldier barricades 'peppered the boulders' on the face of Little Round Top.",
             'documented', 'supported',
             [C('NPS', 'NPS-CLR-LRT', "the dismantling of several stone walls that delineated proper es to create stone breastworks stacked rapidly by Union forces immediately before and during ba le", role='supports',
                reading="the dismantling of several stone walls that delineated properties to create stone breastworks stacked rapidly by Union forces immediately before and during battle (the text layer drops the ligatures 'tt', 'ti')"),
              C('NPS', 'NPS-CLR-LRT', "individual soldier barricades that peppered the boulders on the face of Li le Round Top", role='supports',
                reading="individual soldier barricades that peppered the boulders on the face of Little Round Top (the text layer drops the ligature 'tt')")],
             note="Secondary (NPS report, 2012). It says which walls fed the breastworks (property walls, not named) and dates the stacking 'immediately before and during battle' (Jul 2), which fits the 83rd Pa. and the 44th NY; the report's own Figure 2.11 is not read here."), after='h')
    tail(r, "Wave 6 (2026-11-16): the NPS inventory records defensive stone walls built in 1863 on the summit and at Vincent Spur (the saddle between the Round Tops that the inventory calls the strong defensive position of Vincent's brigade), a Then-and-Now caption says fortifications were built by Union troops on July 2 on the southern slope, and the Landscape Report says property walls were dismantled and stacked into breastworks immediately before and during the battle; none names the unit, so the 'no construction' of the PDF is contradicted by the NPS as well as by the 83rd Pa. (R201) and the 44th NY.")
    lines(r, 'lookups', L('NPS pages and reports (wave 6)', "NPS Cultural Landscapes Inventory of Little Round Top pp. 24 and 70; Cultural Landscape Report of Little Round Top; Then-and-Now page 'Fortifications on Little Round Top' (statements also extracted by the web workstream into web-nps-landscape.jsonl)", 4, "1863 stone walls at Vincent Spur and on the summit (no unit, day or hour), property walls dismantled for the breastworks, soldier barricades among the boulders"))
    lines(r, 'changes_vs_previous', "wave 6 (2026-11-16): two sub-claims added (h: 1863 walls at Vincent Spur and on the summit; i: property walls dismantled, soldier barricades) and two citations added to d: the NPS now contradicts 'no construction' on Vincent's own ground as well as the OR does")
    cons(r, "E-13: on the southeast slope (Vincent Spur) add a defensive stone wall built in 1863 (documented-secondary, unit and hour open; length, height and profile are gaps, the 1890s restoration is not an 1863 profile); the property stone walls dismantled for the breastworks are a state change of existing features (which ones is a gap)")

    r = R_['R14.E-14']
    add(r, S('l', "Throughout its occupation until July 5, Union forces 'extended and refined' the Little Round Top walls (NPS Cultural Landscapes Inventory): the building went on after the first night, to the end of the occupation.",
             'documented', 'supported',
             [C('NPS', 'NPS-CLI-LRT', "Throughout its occupation until July 5, Union forces extended and refined these walls.", pp=P_LRT_CLI_70, role='supports')],
             note="Secondary (NPS inventory); names no unit, day or length of the later work. The same passage says the boulder-strewn slopes gave the infantry 'ample materials to build stone breastworks during the night of July 2 and morning of July 3' (sub-claim c)."), after='k')
    add(r, S('m', "Source of the stone: several property stone walls were dismantled to create stone breastworks 'stacked rapidly by Union forces immediately before and during' the battle, and individual soldier barricades 'peppered the boulders' on the face of the hill (NPS Cultural Landscape Report of Little Round Top).",
             'documented', 'supported',
             [C('NPS', 'NPS-CLR-LRT', "the dismantling of several stone walls that delineated proper es to create stone breastworks stacked rapidly by Union forces immediately before and during ba le", role='supports',
                reading="the dismantling of several stone walls that delineated properties to create stone breastworks stacked rapidly by Union forces immediately before and during battle (the text layer drops the ligatures 'tt', 'ti')"),
              C('NPS', 'NPS-CLR-LRT', "individual soldier barricades that peppered the boulders on the face of Li le Round Top", role='supports',
                reading="individual soldier barricades that peppered the boulders on the face of Little Round Top (the text layer drops the ligature 'tt')")],
             note="Secondary (NPS report, 2012). 'Immediately before and during battle' is earlier than the 'night of July 2' of the other NPS statements and fits the 146th NY's instruction before the attack (sub-claim i): the building clock of the slope walls stays a selectable value."), after='l')
    drop_blocked(r, 'NPS-LRT')
    drop_stays(r, 'Wall length and height of the 1863 works', "Wall length and height of the 1863 works (the 2-3 ft is a general NPS figure; the NPS inventory's 900 ft, 3 ft by 2 ft walls at Vincent Spur are the 1890s restoration)")
    tail(r, "Wave 6 (2026-11-16): the PDF's NPS-LRT is identified (the NPS pages on Little Round Top, F-320 and F-321, and the NPS inventory and report already cited) and carries only general statements; the NPS inventory adds that Union forces 'extended and refined these walls' until July 5, and the NPS report that property walls were dismantled and stacked into breastworks immediately before and during the battle.")
    lines(r, 'lookups', L('web pages (wave 6)', "NPS pages Little Round Top (https://www.nps.gov/gett/learn/historyculture/little-round-top.htm, F-320) and 'Fortifications on Little Round Top Then & Now' (https://www.nps.gov/places/gettysburg-then-now-fortifications-lrt.htm, F-321), fetched 2026-11-16 by the web workstream", 2,
                   "park rehabilitation page (no works statement); the Then-and-Now page says 'Temporary stone walls would have been easy to build with the vast number of rocks nearby' (a modern inference, not an 1863 source)"))
    lines(r, 'changes_vs_previous', "wave 6 (2026-11-16): the PDF's NPS-LRT is identified and read (general statements only); two sub-claims added (l: extended and refined until Jul 5; m: property walls dismantled, soldier barricades)")
    cons(r, "E-14: the building window of the slope walls runs from 'immediately before and during battle' (NPS report; the 146th NY's instruction) through the night of Jul 2 and Jul 3 morning to the end of the occupation on Jul 5 ('extended and refined', NPS inventory); the stones come from dismantled property walls and boulders; the rebuilt 1882-1887 walls are not an 1863 profile")

    # ============================================================ E-17: Cemetery Ridge: Ashe 1901, the Brien farm study, the Angle wall on Jul 2, NPS-CWS10 read
    r = R_['R14.E-17']
    add(r, S('r', "A retrospective account of Jul 3 (Captain S. A. Ashe, Clark's North Carolina Troops vol. 5, 1901, p. 142; Ashe was not at Gettysburg and names no source): south of the projection (the Angle) 'Hall's and Harrow's Brigades continued the Federal line, behind breastworks of rails covered with earth and with rifle pits and shallow trenches in their front'; 'a first line of infantry held a strong fence along the pike in front of Hays and a low stone wall further down the valley'.",
             'documented', 'partial',
             [C('XD', 'CLARK-NC-V5-1901', "South of the projection Hall's and Harrow's Brigades continued the Federal line, behind breastworks of rails covered with earth and with rifle pits and shallow trenches in their front.", pp='142', role='supports',
                reading="(OCR 'con- tinued' joined; page 142 from the running heads 'The Pettigrew-Pickett Charge. 141' and '... 143' around the quote and the head '142 North Carolina Troops, 1861-65.')"),
              C('XD', 'CLARK-NC-V5-1901', "a first line of infantry held a strong fence along the pike in front of Hays and a low stone wall further down the valley", pp='142', role='context')],
             note="Secondary and retrospective (a Confederate officer's compilation of 1901 from Federal and Confederate accounts, source not named). It is the only text read that gives the FABRIC 'rails covered with earth' with rifle pits and shallow trenches in front for the Hall and Harrow line; the OR reports of that line say breastworks, rifle-pits or intrenchments (sub-claims a-p). No length, height or builder; 'rails covered with earth' is carried as the fabric value of the Harrow line on Jul 3, not as a continuous line."), after='h')
    add(r, S('s', "NPS study of the Brien farm: 'The Brady photograph does indicate the presence of a fence or defense works to the north and west of the Brien House, along the edge of what is now Hancock Avenue. A blow-up of this portion of the photograph indicates a stone and rider fence'; the study adds that Tilberg's report of 1943 on field defenses 'clearly describes the defense works built quickly at the edge of the tree line, and so accounts for the fencing material evident in the background'.",
             'documented', 'partial',
             [C('NPS', 'NPS-BRIEN-FARM', "The Brady photograph does indicate the presence of a fence or defense works to the north and west of the Brien House, along the edge of what is now Hancock Avenue. A blow-up of this portion of the photograph indicates a stone and rider fence.", role='supports'),
              C('NPS', 'NPS-BRIEN-FARM', "clearly describes the defense works built quickly at the edge of the tree line, and so accounts for the fencing material evident in the background", role='supports',
                reading="(the text layer prints the report's date as 'I9I43'; the sentence names Tilberg's 1943 report on field defenses)")],
             note="Secondary (an undated NPS study of the Brien house; the photograph is Brady's of July 1863, not read here; Tilberg's report of 2 Apr 1943 is an unpublished NPS file, listed in the Little Round Top report's bibliography, not found online). It places defense works 'built quickly at the edge of the tree line' north and west of the Brien house, on the Cemetery Ridge line, without a unit, a day or a length."), after='r')
    more(r, 'q', C('XD', 'NPS-SEM11-E7', "The stone wall along Cemetery Ridge only had one small opening for the artillery to pass through.", role='supports'),
         C('XD', 'NPS-SEM11-E7', "The 69th Pennsylvania Infantry from his brigade crouched behind the stone wall along the crest", role='supports'),
         note="WAVE 6: the NPS seminar essay on Wright's attack of Jul 2 (Atkinson) says that on the evening of Jul 2 the stone wall along Cemetery Ridge 'only had one small opening for the artillery to pass through' (where Brown's guns jammed) and that the 69th Pa. crouched behind the wall along the crest: the wall stood on Jul 2 evening with at least one gap; Webb's 'thrown down in places' (above) and this single opening are carried as two readings of the gaps.")
    drop_blocked(r, 'NPS-CWS10')
    tail(r, "Wave 6 (2026-11-16): the PDF's NPS-CWS10 is identified as the NPS Civil War Series booklet 'The Battle of Gettysburg' (all 20 sections fetched by the web workstream; section 10, the Second Corps on Cemetery Ridge on Jul 2, read: no statement on rail breastworks). New: a retrospective of 1901 gives 'breastworks of rails covered with earth and with rifle pits and shallow trenches in their front' for the Hall and Harrow line on Jul 3 (the fabric 'rails covered with earth'); an NPS Brien-farm study reads defense works at the edge of the tree line north and west of the Brien house from Brady's photograph; the NPS seminar essay on Wright's attack has the Angle wall with one small opening on Jul 2.")
    lines(r, 'lookups', L('web pages (wave 6)', "NPS Civil War Series 16, The Battle of Gettysburg, sections 1-20 (https://www.npshistory.com/publications/civil_war_series/16/sec1.htm to sec20.htm, F-201 and F-330 to F-348, fetched 2026-11-16 by the web workstream; the PDF keys NPS-CWS8, NPS-CWS10)", 20,
                   "section 10 (Cemetery Ridge on Jul 2) contains no statement about rail breastworks; section 17 quotes an officer of the 20th Mass. 'where there were no pits, only a rail fence' (the same officer's rifle-pit is already sub-claim h)"),
          L('local text (wave 6)', "Clark, Histories of the several regiments and battalions from North Carolina vol. 5 (1901): 'breastworks of rails covered with earth' (found in the local NC-CLARK-1901 scratch of the roster workstream, then downloaded from archive.org and md5-checked)", 1, "Ashe, p. 142: the fabric 'rails covered with earth' with rifle pits and shallow trenches for Hall's and Harrow's line on Jul 3"))
    lines(r, 'changes_vs_previous', "wave 6 (2026-11-16): the PDF's NPS-CWS10 is identified and read (no rail-breastwork statement); sub-claims r (rails covered with earth, Ashe 1901) and s (Brien farm study: defense works at the tree line) added; q gains the Jul 2 wall with one small opening (NPS seminar essay)")
    cons(r, "E-17: the Hall and Harrow line on Jul 3 may carry the fabric value 'rails covered with earth' with rifle pits and shallow trenches in front (documented-secondary, Ashe 1901; builder, hour and length open); defense works at the edge of the tree line north and west of the Brien house (NPS Brien study, Brady photograph) are a selectable work record with no dimensions")

    # ============================================================ E-18: Confederate rifle pits in front of Seminary Ridge on Jul 3
    r = R_['R14.E-18']
    add(r, S('m', "Seminary Ridge, Jul 3 afternoon: Brockenbrough's Virginia brigade 'advanced to the protection of some rifle pits in front of Seminary Ridge, but it took no part in the charge' (Captain Louis G. Young, Pettigrew's adjutant general, in Clark's North Carolina Troops vol. 5, 1901, p. 125; quoted by the NPS seminar essay on Seminary Ridge on Jul 3).",
             'documented', 'supported',
             [C('XD', 'CLARK-NC-V5-1901', "Afterward it advanced to the protection of some rifle pits in front of Seminary Kidge, but it took no part in the charge.", pp='125', role='supports',
                reading="Afterward it advanced to the protection of some rifle pits in front of Seminary Ridge, but it took no part in the charge. (OCR 'Sem- inary Kidge')"),
              C('XD', 'NPS-SEM12-E5', "Afterward it advanced to the protection of some rifle pits in front of Seminary Ridge, but it took no part in the charge.", role='context',
                note="The NPS seminar essay on Seminary Ridge on Jul 3 (Atkinson) quotes the passage from Young (footnote 58: Young, 'Pettigrew's Brigade at Gettysburg', Clark vol. 5, pp. 124-125).")],
             note="A participant's account written about 1900 (Young was Pettigrew's aide on Jul 3). The pits are 'in front of Seminary Ridge' on the Confederate side of the valley; builder, day of digging, number and length are not stated. This is the first positive evidence of Confederate works at Seminary Ridge on Jul 3 in this shard; sub-claim f stays open for Oak Hill, Benner's Hill and Seminary Ridge on Jul 2."), after='l')
    setsub(r, 'f', claim="Oak Hill and Seminary Ridge works on Jul 2 and the morning of Jul 3; Benner's Hill works (rifle pits in front of Seminary Ridge in the afternoon of Jul 3 are sub-claim m).")
    drop_stays(r, 'Confederate works on Jul 2 and the morning of Jul 3 at Seminary Ridge', "Confederate works on Jul 2 and the morning of Jul 3 at Seminary Ridge, Oak Hill and Benner's Hill (rifle pits in front of Seminary Ridge in the afternoon of Jul 3 are documented, sub-claim m; works on the Round Top slopes on Jul 3, after Pickett's Charge at McMillan and Shultz Woods and Johnson's division breastworks on the Forney farm are documented, the last without a day)")
    tail(r, "Wave 6 (2026-11-16): Captain Young (Pettigrew's adjutant general, 1901) puts Confederate rifle pits 'in front of Seminary Ridge' in the afternoon of Jul 3 (Brockenbrough's brigade advanced to their protection): the first positive statement of a Confederate work at Seminary Ridge on Jul 3; builder, day of digging and length are not stated.")
    lines(r, 'lookups', L('local text (wave 6)', "Clark vol. 5 (1901), Young, 'Pettigrew's Brigade at Gettysburg': 'rifle pits in front of Seminary Ridge' (the NPS seminar essay on Seminary Ridge on Jul 3 quotes it; the original is in the NC-CLARK-1901 scratch of the roster workstream and was downloaded from archive.org)", 1, "Confederate rifle pits in front of Seminary Ridge on Jul 3; no builder, no length"))
    lines(r, 'changes_vs_previous', "wave 6 (2026-11-16): sub-claim m added: Confederate rifle pits in front of Seminary Ridge on the afternoon of Jul 3 (Young 1901); sub-claim f narrowed to Oak Hill, Seminary Ridge on Jul 2 and Benner's Hill")
    cons(r, "E-18: add a Confederate rifle-pit line in front of Seminary Ridge for the afternoon of Jul 3 (documented-secondary, participant 1901; builder, day and length open, plausible-procedural low earth pits); Oak Hill, Benner's Hill and Seminary Ridge on Jul 2 stay gap-marked")

    # ============================================================ E-04 and E-12: Minnigh 1892, the Barnett essays (cannoneers, lunettes, Breck's letter of Jul 2)
    r = R_['R14.E-04']
    more(r, 'c', C('WEBF', 'F-353', "It was Steinwehr's command who threw up the lunettes for the cannon, which still remain on Cemetery Hill.", role='supports',
                   note="Minnigh's guide of 1892 (the Brigham Young University copy; the other scan F-352 has the same sentence with an OCR error 'lunettei'); names no source."))
    app(r, 'c', "WAVE 6: Minnigh's battlefield guide of 1892 adds one more book: 'It was Steinwehr's command who threw up the lunettes for the cannon, which still remain on Cemetery Hill' (no source named; the lunettes 'still remain' in 1892, before the NPS says they were rebuilt).")
    more(r, 'b', C('XD', 'NPS-SEM9-E4', "vigilant cannoneers put the finishing touches on lunettes dug around their guns, as they prepared for the combat they knew would renew in the morning.", role='supports'),
         C('XD', 'NPS-SEM11-E8', "During the relative calm of the morning hours, Wainwright’s cannoneers had constructed works around their pieces for additional protection against incoming fire.", role='supports'),
         note="WAVE 6: two NPS Gettysburg Seminar essays (Barnett) agree with the OR on the builders: the cannoneers dug lunettes around their guns on the evening of Jul 1 and 'constructed works around their pieces' in the calm of the morning of Jul 2.")
    d = sub(r, 'd')
    d['claim'] = ("Cemetery fences were down by Jul 2 and smashed again on Jul 3: Lieutenant Breck of Battery L, 1st NY, wrote in a letter dated July 2, 1863 (quoted in an NPS seminar essay by Barnett) of the Evergreen Cemetery after the cannonade 'a beautiful cemetery it was, but now how trodden down, laid a waste, desecrated. The fences are all down, the many graves have been run over'; Howard's report puts his own sentence ('overturning tombstones, and smashing fences') in the cannonade of about 13:00 Jul 3. The schedule row says Jul 2.")
    d['support'] = 'supported'
    d['citations'].extend([C('XD', 'NPS-SEM11-E8', "a beautiful cemetery it was, but now how trodden down, laid a waste, desecrated. The fences are all down, the many graves have been run over", role='supports'),
                           C('XD', 'NPS-SEM11-E8', "George Breck, Letter to Ellen, July 2, 1863, Reynolds’ Battery File, GNMPL.", role='supports',
                             note="Footnote 61 of the essay: the date of the letter. The letter itself was not read here.")])
    d['note'] = ("Howard's report does not print the day beside the sentence; the sequence (cannonade ceases 15:30, infantry line emerges from Seminary Ridge) places it on Jul 3. WAVE 6 (2026-11-16): a letter dated Jul 2, quoted by an NPS essay, has the fences 'all down' in the cemetery already on Jul 2 (the essay places the passage after the Confederate bombardment of the afternoon of Jul 2); the two dates are therefore two events, not a conflict: fences down by Jul 2, more smashed Jul 3. "
                 "The quotation is secondary (the essay does not print the hour of the letter, and which fences, iron railings or the others, are meant is not stated).")
    drop_stays(r, 'Date and extent of cemetery fence damage', "Extent of the cemetery fence damage on each day (which fences were down on Jul 2, what the Jul 3 cannonade added) and the hour of Breck's letter (the letter is quoted, not read)")
    tail(r, "Wave 6 (2026-11-16): the fence damage of the Evergreen Cemetery is dated by a letter of Jul 2 (Breck, quoted by an NPS seminar essay: 'The fences are all down') and again by Howard's report to the cannonade of Jul 3, so both days are documented; Minnigh's guide of 1892 is one more book that names Steinwehr's command as the builder of the lunettes (no source named).")
    lines(r, 'lookups', L('NPS Gettysburg Seminar Papers (wave 6)', "Barnett, 'Our Position Was Finely Adapted to Its Use: The Guns of Cemetery Hill' (volume 11, essay 8) and 'If Ever Men Stayed By Their Guns' (volume 9, essay 4), downloaded 2026-11-16 from www.npshistory.com", 2,
                   "cannoneers dug lunettes around the guns on the evening of Jul 1 and constructed works around their pieces on the morning of Jul 2; Breck's letter dated Jul 2: 'The fences are all down'"))
    lines(r, 'changes_vs_previous', "wave 6 (2026-11-16): sub-claim d (cemetery fences) now rests on a letter dated Jul 2 as well as on Howard's Jul 3 sentence (two events); sub-claim c gains Minnigh 1892; sub-claim b gains two NPS seminar statements on the builders")
    cons(r, "S-045 / FEN-evergreen-cemetery: fences down by Jul 2 (Breck's letter of Jul 2, documented-secondary) and further smashed in the cannonade of Jul 3 about 13:00 (Howard): both are state changes, the Jul 2 one is no longer only the PDF's scenario")

    r = R_['R14.E-12']
    more(r, 'b', C('XD', 'NPS-SEM9-E4', "vigilant cannoneers put the finishing touches on lunettes dug around their guns, as they prepared for the combat they knew would renew in the morning.", role='supports'),
         C('XD', 'NPS-SEM11-E8', "During the relative calm of the morning hours, Wainwright’s cannoneers had constructed works around their pieces for additional protection against incoming fire.", role='supports'),
         note="WAVE 6: the NPS Gettysburg Seminar essays of Barnett also name the cannoneers as the builders (evening of Jul 1; the calm of the morning of Jul 2).")
    more(r, 'd', C('XD', 'NPS-SEM11-E8', "Wainwright strengthened his batteries by having them entrench their positions on the hill.", role='supports'),
         C('XD', 'NPS-SEM11-E8', "buried it in one of the lunettes.", role='context'),
         note="WAVE 6: Barnett (NPS seminar essay) has Wainwright strengthening the batteries 'by having them entrench their positions on the hill' as the sun rose on Jul 2, and a gunner of Ricketts's battery burying a severed hand 'in one of the lunettes' when the battery went into position (the essay places that at the relief of Cooper's battery, about 16:00 Jul 2).")
    more(r, 'f', C('WEBF', 'F-353', "It was Steinwehr's command who threw up the lunettes for the cannon, which still remain on Cemetery Hill.", role='supports'),
         note="WAVE 6: Minnigh's guide of 1892 is one more book for the Steinwehr attribution (no source named; 'which still remain' in 1892).")
    tail(r, "Wave 6 (2026-11-16): two NPS Gettysburg Seminar essays (Barnett) agree that the cannoneers dug the lunettes (evening of Jul 1, finishing and entrenching in the morning of Jul 2) and place them in use at about 16:00 Jul 2; Minnigh's guide of 1892 is one more book that names Steinwehr's command as the builder (no source named).")
    lines(r, 'changes_vs_previous', "wave 6 (2026-11-16): sub-claims b and d gain the NPS Gettysburg Seminar statements (builders: cannoneers; Jul 2 morning entrenching), f gains Minnigh 1892")

    # ============================================================ E-02 and S-014: the Iron Brigade ordered to entrench on Culp's Hill (Hartwig)
    for rid, sc in (('R14.E-02', 'i'), ('R14.S-014', 'i')):
        r = R_[rid]
        add(r, S(sc, "Evening of Jul 1: after the survivors of the Iron Brigade rallied on Cemetery Hill late in the afternoon, 'Soon after, the Iron Brigade was ordered to the north slope of Culp's Hill and to entrench its position' (Hartwig, NPS Gettysburg Seminar essay on Herbst Woods).",
                 'documented', 'supported',
                 [C('XD', 'NPS-SEM10-E5', "Soon after, the Iron Brigade was ordered to the north slope of Culp’s Hill and to entrench its position.", role='supports')],
                 note="Secondary (an NPS historian's account of 2006 from the Iron Brigade's reports and memoirs); it dates the order to the evening of Jul 1 'soon after' the rally on Cemetery Hill and places the brigade on the north slope; no hour. It agrees with the 24th Michigan's 'first night of the battle' (sub-claim g) and Dawes's account (sub-claim c)."))
        tail(r, "Wave 6 (2026-11-16): Hartwig (NPS seminar essay on Herbst Woods) has the Iron Brigade ordered 'soon after' the rally on Cemetery Hill to the north slope of Culp's Hill and to entrench, which supports the evening of Jul 1 for the order without printing an hour.")
        lines(r, 'changes_vs_previous', "wave 6 (2026-11-16): sub-claim %s added (the Iron Brigade ordered to entrench on the north slope of Culp's Hill, Hartwig, NPS seminar essay)" % sc)

    # ============================================================ S-005: the Herbst Woods line had no barricade on the morning of Jul 1; the Eleventh Corps and the fences
    r = R_['R14.S-005']
    add(r, S('h', "State of the Herbst Woods line (the Iron Brigade's position west of McPherson's Ridge) on the morning of Jul 1: no barricade was built there; Colonel Williams of the 19th Indiana and Colonel Morrow of the 24th Michigan 'asked permission to withdraw to the crest of McPherson's Ridge and throw up rail barricades', which General Meredith refused, and Wadsworth held the timber to be the strongest position of the line (Hartwig, NPS Gettysburg Seminar essay).",
             'documented', 'partial',
             [C('XD', 'NPS-SEM10-E5', "asked permission to withdraw to the crest of McPherson’s Ridge and throw up rail barricades.", role='supports')],
             note="Secondary (an NPS historian, 2006). The essay says the request was made and refused; it does not say that no fence was used as cover in the woods. The essay itself uses the name 'McPherson's Ridge' (the 1863 reports do not, sub-claim f)."))
    more(r, 'g', C('XD', 'NPS-SEM10-E8', "Fences that might have served in the construction of a breastwork were thrown down in a twinkling and absolutely nothing remained to screen our line from the crossfire that poured upon it from flank and front", role='context'),
         note="WAVE 6: the NPS seminar essay on the Eleventh Corps (Harman) quotes Captain Lee of the 82nd Ohio: in the rush forward north of the town 'Fences that might have served in the construction of a breastwork were thrown down in a twinkling': at the point of the advance the fences were thrown down, not used as a line.")
    tail(r, "Wave 6 (2026-11-16): Hartwig (NPS seminar essay on Herbst Woods) records that the colonels of the 19th Indiana and 24th Michigan asked on the morning of Jul 1 to throw up rail barricades on the crest of McPherson's Ridge and were refused: no barricade stood on the Herbst Woods line that morning; Harman (NPS seminar essay on the Eleventh Corps) quotes an officer of the 82nd Ohio that fences were 'thrown down in a twinkling' in the advance north of the town.")
    lines(r, 'changes_vs_previous', "wave 6 (2026-11-16): sub-claim h added (no barricade on the Herbst Woods line on the morning of Jul 1; the request refused); g gains the Eleventh Corps advance note")
    cons(r, "S-005: no barricade on the Herbst Woods line on the morning of Jul 1 (documented-secondary: the request to throw up rail barricades was refused); the fences stood until Gamble's men used them (sub-claims a and d)")

    # ============================================================ S-006 and S-007: the NPS booklet on the fence along the pike and the charge at the cut
    r = R_['R14.S-006']
    more(r, 'e', C('WEBF', 'F-332', "The 6th paused at the fence along the pike and fired, halting Davis's attack on Cutler's men and causing many of them to seek cover in a cut where the railroad bed slices through McPherson's Ridge.", role='supports',
                   note="NPS Civil War Series booklet, section 3: the same event as Dawes's memoir; it names no fence type."),
         note="WAVE 6: the NPS Civil War Series booklet (secondary) also has the 6th Wisconsin pausing 'at the fence along the pike' and firing, without a fence type.")
    tail(r, "Wave 6 (2026-11-16): the NPS Civil War Series booklet repeats that the 6th Wisconsin paused at the fence along the pike and fired (no type).")
    lines(r, 'changes_vs_previous', "wave 6 (2026-11-16): sub-claim e gains the NPS booklet's sentence (the fence along the pike, no type)")

    r = R_['R14.S-007']
    more(r, 'a', C('WEBF', 'F-332', "The 95th New York and 14th Brooklyn regiments joined the 6th along the pike.", role='supports', note="NPS Civil War Series booklet, section 3."),
         note="WAVE 6: the NPS booklet (secondary) has the 95th NY and 14th Brooklyn joining the 6th along the pike before the charge for the cut; no clock.")
    lines(r, 'changes_vs_previous', "wave 6 (2026-11-16): sub-claim a gains the NPS booklet's sentence on the three regiments at the pike")

    # ============================================================ E-05, E-09, E-10: the NPS booklet and the NPS Culp's Hill page
    r = R_['R14.E-05']
    more(r, 'a', C('WEBF', 'F-322', "At mid-morning on July 2, elements of the Twelfth Corps arrived to reinforce the hill, including the 1,400 man brigade of George S. Greene.", role='context',
                   note="NPS page on Culp's Hill (the page follows with Greene's words: 'As soon as we were in position, we began to intrench ourselves and throw up breastworks...')."),
         note="WAVE 6: the NPS page on Culp's Hill puts the arrival of the Twelfth Corps elements including Greene's brigade 'at mid-morning on July 2' without a clock source; the OR and Greene's address give about 06:00 for the march (sub-claim a): both are carried, no default.")
    lines(r, 'changes_vs_previous', "wave 6 (2026-11-16): sub-claim a gains the NPS Culp's Hill page ('mid-morning'), carried against the OR's about 06:00")
    r = R_['R14.E-09']
    more(r, 'a', C('WEBF', 'F-339', "Greene stretched his line to the right and was able to occupy all of the works on the upper hill and those on the north slope of the lower one before the Confederates struck his line.", role='supports'),
         C('WEBF', 'F-339', "Maj. Gen. Henry W. Slocum's Twelfth Corps had occupied Culp's Hill south from its highest peak and had erected breastworks there.", role='supports'),
         note="WAVE 6: the NPS Civil War Series booklet (secondary) agrees: the Twelfth Corps had erected breastworks on Culp's Hill south from the highest peak; Greene occupied all the works on the upper hill and those on the north slope of the lower one.")
    lines(r, 'changes_vs_previous', "wave 6 (2026-11-16): sub-claim a gains two sentences of the NPS booklet (works erected by the Twelfth Corps; Greene occupying them)")
    r = R_['R14.E-10']
    more(r, 'c', C('WEBF', 'F-339', "Brig. Gen. George Steuart's left regiments occupied the empty breastworks on the lower hill", role='supports'),
         note="WAVE 6: the NPS Civil War Series booklet (secondary) tells the Union version: Steuart's left regiments 'occupied the empty breastworks on the lower hill'.")
    lines(r, 'changes_vs_previous', "wave 6 (2026-11-16): sub-claim c gains the NPS booklet's 'empty breastworks on the lower hill'")

    # ============================================================ S-002, S-012, S-013, S-010: the seminary building (HABS PA-359, NPS pages)
    r = R_['R14.S-002']
    more(r, 'e', C('NPS', 'NPS-HABS-pa0007', "Cupola used as post of observation by Union Generals Buford and Reynolds, July 1, 1863", role='supports',
                   note="HABS PA-359, typed data page signed by the Senior Historian of Gettysburg National Military Park, 21 Mar 1966 (the typed text has a star for the full stop); it names no source."),
         note="WAVE 6: the HABS record of the seminary main building (1966, National Park Service) says the cupola was used as a post of observation by Buford and Reynolds on Jul 1, 1863; the building is the Seminary's, which agrees with this sub-claim and not with Jun 30 (sub-claim a).")
    more(r, 'b', C('NPS', 'NPS-BOUNDARY-1988', "It served as a classroom and dormitory building and, during the battle, as a observation post, signal station and hospital.", role='supports',
                   note="The 1988 NPS boundary study on the 'Old Dorm' of the Lutheran Seminary; no day is named."),
         note="WAVE 6: the NPS boundary study of 1988 says the seminary's 'Old Dorm' served 'during the battle' as an observation post, signal station and hospital (no day).")
    s = sub(r, 'd')
    s['note'] = (s.get('note') or '') + " WAVE 6: HABS PA-360 (1958) names the College's old dormitory 'Old Dorm', Gettysburg College (formerly called Pennsylvania College), and the Library of Congress catalogue titles that record 'Pennsylvania College, Pennsylvania Hall' (a modern catalogue title, not a statement of the 1863 name); neither says anything about a cupola. The NPS Handbook No. 9 (1954) calls the large white building on the near side of the town 'Old Dorm at Gettysburg College, used as a hospital during the battle'. The identification of the cupola building with 'Pennsylvania Hall' stays 'documented partial'."
    s['citations'].append(C('NPS', 'NPS-HABS-pa0009', "Gettysburg College (formerly called Pennsylvania College)", role='context'))
    s['citations'].append(C('NPS', 'NPS-HB9-1954', "The large white building on this side of Gettysburg is \"Old Dorm\" at Gettysburg College, used as a hospital during the battle.", role='context'))
    lines(r, 'changes_vs_previous', "wave 6 (2026-11-16): HABS PA-359 (cupola used as post of observation by Buford and Reynolds on Jul 1), the 1988 NPS boundary study (observation post, signal station and hospital) and the HABS record and Handbook No. 9 for the College's 'Old Dorm' added")

    r = R_['R14.S-013']
    more(r, 'c', C('NPS', 'NPS-HABS-pa0007', "Building used as a hospital for Confederate wounded for several weeks after the battle", role='supports'),
         C('WEBF', 'F-325', "This structure, Schmucker Hall, was used to house wounded from both armies during and after the Battle of Gettysburg.", role='supports'),
         note="WAVE 6: HABS PA-359 (1966) has the main building used as a hospital for Confederate wounded for several weeks after the battle; the NPS Then-and-Now page says it housed wounded of both armies during and after the battle.")
    lines(r, 'changes_vs_previous', "wave 6 (2026-11-16): sub-claim c gains HABS PA-359 and the NPS Then-and-Now page (hospital for Confederate wounded for weeks; wounded of both armies)")
    r = R_['R14.S-012']
    more(r, 'e', C('WEBF', 'F-325', "This structure, Schmucker Hall, was used to house wounded from both armies during and after the Battle of Gettysburg.", role='supports'),
         note="WAVE 6: the NPS Then-and-Now page (Schmucker Hall housed wounded from both armies during and after the battle) agrees with the Adams Sentinel's 'hospitals of both armies'.")
    lines(r, 'changes_vs_previous', "wave 6 (2026-11-16): sub-claim e gains the NPS Then-and-Now page")
    r = R_['R14.S-010']
    add(r, S('f', "A fence stood in front of the seminary when the Library of Congress photograph of the building was made: the NPS caption reads 'A photographer’s assistant sits on a fence, looking up at the Lutheran Theological Seminary building' and adds that 'The seminary and the ground before it looks much like it did in 1863'. The page gives no date of the photograph and no fence type.",
             'documented', 'partial',
             [C('WEBF', 'F-325', "A photographer’s assistant sits on a fence, looking up at the Lutheran Theological Seminary building.", role='supports'),
              C('WEBF', 'F-325', "The seminary and the ground before it looks much like it did in 1863.", role='context')],
             note="Secondary (an NPS caption of a Library of Congress photograph; the photograph is the photo-match workstream's, not read here, and the date, summer 1863 or later, must be read from the Library's record). It shows that some fence stood before the seminary when the picture was taken, against the Adams Sentinel's 'fences almost wholly destroyed' (sub-claim e); the state of the fence line on Jul 1 stays open."), after='e')
    lines(r, 'changes_vs_previous', "wave 6 (2026-11-16): sub-claim f added (an NPS caption: a fence in front of the seminary in a Library of Congress photograph; date and type not on the page)")

    # ============================================================ S-008: the churches' pews covered with a temporary flooring (1863 newspaper via an NPS seminar essay)
    r = R_['R14.S-008']
    add(r, S('c', "The churches of the town taken for hospitals had their pews 'covered with a temporary flooring, upon which were the wounded': the Reverend James Freeman Clarke, who arrived in Gettysburg on Jul 7, wrote of 'all the churches of the town' (Boston Daily Transcript, 20 Jul 1863; quoted by Timothy H. Smith in an NPS Gettysburg Seminar essay). The statement is general (no church is named) and says 'covered', not 'removed'.",
             'documented', 'partial',
             [C('XD', 'NPS-SEM5-E6', "Reverend James Freeman Clarke arrived in Gettysburg on July 7, and stayed for several days. Upon his return to Massachusetts, he lectured on his visit to the battlefield. A few of his experiences were recorded in the Boston Daily Transcript on July 20, 1863.", role='context'),
              C('XD', 'NPS-SEM5-E6', "although all the churches of the town had been taken for hospitals - the pews having been covered with a temporary flooring, upon which were the wounded.", role='supports')],
             note="Secondary: an NPS essay quoting a Boston newspaper of 20 Jul 1863 (the newspaper itself is not read here). It is the only text read that speaks of the pews: boards over the pews of the churches used as hospitals, as seen by a visitor from Jul 7. It does not name the Catholic church, so sub-claim b (the Catholic church's pews 'removed') stays open."), after='b')
    setsub(r, 'b', claim="The pews of the Catholic church were removed and boards laid on the arrival of wounded (Aleteia): the page is blocked; a general 1863 statement that the churches taken for hospitals had their pews covered with a temporary flooring is sub-claim c; the 'by noon Jul 1' part is documented (sub-claim a2: 'before noon of July 1, 1863', Reily 1885).")
    drop_stays(r, 'Pews removed and boards laid', "Pews of the Catholic church removed and boards laid (no source read names this church; a general statement that the pews of the churches used as hospitals were covered with a temporary flooring is sub-claim c; the Aleteia page is blocked)")
    tail(r, "Wave 6 (2026-11-16): an NPS seminar essay quotes a Boston newspaper of 20 Jul 1863 (the Reverend J. F. Clarke, in Gettysburg from Jul 7): 'all the churches of the town had been taken for hospitals - the pews having been covered with a temporary flooring, upon which were the wounded': boards over the pews are documented in general, not for the Catholic church by name.")
    lines(r, 'lookups', L('NPS Gettysburg Seminar Papers (wave 6)', "Smith, 'These Were Days of Horror': The Story of the Gettysburg Civilians (volume 5, essay 6), downloaded 2026-11-16 from www.npshistory.com", 1, "churches taken for hospitals, pews covered with a temporary flooring (Boston Daily Transcript, 20 Jul 1863)"))
    lines(r, 'changes_vs_previous', "wave 6 (2026-11-16): sub-claim c added (the pews of the churches used as hospitals covered with a temporary flooring, Boston Daily Transcript 1863 via an NPS seminar essay); b narrowed to the Catholic church's pews")
    cons(r, "S-008 / H-02: inside the church show boards over the pews (documented-secondary, general for the churches used as hospitals); 'pews removed' stays a PDF scenario")

    # ============================================================ S-003: the Brady photograph entry
    r = R_['R14.S-003']
    for b in r['blocked_host']:
        if b['source_key'].startswith('Brady photograph'):
            b['what_to_read'] = (b['what_to_read'] + " WAVE 6 (2026-11-16): www.loc.gov answers the site's own challenge page (403, not solved or worked around) on its HTML collection page; its JSON interface answers 200 (web workstream, F-008); the Brady photographs of July 1863 are catalogued and tied to the 1863 landscape by the photo-match workstream (horde/ws10-photomatch); the McPherson ridge fence lines have to be read from that catalogue, not from this shard.").strip()
    lines(r, 'changes_vs_previous', "wave 6 (2026-11-16): the Brady photograph entry now points to the photo-match catalogue (horde/ws10-photomatch) for the fence lines")

    # ============================================================ every blocked web host: the probes of 2026-11-16
    probe = {'HN-Walls': 'F-233', 'HN-Hundreds': 'F-233', 'Wiki-D1/Wiki-CH': 'F-214', 'GD-219': 'F-232', 'DMNA-60NY': 'F-222', 'HMDB-13997': 'F-234', 'Wiki-Culp': 'F-214', 'Wiki-ECH': 'F-214',
             'GD-Housch': 'F-232', 'Wiki-LRT': 'F-214', 'SS-8009': 'F-217', 'SS-10491': 'F-217', 'Wiki-GBRR': 'F-214', 'Wiki-PennHall': 'F-214', 'GD-Fences': 'F-232', 'HMDB-17939': 'F-234',
             'ECW fence Friday': 'F-213', 'Aleteia': 'F-204', 'ECW-Bliss': 'F-213', 'HN-Spangler': 'F-233', 'Gettysburg Foundation George Spangler Farm': 'F-218'}
    for r in R_.values():
        for b in r.get('blocked_host', []):
            f = probe.get(b['source_key'])
            if f:
                b['what_to_read'] = (b['what_to_read'] + " [re-probed 2026-11-16, one request each, by this shard (tmp/fence-1/run6/host_probe_2026-11-16.txt) and by the web workstream (%s): the egress proxy still refuses the host (CONNECT tunnel failed, 403); blocked, not worked around.]" % f).strip()
                b['last_probe'] = P6

    # ============================================================ the aggregate row
    r = R_['R14.0000']
    tail(r, "Fourth pass 2026-11-16: the pages that the web workstream fetched (the PDF's NPS-Hazlett, NPS-LRT and NPS-CWS10 are now identified and read), the HABS records, NPS Gettysburg Seminar essays, Clark vol. 5 (1901) and two further NPS reports were read for the open sub-claims; the rows that changed are listed in REPORT.md; the nine blocked web hosts were asked once more and still refuse.")
    lines(r, 'changes_vs_previous', "wave 6 (2026-11-16): see REPORT.md, section 'Fourth pass'")
    r['product_consequence'] = list(r['product_consequence'])
    sc_text = sub(r, 'c')
    sc_text['claim'] = "Open gaps remain (1863 dimensions of most works and any length, clocks of many works, the 600-yd barricade, damage state of the works, web-only claims on refused hosts)."
