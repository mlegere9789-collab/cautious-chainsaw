// Writes docs/data-audit/STORY-STARS.md: the evidence per story star.  The numbers (clock, uncertainty, distance, offsets) are measured from a built tree
// (STARS_DIST=<dist of the stack R1c + CLOCK + DATA + MON>), the sentences about the sources are written here and every page they cite is checked by stars-sources.mjs.
//   STARS_DIST=<stack dist> node tools/t0/mon/stars-doc.mjs [--results-md <markdown file with the test results, appended as the last section>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPEC } from './stars-spec.mjs';
import { measure } from './stars-measure.mjs';
import { stateAt, rows, m, mA } from './stars-audit.mjs';
import { CLAIMS } from './stars-sources.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const legacy = JSON.parse(fs.readFileSync(path.join(REPO, 'tmp', 'mon-stars', 'legacy-diff.json'), 'utf8'));
const M = Object.fromEntries(measure().map((x) => [x.id, x]));
const L = Object.fromEntries(legacy.map((x) => [x.id, x]));

const EV = {
  mon_20me_lrt: {
    time: 'Tick 267 is the clock anchor "Vincent reaches Little Round Top" (16:30; Rice and Conner put the brigade in place about 16:00, Hunt has Hazlett\'s guns on the hill about 16:30). Conner (27/1 p.630): the 44th New York was placed on the hill about 4 PM with the 83rd Pennsylvania on its left. The text says from about 4:30 PM, the clock reads about 4:30 PM. The legacy tick 268 read about 4:40 PM.',
    place: 'Record 173 of the monument array (20th Maine Infantry Monument, Little Round Top) and the Park marker in OpenStreetMap (20th ME Chamberlain) agree to 3 m. The legacy star stood near the Regulars\' monuments on Wheatfield Road.',
    unit: 'U-20ME, unchanged. DATA\'s audit (section 8) leaves the Little Round Top rows 0.4 to 0.5 km north of the Park\'s monuments.',
    text: 'Kept (DATA). "Extreme left of the line": Chamberlain 27/1 p.623. The hour of the bayonet charge is not recorded by any participant: Chamberlain has about an hour of severe fighting before it (p.624), Woodward has the enemy falling back nearly 6 PM (p.632), later accounts run from 5:10 to after 7 PM (time-facts R066). The card says so.',
    open: 'The hour of the charge. The unit is drawn north of its monument.',
  },
  mon_15al_lrt: {
    time: 'Tick 268 (about 4:40 PM, +-34 min): Hood\'s assault stepped off about 16:00 (anchor 256) and the 15th Alabama\'s first charge followed. The text names no hour.',
    place: 'The Park has no monument for the 15th Alabama on Little Round Top: the 1921 War Department list of the Park\'s markers places the Alabama regiments of Law\'s brigade (4th, 15th, 44th, 47th, 48th) on Confederate Avenue, section 5 (the OCR of its columns is poor); the monument array has no record for the 15th and OpenStreetMap maps no node. The legacy star stood 622 m away, 50 m from the 86th New York\'s monument. It now stands at the Park\'s tablet for Law\'s Alabama brigade on the south-west slope of the hill, 54 m from the 83rd Pennsylvania\'s monument (OpenStreetMap node 7128731222, named "CS HQ Law AL Brigade" by the mapper).',
    unit: 'C-15AL, unchanged; drawn 595 m from the tablet.',
    text: 'Rewritten from Oates\'s own report (27/2 p.392-393): his right met the left of the Union line; he ordered a charge; the enemy, reinforced, then charged him five times and was repulsed. The legacy text (four assaults by his men, a company sent for water) is his postwar account, which is not in the reports; the card says so.',
    open: 'The star marks the brigade tablet, not a regiment marker; what that tablet marks exactly (headquarters, farthest advance) was not read from the tablet itself. The card says the Park has no marker for the regiment here.',
  },
  mon_iron_brig: {
    time: 'Tick 28 is the anchor "Reynolds killed" (10:15, +-35, Documented: Wadsworth 27/1 p.266 and Doubleday p.245 both say about 10.15, in the beginning of the attack). The legacy tick 20 read about 8:55 AM against a text that says 10:15.',
    place: 'Record 219 of the monument array (24th Michigan Infantry Monument, "Iron Brigade"), 0 m; the legacy star was 2 km away.',
    unit: 'U-I-1-1, the Iron Brigade itself (the legacy id U-I-1-2W is not in the order of battle; the first MON round had used the 2nd Wisconsin).',
    text: 'Kept (DATA): Doubleday p.245 "hurled the enemy back into the run ... nearly 1,000 prisoners - all from Archer\'s brigade", Archer brought in by Private Patrick Maloney of the 2nd Wisconsin.',
    open: 'DATA\'s audit leaves the Herbst and McPherson rows 0.8 to 0.9 km from the monuments: the brigade is drawn 736 m south of its monument.',
  },
  mon_reynolds: {
    time: 'Tick 28, same anchor: Wadsworth "about 10.15", Doubleday "about 10.15", Howard "11.15" (p.696); the sequence bounds in the anchors file are 10:00 to 10:50. The card gives both.',
    place: 'Record 84 (Major-General John F. Reynolds Killed Marker, Herbst Woods) and OpenStreetMap "US General John F. Reynolds KIA": 0 and 1 m.',
    unit: 'U-I-1-1 (the legacy link was the 19th Indiana, because a row note says Reynolds was killed there; no report says so).',
    text: 'Rewritten. The legacy "directing the Iron Brigade into position" is in no report: Doubleday (p.245) was "overseeing" Meredith\'s brigade when he learned that Reynolds had been shot, Wadsworth (p.266) has Reynolds fall when the right (Cutler\'s brigade) was sharply engaged. The card now says he fell as the First Corps went into action. Heth blames a shell of Pegram\'s battery (27/2 p.637); that is not on the card.',
    open: 'Where exactly Reynolds stood when he was hit: the Park\'s marker is the only evidence. The unit is drawn 723 m south.',
  },
  mon_cushing: {
    time: 'Tick 549 (about 3:30 PM, +-30): Pickett\'s men reach the wall between the anchors "infantry step-off" (15:00, Contested) and "Armistead over the wall" (15:35); the time-facts row R114 gives 3:10 to 3:45. The text says about 3:30 PM (accounts 3:00 to 3:45).',
    place: 'Record 55 (First Lieutenant Alonzo Cushing Marker, The Angle) and OpenStreetMap "Alonzo Cushing": 5 m apart.',
    unit: 'U-ART-A4US, unchanged; drawn 184 m from the marker.',
    text: 'Kept (DATA): Webb 27/1 p.429 "fell, mortally wounded, at the fence by the side of his guns ... fought for an hour and a half after he had reported to me that he was wounded in both thighs".',
    open: 'The minute: accounts differ by 45 minutes (the card says so).',
  },
  mon_armistead: {
    time: 'Tick 551 is the anchor "Armistead over the wall" (15:35, +-25, Estimated: Webb\'s report has no clock; 20 to 35 minutes after the 15:00 step-off). The text says about 3:35 PM, the clock reads about 3:35 PM.',
    place: 'Record 14 (Armistead marker, "Armistead\'s Last Stand", The Angle); the Park\'s Cushing nodes are 11 m away (the two lie 6 m apart).',
    unit: 'C-I-3-3, unchanged; drawn 206 m from the marker.',
    text: 'Kept (DATA): Harrow 27/1 p.428 "General Armistead passed over the fence with probably over 100 of his command" and "was left, mortally wounded, within my lines". The message and keepsake to Hancock are labelled tradition.',
    open: 'None beyond the unit position.',
  },
  mon_hancock: {
    time: 'Tick 554 (about 3:50 PM, +-28). No report gives the minute. Hancock\'s dispatch (p.366) has him hit after the front attack was repelled; Veazey (p.353) has him hit while giving directions after the 16th Vermont had changed front. That puts it after Armistead\'s break (15:35, anchor 551) and before the collapse of the assault (16:00, anchor 556). The legacy tick was the same.',
    place: 'Record 66 (Major-General Winfield S. Hancock Wounded Marker, South Hancock Avenue); OpenStreetMap "US General Hancock wounded" is 4 m from it and 95 m from the Vermont brigade\'s monument. The legacy star stood 602 m east of it.',
    unit: 'U-II (the Second Corps he commanded), unchanged; drawn 602 m from the marker.',
    text: 'Rewritten: the legacy "about 3:30 PM" had no source (the time-facts row R115 with a range of 3:10 to 3:45 is for Armistead). The card now says late in the repulse, between about 3:35 and 4 PM, no report gives the minute. Kept: Meade 27/1 p.117 "severely wounded" (Hancock and Gibbon), the tenpenny nail (p.366).',
    open: 'The minute.',
  },
  mon_140pa: {
    time: 'Tick 290 (about 6:45 PM, +-30) is the regiment\'s only keyframe in the data. Fraser (27/1 p.394): the brigade marched about 4 PM; Caldwell (p.379): orders came between 4 and 5; Roberts fell "at the commencement of the action" (p.395). So the fight began after about 5 PM and the animation draws the regiment late; the card says so.',
    place: 'Record 446 (140th Pennsylvania Infantry Monument, Sickles Avenue), OpenStreetMap 16 m. The legacy star stood on Little Round Top because the legacy text described the 140th New York.',
    unit: 'U-140PA (the legacy link was Weed\'s brigade id U-V-3-1).',
    text: 'Kept (DATA): Zook\'s brigade (Fraser p.394), the Wheatfield, Colonel Roberts killed (Hancock p.375 "on the 2d", Caldwell p.380 "instantly killed").',
    open: 'The animation\'s timing of the regiment; the unit is drawn 532 m from the monument.',
  },
  mon_83pa: {
    time: 'Tick 267 (about 4:30 PM). The sources disagree: Woodward (27/1 p.632) has the regiment placed at about 2.30 PM and attacked at 3.15, Conner (p.630) has the 44th New York with the 83rd on its left placed about 4 PM, Rice has the brigade barely formed when Hood\'s division attacked. The clock follows the brigade reports; the card gives Woodward\'s times.',
    place: 'Record 405 (83rd Pennsylvania Infantry Monument with the Vincent statue); OpenStreetMap "83rd PA Woodward" is 32 m from it (the Park\'s two nodes differ by that much).',
    unit: 'U-83PA (the legacy link was U-V-3-1).',
    text: 'Kept (DATA): Woodward p.632 "the Forty-fourth New York on my right, the Twentieth Maine on my left".',
    open: 'Woodward\'s earlier times; the unit is drawn 378 m from the monument.',
  },
  mon_irish_brig: {
    time: 'Tick 290 (about 6:45 PM, +-30; first keyframe at 285). Kelly (27/1 p.386): "About 5 p.m. received orders to march by the left flank ... about three-quarters of an hour engaged". The animation draws the brigade about an hour later than Kelly\'s clock; the card says so. The text names no hour.',
    place: 'Record 332 (Irish Brigade Monument, Sickles Avenue, Rose Woods) and OpenStreetMap 3 m; the legacy star was 195 m away.',
    unit: 'U-II-1-2, unchanged; drawn 438 m from the monument.',
    text: 'Kept (DATA): Caldwell p.379 puts the Second Brigade into the Wheatfield; the boxwood sprigs are labelled tradition.',
    open: 'Timing of the animation; position.',
  },
  mon_1mn: {
    time: 'Tick 302 is the anchor "1st Minnesota\'s charge" (19:10, +-25, Estimated: the reports describe it without a time; after Wilcox began to advance, before dusk). The legacy tick 295 read about 7:00 PM. The text names no hour.',
    place: 'Record 222 (1st Minnesota Infantry Monument, South Hancock Avenue, where the charge was made), OpenStreetMap "1st MN Colvill" 0 m. The legacy star stood at the regiment\'s July 3 position, 566 m north.',
    unit: 'U-1MN (the legacy link was Smyth\'s brigade U-II-3-2).',
    text: 'Rewritten. The legacy "Charged Willcox\'s brigade" is Fox\'s wording (27/1 p.371 says "a regiment of the enemy"); the card now gives both. The numbers are Fox\'s (p.402): 262 engaged, 215 killed and wounded in the charge, 224 for the battle.',
    open: 'The hour (Estimated); the unit is drawn 389 m from the monument.',
  },
  mon_72pa: {
    time: 'Tick 549 (about 3:30 PM, +-30), Pickett\'s men at the wall. The text names no hour.',
    place: 'Record 398 (72nd Pennsylvania Volunteer Infantry Monument, Hancock Avenue, the crest) and OpenStreetMap, 13 m. The regiment\'s second Park monument (record 397) stands 49 m west of it, nearer the wall; the card follows Hancock and Webb (the 72nd stood behind the crest, then was ordered up to hold it).',
    unit: 'U-72PA (the legacy link was Hall\'s brigade U-II-2-3); drawn 93 m from the monument.',
    text: 'Kept (DATA): Webb p.428 "held in reserve under the crest" and "ordered up to hold the crest"; Hancock p.374 puts the 69th and 71st behind the wall.',
    open: 'None beyond the unit position.',
  },
  mon_26nc: {
    time: 'Tick 95 (about 6:45 PM, +-60), the regiment\'s only keyframe on July 1: its survivors in bivouac. The text names no hour. The legacy tick 16 (about 8:10 AM) was before the brigade came up.',
    place: 'Record 36 (26th North Carolina Infantry Monument, Meredith Avenue, Herbst Woods), OpenStreetMap 19 m; the legacy star was 1.5 km away. The regiment\'s second monument (record 35, The Angle) marks July 3.',
    unit: 'C-26NC (the legacy link was Brockenbrough\'s brigade C-III-2-2).',
    text: 'Kept (DATA): Fox p.555-556, over 800 engaged (820 present), 86 killed and 502 wounded, 588 in all, mostly in the first day\'s fight.',
    open: 'The animation does not draw the regiment\'s fight on July 1 (neither does it draw its brigade between ticks 11 and 120), so the unit is 946 m from the monument. The card says so.',
  },
  mon_16vt: {
    time: 'Tick 548 (about 3:25 PM, +-33), Pickett\'s Charge. Stannard gives no clock. The text names no hour.',
    place: 'Record 486 (16th Vermont Infantry Monument, Hancock Avenue) and OpenStreetMap "16th VT Veazey": 6 m.',
    unit: 'U-16VT, unchanged; drawn 206 m from the monument.',
    text: 'Kept (DATA): Stannard 27/1 p.350, the 16th changed front, then was ordered to attack the second column on the flank and took the colors of the 2nd Florida and 8th Virginia. "First day of combat" is replaced by Stannard\'s "for most of them their first battle" (the regiment had been on the skirmish line on July 2).',
    open: 'None beyond the unit position.',
  },
  mon_20nc: {
    time: 'Tick 53 is the anchor "Iverson\'s Pits" (14:30, +-30, Estimated: Doubleday 13:30, Lee 14:30, Howard 14:45). The text names no hour.',
    place: 'The monument array and OpenStreetMap have no separate monument for the 20th North Carolina. The star stands at the Park\'s tablet for Iverson\'s brigade (OpenStreetMap node 6691429275, "CS HQ Iverson NC Brigade", 76 m from the Eternal Light Peace Memorial on Oak Hill); the legacy star stood in Herbst Woods, 1.8 km from Oak Ridge. The name now says brigade.',
    unit: 'C-20NC (the legacy id C-20NC-IV was not in the order of battle); drawn 513 m from the tablet.',
    text: 'Kept and extended: Rodes 27/2 p.553-554, the brigade was cut down by fire from behind a stone wall and many of its men, surrounded, were captured; Wheelock (27/1 p.310) reports bringing in 213 men of the 20th North Carolina with their colors.',
    open: 'No regiment marker; the tablet is the brigade\'s.',
  },
  mon_barlow: {
    time: 'Tick 57 is the anchor "Barlow\'s Knoll overwhelmed" (15:00, +-30, Estimated: Schurz p.728 "about 3 o\'clock", Howard sees the enemy in force at 14:45). The legacy tick 63 read about 3:50 PM against a text that says 3 PM.',
    place: 'Record 49 (Brigadier-General Francis Barlow Statue, Barlow\'s Knoll) and OpenStreetMap, 2 m; the legacy star stood 918 m south.',
    unit: 'U-XI-1-1, von Gilsa\'s brigade, the First Brigade of the division Barlow commanded (the legacy link, kept: Schurz p.729 and Ames p.712 have Barlow hit while the First and Second Brigades fell back; the division record U-XI-1 has no keyframe before tick 68 in the baseline data); drawn 43 m from the statue.',
    text: 'Kept (DATA): Schurz p.728-729, Barlow "was severely wounded, and had to be carried off the battle-field"; Gordon\'s water story is labelled as his own account.',
    open: 'None beyond the unit position.',
  },
  mon_6wis: {
    time: 'Tick 37 (about 11:10 AM, +-30), the anchor "Railroad Cut charge" is 11:00 (Estimated: no report clocks it; Hofmann "engaged at 11 a.m."; Doubleday p.246 says it all took under half an hour before Howard arrived). The text says about 11 AM. The legacy tick 29 read about 10:20 AM.',
    place: 'Record 494 (6th Wisconsin Infantry Monument, North Reynolds Avenue) and OpenStreetMap "6th WI Dawes": 8 m. The monument stands on McPherson Ridge about 300 m from the cut; the legacy star stood 778 m west of it.',
    unit: 'U-6WI; its row at tick 37 is "at the cut", 268 m from the monument.',
    text: 'Kept (DATA): Dawes 27/1 p.276 "7 officers and about 225 men" and the flag of the 2nd Mississippi (p.278).',
    open: 'None beyond the hour (Estimated).',
  },
  mon_avery: {
    time: 'Tick 322 (about 7:45 PM, +-30): the animation\'s row note "Colonel Avery mortally wounded" stands at 322; the anchor "Early attacks East Cemetery Hill" is 20:00 (Hays "a little before 8"). Early (27/2 p.473) calls it the afternoon of July 2; the text names no hour.',
    place: 'No Avery marker was found in the array or in OpenStreetMap. The star stands at the Park\'s tablet for Hoke\'s brigade (OpenStreetMap node 7275995199); the legacy star stood 351 m away, 323 m from the nearest marker. The name now says brigade.',
    unit: 'C-II-1-2, Hoke\'s brigade with Avery commanding (the legacy id C-II-1-4 is Smith\'s brigade, a flank guard on the York road); drawn 434 m from the tablet.',
    text: 'Kept (DATA): Early 27/2 p.471 and p.473, "Colonel Avery, commanding Hoke\'s brigade, was mortally wounded" in the charge on Cemetery Hill; the note to his father is labelled traditional.',
    open: 'Where he fell: not found. The card says so.',
  },
  mon_hood: {
    time: 'Tick 260 (about 4:10 PM, +-30; the unit\'s own keyframe). No report gives the hour (time-facts R058: Low confidence, 4:15 to 5:00; tick 260 reads about 4:10; a site monument said 4:00). The legacy "about 4:30 PM" is removed; the card says no report gives the hour.',
    place: 'No marker for the place where Hood fell was found. The star stands at the Park\'s tablet for Hood\'s Division on South Confederate Avenue (OpenStreetMap node 7128877974); the legacy star was 628 m away. The name now says division.',
    unit: 'C-I-2-1 (Law\'s brigade, as before; Hood\'s Division C-I-2 has no keyframe near tick 260); drawn 572 m from the tablet.',
    text: 'Kept: Lee 27/2 p.298 "General Hood in the arm". Removed: the hour.',
    open: 'The hour and the place.',
  },
  mon_greene: {
    time: 'Tick 320 (about 7:40 PM, +-30): the anchor "Johnson attacks Culp\'s Hill" is 19:20 (Greene "a few minutes before 7 p.m."), the attack was discontinued about 10 PM (Geary 27/1 p.827) and the I and XI Corps detachments came up in between. The legacy tick 380 read "Night of July 2-3, about 12:25 AM".',
    place: 'Record 63 (General George S. Greene Statue, Culp\'s Hill) and OpenStreetMap, 6 m; the legacy star stood 478 m south of it.',
    unit: 'U-XII-2-3, unchanged; drawn 661 m from the statue.',
    text: 'Kept (DATA): 74 officers and 1,350 men, 1,424 (Geary p.833); detachments of the First and Eleventh Corps (Geary p.827, Meade p.121).',
    open: 'The unit is drawn 661 m south of the statue.',
  },
};

const resultsFile = process.argv.includes('--results-md') ? process.argv[process.argv.indexOf('--results-md') + 1] : null;
const RES = resultsFile && fs.existsSync(path.join(REPO, resultsFile)) ? fs.readFileSync(path.join(REPO, resultsFile), 'utf8').trim() : null;
const out = [];
const P = (s = '') => out.push(s);
P('# Story stars: evidence per star');
P();
P('Generated by `tools/t0/mon/stars-doc.mjs` from a built tree of the stack R1c + CLOCK + DATA + MON (numbers measured, sentences written; every page cited is checked by `tools/t0/mon/stars-sources.mjs`, 65 claims). Date: 2026-10-19. Nothing here says the stars are free of error; the last section lists what was not settled.');
P();
P('## What was checked, and with what');
P();
P('| Item | How | Evidence |');
P('|---|---|---|');
P('| the tick of each story | the story\'s own time statement and the sources, read through the corrected clock (`tools/t0/clock/oracle.mjs`, an independent calculation from `data-src/time/time_anchors.json`); the clock may differ from a time in the text by at most the uncertainty it states (the "give or take" of the anchors) plus the 5-minute rounding | `T0-MONL-17a/b` read the clock the app prints after "Jump to this moment" and compare it with the times in the story text |');
P('| the linked unit | the order of battle (`data/oob`) | `T0-MONL-15`: every unit exists, is on the field at the star\'s tick (own keyframe or its brigade\'s), and `T0-MONL-17a/b`: the unit is selected after Jump and the star glows |');
P('| the star\'s coordinates | the monument record of the 512-monument array (`_A`) or, where the array has none, the Park\'s marker as OpenStreetMap maps it (node id in the spec) | `T0-MONL-15`: every star lies within 5 m of its record or node; the table below also gives the nearest OpenStreetMap marker |');
P('| the story text | every claim against the page of the Official Records or Fox that it cites | `T0-MONL-18` / `node tools/t0/mon/stars-sources.mjs`: 65 of 65 claims match their page |');
P('| the unit\'s position at the tick | the engine\'s rule (the unit\'s last keyframe at or before the tick, after DATA\'s corrections) against the star | the distance is printed on the card ("On the map this unit is drawn about N m from the monument at this moment") and `T0-MONL-17a/b` re-measures it in the browser (within 25 m of the card, at most 1,000 m) |');
P();
P('Jump to this moment now lands on the star\'s own tick for all 20 stars (`JUMP_BY_CLOCK`, `jumpTick`, `clockIsLegacy` and `clockAt` are removed from the runtime; the card has no "moment the text names" any more). When the animation draws the linked unit more than 250 m from the star (15 of the 20), the jump fits the view to the star and the unit, so both are on screen; `T0-MONL-17a/b` checks that for every star.');
P();
P('## The 20 stars at a glance');
P();
P('| # | Star | Unit (legacy) | Tick (legacy) | Clock at the tick (+- min) | Text times | Monument | Unit to star (m) |');
P('|---|---|---|---|---|---|---|---|');
SPEC.forEach((s, i) => {
  const x = M[s.id], lg = L[s.id];
  const shipped = mA.find((q) => q.id === s.id).label;
  const times = [...shipped.matchAll(/\d{1,2}(?::\d{2})?(?: to \d{1,2}(?::\d{2})?)? ?(?:AM|PM)\b/g)].map((q) => q[0]);
  const moved = lg.moved;
  P(`| ${i + 1} | ${s.name} (\`${s.id}\`) | \`${s.unit_id}\` (${lg.oldUnit === s.unit_id ? 'same' : '`' + lg.oldUnit + '`'}) | ${s.tick} (${lg.oldTick === s.tick ? 'same' : lg.oldTick}) | ${x.clock.replace('July ', 'July ')} (${x.sigma}) | ${times.length ? [...new Set(times)].join(', ') : 'none'} | ${x.monument.src}; star moved ${moved} m | ${x.gapM} |`);
});
P();
P('## Per star');
for (const s of SPEC) {
  const e = EV[s.id], x = M[s.id], lg = L[s.id];
  P();
  P(`### ${s.name} (\`${s.id}\`)`);
  P();
  P(`* **Tick ${s.tick}, ${x.clock} (give or take ${x.sigma} min).** ${e.time}`);
  P(`* **Place ${s.lat}, ${s.lng}.** ${e.place}`);
  P(`* **Unit \`${s.unit_id}\`.** ${e.unit}`);
  P(`* **Text.** ${e.text}`);
  P(`* **Source claims checked:** ${[...new Set(CLAIMS.filter((c) => c[0] === s.id).map((c) => `${c[1] === 'or1' ? 'OR 27/1' : c[1] === 'or2' ? 'OR 27/2' : 'Fox'} p.${c[2]}`))].join('; ')}.`);
  P(`* **Open:** ${e.open}`);
}
P();
P('## Position requests for DATA (not done here: the rows are DATA\'s and the owner has not decided)');
P();
P('The stars stand on the Park\'s monuments. The animation draws the linked unit where its keyframes put it, measured at the star\'s tick as follows (the offset is from the monument to the unit). These are the gaps behind the card line "On the map this unit is drawn about N m from the monument"; DATA\'s audit (docs/data-audit/AUDIT.md, section 8) already lists the Herbst and McPherson ground, the Little Round Top, Devil\'s Den and Wheatfield rows among the positions it left unmoved. Moving a unit onto its monument for one tick would pull it away from its brigade and neighbours, so the rows of a whole sector would have to move together.');
P();
P('| Star | Unit | Tick (row) | Gap (m) | Unit lies | Row (lat, lng) |');
P('|---|---|---|---|---|---|');
for (const s of SPEC) {
  const st = stateAt(s.unit_id, s.tick); if (!st) continue;
  const gap = Math.round(m({ lat: s.lat, lng: s.lng }, st)); if (gap < 350) continue;
  const dN = Math.round((st.lat - s.lat) * 111200), dE = Math.round((st.lng - s.lng) * 85300);
  P(`| ${s.id} | \`${s.unit_id}\` | ${s.tick} (row ${st.tick}, ${st.f}) | ${gap} | ${Math.abs(dN)} m ${dN >= 0 ? 'north' : 'south'}, ${Math.abs(dE)} m ${dE >= 0 ? 'east' : 'west'} | ${st.lat}, ${st.lng} |`);
}
P();
P('Below 350 m (DATA\'s own "within" for monuments): ' + SPEC.filter((s) => { const st = stateAt(s.unit_id, s.tick); return st && m({ lat: s.lat, lng: s.lng }, st) < 350; }).map((s) => `${s.id} ${M[s.id].gapM} m`).join(', ') + '.');
P();
P('## What was not settled');
P();
P('* **Positions.** 14 of the 20 linked units are drawn more than 350 m from the monument at the star\'s tick, the largest 946 m (26th North Carolina, whose July 1 fight is not drawn at all) and 736 m (Iron Brigade). The card says so for every star; the animation\'s rows were not changed.');
P('* **Stars without a regiment marker of their own.** 15th Alabama (Law\'s brigade tablet), 20th North Carolina (Iverson\'s brigade tablet), Avery (Hoke\'s brigade tablet) and Hood (his division\'s tablet): the coordinates are the Park\'s tablets as OpenStreetMap maps them, not read from the tablets; what each tablet marks exactly (headquarters, farthest advance, the position at a given hour) is not verified. The card says in each case what the star stands on.');
P('* **Hours.** 11 of the 20 texts name no hour, so their ticks rest on the animation (a keyframe with a note) and the sequence in the reports; the hour of the 20th Maine\'s bayonet charge, of Hancock\'s and Hood\'s wounds and of the 1st Minnesota\'s charge is not recorded by any participant (Contested or Estimated in the anchors file). The 5:10 PM start of the range printed for the 20th Maine\'s charge comes from a secondary timeline (time-facts R066), not from a report.');
P('* **Sources read.** Official Records Series I vol. 27 parts 1 and 2 and Fox, Regimental Losses, as cached OCR from the Internet Archive; the 1921 War Department list of the Park\'s monuments for the 15th Alabama; OpenStreetMap (ODbL, 2026-10-19) for the Park\'s markers. Haskell, Livermore and the Park\'s own database were not used for these stars. OCR was read as printed; a misread page would show as a claim that does not match.');
P('* **Walkthrough.** Not touched. Its Monuments tab names, honours text and the 512 coordinates were not re-verified here (only the coordinates the stars lie on, read-only).');
if (RES) { P(); P('## Test results'); P(); P(RES); }
fs.writeFileSync(path.join(REPO, 'docs', 'data-audit', 'STORY-STARS.md'), out.join('\n') + '\n');
console.log('docs/data-audit/STORY-STARS.md written,', out.length, 'lines');
