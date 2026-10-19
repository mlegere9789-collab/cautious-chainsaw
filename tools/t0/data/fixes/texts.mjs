// DATA fixes in text that is neither a data file nor the story markers: the guided tour (array `th`, 16 stops), the popup alert strings, the Soldier's Eye View
// messages, the retreat line, the Help chunk, the landing page and a few static pages. All are asserted find/replace patches; bundle anchors are also checked
// against the baseline text by the generator. (The Virtual Walkthrough, its stop data `d2` and the 512-monument array are NOT touched.)
export const kind = 'text';
// number of distinct units that have a placement after the id and arrival fixes (fixes/ids.mjs, fixes/prearrival.mjs)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { remapId, preArrival, noteOf } from '../idmap.mjs';
const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'baseline', 'dist', 'data');
const UNIT_ROW = new RegExp(String.raw`^\s*\{"unit_id":"([^"]+)","tick":(\d+),`);
const UNITS = new Set();
const COUNTS = { regiment: 0, battery: 0, brigade: 0, division: 0, corps: 0 };
for (const f of fs.readdirSync(DATA_DIR).filter((x) => /^(placements_|density_).*\.json$/.test(x))) {
  const text = fs.readFileSync(path.join(DATA_DIR, f), 'utf8');
  for (const l of text.split(String.fromCharCode(10))) { const m = UNIT_ROW.exec(l); if (m && !preArrival(m[1], m[2])) UNITS.add(remapId(f, m[1], m[2], noteOf(l))); }
  // a pretty-printed file (density_day3_cavalry.json): one key per line, no id remaps or arrival rules apply to its rows
  if (!/^\s*\{"unit_id"/m.test(text)) for (const m of text.matchAll(/"unit_id":\s*"([^"]+)",\s*"tick":\s*(\d+)/g)) if (!preArrival(m[1], m[2])) UNITS.add(m[1]);
}
for (const u of UNITS) { if (/^[UC]-ART|^U-HAB|^C-HAB/.test(u)) COUNTS.battery++; else if (/^[UC]-[IVX]+$|^[UC]-CAV$/.test(u)) COUNTS.corps++; else if (/^[UC]-[IVX]+-\d$|^[UC]-CAV-\d$/.test(u)) COUNTS.division++; else if (/^[UC]-[IVX]+-\d-\w+$|^[UC]-CAV-\d-\w+$/.test(u)) COUNTS.brigade++; else COUNTS.regiment++; }
export const UNIT_COUNT = UNITS.size;
const UC = String(UNIT_COUNT);
const J = (id, target, find, repl, cls, before, src, expect = 1) => ({ id, target, find, repl, expect, cls, before, src });
const T = (id, find, repl, cls, before, src, expect = 1) => J(id, 'js', find, repl, cls, before, src, expect);
export default [
  // ---- popup alert strings (unit panel)
  T('DATA-pop-1mn', '"★ Highest Union regimental casualty rate: 85.5% in 15 minutes"', '"★ Highest Union regimental loss in Fox\'s tables: 224 casualties of 262 engaged (85.5%) over the battle, 215 of them on July 2"',
    'wrong-claim', '"85.5% in 15 minutes"', 'Fox p.26, p.36, p.402; ledger WSD-12'),
  T('DATA-pop-26nc', '"★ Highest Confederate regimental casualties: 588 total"', '"★ 588 killed and wounded of over 800 engaged (Fox), among the heaviest regimental losses of the battle"',
    'unsupported-claim', '"Highest Confederate regimental casualties"', 'Fox p.555-556; ledger WSD-13'),

  // ---- guided tour (th): stop ticks and subtitles that did not match their own text, and claims
  T('DATA-tour-1', 'Minutes later, he was killed by a Confederate sharpshooter — one of the highest-ranking Union officers to die in the battle.',
    'Minutes later he was killed (a Confederate sharpshooter is the usual account; Heth believed a shell from Pegram\'s guns struck him) — one of the highest-ranking Union officers to die in the battle.',
    'contested-fact', 'cause stated as fact', 'OR 27/2 p.637 (Heth); OR 27/1 p.245'),
  T('DATA-tour-2a', 'As the morning of July 1 progressed, Confederate forces under Rodes arrived on Oak Ridge north of the town', 'At midday on July 1 Confederate forces under Rodes arrived on Oak Ridge north of the town',
    'wrong-time', '"As the morning ... progressed" (subtitle said 10:00 AM)', 'OR 27/2 p.444 (Ewell); time-facts R022 (about 1:00 p.m.)'),
  T('DATA-tour-2b', "Iverson's North Carolina brigade advanced without skirmishers into a deadly ambush. Paul's Union brigade, concealed behind a stone wall, delivered a devastating volley. Nearly 500 Confederates surrendered in the wheat field — the largest single mass surrender of the battle.",
    "Iverson's North Carolina brigade attacked the stone wall held by Baxter's brigade of Robinson's division and was raked by musketry from behind it. Rodes wrote that its dead \"lay in a distinctly marked line of battle\", and many of its men, surrounded, were captured.",
    'wrong-claim', '"Paul\'s Union brigade"; "nearly 500 surrendered in the wheat field -- the largest mass surrender"', 'OR 27/2 p.553-554 (Rodes), p.444 (Ewell); OR 27/1 p.248 (Baxter)'),
  T('DATA-tour-2c', 'lat:39.8378,lng:-77.2511,zoom:13.5,tick:22,tickWindow:6', 'lat:39.8378,lng:-77.2511,zoom:13.5,tick:52,tickWindow:6',
    'wrong-tick', 'the stop showed tick 22 (Heth deploying, 9:15 a.m. on the clock) for Rodes and Iverson', 'chronology tick 52-53; triage TICK-PLACEMENT'),
  T('DATA-tour-2d', 'subtitle:"The Union Right Flank — July 1, 10:00 AM"', 'subtitle:"The Union Right Flank — July 1, early afternoon"', 'wrong-time', '10:00 AM', 'OR 27/2 p.444; time-facts R022'),
  T('DATA-tour-3a', "Early's division, arriving from the northeast on the Harrisburg Road, struck the exposed position from three sides simultaneously. Gordon's Georgia brigade swept forward with devastating effect.",
    "Early's division arrived by the Heidlersburg road, and Gordon's Georgia brigade, ordered in on the left of Doles's, broke Barlow's division.",
    'wrong-place', '"Harrisburg Road"; "from three sides simultaneously"', 'OR 27/2 p.445 (Ewell)'),
  T('DATA-tour-3b', "Barlow was shot from his horse and left for dead on the field. Confederate General Gordon, finding him wounded, stopped to give him water and had him moved to safety. The two men would become friends after the war, debating for decades whether this encounter actually occurred.",
    "Barlow was severely wounded and captured. Gordon later told of giving him water on the field and of their friendship after the war; the story is Gordon's own account, and some of its details have been questioned.",
    'unsupported-claim', '"shot from his horse and left for dead"', 'OR 27/1 p.729 (Schurz); OR 27/2 p.445'),
  T('DATA-tour-3c', 'lat:39.8372,lng:-77.2261,zoom:14,tick:62,tickWindow:6', 'lat:39.8372,lng:-77.2261,zoom:14,tick:57,tickWindow:6', 'wrong-tick', 'tick 62 (3:45 p.m.) for "2:30 PM"', 'chronology tick 57 (anchor)'),
  T('DATA-tour-3d', 'subtitle:"XI Corps Exposed — July 1, 2:30 PM"', 'subtitle:"XI Corps Exposed — July 1, about 3:00 PM"', 'wrong-time', '2:30 PM', 'OR 27/1 p.728 (Schurz: "about 3 o\'clock")'),
  T('DATA-tour-4a', "where Howard had wisely positioned a reserve.", "where Howard had left Steinwehr's division as a reserve.", 'unsupported-claim', '"wisely"', 'OR 27/1 p.727'),
  T('DATA-tour-4b', "General Hancock arrived by order of Meade to take command and restore order. His presence steadied the shaken troops. \"I think this the strongest position by nature upon which to fight a battle that I ever saw,\" he reported to Meade.",
    "General Hancock arrived on Meade's order (3 p.m. by his own report, 4 p.m. by Howard's) and helped form the line. His 5:25 dispatch said the position on Cemetery Hill \"cannot well be taken. It is a position, however, easily turned\", and that \"we can fight here, as the ground appears not unfavorable with good troops\".",
    'unsupported-quote', 'quotation not in his dispatch', 'OR 27/1 p.366 (Hancock\'s dispatch), p.368, p.696'),
  T('DATA-tour-4c', 'lat:39.8306,lng:-77.2556,zoom:13,tick:75,tickWindow:8', 'lat:39.8306,lng:-77.2556,zoom:13,tick:72,tickWindow:8', 'wrong-tick', 'tick 75 is the Lee-Ewell moment, not the retreat', 'chronology ticks 64-72'),
  T('DATA-tour-5a', "Confederate forces under Hood's division discovered that Little Round Top — the rocky height anchoring the left of the Union line — was unoccupied. Law's Alabama brigade raced for the summit.",
    "Hood's division attacked toward Little Round Top — the rocky height anchoring the left of the Union line. Law's Alabama brigade moved against its southern slope.",
    'unsupported-claim', '"discovered ... was unoccupied ... raced for the summit"', 'OR 27/1 p.593 (Sykes); OR 27/2 p.405 (Law\'s report)'),
  T('DATA-tour-5b', "At almost the same moment, Meade's chief engineer spotted the danger and rushed Vincent's V Corps brigade to the hill. They arrived with minutes to spare.",
    "Meade's chief engineer, Warren, saw the danger, and Vincent's V Corps brigade was posted on the hill under his direction (Sykes's report), shortly before the Confederate attack.",
    'contested-fact', 'sequence stated as fact', 'OR 27/1 p.593 (Sykes), p.623 (Chamberlain)'),
  T('DATA-tour-5c', "When the regiment's ammunition ran low after multiple Confederate assaults, Chamberlain ordered a bayonet charge downhill. The unexpected assault routed the exhausted 15th Alabama and secured the position.",
    "When his line was about to be overwhelmed, Chamberlain reported, he \"ordered the bayonet\". The Confederate first line threw down its arms, and he sent 400 prisoners to the rear.",
    'wrong-claim', 'ammunition and "routed the exhausted 15th Alabama" as the whole story', 'OR 27/1 p.623-624 (Chamberlain)'),
  T('DATA-tour-7a', "The 26-acre Wheatfield of farmer George Rose became one of the bloodiest patches of ground in American military history on the afternoon of July 2. The field changed hands at least six times during three hours of fighting.",
    "The Wheatfield of farmer George Rose became one of the bloodiest patches of ground in the battle on the afternoon and evening of July 2. By the usual count the field changed hands six times.",
    'unsupported-number', '"26-acre"; "three hours"', 'no source read for the acreage or duration'),
  T('DATA-tour-7b', "Colonel Patrick Kelly's Irish Brigade advanced with green sprigs of boxwood in their caps, a Celtic tradition before battle. By nightfall, approximately 4,000 men lay killed or wounded in this single field.",
    "Colonel Patrick Kelly's Irish Brigade advanced; regimental tradition says the men wore green sprigs of boxwood in their caps. By nightfall the field was covered with killed and wounded of both armies.",
    'unsupported-number', '"approximately 4,000 men"', 'no source read for the figure'),
  T('DATA-tour-7c', 'subtitle:"Six Times Contested — July 2, 5:00 PM"', 'subtitle:"Six Times Contested — July 2, afternoon and evening"', 'wrong-time', '5:00 PM at tick 275 (6:00 p.m.)', 'time-facts R062, R067'),
  T('DATA-tour-8a', "advanced his corps a mile forward from the assigned position on Cemetery Ridge to the higher ground around the Peach Orchard.",
    "advanced his corps some half a mile to three-quarters of a mile forward of the line assigned to it on Cemetery Ridge (Meade's estimate) to the higher ground around the Peach Orchard.",
    'wrong-number', '"a mile"', 'OR 27/1 p.116 (Meade)'),
  T('DATA-tour-8b', "Barksdale's Mississippi brigade — 1,400 men — charged the Peach Orchard with Barksdale riding at their front. The assault swept through the orchard and shattered the III Corps.",
    "Barksdale's Mississippi brigade charged the Peach Orchard and Barksdale was mortally wounded in the attack. The assault swept through the orchard and broke the III Corps' advanced line.",
    'unsupported-number', '"1,400 men"; "riding at their front"', 'OR 27/2 p.359, p.362 (Longstreet); OR 27/1 p.371 (Hancock)'),
  T('DATA-tour-8c', 'lat:39.8028,lng:-77.2506,zoom:14,tick:270,tickWindow:8', 'lat:39.8028,lng:-77.2506,zoom:14,tick:278,tickWindow:8', 'wrong-tick', 'tick 270 (5:05 p.m.) for "6:00 PM"', 'chronology tick 278 (Barksdale, about 6:20 p.m.)'),
  T('DATA-tour-9a', 'For ten desperate minutes, Confederate soldiers fought among the Union cannon', 'For some minutes Confederate soldiers fought among the Union cannon', 'unsupported-number', '"ten desperate minutes"', 'OR 27/2 p.319 (Lee: forced their way into the works and seized several pieces)'),
  T('DATA-tour-9b', "As he lay dying, he scrawled a final message on a scrap of paper using his own blood: \"Tell my father I died with my face to the enemy.\"",
    "As he lay dying, he is said to have written a final message on a scrap of paper: \"Tell my father I died with my face to the enemy.\" The note is traditional and not in the Official Records.",
    'wrong-claim', '"using his own blood"', 'tradition (docs-copy-33)'),
  T('DATA-tour-9c', 'lat:39.82,lng:-77.2261,zoom:14,tick:322,tickWindow:8', 'lat:39.82,lng:-77.2261,zoom:14,tick:326,tickWindow:8', 'wrong-tick', 'tick 322 (7:55 p.m.)', 'chronology tick 326 (anchor, 8:00 p.m.)'),
  T('DATA-tour-10a', "Greene's New York brigade — only 1,400 men — held a mile of trenches against nearly 4,700 attackers through the night.",
    "Greene's New York brigade — 1,424 men by Geary's count, reinforced during the evening by detachments of the I and XI Corps — held the entrenched hill against Johnson's division.",
    'wrong-number', '"only 1,400 men ... a mile of trenches ... nearly 4,700 attackers"', 'OR 27/1 p.121, p.833, p.858'),
  T('DATA-tour-10b', "At dawn on July 3, the XII Corps returned from Cemetery Ridge and launched a series of assaults to recover the lost trenches. The fighting continued for seven hours — the longest sustained engagement of the three-day battle.",
    "The XII Corps, back from the left, fought at daylight on July 3 to retake the works the Confederates held. Kane reports fire of unintermitting strength for seven hours, until about 10:30 a.m.",
    'unsupported-claim', '"longest sustained engagement"', 'OR 27/1 p.847 (Kane)'),
  T('DATA-tour-11a', "they crested Cemetery Ridge and briefly reached the Baltimore Pike.", "Lee's report says Wright gained the crest of the ridge itself.", 'unsupported-claim', '"briefly reached the Baltimore Pike"', 'OR 27/2 p.319 (Lee)'),
  T('DATA-tour-11b', "\"We were on the crest,\" Wright later wrote. \"We had pierced the enemy's lines.\" But Posey's and Mahone's brigades, which were supposed to support Wright's flanks, failed to advance. Hit from three sides, Wright's unsupported men were driven back.",
    "Lee reports that Wright, having become separated from McLaws and gone beyond the other brigades of his division, was attacked in front and on both flanks and compelled to retire, unable to bring off any of the captured artillery.",
    'unsupported-quote', 'quotation and support claims not found in the report read', 'OR 27/2 p.319 (Lee)'),
  T('DATA-tour-11c', "The crisis passed — but it showed Lee that the Union center could be broken. The observation would inform his decision to order Pickett's Charge the following day.",
    "The crisis passed. Whether the fight shaped Lee's decision to attack the center the next day is a matter of interpretation.",
    'unsupported-claim', 'causal claim as fact', 'OR 27/2 p.320 (Lee)'),
  T('DATA-tour-12a', 'subtitle:"The High-Water Mark — July 3, 3:00 PM"', 'subtitle:"The High-Water Mark — July 3, about 3:30 PM"', 'wrong-time', '3:00 PM', 'time-facts R114 (3:10-3:45)'),
  T('DATA-tour-12b', "At 3:00 PM on July 3, the survivors of the mile-long advance reached the stone wall at The Angle. Armistead, with his hat raised on his sword so men could see him through the smoke, called out: \"Come on boys, give them the cold steel!\"",
    "About 3:30 PM on July 3 the survivors of the mile-long advance reached the stone wall at The Angle. By tradition Armistead raised his hat on his sword and called, \"Come on, boys, give them the cold steel!\" — words from survivors' later accounts.",
    'unsupported-quote', 'hour and quotation as fact', 'time-facts R114; OR 27/1 p.374 (Hancock)'),
  T('DATA-tour-12c', "Armistead led approximately 150 men over the wall and reached Cushing's guns. Artillery Lieutenant Alonzo Cushing had remained at his battery despite being wounded twice, holding his intestines with one hand while commanding with the other. He was shot through the head at the moment of Armistead's breakthrough.",
    "Led by Armistead, a part of his brigade crossed the wall and reached the guns of Cushing's battery. Lieutenant Alonzo Cushing, wounded in both thighs, had fought on for an hour and a half and was killed at the fence by his guns, Webb reports.",
    'unsupported-detail', '"approximately 150 men"; wounds and manner of death as fact (the data gave "through the mouth" elsewhere)', 'OR 27/1 p.429 (Webb), p.374'),
  T('DATA-tour-12d', "Armistead fell wounded at the guns. Told that his old friend Hancock was also wounded nearby, he asked that his watch and personal effects be delivered to Hancock with his regrets. Armistead died two days later.",
    "Armistead fell wounded at the guns and was left within the Union lines, Harrow reports. A later account says that, told his old friend Hancock was wounded, he asked that his watch and effects be given to Hancock; that is tradition. Armistead died of his wounds two days later.",
    'unsupported-claim', 'anecdote as fact', 'OR 27/1 p.428 (Harrow)'),
  T('DATA-tour-12e', 'lat:39.8117,lng:-77.2347,zoom:15,tick:548,tickWindow:8', 'lat:39.8117,lng:-77.2347,zoom:15,tick:549,tickWindow:8', 'wrong-tick', 'tick 548 (3:25 p.m.)', 'chronology tick 549'),
  T('DATA-tour-13a', "The 23-year-old George Armstrong Custer charged Hampton's brigade at full gallop with the 7th Michigan, shouting \"Come on, you Wolverines!\"",
    "Custer is reported to have led the 7th Michigan against Hampton's brigade at a gallop, shouting \"Come on, you Wolverines!\" — a report from veterans' later accounts.",
    'unsupported-quote', 'stated as fact', 'OR 27/2 p.322 (Lee: Hampton "seriously wounded")'),
  T('DATA-tour-13b', 'lat:39.8344,lng:-77.19,zoom:13.5,tick:522,tickWindow:8', 'lat:39.8344,lng:-77.19,zoom:13.5,tick:539,tickWindow:8', 'wrong-tick', 'tick 522 (1:30 p.m.) for the 3:00 p.m. charge', 'chronology tick 539; time-facts R120'),
  T('DATA-tour-14a', "At 1:07 PM on July 3, 1863, Confederate artillery opened the greatest bombardment in the history of the Western Hemisphere — 150 guns firing simultaneously at Cemetery Ridge. The cannonade lasted nearly two hours.",
    "About 1 PM on July 3, 1863 (1:07 by one count), at a given signal, Confederate artillery opened a heavy cannonade on Cemetery Ridge: nearly 150 guns in position by Pendleton's count, 100 to 125 or more by Union estimates. It lasted about two hours.",
    'wrong-number', '"greatest bombardment in the history of the Western Hemisphere"; "150 guns firing simultaneously"', 'OR 27/2 p.320, p.352; OR 27/1 p.117, p.239'),
  T('DATA-tour-14b', "At approximately 3:00 PM, 12,500 Confederate soldiers stepped from the tree line on Seminary Ridge and began the mile-wide advance.",
    "At about 3:00 PM (accounts run from 2:00 to 3:00) the Confederate column, estimated by Hancock at more than 15,000 men, stepped from the tree line on Seminary Ridge and began the mile-wide advance.",
    'wrong-number', '"12,500" as fact', 'OR 27/1 p.373 (Hancock); time-facts R108'),
  T('DATA-tour-14c', "The charge reached The Angle but was repulsed at enormous cost. Confederate casualties were approximately 50% — over 6,000 men killed, wounded, or captured. Lee rode among the survivors saying \"It is all my fault.\" The charge marked the beginning of the end of Confederate offensive capacity.",
    "The charge reached The Angle but was repulsed with heavy loss: the Confederate return counts 2,888 casualties in Pickett's division alone, 1,499 of them captured or missing. Witnesses later reported that Lee rode among the survivors and took the blame on himself. It was the last great Confederate effort of the battle.",
    'wrong-number', '"approximately 50% -- over 6,000"; quotation as fact', 'OR 27/2 p.339 (return); OR 27/2 p.321 (Lee)'),
  T('DATA-tour-14d', 'lat:39.8156,lng:-77.25,zoom:12.5,tick:540,tickWindow:12', 'lat:39.8156,lng:-77.25,zoom:12.5,tick:538,tickWindow:12', 'wrong-tick', 'tick 540 vs the charge starting at 538', 'chronology tick 538'),
  T('DATA-tour-15a', "The monument at the High Water Mark was dedicated in 1892. The Battlefield Memorial Association, which later became part of the NPS, was established partly to preserve this ground.",
    "Monuments and markers at the copse of trees commemorate the assault. The Gettysburg Battlefield Memorial Association, chartered in 1864, preserved parts of the field; the federal government took over the ground when the park was established in the 1890s.",
    'unsupported-claim', 'date of a monument and an institutional history sentence without source', 'Wikipedia, Gettysburg Battlefield Memorial Association (read 2026-10-18): park 1895'),
  T('DATA-tour-15b', "His friendship with Union General Winfield Hancock — wounded the same afternoon — became one of the war's most poignant symbols of a nation divided against itself.",
    "His friendship with Union General Winfield Hancock — wounded the same afternoon, as Meade's report notes — is told in later memoirs as one of the war's most poignant stories.",
    'unsupported-claim', 'sentiment as fact', 'OR 27/1 p.117'),
  T('DATA-tour-16a', "A wagon train of wounded men, 17 miles long, moved through driving rain toward the Potomac crossing at Williamsport.",
    "A long wagon train of wounded men (Imboden's postwar account puts it at 17 miles) moved through driving rain toward the Potomac crossing at Williamsport.",
    'unsupported-number', '"17 miles long" as fact', 'OR 27/2 p.322 (Lee: trains with wounded to Williamsport under Imboden); Imboden 1887 not re-read'),
  T('DATA-tour-16b', "President Lincoln was devastated by the failure to destroy Lee's army before it could cross the Potomac. \"We had them within our grasp,\" Lincoln wrote. \"We had only to stretch forth our hands and they were ours.\"",
    "President Lincoln was deeply disappointed that Lee's army escaped across the Potomac; in a letter to Meade that he did not send he wrote that Lee had been \"within your easy grasp\".",
    'unsupported-quote', 'quotation and attribution ("wrote") not verified', 'Lincoln to Meade, July 14, 1863 (the unsent letter); wording from memory of the standard text, flagged: not re-read in this audit'),
  T('DATA-tour-16c', "Confederate casualties totaled approximately 28,000; Union casualties approximately 23,000.", "Estimated casualties: about 28,000 Confederate and about 23,000 Union (the Official Records return counts 20,451 and 23,049).",
    'contested-fact', 'single figures without range', 'OR 27/1 p.187; OR 27/2 p.346; NPS; ledger WSD-01, WSD-02'),

  // ---- Soldier's Eye View messages
  T('DATA-eye-angle', "You are standing at The Angle where Armistead led 150 men over the stone wall on July 3, 1863.", "You are standing at The Angle where Armistead led part of his brigade over the stone wall on July 3, 1863.", 'unsupported-number', '"150 men"', 'OR 27/1 p.374'),
  T('DATA-eye-mcp', "where the Iron Brigade charged into Herbst Woods at 10:00 AM on July 1, 1863. General Reynolds was killed near this spot.", "where the Iron Brigade charged into Herbst Woods about 10:15 AM on July 1, 1863. General Reynolds was killed near this spot.", 'wrong-time', '10:00 AM', 'OR 27/1 p.245'),
  T('DATA-eye-wheat', "You are standing in the 26-acre Wheatfield of farmer George Rose. This ground changed hands six times on July 2, 1863. Approximately 4,000 men fell here.", "You are standing in the Wheatfield of farmer George Rose. By the usual count this ground changed hands six times on July 2, 1863, with heavy losses on both sides.", 'unsupported-number', '"26-acre"; "approximately 4,000"', 'no source read'),
  T('DATA-eye-culps', "where Greene's 1,400 New Yorkers held their earthworks overnight against 4,700 Confederate attackers.", "where Greene's brigade of 1,424 New Yorkers, reinforced during the evening, held its earthworks against Johnson's division.", 'wrong-number', '"1,400 ... 4,700"', 'OR 27/1 p.833, p.858, p.121'),

  // ---- Help chunk
  J('DATA-help-ticks', 'help', 'animates the Battle of Gettysburg across 675 five-minute ticks, tracking', 'animates the Battle of Gettysburg across 675 steps, each a snapshot of the field at a documented or estimated time, tracking',
    'wrong-claim', '"675 five-minute ticks"', 'tools/time (the clock model: steps are not five minutes)'),
  J('DATA-help-positions', 'help', "Each unit position is derived from primary sources — the Official Records of the War of the Rebellion, Harry Pfanz's three-volume Gettysburg trilogy, Bradley Gottfried's Maps of Gettysburg, and Busey and Martin's Regimental Strengths and Losses at Gettysburg.",
    "Unit positions are reconstructed from sources such as the Official Records of the War of the Rebellion, Harry Pfanz's three-volume Gettysburg trilogy, Bradley Gottfried's Maps of Gettysburg, and Busey and Martin's Regimental Strengths and Losses at Gettysburg. They are approximations: the positions and the movements between them were authored for this map and are not a record of each unit's exact place.",
    'unsupported-claim', '"derived from primary sources"', 'data/placements_*.json (hand-authored keyframes); tools/data findings data-integrity-01'),
  J('DATA-help-sources', 'help', "\"Wert, Jeffry D. — Gettysburg: Day 3 (2001)\"]", "\"Wert, Jeffry D. — Gettysburg: Day 3 (2001)\",\"Fox, William F. — Regimental Losses in the American Civil War (1889)\",\"Alexander, E. P. — Military Memoirs of a Confederate (1907)\"]",
    'missing-source', 'sources used by the corrected text were not listed', 'this audit'),
  J('DATA-help-dedication', 'help', 'Dedicated to the 51,000 casualties of July 1–3, 1863.', 'Dedicated to the men killed, wounded and captured at Gettysburg, July 1–3, 1863 — about 51,000 by the National Park Service\'s estimate.',
    'contested-fact', '"51,000 casualties" as fact', 'ledger WSD-01, WSD-02'),

  // ---- static pages
  J('DATA-find-count', 'find-ancestor.html', 'which of the 467 Union and Confederate regiments and batteries at Gettysburg your ancestor may have served in', 'which of the 443 Union and Confederate infantry and cavalry regiment records in the order of battle of this site your ancestor may have served in (batteries are not searched)',
    'wrong-number', '"467 ... regiments and batteries": the page loads 384 infantry, 59 cavalry records and no batteries', 'count of regiments[] in the eight data/oob files the page fetches: 443'),
  J('DATA-idx-meta', 'index.html', 'unfold in real time -- 467 regiments and batteries across 675 five-minute snapshots', 'unfold step by step -- ' + UC + ' units (regiments, batteries and the brigades, divisions and corps above them) across 675 snapshots',
    'wrong-number', '"467 regiments and batteries", "five-minute snapshots", "real time"', 'count of distinct unit ids in data/placements_*.json and density_*.json after the id and arrival fixes: ' + UC + ' (' + COUNTS.regiment + ' regiments, ' + COUNTS.battery + ' batteries, ' + COUNTS.brigade + ' brigades, ' + COUNTS.division + ' divisions, ' + COUNTS.corps + ' corps); 4 occurrences', 4),
  J('DATA-idx-about', 'index.html', 'minute-by-minute reconstruction of the Battle of Gettysburg (July 1&ndash;3, 1863): 467 regiments and batteries tracked across 675 five-minute snapshots, built from primary-source unit records, chronology, and terrain data',
    'step-by-step reconstruction of the Battle of Gettysburg (July 1&ndash;3, 1863): ' + UC + ' units tracked across 675 snapshots, reconstructed from published unit records, chronology, and terrain data', 'wrong-number', 'same', 'same', 2),
  J('DATA-idx-boot', 'index.html', 'Watch the battle unfold in real time across 675 five-minute snapshots.', 'Watch the battle unfold step by step across 675 snapshots.', 'wrong-claim', '"real time ... five-minute"', 'same'),
  J('DATA-terms-res', 'terms.html', 'Historical positions, especially at five-minute resolution, are a best-effort reconstruction', 'Historical positions, especially at the resolution of this animation, are a best-effort reconstruction', 'wrong-claim', '"five-minute resolution"', 'same'),
  J('DATA-gr-sub', 'ground-remembers.html', 'Every recorded unit position across all 675 five-minute snapshots, accumulated into one map', 'Every recorded unit position across all 675 snapshots, accumulated into one map', 'wrong-claim', '"five-minute snapshots"', 'same'),

  // ---- Turning Points page: ticks pointing at the wrong moment, and claims
  J('DATA-tp-buford', 'turning-points.html', 'His men held the ridges long enough for the Union I Corps infantry to arrive and occupy the high ground south and east of town.', 'His men held the ridges long enough for the Union I Corps infantry to arrive, and the Union army went on to hold Cemetery Hill and the ridges south of town for the rest of the battle.', 'wrong-place', '"occupy the high ground south and east of town" (the I Corps fought west and north of it)', 'OR 27/1 p.245-247'),
  J('DATA-tp-buford2', 'turning-points.html', 'Historians broadly agree this was the single most consequential tactical choice of the battle\'s opening hours', 'Many accounts hold that this was the most consequential tactical choice of the battle\'s opening hours', 'unsupported-claim', '"Historians broadly agree"', 'no survey of historians'),
  J('DATA-tp-long2', 'turning-points.html', "Lee wanted Lieutenant General James Longstreet's First Corps to attack the Union left early on July 2. Longstreet, who had argued against the whole offensive and preferred a defensive maneuver around the Union flank, did not get his divisions into attack position until roughly 4:00pm, hours later than Lee intended.",
    "Lee ordered Lieutenant General James Longstreet's First Corps to attack the Union left on July 2 (by one account the orders went out about 11:00am, not at dawn as is often said). Longstreet, with two divisions up, waited for Law's brigade to rejoin about noon, and McLaws did not get into position until about 4:00pm; postwar accounts add that he had argued for a maneuver around the Union flank instead.",
    'unsupported-claim', '"early on July 2"; Longstreet\'s views as fact', 'OR 27/2 p.358 (Longstreet); time-facts R045'),
  J('DATA-tp-long3', 'turning-points.html', 'had hours to advance his corps forward to the Peach Orchard (against orders)', 'had hours to advance his corps forward to the Peach Orchard (Meade\'s report says Sickles did not fully apprehend his instructions)', 'contested-fact', '"against orders"', 'OR 27/1 p.116'),
  J('DATA-tp-collapse', 'turning-points.html', "Sickles's unauthorized advance is still debated", "Sickles's advance, which Meade's report says he made without fully apprehending his instructions, is still debated", 'contested-fact', '"unauthorized"', 'OR 27/1 p.116'),
  J('DATA-tp-cann2', 'turning-points.html', "Around 1:00pm on July 3, Confederate artillery opened a massive bombardment -- some 150 to 170 guns -- meant to weaken", "Around 1:00pm on July 3, Confederate artillery opened a heavy bombardment -- nearly 150 guns by Pendleton's count, 100 to 125 or more by Union estimates -- meant to weaken", 'wrong-number', '"150 to 170 guns"', 'OR 27/2 p.352; OR 27/1 p.117, p.239'),
  J('DATA-tp-cann3', 'turning-points.html', "Union artillery chief Henry Hunt deliberately conserved his ammunition and had his gunners slacken fire partway through, in part to save shells for the coming infantry assault. Confederate artillery commanders read the slackening as their bombardment succeeding in silencing Union guns, when in fact",
    "Union artillery chief Henry Hunt withheld the Union fire through the first burst and, about 2:30 with ammunition running low, had it gradually stopped. Alexander, watching, read the slackening as his bombardment succeeding in silencing Union guns, when in fact", 'unsupported-claim', 'Hunt\'s motive stated as fact; "Confederate commanders" for one witness', 'OR 27/1 p.239 (Hunt); Alexander 1907'),
  J('DATA-tp-pick2', 'turning-points.html', "Roughly 12,500 Confederate soldiers advanced across nearly a mile of open ground against the Union center. A small group under Brigadier General Lewis Armistead breached the low stone wall at 'the Angle' before being overwhelmed. The assault failed with over 50% casualties among the attacking force.",
    "A Confederate column that Hancock estimated at more than 15,000 men advanced across nearly a mile of open ground against the Union center. A part of Brigadier General Lewis Armistead's brigade breached the low stone wall at 'the Angle' before being overwhelmed. The assault failed with heavy loss: the Confederate return counts 2,888 casualties in Pickett's division alone.",
    'wrong-number', '"12,500"; "over 50% casualties"', 'OR 27/1 p.373; OR 27/2 p.339'),
];
