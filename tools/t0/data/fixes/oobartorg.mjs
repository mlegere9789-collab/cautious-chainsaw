// DATA fixes: the organisation of the Confederate artillery in data/oob/confederate_artillery.json against the Official Records roster (OR 27/2 pp.283-290), found by the
// fresh sample F (AUDIT.md section 4) and the sweep it triggered.  The roster puts:
//   Third Corps: Heth's division artillery = Lieut. Col. John J. Garnett's battalion (Donaldsonville/Maurin, Huger/Moore, Lewis, Norfolk Blues/Grandy); Pender's = Maj. W. T. Poague's;
//     Anderson's = Maj. John Lane's Sumter battalion (Companies A Ross, B Patterson, C Wingfield); McIntosh's and Pegram's battalions are the ARTILLERY RESERVE (Col. R. L. Walker),
//     p.289-290; Hill (p.607) says Heth marched with Pegram's battalion and Pender with McIntosh's.  The file labelled Garnett's "Anderson's Division", McIntosh's "Heth's Division",
//     Pegram's "Pender's Division", and filed Ross's Sumter battery under Henry's (Hood's) battalion.
//   Second Corps: Rodes's artillery = Lieut. Col. Thomas H. Carter's battalion (Reese, W. P. Carter, Page, Fry); Early's = Lieut. Col. H. P. Jones's (Carrington, Tanner, Green, Garber);
//     Johnson's = Maj. J. W. Latimer's (Dement, Carpenter, Brown, Raine/Hardwicke), p.286-287.  The file called Latimer's battalion "Andrews's" with Lieut. Col. R. S. Andrews as its commander
//     ("wounded July 1"; Andrews is not in the roster), called a record of Carter's batteries "Jones's Battalion (Rodes's Division)" and kept a fourth record of batteries that the
//     roster places in other battalions or does not name.
//   The roster also names Alexander's and Nelson's battalions (reserve), Poague's and Lane's, which the file does not list (noted in its header).
// Text patches on the battalion headers (kind 'text'); the battery records are in fixes/oobartorg2.mjs.
export const kind = 'text';
const OR2 = 'OR 27/2';
const SRC = `${OR2} pp.286-290 (roster of the artillery), p.607 (Hill)`;
const T = (id, find, repl, cls, before, src = SRC) => ({ id: 'DATA-artorg-' + id, target: 'data/oob/confederate_artillery.json', find, repl, expect: 1, cls, before, src });
export default [
  T('garnett', '"designation": "Garnett\'s Battalion (Anderson\'s Division)",', '"designation": "Garnett\'s Battalion (Heth\'s Division Artillery)",', 'wrong-name', 'Garnett\'s battalion labelled Anderson\'s division; the roster (p.289) lists it as Heth\'s artillery'),
  T('mcintosh', '"designation": "McIntosh\'s Battalion (Heth\'s Division)",', '"designation": "McIntosh\'s Battalion (Artillery Reserve, Third Corps)",', 'wrong-name', 'McIntosh\'s battalion labelled Heth\'s division; the roster (p.290) puts it in the Artillery Reserve'),
  T('pegram', '"designation": "Pegram\'s Battalion (Pender\'s Division)",', '"designation": "Pegram\'s Battalion (Artillery Reserve, Third Corps)",', 'wrong-name', 'Pegram\'s battalion labelled Pender\'s division; the roster (p.290) puts it in the Artillery Reserve'),
  T('latimer1', '"designation": "Andrews\'s Battalion",\n        "commander": {"name": "Lieutenant Colonel R. Snowden Andrews", "fate": "Wounded July 1"},',
    '"designation": "Latimer\'s Battalion, called Andrews\'s Battalion in the reports (Johnson\'s Division Artillery)",\n        "commander": {"name": "Major Joseph Latimer", "fate": "Mortally wounded July 2 -- died August 1, 1863; age 19"},',
    'wrong-name', 'Johnson\'s artillery filed as "Andrews\'s Battalion" under Lieutenant Colonel R. Snowden Andrews, "wounded July 1"; the roster (p.286) names Maj. J. W. Latimer'),
  T('carter', '"designation": "Jones\'s Battalion (Rodes\'s Division Artillery)",\n        "commander": {"name": "Lieutenant Colonel Hilary Jones", "fate": "Survived"},',
    '"designation": "Carter\'s Battalion (Rodes\'s Division Artillery); Carrington\'s battery belonged to Jones\'s Battalion (Early\'s Division)",\n        "commander": {"name": "Lieutenant Colonel Thomas Carter", "fate": "Survived"},',
    'wrong-name', 'Carter\'s battery, Fry\'s and Page\'s (Rodes\'s artillery under Lieut. Col. T. H. Carter) filed as "Jones\'s Battalion (Rodes\'s Division)"; Jones\'s battalion was Early\'s (p.286)'),
  T('alexander', '"fate": "Survived -- lost arm later in war"', '"fate": "Survived"', 'wrong-claim', 'Colonel E. P. Alexander shown as having lost an arm later in the war (he did not; the arm was lost by Colonel Oates of the 15th Alabama)', `${OR2} p.352 (Pendleton); not an Official Records statement`),
  T('latimer2', '"designation": "Latimer\'s Battalion (Johnson\'s Division Artillery)",\n        "commander": {\n          "name": "Major Joseph Latimer",',
    '"designation": "Batteries filed under Latimer\'s battalion that the roster places elsewhere or does not name (see each record)",\n        "commander": {\n          "name": "No commander of record: not a battalion of the roster (the note below is about Latimer\'s battalion, C-ART-II-1)",',
    'duplicate-record', 'a second "Latimer\'s Battalion" holding Doll\'s, Garber\'s, Tanner\'s and a duplicate Brown\'s'),
];
