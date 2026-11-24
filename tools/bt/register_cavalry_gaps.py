#!/usr/bin/env python3
"""Registers the cavalry evidence gaps EG-CAV-01..EG-CAV-08 in the governance register (they existed only inside app/src/history/cavalry.mjs GAPS and as shard proposals
GOVERNANCE/horde/ws10-cavalry/proposed-register/), with their dated search logs (GATE-SPEC 1.4 L3 b): register/EG-CAV-0n.md, register/search_logs/EG-CAV-0n.json, register_index.json.

    python3 tools/bt/register_cavalry_gaps.py

Idempotent: an index row with the same id is replaced, never duplicated. The files are hand-written-format register files: tools/bt/seed_register.py adopts any register/*.md whose name is not
EG-nnnn.md (it parses the 16 field rows back), so a later seed_register run does not wipe them; search_logs/ is not touched by it.
Every search log row records a search that was actually run on the acquired OR Ser. I vol. 27 text (tools/bt/or27_find.py, parts 1-3, acquired 2026-11-11, library status OR-27-1..3) on the date
given; counts are the runner's hit counts (hits in all reports / hits in cavalry and horse-artillery reports). Nothing is quoted that or27_find.py did not print.
"""
import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
REG = os.path.join(G, 'register')
SL = os.path.join(REG, 'search_logs')
WS10 = os.path.join(G, 'horde', 'ws10-cavalry', 'proposed-register')
DATE = '2026-11-24'
OR = {1: 'OR-27-1', 2: 'OR-27-2', 3: 'OR-27-3'}
PRINT_ROW = {'source_id': 'PRINT', 'locator': 'Busey and Martin, Regimental Strengths and Losses; Coddington; Pfanz; Gottfried (library status PRINT: print-only)', 'date_searched': DATE, 'result': 'unreachable',
             'note': 'print-only in the library status: no text is held, so the books could not be searched; they stay named as the sources that could settle the gap'}


def S(part, pattern, counts, result, note):
    return {'source_id': OR[part], 'locator': 'tools/bt/or27_find.py --part %d %r (hits %d, of them in cavalry/horse-artillery reports %d)' % (part, pattern, counts[0], counts[1]), 'date_searched': DATE, 'result': result, 'note': note}


def F(part, locator, result, note):
    return {'source_id': OR[part], 'locator': locator, 'date_searched': DATE, 'result': result, 'note': note}


P_NUM = '(number|strength|total) of (horses|mounted men|serviceable horses)'
P_MNT = 'mounted (men|force|strength|effective)'
P_SRV = '(serviceable|effective|fit for service|unserviceable) horses'
P_KIL = '(horses|mounts) (killed|lost|disabled|wounded|shot)'
P_HLD = 'horse.?holders?'
P_HOL = 'holding (the |their )?horses'
P_4TH = 'every fourth man|number fours|one man in four|fourth man'
P_LED = 'led horses|horses to the rear|horses in the rear'
P_SPR = '(spare|pack|extra|officers.) horses'
P_REM = 'remounts?'
P_SQD = '(squadrons?|companies|battalions?) .{0,60}dismount|dismount.{0,60}(squadrons?|companies|battalions?)'
P_SQN = '(squadron|squadrons) (consist|composed|of two companies|of three companies|is composed|contain)|two companies.{0,40}squadron'
P_PACE = '(full speed|full gallop|at a gallop|rapid gait|a walk, trot)'
P_DRT = '(draught|team|wheel|lead).{0,15}horses.{0,30}(killed|disabled|shot)'
P_TIM = 'horses? .{0,40}(killed|disabled).{0,80}(p\\. ?m\\.|a\\. ?m\\.)'
P_MUM = 'Mummasburg.{0,120}(Devin|Gamble|Buford|cavalry)|(Devin|Gamble|Buford).{0,200}Mummasburg'
P_ROAD = '(Gamble|Devin|Custer|Farnsworth|Merritt).{0,120}(road|pike).{0,60}(Gettysburg|Emmitsburg|Fairfield|Hunterstown)'
P_PLC = '(Gamble|Devin|Custer|Farnsworth).{0,160}(Emmitsburg|Fairfield|Hunterstown|Chambersburg)'

ENT = {
 1: dict(why='No regimental present-for-duty, mounted or horse strength of a cavalry regiment is printed in any text acquired; OR Ser. I vol. 27 prints army and command aggregates of men only. The print sources that carry regimental strengths are print-only.',
         recon='Keep the model of src/history/cavalry.mjs (one horse per drawn trooper, shown as a range 0.47 to 1.0 with the basis), marked plausible-procedural; replace it by printed figures if Busey and Martin or a regimental history is acquired.',
         owner_q='Accept one horse per drawn trooper (range card 0.47 to 1.0) as the marked model, or supply or approve acquisition of the print source for regimental mounted strengths.',
         impact='Every mounted figure (about 12,000 horses): the count of horses per regiment.',
         log=[S(1, P_NUM, (5, 2), 'negative', 'cavalry hits: Col. Huey p. 971 and Gen. Kilpatrick p. 994 name "a large number of horses" captured, no figure; no regimental count'),
              S(2, P_NUM, (8, 0), 'negative', 'no hit in a cavalry report'), S(3, P_NUM, (11, 2), 'negative', 'cavalry corps correspondence (D0547 p. 258, D0766 p. 338): a request to supply "the number of horses that I need", no figure'),
              S(1, P_MNT, (21, 14), 'negative', 'qualitative uses ("the balance of the mounted men", Gamble p. 935); no number of mounted men of a regiment'),
              S(2, P_MNT, (34, 4), 'negative', 'no regimental mounted strength'), S(3, P_MNT, (36, 9), 'negative', 'no regimental mounted strength'),
              S(1, P_SRV, (0, 0), 'negative', 'no hit'), S(3, P_SRV, (2, 1), 'negative', 'D1629 p. 775: part of a division "absent with unserviceable horses", no number'),
              F(1, 'OR27-1-R008 Abstract from returns of the Army of the Potomac, pp. 150-161 (present for duty by command, cavalry column)', 'negative', 'command aggregates of men present for duty, one "equipped" column; no horses and no regiment rows for the cavalry brigades'),
              PRINT_ROW]),
 2: dict(why='Horse losses are printed for some commands in OR Ser. I vol. 27 (found, below) but not for every regiment, and not with the circumstance (under an unhurt rider, with a missing man) or the time; no source acquired closes the set.',
         recon='Keep the model (a horse down with each fallen trooper, time of the rider\'s fall), marked plausible-procedural. Printed figures found in the search (not yet in the product): Gamble p. 933, 3rd Indiana 18 and 8th Illinois 17 horses killed, 36 with the colonel\'s; Marshall (7th Virginia Cavalry) p. 762, horses killed 37 (OCR ".37"), wounded 45, captured 9 for the campaign period. They are totals without times and can bound, not place, the losses.',
         owner_q='Accept the rider-fall model with the printed regimental totals shown as the bound where they exist, or supply the regimental histories that give horse losses with times.',
         impact='Fallen-horse figures of every cavalry fight.',
         log=[S(1, P_KIL, (50, 7), 'found', 'OR27-1-R338 Col. William Gamble p. 933: "Horses killed - Third Indiana Cavalry, 18; Eighth Illinois Cavalry, 17. Total, 35 horses of enlisted men; 1 horse of Colonel Gamble; 36 horses in all killed."; other cavalry hits (Gregg p. 952, Custer p. 1000 "4 horses killed, 3 wounded" at Hunterstown for the battery, Capt. Robertson p. 1021 "23 horses killed" for Captain Daniels\' battery, Calef p. 1032 "horses killed" (OCR "1.3", read 13)) are not regimental cavalry horse losses'),
              S(2, P_KIL, (50, 6), 'found', 'OR27-2-R582 Lieut. Col. Thomas Marshall, Seventh Virginia Cavalry, p. 762: "Horses killed, .37; wounded, 45; captured by enemy, 9" (OCR prints ".37"; a total for the report\'s period; no time or place per horse). Also OR27-2-R563 Maj. D. G. McIntosh p. 675 (horses disabled, battalion of artillery) and R582 pp. 759, 761 (2 and 1-2 horses wounded)'),
              S(3, P_KIL, (2, 0), 'negative', 'no hit in a cavalry report'),
              F(1, 'every other cavalry brigade and regiment report of OR27-1 (Buford R337, Devin R339, Gregg R344, Kilpatrick R359, Custer R361, Huey R352) read through the pattern hits above', 'negative', 'no horse casualty figure for the regiments other than the 3rd Indiana and 8th Illinois; none with a time'), PRINT_ROW]),
 3: dict(why='The ratio of one man in four is the plan\'s statement; the sources acquired give neither the ratio nor the distance at which led horses stood or the time to lead them there.',
         recon='Keep one in four as the plan\'s tier, with the 12 m and 7 s as model parameters marked plausible-procedural. OR Ser. I vol. 27 confirms only that horse-holders existed (Buford p. 927).',
         owner_q='Confirm the one-in-four rule and the 12 m / 7 s parameters as marked model values, or supply a cavalry drill source with the distance.',
         impact='Positions and handling of the led horses of every dismounted fight.',
         log=[S(1, P_HLD, (1, 1), 'found', 'OR27-1-R337 Brig. Gen. John Buford p. 927: "A portion of the Third Indiana found horse-holders, borrowed muskets, and fought with the Wisconsin regiment that came to relieve them." (the use of horse-holders; no ratio, no distance)'),
              S(2, P_HLD, (0, 0), 'negative', 'no hit'), S(3, P_HLD, (0, 0), 'negative', 'no hit'),
              S(1, P_HOL, (0, 0), 'negative', 'no hit'), S(2, P_HOL, (0, 0), 'negative', 'no hit'), S(3, P_HOL, (0, 0), 'negative', 'no hit'),
              S(1, P_4TH, (0, 0), 'negative', 'the ratio of one in four is not printed'), S(2, P_4TH, (0, 0), 'negative', 'no hit'), S(3, P_4TH, (0, 0), 'negative', 'no hit'),
              S(1, P_LED, (2, 0), 'negative', 'no cavalry hit'), S(2, P_LED, (4, 1), 'negative', 'OR27-2-R580 Brig. Gen. W. E. Jones p. 753: the led horses at Monterey Pass hurled down the mountain; no distance'), S(3, P_LED, (4, 2), 'negative', 'D0250 p. 116 and D1714 p. 840: disabled horses and shoe loss, no distance'), PRINT_ROW]),
 4: dict(why='Reports name squadrons dismounted (found) but no text acquired gives the number of companies or men in a squadron, so a fraction of a regiment cannot be derived; several reports name no fraction at all.',
         recon='Keep two companies to the squadron as a marked assumption (plausible-procedural) and draw a unit mounted where no fraction is printed. Printed squadron counts found (not yet applied): Devin p. 939-941 (one squadron of the 9th NY; two squadrons of the 17th PA, etc.), Gamble p. 932 (one squadron of the 3rd Indiana), Custer p. 999 (five squadrons of a regiment).',
         owner_q='Accept two companies to the squadron as a marked assumption, or supply the printed company strength and organisation.',
         impact='The share of each regiment shown dismounted.',
         log=[S(1, P_SQD, (11, 8), 'found', 'squadron counts printed: OR27-1-R339 Col. Thomas C. Devin pp. 938-941 (a squadron of the Sixth New York dismounted as skirmishers; one squadron of the Ninth New York; two squadrons; two squadrons of the Seventeenth Pennsylvania); R338 Gamble p. 932 (one squadron of the Third Indiana); R361 Custer p. 999 (five squadrons of a regiment at Hagerstown, July 13); the men per squadron are not printed'),
              S(2, P_SQD, (10, 2), 'found', 'OR27-2-R565 Stuart p. 680 (a dismounted battalion of Hampton\'s brigade, Brandy Station); R506 Rodes p. 549 (dismounted cavalry under Jenkins); no fraction of a regiment'),
              S(3, P_SQD, (1, 1), 'negative', 'D1494 p. 703: a squadron of dismounted cavalry to cross at daylight; no fraction'),
              S(1, P_SQN, (0, 0), 'negative', 'no text states how many companies make a squadron'), S(2, P_SQN, (0, 0), 'negative', 'no hit'), S(3, P_SQN, (0, 0), 'negative', 'no hit'), PRINT_ROW]),
 5: dict(why='No acquired source gives spare, pack or officers\' horses of a cavalry regiment; remounts are aggregates only.',
         recon='No spare horse is drawn; the gap is shown on the unit card. The remount aggregate is not apportioned to units.',
         owner_q='Accept that no spare horses are drawn, or supply a source for spare and led horses per regiment.',
         impact='Absence of spare and pack horses in cavalry columns.',
         log=[S(1, P_SPR, (0, 0), 'negative', 'no hit'), S(2, P_SPR, (1, 0), 'negative', 'no cavalry hit'), S(3, P_SPR, (2, 0), 'negative', 'no cavalry hit'),
              S(1, P_REM, (4, 0), 'negative', 'OR27-1-R006 Meade p. 99 (Halleck: remounts to the cavalry, "the destruction of horses is enormous"): an aggregate, no unit figure'),
              S(2, P_REM, (3, 0), 'negative', 'no unit figure'), S(3, P_REM, (13, 1), 'negative', 'D0115 p. 57: the remounting of the dismounted cavalry to be hastened; no figure per unit'), PRINT_ROW]),
 6: dict(why='The manual\'s paces are data in gaits.mjs; the speed of the final pace of a charge ("nearly full speed") has no printed number and no charge in the layer carries a path.',
         recon='A unit whose path runs faster than the manual\'s gallop plays the gallop clip; a charging unit with no path stands. Marked plausible-procedural.',
         owner_q='Accept the gallop clip for charges with a path, or supply a source for charge speed and the paths of the charges.',
         impact='Pace and path of every mounted charge.',
         log=[S(1, P_PACE, (7, 1), 'negative', 'OR27-1-R338 Gamble p. 933: the cavalry "came on rapidly at a gallop" (a gait word, no speed or distance)'),
              S(2, P_PACE, (7, 6), 'negative', 'Stuart pp. 694 and 704, Hampton pp. 721-722, Marshall p. 757: "full speed", "at a gallop", "rapid gait" as words; no number'), S(3, P_PACE, (0, 0), 'negative', 'no hit'), PRINT_ROW]),
 7: dict(why='The history layer\'s arrival ledger gives no road of approach or place for these units, so the figure pass does not draw them. This is the layer\'s gap, not a gap of the record alone: OR Ser. I vol. 27 prints some places (found, below) that have not been entered in the ledger.',
         recon='Units stay undrawn with the gap listed, and the Q20 gate keeps them FAIL until each is drawn at a ledger place with a road. Candidate printed places found (not yet applied): Devin formed with his right on the road to Mummasburg (R339 pp. 937-938, page interpolated by the index); Buford names the road from Cashtown through Mummasburg and Hunterstown to the York pike (R337 p. 924) and Colonel Gamble\'s message that Lee signed a pass at Chambersburg (R337 p. 923).',
         owner_q='Authorise the arrival ledger (B.2.4) to be extended from the printed places for each undrawn cavalry unit, with the owner\'s decision on any road not printed.',
         impact='21 of 55 cavalry units are drawn; the other 34 are absent from the picture.',
         log=[S(1, P_ROAD, (0, 0), 'negative', 'no passage joins a brigade to a road to a place'), S(2, P_ROAD, (0, 0), 'negative', 'no hit'), S(3, P_ROAD, (0, 0), 'negative', 'no hit'),
              S(1, P_MUM, (3, 1), 'found', 'OR27-1-R337 Buford p. 924: "There is a road from Cashtown running through Mummasburg and Hunterstown on to York pike at Oxford"; and OR27-1-R339 Devin pp. 937-938 (page interpolated): his right "resting on the road to Mummasburg" (a place for Devin\'s brigade on July 1)'),
              S(3, P_MUM, (2, 0), 'negative', 'no cavalry-unit hit'),
              S(1, P_PLC, (7, 1), 'found', 'OR27-1-R337 Buford p. 923: "Colonel Gamble has just sent me word that Lee signed a pass for a citizen this morning at Chambersburg" (a message, not an approach road)'),
              S(3, P_PLC, (1, 0), 'negative', 'no cavalry-unit hit'), PRINT_ROW]),
 8: dict(why='Counts of draught-horse losses are printed for some batteries; no time is printed for any single loss.',
         recon='Each loss is placed by the counter-based RNG inside the battery\'s engagement windows, marked plausible-procedural. Printed counts: McMahon p. 889 (13 horses killed in the day\'s fight), Ames p. 901 (14 horses killed in two days), Calef p. 1032 (OCR "1.3"), Robertson p. 1021 for Captain Daniels\' battery (23).',
         owner_q='Accept RNG placement inside the engagement windows, or supply the battery histories that time the losses.',
         impact='Fallen draught horses of the batteries.',
         log=[S(1, P_DRT, (2, 0), 'negative', 'no battery time attached to a team loss'), S(2, P_DRT, (0, 0), 'negative', 'no hit'), S(3, P_DRT, (0, 0), 'negative', 'no hit'),
              S(1, P_TIM, (2, 0), 'negative', 'Hunt p. 236 and Thompson p. 890: a clock time follows a loss in the next sentence; it is not the time of the loss'),
              S(2, P_TIM, (1, 0), 'negative', 'Spooner p. 74: "50 or 60 horses killed" before "About 6 p. m." (a different event; no time of each loss)'),
              S(1, P_KIL, (50, 7), 'found', 'day totals: OR27-1-R322 McMahon p. 889 "3 men killed, 5 wounded, and 13 horses killed"; R334 Ames p. 901 "14 horses killed" in two days; R374 Calef p. 1032 "horses killed" (OCR "1.3", read 13); R368 Capt. Robertson p. 1021 "23 horses killed" (Captain Daniels\' battery); the time of each loss is not printed'), PRINT_ROW]),
}


def ws10(n):
    t = open(os.path.join(WS10, 'ws10-EG-CAV-%02d.md' % n), encoding='utf-8').read()
    f = {m.group(1): m.group(2) for m in re.finditer(r'^\| (.+?) \| (.*) \|$', t, re.M)}
    return t.split('\n')[0].split(': ', 1)[1], f


def main():
    os.makedirs(SL, exist_ok=True)
    ip = os.path.join(G, 'register_index.json')
    idx = json.load(open(ip, encoding='utf-8'))
    for n in sorted(ENT):
        eid = 'EG-CAV-%02d' % n
        e = ENT[n]
        title, f = ws10(n)
        tier = 'plausible-procedural'      # an 'open gap' tier of the shard maps to the weakest register tier, never promoted
        finds = [r for r in e['log'] if r['result'] == 'found']
        searched = ('Run on %s on the acquired OR Ser. I vol. 27 text, parts 1-3 (library OR-27-1..3, tools/bt/or27_find.py): %d searches, %d with a relevant find (register/search_logs/%s.json holds each pattern, hit counts and result). '
                    'Earlier: kit/cavalry_units.json (horses, strengths, behaviour_states), history/positions ledgers A, D, E, kit/artillery_batteries.json losses. Print sources (Busey and Martin, Coddington, Pfanz) are print-only and could not be searched.') % (DATE, len(e['log']) - 1, len(finds), eid)
        d = dict(id=eid, title=title, rids=['R01', 'R03'], cat='evidence missing', desc=f['Description'], why=e['why'], searched=searched, subst=f['Autonomous substitute applied'], recon=e['recon'], tier=tier,
                 competing='-', marking=f['Product marking'], impact=e['impact'], owner_q=e['owner_q'], rec='Keep the marked model until a source is read; do not read the model as history.', status='open')
        body = '# %s: %s\n\n| Field | Content |\n|---|---|\n' % (eid, title) + ''.join('| %s | %s |\n' % r for r in [
            ('ID', eid), ('Requirement IDs', ', '.join(d['rids'])), ('Category', d['cat']), ('Description', d['desc']), ('Why literal 100% is not possible or blocked', d['why']), ('Evidence searched', d['searched']),
            ('Autonomous substitute applied', d['subst']), ('Strongest evidence-based reconstruction', d['recon']), ('Confidence tier', d['tier']), ('Competing values', d['competing']), ('Product marking', d['marking']),
            ('Visual and audio impact', d['impact']), ('Review status', 'internal review only (DEC-006: no public review label)'), ('Owner decision requested', d['owner_q']), ('Agent recommendation', d['rec']), ('Status', d['status']),
            ('Owner decision and date', '(filled only from the Decision Log)')])
        open(os.path.join(REG, eid + '.md'), 'w', encoding='utf-8').write(body)
        json.dump(e['log'], open(os.path.join(SL, eid + '.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
        d['source_file'] = 'tools/bt/register_cavalry_gaps.py'
        idx = [x for x in idx if x.get('id') != eid] + [d]
    json.dump(idx, open(ip, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    print('registered', len(ENT), 'cavalry gaps; index', len(idx))


if __name__ == '__main__':
    sys.exit(main())
