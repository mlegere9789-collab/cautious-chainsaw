// DATA fixes: key_action of the Confederate batteries whose battalion the roster places elsewhere (OR 27/2 pp.286-290; see fixes/oobartorg.mjs for the battalion headers).
export const kind = 'rows';
const SRC = 'OR 27/2 pp.288-290 (roster of the artillery), p.607 (Hill)';
const GARNETT = "Garnett's battalion, Heth's division artillery (the roster, 27/2 p.289).";
const MCINTOSH = "McIntosh's battalion, Artillery Reserve of the Third Corps (the roster, 27/2 p.290); it marched with Pender's division on July 1 (Hill, 27/2 p.607).";
const rows = [
  ...[['C-ART-Lewis', "Anderson's division artillery -- Cemetery Ridge approach July 2."], ['C-ART-Maurin', "Anderson's division artillery July 2."], ['C-ART-Moore', "Anderson's division support."], ['C-ART-Grandy', "Anderson's division support."]]
    .map(([id, was]) => ({ id, set: { key_action: GARNETT }, cls: 'wrong-name', before: `key_action "${was}"; the roster lists the battery in Garnett's battalion, Heth's division`, src: SRC })),
  { id: 'C-ART-Hurt', edit: { key_action: [["Heth's division -- McPherson's Ridge July 1 and July 3 cannonade.", MCINTOSH]] }, cls: 'wrong-name', before: "key_action \"Heth's division -- McPherson's Ridge July 1 and July 3 cannonade\"; the roster puts McIntosh's battalion in the Artillery Reserve, not in Heth's division", src: SRC },
  ...[['C-ART-Johnson-M', "McPherson's Ridge July 1 -- fired on Buford's cavalry and Hall's battery."], ['C-ART-Rice-B', "Heth's division artillery July 1 and 3."], ['C-ART-Wallace', "Heth's division artillery."]]
    .map(([id, was]) => ({ id, set: { key_action: MCINTOSH }, cls: 'wrong-name', before: `key_action "${was}"; the roster puts McIntosh's battalion in the Artillery Reserve, not in Heth's division`, src: SRC })),
  { id: 'C-ART-Ross', set: { key_action: "Sumter Battalion (Maj. John Lane, Company A), Anderson's division artillery (the roster, 27/2 p.288); the file lists it under Henry's battalion, which the roster does not support." },
    cls: 'wrong-name', before: 'key_action "Hood\'s division support."; the battery is Company A of the Sumter battalion in Anderson\'s division, not in Henry\'s battalion (Latham, Bachman, Garden, Reilly)', src: SRC },
];
const LAT = "Latimer's (Andrews's) battalion, Johnson's division artillery (the roster, 27/2 p.286)";
const FELL = 'Killed or mortally wounded at Gettysburg (27/2 pp.451, 455)';
const rows2 = [
  { id: 'C-ART-Brown-C', set: { 'commander.fate': FELL }, cls: 'wrong-claim', before: 'duplicate record of Captain William D. Brown with fate "Survived"', src: 'OR 27/2 pp.451, 455' },
  { id: 'C-ART-Dement', set: { key_action: `Benner's Hill July 2, about 4 to 6 p.m., under Union counter-battery fire (27/2 pp.446, 504); ${LAT}.`, flag_notes: "Johnson's division reached the field late on July 1 (27/2 p.504) and its artillery was not engaged that day; the guns fired from Benner's Hill on July 2." },
    cls: 'before-arrival', before: 'key_action "Oak Hill July 1 bombardment -- cross-fire on Union I Corps" and a note placing the battery on Oak Ridge on July 1; Johnson’s division arrived late that night', src: 'OR 27/2 p.504 (Johnson), p.446, p.286' },
  { id: 'C-ART-Carpenter', set: { key_action: `Benner's Hill July 2 (27/2 pp.446, 504); ${LAT}.` },
    cls: 'before-arrival', before: 'key_action "Oak Hill July 1 -- flanking fire on Union I Corps"; Johnson’s division arrived late that night', src: 'OR 27/2 p.504 (Johnson), p.286' },
  { id: 'C-ART-Brown-J', set: { key_action: `Benner's Hill July 2 (27/2 pp.446, 504); ${LAT}. Captain William D. Brown fell at Gettysburg (27/2 pp.451, 455).`, 'commander.fate': FELL },
    cls: 'wrong-claim', before: 'key_action "Second Corps support July 1-3" (the battery fired July 2 only); fate "Survived" although the reports call Captain Brown killed at Gettysburg', src: 'OR 27/2 pp.446, 451, 455, 504' },
  { id: 'C-ART-Raine', set: { key_action: `Benner's Hill July 2 (27/2 pp.446, 504); ${LAT}.` },
    cls: 'before-arrival', before: 'key_action "Second Corps artillery July 1"; Johnson’s division arrived late that night', src: 'OR 27/2 p.504 (Johnson), p.286' },
  { id: 'C-ART-Carrington', edit: { key_action: [["Oak Hill July 1 -- flanking fire that helped destroy I Corps. Key battery in Rodes's attack.", "Jones's battalion, Early's division artillery (the roster, 27/2 p.286): came up the York road with Early's division on July 1 and engaged north of the town on Rodes's left (27/2 p.456); not on Oak Hill."]] },
    cls: 'wrong-place', before: 'key_action "Oak Hill July 1 -- fired on the flank of the Union I Corps"; Oak Hill was held by Carter’s battalion of Rodes’s division', src: 'OR 27/2 p.286, p.456, p.603' },
];

// Dance's battalion (the First Virginia Artillery, Second Corps Artillery Reserve), ranks and names the roster prints differently, and Atwell's rank
const SRC_D = 'OR 27/2 p.288 (roster: Col. J. Thompson Brown; First Virginia Artillery, Capt. Willis J. Dance; Powhatan Artillery, Lieut. John M. Cunningham; Salem Artillery, Lieut. C. B. Griffin), p.604 (Dance)';
const DANCE = "Dance's battalion (First Virginia Artillery), Second Corps Artillery Reserve (the roster, 27/2 p.288).";
const rows3 = [
  { id: 'C-ART-Watson', set: { key_action: `${DANCE} Posted on the left of the railroad cut on the morning of July 2 and opened at about 4 p.m.; on July 3 moved to the right of the Fairfield road (Dance, 27/2 p.604).` },
    cls: 'wrong-place', before: 'key_action "Second Corps -- Cemetery Hill area July 2-3"; Dance puts the battery on the left of the railroad cut, then the Fairfield road', src: SRC_D },
  { id: 'C-ART-Smith-B', set: { key_action: `${DANCE} Posted near the Seminary on July 2 and opened at about 4 p.m.; on July 3 moved to the right of the Fairfield road (Dance, 27/2 p.604).` },
    cls: 'unsupported-claim', before: 'key_action "Second Corps support"', src: SRC_D },
  { id: 'C-ART-Cunningham', set: { designation: "Cunningham's Battery (Powhatan Artillery VA, Dance's own battery)", 'commander.name': 'Lieutenant John M. Cunningham', 'commander.fate': null, key_action: `${DANCE} Posted on the left of the Fairfield road on July 2 (Dance, 27/2 p.604).` },
    cls: 'wrong-name', before: 'designation "Rockbridge Artillery" (Graham’s battery) and commander "Captain Arthur Cunningham"; the roster has the Powhatan Artillery under Lieut. John M. Cunningham', src: SRC_D },
  { id: 'C-ART-Hupp', set: { 'commander.name': 'Lieutenant C. B. Griffin (commanding Captain Hupp’s battery)', 'commander.fate': null, key_action: `${DANCE} Held in reserve on July 2; two rifled guns went into position on the right of the Fairfield road on July 3 (Dance, 27/2 p.604).` },
    cls: 'wrong-name', before: 'commander "Captain Abraham Hupp"; the roster and Dance name Lieut. C. B. Griffin commanding the Salem Artillery', src: SRC_D },
  { id: 'C-ART-Rice-B', set: { 'commander.name': 'Captain R. S. Rice', 'commander.fate': null }, cls: 'wrong-name', before: 'commander "Captain William Rice"; the roster prints Capt. R. S. Rice', src: 'OR 27/2 p.290 (roster)' },
  { id: 'C-ART-Wallace', set: { 'commander.name': 'Lieutenant Samuel Wallace' }, cls: 'wrong-name', before: 'rank "Captain"; the roster prints Lieut. Samuel Wallace', src: 'OR 27/2 p.290 (roster)' },
  { id: 'C-ART-Zimmerman', set: { 'commander.name': 'Lieutenant William E. Zimmerman' }, cls: 'wrong-name', before: 'rank "Captain"; the roster prints Lieut. William E. Zimmerman', src: 'OR 27/2 p.290 (roster)' },
  { id: 'C-ART-Blount', edit: { designation: [['(Wise Artillery VA)', '(the roster calls it the Virginia Battery)']] }, cls: 'unsupported-claim', before: 'designation "Wise Artillery"; the roster (27/2 p.284) prints "Virginia Battery, Capt. Joseph G. Blount"', src: 'OR 27/2 p.284 (roster)' },
];
export const groups = [{ file: 'oob/confederate_artillery.json', key: 'battery_id', rows: [...rows, ...rows2, ...rows3] },
  { file: 'oob/union_artillery.json', key: 'battery_id', rows: [{ id: 'U-ART-EPA', set: { 'commander.name': 'Lieutenant Charles A. Atwell' }, cls: 'wrong-name', before: 'rank "Captain"; the roster prints Lieut. Charles A. Atwell', src: 'OR 27/1 p.166 (roster)' }] }];
export default [];
