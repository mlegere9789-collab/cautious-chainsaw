// Assembles data-src/ledger/visual_readings.json from the readings made by looking at the page images (the numbers and lines below are what the reader
// saw; the OCR disagreements are noted beside them) plus the cached images' hashes. node tools/ledger/make-visual-readings.mjs  (needs the images cached under tmp/env-cache:
// they are fetched by tools/environment/ia-crop.mjs or the BookReader image endpoint named in each reading's image.url). The JSON it writes is the source of truth;
// the validator re-adds every table in it, so a mistyped cell breaks an addition.
import fs from 'node:fs';
import path from 'node:path';
import { pretty } from '../environment/json-out.mjs';
const CACHE = 'tmp/env-cache';
const meta = (name) => JSON.parse(fs.readFileSync(path.join(CACHE, name + '.meta.json'), 'utf8'));
const img = (ia, n, name, extra = {}) => { const m = meta(name); return { ia, reader_n: n, cache: name, url: `https://archive.org/download/${ia}/page/n${n}_w1400.jpg`, sha256: m.sha256, bytes: m.bytes, retrieved: m.retrieved.slice(0, 10), ...extra }; };
const R = [];

R.push({
  id: 'VR-jacobs-A-p46', source: 'jacobs-notes-1864', printed_page: 46, header_read: null,
  image: img('notesonrebelinva00jaco', 55, 'jacobs-A-p46.jpg', { scan_leaf: 58, note: 'BookReader index n55 = scandata leaf 58 (three non-reader leaves precede it).' }),
  lines: [
    'tude and far-reaching consequences, with any of the great battles of modern times. In the battle of Waterloo, the Allies had 72,000, the French 80,000 men; in this the Rebels had 90,000, the Federals about 60,000 men. The British had 186 cannon, the French 252; the Rebels had upwards of 200, and we an equal number. The Allies lost 20,000 in killed and wounded; the French 40,000 in killed, wounded, prisoners and deserters; the Federals lost about 4,000 killed, 12,000 wounded, and 4,000 prisoners, or, in all, about 20,000; whilst the Rebels lost 5,500 killed, 21,000 wounded, 9,000 prisoners, and 4,000 stragglers and deserters, or a total of about 40,000.',
  ],
  numbers: [72000, 80000, 90000, 60000, 186, 252, 200, 20000, 40000, 4000, 12000, 4000, 20000, 5500, 21000, 9000, 4000, 40000],
});

R.push({
  id: 'VR-or1-p187-recap', source: 'or27-1', printed_page: 187, header_read: 'Chap. XXXIX.] THE GETTYSBURG CAMPAIGN. 187',
  image: img('warofrebellion271unit', 204, 'or27-1-n204.jpg'),
  table: {
    title: 'RECAPITULATION (end of "Return of Casualties in the Union forces, &c.")',
    columns: ['killed_officers', 'killed_men', 'wounded_officers', 'wounded_men', 'missing_officers', 'missing_men', 'aggregate'],
    rows: [
      ['General headquarters', null, null, 2, 2, null, null, 4],
      ['First Army Corps', 42, 624, 262, 2969, 83, 2079, 6059],
      ['Second Army Corps', 66, 731, 270, 2924, 13, 365, 4369],
      ['Third Army Corps', 50, 543, 251, 2778, 14, 575, 4211],
      ['Fifth Army Corps', 28, 337, 129, 1482, 1, 210, 2187],
      ['Sixth Army Corps', 2, 25, 14, 171, null, 30, 242],
      ['Eleventh Army Corps', 33, 336, 120, 1802, 62, 1448, 3801],
      ['Twelfth Army Corps', 18, 186, 43, 769, 2, 64, 1082],
      ['Cavalry Corps', 5, 86, 39, 315, 8, 399, 852],
      ['Artillery Reserve', 2, 41, 15, 172, null, 12, 242],
    ],
    total_row: ['Total Army of the Potomac', 246, 2909, 1145, 13384, 183, 5182, 23049],
    figure_map: { killed: ['killed_officers', 'killed_men'], wounded: ['wounded_officers', 'wounded_men'], missing: ['missing_officers', 'missing_men'], total: ['aggregate'] },
  },
  ocr_note: 'The OCR text of this leaf prints the aggregate as "23,019"; the image shows 23,049, which is also what the rows sum to.',
});

R.push({
  id: 'VR-or2-p346-recap', source: 'or27-2', printed_page: 346, header_read: '346 N. C., VA., W. VA., MD., PA., ETC. [Chap. XXXIX.',
  image: img('warofrebellion272unit', 351, 'or27-2-n351.jpg'),
  table: {
    title: 'RECAPITULATION (end of "Return of Casualties in the Army of Northern Virginia, &c.")',
    columns: ['killed', 'wounded', 'captured_or_missing', 'aggregate'],
    rows: [
      ['First Army Corps', 910, 4339, 2290, 7539],
      ['Second Army Corps', 809, 3823, 1305, 5937],
      ['Third Army Corps', 837, 4407, 1491, 6735],
      ["Stuart's Cavalry Division", 36, 140, 64, 240],
    ],
    total_row: ['Grand total', 2592, 12709, 5150, 20451],
    figure_map: { killed: ['killed'], wounded: ['wounded'], missing: ['captured_or_missing'], total: ['aggregate'] },
  },
  notes_read: [{ id: 'prisoners-note', text: 'NOTE.-The records of prisoners of war on file in the office of the Adjutant-General, U. S. Army, bear the names of 12,227 wounded and unwounded Confederates captured by the Union forces at and about Gettysburg, from July 1 to 5, inclusive. The number of wounded is reported by the medical director of the Army of the Potomac as 6,802.', numbers: [12227, 6802, 1, 5], note: 'The last line is at the lower edge of the crop viewed; 6,802 is also in the OCR text of the leaf and in Letterman\'s report (OR vol. 27 pt. 1 p. 198). The OCR lost the 12,227 line.' }],
  ocr_note: 'The OCR text of this leaf scrambles the recapitulation columns and loses the corps rows; only the grand-total figures survive in it.',
});

R.push({
  id: 'VR-fox-p25', source: 'fox-1889', printed_page: 25, header_read: 'NUMBER KILLED AT GETTYSBURG. 25',
  image: img('reglossescivilwar00foxwrich', 36, 'fox-n36.jpg'),
  lines: ['The official figures for the Union loss at Gettysburg have lately been revised and corrected at the War Department. This final statement shows that the Union Army lost at Gettysburg 3,063 killed, 14,492 wounded, and 5,435 missing. But, as usual, the mortally wounded are included in the 14,492 wounded.', 'As a result, it appears that 5,291 men lost their lives, fighting for the Union on that field. To the recapitulation of losses, as published by Mr. Kirkley in 1886, I have attached here the number of killed, as increased by those who died of wounds, three-fourths of whom died within a week.'],
  numbers: [3063, 14492, 5435, 14492, 5291, 1886],
  table: {
    title: 'GETTYSBURG, JULY 1-3, 1863.',
    columns: ['killed', 'wounded', 'captured_or_missing', 'total', 'killed_and_died_of_wounds'],
    rows: [
      ['General Headquarters', null, 4, null, 4, null],
      ['1st Army Corps', 593, 3209, 2222, 6024, 1098],
      ['2d Army Corps', 796, 3186, 368, 4350, 1238],
      ['3d Army Corps', 578, 3026, 606, 4210, 1050],
      ['5th Army Corps', 365, 1611, 211, 2187, 593],
      ['6th Army Corps', 27, 185, 30, 242, 46],
      ['11th Army Corps', 368, 1922, 1511, 3801, 724],
      ['12th Army Corps', 204, 810, 67, 1081, 320],
      ['Cavalry Corps', 90, 352, 407, 849, 152],
      ['Reserve Artillery', 42, 187, 13, 242, 70],
    ],
    total_row: ['Total', 3063, 14492, 5435, 22990, 5291],
    figure_map: { killed: ['killed'], wounded: ['wounded'], missing: ['captured_or_missing'], total: ['total'], killed_or_died_of_wounds: ['killed_and_died_of_wounds'] },
  },
  ocr_note: 'The OCR text of this page reads "3,003 killed, 14,402 wounded" in the prose and "3,063 ... 22,000" in the table; the image shows 3,063, 14,492 and a total of 22,990, which the columns and rows sum to.',
});

R.push({
  id: 'VR-fox-p26', source: 'fox-1889', printed_page: 26, header_read: null, page_number_note: 'chapter-opening page (CHAPTER III.): no number is printed; it follows p. 25 and precedes p. 27',
  image: img('reglossescivilwar00foxwrich', 37, 'reglossescivilwar00foxwrich-n37.jpg'),
  lines: ['The regiment took 262 officers and men into this affair. It lost 50 killed and 174 wounded, total, 224 casualties, nearly all of which occurred in this fight. A remarkable feature of this loss is that none were missing.', 'Colonel Colville states that "the loss on the 2d was 215 killed and wounded, out of 262"; and that on the 3d, "Companies F and C, having rejoined, brought the number in that day\'s fight up to about 100 men." The casualties on the 3d increased the loss to 224.', 'The morning report of the First Minnesota for June 30th ... shows 27 officers and 358 men "present for duty,"'],
  numbers: [262, 50, 174, 224, 215, 262, 100, 224, 27, 358],
  ocr_note: 'The OCR text reads "202 officers and men" (image: 262) and "2(52" for the second 262.',
});

R.push({
  id: 'VR-fox-p402', source: 'fox-1889', printed_page: 402, header_read: null, page_number_note: 'the running head of the leaf reads 402 in the OCR; the crop viewed shows the body text only',
  image: img('reglossescivilwar00foxwrich', 413, 'reglossescivilwar00foxwrich-n413.jpg'),
  lines: ['complished at a terrible cost; of the eight companies engaged - 262 all told - 215 were killed and wounded. It is the largest percentage of loss recorded in the annals of modern warfare. It was in action again on the following day, its casualties at Gettysburg aggregating 51 killed, and 173 wounded; total, 224.'],
  numbers: [262, 215, 51, 173, 224],
  ocr_note: 'The OCR text reads "5 i killed" (image: 51).',
});

R.push({
  id: 'VR-fox-p555', source: 'fox-1889', printed_page: 555, header_read: null,
  image: img('reglossescivilwar00foxwrich', 566, 'reglossescivilwar00foxwrich-n566.jpg'),
  lines: ['into action with an effective strength which is stated in the regimental official report as "over 800 men." They sustained a loss, according to Surgeon-General Guild\'s report, of 86 killed and 502 wounded; total, 588. In addition there were about 120 missing, nearly all of whom must have been wounded or killed;'],
  numbers: [800, 86, 502, 588, 120],
});

R.push({
  id: 'VR-fox-p556', source: 'fox-1889', printed_page: 556, header_read: null,
  image: img('reglossescivilwar00foxwrich', 567, 'reglossescivilwar00foxwrich-n567.jpg'),
  table: {
    title: 'REMARKABLE PERCENTAGES OF LOSS IN CONFEDERATE REGIMENTS AT PARTICULAR ENGAGEMENTS (row read)',
    columns: ['present', 'killed', 'wounded', 'missing', 'per_cent'],
    rows: [['26th North Carolina, Gettysburg, Heth\'s', 820, 86, 502, null, 71.7]],
    total_row: null,
    figure_row: { present: 'present', killed: 'killed', wounded: 'wounded', per_cent: 'per_cent' },
  },
  ocr_note: 'The OCR text scrambles this row with the 6th Mississippi row below it ("820 425 86 61 502 239").',
  notes_read: [{ id: 'missing-mark', text: 'the Missing column of this row holds a double-dagger footnote mark, not a number; the regiment is numbered 26', numbers: [26] }],
});

R.push({
  id: 'VR-liv-p102', source: 'livermore-1900', printed_page: 102, header_read: '102 NUMBERS AND LOSSES IN THE CIVIL WAR',
  image: img('numberslosses00liverich', 113, 'liv-n113.jpg'),
  lines: ['GETTYSBURG, JULY 1-3, 1863. UNION ARMY. Army of the Potomac, infantry and artillery present for duty 87,312. Deduct 17 regiments 9,058. 78,254. Present for duty in 1 2/3 of cavalry 12,369. Effectives estimated at 93 per cent. of infantry and artillery and 85 per cent. of cavalry 83,289. Killed, 3155. Wounded, 14,529. Total, 17,684. Missing, 5365. Hit in 1000, 212. Hit by 1000, 272.', 'CONFEDERATE ARMY. Army of Northern Virginia, infantry and artillery present for duty May 31 64,167. Davis\'s and Pettigrew\'s brigades 6,262. Present for duty in cavalry 12,346.'],
  numbers: [87312, 9058, 78254, 12369, 83289, 3155, 14529, 17684, 5365, 64167, 6262, 12346, 93, 85],
  citations_read: 'footnote d (killed, wounded, total, missing) cites "43 W. R., 187": the same page of the Official Records as OR vol. 27 pt. 1 p. 187.',
});

R.push({
  id: 'VR-liv-p103', source: 'livermore-1900', printed_page: 103, header_read: '103 NUMBERS AND LOSSES IN THE CIVIL WAR',
  image: img('numberslosses00liverich', 114, 'liv-n114.jpg'),
  lines: ['Effectives estimated at 93 per cent. of infantry and artillery and 85 per cent. of cavalry 75,992. Deduct losses prior to Gettysburg 938. Total engaged 75,054.', 'Footnote 1: Present for duty, July 31, infantry and artillery, ex. Corse' + String.fromCharCode(39) + 's brigade (estimated at 1672 as above) 42,809. Present for duty May 31, cavalry as above 12,346. Effectives estimated at 93 per cent. of infantry and artillery and 85 per cent. of cavalry 50,306. Deduct losses in cavalry prior to Gettysburg (footnote 2) 669. 49,637. Add losses at Gettysburg as above 28,070. Total engaged 77,707.', 'Killed 2,592 | Wounded 12,709 | Missing 5,150 as per returns. | 6,026 (wounded) | 275 (missing) captured in excess of 770 reported. | 1,311 (killed) ... to equal the average proportion of killed to 4.8 wounded. | 3,903 | 18,735 | Total, 22,638 | 5,425. Hit in 1000, 301. Hit by 1000, 235.'],
  numbers: [75992, 938, 75054, 2592, 12709, 5150, 6026, 275, 770, 1311, 3903, 18735, 22638, 5425, 4.8, 93, 85, 42809, 12346, 50306, 669, 49637, 28070, 77707],
  note: 'No grand total of killed, wounded and missing is printed in the table; 22,638 + 5,425 = 28,063 is arithmetic on the printed figures. Footnote 1 (the same page, computing the number engaged on the returns of July 31) prints "Add losses at Gettysburg as above 28,070" (7 more than the sum); its subtraction is 50,306 less 669 (the 2 before 669 is a footnote mark) = 49,637, and 49,637 + 28,070 = 77,707.',
});


const small = (id, source, ia, n, cache, page, header, extra) => R.push({ id, source, printed_page: page, header_read: header, image: img(ia, n, cache), ...extra });
small('VR-or1-p113-recap', 'or27-1', 'warofrebellion271unit', 130, 'warofrebellion271unit-n130.jpg', 113, 'Chap. XXXIX.] THE GETTYSBURG CAMPAIGN. 113', {
  lines: ['RECAPITULATION. Officers and men. Killed | Wounded | Missing. Officers 243 | 1,076 | 215. Enlisted men 2,591 | 12,637 | 6,428. Total 2,834 | 13,713 | 6,643. Aggregate* 23,190 (printed in the Missing column).'],
  numbers: [243, 1076, 215, 2591, 12637, 6428, 2834, 13713, 6643, 23190],
});
small('VR-or1-p118-meade', 'or27-1', 'warofrebellion271unit', 135, 'warofrebellion271unit-n135.jpg', 118, '118 N. C., VA., W. VA., MD., PA., ETC. [Chap. XXXIX.', {
  lines: ['oners; 24,978 small-arms were collected on the battle-field. Our own losses were very severe, amounting, as will be seen by the accompanying return, to 2,834 killed, 13,709 [13,713] wounded, and 6,643 missing; in all, 23,186 [23,190].*'],
  numbers: [24978, 2834, 13709, 13713, 6643, 23186, 23190, 3, 41, 13621],
  ocr_note: 'The image crop does not include the "13,621 prisoners" line; that figure is confirmed on p. 17 (VR-or1-p17-halleck) and by the OCR here.',
});
small('VR-or1-p17-halleck', 'or27-1', 'warofrebellion271unit', 34, 'warofrebellion271unit-n34.jpg', 17, 'Chap. XXXIX.] THE GETTYSBURG CAMPAIGN. 17', {
  lines: ['Our own loss in this short campaign had been very severe, viz: Killed, 2,834; wounded, 13,709; missing, 6,643; total, 23,186.* We captured 3 guns, 41 standards, 13,621 prisoners, and 28,178 small-'],
  numbers: [2834, 13709, 6643, 23186, 3, 41, 13621, 28178],
});
small('VR-or1-p198-letterman', 'or27-1', 'warofrebellion271unit', 215, 'warofrebellion271unit-n215.jpg', 198, null, {
  lines: ['The number of our wounded, from the most reliable information at my command, amounted to 14,193.* The number of Confederate wounded who fell into our hands was 6,802, making the total number of wounded thrown by that battle upon this department 20,995.'],
  numbers: [14193, 6802, 20995], page_number_note: 'the page number is not in the crop viewed; the running head of the leaf reads 198 in the OCR text',
});
const timeVr = (id, source, ia, n, cache, page, line, times, numbers = []) => R.push({ id, source, printed_page: page, header_read: null, page_number_note: 'the page number is not in the crop viewed; it is the leaf running head (OCR text)', image: img(ia, n, cache), lines: [line], numbers, times });
timeVr('VR-or1-p245-doubleday', 'or27-1', 'warofrebellion271unit', 262, 'warofrebellion271unit-n262.jpg', 245, 'This melancholy event occurred in the beginning of the attack referred to, about 10.15 a. m. The whole burden of the battle was thus suddenly thrown upon me.', ['10:15 a.m.'], [10.15]);
timeVr('VR-or1-p696-howard', 'or27-1', 'warofrebellion271unit', 713, 'warofrebellion271unit-n713.jpg', 696, 'his right. General Reynolds was killed at 11.15 a. m. I assumed command of the two corps, and sent word to Slocum and Sickles to', ['11:15 a.m.'], [11.15]);
timeVr('VR-or1-p702-howard', 'or27-1', 'warofrebellion271unit', 719, 'warofrebellion271unit-n719.jpg', 702, '[William] Riddle, brought the sad tidings of his death. This was about 11.30 a. m. Prior to this the general had sent me orders to move up at double-quick, for he was severely engaged.', ['11:30 a.m.'], [11.3]);
timeVr('VR-or1-p727-schurz', 'or27-1', 'warofrebellion271unit', 744, 'warofrebellion271unit-n744.jpg', 727, 'tened to the front, where I arrived about 11.30 o’clock, finding you upon an eminence east of the cemetery of Gettysburg, from which', ['11:30 a.m.'], [11.3]);
timeVr('VR-or1-p891-taft', 'or27-1', 'warofrebellion271unit', 908, 'warofrebellion271unit-n908.jpg', 891, 'it at intervals until about 10 a. m. The enemy opened fire again about 1.30 p. m., which was returned by my battery. Soon after, one of my guns burst at the muzzle, and at 3 p. m. that portion of', ['1:30 p.m.'], [10, 1.3, 3]);
timeVr('VR-or2-p385-peyton', 'or27-2', 'warofrebellion272unit', 390, 'warofrebellion272unit-n390.jpg', 385, '[E. Porter] Alexander, was planted, where we lay during a most terrific cannonading, which opened at 1.30 p. m., and was kept up without intermission for one hour.', ['1:30 p.m.'], [1.3]);
R.push({ id: 'VR-jacobs-A-p41', source: 'jacobs-notes-1864', printed_page: 41, header_read: 'MARYLAND AND PENNSYLVANIA. 41',
  image: img('notesonrebelinva00jaco', 50, 'jacobs-A-p41.jpg', { scan_leaf: 53, note: 'BookReader index n50 = scandata leaf 53' }),
  lines: ['At seven minutes past 1 P. M., the awful and portentous silence was broken. Probably not less than 150 guns on each side belched forth the missiles of death, producing such a continuous succession of crashing sounds'],
  numbers: [1, 7, 150], times: ['1:07 p.m.'] });

timeVr('VR-or2-p320-lee', 'or27-2', 'warofrebellion272unit', 325, 'warofrebellion272unit-n325.jpg', 320, 'About 1 p. m., at a given signal, a heavy cannonade was opened, and continued for about two hours with marked effect upon the enemy', ['1:00 p.m.'], [1]);
timeVr('VR-or2-p352-pendleton', 'or27-2', 'warofrebellion272unit', 357, 'warofrebellion272unit-n357.jpg', 352, 'At length, about 1 p. m., on the concerted signal, our guns in position, nearly one hundred and fifty, opened fire along the entire line', ['1:00 p.m.'], [1, 150]);
timeVr('VR-or2-p376-cabell', 'or27-2', 'warofrebellion272unit', 381, 'warofrebellion272unit-n381.jpg', 376, 'The fire of the artillery was opened about 1 p. m. For over two hours the cannonading on both sides was almost continuous and in-', ['1:00 p.m.'], [1]);
timeVr('VR-or1-p239-hunt', 'or27-1', 'warofrebellion271unit', 256, 'warofrebellion271unit-n256.jpg', 239, 'house on the top of Round Top, when the enemy opened, at about 1 p. m., along his whole right, a furious cannonade on the left of our line. I estimated the number of his guns bearing on our west front at from one hundred to one hundred and twenty.', ['1:00 p.m.'], [1, 100, 120]);
timeVr('VR-or1-p262-newton', 'or27-1', 'warofrebellion271unit', 279, 'warofrebellion271unit-n279.jpg', 262, 'Near 1 p. m. the enemy opened with about one hundred and twenty guns upon the position of the army, and kept up an incessant fire for', ['1:00 p.m.'], [1, 120]);
timeVr('VR-or1-p372-hancock', 'or27-1', 'warofrebellion271unit', 389, 'warofrebellion271unit-n389.jpg', 372, 'From 11 a. m. until 1 p. m. there was an ominous stillness. About 1 o’clock, apparently by a given signal, the enemy opened upon our front with the heaviest artillery fire I have ever known.', ['1:00 p.m.'], [11, 1]);
timeVr('VR-or1-p420-harrow', 'or27-1', 'warofrebellion271unit', 437, 'warofrebellion271unit-n437.jpg', 420, 'At 1 p. m. the enemy opened a fierce cannonade upon the line from a hundred or more guns, which was continued until nearly 3 p. m.,', ['1:00 p.m.'], [1, 100, 3]);

fs.writeFileSync('data-src/ledger/visual_readings.json', pretty({
  schema_version: 1, dataset: 'ledger_visual_readings',
  note: 'Readings made by looking at the page image: the second extraction method next to the OCR text. The reader is the Claude language model viewing cropped page images (2026-10-04); it is not a human reading. Where OCR and image disagree both are recorded (ocr_note). Row and column sums of every table are re-checked by tools/ledger/validate.mjs, so a misread digit would break an addition. Images live in the git-ignored cache tmp/env-cache and are not committed; archive.org BookReader index N is the leaf index of the djvu OCR text (and, for the Jacobs scan, the scandata leaf minus the non-reader leaves).',
  readings: R,
}) + '\n');
console.log('wrote', R.length, 'readings');
