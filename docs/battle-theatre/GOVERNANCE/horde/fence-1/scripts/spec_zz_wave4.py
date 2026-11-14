"""Wave 4 (2026-11-14) additions to the fence-1 row specs.

Not a row list: ROWS stays empty and apply(rows_by_id) edits the rows that the earlier spec_*.py files define (build_corrections.load_specs calls it
after all specs are loaded). Every change here rests on text that is now local and was not searched, or not found, by the close-out of 2026-11-13:
 - page images looked at on 2026-11-14 (horde/fence-1/images/, image_checks.json): OR27-1 p.431 (Davis, 69th Pa.), p.856 (Greene), Gettysburg Compiler 1863-06-29
 - the NPS Historic Structures Report of the McPherson farm (S-003), the NPS Little Round Top landscape report with its quoted veterans (E-13, E-14),
   the NPS Cultural Landscapes Inventory of the Pickett's Charge area (E-18), the NPS 'Common Pride' study (S-016)
 - books acquired by other workstreams and now copied to tmp/fence-1/lib: Bates 1875, Biddle 1880, Hard 1868 (8th Illinois Cavalry), Barton 1898,
   Stoever in USCC-Smith 1868, Curtis 1891 (24th Michigan), Small 1886 (16th Maine), Willson 1870 (126th NY), McDermott 1889 (69th Pa.), Banes 1876
 - library items searched again with the wave-4 questions: Toombs 1888 (New Jersey), Southern Historical Society Papers vol. 5 (Hancock 1878), Pennsylvania at Gettysburg, NY monuments volumes
Nothing here lowers a tier without a source; every new quote is resolved by build_corrections.py exactly as the old ones are."""
from spec_lib import *

ROWS = []


# ---------------------------------------------------------------- small helpers
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


def replace_in(row, field, old, new):
    row[field] = [new if x == old else x for x in row[field]]
    if new not in row[field] and old not in row[field]:
        raise KeyError('%s: %r not found in %s' % (row['id'], old, field))


def tail(row, text):
    row['corrected_claim'] = row['corrected_claim'].rstrip() + ' ' + text


# ---------------------------------------------------------------- the edits
def apply(R_):
    # ============================================================ E-01 Seminary barricade (and S-010, S-011 share its evidence)
    r = R_['R14.E-01']
    setsub(r, 'h', claim="Fences dismantled along about 600 yd to make the barricade.",
           note="No source read gives a length of fence removed or of the barricade (searched 2026-11-14 in the library, the added books and the NPS reports: 22 hits for '400-600 yards' near works, none about the Seminary barricade).")
    add(r, S('h2', "Form: a circular or semicircular redoubt or line of earth and fence rails west of the seminary (a curved plan).", 'documented', 'partial', [
        C('KIT', 'sixteenthmainere00smal', "By command of General Robinson, the First Brigade hastily threw up a redoubt of earth and fence rails, in a circular form, just in front of the seminary."),
        C('LIB', 'NJ-TOOMBS-1888', "on the west of which Robinson's men threw up a semicircular line of breast works, which served an admirable purpose later on", pp='163')],
        note="Two secondary books (Small, 16th Maine, 1886; Toombs, New Jersey Troops, 1888) give a curved plan. McFarland (OR, sub-claim d) places the work 'through the west edge of the grove, and parallel with the seminary'. The curve is carried as a conflict of form, not as a fact; 'through the wood' is not said by either book."), after='h')
    setsub(r, 'i', claim="Overrun or turned: Cooper (Union, Battery B, 1st Pa.) says Perrin placed a regiment on the left of the barricade 'and turned our position after 4 p.m.'; Pender ordered the advance 'about 4 o'clock' (Confederate clock); the NPS says the Union line on Seminary Ridge 'disintegrated by about 5:00 p.m.'. The PDF's 16:00-16:30 lies between the first two and under the third.",
           tier='documented', support='conflict')
    more(r, 'i',
         C('LIB', 'PA-GB-1914-v2', "Perrin by a movement placed one of his regiments on the left of our barricade, and turned our position after 4p.m."),
         C('NPS', 'NPS-CLR-1STDAY', "the Union line on Seminary Ridge", reading="...the Confederates pushed on and the Union line on Seminary Ridge disintegrated by about 5:00 p.m. (two-column text: the sentence is interleaved with the neighbouring column in the saved text and read across it)", role='context'),
         C('NPS', 'NPS-CLR-1STDAY', "disintegrated by about 5:00 p.m."),
         note="Three clocks, three witnesses; none is a 'barricade overrun' hour printed by an engaged Union officer except Cooper's 'after 4 p.m.'. Carried, no default chosen.")
    more(r, 'e',
         C('KIT', 'sixteenthmainere00smal', "leave camp until nine o'clock a.m., when it marched", role='context'),
         C('KIT', 'sixteenthmainere00smal', "rapidly in the direction of Gettysburgh, and halted southeast of the seminary", role='context',
           reading="Although early under arms, the Sixteenth did not leave camp until nine o'clock a.m., when it marched rapidly in the direction of Gettysburgh, and halted southeast of the seminary. (the saved text interleaves a running head and a margin date inside the sentence; 'nine o'clock a.m.' is read from the sentence as printed)"),
         C('KIT', 'sixteenthmainere00smal', "About one o'clock rang out the command", role='context',
           reading="About one o'clock rang out the command, \"Fall in! Forward, Sixteenth.\" (Small, the regiment's adjutant: the First Brigade's redoubt is thrown up before this, 'just in front of the seminary')"),
         note="Wave 4: Small (16th Maine adjutant, 1886): the regiment left camp at nine o'clock a.m., halted southeast of the seminary, the First Brigade threw up the redoubt there, and 'about one o'clock' the 16th was ordered forward to the right: the work lies between the division's arrival and about 13:00 (it does not fix the start).")
    add(r, S('k', "Purpose and use: the work was ordered as a fall-back line ('to which, in case of necessity, the line of battle could retire'); 'a final stand was made' at 'a barricade of rails which had been thrown up early in the day by Robinson's men', where Wainwright posted his batteries; the 24th Michigan fell back to 'the friendly rail fence barricade just west of the Seminary'; the Union artillery stood behind fence-rail breastworks that extended south from the Chambersburg Pike (NPS).", 'documented', 'supported', [
        C('ACQ', 'BATES-1875', "Robinson was at first ordered to hold his men in reserve, and to throw up a barricade in front of the Seminary, to which, in case of necessity, the line of battle could retire."),
        C('ACQ', 'BATES-1875', "At a barricade of rails which had been thrown up early in the day by Robinson's men, a final stand was made, and here the chief of artillery. Colonel Wainwright, had posted his batteries", pp='79', reading="...and here the chief of artillery, Colonel Wainwright, had posted his batteries (the OCR prints a period after 'artillery')"),
        C('KIT', '24thmichiganiron00curtrich', "forced back to the friendly rail fence barricade just west of the Seminary"),
        C('LIB', 'NY-GB-1900', "protected by its slight barricade of rails, the left wing of the First Corps was making its final stand"),
        C('NPS', 'NPS-CLR-1STDAY', "behind breastworks built of fence rails that extended", reading="Union artillery, behind breastworks built of fence rails that extended south from Chambersburg Pike, responded with a final heavy bombardment against the Confederate advance. (two-column text, read across the interleave; the three fragments below are consecutive pieces of this sentence)", role='context'),
        C('NPS', 'NPS-CLR-1STDAY', "south from Chambersburg Pike, responded with a final", role='context'),
        C('NPS', 'NPS-CLR-1STDAY', "heavy bombardment against the Confederate advance.", role='context')],
        note="Bates 1875 is a secondary account (no source named for the order); Curtis 1891 and the New York volume are regimental and state histories; the NPS sentence is the modern report's reading of the first-day sources."), after='i')
    r['stays_unsupported'] = ["Length about 600 yd", "Dismantling of a fence line over 600 yd (no length of fence removed is given anywhere)",
                              "Start clock of the work (only the 11:00-13:00 window from the arrival of the division)",
                              "Builder conflict: First Brigade (Robinson) vs 'Second Brigade, Second Division' (McFarland)",
                              "A single printed hour for the overrun (Cooper 'after 4 p.m.', Pender 'about 4 o'clock', NPS 'by about 5:00 p.m.')"]
    replace_in(r, 'conflicts_carried', "Form: circular redoubt (Small) vs line through the west edge of the grove (McFarland)",
               "Form: circular redoubt (Small 1886) or semicircular line (Toombs 1888) vs a line through the west edge of the grove parallel with the seminary (McFarland, OR)")
    lines(r, 'conflicts_carried', "Overrun hour: after 4 p.m. (Cooper) / about 4 o'clock order (Pender) / by about 5:00 p.m. (NPS)")
    lines(r, 'lookups', L('library, added books, NPS (wave 4)', "'six hundred|600|500 yards' near barricade/breastwork/rails/fence", 22, 'none about the Seminary barricade'),
          L('library, added books, NPS (wave 4)', "seminary + circular/semicircular/curved + barricade/redoubt", 1, 'Toombs 1888 (semicircular line)'),
          L('library, added books, NPS (wave 4)', "'barricade of rails' / rail barricade", 8, 'Bates 1875, Curtis 1891, NY monuments, Pennsylvania at Gettysburg (Cooper)'))
    lines(r, 'changes_vs_previous', "wave 4: curved plan now sourced as a conflict of form (Small, Toombs); overrun hour carried as three clocks (Cooper, Pender, NPS); purpose as a fall-back line (Bates)")
    tail(r, "Wave 4 (2026-11-14): two secondary books give a circular or semicircular plan (Small 1886: 'redoubt of earth and fence rails, in a circular form'; Toombs 1888: 'semicircular line of breast works') against McFarland's line through the west edge of the grove; Bates 1875 says the work was ordered as the line to which the division could fall back; the hour it was turned is carried as Cooper 'after 4 p.m.', Pender 'about 4 o'clock', NPS 'by about 5:00 p.m.'. The 600 yd length stays unsupported.")

    # S-010 / S-011 share the overrun hour
    r = R_['R14.S-011']
    setsub(r, 'c', claim="Hour the barricade was overrun: Cooper 'after 4 p.m.' (Union), Pender's order 'about 4 o'clock' (Confederate), NPS 'by about 5:00 p.m.'; the PDF's 16:30 end is not printed anywhere.",
           tier='documented', support='conflict')
    more(r, 'c',
         C('LIB', 'PA-GB-1914-v2', "Perrin by a movement placed one of his regiments on the left of our barricade, and turned our position after 4p.m."),
         C('NPS', 'NPS-CLR-1STDAY', "disintegrated by about 5:00 p.m.", reading="...the Union line on Seminary Ridge disintegrated by about 5:00 p.m. (two-column text read across the interleave)"))
    r['stays_unsupported'] = ["A single printed hour the barricade fell (three clocks carried)", "16:30 end"]
    lines(r, 'conflicts_carried', "Overrun hour: after 4 p.m. (Cooper) / about 4 o'clock (Pender, Confederate clock) / by about 5:00 p.m. (NPS)")
    lines(r, 'changes_vs_previous', "wave 4: Cooper (Pennsylvania at Gettysburg) 'turned our position after 4 p.m.' and the NPS 'by about 5:00 p.m.' added as the Union and modern clocks")
    r = R_['R14.S-010']
    more(r, 'b', C('LIB', 'NJ-TOOMBS-1888', "on the west of which Robinson's men threw up a semicircular line of breast works, which served an admirable purpose later on", role='context'),
         note="Wave 4: Toombs 1888 places a semicircular line of breastworks west of the seminary (form, not rail origin).")

    # ============================================================ E-02 / S-014 Culp's Hill, Jul 1 evening
    for rid in ('R14.E-02', 'R14.S-014'):
        r = R_[rid]
        add(r, S('g', "The 24th Michigan's remnant ('the ninety and nine of the regiment that rallied around the flag on Culp's Hill the evening of the first day's fight') built a line of breastworks on Culp's Hill 'the first night of the battle': the remnant of the Iron Brigade was 'soon after moved to Culp's Hill and a new line formed with the Twenty-fourth Michigan on the left', reaching 'from the top of the elevation to the foot of the hill facing the town' (Curtis, History of the Twenty-fourth Michigan, 1891).", 'documented', 'supported', [
            C('KIT', '24thmichiganiron00curtrich', "What were left of the Iron Brigade were soon after moved to Gulp's Hill and a new line formed with the Twenty-fourth Michigan on the left. It reached from the top of the elevation to the foot of the hill facing the town.", reading="...moved to Culp's Hill (the OCR prints 'Gulp's')"),
            C('KIT', '24thmichiganiron00curtrich', "The ninety and nine of the regiment that rallied around the flag on Gulp's Hill the evening of the first day's fight, bivouacked there for the night", reading="...on Culp's Hill (the OCR prints 'Gulp's')"),
            C('KIT', '24thmichiganiron00curtrich', "viewed the line of breastworks built by the small remnant with the flag, the first night of the battle", reading="Many went to Culp's Hill and viewed the line of breastworks built by the small remnant with the flag, the first night of the battle. (the OCR prints 'Gulp's Hill'; the context is the 1889 visit of the regiment's veterans)")],
            note="Secondary, retrospective (1891; the last sentence describes the veterans' visit in 1889). It fixes Culp's Hill, the evening and night of Jul 1 and the 24th Michigan's line on the left of the Iron Brigade's new line; the fabric of the breastworks is not stated and the passage does not say who began first or give hours."), after='f' if rid == 'R14.E-02' else 'e')
    r = R_['R14.E-02']
    setsub(r, 'd', claim="Clock window about 18:00-21:00 Jul 1 (inferred); the only printed time word is 'the first night of the battle' (Curtis 1891).")
    r['stays_unsupported'] = ["Clock hours of the Jul 1 work ('the first night of the battle' is the only printed time word; 18:00-21:00 is inferred)", "6th Wisconsin first, then the division",
                              "Logs and earth fabric on Jul 1 evening", "Extent 'Stevens' Knoll to the summit' (no source names the line)"]
    lines(r, 'lookups', L('added books (wave 4)', "Culp's Hill + intrench/breastwork/spades + night/evening/dusk", 9, "Curtis 1891 ('built by the small remnant with the flag, the first night of the battle'); the rest other battles"))
    lines(r, 'changes_vs_previous', "wave 4: Curtis 1891 adds 'the first night of the battle' for breastworks on Culp's Hill built by the Iron Brigade remnant")
    r = R_['R14.S-014']
    setsub(r, 'd', claim="Clock window about 18:00-21:00 Jul 1 (inferred); the only printed time word is 'the first night of the battle' (Curtis 1891).")
    r['stays_unsupported'] = ["Clock hours ('the first night of the battle' is the only printed time word; 18:00-21:00 is inferred)", "6th Wisconsin first, then the division"]
    lines(r, 'changes_vs_previous', "wave 4: Curtis 1891 adds 'the first night of the battle' for breastworks on Culp's Hill")

    # ============================================================ E-02 / E-05 the 1940 NPS restoration report on the Spangler's Spring - Culp's Hill works
    r = R_['R14.E-02']
    SS = "NPS-SPANGLERS-SPRING"
    setsub(r, 'f', claim="Fabric: 'logs and earth' - the works from Spangler's Spring to Culp's Hill were 'largely constructed of earth, loose stones and logs' (read from the Brady and Tipton photographs by the NPS in 1940).", tier='documented', support='partial')
    sub(r, 'f')['citations'] = [C('NPS', SS, "According to Brady and Tipton photographs, the earthworks along the battle line extending from Spangler's Spring to Culp's Hill were largely constructed of earth, loose stones and logs and were built up to an average height of 20 inches.")]
    sub(r, 'f')['note'] = "Secondary (a 1940 NPS restoration file, Tilberg, 20 Jul 1940); the photographs are of the works after the battle; the fabric is not tied to the Jul 1 evening or to any unit. The earlier 'no source' for logs is replaced by this partial support."
    add(r, S('h', "NPS restoration file of 20 Jul 1940 (Tilberg), on the Spangler's Spring to Culp's Hill area: 'The earthworks in this area were hastily constructed by Union troops on the night of July 1 and during July 2'; a section near Stevens' Knoll measured 30 in. and a section 100 yd west of Culp's Hill averaged 26 in. in 1940.", 'documented', 'partial', [
        C('NPS', SS, "The earthworks in this area were hastily constructed by Union troops on the night of July 1 and during July 2."),
        C('NPS', SS, "yards west of Culp\u2019s Hill, near Stevens\u2019 Knoll, measuring 30\u201d in height. A section extending 100 yards-westward from Culp\u2019s Hill averages 26\u201d in height.", role='context')],
        note="Secondary; no basis is named for the night of Jul 1; 'this area' is the Spangler's Spring to Culp's Hill battle line, not Wadsworth's line alone. The 26-30 inch figures are measurements of the works as they stood in 1940 (the NPS records the Culp's Hill earthworks as reconstructed in 1882), not 1863 profiles."), after='g')
    r['stays_unsupported'] = [x if not x.startswith("Logs and earth fabric") else "Which fabric the Jul 1 evening works had (the 1940 NPS reading of the photographs covers the works as they stood after Jul 2-3)" for x in r['stays_unsupported']]
    lines(r, 'lookups', L('NPS 1940 restoration file (wave 4)', "Spangler's Spring - Culp's Hill earthworks: date, fabric, height", 3, "night of Jul 1 and during Jul 2; earth, loose stones and logs; average 20 in."))
    lines(r, 'changes_vs_previous', "wave 4: the 1940 NPS file dates the works of this area to 'the night of July 1 and during July 2' and gives fabric 'earth, loose stones and logs' (partial support for the PDF's 'logs and earth')")
    r = R_['R14.E-05']
    setsub(r, 'd', claim="Height: about 5 ft ('elaborate defense works ... log cribs filled with stone and earth, built to five feet in height', NPS CLR, Culp's Hill in general) against an average of 20 inches read from the Brady and Tipton photographs (NPS 1940) and 30 in. near Stevens' Knoll and 26 in. west of Culp's Hill measured on the works in 1940.", tier='documented', support='conflict')
    more(r, 'd', C('NPS', SS, "According to Brady and Tipton photographs, the earthworks along the battle line extending from Spangler's Spring to Culp's Hill were largely constructed of earth, loose stones and logs and were built up to an average height of 20 inches."),
         C('NPS', SS, "yards west of Culp\u2019s Hill, near Stevens\u2019 Knoll, measuring 30\u201d in height. A section extending 100 yards-westward from Culp\u2019s Hill averages 26\u201d in height.", role='context'),
         note="Wave 4: the two NPS figures are for different things: the 5 ft is for the 'elaborate' log-crib works on Culp's Hill (the CLR does not say where), the 20 in. average is the NPS reading of the photographs for the line from Spangler's Spring to Culp's Hill; both are secondary and neither is a per-regiment height. Carried as a conflict; no profile from the works restored in 1882.")
    r['stays_unsupported'] = [x if not x.startswith("Per-regiment height") else "Per-regiment height (only general NPS statements: five feet for the elaborate log-crib works, an average of 20 inches read from the photographs)" for x in r['stays_unsupported']]
    lines(r, 'conflicts_carried', "Height of the Culp's Hill works: about 5 ft (NPS CLR, log cribs) vs an average of 20 in. (NPS 1940, from the Brady and Tipton photographs)")
    lines(r, 'product_consequence', "E-05 height: the 5 ft stays the default only for the 'elaborate log-crib' works; an average of about 20 inches (NPS 1940, from the Brady and Tipton photographs) is a selectable alternative for the line from Spangler's Spring to Culp's Hill; neither is a per-regiment height")
    r = R_['R14.E-18']
    add(r, S('i', "NPS restoration file of 20 Jul 1940: 'On a ridge just north of the Spring is a stone wall which was used as breastworks by the Confederates on the night of July 2, and during the Union counter attack on the morning of July 3.'", 'documented', 'partial', [
        C('NPS', SS, "On a ridge just north of the Spring is a stone wall which was used as breastworks by the Confederates on the night of July 2, and during the Union counter attack on the morning of July 3.")],
        note="Secondary (1940); an existing stone wall used as breastworks (no construction) near Spangler's Spring on the night of Jul 2 and the morning of Jul 3: a Confederate state on the Culp's Hill side for Jul 2-3."), after='f')
    lines(r, 'product_consequence', "E-18: show the stone wall just north of Spangler's Spring as Confederate breastworks (pre-existing wall, no construction) from the night of Jul 2 to the morning of Jul 3 (NPS 1940, documented-secondary)")

    # ============================================================ E-04 Cemetery Hill, Steinwehr
    r = R_['R14.E-04']
    setsub(r, 'c', claim="Von Steinwehr (or the Eleventh Corps) fortified Cemetery Hill on Jul 1: books of 1875-1914 say so (Bates: Steinwehr 'threw up lunettes around each gun'; Curtis: lunettes 'which ... General Steinwehr ... had hastily constructed during the day's fighting'; the New York volume: Howard retained Steinwehr's division 'to hold and fortify Cemetery Hill'; Toombs, Pierce and the Pennsylvania volume: 'Steinwehr's fortified position', 'somewhat fortified by Steinwehr', 'fortify himself'). No 1863 report says it, Steinwehr's own report names only stone fences, and Hancock calls the lunette account 'a great error'.",
           tier='documented', support='conflict')
    more(r, 'c',
         C('ACQ', 'BATES-1875', "He accordingly threw up lunettes around each gun.", pp='76'),
         C('ACQ', 'BATES-1875', "the labor and skill of Steinwehr in constructing them must ever remain subjects of admiration and gratitude", pp='76'),
         C('KIT', '24thmichiganiron00curtrich', "the lunettes which the considerate Prussian officer, General Steinwehr, of the Eleventh Corps, with Germanic coolness and foresight, had hastily constructed during the day's fighting"),
         C('LIB', 'NY-GB-1900', "General Howard retained Steinwehr’s Division and Wiedrich’s New York Battery to hold and fortify Cemetery Hill"),
         C('LIB', 'PA-GB-1904', "enabling General von Steinwehr, whose military eye had at once recognized the great advantage of such a position as Cemetery Hill, to post his batteries and fortify himself"),
         C('LIB', 'NJ-TOOMBS-1888', "Hancock re-formed the line with the Eleventh Corps on the right of Steinwehr's fortified position"),
         C('LIB', 'PIERCE-F-1914', "a natural stronghold and somewhat fortified by Steinwehr"),
         note="Secondary attribution only (books of 1875, 1888, 1891, 1900, 1904, 1914); Biddle (1880) writes of Bates's lunette passage 'upon whose authority this statement is based does not appear'. The attribution is to Steinwehr personally and mostly to the artillery lunettes, not to a line of works round the whole hill.")
    add(r, S('e', "Hancock, who reached the field 'about 3 P. M., or between that and 3:30' (letter of 1878), says of the statement that Steinwehr's division threw up lunettes around each gun on Cemetery Hill: 'This is a great error; there were no works of the kind above described on that field when I arrived there, and all that I saw in the way of works were some holes (not deep) dug to sink the wheels and trails of the pieces.'", 'documented', 'supported', [
        C('LIB', 'SHSP-05', "When I arrived upon the field, about 3 P. M., or between that and 3:30, I found the fighting about over", pp='169'),
        C('LIB', 'SHSP-05', "After I had arrived upon the field, assumed the command, and made my dispositions for defending that point (say 4 P. M.)", role='context', pp='168'),
        C('LIB', 'SHSP-05', "There had been an attempt to reform some of the Eleventh corps as they passed over Cemetery Hill", role='context', pp='169'),
        C('LIB', 'SHSP-05', "It has been stated \"that Steinwehr's division of Howard's corps, on the first day, threw up lunettes around each gun, on Cemetery Hill", role='context', pp='172'),
        C('LIB', 'SHSP-05', "This is a great error; there were no works of the kind above described on that field when I arrived there", pp='172', reading="...and all that I saw in the way of \"works\" were some holes (not deep) dug to sink the wheels and trails of the pieces (the OCR prints 'th wheels and trains')"),
        C('ACQ', 'BIDDLE-1880', "it was half after four o'clock when General Hancock first met him there", role='context'),
        C('ACQ', 'BIDDLE-1880', "Ui>on whose authority this statement is based does not appear", role='context')],
        note="Primary witness, written 14 years after the event (Hancock, New York, 17 January 1878, to General Fitzhugh Lee; Southern Historical Society Papers vol. 5, 'Reply to General Longstreet', pp. 168-172). Howard puts Hancock's first meeting with him at half past four (Biddle's account of Howard); Hancock says about 3 to 3:30 and 'say 4 P. M.' for his dispositions. What Hancock saw is the state of the guns at that hour; the per-gun earthworks of the OR were begun 'at dusk' (sub-claim b), so there is no contradiction with the OR, only with Bates and Curtis."), after='c')
    add(r, S('f', "Olmsted, head of the U.S. Sanitary Commission, who visited two weeks after the battle (quoted by the NPS): 'There were some stone fences on the federal hill [Cemetery Hill] and rail fences in the valley. There were also plenty of loose stones throughout the Federal position. These were got together at night and a slight breast work was formed of them ... Here and there some little earth had been thrown against them. They are not more than three feet high ...'", 'documented', 'partial', [
        C('NPS', 'NPS-CLR-1STDAY', "who visited two weeks after the battle in his role as head of the U.S. Sanitary Commission", role='context'),
        C('NPS', 'NPS-CLR-1STDAY', "There were some stone fences on the federal hill [Cemetery Hill] and rail fences in the valley. There were also plenty of loose stones throughout the Federal position. These were got together at night and a slight breast work was formed of them\u2014simply by laying them one against and upon another. Here and there some little earth had been thrown against them. They are not",
          reading="...They are not more than three feet high and are just like the slightest kind of stone fence of our New England sheep-pastures. (the saved two-column text prints this last sentence earlier, as 'more than three feet high and are just like the slightest kind of stone fence of our New England sheep-pastures', quoted in sub-claim f of E-17 only as the fragment)")],
        note="An eyewitness of July 1863 as quoted by the NPS First Day report (the bracketed '[Cemetery Hill]' is the NPS's gloss; the passage describes the Federal position in general). Stone fences on the hill, loose stones gathered at night into a slight breastwork with a little earth: no unit, night or place is named, and nothing is said of lunettes or of Steinwehr."), after='e')
    r['stays_unsupported'] = ["An 1863 statement that Steinwehr built or ordered works (books of 1875-1914 carry the attribution and name no source; Hancock denies solid lunettes)",
                              "Date and extent of cemetery fence damage (Jul 2 vs Jul 3)"]
    lines(r, 'conflicts_carried', "Cemetery Hill state on Jul 1: Steinwehr's division built solid lunettes with level platforms during the fighting (Bates 1875, Curtis 1891) vs light per-gun earthworks begun at dusk by the battery crews (Wainwright, Hunt, OR) vs only shallow holes for wheels and trails when Hancock arrived about 15:00-15:30 (letter of 1878)")
    lines(r, 'lookups', L('library, added books (wave 4)', "Steinwehr + lunette/breastwork/intrench/fortif", 11, 'Bates 1875, Curtis 1891, NY monuments, Pennsylvania at Gettysburg, Toombs, Pierce for; Hancock (SHSP 5) and Biddle against'))
    lines(r, 'changes_vs_previous', "wave 4: 'Steinwehr fortified Cemetery Hill' is documented as a secondary attribution (six books) and contradicted by Hancock's letter; the earlier 'no source says' is replaced")
    tail(r, "Wave 4 (2026-11-14): the attribution to von Steinwehr exists in books of 1875-1914 (Bates: 'He accordingly threw up lunettes around each gun'; Curtis, the New York and Pennsylvania volumes, Toombs, Pierce) but no 1863 report states it, and Hancock, who reached the hill about 15:00-15:30 on Jul 1, wrote in 1878 that there were then no works of that kind, only shallow holes dug to sink the wheels and trails of the pieces. Both versions stay selectable. Olmsted (two weeks after the battle, quoted by the NPS) describes the Federal position in general: stone fences on the hill, loose stones gathered at night into a slight breastwork with a little earth, not more than three feet high.")

    # ============================================================ E-05 Greene's finish hour: page image of OR27-1 p.856
    r = R_['R14.E-05']
    for c in sub(r, 'c')['citations']:
        if c['ref'] == 'R307':
            c['image'] = 'or27-1-p856'
            c['reading'] = "By 12 o'clock we had a good cover for the men (the printed hour is 12: page image of p.856 looked at 2026-11-14; the Cornell scan's OCR prints 13)"
    more(r, 'c', C('LIB', 'NY-GB-1902-v3', "The breastworks were completed about noon of the 2d of July.", role='context'),
         C('OR1W', 'R307', "By 12 o\u2019clock we had a good cover for the men", witness='warofrebellion271unit', page='856', image='or27-1-p856'),
         note="Wave 4: the page image of OR27-1 p.856 (leaf 874 of warofrebellion271unit) shows 'By 12 o'clock we had a good cover for the men'; the '13' of the Cornell scan is an OCR error, so the finish hours are 09:00, 10:00, 12:00 and about noon, not 13:00.")
    r['corrected_claim'] = r['corrected_claim'].replace("(Greene; the Cornell scan misreads it as 13, two other scans read 12)", "(Greene's printed report, page image looked at 2026-11-14: the Cornell scan's OCR '13' is a misread of 12)")
    assert 'page image looked at' in r['corrected_claim']
    lines(r, 'lookups', L('page image (wave 4)', "OR27-1 p.856 (Greene), leaf 874 of warofrebellion271unit", 1, "printed: By 12 o'clock we had a good cover for the men"))
    lines(r, 'changes_vs_previous', "wave 4: Greene's hour 12 o'clock confirmed by the page image (the Cornell OCR 13 is a misread)")

    # ============================================================ E-06 traverse geometry (Bachelder's guide)
    r = R_['R14.E-06']
    add(r, S('e', "Geometry of the traverse (Bachelder's guide, 1873): in the night attack of Jul 2 the right of Greene's brigade 'had now been refused along a traverse constructed at the angle; and from that prolonged through the woods, at right angles to the main line toward the Baltimore turnpike'; 'This was the position occupied by the troops after their return from the left and during the engagement on the morning of the 3d.'", 'documented', 'partial', [
        C('LIB', 'BACH-WHATTOSEE-1873', "whose right had now been refused along a traverse constructed at the angle ; and from that prolonged through the woods, at right angles to the main line toward the Baltimore turnpike", pp='97'),
        C('LIB', 'BACH-WHATTOSEE-1873', "This was the position occupied by the troops after their return from the left and during the engagement on the morning of the 3d.", pp='97'),
        C('LIB', 'BACH-WHATTOSEE-1873', "One regiment of Greene's was beyond the \" angle.\"", role='context', pp='96')],
        note="Secondary (John B. Bachelder's guide to the field, 1873; the 1889 edition has no such sentence): it places the traverse 'at the angle' of the works and the prolonged line at right angles to the main line toward the Baltimore turnpike, and says the position was held on the morning of Jul 3. It gives no building hour, height or profile; the 'angle' is the one between the line down the hill and the line along the ridge toward the swale."), after='c')
    setsub(r, 'd', claim="Traverse height and profile (the geometry is documented-secondary in sub-claim e).")
    r['stays_unsupported'] = ["Exact build hour of the traverse", "Height and profile of the traverse",
                              "Whether the traverse of the OR and Greene's address is the one Bachelder calls 'constructed at the angle' (same position, different words; carried as one work)"]
    lines(r, 'lookups', L('library, added books, NPS (wave 4)', "traverse (all texts)", 30, "Bachelder 1873 (a traverse constructed at the angle, line prolonged at right angles toward the Baltimore turnpike); the rest personal names, walks, a march"))
    lines(r, 'changes_vs_previous', "wave 4: Bachelder's guide (1873) documents the geometry: a traverse at the angle with the line prolonged at right angles to the main line toward the Baltimore pike")
    lines(r, 'product_consequence', "E-06: draw the traverse at the angle of the works with the line prolonged back through the woods at right angles toward the Baltimore pike (documented-secondary: Bachelder 1873); height and profile stay marked gaps")

    # ============================================================ E-12 lunettes on East Cemetery Hill
    r = R_['R14.E-12']
    add(r, S('f', "Who built the East Cemetery Hill lunettes and when: battery crews and artillerymen at dusk Jul 1 and on the morning of Jul 2 (sub-claims a, b, d) vs General Steinwehr's division, solid works 'of such height and thickness as to defy the most powerful bolts', with 'smooth and perfectly level platforms', during Jul 1 (Bates 1875; Curtis 1891) vs only shallow holes for wheels and trails at 15:00-15:30 Jul 1 (Hancock 1878).", 'documented', 'conflict', [
        C('ACQ', 'BATES-1875', "He accordingly threw up lunettes around each gun. These were not mere heaps of stubble and turf, but solid works of such height and thickness as to defy the most powerful bolts which the enemy could throw against them, with smooth and perfectly level platforms on which the guns could be worked.", pp='76'),
        C('KIT', '24thmichiganiron00curtrich', "the lunettes which the considerate Prussian officer, General Steinwehr, of the Eleventh Corps, with Germanic coolness and foresight, had hastily constructed during the day's fighting"),
        C('LIB', 'SHSP-05', "This is a great error; there were no works of the kind above described on that field when I arrived there", pp='172', reading="...and all that I saw in the way of \"works\" were some holes (not deep) dug to sink the wheels and trails of the pieces"),
        C('ACQ', 'BIDDLE-1880', "Ui>on whose authority this statement is based does not appear", role='context')],
        note="Bates and Curtis name the lunettes and Steinwehr; the OR (Wainwright, Hunt, Breck, Whittier) and the New York and Pennsylvania volumes name the battery crews; Hancock saw only holes at his arrival. The three accounts differ in builder, fabric ('solid' vs 'light') and hour; all three are carried as selectable scenarios and none is chosen."), after='d')
    more(r, 'c', C('ACQ', 'BATES-1875', "the giving opportunity for the construction of these lunettes and getting a firm foothold upon this great vantage-ground, was ample compensation for every hardship and misfortune", role='context', pp='76'),
         note="Wave 4: the word 'lunettes' is used of these works by Bates (1875) and Curtis (1891) as well as by the NPS; the OR (Part 1) does not use it.")
    r['stays_unsupported'] = ["1863 dimensions of the lunettes (Bates's 'such height and thickness' is a description of effect, not a measurement)",
                              "Which units dug each lunette (the battery crews' own accounts vs Bates and Curtis naming Steinwehr's division; carried as a conflict)",
                              "Whether the 'lunette' shape was drawn on the first evening or only in the morning (documented: begun dusk, finished morning)"]
    lines(r, 'conflicts_carried', "Builder, fabric and hour of the lunettes: battery crews, light, dusk Jul 1 to morning Jul 2 (OR) vs Steinwehr's division, solid with level platforms, during Jul 1 (Bates, Curtis) vs holes for wheels and trails only at 15:00-15:30 (Hancock)")
    lines(r, 'lookups', L('library, added books (wave 4)', "'lunettes?' in books (not NPS)", 8, 'Bates 1875 (3), Biddle 1880, Curtis 1891 for the conflict; others other battles'))
    lines(r, 'changes_vs_previous', "wave 4: the builder/fabric/hour conflict (Bates, Curtis vs the OR vs Hancock) is carried as a selectable scenario")
    tail(r, "Wave 4 (2026-11-14): the builder and the fabric are a conflict of testimony, not a gap: Bates 1875 and Curtis 1891 say Steinwehr's division threw up solid lunettes with level platforms during Jul 1; the OR says the battery crews threw up light earthworks at dusk and finished lunettes in the morning of Jul 2; Hancock (1878) saw only shallow holes for wheels and trails at about 15:00-15:30. All three are carried.")

    # ============================================================ E-13 Little Round Top, no works
    r = R_['R14.E-13']
    setsub(r, 'b', claim="Natural cover: rocks and cliffs in the centre and a ledge of rocks on the right of Vincent's line; no works mentioned in the OR reports of Rice, Chamberlain, the 16th Michigan or the 44th NY (the 44th NY's regimental history, quoted by the NPS, has a small breastwork: sub-claim f).")
    add(r, S('f', "The 44th NY on Little Round Top threw up a small breastwork during the fighting of Jul 2: 'Our brigade lay on the side hill. It was covered with large stones. We threw up a small breast-work to protect us.' (a veteran of Company A, quoted by the NPS from the regimental history, Nash 1911 p. 326).", 'documented', 'supported', [
        C('NPS', 'NPS-CLR-LRT', "veteran of Company A of the 44th New York Infantry described his posi on on Li le Round Top", role='context', reading="In a letter home, a veteran of Company A of the 44th New York Infantry described his position on Little Round Top during the fighting of July 2, 1863 (the saved text drops 'ti', 'tt' and 'ft')"),
        C('NPS', 'NPS-CLR-LRT', "Our brigade lay on the side hill. It was covered with large stones. We threw up a small breast-work to protect us.")],
        note="Secondary (the NPS 2012 report quoting a regimental history of 1911 that prints a soldier's letter); the writer is unnamed in the NPS text. This contradicts the PDF's 'no construction attributed' and the earlier 'silence only' for the 44th NY."), after='d')
    add(r, S('g', "A veteran of the 1st Pennsylvania Reserves wrote in 1892 that the stone breastworks in front of the 16th Michigan's line 'were not there at the time of the battle [on July 2] at that point' and were thrown up on the night of Jul 3 'principally by Crawford's Division'.", 'documented', 'partial', [
        C('NPS', 'NPS-CLR-LRT', "described the construc on of stone breastworks on Li le Round Top", role='context', reading="In an attempt to clarify a portion of the sequence of events during the battle, a veteran of the 1st Pennsylvania Reserves described the construction of stone breastworks on Little Round Top (the saved text drops 'ti', 'tt' and 'ft')"),
        C('NPS', 'NPS-CLR-LRT', "were thrown up on the night of the 3rd of July, 1863 principally by Crawford’s Division of the Fi h Corps. That they were not there at the me of the ba le [on July 2] at that point is not disputed.", reading="[The stone breastworks in front of the line of the 16th Michigan Infantry] were thrown up on the night of the 3rd of July, 1863 principally by Crawford's Division of the Fifth Corps. That they were not there at the time of the battle [on July 2] at that point is not disputed. (Calvin Hamilton to A. M. Apsted, 10 October 1892, as quoted in the NPS report, note 31)")],
        note="One veteran's letter of 1892, quoted by the NPS; it is the only positive 'not there on Jul 2' statement and it speaks of the 16th Michigan's front only. It conflicts with the NPS reports' own 'night of July 2' (CLR p.84, CLI p.75) and with Garrard, Fisher and the 91st Pa. (E-14); all dates are carried."), after='f')
    more(r, 'e', C('NPS', 'NPS-CLR-LRT', "Captain Walter G. Morrill of Company B of the same regiment described the posi on of his detached unit to the east of Li le Round Top", role='context', reading="Captain Walter G. Morrill of Company B of the same regiment [20th Maine] described the position of his detached unit to the east of Little Round Top"),
         C('NPS', 'NPS-CLR-LRT', "We took posi on behind a stone wall there", reading="We took position behind a stone wall there (Morrill to Chamberlain, quoted by the NPS; the sharpshooters under a non-commissioned officer were with him)"),
         note="Wave 4: Morrill's letter, as quoted by the NPS, confirms that Company B and the sharpshooters used a stone wall east of the hill; the wall is not described, and whether it was the Weikert-farm wall of sub-claim c is not stated.")
    r['stays_unsupported'] = ["Positive 'no works' for the 16th Michigan (one veteran's letter of 1892 via the NPS says the breastworks in front of its line came on the night of Jul 3; the 20th Maine: silence only; the 44th NY: contradicted, it threw up a small breastwork)",
                              "Extent and position of the 83rd PA's hasty stones (no length given)", "A stone wall about 150 yd east of the hill used by the 2nd US Sharpshooters (not in the sources read; Morrill's wall is a wall, no distance)"]
    lines(r, 'conflicts_carried', "16th Michigan front: stone breastworks thrown up the night of Jul 3 principally by Crawford's division (Hamilton 1892, via NPS) vs night of Jul 2 (NPS CLR p.84, CLI p.75; Garrard)")
    lines(r, 'lookups', L('NPS Little Round Top landscape report (wave 4)', "quoted veterans of the 44th NY, 20th Maine Co. B, 1st Pa. Reserves", 3, 'Nash 1911 p.326, Morrill letter, Hamilton 1892 letter'))
    lines(r, 'changes_vs_previous', "wave 4: the 44th NY 'small breast-work' (Nash 1911 via NPS) contradicts the earlier 'silence only'; Hamilton 1892 gives the only 'not there on Jul 2' statement")
    tail(r, "Wave 4 (2026-11-14): the NPS Cultural Landscape Report quotes the 44th NY ('We threw up a small breast-work to protect us', during Jul 2) and Company B of the 20th Maine behind a stone wall; a veteran of the 1st Pennsylvania Reserves wrote in 1892 that the breastworks in front of the 16th Michigan were not there on Jul 2 and were thrown up the night of Jul 3.")

    # ============================================================ E-14 Little Round Top, stone wall builders
    r = R_['R14.E-14']
    add(r, S('g', "The 91st Pa. (Weed's brigade) threw up a stone wall during the night of Jul 2 as a protection from sharpshooters at Devil's Den, drawn up in front of Battery D, 5th US, where Weed and Hazlett were killed (address of Chaplain Joseph Welch at the dedication of the 91st Pa. monument, 12 Sep 1889, printed in Pennsylvania at Gettysburg).", 'documented', 'supported', [
        C('LIB', 'PA-GB-1904', "the regiment during the night threw up a stone wall as a protection from the enemy's sharpshooters, who, from Devil's Den, were hai-rassing the men", reading="...were harassing the men (the OCR prints 'hai-rassing')")],
        note="State monument volume (1904), secondary: a regimental history read at the dedication of the monument; no hour. Another regiment of the brigade besides the 146th and 140th NY."), after='f')
    add(r, S('h', "The 140th NY built stone walls 'in the dark' after the first day's fighting (Jul 2) to protect the men from sharpshooters on the next day (Hazen, National Tribune 1894, quoted by the NPS).", 'documented', 'supported', [
        C('NPS', 'NPS-CLR-LRT', "[We] picked up our dead and buried them; then we built stone walls in the dark to protect us from the sharpshooters the next day.")],
        note="Secondary (the NPS 2012 report quoting a veteran of Company G, 140th NY, in 1894); 'in the dark' is the only time word."), after='g')
    add(r, S('i', "The 146th NY: once the regiments of Weed's brigade took position, men from each went down the slope behind the rocks and 'were also instructed by Colonel Garrand to erect a rough stone wall', before the Confederate attack of the afternoon of Jul 2 (regimental history of 1915, quoted by the NPS) - against Garrard's own report, which puts the building of the wall 'at night'.", 'documented', 'conflict', [
        C('NPS', 'NPS-CLR-LRT', "They were also instructed by Colonel Garrand to erect a rough stone wall to aﬀord be er protec on for themselves.", reading="They were also instructed by Colonel Garrand to erect a rough stone wall to afford better protection for themselves. (Brainard, Campaigns of the 146th New York, 1915, pp. 112-13, quoted by the NPS; the saved text prints the ligature and drops 'tt' and 'ti')")],
        note="The NPS prints 'Garrand'; the OR report is signed Garrard (sub-claim a). The clock is the conflict: an instruction before the attack of Jul 2 (1915 history) vs building 'at night' (Garrard, 16 Jul 1863)."), after='h')
    add(r, S('j', "A veteran of the 1st Pa. Reserves (1892): the stone breastworks in front of the 16th Michigan 'were thrown up on the night of the 3rd of July, 1863 principally by Crawford's Division of the Fifth Corps'.", 'documented', 'partial', [
        C('NPS', 'NPS-CLR-LRT', "were thrown up on the night of the 3rd of July, 1863 principally by Crawford’s Division of the Fi h Corps. That they were not there at the me of the ba le [on July 2] at that point is not disputed.", reading="[The stone breastworks in front of the line of the 16th Michigan Infantry] were thrown up on the night of the 3rd of July, 1863 principally by Crawford's Division of the Fifth Corps. (Hamilton to Apsted, 1892, quoted by the NPS)")],
        note="Names Crawford's division (the Pa. Reserves) as the builders, as the PDF does for 'five Pennsylvania Reserve regiments', but puts the work on the night of Jul 3 and at the 16th Michigan's front, not the south slope."), after='i')
    add(r, S('k', "A Confederate heard the building at dark on Jul 2: 'It was now dark, but we could distinctly hear great confusion on Little Round Top, - the men hastily throwing up rock intrenchments, the officers cursing' (a Confederate colonel printed as 'McGlosking, or McGlashan', quoted in Pennsylvania at Gettysburg).", 'documented', 'supported', [
        C('LIB', 'PA-GB-1904', "the men hastily throwing up rock intrenchments, the officers cursing")],
        note="Second-hand (quoted by a Pennsylvania Reserves author from a Confederate colonel's text; he mistook Little for Big Round Top, as the author notes); supports 'at dark' for the building of rock works on the hill."), after='j')
    setsub(r, 'd', claim="Builders 'five Pennsylvania Reserve regiments and an Ohio battery': the Pennsylvania Reserves (Fisher's brigade in the morning of Jul 3; Crawford's division on the night of Jul 3 per Hamilton) are documented as builders; an Ohio battery has no support.",
           support='partial')
    setsub(r, 'e', claim="Start about 20:00 Jul 2 (inferred): the printed time words are 'at night' (Garrard), 'during the night' (91st Pa.), 'in the dark' (140th NY), 'It was now dark' (a Confederate colonel), against an instruction before the attack of Jul 2 (146th NY history) and 'morning of Jul 3' (Fisher).")
    r['stays_unsupported'] = ["An Ohio battery as a builder", "A printed hour for the start (words only: before the attack, at night, in the dark, now dark; about 20:00 is inferred)",
                              "Wall length and height of the 1863 works (the 2-3 ft is a general NPS figure)"]
    lines(r, 'conflicts_carried', "Builders and window on the south slope: 146th NY instructed to erect a rough wall once in position, before the attack of Jul 2 (1915 history via NPS) vs Weed's brigade at night Jul 2 (Garrard; 91st Pa.; 140th NY in the dark) vs Fisher's Reserves morning Jul 3 vs Crawford's division night Jul 3 (Hamilton 1892)")
    lines(r, 'lookups', L('library, NPS (wave 4)', "Reserves/Weed/Garrard/Fisher + stone wall/breastwork + night/morning", 12, '91st Pa. (Pennsylvania at Gettysburg), 140th and 146th NY and Hamilton letter (NPS CLR), McGlashan quote'))
    lines(r, 'changes_vs_previous', "wave 4: four more builders/clocks added from the NPS landscape report's quoted veterans and Pennsylvania at Gettysburg; the Ohio battery stays unsupported")
    tail(r, "Wave 4 (2026-11-14): three more regiments of Weed's brigade are documented as building or being told to build stone walls on the slope (91st Pa. at night; 140th NY in the dark; 146th NY instructed to erect one before the attack of Jul 2 per its 1915 history), a Confederate heard rock works going up at dark, and a veteran of the Pa. Reserves wrote that Crawford's division built the breastworks in front of the 16th Michigan on the night of Jul 3.")

    # ============================================================ E-15 Hazlett
    r = R_['R14.E-15']
    more(r, 'c', C('LIB', 'MN-1ST-1916', "Hazlett's Battery, guns, caissons and all, had to be dragged by hand to the crest ; the horses left in the rear"),
         note="Wave 4: The First Minnesota (1916) also says the guns and caissons were dragged by hand with the horses left behind.")
    lines(r, 'lookups', L('library, added books, NPS (wave 4)', "Hazlett + by hand/dragged/handspike/first shot/epaulement/ammunition", 3, 'Maine at Gettysburg, The First Minnesota, Pennsylvania at Gettysburg (155th Pa.): hauling only; no first-fire hour; no epaulement'))

    # ============================================================ E-16 Devil's Den
    r = R_['R14.E-16']
    more(r, 'c', C('NPS', 'NPS-CLI-LRT', "These stone walls were recorded as being present at the time of the battle by maps created by Gouverneur K. Warren", occ=0),
         note="Wave 4: the NPS inventory says the stone walls of the Devil's Den / Little Round Top landscape 'were recorded as being present at the time of the battle' by the Warren maps (1868-69); that dates their presence after the battle, not their building.")
    lines(r, 'lookups', L('library, added books, NPS (wave 4)', "Devil's Den + breastwork/stone wall/barricade/intrench", 4, 'NPS CLI (Warren maps); Pennsylvania at Gettysburg (91st Pa. wall at night, sharpshooters at the Den); no builder of a Devil\'s Den work'))

    # ============================================================ E-17 Cemetery Ridge
    r = R_['R14.E-17']
    add(r, S('l', "Jul 2 morning to about half an hour before sunset: the 126th NY (Willard's brigade, Hays's division, Second Corps) reached the front about 08:00, halted near the Cemetery, moved farther to the left, and on the crest made breastworks of 'a low stone wall, and an old rail fence' in its front until ordered to fall in about half an hour before sunset.", 'documented', 'supported', [
        C('K2', 'ny126_willson', "At eight a. m. we had reached the extreme front and halted near the Cemetery, but soon moved farther to the left."),
        C('K2', 'ny126_willson', "In our front was a low stone wall, and an old rail fence, of which we hastily constructed breastworks."),
        C('K2', 'ny126_willson', "This was half an hour before sun-down.", role='context')],
        note="Extract of Adjutant Brown's account printed in Willson, Disaster, Struggle, Triumph (1870). The position is 'on a crest' near the Cemetery on Hays's front (not named more closely); it is the earliest clock of a Cemetery Ridge work in these sources (about 08:00-18:30 Jul 2). The stone wall is a pre-existing feature; the rails were put to use hastily."), after='e')
    add(r, S('m', "Bachelder's guide (1873): on the Emmitsburg road at the south edge of the town, 'At the time of the battle, the stone wall on the left had traverses constructed at right angles with it, and about thirty feet apart, to cover the troops.'", 'documented', 'partial', [
        C('LIB', 'BACH-WHATTOSEE-1873', "At the time of the battle, the stone wall on the left had traverses constructed at right angles with it, and about thirty feet apart, to cover the troops.", pp='77')],
        note="Secondary (a guide of 1873 written by the man who surveyed the field); the passage is a description of a drive: after leaving Baltimore Street the drive 'turn[s] to the right into the Emmettsburg road' and the wall is on the left, near Washington Street, the Union skirmish line and Ziegler's Grove. It says 'at the time of the battle', not which day, builder or hour; it is the only spacing of works found (about 30 ft between traverses). The wall itself pre-existed."), after='l')
    more(r, 'h', C('NPS', 'NPS-CLR-1STDAY', "more than three feet high and are just like the slightest kind of stone fence of our New England sheep-pastures. A tree-trunk, fence rails, a broken waggon [sic] and sometimes a dead horse had been laid in when it came handy",
                   reading="Olmsted, two weeks after the battle, of the Federal breastworks: 'They are not more than three feet high and are just like the slightest kind of stone fence of our New England sheep-pastures. A tree-trunk, fence rails, a broken waggon and sometimes a dead horse had been laid in when it came handy.' (quoted by the NPS; the saved two-column text prints this sentence apart from its beginning, see E-04 sub-claim f)"),
         note="Wave 4: Olmsted's general description (an eyewitness, July 1863, via the NPS) is the earliest height of the Federal breastworks in the sources read: not more than three feet; it is not tied to a place or unit.")
    more(r, 'd0',
         C('K2', 'pa69_mcdermott', "The Sixty- ninth was placed in position shortly after sunrise on the morning of July 2d, on Cemetery Ridge", role='context'),
         C('K2', 'pa_banes', "On the morning of July 3d the Sixty-Ninth Regiment occupied the same line at the fence in front of the clump of trees on the ridge that it held the day before", role='context'),
         C('K2', 'pa_banes', "These - echelon positions were connected by a stone wall running at right angles with the rail fence, and joining the wall occupied by the right battalion.", role='context'),
         note="Wave 4: McDermott (69th Pa., 1889) places the regiment on Cemetery Ridge 'shortly after sunrise on the morning of July 2d ... behind a low stone wall', and Banes (1876) has it on Jul 3 'at the fence in front of the clump of trees' joined to a stone wall running at right angles to the rail fence: the rail fence and the stone wall are the pre-existing features beside which Davis's report puts the rail-and-stone breastwork.")
    r['stays_unsupported'] = ["Continuity of a line along Cemetery Ridge", "Dimensions of any work other than the one 'a little over knee-high' (regiment not named) and the traverse spacing of about 30 ft on the Emmitsburg road wall (Bachelder, day and builder not stated)",
                              "Clock hours of most Jul 3 works (only 'morning', 'forenoon', 'daylight', 'during the cannonade', '18:00'); the 126th NY gives Jul 2 about 08:00 to about 18:30"]
    lines(r, 'lookups', L('Second Corps regimental and brigade histories, 25 text files (wave 4)', "breastwork/rails/barricade + Cemetery/Gettysburg/July 2-3", 27, '126th NY (Willson 1870) for Jul 2; 69th Pa. (McDermott), Philadelphia Brigade (Banes) for position; others other battles'))
    lines(r, 'changes_vs_previous', "wave 4: the 126th NY (Hays's division) adds a Jul 2 morning work of stone wall and rail fence")
    tail(r, "Wave 4 (2026-11-14): the 126th NY (Hays's division) made breastworks of 'a low stone wall, and an old rail fence' on the crest from about 08:00 on Jul 2 (Willson 1870).")

    # ============================================================ E-18 Confederate works
    r = R_['R14.E-18']
    add(r, S('g', "NPS Cultural Landscapes Inventory (Pickett's Charge area): documented 1863 defenseworks include McMillan Woods earthworks and rifle pits, Pender's Division earthworks, Poague's Battalion lunettes and Spangler Woods defense works (dates within 1863 not stated).", 'documented', 'partial', [
        C('NPS', 'NPS-CLI-PCB', "CE 1863 Built Documented defenseworks include McMillan Woods earthworks, McMillan Woods rifle pits, Pender's Division earthworks, Poague's Battalion lunettes, and Spangler Woods defense works.")],
        note="Secondary, modern; no day is given. It puts Confederate earthworks and lunettes on Seminary Ridge in 1863 but does not say that they were built on Jul 2-3 rather than on Jul 3-4 (sub-claims b-e)."), after='f')
    add(r, S('h', "Photograph: Confederate prisoners on a stacked-rail breastwork on Seminary Lane, circa 15 Jul 1863.", 'documented', 'partial', [
        C('NPS', 'NPS-CLR-1STDAY', "1.46. Confederate prisoners on stacked rail breastwork (Seminary Lane), 1863.")],
        note="List-of-figures entry of the NPS report (the caption reads 'probably along Seminary Lane ... photographed circa July 15, 1863'); it shows that a stacked-rail breastwork stood on Seminary Lane by mid-July, not who built it or when (the NPS reads it with the Confederate work of Jul 4)."), after='g')
    lines(r, 'lookups', L('NPS reports (wave 4)', "Confederate works 1863 (CLI Pickett's Charge, CLR First Day)", 2, 'defenseworks list without dates; photograph fig. 1.46'))

    # ============================================================ S-001 Rock Creek railroad bridge: page image of the Compiler
    r = R_['R14.S-001']
    s = sub(r, 'b')
    s['claim'] = ("Which bridge and its state: the railroad bridge across Rock Creek 'was soon set on fire by the rebels'; burning cars started down the track and passed over it; 'the centre span of the bridge was burnt' (the word after 'burnt and' is smeared in the page image; 'fell in' is the likely reading, not certain); 'the other two are standing, but badly damaged'; seventeen cars were burnt.")
    for c in s['citations']:
        if c['quote'] == "The railroad bridge across":
            c['image'] = 'gbg-compiler-1863-06-29-bridge'
            c['reading'] = ("The railroad bridge across Rock creek was soon set on fire by the rebels, and whilst in a blaze a number of cars were ignited and started down the track, but they passed over the bridge and were consumed just beyond. "
                            "Altogether, we are told that seventeen cars were burnt ... The [c]entre span of the bridge was burnt and [smeared] in. The other two are standing, but [ba]dly damaged. (page image of leaf 1 looked at 2026-11-14; square brackets are smeared letters)")
        if c['quote'] == "The other two are standing, but badly damaged":
            c['image'] = 'gbg-compiler-1863-06-29-bridge'
    s['note'] = ("Page image looked at 2026-11-14 (horde/fence-1/images/gbg-compiler-1863-06-29-bridge-x1.5.png and ...-span-smear-x5.png): the OCR of the passage is confirmed except for the smeared first letters of the last three lines "
                 "(the OCR prints 'Bock i geek' for 'Rock creek' and garbles 'centre span ... burnt'); no hour or date is printed in the passage itself. Only the clean fragments are quoted.")
    r['corrected_claim'] = r['corrected_claim'].replace(
        "its garbled OCR reads that the central span was burnt and fell in and, verbatim,",
        "the page image, looked at 2026-11-14, reads 'The [c]entre span of the bridge was burnt and [smeared] in' (the word before 'in.' is smeared; 'fell' is the likely reading, not certain) and, verbatim,")
    assert 'page image, looked at' in r['corrected_claim']
    r['product_consequence'] = [x.replace("damage state 'centre span burnt and fell in, two spans standing damaged'", "damage state 'centre span burnt (fell in: likely reading of a smeared word), two spans standing badly damaged'") for x in r['product_consequence']]
    r['stays_unsupported'] = ["Printed hour of the burning (evening only)", "Whether the centre span fell: the word before 'in.' is smeared in the page image ('burnt' is clear)"]
    lines(r, 'lookups', L('page image (wave 4)', "Gettysburg Compiler 29 Jun 1863, leaf 1, bridge passage", 1, "read: 'The [c]entre span of the bridge was burnt and [smeared] in'"))
    lines(r, 'changes_vs_previous', "wave 4: the page image confirms the OCR of the Compiler's bridge passage; 'fell in' is smeared and not asserted")

    # ============================================================ S-002 cupola
    r = R_['R14.S-002']
    add(r, S('e', "Jul 1 morning: Buford directed the opening of the battle from the cupola (steeple, belfry) of the Theological Seminary; his signal officer 'had early in the morning taken his station in the cupola of the Theological Seminary' and saw the First Corps flag from 'the Seminary steeple'.", 'documented', 'supported', [
        C('ACQ', 'BATES-1875', "had early in the morning taken his station in the cupola of the Theological Seminary", pp='59'),
        C('ACQ', 'BATES-1875', "I was still in the Seminary steeple, but being the only signal officer with the cavalry", pp='59'),
        C('LIB', 'NY-GB-1900', "the signal officer in the belfry of the Seminary"),
        C('LIB', 'NJ-TOOMBS-1888', "Buford and Reynolds ascended to the cupola of the Lutheran Seminary"),
        C('LIB', 'BACH-WHATTOSEE-1873', "From this cupola, the gallant Buford directed the opening battle on the morning of July 1, 1863.")],
        note="Bates (1875) quotes the signal officer; Bachelder's guide (1873) calls the Seminary cupola the place; these are secondary. The day is Jul 1; Jun 30 is the date of Norton's 'steeple of the college' (a) and of the NPS's 'cupola of the Seminary building' (b), which do not name the same building."), after='c')
    lines(r, 'conflicts_carried', "Jul 1 morning: Seminary cupola (Bates quoting the signal officer; Toombs; NY monuments; Bachelder) vs College cupola (Jacobs 1864: one of Howard's signal officers at 08:30)")
    r['stays_unsupported'] = ["Whether the Jun 30 'steeple of the college' (Norton) is Pennsylvania Hall or another college building (no source read names it)", "Hour on Jun 30"]
    lines(r, 'lookups', L('library, added books (wave 4)', "cupola/steeple/belfry + signal/Buford/observ", 21, 'Bates 1875, Toombs 1888, NY monuments, Bachelder 1873/1889 (Seminary); Jacobs 1864 (College)'))
    lines(r, 'changes_vs_previous', "wave 4: Jul 1 morning in the Seminary cupola is documented (five secondary witnesses); the building named for Jun 30 stays a conflict")

    # ============================================================ S-003 McPherson fences
    r = R_['R14.S-003']
    r['verdict'] = 'partially_supported'
    r['corrected_claim'] = ("The NPS Historic Structures Report of the McPherson farm says that on the Tuesday night before the battle (Jun 30) the tenant Slentz watched men tear down his fencing 'for firewood and for possible use as breastworks on the morrow', and that Buford's troopers cut and threw down about a quarter mile of post and rail fence 'to make way for the battle' and used another cord of rails for firewood. The page's footnotes are Hall's History of the Sixth New York Cavalry (1908) and 'Slentz claims', and the OCR shows the second footnote's marker after the firewood sentence, so the fence statement appears to rest on the tenant's damage claim, which is not local; the quoted phrase is not in the local text of Hall, so the NPS text is the only witness here. After the battle the McPherson fences were found destroyed (NPS landscape report; McPherson's claim: 6,844 rails). That the fences were along the railroad grade, and the critic's counterclaim, rest on a web page that cannot be read here (Gettysburg Daily).")
    more(r, 'a', C('NPS', 'NPS-CLR-1STDAY', "Most of the fences along Chambersburg Pike had been destroyed; over the entire farm, Edward McPherson claimed the loss of 6,844 rails"),
         note="Wave 4: the NPS landscape report adds that most of the fences along the Chambersburg Pike were destroyed and that Edward McPherson claimed 6,844 rails lost over the farm.")
    add(r, S('a2', "Jun 30 evening: Buford's cavalry tore down the tenant's fencing on the McPherson farm for firewood and possible breastworks; about a quarter mile of post and rail fence was cut and thrown down 'to make way for the battle' and another cord of rails burned (NPS Historic Structures Report; the footnote after the firewood sentence reads 'Slentz claims').", 'documented', 'partial', [
        C('NPS', 'NPS-HS-MCPHERSON', "his crops and fencing were pre-eminent in h is thoughts th a t Tuesday n igh t.", pp='26', reading="...his crops and fencing were pre-eminent in his thoughts that Tuesday night. (the saved text has letter-spaced OCR; read by the engineer, not changed otherwise)"),
        C('NPS', 'NPS-HS-MCPHERSON', "to re down his fen cin g f o r firewood and f o r possible use as breastworks on the morrow", pp='26', reading="...tore down his fencing for firewood and for possible use as breastworks on the morrow"),
        C('NPS', 'NPS-HS-MCPHERSON', "cut and throw down about a qu arter mile o f post and r a i l fence", pp='26', reading="...Buford's troopers cut and throw down about a quarter mile of post and rail fence 'to make way for the battle' and another cord of rails used up for firewood")],
        note="The report is a secondary narrative; its page carries two footnotes, 'Major Hillman A. Hall, et al., History of the Sixth New York Cavalry (Worcester, 1908)' and 'Slentz claims', and the OCR marker after the firewood sentence reads as 49, the second. The words 'to make way for the battle' are quoted in the report, but they are not found in the local text of Hall 1908 (searched 2026-11-14: no hit for 'to make way' or for fences near Gettysburg), so the underlying passage (very likely the tenant's claim) is unchecked. Tuesday night = Jun 30, 1863. 'Possible use as breastworks' is the report's wording."), after='a')
    setsub(r, 'b', claim="Cavalry dismantled fences 'along the railroad grade' on Jun 30 for firewood or breastwork (Harrison, Gettysburg Daily): the NPS report supports the farm and the day (a2) but does not say 'along the railroad grade'.", support='blocked_host')
    r['stays_unsupported'] = ["'Along the railroad grade' (Harrison, web page only)", "The critic's counterclaim that no wartime account describes fences along the cut (web page only)",
                              "The tenant's own damage claim (Slentz), which the NPS report footnotes, and the quoted phrase in Hall 1908 (not found in the local text)"]
    replace_in(r, 'conflicts_carried', "Contested (Harrison vs critic); no default chosen", "Contested (Harrison vs a critic); the NPS report sides with a Jun 30 tearing-down on the McPherson farm; no default chosen")
    lines(r, 'lookups', L('NPS reports, added books (wave 4)', "McPherson fences/rails destroyed or used; cavalry fires/rails", 12, 'NPS Historic Structures Report (McPherson farm) for; NPS CLR First Day (6,844 rails claimed); Hall 1908 checked, no passage'))
    lines(r, 'changes_vs_previous', "wave 4: verdict gap -> partially_supported on the NPS Historic Structures Report (Jun 30 evening tearing-down of fencing and a quarter mile of post and rail fence)")

    # ============================================================ S-004 Presbyterian church
    r = R_['R14.S-004']
    r['verdict'] = 'corrected'
    r['corrected_claim'] = ("A Presbyterian church near the centre of the town was used as a hospital on Jul 1, not on Jun 30: after noon, when the Eleventh Corps came to the cavalry's relief and Confederate batteries brought the 8th Illinois Cavalry's hospital at the depot under fire, its surgeons moved their wounded to the Presbyterian church and were amputating there when Buford's order to fall back came (Hard, History of the Eighth Illinois Cavalry, 1868). The Cavalry Corps hospital tablet stands before the Presbyterian church (NPS list of tablets, 1932; NPS treatment guidelines). The PDF's Jun 30 date, the address (208 Baltimore St) and 'corps medical staff' as the trigger rest on a Historical Marker Database page that cannot be read here.")
    r['sub_claims'] = [
        S('a', "Jul 1, after noon: the 8th Illinois Cavalry (Buford's division) first had a temporary hospital at the depot (morning), was shelled there, and 'removed our wounded to the Presbyterian church near the center of the town' where its surgeons were amputating when Buford's order to fall back arrived; three surgeons were left with the wounded.", 'documented', 'supported', [
            C('ACQ', 'HARD-1868', "Early next morning, July 1st, our pickets brought word that the enemy was advancing in force.", role='context'),
            C('ACQ', 'HARD-1868', "Sergeant Goodspeed, of Company H, was wounded and taken to the depot where a temporary hospital had been established", pp='257'),
            C('ACQ', 'HARD-1868', "it was not until after noon that the Eleventh corps came to our relief", role='context', pp='257'),
            C('ACQ', 'HARD-1868', "we soon found that our hospital, at the depot, was in their range ; some of the shots striking the buildings and tearing them to pieces. We removed our wounded to the Presbyterian church near the center of the town", pp='258'),
            C('ACQ', 'HARD-1868', "by leaving Surgeons Beck, Rulison and Vosburg to attend", pp='258')],
            note="A regimental history of 1868 in the first person of an officer who was there ('General Buford told me'); the passage dates itself to Jul 1 ('Early next morning, July 1st' ... 'not until after noon that the Eleventh corps came to our relief'). It does not give a street, an address or a time of day for the move."),
        S('b', "The Cavalry Corps hospital is commemorated at the Presbyterian church: the 1932 list of Park Commission tablets has 'The Cavalry Corps in front of the Presbyterian Church Gettysburg', and the NPS treatment guidelines for the commemorative area speak of 'the Cavalry Brigade Hospital Tablet' on the front of the Presbyterian Church.", 'documented', 'supported', [
            C('NPS', 'NPS-MON-LOC-1932', "The Cavalry Corps in front of the Presbyterian Church Gettysburg"),
            C('NPS', 'NPS-TPG-COMMEM', "affixing the Cavalry Brigade Hospital Tablet to the front of the Presbyterian Church")],
            note="Commemorative evidence (1932 and the NPS plan); it names the church, not the date."),
        S('c', "The church became the Cavalry Corps 1st Division hospital on Jun 30 on the order of the corps medical staff, at 208 Baltimore St.", 'open_gap', 'blocked_host', [],
          note="Rests on Historical Marker Database 17939 (blocked). No Jun 30 statement is in the sources read; Hard's account has the regiment's hospital at the depot on the morning of Jul 1."),
    ]
    r['stays_unsupported'] = ["Jun 30 as the date of the church becoming a hospital", "The address 208 Baltimore St and 'corps medical staff' as the trigger (marker page only)", "The hour of the move on Jul 1 (only 'after noon' in the sequence of the account)"]
    r['conflicts_carried'] = ["Date of the church hospital: Jun 30 (marker, PDF) vs Jul 1 after noon (Hard 1868); both carried, no default chosen"]
    lines(r, 'lookups', L('library, added books, newspapers, NPS (wave 4)', "Presbyterian church + hospital/wounded", 4, "Hard 1868 (8th Illinois Cavalry), NPS list of tablets (1932), NPS treatment guidelines; Adams Sentinel 28 Jul 1863 is a visit of a pastor, not a hospital"))
    lines(r, 'changes_vs_previous', "wave 4: verdict unsupported -> corrected; the church hospital is documented for Jul 1 after noon (8th Illinois Cavalry), Jun 30 stays only on the marker page")

    # ============================================================ S-006 pike fences
    r = R_['R14.S-006']
    add(r, S('e', "Fences stood on both sides of the Chambersburg turnpike where the 6th Wisconsin charged the railroad cut on Jul 1, and the 6th Wisconsin men climbed them: Dawes: 'the two post and rail fences that lined the turnpike'; Fairfield (National Tribune, quoted by the NPS): the first fence on the south side 'was an old one, and we pulled it down', the fence on the north side 'was a new post-and-rail fence'; Sullivan (memoir, quoted by the NPS): 'a stake and rider fence on each side of it'.", 'documented', 'conflict', [
        C('KIT', 'servsixthwiscon00dawerich', "In climbing the two post and rail fences that lined the turnpike, great numbers of men were killed."),
        C('NPS', 'NPS-CLR-ROT-V1', "The frst fence we came to on the south side of the Chambersburg pike was an old one, and we pulled it down and passed over, but the fence on the north side of the pike was a new post-and-rail fence, and we climbed over it", occ=0,
          reading="The first fence we came to on the south side of the Chambersburg pike was an old one, and we pulled it down and passed over, but the fence on the north side of the pike was a new post-and-rail fence, and we climbed over it (George Fairfield, 'The Capture at the Railroad Cut', in Sauers, ed., Fighting them Over, 1998, p. 119, as quoted in the NPS report; the saved text drops the 'fi' ligature)"),
        C('NPS', 'NPS-CLR-ROT-V1', "The 6th advanced steadily without halt or waver until it reached a road [Chambersburg Pike] with a stake and rider fence on each side of it", occ=0,
          reading="(James P. Sullivan, Sergt., Co. K, 6th Wisconsin, memoir edited by Beaudot and Herdegen, 1993, p. 110, as quoted in the NPS report)")],
        note="Three participants of the same charge (a memoir of 1890, a National Tribune piece quoted by the NPS, a memoir quoted by the NPS): fences on both sides of the pike at the McPherson farm; the type is a conflict (post and rail / new post-and-rail on the north and an old fence on the south / stake and rider). None says the type for the whole pike. The two NPS quotations are endnotes of the NPS report (each printed twice in its notes)."), after='c')
    lines(r, 'conflicts_carried', "Pike fence type by place: paling near the seminary (Wainwright), post and rail at the McPherson farm (Dawes 1890; Fairfield: new post-and-rail on the north side, an old fence on the south), stake and rider on each side (Sullivan), Virginia worm on the north side (NPS 2021)")
    r['stays_unsupported'] = ["Post-and-rail along the whole pike (Dawes covers the McPherson-farm stretch only)"]
    lines(r, 'lookups', L('library, added books, NPS (wave 4)', "pike + post-and-rail/paling/worm fence", 6, 'Dawes 1890 (post and rail), NPS report endnotes quoting Fairfield (new post-and-rail north, old south) and Sullivan (stake and rider each side)'))
    lines(r, 'changes_vs_previous', "wave 4: three participants of the 6th Wisconsin's charge document fences on both sides of the pike at the McPherson farm, with a conflict of type (Dawes, Fairfield, Sullivan)")

    # ============================================================ S-007 railroad cut clock
    r = R_['R14.S-007']
    setsub(r, 'b', claim="Clock: Reynolds fell about 10:15; Cutler's brigade in action from 10 a.m.; the 95th NY's monument inscription puts the change of front and the advance to the railroad cut with the 84th NY and 6th Wisconsin at 10:50 a.m. (the OR reports print no clock for the charge).",
           tier='documented', support='partial')
    more(r, 'b', C('LIB', 'NY-GB-1900-v2', "At 10:50 a. M. changed", reading="At 10:50 a. m. changed front, advanced to this position with the 84th New York and 6th Wisconsin, repulsed and captured a large part of Davis' Mississippi Brigade in the Railroad cut. (inscription of the 95th NY monument as printed in the New York Monuments Commission volume; the OCR is badly garbled around the hour, which is legible)"),
         note="A commemorative inscription (printed 1900), source of the hour not stated; it supports 'about 11:00' at the level of 10:50.")
    r['stays_unsupported'] = ["A clock printed in an 1863 report for the charge at the cut (the 10:50 is a monument inscription)"]
    lines(r, 'lookups', L('library, added books (wave 4)', "railroad cut + o'clock/a.m./eleven", 4, "95th NY monument inscription (10:50 a.m.); no clock in Dawes 1890"))
    lines(r, 'changes_vs_previous', "wave 4: the 95th NY monument inscription gives 10:50 a.m. for the advance to the cut")

    # ============================================================ S-008 Catholic church hospital
    r = R_['R14.S-008']
    r['verdict'] = 'partially_supported'
    r['corrected_claim'] = ("The Catholic church of Gettysburg (St. Francis Xavier) served as a hospital for wounded of both armies: a Bucktail surgeon left with the wounded of the first day was 'assigned to duty in a hospital established at the Catholic church' on the summit of the town's hill during the second and third days (Bates 1875); the church 'was filled with sick and wounded' with the stations of the cross on the walls and a large painting of St. Francis Xavier (Barton 1898); on the Sunday after the battle a hospital in the Roman Catholic church was destitute (Stoever, 1868); the NPS says hundreds of wounded US and Confederate soldiers were hospitalized there. That it became a hospital by noon on Jul 1, and that the pews were removed and boards laid, rests on an Aleteia page that cannot be read here; no source read dates the conversion or mentions the pews.")
    r['sub_claims'] = [
        S('a', "The Catholic church was a hospital for wounded of both armies after the first day: used during Jul 2-3 (Bates), full of sick and wounded (Barton), the Sunday after the battle (Stoever), hundreds of US and Confederate wounded (NPS).", 'documented', 'supported', [
            C('ACQ', 'BATES-1875', "remained with the wounded on the field of the first day's conflict, and was a prisoner during the second and third days of the battle", pp='162'),
            C('ACQ', 'BATES-1875', "He was assigned to duty in a hospital established at the Catholic church, situated on the very summit of the hill on which the town of Gettysburg is built.", pp='162'),
            C('ACQ', 'BATES-1875', "A rebel Major, who was in charge of the hospital"),
            C('ACQ', 'BARTON-ANGELS-1898', "The Catholic Church in Gettysburg was filled with sick and wounded."),
            C('ACQ', 'BARTON-ANGELS-1898', "with a very large oil painting of St. Francis Xavier holding in his hand a crucifix"),
            C('ACQ', 'USCC-SMITH-1868', "The Sabbath after the battle my attention was directed to the destitution of a hospital in the Roman Catholic church of Gettysburg."),
            C('NPS', 'NPSGOV-CIVILIANS', "in the Catholic church where hundreds of wounded US and Confederate soldiers were hospitalized")],
            note="Four secondary accounts of 1868-1898 and one NPS page; none dates the day the church was taken (Bates puts the surgeon there only after the first day; a Confederate major was in charge during Jul 2-3)."),
        S('b', "By noon on Jul 1 the church was a hospital, the pews removed and boards laid, on the arrival of wounded (Aleteia).", 'open_gap', 'blocked_host', [],
          note="Rests on the Aleteia page (blocked). No hit for pews removed or boards laid at this church (the one 'pews ... boards' passage in the sources, in Stoever's account, is an Episcopal church)."),
    ]
    r['stays_unsupported'] = ["Hour or day the church became a hospital ('by noon Jul 1')", "Pews removed and boards laid (no source read)"]
    lines(r, 'lookups', L('library, added books, newspapers, NPS (wave 4)', "Catholic church / St. Francis Xavier + hospital/wounded/pews", 5, 'Bates 1875, Barton 1898, Stoever (USCC-Smith 1868), NPS Civilians page; Adams Sentinel and Compiler: 0 hits'))
    lines(r, 'changes_vs_previous', "wave 4: verdict unsupported -> partially_supported; hospital use is documented for Jul 2-5, the hour on Jul 1 and the pews are not")

    # ============================================================ S-012 seminary damage
    r = R_['R14.S-012']
    more(r, 'b', C('NPS', 'NPS-CLR-1STDAY', "On the seminary campus, the main building and two professor’s houses occupied by Dr. Krauth and Dr. Schmucker were damaged by shells"),
         C('LIB', 'ADAMS-SENTINEL-1863-07-21', "The Theological Seminary was struck by a number of shello aud balls", reading="The Theological Seminary was struck by a number of shells and balls (the OCR prints 'shello aud'; the sentence continues in garbled letters, 'which will probably require part of one gable end to be' ...; an image check of the Adams Sentinel page is owed)"),
         note="Wave 4: the Adams Sentinel of 21 Jul 1863 (contemporary, local) says the seminary was struck by a number of shells and balls; the NPS says the main building and two professors' houses were damaged by shells.")
    lines(r, 'lookups', L('library, newspapers, NPS (wave 4)', "seminary/Schmucker + windows/glass/bullet/shot/shell", 7, 'Adams Sentinel 21 Jul 1863, NPS CLR First Day; no window-glass statement'))

    # ============================================================ S-016 Spangler farm
    r = R_['R14.S-016']
    add(r, S('a2', "The George Spangler farm was the Eleventh Corps hospital: the 2nd Division, 11th Corps hospital under Dr. D. G. Brinton, where Armistead was brought on the afternoon of Jul 3; the 1932 tablet list puts the Eleventh Corps hospital 700 feet east of the Spangler house; Bates counts 100 rebel and 1,900 Union wounded in the Eleventh Corps hospital at George Spangler's.", 'documented', 'supported', [
        C('NPS', 'NPS-COMMON-PRIDE-2', "Dr. D. G. Brinton, in charge of the 2nd Division, 11th Corps Union hospital at the George Spangler . farm"),
        C('NPS', 'NPS-COMMON-PRIDE-2', "On the afternoon of the 3rd of July about 4 o'clock the General was brought to my hospital"),
        C('NPS', 'NPS-BOUNDARY-1988', "The 11th Corps hospital located here was the site of General Armistead"),
        C('NPS', 'NPS-MON-LOC-1932', "The Eleventh Corps on Hospital Road 700 feet east of George Spangler house"),
        C('ACQ', 'BATES-1875', "of the Eleventh corps, at George Spangler's, and contained 100 rebel and 1900 Union")],
        note="NPS 'Common Pride' study (secondary; it quotes Dr. Brinton's account written shortly after the war); the 1988 boundary study; the 1932 tablet list (commemorative); Bates 1875 for the count. The corps and the farm are now documented; the day the hospital opened and the hour are not."), after='a')
    setsub(r, 'b', claim="Mid-afternoon Jul 1 conversion of the farm to a hospital and wounded there 'by about 16:00' (HistoryNet): the Eleventh Corps hospital is documented at the farm (a2) and in use on Jul 3 about 16:00 (Brinton); no source read gives the day it opened or an hour.")
    r['stays_unsupported'] = ["The day and hour the farm became the Eleventh Corps hospital (mid-afternoon Jul 1 is the PDF's; 'wounded there by about 16:00' is the web page's)"]
    lines(r, 'lookups', L('library, added books, NPS (wave 4)', "Spangler + Eleventh/XI/11th Corps + hospital", 7, 'NPS Common Pride 2, NPS Boundary 1988, NPS 1932 list, Bates 1875; no opening hour'))
    lines(r, 'changes_vs_previous', "wave 4: the XI Corps ownership of the Spangler farm hospital is documented (NPS, Bates); the Jul 1 hour is not")

    # ============================================================ E-11 duration of the Union cannonade (Stevens' battery history)
    r = R_['R14.E-11']
    add(r, S('f', "A second account of the Jul 3 Union cannonade: the 5th Maine battery's history says 'Twenty guns in all opened at 4 a. m., at the short range of 600-800 yards, on the enemy holding possession of that portion of our line vacated the evening before by the Twelfth corps. This cannonade was continued with but short intervals until 10 a. m.'", 'documented', 'conflict', [
        C('LIB', 'ME-GB-1898', "Twenty guns in all (a) opened at 4 a. m., at the short range of 600-800 yards, on the enemy holding possession of that portion of our line vacated the evening before by the Twelfth corps. This cannonade was continued with but short intervals until 10 a. m.", pp='99', reading="Twenty guns in all [footnote (a): Rebellion Records, vol. 27, part 1, page 871] opened at 4 a. m., ... This cannonade was continued with but short intervals until 10 a. m.")],
        note="Maine at Gettysburg (1898), the history of the 5th Maine Battery (Stevens), a participant's account; the footnote names the OR for the 20 guns (Muhlenberg's fourteen pieces and Knap's battery in Geary's report, sub-claim b). The 4-10 a.m. span with 'short intervals' is a conflict with Geary's ten minutes plus about fifteen; the PDF's 30 minutes to 3 hours lies between them; none is chosen."), after='e')
    r['stays_unsupported'] = ["Physical damage state of the works", "Whether the cannonade was 25 minutes (Geary) or 4 to 10 a.m. with short intervals (the 5th Maine battery's history); '3 hours' is not printed", "5 batteries / 24 guns (web or letter; the OR and the 5th Maine history give 20 guns: fourteen under Muhlenberg and Knap's battery)"]
    lines(r, 'conflicts_carried', "Duration of the Jul 3 Union cannonade: ten minutes plus about fifteen (Geary) vs 4 to 10 a.m. with short intervals (5th Maine battery history, 1898) vs 30 minutes to 3 hours (PDF)")
    lines(r, 'lookups', L('library, added books (wave 4)', "Culp's Hill + works + shattered/riddled/damaged after the shelling", 0, 'no hit; the damage state stays a gap'), L('library, added books (wave 4)', "800 yards / eight hundred yards near Culp's Hill and Greene", 39, "none about a line length; one 5th Maine battery statement of 'twenty guns' and 'until 10 a. m.' (range 600-800 yards)"))
    lines(r, 'changes_vs_previous', "wave 4: the 5th Maine battery history (1898) adds 'twenty guns ... until 10 a. m.' as a conflicting duration")

    # ============================================================ S-005 place names of the McPherson ground in 1863
    r = R_['R14.S-005']
    add(r, S('f', "Place names for the ground in the 1863 reports: 'McPherson's woods' (24th Michigan, R033 pp.268-269: 'from our first line of battle in McPherson's woods to the barricade near the seminary'), 'McPherson's barn' (R065 p.343), 'McPherson's farm' (OR27-2 R539 p.623); the name 'McPherson Ridge' has no hit in OR parts 1-3.", 'documented', 'supported', [
        C('OR1', 'R033', "the woods known as McPherson's woods"),
        C('OR1', 'R033', "from our first line of battle in McPherson's woods to the .barricade near the seminary"),
        C('OR1', 'R065', "retreat from McPherson's barn to the seminary"),
        C('OR2', 'R539', "the crest of the heights on McPherson's farm")],
        note="Searched 2026-11-14 in OR parts 1-3 for 'McPherson' (9 hits in all, none with 'ridge'); the PDF's 'McPherson Ridge' is not an 1863-report name, though the places it names are in the reports."), after='d')
    r['stays_unsupported'] = ["07:30 clock", "'McPherson Ridge' as a name used in the 1863 reports (no hit in OR parts 1-3; 'McPherson's woods', 'barn' and 'farm' are used)"]
    lines(r, 'lookups', L('OR parts 1-3 (wave 4)', "McPherson (all)", 9, "McPherson's woods (4), barn (1), farm (1) and three personal names; no 'ridge'"))
    lines(r, 'changes_vs_previous', "wave 4: the 1863 place names are McPherson's woods, barn and farm; 'McPherson Ridge' has no hit in OR 1-3")

    # ============================================================ corrected claims: first sentences that wave 4 made stale, and tails for rows without one
    def sub_text(rid, old, new):
        row = R_[rid]
        if old not in row['corrected_claim']:
            raise KeyError('%s: %r not in corrected_claim' % (rid, old[:60]))
        row['corrected_claim'] = row['corrected_claim'].replace(old, new, 1)
    sub_text('R14.E-04', "No source says Cemetery Hill was fortified as a whole or that von Steinwehr built works. Documented:",
             "No 1863 source says Cemetery Hill was fortified as a whole or that von Steinwehr built works (books of 1875-1914 do say so, see the last sentences). Documented in the OR:")
    sub_text('R14.S-006', "Dawes records a fence on the turnpike without a type;",
             "Dawes's OR report records a fence on the turnpike without a type, his memoir (1890) names 'the two post and rail fences that lined the turnpike', Fairfield (via the NPS) an old fence on the south side and a new post-and-rail fence on the north, Sullivan (via the NPS) a stake and rider fence on each side;")
    sub_text('R14.S-006', "carry paling, post-and-rail and Virginia worm as selectable types by reach.",
             "carry paling, post-and-rail, stake-and-rider and Virginia worm as selectable types by reach (wave 4, 2026-11-14: the McPherson-farm stretch has three participants).")
    R_['R14.S-016']['corrected_claim'] = ("The George Spangler farm was the Eleventh Corps hospital: the NPS says the farm served as a field hospital and as the 11th Corps hospital; the NPS 'Common Pride' study quotes Dr. D. G. Brinton, in charge of the 2nd Division, 11th Corps hospital at the farm, where General Armistead was brought about 4 o'clock on the afternoon of Jul 3; Bates (1875) counts 100 rebel and 1,900 Union wounded in the Eleventh Corps hospital at George Spangler's; the 1932 tablet list puts the Eleventh Corps hospital 700 feet east of the Spangler house. "
                                          "The day and hour it opened as a hospital (the PDF's mid-afternoon Jul 1, wounded by about 16:00) are not supported by any source readable here. The OR 'Spangler's farm' hit (McFarland, p.326) is George Spangler's farm near Emmitsburg, a different place, and must not be used as evidence.")
    tail(R_['R14.E-02'], "Wave 4 (2026-11-14): Curtis (1891) says the 24th Michigan's remnant, 'the ninety and nine ... that rallied around the flag on Culp's Hill the evening of the first day's fight', built a line of breastworks there 'the first night of the battle', on the left of the Iron Brigade's new line 'from the top of the elevation to the foot of the hill facing the town'; no hour, no fabric.")
    tail(R_['R14.S-014'], "Wave 4 (2026-11-14): Curtis (1891) adds that the 24th Michigan's remnant built a line of breastworks on Culp's Hill 'the first night of the battle' (see E-02).")
    tail(R_['R14.E-11'], "Wave 4 (2026-11-14): the 5th Maine battery's history (Maine at Gettysburg, 1898) says twenty guns opened at 4 a.m. and the cannonade 'was continued with but short intervals until 10 a. m.', a second duration carried against Geary's ten minutes plus about fifteen; the damage state of the works is still not described anywhere read.")
    tail(R_['R14.E-18'], "Wave 4 (2026-11-14): the NPS inventory of the Pickett's Charge area lists documented 1863 Confederate defenseworks at McMillan Woods (earthworks, rifle pits), Pender's Division (earthworks), Poague's Battalion (lunettes) and Spangler Woods, without dates, and the NPS list of figures has a photograph of Confederate prisoners on a stacked-rail breastwork on Seminary Lane (circa 15 Jul 1863); the days of building at these sites stay open.")
    tail(R_['R14.S-005'], "Wave 4 (2026-11-14): the 1863 reports call the ground McPherson's woods (24th Michigan, R033), barn (R065) and farm (OR27-2 R539); 'McPherson Ridge' has no hit in OR parts 1-3.")
    tail(R_['R14.S-007'], "Wave 4 (2026-11-14): the 95th NY's monument inscription gives 10:50 a.m. for the change of front and the advance to the cut with the 84th NY and 6th Wisconsin (the OCR of the inscription is garbled around the hour, which is legible).")
    tail(R_['R14.S-011'], "Wave 4 (2026-11-14): Cooper (Battery B, 1st Pa.) says Perrin turned the barricade 'after 4 p.m.' and the NPS says the Union line on Seminary Ridge 'disintegrated by about 5:00 p.m.'; the hour stays a three-clock conflict (see E-01).")
    tail(R_['R14.S-012'], "Wave 4 (2026-11-14): the Adams Sentinel of 21 Jul 1863 says the Theological Seminary 'was struck by a number of shells and balls' (OCR garbled after that), and the NPS says the main building and two professors' houses were damaged by shells.")
    tail(R_['R14.S-002'], "Wave 4 (2026-11-14): the Jul 1 morning post is documented as the Seminary cupola (Bates, quoting the signal officer: 'early in the morning taken his station in the cupola of the Theological Seminary'; Toombs; the New York volume; Bachelder), a different event from Norton's Jun 30 'steeple of the college'.")
    tail(R_['R14.E-15'], "Wave 4 (2026-11-14): The First Minnesota (1916) also has Hazlett's guns and caissons dragged by hand to the crest with the horses left in the rear.")
    tail(R_['R14.E-16'], "Wave 4 (2026-11-14): the NPS inventory says the stone walls of the Devil's Den / Little Round Top landscape 'were recorded as being present at the time of the battle' by the Warren maps; no builder of a Devil's Den work was found (the 91st Pa. built its wall at night in front of Hazlett's battery, see E-14).")

    # ============================================================ product consequences of the wave-4 changes
    def cons(rid, *new, replace=None):
        row = R_[rid]
        if replace:
            for prefix, text in replace.items():
                hit = [i for i, x in enumerate(row['product_consequence']) if x.startswith(prefix)]
                if len(hit) != 1:
                    raise KeyError('%s: consequence prefix %r matches %d' % (rid, prefix, len(hit)))
                row['product_consequence'][hit[0]] = text
        row['product_consequence'] = list(row['product_consequence']) + list(new)

    cons('R14.E-01',
         "E-01 overrun hour: selectable scenarios 'turned after 4 p.m.' (Cooper, Union), 'advance ordered about 4 o'clock' (Pender, Confederate clock) and 'line gone by about 5:00 p.m.' (NPS); no default; the PDF's 16:00-16:30 stays labelled as the range between the first two",
         replace={"E-01 dimensions:": "E-01 dimensions: 'about 600 yd' must be shown as an open gap (plausible-procedural), not documented; form selectable: circular redoubt (Small 1886), semicircular line (Toombs 1888) or a line parallel to the Seminary through the west edge of the grove (McFarland, OR); purpose 'the line to which the division could fall back' (Bates 1875, documented-secondary)"})
    cons('R14.E-02',
         "E-02: add the 24th Michigan (remnant of the Iron Brigade) as an early builder on Culp's Hill on 'the first night of the battle' (Curtis 1891, documented-secondary): its line is the left of the Iron Brigade's new line, 'from the top of the elevation to the foot of the hill facing the town'; keep the clock 18:00-21:00 inferred and the fabric ('logs') a gap")
    cons('R14.S-014', "S-014: the 24th Michigan's remnant built a line of breastworks on Culp's Hill 'the first night of the battle' (Curtis 1891): add it to the trigger text beside the 6th Wisconsin and the 7th Indiana")
    cons('R14.E-04',
         "E-04 lunette scenarios (same as E-12): default per the OR ('light earthworks at dusk by the battery crews'); selectable 'Steinwehr's division built solid lunettes with level platforms during Jul 1' (Bates 1875, Curtis 1891: documented-secondary, disputed) and 'only shallow holes for wheels and trails at about 15:00-15:30 Jul 1' (Hancock 1878, primary witness); the wording 'fortified' on S-020 carries the marker 'attributed to Steinwehr in books of 1875-1914; no 1863 report'")
    cons('R14.E-12',
         "E-12: three selectable builder/fabric scenarios: battery crews, light earthworks at dusk and lunettes finished in the morning (OR, default); Steinwehr's division, solid lunettes with 'smooth and perfectly level platforms' during Jul 1 (Bates, Curtis); shallow holes for wheels and trails only at about 15:00-15:30 (Hancock); the 'solid, level platform' look appears only in the second")
    cons('R14.E-11',
         "E-11: Union cannonade duration is a selector: about 25 minutes in two bursts (Geary, OR) or from 4 a.m. to 10 a.m. with short intervals (5th Maine battery history, 1898); 20 guns documented (Muhlenberg's fourteen and Knap's battery); '24 guns / 5 batteries' stays a PDF scenario marked unsupported")
    cons('R14.E-13',
         "E-13: add a small breastwork for the 44th NY on its stony side-hill position during Jul 2 (documented-secondary, 'We threw up a small breast-work'); at the 16th Michigan's front carry 'no stone breastworks on Jul 2, thrown up the night of Jul 3 principally by Crawford's division' (Hamilton 1892, via NPS) as a selectable alternative to the NPS 'night of Jul 2'")
    cons('R14.E-14',
         "E-14 builder and clock scenarios on the slope: (A) Weed's brigade at night Jul 2 (Garrard; 91st Pa. 'during the night'; 140th NY 'in the dark'), default; (A2) the 146th NY told to erect a rough wall before the attack of Jul 2 (1915 history via NPS); (B) Fisher's Reserves morning Jul 3; (C) Crawford's division night Jul 3 at the 16th Michigan's front (Hamilton 1892); the 'Ohio battery' stays a PDF-only builder marked unsupported")
    cons('R14.E-17', "E-17: add traverses at right angles to the Emmitsburg-road stone wall at the south edge of the town, about thirty feet apart ('at the time of the battle', Bachelder 1873; day and builder open; the wall pre-existed): a spacing, not a profile",
         "E-17: add a Jul 2 morning work for the 126th NY (Willard's brigade, Hays's division) on the crest near the Cemetery, built hastily of 'a low stone wall, and an old rail fence' (documented-secondary, about 08:00 to about 18:30); the 69th Pa. rail-and-stone work is dated the morning of Jul 2 (page image of the OR report)")
    cons('R14.E-18', "E-18: add a Confederate 'earthworks built in 1863, day not stated' state for McMillan Woods, Pender's Division (Seminary Ridge), Poague's lunettes and Spangler Woods (NPS inventory), marked as a dated gap; the documented Jul 3-4 builds stay as listed")
    cons('R14.S-002', "S-002: add the Jul 1 morning state 'Seminary cupola used by Buford and his signal officer' (documented-secondary: Bates quoting the signal officer, Toombs, NY monuments, Bachelder); the Jun 30 'steeple of the college' (Norton) stays a separate selectable object; the Pennsylvania Hall identity stays unsupported",
         replace={"S-002: split the signal-post event": "S-002: split the signal-post event into the Jun 30 post (building scenario: the steeple of the college per Norton; the cupola of the Seminary building per the NPS) and the Jul 1 posts (the Seminary cupola in the morning; one of Howard's signal officers on the College cupola at 08:30, Jacobs); both tier documented for the event; the identity of the college building (Pennsylvania Hall or another) stays inferred"})
    cons('R14.S-003',
         replace={"S-003: no state change by default": "S-003: on the McPherson farm show, from the evening of Jun 30, about a quarter mile of post and rail fence cut down by Buford's cavalry and a cord of rails burned (documented-secondary, partial: NPS Historic Structures Report); 'along the railroad grade' stays a marked gap (blocked page) and the critic's 'no change' scenario stays selectable; no default among them is chosen here"})
    cons('R14.S-004',
         replace={"S-004 / H-01:": "S-004 / H-01: the Presbyterian church is a hospital from Jul 1 after noon (documented: 8th Illinois Cavalry's wounded moved there from the depot hospital); the PDF's Jun 30 stays a labelled scenario that rests on the marker page; do not show the church as a Jun 30 hospital as a fact"})
    cons('R14.S-005', "S-005: label the ground with the names of the 1863 reports (McPherson's woods, McPherson's barn, McPherson's farm); 'McPherson Ridge' has no hit in OR parts 1-3 and is shown as the PDF's name")
    cons('R14.S-006', "S-006: at the McPherson farm fences stood on both sides of the pike on Jul 1 (three participants of the 6th Wisconsin's charge, documented-secondary) with the type a selector: post and rail (Dawes), new post-and-rail on the north and an old fence on the south (Fairfield), stake and rider (Sullivan); the paling near the seminary (Wainwright) and the Virginia worm fence of the NPS stay as scenarios; no whole-pike type is chosen")
    cons('R14.S-007', "S-007: the 95th NY monument inscription gives 10:50 a.m. for the change of front and the advance to the railroad cut; show 'about 10:50' as the documented clock of the cut fight (commemorative source), the PDF 'about 11:00' stays")
    cons('R14.S-008',
         replace={"S-008 / H-02:": "S-008 / H-02: the Catholic church is a hospital for wounded of both armies from the second day (Jul 2-3, Bates) through at least Jul 5 (Stoever; NPS), documented-secondary; the PDF's 'by noon Jul 1, pews removed and boards laid' stays a marked gap (web page only); do not show pews removed as a fact"})
    cons('R14.S-012', "S-012 / H-03: add 'struck by a number of shells and balls' (Adams Sentinel, 21 Jul 1863, contemporary) and 'main building and two professors' houses damaged by shells' (NPS) to the damage state; glass loss stays a marked gap")
    cons('R14.S-016',
         replace={"S-016 / H-06:": "S-016 / H-06: the George Spangler farm is the Eleventh Corps hospital (documented-secondary: NPS, Bates; in use Jul 3 about 16:00, Brinton); the day and hour it opened stay open; do not show 'XI Corps at about 16:00 Jul 1' as documented"})

    # ============================================================ what is still to be read on the blocked pages (after the wave-4 evidence)
    def toread(rid, key, text):
        for b in R_[rid]['blocked_host']:
            if b['source_key'] == key:
                b['what_to_read'] = text
                return
        raise KeyError((rid, key))
    toread('R14.S-003', 'GD-Fences', "Gettysburg Daily fence article recorded in terrain_sources.json (the PDF key GD-Fences is not tied to this URL in the PDF; mapping unconfirmed; host gettysburgdaily.com refused here): read Harrison's claim (cavalry dismantled fences along the railroad grade on Jun 30) and the critic's reply, and compare them with the NPS Historic Structures Report (a quarter mile of post and rail fence on the McPherson farm, evening of Jun 30), which is now local")
    toread('R14.S-004', 'HMDB-17939', "Historical Marker Database marker 17939 (URL formed from the marker number in the PDF key and the m.asp?m= pattern of other recorded HMDB URLs; host hmdb.org refused here): read the marker text for the date (Jun 30 per the PDF), the address (208 Baltimore St), the unit and the trigger, and compare with Hard 1868 (the 8th Illinois Cavalry's wounded were moved to the Presbyterian church after noon on Jul 1), which is now local")
    toread('R14.S-008', 'Aleteia', "Aleteia page on the St. Francis Xavier parish (the exact article URL is not recorded in the PDF; the only Aleteia URL recorded in the repository is https://aleteia.org/2024/07/09/the-daughters-of-charity-at-gettysburg-part-2-photos/ - unconfirmed as this source; host refused here): read the passage on the church as a hospital for the day and hour it became one ('by noon Jul 1'), the removal of the pews and the laying of boards, and the page's own source; compare with Bates 1875 (hospital in use Jul 2-3), which is now local")
    toread('R14.S-016', 'HN-Spangler', "HistoryNet 'The war came knocking on Spangler's barn door' (URL not recorded in the PDF source list; host historynet.com refused here): read the day and hour the farm became the Eleventh Corps hospital ('mid-afternoon Jul 1', 'wounded by about 16:00') and the counts; the Eleventh Corps hospital itself is now documented locally (NPS, Bates), with use on Jul 3 about 16:00 (Brinton)")
    toread('R14.S-016', 'Gettysburg Foundation George Spangler Farm', "Gettysburg Foundation page recorded in terrain_sources.json (host refused here): read the hospital history of the farm for the day it opened as a hospital")

    # ============================================================ R14.0000 aggregate note
    r = R_['R14.0000']
    r['corrected_claim'] = r['corrected_claim'].rstrip() + " Re-opened 2026-11-14: three page images were looked at (OR27-1 p.431 and p.856, Gettysburg Compiler 29 Jun 1863) and newly local books and NPS reports were searched for the open sub-claims; the rows that changed are listed in REPORT.md."
