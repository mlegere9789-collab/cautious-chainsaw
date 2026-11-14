"""Writes the proposed register entries of the fence-3 close-out (fence-3-EG-01 .. fence-3-EG-18).

Run: python3 -I tmp/fence-3/scripts/gen_register.py
Every figure and quotation below is taken from evidence_corrections/fence-3.jsonl (the row id is named in each entry); nothing is added from memory.
"""
import os

ROOT = '/home/user/cautious-chainsaw'
OUT = ROOT + '/docs/battle-theatre/GOVERNANCE/horde/fence-3/proposed-register'
os.makedirs(OUT, exist_ok=True)

REV = 'internal review only (DEC-006: no public review label)'
DEC = '(filled only from the Decision Log)'
BASE = ('OR27 pts 1-3 (tools/bt/or27_find.py logic), the state volumes (New York, Pennsylvania, Maine, Michigan, Battles and Leaders 3), '
        'the 99-text library, the 73 NPS documents under tmp/library/web/nps and the NPS pages at www.nps.gov (re-read 2026-11-13)')
SS = ('Stone Sentinels (gettysburg.stonesentinels.com) refused the connection (CONNECT 403) when probed once on 2026-11-13; not retried, not worked around')
JS = 'GOVERNANCE/evidence_corrections/fence-3.jsonl'

E = []


def add(n, title, rids, cat, desc, why, searched, subst, recon, tier, competing, marking, impact, owner_q, rec, status):
    E.append(dict(n=n, title=title, rids=rids, cat=cat, desc=desc, why=why, searched=searched, subst=subst, recon=recon, tier=tier,
                  competing=competing, marking=marking, impact=impact, owner_q=owner_q, rec=rec, status=status))


# ---------------------------------------------------------------- 01 Taney
add(1, 'Taney house: the end state "ruins" and the farm\'s fences', 'R14, R13, R21', 'evidence missing',
    'S-053 (evidence row R14.S-053 in ' + JS + '). The PDF prints the Taney house as Occupied by Confederate sharpshooters, then Shelled; ruins (3 Jul, trigger 1st NY Battery M, source SS-Taney only). '
    'Re-matched 2026-11-13: two New York volumes document Confederate sharpshooters in the stone house across Rock Creek on the forenoon of 3 Jul, doing great damage to Colgrove\'s infantry (NY at Gettysburg vol.3 p.1265, vol.1 p.70), '
    'and the shelling of the house by Battery M, 1st New York Light Artillery, with percussion shells that "knocked the front out of the house", killed or wounded many of the sharpshooters and made it untenable (vol.3 p.1266, vol.1 p.70); '
    'Muhlenberg (OR27-1-R314 p.870) puts Winegar\'s Battery M on a second elevation east of Slocum\'s Hill. No local text calls the house a ruin, dates a later state or says anything about Taney fences or any other farm detail; the OR names no Taney house.',
    'The only source the plan names for "ruins" is Stone Sentinels (SS-Taney), a lead source; ' + SS + '. No local primary or non-lead text gives the later state.',
    BASE + '; Stone Sentinels farm pages (host refused).',
    'The house is drawn standing with a breached front wall after the forenoon of 3 Jul (documented); "ruins" is kept only as an open-gap marked state or dropped; no fence object is created for the farm.',
    'Occupation by sharpshooters, shelling by Battery M and a knocked-out front wall are documented by two independent retrospective narratives; the ruin and any fence are not.',
    'documented (occupation, battery, breached front, forenoon); open gap (ruins, Taney fences)',
    'Shelled; ruins (PDF, SS-Taney) against front knocked out, untenable (state volumes)',
    'Gap marker on the end state; tier overlay on the house.',
    'Taney house east of Rock Creek on the forenoon of 3 Jul; Battery M\'s percussion shells.',
    'Adopt the documented to-state in place of "ruins"? (keeping "ruins" as a marked gap needs no decision)',
    'Adopt; read the Taney page of Stone Sentinels from a machine that can reach it.',
    'open (proposed 2026-11-13; register EG-0099 carries the earlier, generic text)')

# ---------------------------------------------------------------- 02 Rummel
add(2, 'Rummel barn loopholes and Rummel fences destroyed: not supported; occupation, shelling, openings and standing fences documented', 'R14, R13, R21', 'evidence missing / evidence partly present',
    'S-054, S-055 (' + JS + '). The PDF prints the Rummel barn as Plank walls -> Loopholes cut (Stuart\'s men) and the Rummel fences as Standing -> Destroyed; 30+ dead horses (3 Jul, SS-Rummel only). '
    'Re-matched 2026-11-13: a large barn stood in front of the 2nd Pennsylvania Cavalry\'s skirmish line, the enemy "had concentrated a large force" in and around it, and Pennington\'s and Randol\'s batteries put "shell after shell into the barn, making it untenable", the barn showing "even yet the effects of the fire of our batteries" (PA at Gettysburg vol.2 p.819); '
    'the NPS page for the 1st New Jersey Cavalry monument has the regiment moving forward around 2 pm and, "within moments", dismounted Confederates of Jenkins\' Virginia brigade appearing "from behind the Rummel house and barn"; the New Jersey final report has the Union line advanced to and holding the Rummel buildings "about sundown". '
    'Fences: Kidd (Michigan at Gettysburg pp.149-153) has the 7th Michigan thrown against "a post-and-rail fence that ran obliquely in front of the Rummel barn", the posts "deeply set" and several lengths lifted at once to pass; PA vol.2 p.819 and the New Jersey report put fences along the lane and a worm fence at the 1st NJ position; Gregg (OR27-1-R344 p.959, the farm not named) has the enemy advance guard dismount "to remove the fences". '
    'The NPS page says John Rummel dragged 30 dead horses from the lane. Nothing local supports plank walls, loopholes, destruction of the fences as a whole, "30+", the $219.95 claim, 168 acres, the log house gone, or Fitz Lee\'s 1st Virginia through the farm. The word Rummel does not occur in OR27.',
    'No local text describes the barn\'s walls, any loophole, the extent or count of fence loss or the claim. The plan\'s source SS-Rummel is a lead source (' + SS + '); the damage claim of John Rummel is an archive file (owner-only act, see the blocked_host entry of S-055).',
    BASE + '; "loop-hole", "loophole", "port-hole" searched in every local text (no hit for this barn); Stone Sentinels (host refused).',
    'Barn standing, held by Confederate dismounted troops and shelled on the afternoon of 3 Jul (documented), drawn with marks of shell fire; loopholes only as an open-gap marked state or not drawn; fences standing (post-and-rail in front of the barn, worm fence at the 1st NJ position) with openings made on the afternoon of 3 Jul; the destroyed end state inferred and marked; 30 dead horses in the lane (NPS).',
    'Standing fences with openings, an occupied and shelled barn and 30 dead horses are documented; the loopholes and the destruction of the fences are not.',
    'documented (occupation, shelling, fences standing, openings made, 30 horses); open gap (plank walls, loopholes, destruction of the fences as a whole, claim)',
    'Standing -> Destroyed (PDF) against standing with openings (Gregg, Kidd); 30+ (PDF) against 30 (NPS)',
    'Tier overlay on the barn and the fence segments; gap marker on the loopholes.',
    'East Cavalry Field, afternoon of 3 Jul (Rummel farm).',
    'None for the evidence; the Rummel damage-claim file is an owner-only visit or request.',
    'Show the documented openings; keep destruction and loopholes marked inferred or gap; read SS-Rummel and the claim file.',
    'open (re-checked 2026-11-13; register EG-0093 carries the earlier text)')

# ---------------------------------------------------------------- 03 Culp's Hill final action
add(3, 'Culp\'s Hill final action: wall attacked at dawn, last charge 10:25, end hour in conflict, identification with the Pardee Field wall inferred', 'R14, R07, R21', 'source conflict / evidence partly present',
    'S-056 (' + JS + '). The PDF prints Culp\'s Hill final action as Battle ended about 11:00; Pardee Field wall attacked, about 10:00-11:00 on 3 Jul, trigger Geary\'s counterattack, source Wikipedia (not admissible). '
    'Re-matched 2026-11-13: (1) a stone wall ran parallel to and behind the Twelfth Corps works and was held by Confederates on the night of 2-3 Jul (Williams, OR27-1-R272 p.773, "A thick stone fence parallel to the ridge"; Geary R293 p.828). '
    '(2) It was attacked at dawn, not at 10:00-11:00: Candy (R294 p.836) has a battery open on the enemy at 3.45 a.m. [3 Jul] and the 147th Pennsylvania then ordered forward to "a stone fence in front of the enemy"; Maulsby (R283 p.806) has the 1st Maryland, Potomac Home Brigade, attack "about 4 a. m." a position "behind a stone wall" and come within reach of it ("the stone wall nearly reached, and bayonets were fixed for a charge over it"); Geary (R293 p.828) has the 147th ordered at 5 a. m. "to charge and carry the stone wall occupied by the enemy", the enemy then abandoning the entire line of the wall. '
    '(3) The last Confederate charge came at 10.25 (Geary R293 p.830: "This was the last charge"; Steuart, OR27-2-R482 p.511, skirmishers deployed "at about 10 a. m."). '
    '(4) The end of the fighting is given as 10.30 (Slocum R271 p.761; Greene R307 p.857), about 10 (Muhlenberg R314 p.870; Ruger R273 p.781), about 11 (McDougall R274 p.783; Hayes R298 p.843; Patrick R295 p.839), and for the 1st Maryland\'s own firing "about 12 m." (Maulsby R283 p.806: the noon alternative of conflict C-031). '
    '(5) That the wall of these reports is the wall at the edge of Pardee Field (P-08) is an inference: no OR text uses the name Pardee Field, and the NPS 1940 report quotes the Comte de Paris for a stone wall on the small plateau south of Culp\'s Hill without that name.',
    'No OR text uses the name Pardee Field or gives the wall\'s length, height or exact place; the reports name the wall behind the works without a map reference. Only the owner decides the default among the end hours of C-031.',
    BASE + '; NPS texts searched for "Pardee Field wall" (no hit).',
    'P-08 present at frame one (no construction animation, no profile from the rebuilt wall); the wall attack at about 04:00-05:00 by the 1st Maryland PHB and the 147th Pennsylvania, then the last charge at 10:25-10:30; the end hour stays a selectable scenario.',
    'Existence of the wall, its dawn attack, the 10.25 last charge and an end between 10.30 and about 11 are documented; the identification with P-08 is inferred; noon is documented for one regiment only.',
    'documented (wall, dawn attack, last charge, end 10:30 to about 11:00); inferred (identification with P-08); documented for one regiment (noon)',
    'End of the fighting 10.30 / about 10 / about 11 / about 12 m. (C-031, no default); wall attack at 10:00-11:00 (PDF) against 04:00-05:00 (reports)',
    'Tier overlay on P-08; selector for the end hour.',
    'Culp\'s Hill, morning of 3 Jul.',
    'None needed; C-031 stays selectable with no default chosen here.',
    'Split the row into the dawn attack on the wall and the last charge as the evidence file states; carry C-031.',
    'open (re-checked 2026-11-13; register EG-0101 carries the earlier text)')

# ---------------------------------------------------------------- 04 Powers Hill
add(4, 'Powers Hill guns: the printed trigger "Meade\'s HQ moves" is contradicted; the guns opened at 04:00-04:30', 'R14, R07', 'evidence contradicts the PDF',
    'S-057 (' + JS + '). The PDF prints Powers Hill guns as Quiet -> Fire at Culp\'s Hill, morning of 3 Jul, trigger Meade\'s HQ moves, source HN-Thunder (HistoryNet) only. '
    'Re-matched 2026-11-13: the Twelfth Corps batteries on and beside the hill known as Slocum\'s headquarters (Hunt, OR27-1-R028 p.237; Muhlenberg R314 p.870; NY at Gettysburg vol.3 p.1265) were placed during the night and opened on the Confederates in the corps\' own works at 04:00 (Slocum R271 p.761) or 04:30 (Hunt; Muhlenberg; Ruger R273 p.780), '
    'Muhlenberg\'s two rifle and two 12-pounder batteries (twenty guns) firing fifteen minutes without intermission and then at intervals until 10:00. The trigger in the row is not supported and cannot be: the headquarters left the Leister house during the afternoon cannonade (S-060, EG-06), after this fire had ended; the documented trigger is the order to retake the works at daylight. No local text says anything about fences or walls at Powers Hill.',
    'The row\'s trigger is contradicted by documents, not unreachable; the plan\'s HN-Thunder page is a lead source on a host that refused the connection on 2026-11-13.',
    BASE + '.',
    'Guns shown firing from 04:00-04:30 on 3 Jul on the order to retake the works; the PDF trigger kept visible as unsupported; no fence or wall state attached to Powers Hill.',
    'Hours, batteries and target are documented; the printed trigger is an open gap.',
    'documented (guns, hours, target, daylight order); open gap (the printed trigger)',
    'Trigger "Meade\'s HQ moves" (PDF) against the order to retake the works at daylight (OR)',
    'Trigger marked unsupported; tier overlay on the hours.',
    'Powers Hill battery fire, 04:00-10:00 on 3 Jul; gun report audio at distance delay.',
    'None.',
    'Replace the trigger; keep the PDF value visible as unsupported.',
    'open (proposed 2026-11-13; register EG-0099 carries the earlier, generic text)')

# ---------------------------------------------------------------- 05 Cushing
add(5, 'Cushing\'s battery: wall and fence at the line, limbers about 08:00, one gun left at 14:45; "four of six guns" unsupported', 'R14, R13', 'evidence partly present / evidence contradicts the PDF',
    'S-058 (' + JS + '). The PDF prints Cushing\'s battery as In line -> Three limbers exploded (morning); four of six guns knocked out; guns run to the wall, morning to about 15:30 on 3 Jul (sources Iron-9699, WHN-Cushing). '
    'Re-matched 2026-11-13: a fence and a stone wall stood on the line before the assault (Webb, OR27-1-R104 p.427: the 69th Pennsylvania "behind a fence a little in advance of the ridge" at 6.30 a. m. on 2 Jul with his right on Cushing\'s battery; Gibbon R098 p.416: the brigade "partially behind a low stone wall" about 4 p. m.); '
    'three of Cushing\'s limbers blew up about 8 o\'clock on 3 Jul (Hazard R132 pp.478-479; Hall R109 pp.437-438); by 2.45 p. m. the cannonade had "silenced the Rhode Island battery and all the guns but one of Cushing\'s battery" (Webb R104 p.428; the battery was six 3-inch rifles, Hunt R028 p.236); '
    'when the assault came three of Cushing\'s guns were run down to the fence (Webb p.428; "to the wall", Bachelder 1904) and Cushing "pushed his gun to the fence in front, and was killed while serving his last canister" (Hall R109 pp.437-438; Hazard R132 p.480 has him "mortally wounded by a musket-shot" on 3 Jul). The line is called a fence, a rail fence and a stone wall by different witnesses (Hall R109 p.439, "the slight cover of the rail fence"; Abbott R111 p.446, "behind a rail fence"; Smith R106 p.432, "protected by a stone wall"; Fitzhugh R330 p.896, "the stone fence in front of General Webb"); no text says whether the rail fence ran on, in front of or beside the wall, or gives its height or rail count. '
    '"Four of six guns knocked out" is in no text (Webb: all but one silenced). The earlier register text (EG-0100) read the line as consistent with the rider fence of the 1882 Cyclorama photograph named in the PDF; that identification stays inferred and was not re-checked here.',
    'No text gives the height, rail count, extent or damage of the wall or of the rail fence or the fence\'s position relative to the wall; the plan\'s sources are a reprint of Hazard\'s report (read directly in the OR) and a magazine page that is not admissible.',
    BASE + '; the OR reports of Webb, Hall, Hazard, Hunt, Gibbon, Abbott, Smith and Fitzhugh and Bachelder 1904.',
    'P-01 / FEN-cemetery-ridge-walls present at frame one on 2 Jul with no construction animation and no damage state; a rail fence at the line as an inferred detail; limbers about 08:00, one gun serviceable by 14:45, three guns run to the wall at 15:00-15:30.',
    'Wall and fence before the assault, the limbers, the silencing and the guns run to the wall are documented; the rail fence\'s placement against the wall is inferred; four of six is unsupported.',
    'documented (wall and fence existing, limbers, silencing, three guns to the wall); inferred (rail fence against the wall; Cyclorama identification); open gap (four of six)',
    'Four of six guns knocked out (PDF) against all but one silenced by 14:45 (Webb); fence / rail fence / stone wall (witness wording)',
    'Tier overlay on the rail fence; "four of six" marked unsupported.',
    'The Angle and the Copse, 08:00 to 15:30 on 3 Jul.',
    'None.',
    'Carry the witness wording; show wall and fence together as the reports do; no damage to the wall.',
    'open (re-checked 2026-11-13; register EG-0100 carries the earlier text)')

# ---------------------------------------------------------------- 06 Leister
add(6, 'Leister house: damage list, extent and time of the rail burning, and where the headquarters went', 'R14, R13, R20', 'evidence missing / source conflict',
    'S-059, S-060 (' + JS + '). The PDF prints the Leister house after the bombardment: many shot holes, porch supports and steps down, bedstead broken, 17 dead horses, apple trees destroyed, peach tree dies, fence rails burned, hay lost, spring spoiled (about 13:00-15:00 on 3 Jul; SS-Leister, NPS-Bldgs), and the headquarters moving to Powers Hill during the bombardment (HN-Thunder). '
    'Re-matched 2026-11-13: shells burst in the yard among the staff horses tied to the fence, tore up the steps, carried away the porch supports and passed through the door and the garret, and the house was "shot through several times" (Captain George Meade Jr., Life and Letters II; Haskell, July 1863; NPS Lydia Leister Farm page; the Adams Sentinel of 18 Aug 1863, reprinting a New York Times correspondent, counts the hours from "Eleven o\'clock" to one o\'clock and then a shell screaming over the house, "They burst in the yard", beside the fence among hitched horses; Hunt, OR27-1-R028 p.239: the cannonade opened about 1 p. m. and the Union fire was gradually stopped about 2.30 p. m.); '
    '17 dead horses lay in the yard when Lydia Leister returned (NPS 3D tour page; the count rests on that statement alone); her fence rails "had been burned" and "the house and surrounding fences are all damaged" (NPS 3D tour page and Buildings and Farms Then and Now: no "all" rails, no agent, no date, no hour); all the hay was gone from the barn (NPS; "2 tons" not found). '
    'Nothing local mentions the bedstead, apple trees, a peach tree dying or the spoiled spring; the only peach tree in the local texts is the living one with a bird\'s nest in the yard at about one o\'clock (the same Sentinel account). Headquarters: the staff withdrew to the fenced yard behind the house (Meade Jr.), the shells forced the general and staff to seek quarters with Slocum on Powers\' Hill (NY at Gettysburg vol.1 p.75; Norton, OR27-1-R017 p.206) and Meade was on Powers Hill when the assault began (Bachelder 1904); the 2nd Pennsylvania Cavalry narrative (PA vol.2 p.806) names instead "more secure quarters in the woods, south of the Taneytown road". No text gives the hour of the move.',
    'The itemised damage (bedstead, trees, spring, tons of hay, rails by number and date) rests on the damage claim of Lydia Leister (an archive file: owner-only act) and on Stone Sentinels (' + SS + '); no local text dates the burning of the rails or the headquarters\' move to a minute.',
    BASE + '; Stone Sentinels (host refused); the Pennsylvania State Archives claim series is not reachable from here.',
    'Shell damage to steps, porch supports, door and garret drawn at 13:00-15:00 on 3 Jul (documented); 17 dead horses and damaged fences as the photograph shows them; rails burned by the owner\'s return (documented outcome, extent and time inferred); hay gone; bedstead, trees and spring as marked gaps; headquarters sequence rear yard then Powers Hill, with the Taneytown-road woods selectable.',
    'Shell damage, 17 horses, the burned rails as an outcome, the hay and the move with its trigger are documented; the rest of the damage list is open.',
    'documented (shell damage, 17 horses, rails burned by her return, hay gone, the move and its trigger); inferred (extent and time of the rail burning); open gap (bedstead, apple and peach trees, spring, 2 tons, hour of the move)',
    'Headquarters destination: Slocum\'s headquarters on Powers Hill (Norton; NY vol.1; Bachelder) against the woods south of the Taneytown road (2nd PA Cavalry); all rails burned 13:00-15:00 (PDF) against burned by her return (NPS)',
    'Tier overlay on the fence and tree objects; gap markers on the bedstead, trees and spring; scenario selector for the headquarters\' destination.',
    'Leister yard, Taneytown Road, 13:00-15:00 on 3 Jul; shell bursts at the house.',
    'None for the evidence; the Leister claim file is an owner-only act.',
    'Show the documented damage only; carry the two headquarters destinations with no default.',
    'open (re-checked 2026-11-13; register EG-0095 carries the earlier text)')

# ---------------------------------------------------------------- 07 cannonade
add(7, 'The 3 Jul cannonade: signal, Union reply, end hour (conflict C-029); the printed Union slowdown 13:30-14:00 is not found', 'R14, R07, R21', 'source conflict',
    'S-061 (' + JS + '). The PDF prints the gun lines as Quiet -> Full exchange; Union slowdown; Union lull: 13:00, slow about 13:30-14:00, lull to about 14:45-15:00, trigger Alexander signal / Hunt orders (NPS-HB9, Wikipedia), tier D with a duration conflict. '
    'Re-matched 2026-11-13: the cannonade opened at about 13:00 (Hunt, OR27-1-R028 p.239; Hancock R076 p.372; Devereux R110 p.443; Lee, OR27-2-R426 p.320; Pendleton R428 p.352); Longstreet puts the order to open the batteries at about 14:00, after Pickett reported ready (R430 p.359), and Eshleman has the signal "between 1 and 2 p. m." (R466 p.434); two guns of Miller\'s battery of the Washington Artillery gave the signal (Eshleman; NPS Handbook 9). '
    'The Union batteries withheld their fire for the opening burst and then replied deliberately (Hunt: "Our fire was well withheld until the first burst was over"; Hazard R132 p.480: "The batteries did not at first reply"; Handbook 9: Union gunners "waited a few minutes"). Hunt ordered the Union fire gradually stopped at about 2.30 p. m. (R028 p.239) and the enemy soon slackened; '
    'the duration is given as about an hour and a quarter (Hazard), an hour and forty-five minutes (Hancock R076 p.373), two hours (Gibbon R098 p.417; Lee), and Hunt has the column of attack formed about 3 p. m., soon after the enemy\'s fire had ceased. A Union slowdown at 13:30-14:00 is in no local text.',
    'The values behind C-029 are first-hand statements of different witnesses; no text gives the minute of the signal guns or says which end hour is right. Only the owner decides a default among conflicting sources.',
    BASE + '; fourteen OR reports of both armies on the cannonade.',
    'Start at about 13:00 with the signal guns; Union reply withheld for the opening minutes; Hunt\'s order at about 14:30; end between 14:15 and 15:00 as the C-029 scenarios (no default recorded here); the printed slowdown 13:30-14:00 shown as unsupported.',
    'Start, signal, withheld reply, Hunt\'s order and the range of end hours are documented as witness statements; the printed slowdown is not found.',
    'documented (start, signal, reply, Hunt\'s order, end range as witness statements); open gap (printed slowdown 13:30-14:00, minute of the signal)',
    'Cannonade end 14:00 / 14:30 / 15:00 (C-029); start about 13:00 (Hunt, Lee, Pendleton, Hancock) against about 14:00 (Longstreet)',
    'Scenario selector for the end hour; the printed slowdown marked unsupported.',
    'Artillery duel audio and smoke, 13:00-15:00 on 3 Jul; sound delay by distance.',
    'The default for C-029 stays pending owner (conflict register); none chosen here.',
    'Carry every value as a selectable scenario with its witness; drop or mark the 13:30-14:00 slowdown.',
    'open (proposed 2026-11-13)')

# ---------------------------------------------------------------- 08 Emmitsburg Road
add(8, 'Emmitsburg Road fences: pulled down on 2 Jul in sectors, double fences standing on 3 Jul, breach points and the 836-hole rail not supported', 'R14, R13', 'source conflict / evidence missing',
    'S-062 (' + JS + '). The PDF prints the Emmitsburg Road fences as Intact -> Splintered / breached; attackers climbing, about 15:30-16:15 on 3 Jul (ABT-Charge), and a rail with 836 holes (Savas-Hessler). '
    'Re-matched 2026-11-13: fences stood on the line of the advance on 3 Jul and had to be climbed (Peyton, OR27-2-R441 p.386: "climb three high post and rail fences"; Shepard R552 p.647: "a lane inclosed by two stout post and plank fences" [OCR "jjlank"], "a very great obstruction"; Davis R553 p.651: "a strong post and rail fence" and "other fences of a similar character"); '
    'double post-and-rail fences enclosed both sides of the road (NPS Record of Treatment vol.I; NPS Cultural Landscapes Inventory, Emmitsburg Road Ridge) and the attackers crowded at the openings where the fences had been thrown down (Martin, 53rd Virginia, via the NPS Pickett\'s Charge inventory). '
    'They were not intact along the whole road: on 2 Jul Union troops took down or levelled fences to the road (Higgins, OR27-1-R146 p.511, 35 men, 10-11 a. m.; Bodine R167 p.556; Humphreys R158 p.532; Gibbon R098 p.416; Harrow R099 p.419; Hancock R076 p.370; Joslin R101 p.423; Wright, OR27-2-R539 p.623, for Anderson\'s sector) and built rail breastworks along it (NPS). '
    'On 17 Nov 1863 a New-York Tribune correspondent saw along the Emmitsburg road "wooden fences ... torn down and the stone ones strengthened and used as breastworks" (the November state, EG-17). Not found: 15:30-16:15 for the fences (Webb has the line crossing the road about 15:00), the 836-hole rail and "perforated slabs" (the Savas-Hessler excerpt is a publisher PDF on a host that refused the connection), the breach points.',
    'Segment-level data are absent from the reports; the Hessler passage and the plan\'s Gettysburg Daily and American Battlefield Trust pages (keys GD-EmmRd, ABT-Charge) are not reachable (CONNECT 403 on 2026-11-13, one request each, not retried).',
    BASE + '; "836", "perforated", "riddled" searched in all local texts (no fence statement).',
    'Per-sector, per-date state: segments pulled down or levelled on 2 Jul (Third Corps front, Bodine, Humphreys, the Harrow-Gibbon-Joslin position, the east-side breastwork north of Klingel) and segments standing on 3 Jul with double fences on both sides; "intact morning Jul 3" not drawn for the whole road; slowing at the road after about 15:00; 836 holes dropped or marked an open gap.',
    'Fences on the line of the advance and the 2 Jul removals are documented; breach points and counts are not.',
    'documented (fences standing on 3 Jul, double fences, 2 Jul removals, slowing at the road); inferred (breaches); open gap (836 holes, 15:30-16:15)',
    'Intact morning of 3 Jul (PDF) against pulled down on 2 Jul (OR); no default chosen',
    'Scenario per sector; tier overlay on segments.',
    'Pickett\'s Charge approach, the main fence visual of 3 Jul.',
    'None; both states are shown as scenarios.',
    'Read the Hessler excerpt and the Gettysburg Daily and American Battlefield Trust pages from a machine that can reach them.',
    'open (re-checked 2026-11-13; register EG-0094 carries the earlier text)')

# ---------------------------------------------------------------- 09 Brien
add(9, 'Brien fences: two map layouts in conflict, removal within 1-3 Jul, "nearly destroyed on Jul 3" unsupported', 'R14, R13', 'conflict between sources',
    'S-063 (' + JS + '). The PDF prints the Brian fences as Standing -> Nearly destroyed (3 Jul, SS-Brian). Sherfy\'s study of 1972 (NPS, The Brien Farm and Family, local text; page numbers are the PDF pages of the file as served) documents: fences on the Brien land identified on Warren\'s 1868-69 map and Cope\'s 1896 map, with "a preponderance of wooden fencing"; '
    'the maps disagree on the material along the Emmitsburg Road (Warren: Virginia worm; Cope: post and rail), north of the buildings (post and rail against stone) and south of the house (worm against stone wall), and "No positive method exists to correctly resolve these differences"; Union soldiers removed the fences "for firewood and fortifications" within the three days; '
    'the claim itemised 195 panels of fence (part post and rail, part worm, $175) and a stone fence destroyed ($5.00), $1,028 requested, $15 received; defence works were built quickly at the edge of the tree line and the Brady photograph shows a stone and rider fence or defence work north and west of the house (Sherfy, citing a report of Dr. Tilberg on field defenses). '
    'No local text says "nearly destroyed" or gives a proportion or a day: the window is 1-3 Jul. The OR has no Brien farm text.',
    'No map of 1863 fences exists: the maps are 5 and 33 years later and conflict; the claim files are archive records (the study cites them as National Archives files; owner-only act) and Stone Sentinels (' + SS + ').',
    BASE + '; NPS-BRIEN-FARM (Sherfy 1972) re-read page by page; one request to the National Archives catalogue (reachable, but its search is a JavaScript application and returned only the page shell; no key used).',
    'Two selectable fence layouts (Warren 1868-69 and Cope 1896) with no default; removal by Union soldiers 1-3 Jul for firewood and works (documented); the tree-line works drawn as built on screen with an open window, never pre-placed.',
    'Existence, wooden predominance, removal within the three days and the claim figures are documented; the layout is a conflict; the proportion destroyed is open.',
    'documented (fences before, removal 1-3 Jul, claim figures, tree-line works); conflict (layout and materials); open gap (nearly destroyed, panels standing)',
    'Warren (worm on the Emmitsburg Road, post and rail north, worm south) against Cope (post and rail on the road, stone north and south); no default',
    'Scenario selector and tier overlay.',
    'Brien farm in front of the Copse, 1-3 Jul.',
    'Carry both layouts; no default.',
    'View the Warren and Cope maps and the claim files; until then no proportion is drawn.',
    'open (re-checked 2026-11-13; register EG-0096 carries the earlier text)')

# ---------------------------------------------------------------- 10 hospital and farm claims
add(10, 'Granite Schoolhouse, Spangler, Hummelbaugh, Armistead and Trostle hospital: claims no local source supports, and the corrected hour of Armistead\'s arrival', 'R13, R14, R21', 'evidence missing / evidence contradicts the PDF',
    'S-065, S-066, S-071, S-072, S-073 (' + JS + '). S-065: the Granite Schoolhouse as a Second Corps, First Division hospital evacuated toward McAllister\'s Mill after the overshots of 3 Jul (HN-Spangler): no local text names this schoolhouse as a hospital; the only local statement is that it no longer stands (NPS General Management Plan 1999); "built 1862" and "razed 1921" have no local source. '
    'S-071: the Hummelbaugh farm as a Second Corps hospital where Barksdale died and as Pleasonton\'s headquarters on 4-6 Jul (SS-Hummelbaugh): the house stood in 1863 (NPS 1999); the rest has no local source; OR27 has no Hummelbaugh text and Pleasonton\'s report (OR27-1-R336) names no headquarters site. '
    'S-066: Armistead was brought to the Eleventh Corps (2nd Division) hospital at the George Spangler farm on the afternoon of 3 Jul, "about 4 o\'clock" by the attending surgeon Brinton (letter of 1869, via NPS Common Pride and Fame part II), not about 20:00 as printed; Holland (Confederate Veteran 1921, via NPS) has him moved "during that afternoon" to "a temporary hospital beneath the shade of some trees"; no local text names a summer kitchen or any building. '
    'S-072: he died on 5 Jul at about 9 a. m. (Holland via NPS), Brinton writing that the death "resulted [not] from his wounds directly, but from secondary fever and prostration". '
    'S-073: the Trostle farmhouse was used briefly as a hospital and the barn area as Sickles\'s headquarters (NPS CLI 2024 citing CLR 2002); the barn has a cannonball hole in the brick gable and dead horses of Bigelow\'s battery lay on the property (NPS Then and Now); no local text dates the end of the hospital use or says "abandoned by Jul 6".',
    'The plan\'s sources (HistoryNet HN-Spangler, Stone Sentinels SS-Hummelbaugh and SS-Trostle, Emerging Civil War ECW-Hosp) are lead sources; the HistoryNet and Stone Sentinels hosts refused the connection on 2026-11-13 and the ECW host is not on the reachable list; no local primary or institutional text covers these claims.',
    BASE + '; school-house with hospital, wounded, surgeon, Second Corps searched in OR27, Letterman, Hospital Scenes, Jacobs, the state volumes and the NPS texts.',
    'Armistead\'s arrival drawn at about 16:00 on 3 Jul and his death on 5 Jul about 09:00 at the Spangler hospital, on a cot under trees (the documented alternative) with the summer kitchen as a marked open-gap placement; Granite Schoolhouse and Hummelbaugh hospital and headquarters states as marked open gaps; Trostle hospital use "brief" with the end date open.',
    'Armistead\'s hour, place and death, the Trostle brief hospital and the standing Hummelbaugh house are documented; everything else of the five rows is open.',
    'documented (Armistead arrival and death, Trostle brief hospital and barn damage, Hummelbaugh house standing); inferred (none); open gap (Granite Schoolhouse hospital, Hummelbaugh hospital and headquarters, summer kitchen, Trostle end date)',
    'Armistead arrives about 20:00 (PDF) against about 16:00 (Brinton, Holland); summer kitchen (PDF) against a cot under trees (Holland)',
    'Gap markers on every unsupported state; tier overlay on the documented ones.',
    'Spangler, Hummelbaugh, Trostle and the Granite Schoolhouse, 3-6 Jul.',
    'None.',
    'Read the HistoryNet Spangler article and the Stone Sentinels farm pages from a machine that can reach them; do not carry the PDF values as documented.',
    'open (proposed 2026-11-13; register EG-0099 carries the earlier, generic text)')

# ---------------------------------------------------------------- 11 Klingel
add(11, 'Klingel farm fences: portions dismantled, not all missing on 4 Jul', 'R14, R13', 'evidence missing / evidence contradicts the PDF',
    'S-068 (' + JS + '). The PDF prints the Klingle farm as Abandoned -> Owner returns; all fences missing, 4 Jul (SS-Klingle). Re-matched 2026-11-13 (NPS Cultural Landscapes Inventory, Emmitsburg Road Ridge Battlefield, 2024): a wooden post-and-rail fence stood along both sides of the Emmitsburg Road in front of the Klingel farm, with a boundary fence between the Klingel and Codori properties (pdf p.63); '
    '"Although Union forces removed many of the north-south fences prior to the second day" enough stood on 2-3 Jul to hinder movement, and portions of the road fence were dismantled for troop movement and breastworks (east side, north of the farm; pdf p.43); Klingel (with Catherine Trostle) later claimed thousands of fence rails and other fencing material among his losses (pdf p.43); the farmhouse was occupied by the Third Corps until overrun on 2 Jul (pdf p.42). '
    'No local text gives the day of his return or says all the fences were gone. A New-York Tribune correspondent who drove the Emmitsburg road on 17 Nov 1863 (Library of Congress, Chronicling America, issue of 21 Nov) wrote that along it "wooden fences are torn down and the stone ones strengthened and used as breastworks" (a general description: the farm is not named and no day is given). The OR has no Klingel text. The Codori pull-down specifics the earlier entry carried belong to the Emmitsburg Road sectors (EG-08) and stay open.',
    'The itemised claim (rails and dates) is an archive file (owner-only act) and Stone Sentinels refused the connection on 2026-11-13; the primary witnesses for the road fences are in EG-08.',
    BASE + '; Stone Sentinels (host refused).',
    'Post-and-rail fence on both sides of the road with portions dismantled before and during 2 Jul (east-side breastwork north of the farm); the remainder and the end state marked inferred.',
    'The fence, its partial dismantling and the later claim are documented; "all missing" is not.',
    'documented (fence, partial dismantling, claim, wooden fences torn down along the road by 17 Nov); open gap (all missing, 4 Jul)',
    'All fences missing on 4 Jul (PDF) against portions dismantled (NPS); wooden fences torn down along the road by 17 Nov (Tribune)',
    'Tier overlay on the segments; end state marked inferred.',
    'Klingel farm along the Emmitsburg Road, 2-4 Jul.',
    'None.',
    'Accept the documented state; read the Klingel claim and the Stone Sentinels page when reachable.',
    'open (re-checked 2026-11-13; register EG-0097 carries the earlier text)')

# ---------------------------------------------------------------- 12 rain and hospital sites
add(12, 'Plum Run overflow, drowned wounded and "cold" rain on 4 Jul: rain documented, the rest not', 'R15, R14, R13', 'evidence missing',
    'S-069, S-070 (' + JS + '). The PDF prints Plum Run and the low ground as Normal -> Overflowed; some wounded drowned; heavy rain, 4 Jul (heavy from about 21:00; AMS, SP-Meteo), and the hospital sites as Operating -> Cold rain on exposed wounded, 4 Jul (HN-Spangler). '
    'Re-matched 2026-11-13: it rained heavily on 4 Jul and through the night (Haskell, July 1863: "floods of rain on that day"; Lee, OR27-2-R426 p.322: "A heavy rain continued throughout the night" after dark; Wright R539 p.625: "marching through drenching rain" about midnight of 4-5 Jul); '
    'the 2nd Pennsylvania Cavalry history (PA vol.2 p.806) speaks of wounded "drowning during the rain that ensued in the evening" at the Rock Creek hospitals without a date and without the name Plum Run; Letterman (OR27-1-R016 p.196) says "the tents and other appliances, which are as necessary, were not available until July 5". '
    'Not found: Plum Run overflowing, any count of drowned, heavy rain "from about 21:00", the temperature ("cold"), and which sites were exposed.',
    'The plan\'s sources are a meteorology page and a HistoryNet article (host refused on 2026-11-13); no local text names Plum Run in flood or gives the temperature.',
    BASE + '; Hospital Scenes, Jacobs and the July 1863 newspapers.',
    'Heavy rain on 4 Jul with onset at dark (Lee) instead of 21:00; no tents until 5 Jul (Letterman) so exposed wounded are an inferred state at sites without cover; Plum Run overflow an inferred marked state; wounded drowned by Rock Creek inferred, date open; no temperature claim.',
    'The rain and the lack of tents are documented; exposure is inferred from those two facts; overflow and drowning are open.',
    'documented (heavy rain 4 Jul, tents not available until 5 Jul); inferred (exposed wounded, drowning by Rock Creek); open gap (Plum Run overflow, 21:00, cold)',
    'Heavy from about 21:00 (PDF) against from dark through the night (Lee)',
    'Tier overlay on the weather and the hospital sites; gap marker on the overflow.',
    'Weather and low ground on 4 Jul; rain audio.',
    'None; the weather defaults of the timeline stay with the weather shard.',
    'Accept the documented onset at dark; mark the overflow inferred.',
    'open (proposed 2026-11-13)')

# ---------------------------------------------------------------- 13 photographs
add(13, 'Leister wall and the cemetery gatehouse: dates of the July 1863 photographs and the wall height', 'R12, R13, R14', 'evidence partly present / tooling or access',
    'S-075 (' + JS + '). The PDF prints Leister wall, gatehouse: As after battle -> Photographed, 6 Jul (Gardner) and 7 Jul (gatehouse), sources GD-14708 and GD-Housch (Gettysburg Daily). '
    'Re-checked 2026-11-13: the Library of Congress record of the Gardner Leister photograph (LC-DIG-cwpb-00887, item 2018666296) reads only "Created/published: 1863 July."; the record of the War Photograph & Exhibition Co. stereograph "General Meade\'s Headquarters at Gettysburg" (item 2011660054, read in full at the second request) gives "[1863 July]" (a supplied date), attributes it to Gardner "based on LC-B811-259" and lists "Stone walls" among its subject headings; '
    'NPS (Buildings and Farms Then and Now) says Brady photographed the gate house "approximately two weeks after the battle" and that the gatehouse "suffered only moderate damage"; 7 Jul is the date of Tillie Pierce\'s passage through "the now shattered archway of the lodge" (memoir, 1889), not of a photograph. '
    'Readings of the pictures viewed 2026-11-13 (not quotations; derivatives in tmp/photomatch/loc): the Leister view (cwpb.00887) shows white picket fences standing in the yard beside the house, a low rubble stone wall along the road with a broken rail fence and a gate frame in front of it, dead horses on the road and in the field, and trees in leaf; the gatehouse view (cwpb.01640, left half) shows an intact brick arch, broken panes in the right-hand windows and a pile of splintered fence boards and posts left of the gate; '
    'a further LOC stereograph catalogued "1863 July" (item 2018672035, cwpb.00658) shows leafless trees and so cannot be a July view. No scale is available, so the height of the Leister wall (24 in by one critic; 48-52 in on the rebuilt wall) cannot be measured here.',
    'The photographs\' own dates are month-only in the Library of Congress records; the days in the plan rest on Gettysburg Daily (' + 'www.gettysburgdaily.com refused the connection on 2026-11-13' + '); the master TIFFs and a scale reference are needed to measure the wall.',
    BASE + '; Library of Congress API records 2018666296 and 2011660054 (www.loc.gov, reachable) and the local LOC derivatives viewed with the image reader; Tillie Pierce 1889.',
    'P-13 and FEN-leister drawn from the photograph reading (low rubble wall, picket fences standing in the yard at the time of the photograph, a broken rail fence at the gate), dated July 1863; gatehouse with broken panes, splintered fence boards and an intact arch; no profile from the rebuilt wall.',
    'The photographs exist and are dated to July 1863; the readings of what they show are inferred; the days 6 and 7 Jul and the wall height are open.',
    'documented (photograph dates July 1863; Brady\'s gatehouse view about two weeks after); inferred (readings of the pictures); open gap (6 Jul, 7 Jul as photograph dates; wall height)',
    'Wall height 24 in (critic) against 48-52 in (rebuilt wall, NPS); photograph days 6 Jul / 7 Jul (PDF) against July 1863 / about two weeks after (LOC, NPS)',
    'Tier overlay on the wall; photograph dates shown as "July 1863".',
    'Leister yard wall and the cemetery gatehouse.',
    'None; a photo-matching pass for the wall height (scale from the house) and the master TIFFs.',
    'Hand the wall height and the leafless-tree negative to the photo-matching workstream.',
    'open (re-checked 2026-11-13; register EG-0102 carries the earlier text)')

# ---------------------------------------------------------------- 14 railroad
add(14, 'Gettysburg Railroad: repair start documented, reopening date (10 Jul or 1865) not', 'R14, R07', 'source conflict / evidence missing',
    'S-076 (' + JS + '). The PDF prints the railroad as Cut -> Traffic resumes, 10 Jul (Wikipedia; "one source says 1865"). Re-matched 2026-11-13: Haupt\'s dispatch of 4 Jul 1863 from Hanover Junction (OR27-3 p.522) says he will repair the broken bridge between Hanover Junction and Littlestown, "commence to send off wounded; then return and take the Gettysburg Railroad, and commence repairing it". '
    'The only local timetable (the Compiler\'s standing "Change of Time" advertisement) appears in the issues of 13, 20 and 27 Jul alike and does not date the reopening; no text gives 10 Jul or 1865; a Library of Congress search of Chronicling America for 6-20 Jul 1863 returned six results (Iowa, Illinois and Maine papers of early July), none on the railroad.',
    'The reopening date lies in company or military-railroad records that are not local; the plan\'s source is Wikipedia (not admissible).',
    BASE + '; OR27 pt.3, the July 1863 newspapers.',
    'Repairs begin after 4 Jul (documented); the two reopening values stay selectable scenarios with no default.',
    'The start of repairs is documented; the reopening is not.',
    'documented (repair start after 4 Jul); open gap (reopening)',
    'Traffic resumed 10 Jul (PDF) against one source that says 1865',
    'Gap marker on the reopening.',
    'Railroad scene after 4 Jul.',
    'None.',
    'Read the U.S. Military Railroads construction records when reachable.',
    'open (proposed 2026-11-13)')

# ---------------------------------------------------------------- 15 Letterman and barns
add(15, 'Camp Letterman dates and the Rose and Codori barns: the printed dates have no local source', 'R14, R13', 'source conflict / evidence missing',
    'S-077, S-079 (' + JS + '). S-077: the PDF prints Camp Letterman as Farm -> Construction July 10; opens July 20 or 22 (flag); closes Nov 20 (CWMed-Letterman, ABT-Letterman, CWN-Letterman; conflict C-044). Re-matched 2026-11-13: Camp Letterman General Hospital was established east of Gettysburg and over 20,000 wounded of both armies passed through its tented wards (NPS Gettysburg Overview); '
    'Letterman (OR27-1-R016 p.197) left Dr. Henry Janes "in charge of the hospitals at Gettysburg"; by January 1864 the last patients, surgeons, guards, nurses and tents were gone (NPS Overview). No local text gives 10 Jul, 20 Jul, 22 Jul or 20 Nov; a Library of Congress search of Chronicling America for "Camp Letterman" (10 Jul to 31 Dec 1863) returned no result; NPS event pages that a search summary quotes (20 Jul to 19 Nov 1863) were not located and are not cited. '
    'S-079: the Codori barn that stands now is a bank barn of 1884 (NPS Cultural Landscapes Inventory, Pickett\'s Charge Battlefield, 2024: "1884 Built Nicholas Codori barn is built"), so the barn of 1863 is gone; "torn down 1882" and the Rose barn fire of 1910 have no local source (searched in the NPS inventories and records of treatment).',
    'The dates rest on hosts that are not reachable or not admissible (American Battlefield Trust refused the connection on 2026-11-13; Civil War News and Civil War Medicine are not on the reachable list; Stone Sentinels refused) and on the NPS event pages not located.',
    BASE + '; American Battlefield Trust (host refused).',
    'C-044 scenarios (open 20 Jul, open 22 Jul) kept with no default and no local source for either; closing in January 1864 documented, 20 Nov as the end of the patient period only per an unread NPS page; construction from 10 Jul a marked gap; the Codori barn of 1863 absent after 1884 at the latest, 1882 and 1910 marked gaps.',
    'The camp\'s existence, size and emptiness by January 1864 and the 1884 barn are documented; the printed dates are not.',
    'documented (camp existence, 20,000 wounded, empty by January 1864, Codori barn of 1884); open gap (10 Jul, 20/22 Jul, 20 Nov, 1882, 1910)',
    'Opening 20 Jul (ABT) against 22 Jul (CWN, Wikipedia) (C-044); closing 20 Nov (PDF) against January 1864 (NPS)',
    'Scenario selector for the opening; gap markers on the unsupported dates.',
    'Camp Letterman and the barns, outside the default film path.',
    'The C-044 default stays pending owner.',
    'Locate the NPS Camp Letterman event pages on www.nps.gov and read them.',
    'open (proposed 2026-11-13; register EG-0097 carried the earlier Codori text)')

# ---------------------------------------------------------------- 16 land and reburials
add(16, 'Soldiers\' National Cemetery land: the total price of the seventeen acres; the reburial count on 19 Nov resolved (1,188)', 'R22, R14, R21', 'evidence missing / evidence contradicts the PDF',
    'S-080 (open), S-081 (closed) (' + JS + '). The PDF prints 17 acres bought by Wills for about $2,475.87 in late July and August, and the first of 3,512 Union bodies moved on 27 Oct, 1,258 reburied by 19 Nov, work due to finish March 1864 (Oct 17 / Oct 27 start conflict; W-CONS, GC-COMP). '
    'Re-matched 2026-11-13: about seventeen acres were bought through David Wills, the Governor\'s agent, in five lots at $135 to $225 an acre (Wills, report of 21 Mar 1864); NPS (Unrau, Administrative History, 1991) dates the first twelve acres to 14 Aug 1863 (sold by the Evergreen Cemetery Association) and five more acres to a day or two later; $2,475.87 is the cost of "a site" in the Governor\'s statement and, in NPS\'s account, the price of the twelve acres; '
    'no official text gives the total for the seventeen acres, and a New-York Daily Tribune correspondent writing on 17 Nov 1863 (Library of Congress, Chronicling America, issue of 21 Nov) says "some seventeen acres of land were purchased for the sum of $3,150" (the OCR prints a garbled currency sign). '
    'Reburial: the contractor began exhuming on Tuesday 27 Oct 1863 (Weaver, Cemetery Report 1867; NPS CLR), the first reinterment in the national cemetery (from Gettysburg\'s Presbyterian graveyard) was about 17 Oct, 3,512 bodies in all, completed on 18 Mar 1864 after a winter stop; '
    'on 19 Nov the superintendent\'s list printed in the Tribune of 21 Nov 1863 ("a list of the remains already interred in the Cemetery, with the States they represent", figures from Mr. Townsend of Rahway, N. J., "the Superintendent of the grounds") totals 1,188 (606 by State, 582 unknown; read from the page image, the OCR keeps "188"), the NPS typescript says "1,188 bodies had been reinterred" and the CLR "approximately 1,200 graves"; 1,258 is in no text.',
    'No official text gives the total price of the seventeen acres; the Pennsylvania Governor\'s accounts and the deeds are not local. The reburial rows are resolved by the superintendent\'s list and need no further evidence.',
    BASE + '; Wills 1864 and the cemetery reports to 1874; Everett 1864; Evening Star 19-21 Nov 1863 and New-York Daily Tribune 20-21 Nov 1863 through the Library of Congress JSON API and tile.loc.gov (reachable, one request per second).',
    'Area 17 acres (documented); price printed as $2,475.87 for the twelve acres sold on 14 Aug 1863, the total for the seventeen acres shown only as a newspaper figure (about $3,150) with the official total open; the two start dates are two sequential facts (17 Oct first reinterment, 27 Oct contractor); count on 19 Nov 1,188 with the PDF 1,258 kept visible as unsupported; completion 18 Mar 1864.',
    'Area, the lots, both start dates, 3,512, the count of 1,188 on 19 Nov and the completion are documented; the official total price of the seventeen acres is open.',
    'documented (17 acres, lots, $2,475.87 for twelve acres, newspaper total about $3,150, 27 Oct and about 17 Oct, 3,512, 1,188 on 19 Nov, 18 Mar 1864); open gap (official total price, 1,258)',
    'Total price of the seventeen acres: $2,475.87 (PDF, but the price of twelve acres) against about $3,150 (Tribune); count on 19 Nov: 1,258 (PDF) against 1,188 (superintendent\'s list, NPS typescript) and about 1,200 (CLR)',
    'Price printed with its basis; count shown as 1,188 with the PDF figure marked unsupported.',
    'Cemetery state on 19 Nov 1863 (default film path end).',
    'None.',
    'Print the price with its basis; adopt 1,188 as the documented count (the PDF 1,258 stays visible, marked).',
    'open (proposed 2026-11-13; S-081 closed, S-080 open for the official total)')

# ---------------------------------------------------------------- 17 cemetery boundary, platform, surroundings
add(17, 'Soldiers\' National Cemetery on 19 Nov 1863: the boundary fence, the platform and the surrounding ground', 'R22, R14, R21', 'conflict between sources / evidence missing',
    'S-082, S-083, S-084 (' + JS + '). The PDF prints an iron fence separating the new cemetery from Evergreen, the platform on the Evergreen side of the dividing fence (Wills 1992, Frassanito 1995), and cut and scarred trees, broken fences, rifle pits and discarded gear around the cemetery with the Blue Ridge visible (W-CONS). '
    'Re-matched 2026-11-13: the cemetery was laid out in semicircular plots to Saunders\'s design (his plan shown to Lincoln on 17 Nov; NPS CLR 2017; CLI 2019) and was "unfinished" on 19 Nov; a New-York Tribune correspondent on the ground on the morning of 19 Nov describes the hillside as laid out "in half circles around a common center" with a monument proposed, the plan designed by William Saunders, and says the grounds as a whole "will be surrounded by a substantial stone" [wall] (future tense) without mentioning an iron fence in the legible text; '
    'the Evergreen Cemetery Association made "an open iron railing enclosure of ordinary height ... upon the division lines" a condition of the sale of 14 Aug 1863 (NPS Administrative History, Unrau 1991, quoting the agreement), but the boundary fence as built is described three ways: a low pipe-rail fence with a hedge (NPS CLI 2019, Saunders\'s design), a three-foot iron fence behind an arborvitae hedge (NPS), "simply a low iron fence" (Bartlett 1874), the seven-foot ornate iron fence being of 1935; nothing local shows any of them standing on 19 Nov 1863. '
    'Platform: built by 18-19 Nov near the flagstaff on the border of the two cemeteries (Becker sketch; NPS CLR 2017; NPS article); placed on the Evergreen side (NPS CLR, CLI 2019, the web page), at the later monument site or "in the centre" of the grounds (an older NPS typescript; Adams Sentinel 24 Nov 1863; Evening Star 20 Nov 1863: the head of the procession reached the platform "in the centre of the cemetery"), or straddling the boundary (a 2023 Library of Congress blog, host refused, not read); a Tribune correspondent calls it "the inadequately sized platform"; no dimension found. '
    'Surroundings: "the surrounding hills ... dimly seen through the November mists" (Adams Sentinel 24 Nov 1863); a Tribune correspondent who drove the Emmitsburg road on 17 Nov saw rifle-pits along its whole length, knapsacks, canteens, cups, bayonets, cartridge boxes, shoes, stockings and remnants of coats and vests scattered through the fields and woods and along the road, wooden fences torn down and the stone ones used as breastworks, and on the first day\'s field "Trees marked, limbs and branches torn"; Tillie Pierce saw on 7 Jul that "Fences had disappeared, some buildings were gone, others ruined"; Evergreen\'s own road frontage had "a temporary white-painted wood plank fence and entrance gate" before the battle (CLR). '
    'Nothing local describes broken fences, scarred trees, rifle pits or gear on the cemetery ground itself on 19 Nov, or the Blue Ridge; the large derivative of the crowd photograph LOC ppmsca-32850 (viewed) shows freshly dug plots, wooden headboards and bare saplings and no readable fence line.',
    'No contemporary description of the boundary fence or the platform\'s footprint is local; Wills (1992) and Frassanito (1995) are print sources; the LOC blog host refused the connection on 2026-11-13 (blogs.loc.gov, CONNECT 403); the plan\'s W-CONS is Wikipedia (not admissible).',
    BASE + '; the cemetery commission reports (Wills 1864, Weaver 1867, Bartlett 1874), Everett 1864, the Sentinel and Compiler of Nov 1863; the Evening Star of 19-21 Nov 1863 and the New-York Daily Tribune of 20-21 Nov 1863 (Library of Congress JSON API and tile.loc.gov); one photograph of the crowd viewed.',
    'Semicircle drawn (documented); the boundary fence on 19 Nov an open-gap state with three selectable forms and no default (open iron railing as stipulated, low pipe-rail fence with hedge, low iron fence); no iron fence and no stone wall as built facts in the dedication scene until a source dates them; platform standing by 18 Nov with three selectable placements and no default, drawn small ("inadequately sized"); surroundings: on the Emmitsburg road rifle-pits, scattered gear and no standing wooden fences (documented for 17 Nov), marked trees on the first day\'s field, the same features on the cemetery ground itself only as marked plausible-procedural placements, distant hills in haze.',
    'The layout, the stipulation, the three descriptions of the fence, the platform\'s existence and three placements, the November state of the Emmitsburg road and the hills in mist are documented; the fence\'s state on 19 Nov, the platform\'s dimensions and the detail of the cemetery ground are open.',
    'documented (semicircle, stipulation of 14 Aug, three descriptions of the fence, platform built by 18 Nov, three placements, hills in mist, Emmitsburg road state on 17 Nov); inferred (the same features on the cemetery ground); open gap (fence standing on 19 Nov, footprint, Blue Ridge)',
    'Boundary fence: open iron railing / low pipe-rail fence with hedge / low iron fence; platform: Evergreen side / later monument site or centre of the cemetery / straddling the boundary; no default for either',
    'Scenario selectors on the fence and the platform; plausible-procedural tags on the cemetery-ground surroundings.',
    'The Nov 19 dedication scene and the Emmitsburg road in November.',
    'None for the evidence; the platform placement default stays an owner decision.',
    'Read the LOC blog and the print sources from a machine with access; view the photographs of 19 Nov (Gardner, ppmsca-32850 to 32852) at full size for fence lines.',
    'open (re-checked 2026-11-13; register EG-0098 carries the earlier text)')

# ---------------------------------------------------------------- 18 season, weather, crowd, evening
add(18, 'Nov 19 1863: leaf and grass state, weather (E-007), the crowd and the evening of 18 Nov', 'R22, R15, R20', 'source conflict / evidence missing',
    'S-085, S-086, S-087, S-088 (' + JS + '). S-085: the PDF prints trees leaf-off or nearly so and grass dormant (inferred): no text states it; the large derivative of the crowd photograph (viewed) shows bare saplings and low dry grass, a reading of a picture. '
    'S-086: the PDF prints sun and shadow computed for 39.82 N, 77.23 W and the cloud default cloudy clearing to sun at the prayer (E-007: cloudy per Wikipedia, "perfect" morning per a blog). Four contemporary newspaper statements describe the morning: the Adams Sentinel of 24 Nov 1863 ("Day dawned on Thursday with an unclouded sky, giving assurance of lovely weather"), the New-York Daily Tribune of 21 Nov (a correspondent on the morning of 19 Nov: "The sky is bright, and all nature has donned her best attire"), the Evening Star of 19 Nov ("The weather is fine to-day") and of 20 Nov ("Thursday morning opened bright and beautiful"); the Sentinel adds the distant hills "dimly seen through the November mists". None says cloudy; "sun at the prayer" and the afternoon sky are in no text; the sun position is a computation, not a source claim. '
    'S-087: the PDF prints about 15,000 (W-CONS) to 15,000-20,000 (EWH) with soldiers, civilians, widows, boys at the edge, six governors, reporters; the local estimates are over 10,000 (NPS article), some 15,000 (NPS monument page), "about 15,000" civilians between the stand and the military and "at least 15,000" in town with "four or five thousands" at the grounds ahead of the procession (New-York Tribune of 20-21 Nov), "at least twenty thousand" round the stand and "from twenty to forty thousand" in the town (Adams Sentinel); the Evening Star calls it "probably as large if not a larger number of people than ever assembled before at any one celebration in this country". '
    'The Tribune documents a military escort of one squadron of cavalry, two batteries of artillery and a regiment of infantry, civilians "including men, women, and children", "the attendance of ladies was quite large", and on the platform Governors Curtin, Seymour, Coburn, Morton, Bradford and Parker, Governor Brough, ex-governors Tod, Wright and Dennison and Pierpont (OCR garbled, read from the surrounding words; no count is printed); widows, boys at the edge and reporters are not found. '
    'S-088: the PDF prints celebrating crowds, bands and alcohol in the streets on the night of 18 Nov (EWH). The President arrived about 5 o\'clock (Tribune, letter of 18 Nov), "yesterday afternoon" (Tribune and Star dispatches of 19 Nov), "last evening" (Tribune) or at 6½ o\'clock on Wednesday evening (Evening Star, 20 Nov, read from the page image); a large gathering greeted him at the depot, "a large number of persons continued to linger round the residence", the band of the 5th New York Artillery serenaded him after supper and then Secretary Seward ("Serenades seem to be the order of the evening"), and the train with the Governors came in nearly at midnight (Tribune); torches and alcohol are in no text, including the two newspapers read in full for 19-21 Nov.',
    'The weather conflict E-007 is a conflict of sources and only the owner decides a default; the New York Times and Philadelphia Inquirer reports of 19-20 Nov are not local; the plan\'s EWH is Eyewitness to History (a compilation site, host refused on 2026-11-13) and W-CONS is Wikipedia (not admissible).',
    BASE + '; the Adams Sentinel and Compiler of Nov 1863, Everett 1864, Bartlett 1874; the Evening Star of 19-21 Nov 1863 (pages 1-4) and the New-York Daily Tribune of 20-21 Nov 1863 (pages 1-8) through the Library of Congress JSON API and tile.loc.gov (reachable, one request per second); one page image region viewed for the hour of the arrival; one photograph viewed.',
    'Leaf-off trees and dormant grass kept as inferred; weather a selectable value (a bright, unclouded morning with distance haze is documented by four newspapers; cloudy-clearing has no local source and is marked unsupported); crowd carried as a range with its basis and no default; composition: military escort, civilians including many ladies, the officials and governors named, with widows and boys at the edge as plausible-procedural; the evening of 18 Nov as a crowd-and-music scene with the arrival hour a selector (about 17:00, afternoon, 18:30), the serenades documented and no torches or alcohol as documented elements.',
    'A bright, unclouded morning, haze, six crowd estimates, the military escort, ladies and the governors present, the arrival hours, the band and the serenades are documented; the leaf state, the cloud default, widows, boys, reporters, torches and alcohol are not.',
    'documented (bright morning, mist, crowd estimates, military escort, ladies, governors named, arrival hours, band and serenades of 18 Nov); inferred (leaf-off, dormant grass, sun position); open gap (cloudy clearing to sun at the prayer, widows, boys, reporters, count of governors, torches, alcohol)',
    'Weather: cloudy clearing to sun (PDF, Wikipedia) against perfect morning (blog) against bright, unclouded morning with distance haze (four newspapers); crowd 10,000+ / about 15,000 / 20,000+ / 20,000-40,000; arrival on 18 Nov about 17:00 / afternoon / 18:30',
    'Tier overlay on the weather, the crowd, the composition and the evening; weather selector; arrival-hour selector.',
    'The Nov 19 dedication scene and the evening of 18 Nov; sky and light; band music.',
    'E-007 default stays pending owner.',
    'Locate the New York Times and Philadelphia Inquirer reports of 19-20 Nov when reachable; read Eyewitness to History from a machine with access.',
    'open (proposed 2026-11-13)')


def main():
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


main()
