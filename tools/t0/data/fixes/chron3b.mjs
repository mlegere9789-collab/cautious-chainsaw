// DATA fixes, chronology_day3.json, events the first passes left in the original wording (found by the full read of the 134 events after sample D).
export const file = 'chronology_day3.json';
export default [
  { tick: 480, cls: 'unsupported-claim', before: '"counterattacks aggressively"; Greene\'s brigade said to advance',
    set: { event: "The XII Corps counterattacks: Candy's and Kane's brigades advance to recapture the lower works, and Johnson's division is pushed back.", flag: null },
    src: 'OR 27/1 (Geary, Kane); Greene\'s brigade held its works' },
  { tick: 540, cls: 'unsupported-claim', before: '"Each discharge tears gaps in the Confederate line. The attackers close ranks and keep moving"',
    set: { event: "Union artillery opens on the Confederate line as it advances across the open ground.", flag: null },
    src: 'OR 27/1 p.240 (Hunt)' },
  { tick: 555, cls: 'unsupported-claim', before: '"streaming back ... pour into the breach"',
    set: { event: "The Confederate penetration is broken: Armistead's men fall back over the wall or surrender, and Devereux's 19th Massachusetts and other regiments come in.", flag: null },
    src: 'OR 27/1 p.374 (Hancock), p.417' },
];
