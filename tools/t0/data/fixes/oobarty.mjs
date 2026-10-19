// DATA fixes: casualties of Union cavalry regiments, horse-artillery batteries and artillery batteries (data/oob/union_cavalry_artillery.json, union_artillery.json)
// against the Official Records' return of casualties (OR 27/1 pp.173-187; read from the page images, battery and cavalry rows added to the transcription).
// Batteries are matched by designation.  A battery of this file that the return does not list in that brigade keeps its figure and gets a note; a battery the
// return lists but the file lacks is reported in docs/data-audit/AUDIT.md (adding a unit needs placements and is not done here).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const kind = 'rows';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..', '..', '..');
const BASE = path.join(ROOT, 'baseline', 'dist', 'data', 'oob');
const OR = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 't0', 'data', 'sources', 'or27_union_losses.json'), 'utf8')).rows;
const rd = (f) => JSON.parse(fs.readFileSync(path.join(BASE, f), 'utf8'));
const SRC = 'OR 27/1 pp.173-187 (return of casualties)';
const ord = (n) => { const x = +n; if (x % 100 >= 11 && x % 100 <= 13) return n + 'th'; return n + (x % 10 === 1 ? 'st' : x % 10 === 2 ? 'd' : x % 10 === 3 ? 'd' : 'th'); };
const NOT_LISTED = 'The Official Records return of casualties lists no loss for it.';

const HUEY = new Set(['U-2NY-CAV', 'U-4NY-CAV', 'U-6OH-CAV', 'U-8PA-CAV']);
// cavalry regiments
const cav = rd('union_cavalry_artillery.json');
const cavRows = [];
for (const r of cav.regiments) {
  const k = r.designation.replace(/\s*\(.*$/, '').replace(/(\d+)(st|nd|rd|th)\b/g, (m, n) => ord(n)).trim();
  let o = OR[k];
  const set = {};
  let before;
  if (o !== undefined) {
    if (o === r.casualties) continue;
    set.casualties = o; before = `casualties ${r.casualties} against ${o} in the return`;
    if (r.regiment_id === 'U-6US-CAV') set.key_action = (r.key_action || '').replace(/\s+$/, '') + ' The return\'s 242 casualties for this regiment occurred at Fairfield, Pa. (OR 27/1 p.185 footnote), not on the Gettysburg field.';
  } else {
    if (!(r.casualties > 0)) continue;
    set.casualties = 0; set.key_action = (r.key_action || '').replace(/\s+$/, '') + ' ' + NOT_LISTED;
    before = `casualties ${r.casualties}; the return lists no loss for the regiment`;
  }
  if (HUEY.has(r.regiment_id) && set.key_action) set.key_action = set.key_action.replace(NOT_LISTED, 'The Official Records roster notes that the brigade was at Westminster, etc., and not engaged in the battle (27/1 p.166); the return lists no loss for it.');
  cavRows.push({ id: r.regiment_id, set, cls: 'wrong-number', before, src: SRC + ' pp.185-186' });
}
const CMD = {
  'U-3WV-CAV': ['Captain Seymour B. Conger', 'Captain Seymour Beach'], 'U-1ME-CAV': ['Lieutenant Colonel Charles H. Smith', 'Colonel Calvin Douty'], 'U-Purnell-MD': ['Captain Robert E. Duvall', 'Captain Robert Snowden'],
  'U-1NJ-CAV': ['Major M. H. Beaumont', 'Lieutenant Colonel Virgil Brodrick'], 'U-2NY-CAV': ['Lieutenant Colonel Otto Harhaus', 'Lieutenant Colonel Henry Gregg'], 'U-8PA-CAV': ['Captain William A. Corrie', 'Captain William Lowe'],
};
for (const r of cav.regiments) {
  const c = CMD[r.regiment_id]; if (!c) continue;
  const ex = cavRows.find((x) => x.id === r.regiment_id) || (cavRows.push({ id: r.regiment_id, set: {}, cls: 'wrong-name', before: '', src: SRC }), cavRows[cavRows.length - 1]);
  ex.set['commander.name'] = c[0]; ex.set['commander.fate'] = null;
  ex.before += (ex.before ? '; ' : '') + `commander "${c[1]}" is not the regiment's commander in the Official Records roster`;
  ex.src = 'OR 27/1 pp.166-167 (roster)' + (ex.src ? '; ' + ex.src : '');
}
for (const id of ['U-12IL-CAV', 'U-3IN-CAV']) {
  const r = cav.regiments.find((x) => x.regiment_id === id);
  const ex = cavRows.find((x) => x.id === id) || (cavRows.push({ id, set: {}, cls: 'contested', before: '', src: SRC }), cavRows[cavRows.length - 1]);
  const ka = ex.set.key_action || r.key_action || '';
  ex.set.key_action = ka.replace(/\s+$/, '') + ' The Official Records roster (27/1 p.166) lists the 12th Illinois (four companies) and 3d Indiana (six companies) together under Col. George H. Chapman; the regimental commander shown here is not confirmed by it.';
  ex.before += (ex.before ? '; ' : '') + 'commander not confirmed by the roster (roster names Col. George H. Chapman for both regiments)';
}

// horse artillery (return pp.186: First Brigade Robertson, Second Brigade Tidball) and corps / reserve batteries
const HA = { 'U-HAB-A2US': [12, '2d United States, Battery A (Tidball\'s brigade)'], 'U-HAB-E4US': [1, '4th United States, Battery E'], 'U-HAB-M2US': [1, '2d United States, Battery M'], 'U-HAB-K1US': [3, '1st United States, Battery K'] };
const haRows = [];
const HA_RENAME = { 'U-HAB-E1US': { designation: "Batteries B and L, 2nd US Artillery (Heaton's)", why: "Lieut. Edward Heaton commanded 2d United States Batteries B and L of Robertson's horse-artillery brigade (roster p.167); the return lists no loss for them" } };
for (const b of cav.horse_artillery) {
  const m = HA[b.battery_id];
  if (m) { if (m[0] !== b.casualties) haRows.push({ id: b.battery_id, set: { casualties: m[0] }, cls: 'wrong-number', before: `casualties ${b.casualties} against ${m[0]} for ${m[1]} in the return`, src: SRC + ' p.186' }); }
  else if (b.casualties > 0) haRows.push({ id: b.battery_id, set: { ...(HA_RENAME[b.battery_id] ? { designation: HA_RENAME[b.battery_id].designation } : {}), casualties: 0, key_action: (b.key_action || '').replace(/\s+$/, '') + ' ' + NOT_LISTED }, cls: 'wrong-number', before: `casualties ${b.casualties}; the return lists no loss for this battery${HA_RENAME[b.battery_id] ? '; designation: ' + HA_RENAME[b.battery_id].why : ''}`, src: SRC + ' p.186' });
}

// corps and reserve batteries: id -> [return figure, return designation]
const BAT = {
  'U-ART-2ME': [18, '2d Maine, Battery B'], 'U-ART-L1NY-I': [17, '1st New York, Battery L (Battery E attached)'], 'U-ART-B4US': [36, '4th United States, Battery B'], 'U-ART-B1PA': [12, '1st Pennsylvania, Battery B'],
  'U-ART-B1RI': [28, '1st Rhode Island, Battery B'], 'U-ART-A1RI': [32, '1st Rhode Island, Battery A'], 'U-ART-I1US': [25, '1st United States, Battery I'], 'U-ART-A4US': [38, '4th United States, Battery A'],
  'U-ART-G1NY': [7, '1st New York, Battery G (listed with the Fourth Volunteer Brigade of the Artillery Reserve, not the Second Corps)'],
  'U-ART-B1NJ': [20, '2d New Jersey Battery'], 'U-ART-D1NY': [18, '1st New York, Battery D'], 'U-ART-4NYIND': [15, '4th New York Battery'], 'U-ART-E4US-III': [24, '4th United States, Battery K (Seeley\'s)'],
  'U-ART-C1MA': [6, '3d Massachusetts Battery (C)'], 'U-ART-L1OH': [2, '1st Ohio, Battery L'], 'U-ART-D5US': [13, '5th United States, Battery D'],
  'U-ART-I1OH': [13, '1st Ohio, Battery I'], 'U-ART-K1OH': [15, '1st Ohio, Battery K'], 'U-ART-G4US': [17, '4th United States, Battery G'], 'U-ART-13NY': [11, '13th New York Battery'],
  'U-ART-F4US-XII': [1, '4th United States, Battery F'], 'U-ART-EPA': [3, 'Pennsylvania Light, Battery E'], 'U-ART-K5US': [5, '5th United States, Battery K'],
  'U-ART-5MA': [21, '5th Massachusetts Battery (E), with the 10th New York Battery attached'], 'U-ART-9MA': [28, '9th Massachusetts Battery'], 'U-ART-15NY': [16, '15th New York Battery'],
  'U-ART-5NY': [3, '5th New York Battery'], 'U-ART-1NH': [3, '1st New Hampshire Battery'], 'U-ART-H1OH': [7, '1st Ohio, Battery H'], 'U-ART-F1PA': [23, '1st Pennsylvania, Batteries F and G'], 'U-ART-CWV': [4, 'West Virginia Battery C'],
  'U-ART-F4US': [10, '1st United States, Battery H (Eakin)'], 'U-ART-F4US-XI': [13, '1st New York, Battery I (Wiedrich)'], 'U-ART-C4US': [18, '4th United States, Battery C'], 'U-ART-C5US': [16, '5th United States, Battery C'], 'U-ART-1NYIND': [12, 'New York Light, 1st Battery (Sixth Corps list)'],
};
const RENAME = {
  'U-ART-E4US-III': { designation: 'Battery K, 4th US Artillery (Seeley\'s Battery)', why: 'the Third Corps battery commanded by Lieut. Francis Seeley was Battery K, 4th United States (return p.178; roster p.160 list); Battery E, 4th U.S. was Elder\'s horse battery' },
  'U-ART-C1MA': { designation: '3rd Massachusetts Battery (C)', why: 'the Fifth Corps battery of Lieut. Aaron Walcott was the 3d Massachusetts Battery (C) (return p.180)' },
};
RENAME['U-ART-F4US'] = { designation: "Battery H, 1st US Artillery (Eakin's Battery)", why: "Lieut. Chandler Eakin commanded Battery H, 1st United States, of the First Regular Brigade (roster p.167); Battery F, 4th U.S. was Rugg's, in the Twelfth Corps" };
RENAME['U-ART-F4US-XI'] = { designation: "Battery I, 1st New York Light Artillery (Wiedrich's Battery)", commander: 'Captain Michael Wiedrich', why: "the Eleventh Corps Artillery Brigade (roster p.164, return p.183) held Wiedrich's 1st New York Battery I, not a Battery F, 4th U.S. (Eakin served in the Reserve)" };
// roster notes for slots the roster places elsewhere (the record is kept; its position data are the project's)
const NOTE = {
  'U-ART-C1NY': 'The Official Records roster (27/1 p.161) lists Battery C, 1st New York (Capt. Almont Barnes) in the Fifth Corps Artillery Brigade; the return lists no loss for it.',
  'U-ART-L1NY': 'The roster lists Battery L, 1st New York (Capt. Gilbert Reynolds) only in the First Corps Artillery Brigade (see U-ART-L1NY-I), so this Reserve record duplicates it; the return lists no separate loss.',
  'U-ART-1NYIND': 'The roster (27/1 p.163) lists the 1st New York Independent Battery (Capt. Andrew Cowan) in the Sixth Corps Artillery Brigade; the return counts its 12 losses there.',
  'U-ART-3NY': 'The roster (27/1 p.163) lists the 3d New York Independent Battery (Capt. William Harn) in the Sixth Corps Artillery Brigade; the return lists no loss for it.',
  'U-ART-MAF': 'The roster names no Massachusetts Battery F in the Artillery Reserve; its First Volunteer Brigade held Pennsylvania Batteries C and F (Capt. James Thompson, 28 losses in the return), which this file lacks.',
  'U-ART-NYC': 'The roster names no New York Battery C (Roemer) in the Artillery Reserve; its Second Volunteer Brigade held the Connecticut 2d Battery (Capt. John Sterling, 5 losses in the return), which this file lacks.',
  'U-ART-MAE': 'The roster (27/1 p.161) lists no Massachusetts Battery E (10th) in the Fifth Corps; its Artillery Brigade held 5th U.S. Battery I (Lieut. Malbone Watson, 22 losses in the return), which this file lacks.',
  'U-ART-F5US': 'The roster (27/1 p.163) lists Battery F, 5th U.S. (Lieut. Leonard Martin) in the Sixth Corps Artillery Brigade, not the Reserve; the return lists no loss for it.',
  'U-ART-F5US-VI': 'The return lists no loss for it.',
};
const art = rd('union_artillery.json');
const artRows = [];
const batteries = [];
for (const c of art.corps_artillery_brigades) for (const b of c.batteries || []) batteries.push(b);
for (const br of art.artillery_reserve.brigades) for (const b of br.batteries || []) batteries.push(b);
for (const b of batteries) {
  const m = BAT[b.battery_id];
  const set = {};
  const befores = [];
  if (m) { if (m[0] !== b.casualties) { set.casualties = m[0]; befores.push(`casualties ${b.casualties} against ${m[0]} for ${m[1]} in the return`); } }
  else if (b.casualties > 0 || NOTE[b.battery_id]) {
    set.key_action = (b.key_action || '').replace(/\s+$/, '') + ' ' + (NOTE[b.battery_id] || 'The return of casualties does not list a battery of this designation in this brigade, so its casualties are not confirmed by it.');
    befores.push(b.casualties > 0 ? `casualties ${b.casualties} for a battery the return does not list in this brigade` : 'roster places the battery elsewhere');
  }
  const rn = RENAME[b.battery_id];
  if (rn) { set.designation = rn.designation; if (rn.commander) { set['commander.name'] = rn.commander; set['commander.fate'] = null; } befores.push(`designation "${b.designation}": ${rn.why}`); }
  if (Object.keys(set).length) artRows.push({ id: b.battery_id, set, cls: 'wrong-number', before: befores.join('; '), src: SRC });
}
export const groups = [
  { file: 'oob/union_cavalry_artillery.json', key: 'regiment_id', rows: cavRows },
  { file: 'oob/union_cavalry_artillery.json', key: 'battery_id', rows: haRows },
  { file: 'oob/union_artillery.json', key: 'battery_id', rows: artRows },
];
export default [];
if (process.argv[1] && process.argv[1].endsWith('oobarty.mjs')) console.log(cavRows.length, haRows.length, artRows.length, batteries.length);
