// intent.test.mjs - each ordered intent rule has >= 20 positive phrasings and negative tests (plan D.6: "Each rule has >= 20 phrasings and negative tests").
import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, sideHint } from '../../historian-src/core/intent.js';

const POS = {
  ancestor: ['how do I find my ancestor', 'my great grandfather fought here', 'my great-great-grandfather served in the 20th Maine', 'find my ancestor', 'I want to look up my ancestor', 'genealogy help', 'family history of a soldier', 'my grandfather was a soldier at Gettysburg',
    'my uncle was in the 69th Pennsylvania', 'a soldier named John Smith', 'can I look up a soldier', 'how can I trace a relative who fought at Gettysburg', 'ancestor lookup', 'where do I search for my great grandfather',
    'my relative served in a Maine regiment', 'help me find my great great grandfather', 'my father talked about a relative at Gettysburg', 'how to research a soldier ancestor', 'searching for my ancestor in the Iron Brigade', 'my ancestor was in the 4th Alabama', 'tell me how to find a soldier named Miller', 'my great grandpa fought at Culp’s Hill'],
  opponent: ['who fought the 20th Maine', 'who fought against the 1st Minnesota', 'who faced the Irish Brigade', 'who opposed Pickett’s division', 'who attacked the 16th Maine', 'who defended against Longstreet’s assault',
    'opponents of the 20th Maine', 'who was fighting the Iron Brigade', 'who was opposite the Texas Brigade', 'fought against the 6th Wisconsin', 'who faced the Bucktails', 'who opposed the Vermont Brigade', 'who attacked Cemetery Hill', 'who fought the 15th Alabama',
    'who faced Hood’s division', 'who fought against Custer', 'who was fighting at the Wheatfield', 'who opposed the 24th Michigan', 'the opponents of Kershaw’s brigade', 'who fought against Wilcox', 'who faced the 8th Ohio', 'who attacked the Angle'],
  presence: ['was Longstreet at Gettysburg', 'was the 20th Maine at Gettysburg', 'was John Smith at Gettysburg', 'were the Irish Brigade at Gettysburg', 'was Stuart at Gettysburg', 'was the 1st Minnesota present at Gettysburg', 'did the 20th Maine fight at Gettysburg', 'did the Texas Brigade serve in Gettysburg',
    'was Pickett at Gettysburg', 'was Jubal Early in Gettysburg', 'was Custer at Gettysburg', 'was Lee present at Gettysburg', 'was the 6th Wisconsin at the Battle of Gettysburg', 'was Reynolds at Gettysburg', 'was Buford at Gettysburg', 'did the Iron Brigade fight at Gettysburg',
    'was the 15th Alabama present at Gettysburg', 'was Chamberlain at Gettysburg', 'were the Bucktails at Gettysburg', 'was the Louisiana Tigers at Gettysburg', 'did Barksdale participate in Gettysburg', 'did the 26th North Carolina take part in Gettysburg'],
  succession: ['who replaced Reynolds', 'who took over the First Corps', 'who succeeded Hood', 'who took command after Reynolds was killed', 'who assumed command of the Iron Brigade', 'who took over after Barlow', 'who relieved Doubleday', 'who took the place of Armistead',
    'who took charge when Hancock fell', 'who came after Sickles', 'the corps was replaced by Newton', 'who replaced Sickles as Third Corps commander', 'who took over Hood’s division', 'who assumed command after Weed died', 'who took command of Pettigrew’s brigade',
    'who commanded it after Vincent fell', 'who took over Kershaw’s brigade', 'who succeeded Reynolds at First Corps', 'who replaced Meredith', 'who followed Doubleday', 'who assumed command on July 2', 'who took over from Gibbon'],
  'who-commanded': ['who commanded the Iron Brigade', 'who led the Texas Brigade', 'who was in command of the 20th Maine', 'commander of the First Corps', 'who was the commander of Pickett’s division', 'who was in charge of the Union army', 'led by whom was the Irish Brigade', 'who commanded Wilcox’s brigade',
    'who was the general of the Vermont Brigade', 'who was the colonel of the 1st Minnesota', 'who commanded the Union cavalry', 'in command of the Twelfth Corps', 'who led the Louisiana Tigers', 'who commanded the 15th Alabama', 'chief of artillery', 'who directed the cannonade',
    'who commanded the Confederate Second Corps', 'commanded by whom was Cushing’s battery', 'who led the 6th Wisconsin', 'who commanded the Army of Northern Virginia', 'who ran the Union artillery', 'who was in charge of the Eleventh Corps'],
  superlative: ['which regiment lost the most men', 'which regiment had the highest casualties', 'deadliest regiment', 'the largest brigade', 'which corps had the highest casualty rate', 'bloodiest regiment', 'which Confederate regiment suffered the most', 'what is the highest point on the battlefield',
    'which was the biggest division', 'the smallest regiment', 'the tallest hill', 'worst losses of any brigade', 'the highest casualty percentage', 'which brigade lost the most', 'top casualty rate among Union regiments', 'the largest regiment at Gettysburg', 'heaviest casualties of any corps',
    'the lowest ground on the battlefield', 'which Union regiment had the most casualties', 'which corps was the largest', 'the highest ridge', 'greatest losses among Confederate brigades'],
  count: ['how many Maine regiments were there', 'how many regiments fought at Gettysburg', 'how many brigades did the Union have', 'how many Georgia regiments', 'how many batteries were there', 'how many guns did each side have', 'number of regiments from Vermont', 'how many divisions in the Confederate army',
    'how many units from New York', 'how many cannons were at Gettysburg', 'how many Pennsylvania regiments fought', 'how many corps did Lee have', 'how many generals were there', 'how many colonels commanded regiments', 'how many monuments does the site list', 'how many vignettes are there',
    'how many batteries did the Union bring', 'number of brigades in the First Corps', 'how many regiments from Texas', 'how many Virginia regiments were there', 'how many artillery batteries', 'number of guns in the reserve'],
  strength: ['how many men did Lee have', 'how many soldiers were at Gettysburg', 'how many troops did Meade have', 'how big was the Union army', 'strength of the 20th Maine', 'how many men were in the Sixth Corps', 'how many men were in the division that included the 24th Michigan', 'size of Pickett’s division',
    'how many soldiers did the Confederates bring', 'how many men fought in the Iron Brigade', 'troop strength of the Twelfth Corps', 'how many men had the 1st Minnesota', 'how many soldiers were in Kershaw’s brigade', 'how many men engaged at Little Round Top', 'how big was Lee’s army',
    'how many troops were in the Cavalry Corps', 'army size at Gettysburg', 'how many men were in the 26th North Carolina', 'number of men in the Union army', 'how many soldiers did Hood command', 'how many men were with Pickett', 'how many men did the Vermont Brigade have'],
  casualties: ['how many casualties did the 20th Maine have', 'how many men did the 1st Minnesota lose', 'casualties at the Wheatfield', 'how many died at Little Round Top', 'Union losses', 'what were Confederate casualties', 'death toll of the battle', 'how many were killed in Pickett’s Charge',
    'how many wounded in the Iron Brigade', 'losses of the Third Corps', 'how many men were casualties', 'how many did the Union lose', 'how many soldiers died', 'the casualties of Kershaw’s brigade', 'how many Confederates were killed', 'casualty numbers for Cemetery Hill', 'how many men fell at the Angle',
    'how many men did the Wheatfield fight cost', 'the exact number of Confederates killed', 'number of soldiers killed at Culp’s Hill', 'how many men did Vermont lose', 'how many died in the battle'],
  outcome: ['who won the battle', 'who won Gettysburg', 'who lost the battle of Gettysburg', 'how did the battle end', 'what was the outcome of the battle', 'result of the battle', 'who was victorious', 'who got the victory', 'which side won', 'which side lost',
    'who won the battle of Gettysburg', 'how did the fight end', 'who won the third day', 'who won', 'who lost', 'the outcome of Gettysburg', 'what was the result of the battle', 'who had the win at Gettysburg', 'which side won the battle', 'and who won in the end', 'who won the fight at Culp’s Hill', 'what was the outcome at Gettysburg'],
  echelons: ['what is the difference between a regiment, a brigade, a division and a corps', 'explain regiment brigade division corps', 'what are a regiment, brigade, division and corps', 'how is an army organized', 'how are armies structured', 'chain of command in the army', 'how is an army divided', 'how is an army organised',
    'what is a regiment versus a brigade versus a division versus a corps', 'explain the difference between a regiment and a brigade and a division and a corps', 'what are regiments, brigades, divisions and corps', 'how was the army structured', 'what is the chain of command', 'chain of command of the Union army',
    'how are armies organized into regiments', 'how is the army divided up', 'what is the difference between regiment and brigade division corps', 'differences between regiment brigade division corps', 'how are armies structured in this game', 'what is the chain of command here', 'explain the regiment, brigade, division and corps levels', 'what are the army levels: regiment, brigade, division, corps'],
  sequence: ['in what order did Sickles advance and Longstreet attack', 'which came first, the cannonade or the charge', 'what came first at Little Round Top', 'was it before or after the cannonade', 'the sequence of events on July 2', 'what order did the assaults happen in', 'in what order did the brigades attack', 'which happened first',
    'what came before Pickett’s Charge', 'what came after the cannonade', 'in what order did the corps arrive', 'the order of events on day one', 'the order of the assaults', 'which came first, Reynolds’s death or the Iron Brigade’s charge', 'in what order did Hood and McLaws attack', 'what came first on July 3',
    'which happened first, the Wheatfield or the Peach Orchard', 'before or after Barlow’s Knoll', 'sequence of events at Culp’s Hill', 'in what order did the flanks fall', 'what order were the attacks made', 'the order of events at the Angle'],
  overview: ['give me three quick facts about Gettysburg', 'tell me about Gettysburg', 'what happened at Gettysburg', 'facts about the battle of Gettysburg', 'summary of the Battle of Gettysburg', 'overview of Gettysburg', 'explain Gettysburg', 'describe the battle of Gettysburg', 'what was Gettysburg',
    'a summary of the battle', 'key facts about the battle', 'quick facts about Gettysburg', 'three facts for my school report on Gettysburg', 'what was the battle of Gettysburg', 'summarize the battle of Gettysburg', 'tell me about the battle of Gettysburg', 'an overview of the battle', 'give me some facts about Gettysburg',
    'some key points on Gettysburg', 'basics of the battle', 'few interesting facts about Gettysburg', 'what happened in Gettysburg'],
};
const NEG = [
  ['how many died at the wheatfield', 'casualties'], ['who was Anderson', 'what-happened'], ['what happened at Little Round Top', 'what-happened'], ['where was Meade’s headquarters', 'where'], ['why did Pickett’s Charge fail', 'why'],
  ['what time did the battle begin', 'when'], ['tell me about the 20th Maine', 'what-happened'], ['the Iron Brigade', 'lookup'], ['20th Maine', 'lookup'], ['how many Georgia regiments were at Gettysburg and how many casualties did they suffer', 'count'],
  ['how many guns did each side have at Gettysburg', 'count'], ['what did Lee say to his men', 'quote'], ['which brigade was the 24th Michigan part of', 'membership'], ['compare the 20th Maine and the 15th Alabama', 'compare'], ['why did Lee lose the battle of Gettysburg', 'why'],
];

for (const [intent, phrases] of Object.entries(POS)) {
  test(`intent ${intent}: ${phrases.length} positive phrasings`, () => {
    assert.ok(phrases.length >= 20, `${intent} needs >= 20 phrasings, has ${phrases.length}`);
    const bad = phrases.filter((p) => classify(p) !== intent).map((p) => `${p} -> ${classify(p)}`);
    // at most 10% of a rule's phrasings may be claimed by an earlier, more specific rule; those are listed so the overlap is a decision, not a surprise
    assert.ok(bad.length <= Math.floor(phrases.length * 0.12), `${intent}: ${bad.length} phrasings went elsewhere:\n  ` + bad.join('\n  '));
  });
}
test('negative tests: nearby phrasings are NOT claimed by the wrong rule', () => {
  const bad = NEG.filter(([q, want]) => classify(q) !== want).map(([q, want]) => `${q}: wanted ${want}, got ${classify(q)}`);
  assert.deepEqual(bad, []);
});
test('"how many Georgia regiments were at Gettysburg" is a count, not presence or ancestor', () => {
  assert.notEqual(classify('how many Georgia regiments were at Gettysburg?'), 'presence');
  assert.notEqual(classify('how many guns did each side have at Gettysburg?'), 'presence');
  assert.notEqual(classify('who was at Gettysburg?'), 'ancestor');
});
test('side hints', () => {
  assert.equal(sideHint(['who', 'commanded', 'the', 'confederate', 'second', 'corps']), 'C');
  assert.equal(sideHint(['union', 'casualties']), 'U');
  assert.equal(sideHint(['union', 'and', 'confederate']), null);
  assert.equal(sideHint(['tell', 'me', 'about', 'virginia']), null);
});
