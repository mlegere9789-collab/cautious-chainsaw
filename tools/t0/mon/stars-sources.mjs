// Machine check of the source claims behind the 20 story stars (docs/data-audit/STORY-STARS.md): every claim is a regular expression that must match the page of the
// open source it cites.  Books: or1 = Official Records, Series I, vol. 27 part 1 (Internet Archive warofrebellion271unit), or2 = part 2 (warofrebellion272unit),
// fox = Fox, Regimental Losses in the American Civil War (reglossescivilwar00foxwrich).  The page texts are the Internet Archive OCR cached by the DATA stream in tmp/env-cache
// (git-ignored; tools/t0/data/sources.mjs describes how to fetch them again), so a page number is the PRINTED number of the book.
//   node tools/t0/mon/stars-sources.mjs            prints one line per claim and exits 1 when a claim does not match its page
import { page } from '../data/sources.mjs';

// [star id, book, printed page, regex (matched on the page with white space folded, also on a copy with end-of-line hyphens joined), what the claim supports]
export const CLAIMS = [
  ['mon_20me_lrt', 'or1', 623, /informing me that this was the extreme left of our general line/, 'extreme left of the line (Chamberlain)'],
  ['mon_20me_lrt', 'or1', 624, /for an hour the fighting was severe/, 'an hour of severe fighting before the charge (Chamberlain: no clock time for the charge)'],
  ['mon_20me_lrt', 'or1', 630, /About 4 p\. m\. our regiment, Col\. J\. C\. Rice commanding, was placed in position on Round Top hill, with the Eighty-third Pennsylvania on our left/, 'brigade in position about 4 PM (Conner, 44th New York)'],
  ['mon_20me_lrt', 'or1', 632, /contest continued lively until nearly 6 p\. m\., when the enemy fell back/, 'the enemy fell back nearly 6 PM (Woodward)'],
  ['mon_15al_lrt', 'or2', 392, /my right meeting the left of their line exactly/, 'Oates struck the left of the Union line'],
  ['mon_15al_lrt', 'or2', 393, /he charged me five times, and was as often repulsed/, 'Oates: the enemy charged him five times'],
  ['mon_15al_lrt', 'or2', 393, /I ordered a charge, and the enemy in my front fled/, 'Oates ordered a charge'],
  ['mon_iron_brig', 'or1', 245, /hurled the enemy back into the run, captured, after a sharp and desperate conflict, nearly 1,000 prisoners/, 'the Iron Brigade charge (Doubleday)'],
  ['mon_iron_brig', 'or1', 245, /to it also belongs the honor of capturing General Archer himself/, 'Archer captured by the 2nd Wisconsin'],
  ['mon_iron_brig', 'or1', 245, /in the beginning of the attack referred to,\s*about 10\.15 a\. m\./, 'the attack began about 10.15'],
  ['mon_reynolds', 'or1', 266, /at this time \(about 10\.15 a\. m\.\) our gallant leader fell, mortally wounded/, 'Reynolds fell about 10.15 (Wadsworth)'],
  ['mon_reynolds', 'or1', 696, /General Reynolds was killed at 11\.15 a\. m\./, 'Howard: 11.15'],
  ['mon_cushing', 'or1', 429, /Cushing, Fourth U\. S\. Artillery, fell, mortally wounded, at the fence by the side of his guns/, 'Cushing fell at the fence (Webb)'],
  ['mon_cushing', 'or1', 429, /he fought for an hour and a half after he had reported to me that he was wounded in both thighs/, 'wounded in both thighs, fought on (Webb)'],
  ['mon_armistead', 'or1', 428, /General Armistead was left, mortally wounded, within my lines/, 'Armistead left mortally wounded within the lines (Harrow)'],
  ['mon_armistead', 'or1', 428, /General Armistead passed over the fence with probably over 100 of his command/, 'Armistead passed the fence'],
  ['mon_hancock', 'or1', 366, /I was shot with a tenpenny nail\. I did not leave the field till the victory was entirely secured/, 'Hancock dispatch'],
  ['mon_hancock', 'or1', 353, /General Hancock was wounded while sitting on his horse giving me some directions/, 'Veazey: wounded after the 16th changed front'],
  ['mon_hancock', 'or1', 117, /both Major-General Hancock, command-?\s?ing the left center, and Brigadier-General Gibbon, commanding Second Corps, were severely wounded/, 'Meade: Hancock and Gibbon severely wounded'],
  ['mon_140pa', 'or1', 375, /Col\. Richard P\. Roberts, One hundred and fortieth Pennsylvania Volunteers \(on the 2d\)/, 'Roberts killed on the 2nd (Hancock)'],
  ['mon_140pa', 'or1', 380, /Colonel Roberts, One hundred and fortieth \.?Pennsylvania Volun-?\s?teers, and Lieutenant-Colonel Merwin, Twenty-seventh Connecticut Volunteers, were instantly killed/, 'Roberts instantly killed (Caldwell)'],
  ['mon_140pa', 'or1', 394, /having the One hundred and fortieth Pennsylvania Volunteers on the ex-?\s?treme right/, 'the 140th in Zook\'s brigade (Fraser)'],
  ['mon_140pa', 'or1', 394, /About 4 p\. m\. on same day, the brigade was marched rapidly to-?\s?ward the left/, 'the brigade marched about 4 PM (Fraser)'],
  ['mon_140pa', 'or1', 379, /between 4 and 5 o.clock, I received orders to report with my command to General Sykes/, 'the division ordered out between 4 and 5 (Caldwell)'],
  ['mon_140pa', 'or1', 379, /advance in line of battle through a wheat-field/, 'the First Brigade advanced through the Wheatfield (Caldwell)'],
  ['mon_83pa', 'or1', 632, /At about 2\.30 p\. m\. was ordered into position on our extreme left, the Forty-?\s?fourth New York on my right, the Twentieth Maine on my left/, 'Woodward: 2.30 PM, neighbours'],
  ['mon_83pa', 'or1', 632, /At 3\.15 p\. m\. the enemy advanced and engaged my skirmishers/, 'Woodward: 3.15 PM'],
  ['mon_83pa', 'or1', 630, /with the Eighty-third Pennsylvania on our left/, 'Conner: the 83rd next to the 44th (about 4 PM)'],
  ['mon_irish_brig', 'or1', 386, /About 5 p\. m\. received orders to march by the left flank/, 'Kelly: 5 PM'],
  ['mon_irish_brig', 'or1', 386, /about three-quarters of an hour engaged/, 'Kelly: three quarters of an hour'],
  ['mon_irish_brig', 'or1', 379, /I had put the Second Brigade in on the right of the First/, 'Caldwell: the Second (Irish) Brigade in'],
  ['mon_1mn', 'fox', 26, /Hancock, desirous of gaining time until reinforcements could be brought forward, rode up to Colonel Colville and ordered him to take the enemy.s colors/, 'Fox: the charge to gain time'],
  ['mon_1mn', 'fox', 26, /a column of the enemy \(Willcox.s Brigade\)/, 'Fox names Willcox (Wilcox)'],
  ['mon_1mn', 'or1', 371, /The First Minnesota Regiment coming up at this moment, charged the rebel regiment in handsome style, cap-?\s?turing its colors/, 'Hancock: a regiment, colors taken'],
  ['mon_1mn', 'fox', 402, /of the eight companies engaged\s*.?\s*262 all told\s*.?\s*215 were killed and wounded/, 'Fox: 262 engaged, 215 killed and wounded in the charge'],
  ['mon_1mn', 'fox', 402, /aggregating 5 ?i killed, and 173 wounded; total, 224/, 'Fox: 224 for the battle'],
  ['mon_72pa', 'or1', 428, /The Seventy-second Pennsylvania Volunteers were held in reserve under the crest of the hill/, 'Webb: the 72nd in reserve under the crest'],
  ['mon_72pa', 'or1', 428, /The Seventy-second Pennsylvania Volunteers were ordered up to hold the crest/, 'Webb: ordered up to hold the crest'],
  ['mon_72pa', 'or1', 374, /Sixty-ninth and Seventy-first Pennsylvania\s+Volunteers, were behind a low stone wall/, 'Hancock: the 69th and 71st at the wall'],
  ['mon_26nc', 'fox', 555, /86 killed and 502 wounded ; total, 588/, 'Fox: 86 + 502 = 588'],
  ['mon_26nc', 'fox', 555, /went into action with an effective strength which is stated in the regimental official report as .over 800 men\./, 'Fox: over 800'],
  ['mon_26nc', 'fox', 555, /This loss occurred mostly in the first day.s fight/, 'Fox: mostly July 1'],
  ['mon_26nc', 'fox', 556, /26th North Carolina\. 6th Mississippi Gettysburg Shiloh Heth.s Hardee.s 820/, 'Fox table: 820 present'],
  ['mon_16vt', 'or1', 350, /the Sixteenth, after deploying,\s*performed the same/, 'Stannard: the 16th changed front'],
  ['mon_16vt', 'or1', 350, /Colonel \S*eazey, of the Sixteenth, was at once ordered to attack it in its turn upon the flank/, 'Stannard: the second flank attack'],
  ['mon_16vt', 'or1', 350, /regimental colors of the Second Florida and Eighth Virginia Regiments/, 'Stannard: colors of the 2nd Florida and 8th Virginia'],
  ['mon_16vt', 'or1', 350, /although it was for most of them their first battle/, 'Stannard: first battle'],
  ['mon_20nc', 'or2', 553, /Iverson.s brigade attacked handsomely, but suffered very heavily from the enemy.s musketry fire from behind a stone wall/, 'Rodes: the stone wall'],
  ['mon_20nc', 'or2', 554, /many of his men, being surrounded, were captured/, 'Rodes: surrounded and captured'],
  ['mon_20nc', 'or1', 310, /We brought out as prisoners 213 officers and men of the Twentieth North Carolina Regiment, with\s*\S*\s*their colors/, 'Wheelock, 97th New York: 213 men of the 20th NC'],
  ['mon_barlow', 'or1', 728, /about 3 o.clock, before the forward movement of the First Division could be arrested by my orders, the enemy appeared in our front with heavy masses of infantry/, 'Schurz: about 3 o\'clock'],
  ['mon_barlow', 'or1', 729, /Barlow, who had been directing the movements of his troops with the most praiseworthy coolness and intrepidity.{0,80}was severely wounded/, 'Schurz: Barlow severely wounded'],
  ['mon_barlow', 'or1', 712, /the men of the First Brigade of this division running through lines of the regiments of my brigade.{0,60}creating considerable confusion\. At this time General Barlow was wounded/, 'Ames: Barlow wounded as the First Brigade ran through the Second'],
  ['mon_6wis', 'or1', 276, /by direction of General James S\. Wadsworth, commanding division, he placed in charge of a cavalry guard 7 officers and about 225 men/, 'Dawes: 7 officers, about 225 men'],
  ['mon_6wis', 'or1', 278, /battle-flag of the Second Mississippi Volunteers was captured by the regiment under my command/, 'Dawes: the 2nd Mississippi flag'],
  ['mon_6wis', 'or1', 246, /Lieutenant-Colonel Dawes, their commander, ordered a charge/, 'Doubleday: the charge at the cut'],
  ['mon_avery', 'or2', 471, /Colonel Avery, of the Sixth North Carolina Regi-?\s?ment, commanding Hoke.s brigade, was mortally wounded/, 'Early: Avery mortally wounded'],
  ['mon_avery', 'or2', 473, /fell, mortally wounded, while gallantly leading his brigade in the charge on Ceme-?\s?tery Hill/, 'Early: the charge on Cemetery Hill'],
  ['mon_hood', 'or2', 298, /General Hood in the arm/, 'Lee: Hood in the arm'],
  ['mon_hood', 'or2', 320, /Major- ?Generals Hood and Pender/, 'Lee: Hood wounded'],
  ['mon_greene', 'or1', 833, /1,424/, 'Geary: 74 officers + 1,350 men = 1,424 in the Third Brigade'],
  ['mon_greene', 'or1', 827, /Colonel Dawes, Fourteenth Brook-?\s?lyn, Colonel Fowler, and One hundred and forty-seventh New York V ?olunteers, Major Banta/, 'Geary: detachments of the First Corps'],
  ['mon_greene', 'or1', 827, /Eighty-second Illinois, Lieutenant-Colonel Salomon, Forty-fifth New York Volunteers, Colonel Amsberg, and the Sixty-first Ohio/, 'Geary: detachments of the Eleventh Corps'],
  ['mon_greene', 'or1', 827, /discontinued their attack at about 10 p\. m\./, 'Geary: the attack ended about 10 PM'],
  ['mon_greene', 'or1', 121, /attacked General Greene with great vigor.{0,200}re-enforced by portions of the First and Eleventh Corps/, 'Meade: Greene reinforced'],
];

const fold = (t) => t.replace(/\s+/g, ' ');
const join = (t) => t.replace(/(\w)- (\w)/g, '$1$2');
export function check() {
  const out = [];
  for (const [id, book, pg, re, what] of CLAIMS) {
    const pages = page(book, pg);
    const hit = pages.some((p) => { const f = fold(p.text); return re.test(f) || re.test(join(f)); });
    out.push({ id, book, page: pg, what, ok: hit, pagesFound: pages.length });
  }
  return out;
}
if (process.argv[1] && process.argv[1].endsWith('stars-sources.mjs')) {
  const r = check();
  for (const c of r) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.id.padEnd(15)} ${c.book} p.${c.page}${c.pagesFound ? '' : ' (page not found)'}  ${c.what}`);
  const bad = r.filter((c) => !c.ok);
  console.log(`${r.length - bad.length} of ${r.length} claims match their page`);
  process.exit(bad.length ? 1 : 0);
}
