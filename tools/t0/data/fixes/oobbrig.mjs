// DATA fixes: brigade commanders in union_oob_brigades.json that disagree with the Official Records' order of battle (OR 27/1 p.156, p.6 report list).
export const kind = 'rows';
const S1 = 'OR 27/1 p.156 (order of battle: First Brigade, Third Division, I Corps, Col. Chapman Biddle) and p.6 (Biddle commanding regiment and First Brigade)';
const S2 = 'OR 27/1 p.156 (Second Brigade, Col. Roy Stone) and the Stone, Wister and Dana reports';
const bid = { name: 'Colonel Chapman Biddle', fate: 'Survived' };
const stone = { name: 'Colonel Roy Stone', fate: 'Wounded July 1', successor: { name: 'Lieutenant Colonel Langhorne Wister', fate: 'Wounded July 1', successor: { name: 'Colonel Edmund Dana', assumed_command: 'July 1' } } };
export const groups = [{
  file: 'oob/union_oob_brigades.json', key: 'brigade_id', rows: [
    { id: 'U-I-3-1', set: { commander: bid, key_action: 'South of Chambersburg Pike -- Seminary Ridge fighting. Colonel Chapman Biddle commanded the brigade (the Official Records roster also names Brig. Gen. Thomas A. Rowley in the brigade\'s command).' }, cls: 'wrong-name', before: 'commander Colonel Roy Stone with successors Wister and Dana, who belong to the Second Brigade (Stone\'s)', src: S1 },
    // the 107th Pennsylvania carried the id of the 107th New York (U-107NY, a Twelfth Corps regiment, U-107NY-XII); the id is shown on the Find Unit row
    { id: 'U-I-2-1', set: { regiment_ids: ['U-16ME', 'U-13MA', 'U-94NY', 'U-104NY', 'U-107PA', 'U-11PA'] }, cls: 'wrong-id', before: 'regiment_ids lists U-107NY for the 107th Pennsylvania', src: 'OR 27/1 p.156 (roster: 107th Pennsylvania in the First Brigade of the Second Division, First Corps) and p.173 (return)' },
    { id: 'U-I-3-2', set: { commander: stone }, cls: 'wrong-name', before: 'commander record lacked the successors Wister and Dana (listed under the First Brigade)', src: S2 },
  ],
}];
export default [];
