import sys
sys.path.insert(0, '/home/user/cautious-chainsaw/tmp/fence-3/scripts')
from rowlib import Row
from cite import OR, SV, LIB, WEB, NPSW

SS_BASE = 'https://gettysburg.stonesentinels.com/battlefield-farms/'
HN_SPANGLER = 'HistoryNet, Spangler (key HN-Spangler; the plan prints the key and title only)'


def S063():
    R = Row('S-063')
    b1 = R.cite(LIB('NPS-BRIEN-FARM', 'On July 1, 1863, Abraham Brien owned a small farm on the southern outskirts of Gettysburg.', title='M. Sherfy, The Brien Farm and Family (NPS, Gettysburg NMP, June 1972)', note='PDF page 5 of the file as served (printed page 3). The text layer is typescript OCR with spacing errors.'))
    b2 = R.cite(LIB('NPS-BRIEN-FARM', 'Within the next three days, Union soldiers removed his fences for firewood and fortifications', title='M. Sherfy, The Brien Farm and Family (NPS, 1972)'))
    b3 = R.cite(LIB('NPS-BRIEN-FARM', 'the number of panels of post fence destroyed', title='M. Sherfy, The Brien Farm and Family (NPS, 1972)', note='Sentence: Brien and those who vouched for his information "did itemize the number of stones needed to replace stone walls, the number of panels of post fence destroyed, and a specific amount of hay and crop damage done"; the values given appear confused on several claim forms.'))
    b4 = R.cite(LIB('NPS-BRIEN-FARM', '195 panels of fence', title='M. Sherfy, The Brien Farm and Family (NPS, 1972)', note='Full line in the text: "(195 panels of fence- part post and rail and part worm - worth $ 175; stone fence destroyed worth $5.00)"; the dashes are OCR-damaged so the line is quoted in three pieces.'))
    b5 = R.cite(LIB('NPS-BRIEN-FARM', 'and part worm', title='M. Sherfy, The Brien Farm and Family (NPS, 1972)'))
    b6 = R.cite(LIB('NPS-BRIEN-FARM', 'stone fence destroyed worth $5.00', title='M. Sherfy, The Brien Farm and Family (NPS, 1972)'))
    b7 = R.cite(LIB('NPS-BRIEN-FARM', "Brien's damage claims indicate a preponderance of wooden fencing on his property", title='M. Sherfy, The Brien Farm and Family (NPS, 1972)'))
    b8 = R.cite(LIB('NPS-BRIEN-FARM', 'Differences between the Warren and Cope maps include a Virginia worm fence along the Eramitsburg Road on the Warren map and a post and rail in the same place on the Cope map', title='M. Sherfy, The Brien Farm and Family (NPS, 1972)', note='OCR reads "Eramitsburg" for Emmitsburg.'))
    b9 = R.cite(LIB('NPS-BRIEN-FARM', 'No positive method exists to correctly resolve these', title='M. Sherfy, The Brien Farm and Family (NPS, 1972)', note='Sentence continues "differences" (a soft hyphen splits the word in the saved text).'))
    b10 = R.cite(LIB('NPS-BRIEN-FARM', 'A blow-up of this portion of the photograph indicates a stone and rider fence.', title='M. Sherfy, The Brien Farm and Family (NPS, 1972)', note='The Brady photograph "does indicate the presence of a fence or defense works to the north and west of the Brien House, along the edge of what is now Hancock Avenue".'))
    b11 = R.cite(LIB('NPS-BRIEN-FARM', 'clearly describes the defense works built quickly at the edge of the tree line', title='M. Sherfy, The Brien Farm and Family (NPS, 1972), citing Dr. Tilberg\'s report on Field Defenses on the Battlefield', note='The year of the Tilberg report is garbled in the OCR ("I9I43"); the same study dates another Tilberg report (on the Bryan house) 20 Nov 1943, so 1943 is probable and is not relied on.'))
    b12 = R.cite(LIB('NPS-BRIEN-FARM', 'out of $1,028', title='M. Sherfy, The Brien Farm and Family (NPS, 1972)', note='Sentence: "He appears to have received only $15, out of $1,028 requested." (OCR "$15>," and "g requested").'))
    R.sub('fences_present_before_and_layout_in_conflict', 'Fences stood on the Brien land (identified on Warren\'s 1868-69 map and Cope\'s 1896 map, not on Brien\'s claim map) with a preponderance of wooden fencing; the two maps disagree on the material along the Emmitsburg Road (Warren: Virginia worm; Cope: post and rail), north of the buildings (post and rail against a stone fence) and south of the house (worm against stone wall); "no positive method exists to correctly resolve these differences".', 'documented', [b7, b8, b9],
          why='Park historian\'s 1972 study from maps and the claim; the underlying claim files and maps were not seen here. The conflict is carried as two selectable fence layouts.')
    R.sub('removed_by_union_soldiers_1_to_3_jul', 'Union soldiers removed Brien\'s fences "for firewood and fortifications" within the three days of the battle.', 'documented', [b2, b1],
          why='The study gives the three-day window, not a day: the printed "Jul 3" is a narrowing.')
    R.sub('claim_195_panels', 'Brien\'s claim itemised 195 panels of fence (part post-and-rail and part worm, worth $175) and a stone fence destroyed (worth $5.00), among other items; claimed $1,028 and received $15.', 'documented', [b3, b4, b5, b6, b12],
          why='Claimant\'s figures (a damage claim of the 1870s), flagged by Sherfy as confused on some forms; they are not an inventory of the fences before the battle.')
    R.sub('defence_works_at_the_tree_line', 'Defence works were built quickly at the edge of the tree line on the Brien land; the Brady photograph shows a stone and rider fence or defence work north and west of the house, which Sherfy explains by those works (Tilberg\'s report on Field Defenses on the Battlefield).', 'documented', [b10, b11],
          why='Sherfy\'s reading of a blow-up of the photograph (not viewed here) and of Tilberg\'s report on Field Defenses (not read; year garbled in the OCR).')
    R.sub('nearly_destroyed_and_jul_3', 'The fences were "nearly destroyed" and on 3 Jul.', 'open_gap', [], support='none',
          why='No proportion and no day: the claim lists 195 panels without the number that stood; "nearly" is the plan\'s word (SS-Brian).')
    R.lookup('OR27 pts 1-3: Brian/Bryan/Brien barn or house', 'OR27', 'no hit for the Brien farm (only O\'Brien and Bryan, Fifth Texas)', 'failed')
    R.lookup('NPS-BRIEN-FARM (the 1972 report, local text) re-read page by page for fences', 'NPS text', 'quotes above; page numbers are those of the file as served (PDF pages 5, 7, 10, 15, 25)', 'done')
    R.lookup('National Archives catalogue (catalog.archives.gov): Abraham Brien claim files named in the footnotes of the 1972 study', 'web (reachable host), one request', 'HTTP 200 but the answer is the JavaScript page shell, not records; no key used; claim files not listed', 'failed')
    R.unsupported('"Nearly destroyed" and "Jul 3"; the number of panels that stood before the battle.')
    return R.finish('corrected', 'blocked_host',
        'Brien fences: fences stood on the Brien land before the battle with a preponderance of wooden fencing (post-and-rail and worm), the 1868-69 and 1896 maps disagreeing on the material; Union soldiers removed them for firewood and fortifications within 1-3 Jul; the claimant listed 195 panels and a stone fence destroyed and received $15 of $1,028 (Sherfy 1972). "Nearly destroyed" and "Jul 3" are not supported (the window is the three days).',
        register=['fence-3-EG-09'],
        blocked_host=[{'url': SS_BASE, 'what_to_read': 'The Brian (Bryan/Brien) farm entry (key SS-Brian): "fences nearly destroyed; house ransacked; Hays\'s HQ". A lead source. The primary basis is the claim of Abraham Brien, which Sherfy summarises.'},
                      {'url': 'National Archives, Abraham Brien claim files (cited in Sherfy 1972)', 'what_to_read': 'The files Sherfy cites as "Abraham Brien, Claim ..., National Archives" (claim numbers garbled in the OCR): sworn testimony before A. C. Cover (November 1868) and a list prepared for Quartermaster Stores (September, a year of the 1870s with the last digit garbled): fences by type and number, the stone fence, and the map attached to the affidavits. Not read: an owner-only visit or request; the catalogue host catalog.archives.gov answered 200 on 2026-11-13 but its search is a JavaScript application and an anonymous request returned only the page shell, so no record could be listed (no key was used).'}],
        product=['FEN-brian: two selectable layouts (Warren 1868-69 worm fence on the Emmitsburg Road and north of the buildings; Cope 1896 post and rail and stone fence), no default; state: removed by Union soldiers 1-3 Jul for firewood and works (documented), not "nearly destroyed on Jul 3". Defence works at the tree line (Tilberg\'s report on Field Defenses, via Sherfy) are a documented feature to draw as works built on screen, window open (the source gives no day), not as pre-placed earthwork.'],
        changes=['The shard\'s quotations are re-matched in the local NPS text (pdf pages and offsets in the citations); the page numbers given in 2026-11-04 were the printed numbers of the scan and are now the file\'s PDF pages.', '"Jul 3" is replaced by 1-3 Jul.'])


def S064():
    R = Row('S-064')
    n1 = R.cite(NPSW('leister_place', 'The Federal army used the house and barn as an aid station and assembly point for evacuating wounded to field hospitals after Pickett’s Charge.'))
    h1 = R.cite(LIB('NPS-HSR-LEISTER-BARN', 'was used as a signal station and temporary hospital during the Battle of Gettysburg', title='NPS Historic Structure Report: Leister Barn (physical fabric section)', note='Sentence: "The building [the barn] was used as a signal station and temporary hospital during the Battle of Gettysburg and the adjacent Leister House was used as Meade\'s Headquarters for part of the Battle." ("Hie" for "The" in the OCR.)'))
    h2 = R.cite(LIB('NPS-HSR-LEISTER-BARN', 'Doubtless, the buildings were also used as a tenporary field hospital during the battle.', title='NPS Historic Structure Report: Leister Barn (historic overview)', note='OCR "tenporary" for "temporary".'))
    hb = R.cite(LIB('NPS-HB9-1954', "The Leister house and barn were badly damaged by the artillery fire which preceded Pickett's Charge.", title='NPS Historical Handbook 9 (1954), stop 9'))
    R.sub('fired_on_first', 'The house and barn were fired on by the artillery that preceded Pickett\'s Charge.', 'documented', [hb, n1], why='Handbook 9 and NPS web page.')
    R.sub('aid_station_after_the_charge', 'The Federal army used the house and barn as an aid station and assembly point for evacuating wounded to field hospitals after Pickett\'s Charge.', 'documented', [n1],
          why='Institutional secondary (NPS). The row prints "after the firing ceased, Jul 3": the NPS wording is "after Pickett\'s Charge", the same afternoon.')
    R.sub('barn_as_signal_station_and_temporary_hospital', 'The Leister barn was used as a signal station and temporary hospital during the battle (the HSR\'s own historic overview adds that the buildings were "doubtless" used as a temporary field hospital).', 'documented', [h1, h2], support='partial',
          why='The 1985 HSR states it in its significance paragraph and hedges ("doubtless") in the history; no primary witness is quoted.')
    R.lookup('all local texts: Leister with aid station, hospital, wounded, assembly', 'NPS texts and pages, state volumes, OR27', 'NPS pages, HSR, Handbook 9; no OR or state-volume text', 'done')
    R.unsupported('The number of wounded treated, the surgeons and the dates of use (no local text); the PDF source ECW-Hosp (Emerging Civil War, host not in the reachable list).')
    return R.finish('confirmed', 'closed',
        'Leister house and barn: shelled by the artillery that preceded Pickett\'s Charge and used afterwards the same afternoon as an aid station and assembly point for evacuating wounded; the barn also served as a signal station and temporary hospital (NPS).',
        register=[],
        product=['State schedule S-064: keep "fired on -> aid station / hospital" on 3 Jul after the cannonade (documented); no hour and no count of wounded.'],
        changes=['The shard row was a negative check; NPS pages, the HSR and Handbook 9 now support the state change.'])


def S065():
    R = Row('S-065')
    g = R.cite(LIB('NPS-GMP-1999-V1', 'the Granite Schoolhouse and the Forney, Heagy, Rogers, Staub, Guinn, and Fisher Farms', title='NPS Final General Management Plan / EIS vol. 1 (1999)', note='Sentence: "a number of farms with no surface remains at all. These include ... the Granite Schoolhouse and the Forney, Heagy, Rogers, Staub, Guinn, and Fisher Farms."'))
    R.sub('building_gone_end_state', 'The Granite Schoolhouse is gone (printed "Gone"; "Razed 1921").', 'documented', [g], support='partial',
          why='NPS 1999 lists the schoolhouse among buildings with no surface remains; the year 1921 and the demolition are not in any local text.')
    R.sub('hospital_second_corps_first_division_2_3_jul', 'The Granite Schoolhouse served as a Second Corps, First Division hospital on 2-3 Jul and was evacuated toward McAllister\'s Mill after the 3 Jul overshots.', 'open_gap', [], support='none',
          why='Searched school-house with hospital/wounded/surgeon/Second Corps in OR27 pts 1-3, Letterman, Hospital Scenes, Jacobs, the state volumes and the NPS texts: no passage names this schoolhouse as a hospital.')
    R.sub('built_1862_and_trigger_overshots', 'Built 1862; evacuated because of the overshot shells of 3 Jul.', 'open_gap', [], support='none', why='No local source.')
    R.lookup('all local texts: Granite School with hospital, shell, Second Corps, McAllister', 'OR27, ws9, state volumes, NPS texts', 'road name and the GMP list only', 'failed')
    R.unsupported('The hospital use, the unit, the evacuation toward McAllister\'s Mill and the dates 1862 and 1921 (PDF source HN-Spangler).')
    return R.finish('unsupported', 'blocked_host',
        'No local text says the Granite Schoolhouse was a hospital or was evacuated on 3 Jul; the only local statement is that the building no longer stands (NPS GMP 1999).',
        register=['fence-3-EG-10'],
        blocked_host=[{'url': HN_SPANGLER, 'what_to_read': 'The HistoryNet Spangler farm article: that the Granite Schoolhouse was a II Corps 1st Division hospital on 2-3 Jul and was evacuated toward McAllister\'s Mill after the overshots of 3 Jul. The host (www.historynet.com) answered 403 on CONNECT when probed by the fence-2 close-out on 2026-11-13; no URL is printed in the plan. A lead source under the Law.'}],
        product=['State schedule S-065 / H-07: keep the hospital state as an open-gap marked state (inferred, no source); the end state "gone" is documented only as "no surface remains".'])


def S066():
    R = Row('S-066')
    br = R.cite(LIB('NPS-COMMON-PRIDE-2', 'Dr. D. G. Brinton, in charge of the 2nd Division, 11th Corps Union hospital at the George Spangler', title='NPS, K. R. Georg, "A Common Pride and Fame" part II (1981), p.402 of the book', note='Text continues "farm, was the attending physician to the Virginia general."'))
    br2 = R.cite(LIB('NPS-COMMON-PRIDE-2', "On the afternoon of the 3rd of July about 4 o'clock the General was brought to my hospital and myself and Dr. Henry, late of Rochester, N.Y., examined and dressed his wounds.", title='Dr. D. G. Brinton, letter to J. B. Bachelder of 22 Mar 1869, as quoted in K. R. Georg, "A Common Pride and Fame" part II (NPS, 1981)', note='Participant letter of 1869, second-hand through the NPS study.'))
    ho = R.cite(LIB('NPS-COMMON-PRIDE-2', 'During that afternoon General Armistead and myself, and quite a number of officers were removed.to the temporary hospital over beyond Cemetery Heights.', title='Capt. T. C. Holland, "With Armistead at Gettysburg", Confederate Veteran 29 (Feb 1921) p.62, as quoted in K. R. Georg, "A Common Pride and Fame" part II (NPS, 1981)', note='The quotation is printed with the typed-out stop "removed.to".'))
    ho2 = R.cite(LIB('NPS-COMMON-PRIDE-2', 'I shall never forget his request after we were moved to a temporary hospital beneath the shade of some trees.', title='Capt. T. C. Holland, Confederate Veteran 29 (Feb 1921), as quoted in K. R. Georg, "A Common Pride and Fame" part II (NPS, 1981)'))
    R.sub('xi_corps_hospital_at_the_george_spangler_farm', 'The Eleventh Corps (2nd Division) hospital under Dr. D. G. Brinton stood at the George Spangler farm, to which the wounded Armistead was brought.', 'documented', [br, br2],
          why='NPS study quoting Brinton\'s 1869 letter; the row\'s from-state "Hospital" is supported.')
    R.sub('armistead_arrival_about_16_00', 'General Armistead was brought to the Spangler hospital on the afternoon of 3 Jul at about 4 o\'clock (Brinton), after being wounded at the stone wall and removed with other officers "during that afternoon" (Holland).', 'documented', [br2, ho],
          why='Contradicts the printed "arrives about 20:00 Jul 3": both witnesses say the afternoon; Brinton gives about 16:00.')
    R.sub('carried_to_the_summer_kitchen', 'Armistead was carried to the summer kitchen.', 'open_gap', [], support='none',
          why='Holland names "a temporary hospital beneath the shade of some trees" (cot on the ground); no local text mentions a summer kitchen or any building.')
    R.sub('trigger_ambulance', 'The trigger was an ambulance.', 'documented', [ho, br], support='partial', why='Holland: "the ambulance party" carried him; NPS wording is the study\'s.')
    R.lookup('all local texts: Armistead with Spangler, summer kitchen, ambulance, hospital', 'NPS texts, Bachelder, SHSP, state volumes', 'NPS Common Pride part II pp.183-185 (Brinton, Holland); no summer-kitchen text', 'done')
    R.unsupported('"About 20:00" and "summer kitchen" (no local text); the PDF source HN-Spangler.')
    return R.finish('corrected', 'blocked_host',
        'Armistead reached the Eleventh Corps (2nd Division) hospital at the George Spangler farm on the afternoon of 3 Jul, about 16:00 by the surgeon Brinton, not about 20:00; he lay in a temporary hospital under the shade of trees (Holland). The summer kitchen is not supported by any local text.',
        register=['fence-3-EG-10'],
        blocked_host=[{'url': HN_SPANGLER, 'what_to_read': 'The HistoryNet Spangler farm article: "Armistead carried to the summer kitchen about 20:00 Jul 3". Host refused (403) when probed by the fence-2 close-out; no URL in the plan; a lead source.'},
                      {'url': 'Ronald Kirkwood, Too Much for Human Endurance: The George Spangler Farm Hospitals (book; named by a search result, not opened)', 'what_to_read': 'Where Armistead lay at the Spangler hospital (summer kitchen or the trees) and the hour. Print source; not fetched.'}],
        product=['State schedule S-066: change "Armistead arrives about 20:00" to about 16:00 on 3 Jul (documented, two witnesses); mark the summer kitchen as an open-gap placement (inferred) and show a cot under trees as the documented alternative. bld-spangler-farm#summer_kitchen / H-06: no fence data.'],
        changes=['The row had no source (gap); Brinton and Holland (via NPS) correct the hour from 20:00 to about 16:00.'])


def S067():
    R = Row('S-067')
    g1 = R.cite(OR(2, 'the general commanding gave orders for our army to withdraw from Gettysburg and fall back to Hagerstown', rec='OR27-2-R427', note='Sentence: "At midnight, July 3 [OCR ".3"], after the fiercest and most sanguinary battle ever fought on this continent, the general commanding gave orders for our army to withdraw from Gettysburg and fall back to Hagerstown." Guild, Medical Director, Army of Northern Virginia, report of 20 Jul 1863.'))
    g2 = R.cite(OR(2, 'on the evening of the 4th, our ambulance trains', rec='OR27-2-R427', note='Sentence continues "took up their line of march by two routes, guarded as well as could be by our broken-down and inefficient cavalry" (OCR "to(jk").'))
    g3 = R.cite(OR(2, 'One train went by Cashtown, the other by Fairfield.', rec='OR27-2-R427'))
    le = R.cite(OR(2, 'Part of our train moved by the road through Fairfield, and the rest by way of Cashtown, guarded by General Imboden.', rec='OR27-2-R426', note='Lee, report of the campaign.'))
    le2 = R.cite(OR(2, 'A heavy rain continued throughout the night', rec='OR27-2-R426', note='Sentence: "The army retained its position until dark, when it was put in motion for the Potomac by the last-named route. A heavy rain continued throughout the night".'))
    R.sub('withdrawal_ordered_at_midnight', 'Lee gave the order to withdraw from Gettysburg at midnight of 3 Jul (Guild).', 'documented', [g1],
          why='Guild\'s wording "At midnight, July 3" is the turn of 3-4 Jul, as the row reads it. No other report gives an hour for the order.')
    R.sub('ambulance_trains_left_on_the_evening_of_4_jul', 'The Confederate ambulance trains took up the line of march on the evening of 4 Jul by two routes, one by Cashtown and one by Fairfield.', 'documented', [g2, g3, le],
          why='Guild and Lee agree on the two routes; Lee says the army itself moved off at dark on 4 Jul. Conflict C-033 (Imboden departs 4 Jul afternoon or 5 Jul) is carried by the r03 shard; Guild\'s "evening of the 4th" is a third wording.')
    R.sub('army_withdrew_at_dark_on_4_jul_in_heavy_rain', 'The army kept its position until dark on 4 Jul and then marched through a heavy rain that lasted all night.', 'documented', [le2],
          why='Supports the "Held" half of the from-state through 4 Jul and the weather at the move (see S-069).')
    R.lookup('OR27 pt.2: Guild R427 pp.326-327, Lee R426 pp.309, 322', 'OR27', 'quotes above', 'done')
    R.unsupported('The PDF key Wiki-Guild (Wikipedia, not admissible); the exact minute of the order (no text).')
    return R.finish('confirmed', 'closed',
        'Confederate position held until the army was ordered to withdraw at midnight of 3 Jul (Guild); the ambulance trains left on the evening of 4 Jul by Cashtown and Fairfield and the army moved off at dark in a heavy rain (Guild, Lee).',
        register=[],
        product=['State schedule S-067 / ENV-confederate-position: keep "held -> withdrawal ordered at midnight 3-4 Jul; ambulance trains leave the evening of 4 Jul" (documented). Note: the army\'s march starts at dark on 4 Jul (Lee); keep the C-033 scenarios for Imboden.'],
        changes=['The shard row was a negative check; the primary (Guild R427 p.326) gives the printed claim exactly.'])


def S068():
    R = Row('S-068')
    c1 = R.cite(LIB('NPS-CLI-ERR', 'Wooden post and rail fence along Emmitsburg Road, both sides of road, in front of Klingel Farm', title='NPS Cultural Landscapes Inventory: Emmitsburg Road Ridge Battlefield (2024), pdf p.63', note='Entry continues ": Portions dismantled for troop movement and breastwork construction; breastworks constructed on eastern side of road, north of Klingel, also used material from Klingel-Codori property boundary fence." The inventory draws on the 2000 draft CLR.'))
    c2 = R.cite(LIB('NPS-CLI-ERR', 'Although Union forces removed many of the north-south fences prior to the second day', title='NPS Cultural Landscapes Inventory: Emmitsburg Road Ridge Battlefield (2024), pdf p.43', note='Passage: "...enough were standing on July 2-3 to hinder orderly troop movement. In several instances, Confederate advances were slowed as the troops climbed over fencelines under fire."'))
    c3 = R.cite(LIB('NPS-CLI-ERR', 'thousands of fence rails and other fencing mater', title='NPS Cultural Landscapes Inventory: Emmitsburg Road Ridge Battlefield (2024), pdf p.43', note='Sentence: "Items listed on their claims included over 90 acres of field crops, thousands of fence rails and other fencing materials, and 50 chickens" (the claims of Catherine Trostle and Daniel Klingel, 1870s). Quotation stops mid-word at the end of the passage.'))
    c4 = R.cite(LIB('NPS-CLI-ERR', 'The Klingel farmhouse, located along Emmitsburg Road, was occupied by the Third Corps until overrun by Confederate troops.', title='NPS Cultural Landscapes Inventory: Emmitsburg Road Ridge Battlefield (2024), pdf p.42'))
    c5 = R.cite(NPSW('tribune_1121_p2', 'Wood: en fences are torn down and the stone ones strength. ened and nsed as hreastworks', note='New-York Daily Tribune, 21 Nov 1863, letter of a special correspondent dated Gettysburg, 17 Nov 1863, driving out the Emmitsburg road toward Round Top ("This was the road upon which our army entered the town"); OCR "Wood: en" for Wooden, "strength. ened" for strengthened, "nsed as hreastworks" for used as breastworks. The farm is not named.'))
    R.sub('fence_before_the_fight', 'A wooden post-and-rail fence stood on both sides of the Emmitsburg Road in front of the Klingel farm, with a boundary fence between the Klingel and Codori properties.', 'documented', [c1],
          why='NPS inventory (institutional secondary; primary basis the 2000 draft CLR). The primary soldier evidence for the road fences is under S-062.')
    R.sub('portions_dismantled_not_all', 'Portions of the road fence were dismantled for troop movement and breastworks (east side, north of the farm; material also from the Klingel-Codori boundary fence); many fences were removed before 2 Jul but enough stood on 2-3 Jul to hinder movement.', 'documented', [c1, c2],
          why='"Portions", not "all": the printed "All missing when Klingel returned Jul 4" is not what the inventory says.')
    R.sub('claim_for_thousands_of_rails', 'Daniel Klingel (with Catherine Trostle) claimed thousands of fence rails and other fencing among his losses (1870s).', 'documented', [c3], why='NPS summary of the claims; the claim file itself is in the State Archives.')
    R.sub('klingel_farm_occupied_by_third_corps_until_overrun', 'The Klingel farmhouse was occupied by the Third Corps until overrun by Confederate troops on 2 Jul.', 'documented', [c4], why='Frames the owner\'s absence: the house was in the fight.')
    R.sub('wooden_fences_torn_down_along_the_emmitsburg_road_by_17_nov', 'A New-York Tribune correspondent who drove the Emmitsburg road on 17 Nov 1863 wrote that along it wooden fences were torn down and the stone ones strengthened and used as breastworks.', 'documented', [c5], support='partial',
          why='A general description of the road four months after the battle: it does not name the Klingel farm, gives no day for the loss and does not say all wooden fences were gone; it supports a late state with torn-down wooden fences along this road, not the printed "all missing on 4 Jul".')
    R.sub('all_fences_missing_when_klingel_returned_4_jul', 'All fences were missing when Klingel returned on 4 Jul.', 'open_gap', [], support='none',
          why='No local text gives the day of his return or says all fences were gone; the claim of "thousands of rails" is a claim, not an inventory.')
    R.lookup('all local texts: Klingel|Klingle with fence, rail, returned, Jul 4', 'OR27, ws9, state volumes, NPS texts', 'NPS inventory pp.42-43, 63; OR27 has no Klingel', 'done')
    R.lookup('Library of Congress Chronicling America (www.loc.gov JSON API, tile.loc.gov): New-York Daily Tribune 21 Nov 1863 p.2: the fences of the Emmitsburg road in November', 'web (reachable hosts)', 'wooden fences torn down, stone ones used as breastworks (17 Nov); no Klingel text', 'done')
    R.unsupported('"All missing" and "Jul 4" (SS-Klingle; the plan itself lists Codori and Klingle pull-down specifics as an open gap in B.8.3).')
    return R.finish('partially_supported', 'blocked_host',
        'Klingel farm fences: a post-and-rail fence stood on both sides of the Emmitsburg Road in front of the farm and portions were dismantled for troop movement and breastworks (east side, north of the farm); enough fences stood on 2-3 Jul to hinder movement; Klingel later claimed thousands of rails (NPS). "All missing when Klingel returned Jul 4" is not supported.',
        register=['fence-3-EG-11'],
        blocked_host=[{'url': SS_BASE, 'what_to_read': 'The Klingel farm entry (key SS-Klingle): "all fences missing when he returned Jul 4"; the $880 claim denied in 1881. Lead source; refused host.'},
                      {'url': 'Pennsylvania State Archives, Adams County damage claims (Klingel, Daniel H.)', 'what_to_read': 'The itemised claim: rails and dates. Owner-only act (not reachable from here). Series: Board of Commissioners to Assess Damages in Border Counties, War Damage Claims Abstracts, Record Group 2, Pennsylvania State Archives (the series the NPS McClean study cites as "Claim #3248 (Adams County)"); whether a file of this claimant is in that series was not checked.'}],
        product=['FEN-klingle: replace "all missing 4 Jul" by "post-and-rail fence on both sides of the road, portions dismantled before and during 2 Jul (east-side breastwork north of the farm); remainder inferred"; keep the end state marked inferred. Same change as fence-2 S-021.'],
        changes=['The shard had no source (gap); the NPS inventory now gives the documented state and contradicts "all".'])


def S069():
    R = Row('S-069')
    l1 = R.cite(OR(2, 'A heavy rain continued throughout the night', rec='OR27-2-R426', note='Lee: after dark on 4 Jul.'))
    l2 = R.cite(OR(2, 'marching through drenching rain', rec='OR27-2-R539', note='Wright (Anderson\'s division): reached Fairfield "about midnight" of 4-5 Jul.'))
    ha = R.cite(LIB('HASKELL-1908', "that floods of rain on that day prevented army movements of any considerable magnitude", title='Frank A. Haskell, The Battle of Gettysburg (letter of July 1863; printed 1908)', note='Sentence: "on the morning of the 4th we again occupied the village of Gettysburg, ... that floods of rain on that day prevented army movements of any considerable magnitude".'))
    pa = R.cite(SV('PA2', 'wounded dragged from amidst the burning tents, and most pitiful to see drowning during the rain that ensued in the evening',
                 note='2nd Pennsylvania Cavalry regimental history (1914): hospitals "located near Rock Creek", wounded "placed on the banks of this stream"; the passage dates neither the shelling nor the rain (the text goes on to the night of the 3rd and the march to Westminster).'))
    R.sub('heavy_rain_on_4_jul', 'Heavy rain fell on 4 Jul: "floods of rain on that day" (Haskell) and from dark onward "a heavy rain continued throughout the night" (Lee); Wright marched through "drenching rain".', 'documented', [ha, l1, l2],
          why='Three witnesses. "Heavy from about 21:00" is not stated: Lee says rain through the night from dark. Conflict C-045 and the B.2.5 weather table are carried by other shards.')
    R.sub('low_ground_overflow_and_drowned_wounded', 'Plum Run and the low ground overflowed and some wounded drowned.', 'inferred', [pa], support='partial',
          why='One regimental history speaks of wounded drowning in the rain by a stream (Rock Creek, not Plum Run) and does not date it (3 or 4 Jul); no text names Plum Run overflowing.')
    R.lookup('all local texts and OR27: rain, storm, flood, drowned with 4 Jul, Plum Run, wounded', 'OR27, ws9, state volumes', 'Lee, Longstreet, Wright, Haskell, PA2 p.806', 'done')
    R.unsupported('Plum Run overflow, the number drowned, and "heavy from about 21:00" (no local text; PDF sources AMS and SP-Meteo, a meteorology page).')
    return R.finish('partially_supported', 'open',
        'Heavy rain fell on 4 Jul and through the night of 4-5 Jul (Haskell, Lee, Wright); a regimental history records wounded drowning in the rain by Rock Creek. Plum Run overflowing and the hour 21:00 are not supported.',
        register=['fence-3-EG-12'],
        product=['State schedule S-069 / ENV-plum-run: heavy rain on 4 Jul (documented) with onset at dark (Lee) rather than "21:00"; overflow of Plum Run is an inferred marked state; wounded drowned by Rock Creek (inferred, date open).'])


def S070():
    R = Row('S-070')
    ha = R.cite(LIB('HASKELL-1908', "that floods of rain on that day prevented army movements of any considerable magnitude", title='Frank A. Haskell, The Battle of Gettysburg (1908)'))
    l1 = R.cite(OR(2, 'A heavy rain continued throughout the night', rec='OR27-2-R426'))
    pa = R.cite(SV('PA2', 'wounded dragged from amidst the burning tents, and most pitiful to see drowning during the rain that ensued in the evening', note='2nd Pennsylvania Cavalry regimental history (1914).'))
    le = R.cite(OR(1, 'the tents and other appliances, which are as necessary, were not available until Julv 5', rec='OR27-1-R016', note='Letterman, Medical Director: dressings and chloroform were supplied but "the tents and other appliances, which are as necessary, were not available until July 5"; OCR "Julv".'))
    R.sub('rain_on_4_jul', 'It rained heavily on 4 Jul.', 'documented', [ha, l1], why='See S-069.')
    R.sub('wounded_without_tents_until_5_jul', 'Tents and other appliances for the wounded were not available at the hospitals until 5 Jul.', 'documented', [le],
          why='Letterman (OR27-1 R016 p.196): the shortage of tents is the documented reason the wounded lay exposed; this makes "exposed to cold rain on 4 Jul" an inference from two documented facts.')
    R.sub('exposed_wounded_in_rain', 'Wounded men lay exposed to cold rain at the hospital sites on 4 Jul.', 'inferred', [ha, le, pa], support='partial',
          why='No local text states it for 4 Jul in these words; "cold" is not documented (Hospital Scenes, a visitor of 1863-64, writes of a chilly storm in Philadelphia, not here).')
    R.lookup('all local texts: wounded exposed to rain at hospitals on 4 Jul', 'OR27, ws9, state volumes', 'Letterman p.196 (tents), Haskell, Lee, PA2', 'done')
    R.unsupported('"Cold" and the sites affected (PDF source HN-Spangler).')
    return R.finish('partially_supported', 'blocked_host',
        'On 4 Jul it rained heavily (Haskell, Lee) while the army\'s tents and hospital appliances had not reached the field until 5 Jul (Letterman), so the wounded were unsheltered in the rain; the temperature ("cold") is not documented.',
        register=['fence-3-EG-12'],
        blocked_host=[{'url': HN_SPANGLER, 'what_to_read': 'The HistoryNet Spangler farm article: "cold, constant rain July 4, men exposed against the barn and in the orchard". Host refused (403) at the fence-2 probe; lead source.'}],
        product=['State schedule S-070 / GROUP-hospital-sites: rain on 4 Jul (documented); no tents until 5 Jul (documented, Letterman), so exposed wounded are an inferred state at the sites without cover; no temperature claim.'])


def S071():
    R = Row('S-071')
    ad = R.cite(LIB('NPS-GMP-1999-V1', 'Two of these, the Hummelbaugh and Cobean Houses, were present during the battle.', title='NPS Final General Management Plan / EIS vol. 1 (1999)', note='Sentence: "NPS would continue to use at least six historic structures for park offices: the Roller Building, the Cemetery Lodge, and the Hummelbaugh, Hoffman-Cassatt, Cobean and Wright Houses. ... Two of these, the Hummelbaugh and Cobean Houses, were present during the battle."'))
    R.sub('house_present_in_1863', 'The Hummelbaugh house stood during the battle (and survives).', 'documented', [ad], why='NPS 1999.')
    R.sub('hospital_second_corps_2_3_jul_barksdale', 'The Hummelbaugh farm was a Second Corps hospital on 2-3 Jul where Barksdale died.', 'open_gap', [], support='none',
          why='OR27 has no Hummelbaugh; a New York volume has Barksdale dying "on this field" (no farm named).')
    R.sub('pleasonton_headquarters_4_6_jul', 'Pleasonton\'s headquarters stood at the farm on 4-6 Jul.', 'open_gap', [], support='none',
          why='Pleasonton\'s report (OR27-1 R336) and the OR give no headquarters site for those days; the plan itself notes that Pleasonton Avenue "did not exist in 1863".')
    R.lookup('OR27, ws9, state volumes, NPS texts: Hummelbaugh with hospital, Pleasonton, headquarters, Barksdale', 'all', 'only the NPS 1999 plan and later park documents', 'failed')
    R.unsupported('Hospital use, Barksdale\'s death place and hour, Pleasonton\'s headquarters (PDF source SS-Hummelbaugh).')
    return R.finish('unsupported', 'blocked_host',
        'No local text says the Hummelbaugh farm was a hospital or Pleasonton\'s headquarters; the house is documented only as standing in 1863 (NPS 1999).',
        register=['fence-3-EG-10'],
        blocked_host=[{'url': SS_BASE, 'what_to_read': 'The Hummelbaugh farm entry (keys SS-Hummelbaugh and SS-157; the plan prints the farm-page base): II Corps hospital 2-3 Jul, Barksdale\'s death (2 or 3 Jul), Pleasonton headquarters 4-6 Jul. Lead source; host refused (403) at the fence-2 probe.'}],
        product=['State schedule S-071 / bld-hummelbaugh-farm: keep hospital and headquarters states as open-gap markers; no fence data.'])


def S072():
    R = Row('S-072')
    h1 = R.cite(LIB('NPS-COMMON-PRIDE-2', 'Armistead died at about t 9:00 A. M. on July 5, 1863, after intense suffering.', title='NPS, K. R. Georg, "A Common Pride and Fame" part II (1981), p.402 of the book', note='The NPS historian\'s summary of Captain T. C. Holland ("With Armistead at Gettysburg", Confederate Veteran 29, Feb 1921); OCR "at about t 9:00".'))
    h2 = R.cite(LIB('NPS-COMMON-PRIDE-2', 'I shall never forget his request after we were moved to a temporary hospital beneath the shade of some trees.', title='Capt. T. C. Holland, Confederate Veteran 29 (1921), as quoted by K. R. Georg (NPS, 1981)'))
    cr = R.cite(LIB('NPS-COMMON-PRIDE-2', 'On my way to town I called by the Eleventh Corps Hospital, to which General Armistead had been taken, to see him.', title='J. F. Crocker (9th Virginia), Gettysburg - Pickett\'s Charge and Other War Addresses (1915) p.54, as quoted by K. R. Georg (NPS, 1981)', note='Crocker: "I found that he had died. They showed me his freshly made grave."'))
    br = R.cite(LIB('NPS-COMMON-PRIDE-2', 'Dr. D. G. Brinton, in charge of the 2nd Division, 11th Corps Union hospital at the George Spangler', title='NPS, K. R. Georg, "A Common Pride and Fame" part II (1981)'))
    bra = R.cite(LIB('NPS-COMMON-PRIDE-2', 'They were two in number, neither of them of a serious character, apparently.', title='NPS, K. R. Georg, "A Common Pride and Fame" part II (1981), quoting Dr. D. G. Brinton (letter to J. B. Bachelder, 22 Mar 1869)', note='Brinton on the two rifle-ball wounds of Armistead; the passage continues: "Both were by rifle ball, and no bone, leading artery, or nerve was injured by either."'))
    brb = R.cite(LIB('NPS-COMMON-PRIDE-2', 'It resulted riot from his wounds directly, but from secondary fever and prostration.', title='NPS, K. R. Georg, "A Common Pride and Fame" part II (1981), quoting Dr. D. G. Brinton (letter to J. B. Bachelder, 22 Mar 1869)', note='OCR "riot" for "not".'))
    R.sub('died_on_5_jul', 'Armistead died on 5 Jul at about 09:00 (Holland, via the NPS historian); his grave was freshly made at the Eleventh Corps hospital when Crocker called (the hospital of the Spangler farm).', 'documented', [h1, cr, br],
          why='Printed "Jul 5": supported with an hour (Holland\'s recollection of 1921, second-hand).')
    R.sub('cause_secondary_fever_not_the_wounds', 'Brinton, the attending surgeon, wrote in 1869 that the two wounds were "neither of them of a serious character, apparently" and that the death "resulted [not] from his wounds directly, but from secondary fever and prostration".', 'documented', [bra, brb], support='partial',
          why='Context only (one surgeon\'s letter of 1869, quoted by the NPS historian); the row\'s trigger "Wounds" is therefore contestable. The Brinton quotation about the hour of arrival is under S-066.')
    R.sub('in_the_summer_kitchen', 'He died in the summer kitchen.', 'open_gap', [], support='none', why='Holland: a cot on the ground in "a temporary hospital beneath the shade of some trees"; no local text names a building.')
    R.lookup('all local texts: Armistead death, 5 Jul, Spangler', 'NPS texts, SHSP, Bachelder', 'NPS Common Pride part II p.184-185', 'done')
    R.unsupported('"Summer kitchen" (PDF source HN-Spangler).')
    return R.finish('corrected', 'blocked_host',
        'Armistead died at the Eleventh Corps hospital at the George Spangler farm on 5 Jul, at about 09:00 by Holland\'s recollection, lying in a temporary hospital under trees; the attending surgeon Brinton wrote in 1869 that the wounds were apparently not serious and that the death resulted not from the wounds directly but from secondary fever and prostration. The summer kitchen is not supported.',
        register=['fence-3-EG-10'],
        blocked_host=[{'url': HN_SPANGLER, 'what_to_read': 'The HistoryNet Spangler farm article: "Armistead dies in the summer kitchen on Jul 5". Host refused (403) at the fence-2 probe; lead source.'}],
        product=['State schedule S-072 / PERSON-armistead: death on 5 Jul about 09:00 (documented); place: the Spangler farm hospital, building not documented (the summer kitchen is an open-gap placement).'])


def S073():
    R = Row('S-073')
    t1 = R.cite(LIB('NPS-CLI-ERR', 'served as a headquarters for Union General Daniel Sickles and the farmhouse was used briefly as a hospital', title='NPS Cultural Landscapes Inventory: Emmitsburg Road Ridge Battlefield (2024), pdf p.42', note='Sentence: "The area around the Trostle barn, located along Trostle Farm Lane, served as a headquarters for Union General Daniel Sickles and the farmhouse was used briefly as a hospital. (CLR 2002: 2)".'))
    t2 = R.cite(NPSW('trostle', 'The Trostle farm was the site of desperate fighting on the afternoon of July 2, 1863 as the men of the 9th Massachusetts (Bigelow’s) Battery made a courageous stand against overwhelming Confederate forces.'))
    t3 = R.cite(NPSW('trostle', 'The only sign remaining from the battle is a large hole in the brick gable of the barn left by a cannonball.'))
    t4 = R.cite(NPSW('trostle', 'By comparing the two photos, one can see just how many dead horses littered the property where Bigelow’s 9th Massachusetts Battery was overrun by the 21st Mississippi Infantry.'))
    R.sub('hospital_use_brief', 'The Trostle farmhouse was used briefly as a hospital (the barn area as Sickles\'s headquarters).', 'documented', [t1], why='NPS inventory (2024) citing the 2002 CLR.')
    R.sub('barn_damage_and_dead_horses', 'The Trostle barn shows a cannonball hole in the brick gable; many dead horses of Bigelow\'s battery lay on the property (photographed by O\'Sullivan).', 'documented', [t3, t4, t2], why='NPS Then and Now page; the PDF row S-073 does not carry these, the B.8.2 table does.')
    R.sub('abandoned_by_6_jul', 'The Trostle hospital was abandoned by 6 Jul (printed "Operating -> Abandoned, by Jul 6").', 'open_gap', [], support='none',
          why='"Briefly" supports a short use; no local text dates the end of the use or says "abandoned". OR27 has no Trostle text.')
    R.lookup('all local texts: Trostle with hospital, wounded, abandoned, Sickles, dead horses', 'OR27, ws9, NPS texts and pages', 'NPS CLI-ERR p.42, NPS Then and Now', 'done')
    R.unsupported('The abandonment date, the surgeons and the counts (PDF sources ECW-Hosp, SS-Trostle).')
    return R.finish('partially_supported', 'blocked_host',
        'The Trostle farmhouse was used briefly as a hospital and the barn area as Sickles\'s headquarters (NPS); the barn bears a cannonball hole and dead horses of Bigelow\'s battery littered the yard. "Abandoned by Jul 6" has no local source.',
        register=['fence-3-EG-10'],
        blocked_host=[{'url': SS_BASE, 'what_to_read': 'The Trostle farm entry (key SS-Trostle; the plan also cites ECW-Hosp, Emerging Civil War, "field hospital sites"): III and V Corps wounded, when the hospital closed, 16+ dead horses in the yard, $2,500 claim. Lead sources; hosts refused (403) at the fence-2 probe.'}],
        product=['State schedule S-073 / H-13: hospital use documented as "brief"; the closing date stays an open-gap marker; P-06 (wall near the Trostle house) is unchanged.'])


def S074():
    R = Row('S-074')
    t1 = R.cite(LIB('TPIERCE-1889', 'Sometime during- the forenoon of Tuesday, the 7th. in company with Mrs. Schriver and her two children, I started off on foot to reach my home.', title='Tillie Pierce Alleman, At Gettysburg, or What a Girl Saw and Heard of the Battle (1889), chapter VI', note='Printed page 82-83 (running heads "82 After the Battle" and "After the Battle. 83" bracket the passage); the text file has no page markers.'))
    t2 = R.cite(LIB('TPIERCE-1889', 'Large bundles had been prepared, and were lying around in different parts of the room I had entered.', title='Tillie Pierce Alleman, At Gettysburg (1889), chapter VI, printed page 83', note='Followed by "They had expected to be compelled to leave the town suddenly." and, on p.84, "They had not been thinking just then of my return"; her mother was at home and did not recognise her.'))
    t2b = R.cite(LIB('TPIERCE-1889', 'They had expected to be compelled to leave the town suddenly.', title='Tillie Pierce Alleman, At Gettysburg (1889), chapter VI, printed page 83'))
    t3 = R.cite(LIB('TPIERCE-1889', 'Fences had disappeared, some buildings wTre gone, others ruined.', title='Tillie Pierce Alleman, At Gettysburg (1889), chapter VI, printed page 82', note='OCR "wTre" for "were". Her walk on 7 Jul was over the fields south of town, past the Round Tops and through Evergreen Cemetery.'))
    t4 = R.cite(LIB('TPIERCE-1889', 'We passed out through the now shattered archway of the lodge', title='Tillie Pierce Alleman, At Gettysburg (1889), chapter VI, printed page 83'))
    R.sub('tillie_returns_on_tuesday_7_jul', 'Tillie Pierce walked home on the forenoon of Tuesday, 7 Jul, after staying several days at the Weikert farm.', 'documented', [t1], why='Participant memoir (1889); the date is exactly the printed "Jul 7".')
    R.sub('house_was_not_vacant', 'The house was not vacant: her mother and family were at home (bundles packed in case they had to leave), and only Tillie was away.', 'documented', [t2, t2b],
          why='The printed from-state "Vacant" is contradicted: the family had stayed in the town; her father is described at the house on 1 Jul (chapter VII). The house stood in the town (Baltimore Street).')
    R.sub('landscape_on_7_jul', 'On 7 Jul the fields she crossed had lost their fences, some buildings were gone and others ruined, and at Evergreen Cemetery the lodge archway was "shattered".', 'documented', [t3, t4],
          why='Eyewitness context for the end states of S-075 to S-084 and for fence states (the memoirist says "fences had disappeared", a general statement of the fields south of the town).')
    R.lookup('TPIERCE-1889 (local text): the return home and the state of the house', 'ws9', 'chapter VI pp.82-84 and chapter VII', 'done')
    R.unsupported('The PDF key Wiki-Pierce (Wikipedia, not admissible); damage to the house (the plan itself marks it an open gap).')
    return R.finish('corrected', 'closed',
        'Tillie Pierce returned to her home in the town on the forenoon of Tuesday, 7 Jul (her 1889 memoir); the house was not vacant, her family was at home and expected to be forced out, and only Tillie had been away. On the way she saw that fences had disappeared from the fields and the cemetery lodge archway was shattered.',
        register=[],
        product=['State schedule S-074 / bld-pierce-house: replace "Vacant -> Tillie returns" by "occupied by the family; Tillie returns 7 Jul forenoon" (documented); no fence data for the house.'],
        changes=['The row printed no fence state; the memoir documents the date and corrects "vacant".'])


def S075():
    R = Row('S-075')
    n1 = R.cite(NPSW('bldgs', 'Photographer Matthew Brady photographed the gate house approximately two weeks after the battle.', note='The page names Brady; the Library of Congress records of the two gatehouse stereographs credit Gardner or name no photographer.'))
    n2 = R.cite(NPSW('bldgs', 'The house and surrounding fences are all damaged and dead horses lay in various stages of rigormortis in the center of the Taneytown Road and in the yard of the house.', note='NPS caption of the Library of Congress photograph of the Leister house; the page does not date it.'))
    n3 = R.cite(NPSW('bldgs', 'Despite heavy fighting in the area, the gatehouse suffered only moderate damage.'))
    t4 = R.cite(LIB('TPIERCE-1889', 'We passed out through the now shattered archway of the lodge', title='Tillie Pierce Alleman, At Gettysburg (1889), chapter VI, printed page 83', note='Written of Tuesday 7 Jul 1863.'))
    t1 = R.cite(LIB('TPIERCE-1889', 'Sometime during- the forenoon of Tuesday, the 7th. in company with Mrs. Schriver and her two children, I started off on foot to reach my home.', title='Tillie Pierce Alleman, At Gettysburg (1889), chapter VI'))
    lc = R.cite(NPSW('loc_gardner_leister', 'Created/published: 1863 July.', note='Derived text of the JSON record served by www.loc.gov on 2026-11-13 (the host answered 200 to the API request; the earlier shard met HTTP 403 on the item page).'))
    lc2 = R.cite(NPSW('loc_meade_stereo', 'Hartford, Conn. : The War Photograph & Exhibition Co., No. 21 Linden Place, [1863 July]', note='Derived text of the JSON record served by www.loc.gov on 2026-11-13 (a first request on the same day timed out at 15,252 of 54,442 bytes; the retry returned the whole record). The square brackets are the cataloguer\'s: the date is supplied.'))
    lc3 = R.cite(NPSW('loc_meade_stereo', 'Attributed to Alexander Gardner in 1863, based on LC-B811-259.'))
    lc4 = R.cite(NPSW('loc_meade_stereo', 'Stone walls--Pennsylvania--Gettysburg--1860-1870'))
    R.sub('loc_records_date_only_to_the_month', 'The Library of Congress record of the Gardner Leister photograph (LC-DIG-cwpb-00887) dates it "1863 July." only; the sibling catalogue of the photo-matching workstream gives the same month-only date for the two cemetery gatehouse stereographs (2018666300, 2018670702). Neither date is 6 Jul or 7 Jul.', 'documented', [lc], support='partial',
          why='The gatehouse records were not re-fetched here (the catalogue of tools/bt/photomatch, read-only, carries them); the Leister record is quoted.')
    R.sub('loc_second_record_stereograph_2011660054', 'The Library of Congress record of the War Photograph & Exhibition Co. stereograph "General Meade\'s Headquarters at Gettysburg" (item 2011660054, LOT 4170 no. 202) gives "[1863 July]" (a supplied date), attributes it to Alexander Gardner "based on LC-B811-259", and lists "Stone walls" among its subject headings; its summary says that the bodies of horses shot during the fighting can be seen in the distance.', 'documented', [lc2, lc3, lc4], support='partial',
          why='A catalogue record, not a measurement: the cataloguer\'s subject headings name a stone wall and a dirt road in the picture; no height, no day and no photographer\'s own date. The record agrees with the month-only date of the Gardner record 2018666296; neither gives 6 Jul.')
    R.sub('gatehouse_state_in_july_1863', 'The Evergreen gatehouse suffered "only moderate damage"; a Brady photograph of it was taken about two weeks after the battle (NPS); a visitor who passed it on 7 Jul called the archway "shattered".', 'documented', [n3, n1, t4, t1],
          why='NPS dates the Brady photograph to about 17-18 Jul; Tillie Pierce dates her passage to 7 Jul. The two dates are different events: the PDF\'s "Jul 7 (gatehouse)" is the memoirist\'s passage, not a photograph.')
    R.sub('gatehouse_photograph_reading', 'Reading of the large derivative of LOC 2018666300 (left half, cwpb.01640; viewed 2026-11-13): an intact brick arch, panes broken in the right-hand windows, a pile of splintered fence boards and posts left of the gate, a small white gate and bare ground.', 'inferred', [], support='partial',
          why='An engineer\'s reading of the picture (tmp/photomatch/loc/cwpb.01640_v.jpg), not a quotation; it does not show a "shattered" arch, and no scale is available.')
    R.sub('leister_photograph_reading', 'Reading of the large derivative of LC-DIG-cwpb-00887 (932 x 1024 pixels, tmp/photomatch/loc/cwpb.00887_v.jpg, viewed 2026-11-13): the house with white picket fences in the yard in two sections beside it, a low rubble stone wall along the road with a broken rail fence and a gate frame in front of it, dead horses on the road and in the field, fruit trees in leaf; NPS says "the house and surrounding fences are all damaged".', 'inferred', [n2], support='partial',
          why='So "all rails burned" is not what the picture shows (the picket fence stands); no scale is available, so the wall height (24 in per one critic, 48-52 in rebuilt) cannot be measured here.')
    R.sub('jul_6_gardner_and_jul_7_gatehouse_dates', 'Gardner photographed the Leister wall on 6 Jul; the gatehouse was photographed on 7 Jul.', 'open_gap', [], support='none',
          why='The dates come from the plan (keys GD-14708 and GD-Housch, Gettysburg Daily, not reachable); the LOC catalogue gives July 1863 only; NPS gives about two weeks after the battle for the Brady gatehouse view.')
    R.sub('second_meade_hq_photograph_has_bare_trees', 'LOC 2018672035 ("Gen. George G. Meade\'s headquarters", LC-DIG-cwpb-00658, stereograph) is catalogued "1863 July" but its large derivative (viewed 2026-11-13) shows leafless trees and a continuous white picket fence round the yard without battle debris.', 'inferred', [], support='partial',
          why='So this negative cannot be a July view; its true date is a question for the photo-matching workstream (not this schedule).')
    R.lookup('LOC records www.loc.gov/item/2018666296 (JSON, complete) and 2011660054 (first request timed out at 15 KB; the retry returned the whole record)', 'web (reachable host)', 'created_published "1863 July." and "[1863 July]"; the second record also lists the subject heading Stone walls', 'done')
    R.lookup('local LOC derivatives (tmp/photomatch/loc) viewed with the image reader: cwpb.00887_v, cwpb.00658_v, cwpb.01640_v', 'local images', 'what is described in the sub-claims; no measurement', 'done')
    R.unsupported('The dates 6 Jul and 7 Jul for photographs, and the wall height; the plan\'s key GD-14708 (Gettysburg Daily).')
    return R.finish('corrected', 'blocked_host',
        'Photographs: the Library of Congress dates the Gardner Leister view and the cemetery gatehouse views to July 1863 only; NPS puts the Brady gatehouse view about two weeks after the battle; the Leister view shows picket fences in the yard, a low rubble wall along the road and a broken rail fence, dead horses and trees in leaf. The printed dates 6 Jul and 7 Jul are not supported as photograph dates (7 Jul is the date of Tillie Pierce\'s passage); wall height cannot be measured from the picture.',
        register=['fence-3-EG-13'],
        blocked_host=[{'url': 'Gettysburg Daily, wall essay (key GD-14708) and Housch (key GD-Housch)', 'what_to_read': 'The plan prints keys and titles only. The statements "Gardner photographed the Leister farm wall on 6 Jul" and the gatehouse photograph of 7 Jul, and the critic\'s 24-inch wall height. Lead sources; the host (www.gettysburgdaily.com) answered 403 at the fence-2 probe.'},
                      ],
        product=['P-13 (Leister wall) and FEN-leister: draw the wall low rubble along the Taneytown Road (as in cwpb.00887), picket fences in the yard standing at the time of the photograph, and a broken rail fence at the gate; the dates of the photographs are "July 1863" (LOC), not 6 Jul; the gatehouse: broken window panes, a pile of splintered fence boards left of the gate (cwpb.01640) and an intact arch. Do not use the rebuilt 48-52 in walls. A photo-matching pass for the wall height (scale from the house) is owed.'],
        changes=['The shard could not read the LOC pages (HTTP 403); the LOC API and the local derivatives were read and viewed now.', 'NPS dates the Brady gatehouse photograph about two weeks after the battle.'])


def S076():
    R = Row('S-076')
    h = R.cite(OR(3, 'will proceed at once to repair it, and commence to send oif wounded; then return and take the', note='Haupt (Hanover Junction), 4 Jul 1863, to Halleck: "A bridge is broken between this place and Littlestown. [I] will proceed at once to repair it, and commence to send off wounded; then return and take the Gettysburg Railroad, and commence repairing it."; OCR "oif".'))
    R.sub('repairs_began_after_4_jul', 'Repair of the Gettysburg Railroad was to begin after the bridge near Littlestown was mended, from 4 Jul onward (Haupt to Halleck, 4 Jul).', 'documented', [h],
          why='Primary dispatch; it dates the start of the work, not the reopening.')
    R.sub('traffic_resumed_jul_10', 'Rail traffic resumed on 10 Jul.', 'open_gap', [], support='none',
          why='The only local timetable (the Compiler\'s standing "Change of Time" advertisement) appears in the issues of 13, 20 and 27 Jul alike and does not date the reopening; no text gives 10 Jul. The plan notes that "one passage says 1865, internally inconsistent" (Wikipedia, not admissible).')
    R.lookup('OR27 pt.3 and July 1863 newspapers: the Gettysburg railroad repaired, trains running', 'OR27, Compiler, Sentinel', 'Haupt D1078 only; the advertisement does not date', 'done')
    R.lookup('Library of Congress search API (Chronicling America, 6-20 Jul 1863, "Gettysburg railroad opened trains"), one request', 'web (reachable host)', '6 results (Iowa, Illinois and Maine papers of early July); none reports the reopening of the Gettysburg Railroad', 'failed')
    R.unsupported('The date of reopening (10 Jul or 1865) and the cut state (PDF source Wiki-Station, Wikipedia).')
    return R.finish('partially_supported', 'blocked_host',
        'Repairs of the Gettysburg Railroad were ordered after the bridge near Littlestown was mended (Haupt, 4 Jul 1863); no local text dates the resumption of traffic (10 Jul in the plan, 1865 in one passage).',
        register=['fence-3-EG-14'],
        blocked_host=[{'url': 'Wikipedia, Gettysburg station (key Wiki-Station)', 'what_to_read': 'Not an admissible source (Law cl.4). The primary would be the U.S. Military Railroads construction corps report (Haupt) and the Gettysburg Railroad company records for 10 Jul 1863; not reached.'}],
        product=['State schedule S-076 / RD-gettysburg-railroad: keep the two scenarios (resumed 10 Jul; one source 1865) with the repair start (4 Jul, Haupt) as the only documented anchor.'])
