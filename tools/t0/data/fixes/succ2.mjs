// DATA fixes: the event, cause and notes text of data/oob/commander_successions.json that succ.mjs did not reach (found by sample D's first read: the seeded samples had drawn
// successions by event, commander, time and tick only).  Removed or labelled: later stories (Sickles's cigar, Cross's reply, Gordon's water, Heth's hat, Avery's note, Archer's
// greeting, Armistead's request), "KIA" for officers who were mortally wounded, an unsourced cause ("shot through the mouth", "shot through both eyes") and opinions.
export const kind = 'text';
const OR1 = 'OR 27/1', OR2 = 'OR 27/2';
const L = 'a later account, not in the Official Records';
const P = ['US-001', 'US-004', 'US-009', 'US-011', 'US-012', 'US-017', 'US-018', 'US-021', 'US-022', 'US-023', 'US-024', 'CS-001', 'CS-003', 'CS-005', 'CS-006', 'CS-007', 'CS-008', 'CS-011', 'CS-012', 'CS-014', 'CS-016', 'CS-017'];
// [field, old value, new value, class, source]
const R = [
  ['notes', "Reynolds shot through the head at the edge of Herbst Woods while directing the Iron Brigade. First general officer killed at Gettysburg.", "Reynolds was killed on the morning of July 1 (about 10.15 a.m. in Doubleday's report; Howard puts it at 11.15).", 'unsupported-claim', `${OR1} p.245, p.696`],
  ['cause', "Wounded -- shot through both eyes, blinded permanently", "Severely wounded", 'unsupported-detail', 'Robinson (OR 27/1 p.156 roster note)'],
  ['cause', "Severely wounded -- nail and saddle pommel fragments drove into thigh", "Severely wounded (his dispatch: a tenpenny nail and wood from the saddle entered his thigh)", 'unsupported-detail', `${OR1} p.366`],
  ['event', "Cross KIA -- McKeen assumes brigade", "Cross mortally wounded -- McKeen assumes brigade", 'wrong-claim', `${OR1} p.175 (roster), Caldwell`],
  ['cause', "KIA -- shot through abdomen in the Wheatfield", "Mortally wounded in the Wheatfield", 'unsupported-detail', 'Caldwell'],
  ['notes', "Hancock told Cross before the charge 'This is not your last battle, Colonel.' Cross reportedly replied 'I think this IS my last battle, General.'", "The exchange reported between Hancock and Cross before the advance comes from later accounts, not the Official Records.", 'unsupported-quote', L],
  ['event', "Zook KIA -- Fraser assumes brigade", "Zook mortally wounded -- Fraser assumes brigade", 'wrong-claim', `${OR1} p.158 (roster)`],
  ['cause', "KIA -- mortally wounded in the Wheatfield", "Mortally wounded in the Wheatfield", 'wrong-claim', 'Caldwell'],
  ['cause', "Right leg amputated -- artillery shell", "Right leg torn off by a cannon-ball", 'unsupported-detail', `${OR1} p.133`],
  ['notes', "Sickles was carried off smoking a cigar to show his men he was not dying.", "The story that Sickles smoked a cigar as he was carried off is a tradition, not in the Official Records. Birney's report says he found Sickles seriously wounded at 6 o'clock and took command at his request (OR 27/1 p.483); another account puts the wound near 7 p.m.", 'unsupported-claim', `${OR1} p.483, p.133`],
  ['cause', "KIA -- shot through head on horseback leading countercharge", "Killed at the head of his regiment (Birney, OR 27/1 p.484)", 'unsupported-claim', `${OR1} p.484`],
  ['event', "Weed KIA -- Garrard assumes brigade", "Weed mortally wounded -- Garrard assumes brigade", 'wrong-claim', `${OR1} p.652`],
  ['cause', "KIA on Little Round Top summit", "Mortally wounded on the summit of Little Round Top", 'wrong-claim', `${OR1} p.652`],
  ['event', "Hazlett KIA -- Rittenhouse assumes battery", "Hazlett mortally wounded -- Rittenhouse assumes battery", 'wrong-claim', `${OR1} p.660`],
  ['cause', "KIA on Little Round Top summit -- killed beside the dying Weed", "Mortally wounded on the summit of Little Round Top while offering help to Weed; died at 8 p.m. (OR 27/1 p.652, p.660)", 'wrong-claim', `${OR1} p.652, p.660`],
  ['cause', "Severely wounded at Barlow's Knoll -- left for dead", "Severely wounded at Barlow's Knoll and captured", 'unsupported-detail', `${OR1} p.730; ${OR2} p.444`],
  ['notes', "Gordon gave Barlow water believing him dying. Both survived and became friends after the war.", "The story that Gordon gave Barlow water and that the two became friends after the war comes from Gordon's later account; it is not in the Official Records.", 'unsupported-claim', L],
  ['cause', "KIA -- shot through mouth while serving last gun at The Angle", "Killed at the fence by his guns (Webb, OR 27/1 p.429)", 'unsupported-detail', `${OR1} p.429`],
  ['notes', "Cushing received the Medal of Honor posthumously in 2014, 151 years after the battle.", "Cushing was awarded the Medal of Honor in 2014.", 'unsupported-claim', 'the date of the award'],
  ['cause', "Left arm shattered by artillery fragment", "Severely wounded", 'unsupported-detail', `${OR2} (Law, Hood)`],
  ['notes', "Hood's arm was permanently injured. He continued to serve.", "Hood was severely wounded on July 2; Law took the division.", 'unsupported-claim', `${OR2} (Law)`],
  ['notes', "Barksdale was riding ahead of his men when shot. Found by Union soldiers, he died in a Union field hospital.", "Barksdale was mortally wounded on July 2 and died on July 3.", 'unsupported-claim', L],
  ['cause', "KIA on horseback at The Angle", "Killed in Pickett's Charge (Lee's report)", 'unsupported-detail', `${OR2} p.320 (Lee)`],
  ['notes', "Garnett rode because he was too sick to walk. His body was never conclusively identified after the battle.", "Lee's report names Garnett among the killed. The roster (27/2 p.284) and Peyton's own report (p.385) have Maj. Charles S. Peyton of the 19th Virginia commanding the brigade after him. That Garnett rode because he was ill, and that his body was not identified, come from later accounts.", 'unsupported-claim', L],
  ['cause', "Shot through groin -- briefly captured, survived", "Dangerously wounded (Lee's report)", 'unsupported-detail', `${OR2} p.320`],
  ['cause', "Shot moments after breaching The Angle -- died July 5", "Mortally wounded at the stone wall; left within the Union lines (Harrow, OR 27/1 p.418)", 'unsupported-detail', `${OR1} p.418`],
  ['notes', "Armistead fell among Union soldiers beyond the wall. He asked for Hancock to be brought to him. He died July 5 in a Union field hospital.", "Armistead fell among Union soldiers beyond the wall. The roster (27/2 p.284) lists Col. W. R. Aylett after him in the command of the brigade; no report read says who took it at the moment he fell (Contested). The messages reported from Armistead come from later accounts.", 'unsupported-claim', L],
  ['cause', "Head wound -- folded paper in hat cushioned the blow", "Wounded in the head (Heth)", 'unsupported-detail', `${OR2} p.637`],
  ['notes', "Heth survived. The folded paper in his oversized hat -- the hat did not fit well -- almost certainly saved his life.", "Heth survived. The story of the folded paper in his hat is from later accounts, not his report.", 'unsupported-claim', L],
  ['cause', "Captured -- first Confederate general taken since Lee assumed command", "Captured by Private Patrick Maloney of the 2d Wisconsin (Doubleday, OR 27/1 p.245)", 'unsupported-claim', `${OR1} p.245`],
  ['notes', "When Union soldiers recognized Archer, one is reported to have said \"Good morning, General -- we are glad to see you.\" Archer is said to have been furious. He died in 1864.", "Accounts of the greeting Archer received come from later recollections. He died in 1864.", 'unsupported-quote', L],
  ['notes', "Pender was one of Lee's most promising division commanders. His death was a serious blow.", "Pender was mortally wounded on July 2 and died on July 18.", 'unsupported-claim', 'opinion removed'],
  ['cause', "Shot through neck on Cemetery Hill slope -- wrote blood message dying", "Mortally wounded on the slope of Cemetery Hill", 'unsupported-detail', L],
  ['notes', "Avery dipped his finger in the blood from his wound and wrote: 'Tell my father I died with my face to the enemy.'", "The note attributed to Avery comes from later accounts, not the Official Records.", 'unsupported-quote', L],
  ['cause', "Stuart rejoins army after controversial absence", "Stuart reached the army", 'unsupported-claim', `${OR2} p.322`],
  ['cause', "Sabre cut to head in East Cavalry Field melee", "Severely wounded at East Cavalry Field (Lee's report)", 'unsupported-detail', `${OR2} p.322`],
];
const q = (s) => JSON.stringify(s);
export default R.map(([field, old, repl, cls, src], i) => ({ id: 'DATA-succ2-' + String(i + 1).padStart(2, '0'), target: 'data/oob/commander_successions.json', find: `"${field}": ${q(old)}`, repl: `"${field}": ${q(repl)}`, expect: 1, cls, before: old.length > 150 ? old.slice(0, 147) + '...' : old, src }));
