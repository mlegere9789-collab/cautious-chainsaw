// DATA fixes: data/oob/commander_successions.json (the commander shown in unit panels from approx_tick on, and the on-screen 'command change' notices).
// Ticks are set to the CLOCK model's tick for the real time of the event (the file's ticks were computed on the old linear clock and ran up to 24 ticks, two hours,
// early or late on July 2 and 3).  Times come from docs/plan/data/time-facts.csv where it has the event, otherwise from the file's own approx_time, which stays marked
// approximate.  Names are checked against the roster of OR 27/1 pp.155-168 and 27/2 pp.283-292.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import model from '../../../../src/lib/time/index.js';
export const kind = 'text';
const tk = (iso) => Math.round(model.clockToTick(iso));
const OR1 = 'OR 27/1';
const OR2 = 'OR 27/2';
// id: [iso time, approx_time text (null keeps), extra fields, reason, source]
const E = {
  'US-001': ['1863-07-01T10:15', null, {}, 'tick on the CLOCK model', `${OR1} p.245 (Doubleday: about 10.15 a.m.), time-facts R012`],
  'US-002': ['1863-07-02T06:00', 'July 2 (hour not stated)', { event: 'Newton, assigned to the First Corps on July 1, supersedes Doubleday in its command on July 2', cause: 'Newton assigned to the command; the Official Records footnote gives no reason', notes: 'The Official Records say only that Newton was assigned to the First Corps on the 1st and superseded Doubleday on the 2d (27/1 p.155 note). That Meade had lost confidence in Doubleday is the usual later account (Pfanz), not stated there. Contested.' }, 'the footnote puts Newton\'s succession on July 2, not "July 1 evening"; cause not stated in the Official Records', `${OR1} p.155 (note to First Army Corps)`],
  'US-003': ['1863-07-01T10:45', 'July 1 ~10:45am', {}, 'Meredith fell in the Iron Brigade\'s counterattack in Herbst Woods (about 10:45 a.m.); the file said 11:30', `time-facts R013; ${OR1} p.254 (Meredith: horse fell on him)`],
  'US-004': ['1863-07-01T14:00', null, { notes: 'The Official Records roster (27/1 p.156) lists the brigade\'s successive commanders as Paul, Leonard, Root, Coulter, Lyle and Coulter again.' }, 'tick on the CLOCK model; roster note added', `${OR1} p.156 (roster), p.249 (Robinson: Paul fell severely wounded)`],
  'US-005': ['1863-07-01T14:15', null, {}, 'tick on the CLOCK model', `${OR1} p.156 (roster)`],
  'US-006': ['1863-07-01T14:30', null, { event: 'Root wounded -- Coulter assumes brigade', notes: 'The Official Records roster (27/1 p.156) lists the brigade\'s successive commanders as Paul, Leonard, Root, Coulter, Lyle and Coulter again (Colonel Peter Lyle, 90th Pennsylvania, between the two spells of Coulter).' }, '"3rd succession, 4th commander" and "four commanders in under an hour": the roster names six successive commanders and gives no times', `${OR1} p.156 (roster)`],
  'US-007': ['1863-07-01T14:00', null, {}, 'tick on the CLOCK model', `${OR1} p.156, pp.332 and 342 (Stone wounded)`],
  'US-008': ['1863-07-01T14:30', null, {}, 'tick on the CLOCK model', `${OR1} p.156 (roster: Stone, Wister, Dana)`],
  'US-009': ['1863-07-03T15:35', 'July 3 ~3:35pm', { event: 'Hancock wounded', to_commander: 'Brigadier General William Hays', notes: 'Hancock stayed on the field, giving directions, after he was hit (his own dispatch, 27/1 p.366). Contested: Meade\'s report (27/1 p.117) has Hancock commanding the left center and Gibbon commanding the Second Corps on July 3, both severely wounded; the reports read do not say who then led the corps.' }, 'Hancock had been wing commander since July 2 with Gibbon commanding the corps (p.370); the file said Hays took the corps from Hancock', `${OR1} p.117 (Meade), p.366 (Hancock), p.370`],
  'US-010': ['1863-07-03T15:35', 'July 3 ~3:35pm', {}, 'tick on the CLOCK model', `${OR1} p.117 (Meade: Gibbon severely wounded), p.158 (roster: Gibbon, Harrow)`],
  'US-011': ['1863-07-02T18:15', 'July 2 ~6:15pm', {}, 'Cross killed about 6:15 p.m.', `time-facts R068; ${OR1} p.158 (roster)`],
  'US-012': ['1863-07-02T18:15', 'July 2 ~6:15pm', {}, 'Zook mortally wounded about 6:15 p.m.', `time-facts R068; ${OR1} p.158 (roster)`],
  'US-013': ['1863-07-02T19:00', 'July 2 ~7:00pm', {}, 'the 1st Minnesota\'s charge was about 7 p.m.', `time-facts R077; ${OR1} p.425 (Coates: command devolved on Capt. Messick)`],
  'US-014': ['1863-07-03T15:30', 'July 3 ~3:30pm', { event: 'Messick killed -- Coates assumes 1st Minnesota', source: 'OR 27/1 p.188 (officers killed: Capt. Nathan S. Messick) and p.425 (Coates)', notes: 'Captain Messick, who had led the regiment since Colvill fell on July 2, fell early in the regiment\'s action of July 3 (Pickett\'s Charge); Captain Henry C. Coates then signed the regiment\'s report (27/1 p.425).' }, 'Messick was killed on July 3, not on the evening of July 2 (the file put it 5 minutes after Colvill was wounded)', `${OR1} p.188, p.425`],
  'US-015': ['1863-07-02T19:10', 'July 2 ~7:10pm', {}, 'Willard killed about 7:10 p.m.', `time-facts R078; ${OR1} p.159 (roster: Willard, Sherrill, Bull)`],
  'US-016': ['1863-07-03T15:30', 'July 3 ~3:30pm', {}, 'tick on the CLOCK model', `${OR1} p.159 (roster)`],
  'US-017': ['1863-07-02T18:15', 'July 2 ~6:15pm', {}, 'Sickles wounded about 6:15 p.m.', `time-facts R070; ${OR1} p.370 (Hancock: Meade informed him Sickles was wounded)`],
  'US-018': ['1863-07-02T17:45', null, { unit_id: 'U-124NY', event: 'Ellis killed -- Cummins assumes the 124th New York', notes: 'Colonel Ellis commanded the 124th New York, not the brigade; Lieut. Col. Francis M. Cummins took the regiment (27/1 p.159 roster). The brigade (Ward\'s) passed from Ward to Berdan.' }, 'Ellis commanded a regiment, the 124th New York; the file made Cummins succeed to Ward\'s brigade', `${OR1} p.159 (roster)`],
  'US-019': ['1863-07-02T18:30', 'July 2 ~6:30pm', {}, 'the Peach Orchard salient collapsed about 6:30 p.m.', `time-facts R071; ${OR1} p.159 (roster: Graham, Tippin)`],
  'US-020': ['1863-07-02T17:30', 'July 2 ~5:30pm', {}, 'Vincent about 5:30 p.m. (sources range 5:00-5:50)', `time-facts R064; ${OR1} p.161 (roster: Vincent, Rice)`],
  'US-021': ['1863-07-02T17:40', 'July 2 ~5:40pm', {}, 'Weed about 5:40 p.m.', `time-facts R065; ${OR1} pp.161-162 (roster: Weed, Garrard)`],
  'US-022': ['1863-07-01T14:50', 'July 1 ~2:50pm', {}, 'Barlow wounded about 2:50 p.m.', `time-facts R027; ${OR1} p.164 (roster: Barlow, Ames)`],
  'US-023': ['1863-07-03T15:30', 'July 3 ~3:30pm', { notes: 'Cushing received the Medal of Honor posthumously in 2014, 151 years after the battle.' }, 'a "longest gap in Medal of Honor history" superlative is not supported', `time-facts R114; ${OR1} p.159 (roster: Cushing, Sergt. Fuger)`],
  'US-024': ['1863-07-02T17:40', 'July 2 ~5:40pm', {}, 'Hazlett about 5:40 p.m.', `time-facts R065; ${OR1} p.161 (roster: Hazlett, Rittenhouse)`],
  'US-025': ['1863-07-03T10:30', 'July 3 ~10:30am', { cause: 'KIA leading Colgrove\'s charge', notes: 'Mudge is reported to have said "It is murder, but it is the order"; the words come from survivors\' later accounts, not the Official Records. Contested (the hour of the charge: about two hours after daylight in Colgrove\'s report, near the end of the morning fight in others).' }, 'the file put the charge at 7:30 a.m.; time-facts has about 10:30 a.m. with disagreement noted', `time-facts R096; ${OR1} p.813-814 (Colgrove), p.165 (roster: Mudge, Morse)`],
  'CS-001': ['1863-07-02T16:30', 'July 2 ~4:30pm', { notes: 'Hood\'s arm was permanently injured. He continued to serve.' }, 'tick on the CLOCK model (hour from time-facts R058, low confidence)', `${OR2} p.284 (roster: Law)`],
  'CS-002': ['1863-07-02T16:30', 'July 2 ~4:30pm', {}, 'tick on the CLOCK model', `${OR2} p.284 (roster: Law, Sheffield)`],
  'CS-003': ['1863-07-02T19:10', 'July 2 ~7:10pm', {}, 'Barksdale fell in the Peach Orchard fighting; time-facts has about 7:10 p.m.', `time-facts R078; ${OR2} p.283 (roster: Barksdale, Humphreys)`],
  'CS-004': ['1863-07-02T18:15', 'July 2 ~6:15pm', { notes: 'The roster notes that no reports are on file for the brigade of Semmes; Colonel Bryan was in command on July 7 and was probably his immediate successor (27/2 p.283 note). Contested.' }, 'Semmes about 6:15 p.m.', `time-facts R068; ${OR2} p.283 (roster: Semmes, Bryan)`],
  'CS-005': ['1863-07-03T15:30', 'July 3 ~3:30pm', {}, 'Garnett about 3:30 p.m.', `time-facts R113; ${OR2} p.284 (roster)`],
  'CS-006': ['1863-07-03T15:30', 'July 3 ~3:30pm', {}, 'Kemper about 3:30 p.m.', `time-facts R113; ${OR2} p.284 (roster: Kemper, Mayo)`],
  'CS-007': ['1863-07-03T15:35', 'July 3 ~3:35pm', {}, 'Armistead about 3:35 p.m.', `time-facts R115`],
  'CS-008': ['1863-07-01T14:30', null, {}, 'tick on the CLOCK model', `${OR2} p.637 (Heth)`],
  'CS-010': ['1863-07-03T15:30', 'July 3 ~3:30pm', {}, 'Marshall about 3:30 p.m.', `time-facts R113-R114`],
  'CS-011': ['1863-07-01T10:45', 'July 1 ~10:45am', { notes: 'When Union soldiers recognized Archer, one is reported to have said "Good morning, General -- we are glad to see you." Archer is said to have been furious. He died in 1864.' }, 'Archer was taken in the Iron Brigade\'s counterattack at about 10:45 a.m.', `time-facts R013; ${OR2} p.637 (Heth: Archer captured)`],
  'CS-012': ['1863-07-02T17:30', 'July 2 (hour not stated)', {}, 'tick on the CLOCK model for an hour that is only approximate', `${OR2} p.283 (roster)`],
  'CS-013': ['1863-07-01T16:15', 'July 1 ~4:15pm', {}, 'Pender\'s division attacked about 4 p.m. (time-facts R032); Scales fell in that attack', `time-facts R032; ${OR2} p.637`],
  'CS-014': ['1863-07-02T20:00', 'July 2 ~8:00pm', {}, 'the attack on East Cemetery Hill was about 8 p.m.', `time-facts R082; ${OR2} p.285 (roster: Avery, Godwin)`],
  'CS-015': ['1863-07-02T19:45', 'July 2 ~7:45pm (dusk)', { source: 'OR 27/2 p.447 (Ewell) and p.504 (Dungan devolved)' }, 'Jones was wounded soon after the dusk attack began', `${OR2} p.447, p.504`],
  'CS-016': ['1863-07-02T15:00', 'July 2 afternoon (hour not stated)', { notes: 'Lee\'s report says Stuart reached the field in the afternoon of July 2; Stuart\'s own report gives only the date. The remark Lee is reported to have made to him comes from later accounts.' }, 'the file said "late afternoon"; Lee says afternoon and Stuart gives no hour', `${OR2} p.307 and p.322 (Lee), p.697 (Stuart)`],
  'CS-017': ['1863-07-03T15:00', 'July 3 ~3:00pm', {}, 'Hampton wounded in the cavalry charge at about 3 p.m. (time-facts R120)', 'time-facts R120'],
};
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, '..', '..', '..', '..', 'baseline', 'dist', 'data', 'oob', 'commander_successions.json');
const raw = fs.readFileSync(FILE, 'utf8');
const NL = String.fromCharCode(10);
const ind = (str, n) => str.split(NL).map((l, k) => (k === 0 ? l : ' '.repeat(n) + l)).join(NL);
const out = [];
for (const [id, [iso, text, extra, why, src]] of Object.entries(E)) {
  const m = new RegExp(String.raw`\{\n      "event_id": "` + id + String.raw`",[\s\S]*?\n    \}`).exec(raw);
  if (!m) throw new Error('succ: ' + id + ' not found');
  const obj = JSON.parse(m[0]);
  if (ind(JSON.stringify(obj, null, 2), 4) !== m[0]) throw new Error('succ: ' + id + ' does not round-trip');
  const nw = { ...obj, approx_tick: tk(iso), ...extra };
  if (text) nw.approx_time = text;
  out.push({ id: 'DATA-succ-' + id, target: 'data/oob/commander_successions.json', find: m[0], repl: ind(JSON.stringify(nw, null, 2), 4), expect: 1, cls: 'wrong-time', before: why, src });
}
export default out;
