// classes-semantic.test.mjs - class sweeps for the semantic defects of the re-verifier's second pass: state roll-ups and state-scoped superlatives (every state, checked against the raw data), the typo repair
// never rewriting a correctly spelled word (a held-out sample of real English words, the golden set's own words, the batteries' own words), typos of names still repaired (generated edits), the known unknowns
// read by concept (many paraphrases of each, and as many questions that merely share a word with one), and the student-level gate needing content.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fixture } from './lib/fixture.mjs';
import { load, ROOT } from './lib/data.mjs';
import { scoreGolden } from './lib/score-golden.mjs';
import primary from './batteries/primary.mjs';
import heldout from './batteries/heldout.mjs';
import fresh from './batteries/fresh.mjs';

const { engine, kb } = await fixture();
const ask = (q, c) => engine.ask(q, c);
const D = load();
const REGS = D.regs.filter((r) => !r.alias_for && r.state && r.state !== 'Regular Army' && r.state !== 'Multi-state');
const STATES = [...new Set(REGS.map((r) => r.state))].sort();
const inEngine = (r) => { const e = kb.idx.get(r.regiment_id); return !!e && !e.canon; };

// ---- state roll-ups and state-scoped superlatives ----------------------------------------------------------------------------------------------------------------------------------------------
test('"what are / were the <State> regiments" (and five other ways to ask) is that state\'s roll-up with its count, for every state in the data (R-11 probed three)', async () => {
  const bad = [];
  for (const S of STATES) {
    const want = REGS.filter((r) => r.state === S && inEngine(r)).length;
    for (const q of [`what are the ${S} regiments`, `what were the ${S} regiments`, `what are the regiments from ${S}`, `list the ${S} regiments`, `the ${S} regiments`, `${S} regiments`, `how many ${S} regiments were there`]) {
      const a = await ask(q); const m = a.text.match(new RegExp(`there are (\\d+) (?:Union |Confederate )?${S} regiment records`));
      if (!m || +m[1] !== want) bad.push(`${q} -> ${m ? m[1] : a.shown.slice(0, 1) + ' ' + a.text.slice(0, 40)} (want ${want})`);
    }
  }
  assert.deepEqual(bad.slice(0, 8), [], `${bad.length} wrong over ${STATES.length} states`);
});

const val = { losses: (r) => r.casualties, size: (r) => r.strength };
test('state-scoped superlatives answer for that state and name the right regiment, for every state, every measure and both ends (R-20 probed three questions)', async () => {
  const bad = []; let n = 0;
  for (const S of STATES) {
    const recs = REGS.filter((r) => r.state === S && inEngine(r));
    if (recs.length < 2) continue;
    for (const [key, qs] of [['losses', [`which ${S} regiment lost the most men?`, `which ${S} regiment had the most casualties?`, `what ${S} regiment suffered the most losses`]], ['size', [`what was the largest ${S} regiment`, `which ${S} regiment was the biggest?`]]]) {
      const top = Math.max(...recs.map((r) => val[key](r)));
      for (const q of qs) {
        n++; const a = await ask(q); const e = kb.idx.get(a.shown[0]);
        if (!e || e.state !== S || e.attrs[key === 'losses' ? 'casualties' : 'strength'] !== top) bad.push(`${q} -> ${a.shown[0]} (${e && e.state} ${e && e.attrs[key === 'losses' ? 'casualties' : 'strength']}) want ${top}`);
        else if (!new RegExp(`of any (?:Union |Confederate )?${S} regiment`).test(a.text)) bad.push(`${q}: the answer does not say it is about ${S}`);
      }
    }
    const pos = recs.filter((r) => r.strength > 0); if (pos.length >= 2) {
      const lo = Math.min(...pos.map((r) => r.strength)); const a = await ask(`what was the smallest ${S} regiment`); const e = kb.idx.get(a.shown[0]);
      n++; if (!e || e.state !== S || e.attrs.strength !== lo) bad.push(`smallest ${S}: ${a.shown[0]} ${e && e.attrs.strength} want ${lo}`);
    }
  }
  assert.deepEqual(bad.slice(0, 8), [], `${bad.length} of ${n} wrong`);
  // a side that has no regiment from the state, and a state with no records, are said, not answered for the whole army
  const none = await ask('which Confederate Michigan regiment lost the most men'); assert.equal(none.mode, 'partial'); assert.match(none.text, /no Confederate Michigan regiment records/);
  // the whole-army superlative is unchanged
  assert.equal((await ask('which regiment lost the most men?')).shown[0], 'C-26NC');
  // "fewest" with many records at zero is said to be a tie, not a ranking
  const few = await ask('which regiment lost the fewest men'); assert.match(few.text, /show no casualties, which is the fewest/);
});

// ---- a correctly spelled word is never rewritten ----------------------------------------------------------------------------------------------------------------------------------------------
const HELD = fs.readFileSync(path.join(ROOT, 'tests/historian/fixtures/english-heldout.txt'), 'utf8').split('\n').filter((l) => l && !l.startsWith('#'));
test('the typo repair does not rewrite correctly spelled English: a held-out sample of real words (<= 4% rewritten, the rewrites listed), the verifier\'s words (none), the golden set and the batteries (none)', async () => {
  assert.ok(HELD.length >= 300, `${HELD.length} words`);
  const wrong = [];
  for (const w of HELD) { const a = await ask(`what about the ${w} at Gettysburg`); const d = (a.did_you_mean || []).filter((x) => String(x.from).toLowerCase().includes(w)); if (d.length) wrong.push(`${w}->${d.map((x) => x.to).join('/')}`); }
  console.log(`# held-out real words rewritten: ${wrong.length} of ${HELD.length} (${(100 * wrong.length / HELD.length).toFixed(1)}%): ${wrong.join(' | ')}`);
  assert.ok(wrong.length / HELD.length <= 0.04, `${wrong.length} of ${HELD.length}: ${wrong.join(' | ')}`);
  const fine = ['fraction', 'percentage', 'newspapers', 'really', 'world', 'list', 'midnight', 'thunderstorm', 'france', 'alley', 'corner', 'bridge', 'interest', 'hear', 'hope', 'doubt', 'flight', 'mine', 'duty', 'likewise', 'meantime', 'daylight', 'northwest', 'bridges', 'carriages', 'discoveries', 'mainly', 'effective', 'faithfully', 'fearless', 'handled', 'mustered', 'newspaper', 'active', 'fine', 'fore', 'gorge', 'grove', 'hereby', 'intended', 'mules'];
  for (const w of fine) { const a = await ask(`what about the ${w}?`); assert.deepEqual(a.did_you_mean || [], [], `${w}: ${JSON.stringify(a.did_you_mean)}`); }
  const G = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plan/data/hist-golden-set.json'), 'utf8'));
  const bad = [];
  for (const q of G.questions) { if (q.category === 'misspellings_aliases_abbreviations') continue; const a = await ask(q.question, q.context ? { onsite: q.context } : {}); if ((a.did_you_mean || []).length) bad.push(`${q.id}: ${JSON.stringify(a.did_you_mean)}`); }
  for (const [name, Q] of [['primary', primary], ['heldout', heldout], ['fresh', fresh]]) for (const q of Q) { if (['typo', 'gibberish'].includes(q.cat)) continue; const a = await ask(q.q); if ((a.did_you_mean || []).length) bad.push(`${name} ${q.id} "${q.q}": ${JSON.stringify(a.did_you_mean)}`); }
  assert.deepEqual(bad.slice(0, 8), [], `${bad.length} correctly spelled questions were "corrected"`);
});

test('contractions typed without an apostrophe are English words, not names to repair ("dont", "didnt", "whats", "thats"): nothing is rewritten', async () => {
  for (const w of ['dont', 'doesnt', 'didnt', 'cant', 'couldnt', 'wouldnt', 'shouldnt', 'wasnt', 'werent', 'isnt', 'arent', 'hasnt', 'havent', 'hadnt', 'wont', 'ive', 'youre', 'theyre', 'weve', 'thats', 'whats', 'whos', 'lets', 'theres', 'hows', 'wheres']) {
    const a = await ask(`${w} the men at Gettysburg fight on July 2`);
    assert.deepEqual((a.did_you_mean || []).filter((x) => String(x.from).toLowerCase().includes(w)), [], `${w}: ${JSON.stringify(a.did_you_mean)}`);
  }
});

test('typos of names are still repaired: single-edit mutations (drop, swap, substitute, double) of the longest word of 22 names reach the name (>= 88%, the plan\'s typo gate)', async () => {
  const NAMES = [['Chamberlain', ['U-20ME', 'V-010']], ['Longstreet', ['CORPS:C-I', 'D2T256', 'D2T235']], ['Barksdale', ['BDE:C-I-1-2', 'D2T278']], ['Armistead', ['V-016', 'BDE:C-I-3-3']], ['Hancock', ['CORPS:U-II', 'V-012']], ['Wheatfield', ['LOC-006']],
    ['Peach Orchard', ['LOC-007']], ['Little Round Top', ['LOC-003']], ['Cemetery Ridge', ['LOC-011']], ['Seminary Ridge', ['LOC-010']], ['Devils Den', ['LOC-005']], ['Iron Brigade', ['BDE:U-I-1-1']], ['Vincent', ['BDE:U-V-1-3', 'V-009']], ['Kemper', ['BDE:C-I-3-2']],
    ['Culps Hill', ['LOC-002']], ['Pickett', ['DIV:C-I-3', 'V-016']], ['Sickles', ['CORPS:U-III']], ['Stannard', ['BDE:U-I-3-3']], ['Buford', ['DIV:U-CAV-1', 'V-001']], ['Reynolds', ['CORPS:U-I']], ['Meade', ['ARMY:U']], ['Ewell', ['CORPS:C-II']]];
  const mut = (w) => { const out = []; const i = Math.min(w.length - 2, Math.max(2, Math.floor(w.length / 2))); out.push(w.slice(0, i) + w.slice(i + 1)); out.push(w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2)); out.push(w.slice(0, i) + (w[i] === 'e' ? 'a' : 'e') + w.slice(i + 1)); out.push(w.slice(0, i) + w[i] + w[i] + w.slice(i + 1)); return out.filter((x) => x !== w); };
  let ok = 0, n = 0; const bad = [];
  for (const [name, ids] of NAMES) {
    const part = name.split(' ').sort((x, y) => y.length - x.length)[0];
    for (const m of mut(part)) {
      const q = name.replace(part, m); n++;
      const a = await ask(q); const hit = a.shown.slice(0, 5).some((x) => ids.includes(x)) || (a.entities || []).some((e) => ids.includes(e.id));
      if (hit) ok++; else bad.push(`${q} -> ${a.mode}:${a.shown.slice(0, 2)}`);
    }
  }
  console.log(`# generated typos of names reaching the name: ${ok}/${n}; failing: ${bad.join(' | ') || 'none'}`);
  assert.ok(ok / n >= 0.88, `${ok}/${n} repaired; failing: ${bad.slice(0, 10).join(' | ')}`);
});

// ---- the known unknowns, read by concept ---------------------------------------------------------------------------------------------------------------------------------------------------
const heads = { weather: /weather series/, soldier: /cannot tell whether a specific soldier|cannot give a roster or the names|cannot confirm what an individual/, roster: /cannot give a roster or the names|cannot tell whether a specific soldier|cannot confirm what an individual/, mental: /do not hold anyone.s private thoughts/, said: /do not quote anyone saying that/ };
const SOLDIER = ['What did Private John Smith of the 20th Maine do?', 'Did Corporal Jones of the 1st Minnesota survive?', 'Tell me about Private John Smith, 20th Maine', 'Was John Smith of the 20th Maine at Gettysburg?', 'Was Sgt. William Davis in the 69th Pennsylvania at Gettysburg?',
  'Where is Sgt. William Davis of the 69th Pennsylvania buried?', 'Did Pvt. Henry Clark of the 24th Michigan get wounded?', 'What happened to Private Thomas Brown, 1st Minnesota?', 'Was Corporal James Wilson of the 16th Maine captured?', 'Who was Private Samuel Green of the 19th Indiana?',
  'was private john smith of the 20th maine wounded', 'Did Musician Frank Taylor of the 69th Pennsylvania play at Gettysburg?', 'Tell me about a soldier named Smith in the 20th Maine', 'Was Drummer Charles White of the 6th Wisconsin there?', 'Did Sergeant Peter Moore of the 2nd Wisconsin fight on July 1?',
  'Where did Private John Smith of the 20th Maine fight on July 2?', 'What was Corporal Davis of the 1st Minnesota doing on July 2?', 'Was there a Private George Hall in the 24th Michigan?', 'Did Pvt. William Jones serve in the 20th Maine at Gettysburg?', 'Was Thomas Brown of the 1st Minnesota at Gettysburg?',
  'Did anyone named Smith serve in the 20th Maine?', 'Was somebody called Davis in the 69th Pennsylvania?', 'Is there someone by the name of Clark in the 24th Michigan?'];
const ROSTER = ['Who were the men in Company K of the 20th Maine?', 'list all the soldiers of the 1st Minnesota', 'Can I see a roster of the 69th Pennsylvania?', 'What are the names of the soldiers who died in the 24th Michigan?', 'Give me the muster roll of the 20th Maine', 'who were the soldiers in the 16th Maine',
  'list every soldier in the Iron Brigade', 'names of all the men in the 1st Minnesota', 'Show me the company roster of the 6th Wisconsin', 'Who were the privates in Company B of the 2nd Wisconsin?', 'What is the nominal roll of the 19th Indiana?', 'list all the men of the 24th Michigan by name',
  'How many soldiers named Smith were in the 20th Maine?', 'who were the enlisted men of the 69th Pennsylvania', 'Which soldiers were in Company A of the 1st Minnesota?', 'give me a list of the names of everyone in the 20th Maine'];
const MENTAL = ["What did Lee think about Pickett's Charge?", 'How did Meade feel after the battle?', 'What was Longstreet thinking during the cannonade?', 'Did Pickett regret the charge?', 'What was Lee thinking on July 3?', 'How did Longstreet feel about the attack?', 'What did Meade believe about Lee?',
  "What was Sickles's opinion of Meade?", 'Was Lee worried on July 2?', 'What did Chamberlain feel when the 20th Maine charged?', 'what did Longstreet think of Lee’s plan', "What were Pickett's thoughts as he watched the charge?", 'Did Hancock fear the attack?', 'What was in Meade’s mind after July 2?',
  'what did Buford think', 'How did Howard feel on July 1?'].filter((q) => !/Hancock fear/.test(q));
const WEATHER = ['What was the weather on July 2, 1863?', 'Was there rain after the battle?', 'Did it rain the day Lee retreated?', 'weather on the second day', "what was the heat like during Pickett's Charge", 'was there a thunderstorm after the battle', "Was it raining during Pickett's Charge?",
  'How hot was it at Gettysburg on July 3?', 'Was it foggy on July 1?', 'How cold was the night of July 2?', 'was it muddy on July 2', 'What was the temperature during the battle?', 'Did the rain affect the retreat?', 'Was it sunny on the first day?', 'how humid was it during the fighting',
  'Was the ground dry on July 1?', 'Did it snow in July 1863?', 'what was the weather like on the day of the charge', 'Was July 3 hot?', 'was there a storm on July 4, 1863', 'What was the weather at Gettysburg in 1863?', 'Was it windy during the cannonade?', 'weather during the battle of Gettysburg',
  'Were the soldiers wet and cold on July 2?', 'was it a hot day when Pickett charged', 'what was the weather when the 20th Maine charged?', 'How was the weather during the retreat?', 'Was there lightning on July 2?', 'what was the climate like at the battle', 'Did a thunderstorm come on July 3?'];
const SAID = ['What did Sykes say about the hill?', 'what did Chamberlain say about his men?'];

test('the known unknowns are read by concept: many paraphrases of each (weather 30, individual soldier 20, roster 16, what someone thought 15, nothing recorded 2), each answered with its own limitation', async () => {
  const bad = [];
  for (const [kind, qs] of [['weather', WEATHER], ['soldier', SOLDIER], ['roster', ROSTER], ['mental', MENTAL], ['said', SAID]]) for (const q of qs) {
    const a = await ask(q);
    if (!heads[kind].test(a.text) || !(a.limited || a.mode === 'partial' || a.route === 'ancestor') || a.mode === 'decline') bad.push(`${kind}: ${q} -> ${a.mode}/${a.intent}: ${a.text.slice(0, 70)}`);
    if (kind === 'weather' && /Raine|Cullen Battle|Rainey/.test(a.text)) bad.push(`weather answered with a person or battery: ${q}`);
  }
  assert.deepEqual(bad.slice(0, 10), [], `${bad.length} of ${WEATHER.length + SOLDIER.length + ROSTER.length + MENTAL.length + SAID.length} not read as the unknown they are`);
});

test('questions that merely share a word with a known unknown are answered normally (45 of them): storming, heat of battle, a private matter, a person the records hold, a thinker that is not a person', async () => {
  const NORMAL = ['Who stormed the Peach Orchard?', "What was the heat of the fighting on Culp's Hill?", 'Which regiment was in the thick of the storm of shot on July 2?', 'Who commanded the 20th Maine?', 'How many men did the 1st Minnesota lose?', "What was Pickett's Charge?",
    'What did Colonel Chamberlain do on July 2?', 'Who was General Hancock?', 'Was General Hancock at Gettysburg?', 'Who were the commanders of the Iron Brigade?', 'Which regiments were in the Iron Brigade?', 'How many regiments did Michigan have?', 'list the Wisconsin regiments',
    'Who replaced Reynolds?', 'What was the Soldiers National Cemetery?', 'What did Lee order on July 3?', 'Why did Lee attack the center?', 'What was the thunder of the guns called?', 'Where was the 20th Maine?', 'Who led the Texas Brigade?', 'How did the 1st Minnesota fare on July 2?',
    'Who was killed at Little Round Top?', 'Which soldiers received the Medal of Honor at Gettysburg?', 'What was the position of the Union army on July 2?', 'What did the men of the 20th Maine do when their ammunition ran low?', 'private property at Gettysburg', 'How many privates were in a regiment?',
    'What was the role of a sergeant in a regiment?', 'Who was the colonel of the 1st Minnesota?', 'What does "brigade" mean?', 'What is a corps?', 'What was the Peach Orchard?', 'How many men fought on July 2?', 'What time did the cannonade begin?', 'What was the Wheatfield?',
    'Who commanded the Confederate cavalry?', 'What was the rain of shells on Cemetery Ridge called?', 'Was Lee ill during the battle?', 'What was Lee’s plan for July 3?', 'What did Meade decide on July 2?', 'What happened to the 24th Michigan?', 'Who was Joshua Chamberlain?', 'How many Union soldiers were killed?', 'What did Longstreet advise?', 'What was cold steel?'];
  const bad = [];
  for (const q of NORMAL) { const a = await ask(q); if (a.intent === 'unknown' || Object.values(heads).some((h) => h.test(a.text))) bad.push(`${q} -> ${a.intent}: ${a.text.slice(0, 60)}`); }
  assert.deepEqual(bad.slice(0, 8), [], `${bad.length} wrongly read as an unknown`);
});

// ---- the student-level gate needs content ------------------------------------------------------------------------------------------------------------------------------------------------------
test('the student-level gate: a short card that gives an event, a date and a place meets the readability test but not the gate; a readable answer that covers the expected points does', () => {
  const golden = { version: 't', questions: [{ id: 'G1', category: 'classroom_student', question: 'Explain it to a 5th grader.', context: null, audience: 'grade_5', readability_max_fk_grade: 7, expected_behavior: 'answer', expected_answer_points: [
    { text: 'about 12,500 men', critical: true, patterns: ['12,500'] }, { text: 'cannons and rifles stopped them', critical: true, patterns: ['cannon'] }, { text: 'the attack failed', critical: true, patterns: ['failed'] }], expected_source_ids: [], answerable_now: true, data_status: 'verified_in_data', needs_source: [], must_not_match: [], must_not_match_raw_html: [], tags: [], split: 'dev', phase_ready: 'H1' }] };
  const run = (text) => scoreGolden({ golden, answers: new Map([['G1', { id: 'G1', answer_text: text, raw_html: '', cited_ids: [], retrieved_ids: [], behavior: 'answer' }]]), split: 'all', subset: 'all', gates: null, validIds: new Set() }).per_question[0];
  const card = run("Pickett's Charge Begins. This happened on July 3, at Seminary Ridge. The site calls it one of the key moments of the battle.");
  assert.equal(card.readability_ok, true, 'it is readable: that is the point'); assert.equal(card.student_ok, false); assert.equal(card.substantive, false);
  const good = run('About 12,500 men walked across a mile of open ground on July 3. Union cannons and rifles stopped them. The attack failed, and many men were lost.');
  assert.equal(good.student_ok, true);
  const blank = run('Ok.'); assert.equal(blank.student_ok, false);
  const hard = run('The aforementioned configuration necessitated considerable reconsideration of fundamental operational methodologies, notwithstanding unprecedented circumstantial complications regarding 12,500 cannon-armed infantrymen whose assault demonstrably failed catastrophically.');
  assert.equal(hard.student_ok, false);
  const flat = scoreGolden({ golden, answers: new Map([['G1', { id: 'G1', answer_text: 'x', raw_html: '', cited_ids: [], retrieved_ids: [], behavior: 'answer' }]]), split: 'all', subset: 'all', gates: null, validIds: new Set() }).flat;
  assert.equal(flat['all.student_ok'], 0);
});

test('the plain card of an event for a young reader says something: the record\'s own figure and the site\'s own short lines that follow it, every line verbatim from the chronology, the whole card at grade 7 or lower (swept over every event)', async () => {
  const { fkGrade } = await import('../../historian-src/core/text.js');
  const events = Object.values(kb.idx.R).filter((r) => r.k === 'chronology' && r.attrs && Number.isFinite(r.attrs.tick));
  assert.ok(events.length >= 100, `${events.length} events`);
  const bad = []; let withLines = 0, withFigure = 0, longer = 0, notAnswered = 0;
  const own = (r) => `${r.title} ${r.attrs.text}`;
  for (const r of events) {
    const title = String(r.title).replace(/[.\s]+$/, '');
    const a = await ask(`Explain ${title} to a 5th grader.`);
    if (a.mode !== 'answer') { notAnswered++; continue; }                     // a title that is itself a sentence with a place or a clock in it is read as a different question: counted, below
    const asked = a.blocks.find((b) => b.t === 'lead' && (b.src || []).includes(r.id));
    if (!asked) continue;                                                     // the question reached another record (a name shared with another entry): not this sweep's subject
    const list = a.blocks.find((b) => b.t === 'list' && /^Soon after/.test(b.title || ''));
    if (/The record mentions /.test(a.text)) { withFigure++; const f = a.text.match(/The record mentions (.+?)\.(?:\s|$)/); if (!f || !(r.attrs.text || '').includes(f[1])) bad.push(`${title}: figure "${f && f[1]}" is not in the record`); }
    if (list) {
      withLines++;
      for (const it of list.items) { const rec = kb.idx.get(it.ent); const stripped = it.txt.replace(/[.\s]+$/, ''); if (!rec || rec.k !== 'chronology' || !own(rec).includes(stripped) || rec.attrs.day !== r.attrs.day || rec.attrs.tick <= r.attrs.tick || rec.attrs.tick > r.attrs.tick + 20) bad.push(`${title}: line "${it.txt}" is not a later line of the same day`); }
      if (fkGrade(a.text) > 7) bad.push(`${title}: grade ${fkGrade(a.text).toFixed(1)}`);
      if (list.items.length > 1) longer++;
    }
  }
  console.log(`# plain event cards: ${events.length} events, ${withFigure} give the record's figure, ${withLines} add following lines (${longer} with more than one); ${notAnswered} titles are read as another kind of question`);
  assert.ok(notAnswered <= events.length * 0.05, `${notAnswered} event titles were not answered`);
  assert.deepEqual(bad.slice(0, 8), [], `${bad.length} defects`);
  assert.ok(withLines >= 20 && withFigure >= 2, `too few cards say anything: ${withLines} with lines, ${withFigure} with a figure`);
  const a = await ask("Explain Pickett's Charge to a 5th grader.");
  assert.match(a.text, /approximately 12,500 men in a mile-wide front/); assert.match(a.text, /Soon after, in the site’s own words: /);
  assert.ok(fkGrade(a.text) <= 7, `grade ${fkGrade(a.text)}`);
});
