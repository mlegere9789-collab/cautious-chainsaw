// DATA fixes: the file-level metadata of the order-of-battle files (counts and notes that no page shows but that ship in data/oob/*.json), found by sample E's reading of the file notes.
// The brigade file says it holds "All 49 Union infantry brigades" and has 43 (the Sixth Corps brigades are missing); the Confederate artillery file carries a gun count of 283 and 170
// "engaged" (the records add to 182, Pendleton counts nearly 150 in position) and two "messages" of Alexander in words his memoir does not contain.
export const kind = 'text';
const OR1 = 'OR 27/1', OR2 = 'OR 27/2';
const T = (id, file, find, repl, cls, before, src) => ({ id: 'DATA-meta-' + id, target: 'data/oob/' + file, find, repl, expect: 1, cls, before, src });
export default [
  T('brig', 'union_oob_brigades.json', '"notes": "All 49 Union infantry brigades plus cavalry brigades. Each brigade record includes commander, regiment_ids list, strength, casualties, and days engaged."',
    '"notes": "43 Union infantry brigades (the I, II, III, V, XI and XII Corps) and 8 cavalry brigades. The eight Sixth Corps brigades named by the division records (U-VI-1-1 to U-VI-3-3) have no record in this file. Each brigade record includes commander, regiment_ids list, strength, casualties, and days engaged."',
    'wrong-number', '"All 49 Union infantry brigades"; the file has 43 and the army had 51', `${OR1} pp.155-168 (roster)`),
  T('gunsc', 'confederate_artillery.json', '"total_guns_approximately": 283,', '"total_guns_in_records": 182,', 'unsupported-number', '"total_guns_approximately": 283; the battery records add to 182', 'the records of this file'),
  T('gunse', 'confederate_artillery.json', '"total_confederate_guns_engaged": 170,', '"guns_in_position_by_pendleton": "nearly 150",', 'wrong-number', '170 guns engaged', `${OR2} (Pendleton: nearly 150 in position)`),
  T('msg1', 'confederate_artillery.json', '"alexander_message_1": "For God\'s sake come quick or we cannot support you -- ammunition nearly exhausted",', '"alexander_message_1": "Alexander\'s two notes to Pickett are known from his 1907 memoir; the Official Records do not print them (see vignette V-015)",', 'unsupported-quote', 'wording that is in neither the memoir nor the reports', 'Alexander, Military Memoirs of a Confederate (1907)'),
  T('msg2', 'confederate_artillery.json', '"alexander_message_2": "I would not make the charge now -- but the order has been given and the troops are already moving",', '"alexander_message_2": "see vignette V-015",', 'unsupported-quote', 'words not in the memoir', 'Alexander (1907)'),
  T('pnote', 'confederate_artillery.json', ' Most complex artillery animation sequence in the entire battle."', '"', 'unsupported-claim', '"Most complex artillery animation sequence in the entire battle"', 'an internal remark'),
  T('corr', 'union_regiments_iii_v_corps.json', 'CORRECT). The V Corps slot previously assigned to U-105PA is incorrect -- correct regiment is U-11PA-R (11th Pennsylvania Reserves). Fix tracked."', 'correct). The V Corps record for the 11th Pennsylvania Reserves is U-11PA-R."', 'leaked-note', '"Fix tracked" (an internal work note)', 'internal note'),
];
