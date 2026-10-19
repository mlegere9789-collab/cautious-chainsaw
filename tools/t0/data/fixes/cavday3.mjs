// DATA fixes: data/density_day3_cavalry.json (East Cavalry Field, 21 placement rows).  The file is pretty-printed, so the one-object-per-line note rules (notes.mjs) never
// reached it; found by the seeded sample's unit-count check (the page-wide count differed from the file's 412 unit ids).  Notes carried predictions ("He is about to save the
// battle", "He will remember this day"), a quotation no source read for this audit gives, an unsupported ratio ("outnumbered 3.5 to 1") and editorial colour ("Stuart's
// finest").  They are cut back to the names the order of battle supports; no number or time is added.
export const kind = 'text';
const PAIRS = [
  ["Stuart's 4 brigades at East Cavalry Field -- ordered by Lee to get behind Meade and strike when Pickett charges", "Stuart's four brigades on the Confederate left, east of the town (position modelled)"],
  ["Wade Hampton's brigade -- Stuart's finest. Riding southeast toward the Baltimore Pike.", "Wade Hampton's brigade on the Confederate left"],
  ["Custer's Michigan brigade -- 23-year-old Brigadier General George Custer. He is about to save the battle.", "Custer's Michigan brigade (Brigadier General George A. Custer)"],
  ["Gregg's division -- positioned to block Stuart's advance", "Gregg's Second Cavalry Division on the Union right"],
  ["Hampton's brigade advancing -- Confederate cavalry in column heading for the Baltimore Pike", "Hampton's brigade advancing"],
  ["Custer deploying his Michigan men -- they are outnumbered 3.5 to 1", "Custer deploying the Michigan brigade"],
  ["Gregg's division in line -- Gregg has placed himself squarely in Stuart's path", "Gregg's division in line"],
  ["Hampton's charge -- the Confederate cavalry sweeping forward in a massive column", "Hampton's brigade charging"],
  ["Fitz Lee following Hampton's charge", "Fitz Lee's brigade advancing"],
  ["CUSTER'S CHARGE -- 7th Michigan at full gallop into Hampton's column. Come on you Wolverines!", "Custer's Michigan regiments charge Hampton's column"],
  ["Gregg's troopers joining the melee -- the collision of two cavalry forces at full speed", "Gregg's division engaged"],
  ["Hampton repulsed -- Custer has stopped the charge. Hampton wounded.", "Hampton's charge repulsed; Hampton was wounded"],
  ["Fitz Lee falling back", "Fitz Lee's brigade falling back"],
  ["Custer's Wolverines holding their ground -- Stuart cannot get through", "Custer's Michigan brigade holding its ground"],
  ["Stuart's corps reforming -- Pickett's Charge is already failing. There is no rear to strike.", "Stuart's cavalry reforming"],
  ["Gregg's division holding East Cavalry Field -- Stuart will not pass today", "Gregg's division holding its ground"],
  ["Stuart withdrawing -- Pickett has been repulsed. There is nothing left to support.", "Stuart's cavalry withdrawing"],
  ["Custer's brigade -- they have stopped Stuart cold. 23 years old. He will remember this day.", "Custer's Michigan brigade"],
];
const cls = 'unsupported-claim';
const src = 'the removed text has no source among the Official Records pages read for this audit; the retained names are the brigades of the order of battle files (confederate_cavalry.json, union_cavalry_artillery.json)';
export default PAIRS.map(([before, after], i) => ({
  id: 'DATA-cav3-' + String(i + 1).padStart(2, '0'), target: 'data/density_day3_cavalry.json', find: `"notes": ${JSON.stringify(before)}`, repl: `"notes": ${JSON.stringify(after)}`, expect: 1, cls, before, src,
}));
