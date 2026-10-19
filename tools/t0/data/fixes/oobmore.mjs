// DATA fixes found by the seeded sample (docs/data-audit/AUDIT.md section 4) and the sweeps it triggered: brigade numbering that disagrees with the Official Records roster,
// a Confederate commander and a Union rank, records the roster does not contain, and artillery records whose battalion the roster places elsewhere.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const kind = 'rows';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.join(HERE, '..', '..', '..', '..', 'baseline', 'dist', 'data', 'oob');
const jr = (f) => JSON.parse(fs.readFileSync(path.join(BASE, f), 'utf8'));
const OR1 = 'OR 27/1', OR2 = 'OR 27/2';
const NOTE = (ka, add) => (ka || '').replace(/\s+$/, '') + ' ' + add;
const KA = {
  'U-127PA': "Hall's brigade -- reserve, zero casualties.",
  'U-23NJ': 'Army reserve.',
  'U-CAV-3-2': "Kilpatrick's division -- small detachments from various regiments.",
  'U-ART-G1NY': 'Second Corps artillery -- Cemetery Ridge.',
  'C-ART-Doll': "Benner's Hill July 2 -- exposed position systematically destroyed by Union counterbattery fire.",
  'C-ART-Brown-C': "Benner's Hill -- Johnson's division artillery.",
  'C-ART-Garber': null, 'C-ART-Tanner': null, 'C-ART-Carrington': null,
};
const unionBrig = [
  { id: 'U-III-1-1', set: { designation: "Second Brigade, First Division, Third Corps (Ward's Brigade)" }, before: 'numbered First Brigade; the roster has Graham first, Ward second, de Trobriand third' },
  { id: 'U-III-1-2', set: { designation: "Third Brigade, First Division, Third Corps (DeTrobriand's Brigade)" }, before: 'numbered Second Brigade' },
  { id: 'U-III-1-3', set: { designation: "First Brigade, First Division, Third Corps (Graham's Brigade)" }, before: 'numbered Third Brigade' },
  { id: 'U-V-3-2', set: { designation: "Third Brigade, Third Division, Fifth Corps (Fisher's Brigade)" }, before: 'numbered Second Brigade; the roster has a First and a Third Brigade only (p.162)' },
  { id: 'U-XI-3-1', set: { designation: "Second Brigade, Third Division, Eleventh Corps (Krzyzanowski's Brigade)" }, before: 'numbered First Brigade; the roster has Schimmelfennig first, Krzyzanowski second' },
  { id: 'U-XI-3-2', set: { designation: "First Brigade, Third Division, Eleventh Corps (Schimmelfennig's Brigade)" }, before: 'numbered Second Brigade' },
  { id: 'U-CAV-2-3', set: { designation: "Second Brigade, Third Division, Cavalry Corps (Custer's Michigan Brigade, serving with Gregg's division on July 3)" }, before: "numbered Third Brigade, Second Division; the roster has Custer's brigade as the Second Brigade of Kilpatrick's Third Division (p.167)" },
  { id: 'U-CAV-3-2', set: { key_action: NOTE(KA['U-CAV-3-2'], "The Official Records roster has no such brigade: Kilpatrick's Third Division had Farnsworth's (Richmond's) First Brigade and Custer's Second Brigade (27/1 p.167), and the return lists no loss for it.") }, before: 'a brigade the roster does not contain' },
].map((r) => ({ ...r, cls: 'wrong-name', src: `${OR1} pp.159-167 (roster: brigade order)` }));
const unionRegs = [
  { id: 'U-63PA', file: 'union_regiments_iii_v_corps', set: { 'commander.name': 'Major John A. Danks' }, cls: 'wrong-name', before: 'commander "Captain John Danks"; the roster prints Maj. John A. Danks', src: `${OR1} p.159` },
  { id: 'U-127PA', file: 'union_regiments_i_ii_corps', set: { key_action: NOTE(KA['U-127PA'], 'The 127th Pennsylvania is not named in the Official Records order of battle (27/1 pp.155-168) or its return of casualties; this record is not confirmed by them.') }, cls: 'unverified-record', before: 'regiment and commander not in the Official Records order of battle', src: `${OR1} pp.155-168, pp.173-187` },
  { id: 'U-23NJ', file: 'union_regiments_vi_xi_xii_corps', set: { key_action: NOTE(KA['U-23NJ'], 'The 23d New Jersey is not named in the Official Records order of battle (27/1 pp.155-168) or its return of casualties; this record and its commander are not confirmed by them.') }, cls: 'unverified-record', before: 'regiment and commander not in the Official Records order of battle', src: `${OR1} pp.155-168, pp.173-187` },
];
const confRegs = [
  { id: 'C-Phil-GA', file: 'confederate_regiments_first_corps', set: { 'commander.name': 'Lieutenant Colonel E. S. Barclay' }, cls: 'wrong-name', before: 'commander "Lieutenant Colonel Emory Best"; the roster prints Lieut. Col. E. S. Barclay', src: `${OR2} p.283` },
];
const kaOf = (file, id) => (jr(file + '.json').regiments.find((r) => r.regiment_id === id) || {}).key_action;
// found by the full-population commander check (tools/t0/data/cmdcheck.mjs) after sample C: the roster names a different commander, or none
const ROSTER_SILENT = 'The Official Records roster (27/2 p.290) names no commander for this regiment; the commander shown is not verified here.';
confRegs.push(
  { id: 'C-1LA-T', file: 'confederate_regiments_second_corps', set: { 'commander.name': 'Captain E. D. Willett', 'commander.fate': null, key_action: "Nicholls's (Williams's) brigade -- Culp's Hill. The roster names Capt. E. D. Willett as its commander; the record's earlier statement that Lieut. Col. Nolan was killed is not supported by the sources read." }, cls: 'wrong-name', before: 'commander "Lieutenant Colonel Michael Nolan", "KIA July 2"; the roster prints 1st Louisiana, Capt. E. D. Willett', src: `${OR2} p.286 (roster), p.513 (Williams: the First Louisiana, Captain Willett)` },
  { id: 'C-7NC', file: 'confederate_regiments_third_corps', set: { 'commander.name': 'Captain J. McLeod Turner', 'commander.fate': null }, cls: 'wrong-name', before: 'commander "Captain James Harris"; the roster prints 7th North Carolina: Capt. J. McLeod Turner, Capt. James G. Harris (in that order)', src: `${OR2} p.289 (roster)` },
  { id: 'C-14GA', file: 'confederate_regiments_third_corps', set: { 'commander.name': 'Not named in the roster', 'commander.fate': null, key_action: NOTE(kaOf('confederate_regiments_third_corps', 'C-14GA'), ROSTER_SILENT) }, cls: 'wrong-name', before: 'commander "Colonel Robert McMillan", who is the 24th Georgia\'s colonel in the roster (p.286)', src: `${OR2} p.290 (roster: the 14th Georgia has no commander)` },
  { id: 'C-35GA', file: 'confederate_regiments_third_corps', set: { key_action: NOTE(kaOf('confederate_regiments_third_corps', 'C-35GA'), ROSTER_SILENT) }, cls: 'unverified-record', before: 'commander not in the roster', src: `${OR2} p.290 (roster)` },
  { id: 'C-45GA', file: 'confederate_regiments_third_corps', set: { key_action: NOTE(kaOf('confederate_regiments_third_corps', 'C-45GA'), ROSTER_SILENT) }, cls: 'unverified-record', before: 'commander not in the roster', src: `${OR2} p.290 (roster)` },
);
unionRegs.push(
  { id: 'U-4VT', file: 'union_regiments_vi_xi_xii_corps', set: { 'commander.name': 'Colonel Charles B. Stoughton' }, cls: 'wrong-name', before: 'rank "Lieutenant Colonel"; the roster prints 4th Vermont, Col. Charles B. Stoughton', src: `${OR1} p.167` },
);
const NOTE_ART = {
  'U-ART-G1NY': { text: "The roster lists Battery G, 1st New York (Capt. Nelson Ames) in the Fourth Volunteer Brigade of the Artillery Reserve (27/1 p.168), not in the Second Corps Artillery Brigade.", src: `${OR1} p.168` },
  'C-ART-Doll': { text: "The roster names no Doll's battery in this battalion: Latimer's (Andrews's) battalion held Dement's, Carpenter's, Brown's (Chesapeake) and Raine's batteries (27/2 p.286); the 2d Maryland (Griffin's) battery was with Stuart's horse artillery (p.346).", src: `${OR2} p.286, p.346` },
  'C-ART-Brown-C': { text: "This record duplicates Brown's (Chesapeake) battery shown as C-ART-Brown-J; the roster names one Brown's battery in the battalion (27/2 p.286).", src: `${OR2} p.286` },
  'C-ART-Garber': { text: "The roster (27/2 p.286) places Garber's Staunton Artillery in Jones's battalion of Early's division, not in Latimer's.", src: `${OR2} p.286` },
  'C-ART-Tanner': { text: "The roster (27/2 p.286) places Tanner's Courtney Artillery in Jones's battalion of Early's division, not in Latimer's.", src: `${OR2} p.286` },
};
const allBat = (f, pick) => { const out = []; const j = jr(f); pick(j, out); return out; };
const ub = allBat('union_artillery.json', (j, o) => { for (const c of j.corps_artillery_brigades) o.push(...c.batteries); for (const b of j.artillery_reserve.brigades) o.push(...b.batteries); });
const cb = allBat('confederate_artillery.json', (j, o) => { for (const k of ['first_corps_artillery', 'second_corps_artillery', 'third_corps_artillery']) for (const bn of j[k].battalions) o.push(...bn.batteries); });
const batRows = (list) => list.filter((b) => NOTE_ART[b.battery_id]).map((b) => ({ id: b.battery_id, set: { key_action: NOTE(b.key_action, NOTE_ART[b.battery_id].text) }, cls: 'unverified-record', before: 'battery placed in a brigade or battalion the roster does not support', src: NOTE_ART[b.battery_id].src }));
export const groups = [
  { file: 'oob/union_artillery.json', key: 'battery_id', rows: batRows(ub) },
  { file: 'oob/confederate_artillery.json', key: 'battery_id', rows: batRows(cb) },
  { file: 'oob/union_oob_brigades.json', key: 'brigade_id', rows: unionBrig },
  ...['union_regiments_i_ii_corps', 'union_regiments_iii_v_corps', 'union_regiments_vi_xi_xii_corps'].map((f) => ({ file: `oob/${f}.json`, key: 'regiment_id', rows: unionRegs.filter((r) => r.file === f).map(({ file, ...r }) => r) })),
  ...['confederate_regiments_first_corps', 'confederate_regiments_second_corps', 'confederate_regiments_third_corps'].map((f) => ({ file: `oob/${f}.json`, key: 'regiment_id', rows: confRegs.filter((r) => r.file === f).map(({ file, ...r }) => r) })),
];
export default [];
