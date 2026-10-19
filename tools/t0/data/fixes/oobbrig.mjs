// DATA fixes: brigade commanders in union_oob_brigades.json that disagree with the Official Records' order of battle (OR 27/1 p.156, p.6 report list).
export const kind = 'rows';
const S1 = 'OR 27/1 p.156 (order of battle: First Brigade, Third Division, I Corps, Col. Chapman Biddle) and p.6 (Biddle commanding regiment and First Brigade)';
const S2 = 'OR 27/1 p.156 (Second Brigade, Col. Roy Stone) and the Stone, Wister and Dana reports';
const bid = { name: 'Colonel Chapman Biddle', fate: 'Survived' };
const stone = { name: 'Colonel Roy Stone', fate: 'Wounded July 1', successor: { name: 'Lieutenant Colonel Langhorne Wister', fate: 'Wounded July 1', successor: { name: 'Colonel Edmund Dana', assumed_command: 'July 1' } } };
export const groups = [{
  file: 'oob/union_oob_brigades.json', key: 'brigade_id', rows: [
    { id: 'U-I-3-1', set: { commander: bid, key_action: 'South of Chambersburg Pike -- Seminary Ridge fighting. Colonel Chapman Biddle commanded the brigade (the Official Records roster also names Brig. Gen. Thomas A. Rowley in the brigade\'s command).' }, cls: 'wrong-name', before: 'commander Colonel Roy Stone with successors Wister and Dana, who belong to the Second Brigade (Stone\'s)', src: S1 },
    { id: 'U-I-3-2', set: { commander: stone }, cls: 'wrong-name', before: 'commander record lacked the successors Wister and Dana (listed under the First Brigade)', src: S2 },
  ],
}];
export default [];
