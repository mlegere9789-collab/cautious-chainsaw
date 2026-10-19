// DATA fixes: the `fate` of commanders in the order-of-battle files, found by sample F (AUDIT.md section 4) and the sweep it triggered: every fate that names a death, a wound or a
// later career was compared with the Official Records lists of officers killed and mortally wounded (OR 27/1 pp.188-192), the reports and the roster.  What the sources do not
// support (stories from later accounts, superlatives, a later career that is false) is removed or reduced to what they do say; "KIA" for an officer the sources call mortally
// wounded is corrected; an officer shown as killed at Gettysburg who died elsewhere is corrected.
export const kind = 'rows';
const OR1 = 'OR 27/1', OR2 = 'OR 27/2';
const L = 'a later account, not in the Official Records';
const R = (file, key, id, fate, cls, before, src, extra = {}) => ({ file, key, row: { id, set: { 'commander.fate': fate, ...extra }, cls, before, src } });
const CB = 'confederate_oob_corps_div_bde', UB = 'union_oob_brigades', UA = 'union_artillery';
const I2 = 'union_regiments_i_ii_corps', I3 = 'union_regiments_iii_v_corps', I6 = 'union_regiments_vi_xi_xii_corps';
const list = [
  R(CB, 'brigade_id', 'C-I-1-2', 'Mortally wounded July 2 leading the charge toward the Peach Orchard; died July 3', 'wrong-claim', 'fate "KIA July 2 -- mortally wounded ... died July 3" (killed and mortally wounded in one string)', `${OR2} p.283 (roster note)`),
  R(CB, 'brigade_id', 'C-I-3-1', "Killed July 3 in Pickett's Charge (Lee's report)", 'unsupported-claim', 'fate "KIA July 3 -- killed on horseback at The Angle; body never officially identified"', `${OR2} p.320 (Lee); the body story is ${L}`),
  R(CB, 'brigade_id', 'C-I-3-2', 'Severely wounded July 3; survived', 'unsupported-detail', 'fate "Severely wounded July 3 -- shot through groin; survived"', `${OR2} p.320 (Lee); the wound is ${L}`),
  R(CB, 'brigade_id', 'C-I-3-3', 'Mortally wounded July 3 at the stone wall; died July 5', 'unsupported-detail', 'fate "shot moments after breaching The Angle with his hat on his sword; died July 5"', `${OR1} p.418 (Harrow); the hat on the sword is ${L}`),
  R(CB, 'brigade_id', 'C-II-1-2', 'Mortally wounded July 2 (the note attributed to him comes from later accounts, not the Official Records)', 'unsupported-quote', 'fate quotes a note written in his own blood', `${OR2} p.285 (roster); ${L}`),
  R(CB, 'brigade_id', 'C-II-3-3', 'Survived', 'wrong-claim', 'fate "never given another brigade command after Gettysburg"; Iverson commanded cavalry brigades in Georgia in 1864-65', `no Official Records source for the claim (OR 27/2 p.286 lists his brigade only)`),
  R(CB, 'brigade_id', 'C-II-3-5', 'Survived', 'unsupported-claim', 'fate "never promoted to brigadier general"', 'no source read states it'),
  R(CB, 'brigade_id', 'C-III-2-3', 'Captured July 1 (Doubleday: taken by Private Patrick Maloney of the 2d Wisconsin)', 'unsupported-claim', 'fate "first Confederate general captured since Lee assumed command"', `${OR1} p.245 (Doubleday)`),
  R(UA, 'battery_id', 'U-ART-I1OH', 'Survived Gettysburg', 'wrong-claim', 'fate "Medal of Honor for Gettysburg"; Dilger\'s Medal of Honor was for Chancellorsville (1863), not Gettysburg', 'Medal of Honor citation for Hubert Dilger (Chancellorsville); not an Official Records statement'),
  R(UB, 'brigade_id', 'U-I-2-1', 'Severely wounded July 1', 'unsupported-detail', 'fate "shot through both eyes, blinded permanently"', `${OR1} p.156 (roster note)`),
  R(UB, 'brigade_id', 'U-II-1-1', 'Mortally wounded July 2 in the Wheatfield (the exchange reported between Hancock and Cross before the advance comes from later accounts)', 'unsupported-quote', 'fate "KIA ... Hancock told him \'This is not your last fight Cross.\'" quoted as fact', `${OR1} p.175 (roster), p.188 (list of officers killed); ${L}`),
  R(UB, 'brigade_id', 'U-II-1-3', 'Mortally wounded July 2 in the Wheatfield', 'wrong-claim', 'fate "KIA July 2 -- mortally wounded" (killed and mortally wounded in one string)', `${OR1} p.158 (roster), p.190`),
  R(UB, 'brigade_id', 'U-V-2-3', 'Mortally wounded July 2 on the summit of Little Round Top', 'wrong-claim', 'fate "KIA July 2 -- shot on Little Round Top summit beside Hazlett"', `${OR1} p.652`),
  R(I2, 'regiment_id', 'U-140PA', 'Killed July 2 (OR 27/1 p.188, list of officers killed)', 'wrong-claim', 'fate "Mortally wounded July 2"; the Official Records list him among the officers killed', `${OR1} p.188`),
  R(I2, 'regiment_id', 'U-15MA', 'Mortally wounded July 2 in the advance to the Emmitsburg road (Harrow lists him among the killed)', 'wrong-date', 'fate "Mortally wounded July 3"; Harrow has the 15th Massachusetts advancing to the road and Colonel Ward falling on July 2', `${OR1} pp.418-419, p.423 (Harrow), p.188`, { key_action: "Harrow's brigade -- Colonel Ward fell on July 2 in the advance to the Emmitsburg road (Harrow, OR 27/1 pp.418-419, p.423)." }),
  R(I2, 'regiment_id', 'U-7MI', 'Killed July 3 (OR 27/1 p.188, list of officers killed)', 'unsupported-detail', 'fate "Mortally wounded July 3 -- died July 7"', `${OR1} p.188, p.418 (Harrow)`),
  R(I2, 'regiment_id', 'U-151PA', 'Severely wounded July 1', 'unsupported-detail', 'fate "Both legs wounded -- nearly fatal"', `${OR1} p.255 (Rowley), p.316 (Biddle: badly wounded)`),
  R(I6, 'regiment_id', 'U-121NY', 'Survived Gettysburg', 'unsupported-claim', 'fate "later revolutionized infantry tactics at Spotsylvania 1864" (an opinion)', 'a judgement; no source read'),
  R(I6, 'regiment_id', 'U-17CT', 'Killed July 1 (OR 27/1 p.188, list of officers killed)', 'unsupported-detail', 'fate "KIA July 1 -- shot through head at Barlow\'s Knoll"', `${OR1} p.188`),
  R(I6, 'regiment_id', 'U-13NJ', 'Survived', 'unsupported-claim', 'fate "later became one of the most important Civil War historians" (a superlative)', 'a judgement; no source read'),
];
// the 4th Michigan: Colonel Jeffords commanded it and was killed; Lieutenant Colonel Lumbard took over and was not killed
list.push({ file: I3, key: 'regiment_id', row: { id: 'U-4MI', set: { 'commander.name': 'Colonel Harrison H. Jeffords', 'commander.fate': 'Killed July 2, thrust through with a bayonet while trying to save the colors (Sweitzer, Sykes)', key_action: "Sweitzer's brigade -- Wheatfield. Colonel Jeffords was killed there; Lieutenant Colonel George W. Lumbard, the next officer in the roster, took the regiment." }, cls: 'wrong-claim', before: 'commander Lieutenant Colonel George Lumbard, fate "KIA July 2 -- killed in Wheatfield" (Colonel Jeffords was the officer killed; Lumbard survived)', src: `${OR1} p.161 (roster: Jeffords, Lumbard), p.188 (killed: Col. Harrison H. Jeffords), p.602 and p.612 (thrust through with a bayonet)` } });
// the 1st Maine Cavalry: Colonel Douty was killed at Aldie on June 17, not at Gettysburg; the roster puts the regiment in Gregg's Third Brigade of the Second Division
list.push({ file: 'union_cavalry_artillery', key: 'regiment_id', row: { id: 'U-1ME-CAV', set: { 'commander.successor': null, key_action: "Listed in the Official Records roster in Col. J. Irvin Gregg's Third Brigade of the Second Division under Lieut. Col. Charles H. Smith (27/1 p.167); this file places it with Richmond's brigade, which the roster does not support. Colonel Calvin Douty was killed at Aldie on June 17, 1863 (27/1 p.171, p.953), not at Gettysburg." }, cls: 'wrong-claim', before: 'key_action "Douty killed in Kilpatrick\'s charge" and a successor "Lieutenant Colonel Stephen Boothby, July 3"; Colonel Douty was killed at Aldie on June 17', src: `${OR1} p.167 (roster), p.171 (officers killed), p.953 (Kilpatrick: Douty fell at Aldie)` } });
// the 83rd Pennsylvania stood on the right of the 20th Maine, i.e. left of centre of Vincent's line (Chamberlain, OR 27/1 p.624: "Captain Woodward, commanding the Eighty-third Pennsylvania, on my right")
list.push({ file: I3, key: 'regiment_id', row: { id: 'U-83PA', set: { key_action: "Vincent's brigade -- Little Round Top, on the right of the 20th Maine, left of the centre of the brigade's line (Chamberlain, OR 27/1 p.624)." }, cls: 'wrong-place', before: 'key_action "right-center of Little Round Top line"', src: `${OR1} p.624 (Chamberlain), p.617 (Rice)` } });
const groups = new Map();
for (const e of list) { const k = e.file; if (!groups.has(k)) groups.set(k, { file: `oob/${k}.json`, key: e.key, rows: [] }); groups.get(k).rows.push(e.row); }
export const groups_ = [...groups.values()];
export { groups_ as groups };
export default [];
