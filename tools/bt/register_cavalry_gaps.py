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

KIT = lambda loc, result, note: {'source_id': 'KIT-FILES', 'locator': loc, 'date_searched': DATE, 'result': result, 'note': note}
ENT.update({
 9: dict(title='Confederate cavalry horse furniture (bridle) and sabre: no item in the kit', rids=['R04', 'R16'],
         desc='Seven drawn Confederate cavalry units (Hampton\'s six regiments and the 35th Virginia Battalion) fail the manifest test of Q20.3: their accoutrements hold the McClellan saddle only (no bridle) and their sidearms no sabre. kit/kit_specs.json default.confederate.cavalry names a McClellan saddle ("often captured McClellans", flagged unverified), a yellow sash, revolvers (type not stated) and LeMats; the plan prints no Confederate bridle, halter or sabre (B.6.15.4).',
         why='The plan and the kit evidence hold no Confederate cavalry bridle, halter or sabre item; "Specifics of Confederate cavalry arms by regiment were not found" (plan B.6.15.4).',
         subst='None applied: no Confederate bridle or sabre is added to the kit without a source (the Union bridle of the Maine Cavalry reproduction standard is not a Confederate source). The seven units stay failing in Q20.3.',
         recon='Confederate cavalry shown with the saddle and the arms the kit prints; the missing bridle and sabre are a visible gap. Candidate leads, not sources for the kit: OR27-1-R336 Pleasonton pp. 909 and 912 (carbines, pistols and sabers taken from the Confederate cavalry), and the McClellan saddle the plan calls often captured.',
         marking='Unit card section "Dress and equipment": the Confederate cavalry bridle and sabre are listed as gaps with this id.', impact='Seven Confederate cavalry units: horse tack and sidearm.',
         owner_q='Authorise a marked plausible-procedural Confederate bridle and sabre (captured Federal pattern), or supply a source for Confederate cavalry horse furniture and sabres.',
         log=[KIT('kit/kit_specs.json defaults["default.confederate.cavalry"].fields (accoutrements, sidearm_sword, weapon)', 'negative', 'accoutrements: sash_yellow_cavalry, mcclellan_saddle_m1859; sidearm_sword: revolver_unspecified, lemat; no bridle, no halter, no sabre item'),
              KIT('BIBLE/plan-clean.txt B.6.15.4 "Confederate cavalry gear" (lines 20890-20935)', 'negative', 'Dress, Stuart\'s gear, Arms (no sabre named), Saddles "Often captured McClellans", Resources; no bridle'),
              S(1, '(sabres?|sabers?)', (30, 12), 'found', 'OR27-1-R336 Pleasonton p. 912: "We also took a large number of carbines, pistols, and sabers" (from the Confederate cavalry at Brandy Station, June 9); p. 909 lists carbines 42, sabers 67 picked up on the field; qualitative, no regiment, not a kit source'),
              S(2, '(sabres?|sabers?)', (28, 6), 'negative', 'no regimental Confederate sabre issue'), S(3, '(sabres?|sabers?)', (4, 0), 'negative', 'no cavalry hit'),
              S(1, '(bridles?|saddles?|saddle-?cloths?|halters?)', (3, 1), 'negative', 'OR27-1-R366 Sawyer p. 1017: a saddle hit by a musket ball; no equipment description'),
              S(2, '(bridles?|saddles?|saddle-?cloths?|halters?)', (38, 5), 'negative', 'no Confederate cavalry tack description'), S(3, '(bridles?|saddles?|saddle-?cloths?|halters?)', (19, 3), 'negative', 'no tack description'), PRINT_ROW]),
 10: dict(title='Cavalry company officers, trumpeters and the Confederate bugle: no rank structure in the figure record', rids=['R04', 'R16'],
          desc='The figure manifests give every cavalry figure the rank private and the role rifleman (history/figures.mjs: "the record has no rank structure: PDF B.5 10,000+ company officers, not sourced"). Fourteen drawn units fail the soldier-type test of Q20.3 (all Union units of Merritt, Gregg and McIntosh: no officer among the figures); the Confederate units hold no bugle. The kit holds the default officer records and the bugle item but no cavalry company-officer count, no trumpeter per company and no Confederate cavalry instrument share.',
          why='No source in the kit or the plan gives officers or trumpeters per cavalry company; the plan calls the company-officer count not sourced (B.5) and the Confederate bugle is not in the cavalry gear table.',
          subst='None applied: no officer or trumpeter rank is added to the cavalry manifests without a source; the Union units show bugles at the kit\'s "few" share (plausible-procedural) as private soldiers. The fourteen units stay failing in Q20.3.',
          recon='Figures drawn as troopers; the absence of company officers and (for the Confederates) of the bugle is a visible gap. Candidate lead, not a kit source: OR27-1-R343 Nolan p. 949 names a Chief Bugler of a Reserve Brigade regiment, so trumpeters existed.',
          marking='Unit card section "Soldier types": officers and trumpeters listed as a gap with this id.', impact='Fourteen drawn cavalry units: no officer figure; seven Confederate units: no bugle.',
          owner_q='Authorise marked plausible-procedural company officers (printed company counts, officer ratio per company) and a trumpeter per company, or supply a source for the cavalry company organisation.',
          log=[KIT('app/src/history/figures.mjs header and kit/kit_specs.json defaults (default.union.cavalry flag_or_instrument; default.union.officers; default.confederate.officers)', 'negative', 'figures.mjs: rank private for every figure; kit: flag_or_instrument bugle "few" for the Union default only; no officers per cavalry company, no trumpeter count, no Confederate cavalry instrument'),
               KIT('BIBLE/plan-clean.txt B.5 (lines 17195-17196) and B.6.15.4 (Guidons: "inferred; gap")', 'negative', 'the company-officer count is "not sourced"; guidons "unsourced in the notes"'),
               S(1, 'trumpeters?|buglers?', (4, 0), 'found', 'OR27-1-R343 Lieut. Nicholas Nolan p. 949 names "Chief Bugler [Jacob K.] Schuck" among men commended (a trumpeter existed; no number per company)'),
               S(2, 'trumpeters?|buglers?', (2, 0), 'negative', 'no cavalry hit'), S(3, 'trumpeters?|buglers?', (0, 0), 'negative', 'no hit'),
               S(1, '(company|regimental|squadron) (officers|commanders)', (33, 4), 'negative', 'qualitative uses; no company officer count of a cavalry regiment'), S(2, '(company|regimental|squadron) (officers|commanders)', (31, 3), 'negative', 'no count'), S(3, '(company|regimental|squadron) (officers|commanders)', (8, 1), 'negative', 'no count'), PRINT_ROW]),
 11: dict(title='Regimental arms of 48 cavalry kit cards: no regimental weapon record', rids=['R04', 'R16'],
          desc='Forty-eight of the 62 cavalry kit cards (the Reserve Brigade, McIntosh, J. I. Gregg, Farnsworth\'s brigade, Hampton, F. Lee, Chambliss, Jenkins and the Confederate regiments of the orders of battle) carry no weapon field and inherit the army default (a plausible-procedural draw of carbine types). kit/weapons.json assigns arms to only fourteen cavalry units (Buford\'s regiments, the Michigan regiments, the 10th NY, the 34th Virginia).',
          why='Regimental arms of these units are in no text acquired: the plan says "Specifics of Confederate cavalry arms by regiment were not found" and OR Ser. I vol. 27 names arms for single regiments only in passing.',
          subst='None applied: the army default stays (marked plausible-procedural); no regimental weapon is entered without a source, so Q20.5 stays failing for the 48 cards.',
          recon='Each of the 48 regiments is drawn with the default carbine mix of its army, tier plausible-procedural, and the missing regimental record is a visible gap.',
          marking='Unit card section "Arms": "army default, regimental record not found" with this id.', impact='48 cavalry regiments: the carbine and sidearm mix is the army default.',
          owner_q='Authorise acquisition of the print sources that carry regimental carbine returns (Ordnance returns, regimental histories), or accept the marked army default.',
          log=[KIT('kit/cavalry_units.json cards and units (48 units with fields {} and weapon_assignment_ids [])', 'negative', 'no weapon field for 48 of 62 cards'),
               KIT('kit/weapons.json assignments (UA-*)', 'negative', 'cavalry assignments exist for 3IN, 8IL, 12IL, 6-8NY, 9NY, 17PA, 3WV, 10NY, 34VA, Michigan 5th/6th (assigned) and 1st/7th (gap) only'),
               KIT('kit/evidence/*.jsonl (arms rows)', 'negative', 'the kit evidence rows hold infantry corps only (us-1c, us-2c, us-3c); no cavalry unit row'),
               S(1, 'armed with .{0,40}(carbines?|sabres?|pistols?|revolvers?)', (1, 0), 'negative', 'OR27-1-R378 Lowell p. 1056: "Only one-third of the regiment was armed with carbines" (a regiment outside these 48 cards: not applied)'),
               S(2, 'armed with .{0,40}(carbines?|sabres?|pistols?|revolvers?)', (1, 0), 'negative', 'no cavalry hit'), S(3, 'armed with .{0,40}(carbines?|sabres?|pistols?|revolvers?)', (0, 0), 'negative', 'no hit'),
               S(1, '(carbines?|revolvers?|pistols?) .{0,80}(regiment|Cavalry)|(Cavalry|regiment) .{0,80}(armed with|carbines?)', (3, 0), 'negative', 'no cavalry hit'), PRINT_ROW]),
})


# a search log for an entry that already exists in the register (EG-FIG-0007: horse colours, markings, size, harness; its register file is not touched here)
EXTRA_LOGS = {
 'EG-FIG-0007': [S(1, '(bay|sorrel|gr[ae]y|white|black|roan|chestnut|dun|iron-gr[ae]y|piebald) (horse|mare|stallion|charger|steed)', (3, 0), 'negative', '"Black Horse Tavern" (a place name, R158 p. 531, R160 p. 543); no regimental horse colour'),
                 S(2, '(bay|sorrel|gr[ae]y|white|black|roan|chestnut|dun|iron-gr[ae]y|piebald) (horse|mare|stallion|charger|steed)', (3, 0), 'negative', 'Black Horse Tavern again (R442 p. 389, R464 p. 430); R481 Johnson p. 502 "a fine white horse" of the person supposed to be Milroy: one officer\'s mount, not a regiment'),
                 S(3, '(bay|sorrel|gr[ae]y|white|black|roan|chestnut|dun|iron-gr[ae]y|piebald) (horse|mare|stallion|charger|steed)', (0, 0), 'negative', 'no hit'),
                 S(1, '(horses|mounts).{0,60}(hands high|pounds|weight|condition|broken down|worn out|jaded|fagged)', (9, 3), 'negative', 'condition only in words (Buford R337 p. 923 "fagged out"; Custer R361 p. 1003 "completely worn out"; Fuller R375 p. 1036); no size, colour or measured condition per regiment'),
                 S(2, '(horses|mounts).{0,60}(hands high|pounds|weight|condition|broken down|worn out|jaded|fagged)', (22, 2), 'negative', 'condition in words (Stuart R565 p. 698 "horses, already jaded"; McIntosh R563 p. 675); no size or colour'),
                 S(3, '(horses|mounts).{0,60}(hands high|pounds|weight|condition|broken down|worn out|jaded|fagged)', (10, 3), 'negative', 'D0090 p. 48: the Confederate horses "grass-fed, were broken down" (words, no measure); no colour or size'),
                 KIT('kit/cavalry_units.json horses table and horse_animation_rule', 'negative', 'no horse measurement, coat colour or marking in the kit data (register entry text)'), PRINT_ROW],
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
        if 'title' in e:
            title, f = e['title'], {'Description': e['desc'], 'Autonomous substitute applied': e['subst'], 'Product marking': e['marking']}
        else:
            title, f = ws10(n)
        tier = 'plausible-procedural'      # an 'open gap' tier of the shard maps to the weakest register tier, never promoted
        finds = [r for r in e['log'] if r['result'] == 'found']
        searched = ('Run on %s on the acquired OR Ser. I vol. 27 text, parts 1-3 (library OR-27-1..3, tools/bt/or27_find.py) and on the kit and plan files: %d searches, %d with a relevant find (register/search_logs/%s.json holds each pattern, hit counts and result). '
                    'Earlier: kit/cavalry_units.json (horses, strengths, behaviour_states), history/positions ledgers A, D, E, kit/artillery_batteries.json losses. Print sources (Busey and Martin, Coddington, Pfanz) are print-only and could not be searched.') % (DATE, len(e['log']) - 1, len(finds), eid)
        d = dict(id=eid, title=title, rids=e.get('rids', ['R01', 'R03']), cat='evidence missing', desc=f['Description'], why=e['why'], searched=searched, subst=f['Autonomous substitute applied'], recon=e['recon'], tier=tier,
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
    for eid, rows in EXTRA_LOGS.items():
        json.dump(rows, open(os.path.join(SL, eid + '.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    json.dump(idx, open(ip, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    print('registered', len(ENT), 'cavalry gaps; index', len(idx))


if __name__ == '__main__':
    sys.exit(main())
