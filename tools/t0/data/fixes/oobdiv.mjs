// DATA fixes: the text of the division records (the Union corps block is pretty-printed: oobcorps.mjs) and the Confederate corps records of the order of battle (notes, commander fate / notes / successor), found by the sweep that followed sample C.
// Removed or labelled: later stories (Gordon's water, Sickles's cigar, Heth's paper, Pickett "never forgave"), opinions ("unfairly blamed", "suicidal", "famous"),
// "bought time", "unauthorized" as a fact, a succession that contradicts the corrected succession file (Newton took the I Corps on July 2), and the VI Corps march time given
// for one brigade as the corps'.
export const kind = 'rows';
const OR1 = 'OR 27/1', OR2 = 'OR 27/2';
const R = (id, set, cls, before, src) => ({ id, set, cls, before, src });
const unionDivs = [
  R('U-I-3', { 'commander.notes': "The Official Records roster names Brig. Gen. Thomas A. Rowley and Maj. Gen. Abner Doubleday as the division's commanders; Doubleday commanded the I Corps from July 1." }, 'wrong-claim', 'notes said Colonel Roy Stone briefly led the division; the roster names Rowley and Doubleday', `${OR1} p.155 (roster), p.174 (return)`),
  R('U-III-2', { notes: "Humphreys's division held the Emmitsburg Road line and fell back under heavy pressure." }, 'unsupported-claim', '"conducted a fighting withdrawal"', `${OR1} p.534 (Humphreys)`),
  R('U-V-3', { 'commander.notes': "Crawford's division (the Pennsylvania Reserves) was engaged west of Little Round Top on the evening of July 2." }, 'unsupported-claim', '"famous charge ... driving Wofford\'s Confederates back through the Wheatfield"', 'no report read gives the charge'),
  R('U-VI-3', { 'commander.fate': 'Survived -- assigned to the First Corps on July 1 (see the I Corps)' }, 'wrong-claim', '"transferred to command I Corps July 1 evening"; the roster note says he superseded Doubleday on the 2d', `${OR1} p.155 (note)`),
  R('U-XI-1', { 'commander.fate': 'Severely wounded and captured on July 1', 'commander.notes': "The story that Gordon gave him water and the two met as friends after the war comes from Gordon's later account; it is not in the Official Records." }, 'unsupported-claim', '"left for dead ... Gordon gave him water believing him dying"; "famous post-war reconciliation"', 'later accounts'),
  R('U-XII-2', { notes: "Geary's division held part of Culp's Hill. On the night of July 2 Greene's brigade (U-XII-2-3) stayed in the works after the rest of the corps was sent to the left." }, 'unsupported-claim', '"held the entire hill alone"', 'Geary (Greene: 74 officers and 1,350 men)'),
  R('U-CAV-1', { notes: "Buford's division fought dismounted on McPherson's Ridge on July 1 morning before the I Corps came up." }, 'unsupported-claim', '"bought time for Reynolds"', `${OR1} Buford`),
  R('U-CAV-2', { notes: "Gregg's division and Custer's brigade fought Stuart's cavalry at East Cavalry Field on July 3." }, 'unsupported-claim', '"blocked Stuart"', `${OR1} Gregg`),
  R('U-CAV-3', { 'commander.notes': "Kilpatrick ordered Farnsworth's brigade to charge on July 3; Farnsworth was killed." }, 'unsupported-claim', '"suicidal charge"', `${OR1} Kilpatrick`),
];
const confDivs = [
  R('C-I-2', { 'commander.fate': 'Severely wounded on July 2' }, 'unsupported-claim', '"Left arm permanently paralyzed -- artillery fragment"', `${OR2} (Law, Hood)`),
  R('C-I-3', { 'commander.notes': "Pickett commanded the division in the July 3 assault." }, 'unsupported-claim', '"watched the charge from the rear ... never forgave Lee"', 'later accounts'),
  R('C-II-2', { notes: "Contains the Stonewall Brigade. Fought on Culp's Hill on July 2-3." }, 'unsupported-claim', '"throughout"', 'editorial'),
  R('C-III-2', { 'commander.fate': 'Wounded on July 1' }, 'unsupported-claim', '"shot in head; folded paper in hat cushioned the blow"', 'Heth\'s later account'),
];
const confCorps = [
  R('C-I', { 'commander.notes': "Longstreet's report says he opposed the assault of July 3. Accounts of an earlier objection and of a proposed flank march come from postwar writings. The timing of the July 2 attack is debated (Contested)." }, 'contested-fact', '"strongly opposed Lee\'s decision ... favored a strategic flanking movement"; "delay ... remains one of the most debated"', `${OR2} p.358`),
  R('C-II', { 'commander.notes': "Ewell did not attack Cemetery Hill on the evening of July 1. Lee's report says he was to carry it if he found it practicable; Ewell's report gives his reasons (OR 27/2 p.317, p.444). Whether he should have attacked is debated." }, 'contested-fact', '"failure to take Cemetery Hill ... one of the most debated moments"', `${OR2} p.317, p.444`),
  R('C-III', { 'commander.fate': 'Survived Gettysburg', 'commander.notes': "Heth's division of this corps began the July 1 fight; Lee's report says a general battle was not intended so far from the base (OR 27/2 p.317)." }, 'unsupported-claim', '"ill during the battle"; "against Hill\'s instructions"', `${OR2} p.317`),
];
export const groups = [
  { file: 'oob/union_oob_corps_division.json', key: 'division_id', rows: unionDivs },
  { file: 'oob/confederate_oob_corps_div_bde.json', key: 'division_id', rows: confDivs },
  { file: 'oob/confederate_oob_corps_div_bde.json', key: 'corps_id', rows: confCorps },
];
export default [];
