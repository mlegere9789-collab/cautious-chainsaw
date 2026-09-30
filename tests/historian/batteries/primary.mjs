// Evaluation battery for Ask-the-Historian (current corpus). 104 queries.
// Fields:
//   cat     : category (name-variant | commander | place | event | casualty | command | ancestor | oos | typo | compare | followup | day | gibberish)
//   avail   : where the answer lives.  I = indexed text (regiment/vignette-summary/terrain), R = rendered-but-not-indexed
//             (vignette full_script) or chronology (indexed only by location due to bug), S = elsewhere in site data (brigade/
//             division/corps OOB, artillery, successions, casualty_apportionment, terrain roads/structures/features, monuments),
//             N = not in any site data (needs NEW data), O = out of scope (system should decline).
//   expect  : 'answer' | 'refuse'   (refuse = correct behaviour is an honest "I don't have that" / out-of-scope message)
//   primary : ids that constitute THE answer (baseline-corpus ids: U-*/C-* regiment, V-nnn vignette, LOC-nnn, DdTt chronology;
//             extended ids for S-class: BDE:, DIV:, CORPS:, ARMY:, SUCC:, ART:, CAS:, ROAD:, STR:, TF:)
//   rel     : regexp; a returned record is 'relevant' if primary contains its id OR rel matches its core text
//   must    : regexp that must appear in the rendered answer text for the question to count as DIRECTLY ANSWERED (fact hit)
const Q = [];
const add = (cat, q, o) => Q.push({ id: 'Q' + String(Q.length + 1).padStart(3, '0'), cat, q, expect: 'answer', avail: 'I', primary: [], rel: null, must: null, ...o });

// ---- 1. regiment-name variants ----------------------------------------------------------------
add('name-variant', '20th Maine',            { primary: ['U-20ME'], rel: /20th Maine/i });
add('name-variant', 'twentieth Maine',       { primary: ['U-20ME'], rel: /20th Maine/i });
add('name-variant', '20th ME',               { primary: ['U-20ME'], rel: /20th Maine/i });
add('name-variant', '20 Maine',              { primary: ['U-20ME'], rel: /20th Maine/i });
add('name-variant', '1st Minnesota',         { primary: ['U-1MN', 'V-012'], rel: /(1st|First) Minnesota/i });
add('name-variant', 'First Minnesota',       { primary: ['U-1MN', 'V-012'], rel: /(1st|First) Minnesota/i });
add('name-variant', '1 MN',                  { primary: ['U-1MN'], rel: /(1st|First) Minnesota/i });
add('name-variant', 'Minnesota regiment',    { primary: ['U-1MN', 'V-012'], rel: /Minnesota/i });
add('name-variant', '15th Alabama',          { primary: ['C-15AL'], rel: /15th Alabama/i });
add('name-variant', 'Fifteenth Alabama',     { primary: ['C-15AL'], rel: /15th Alabama/i });
add('name-variant', '26th North Carolina',   { primary: ['C-26NC'], rel: /26th North Carolina/i });
add('name-variant', '24th Michigan',         { primary: ['U-24MI'], rel: /24th Michigan/i });
add('name-variant', '69th Pennsylvania',     { primary: ['U-69PA'], rel: /69th Pennsylvania/i });
add('name-variant', '14th Brooklyn',         { primary: ['U-84NY', 'U-14BK'], rel: /14th Brooklyn|84th New York/i });
add('name-variant', '84th NY',               { primary: ['U-84NY'], rel: /84th New York|14th Brooklyn/i });
add('name-variant', '1st Texas',             { primary: ['C-1TX'], rel: /1st Texas/i });
add('name-variant', 'Texas Brigade',         { primary: ['C-1TX', 'C-4TX', 'C-5TX'], rel: /Texas/i });
add('name-variant', 'Irish Brigade',         { primary: ['U-28MA', 'U-63NY', 'U-69NY', 'U-88NY', 'U-116PA'], rel: /Irish Brigade/i });
add('name-variant', 'Bucktails',             { primary: ['U-13PA-R', 'U-149PA', 'U-150PA'], rel: /Bucktail/i });
add('name-variant', "Berdan's Sharpshooters",{ primary: ['U-1US-SS', 'V-008'], rel: /Berdan|Sharpshooter/i });
add('name-variant', 'Stonewall Brigade',     { primary: ['C-2VA', 'C-4VA', 'C-5VA', 'C-27VA', 'C-33VA'], rel: /Stonewall/i });
add('name-variant', 'Louisiana Tigers',      { primary: ['V-014', 'C-5LA', 'C-6LA', 'C-7LA', 'C-8LA', 'C-9LA'], rel: /Louisiana Tigers|Hays/i });
add('name-variant', '6th Wisconsin',         { primary: ['U-6WI', 'V-004'], rel: /6th Wisconsin/i });
add('name-variant', 'Vermont brigade',       { primary: ['U-13VT', 'U-16VT', 'U-14VT'], rel: /Vermont/i });

// ---- 2. commanders / people -------------------------------------------------------------------
add('commander', 'Chamberlain',              { primary: ['U-20ME', 'V-010'], rel: /Chamberlain/i });
add('commander', 'Joshua Chamberlain',       { primary: ['U-20ME', 'V-010'], rel: /Chamberlain/i });
add('commander', 'Colonel Oates',            { primary: ['C-15AL'], rel: /Oates/i });
add('commander', 'William Oates',            { primary: ['C-15AL'], rel: /Oates/i });
add('commander', 'Cushing',                  { primary: ['V-018', 'D3T553'], rel: /Cushing/i });
add('commander', 'Armistead',                { primary: ['V-016', 'D3T551', 'D3T552'], rel: /Armistead/i });
add('commander', 'Longstreet',               { primary: ['D2T256', 'D2T235', 'D2T226', 'D2T360'], avail: 'R', rel: /Longstreet/i });
add('commander', 'Robert E. Lee',            { primary: ['V-023', 'D2T226', 'D2T360'], avail: 'R', rel: /\bLee\b/i });
add('commander', 'General Meade',            { primary: ['D2T252', 'D2T400', 'D3T572'], avail: 'R', rel: /\bMeade\b/i });
add('commander', 'Reynolds',                 { primary: ['V-002', 'D1T28', 'D1T25'], rel: /Reynolds/i });
add('commander', 'John Buford',              { primary: ['D1T1', 'D1T3', 'D1T12'], avail: 'R', rel: /Buford/i });
add('commander', 'Sickles',                  { primary: ['V-007', 'D2T248', 'D2T252', 'D2T298'], rel: /Sickles/i });
add('commander', 'Gouverneur Warren',        { primary: ['V-009', 'D2T263', 'D2T265'], rel: /Warren/i });
add('commander', 'George Pickett',           { primary: ['V-019', 'D3T538'], rel: /Pickett/i });
add('commander', 'Custer',                   { primary: ['V-020', 'D3T563'], rel: /Custer/i });
add('commander', 'Winfield Scott Hancock',   { primary: ['V-012', 'V-016', 'D3T520'], rel: /Hancock/i });

// ---- 3. places ---------------------------------------------------------------------------------
add('place', 'Little Round Top',             { primary: ['LOC-003', 'V-009', 'V-010'], rel: /Little Round Top/i });
add('place', "Devil's Den",                  { primary: ['LOC-005'], rel: /Devil.?s Den/i });
add('place', 'Devils Den',                   { primary: ['LOC-005'], rel: /Devil.?s Den/i });
add('place', 'The Wheatfield',               { primary: ['LOC-006', 'D2T283', 'D2T290'], rel: /Wheatfield/i });
add('place', 'Wheat field',                  { primary: ['LOC-006', 'D2T283', 'D2T290'], rel: /Wheatfield/i });
add('place', 'Peach Orchard',                { primary: ['LOC-007', 'V-007', 'D2T278', 'D2T280'], rel: /Peach Orchard/i });
add('place', "Culp's Hill",                  { primary: ['LOC-002', 'V-013', 'V-022'], rel: /Culp.?s Hill/i });
add('place', 'Cemetery Ridge',               { primary: ['LOC-011'], rel: /Cemetery Ridge/i });
add('place', 'the Angle',                    { primary: ['LOC-009', 'V-016', 'V-018', 'V-024'], rel: /\bAngle\b/i });
add('place', 'Copse of Trees',               { primary: ['TF:TF-002', 'LOC-009'], avail: 'S', rel: /copse/i });
add('place', 'Railroad Cut',                 { primary: ['LOC-017', 'V-004'], rel: /Railroad Cut/i });
add('place', 'Herbst Woods',                 { primary: ['LOC-013', 'V-002', 'V-003'], rel: /Herbst/i });
add('place', "Spangler's Spring",            { primary: ['LOC-025'], rel: /Spangler/i });
add('place', 'Bliss Farm',                   { primary: ['LOC-019'], rel: /Bliss/i });
add('place', 'Emmitsburg Road',              { primary: ['ROAD:RD-002'], avail: 'S', rel: /Emmitsburg Road/i });
add('place', "Barlow's Knoll",               { primary: ['LOC-016', 'V-006'], rel: /Barlow/i });

// ---- 4. events / why / when --------------------------------------------------------------------
add('event', "Pickett's Charge",             { primary: ['D3T538', 'V-016', 'V-019', 'V-024'], rel: /Pickett.?s Charge|Pickett/i });
add('event', 'Picketts Charge',              { primary: ['D3T538', 'V-016', 'V-019', 'V-024'], rel: /Pickett.?s Charge|Pickett/i });
add('event', 'what time did Pickett\'s Charge start', { primary: ['D3T538'], avail: 'R', rel: /PICKETT.?S CHARGE BEGINS/i, must: /(3:00|3 ?pm|15:00)/i, note: 'data label says 11:05am (wrong; C4). Correct answer is ~3pm. must=3pm so baseline+naive fix both fail until clock fixed.' });
add('event', 'why did Lee lose',             { primary: ['D3T556', 'D2T360', 'V-023', 'V-024'], avail: 'R', rel: /Pickett|assault collapses|Lee/i, note: 'interpretive question; corpus has facts but no explicit causal analysis' });
add('event', 'who fired the first shot',     { primary: ['V-001', 'D1T12'], rel: /first shot|Marcellus Jones/i, must: /Marcellus Jones|Jones/i });
add('event', 'when did Reynolds die',        { primary: ['D1T28', 'V-002'], avail: 'R', rel: /Reynolds/i, must: /(10:15|10:20|tick 28)/i, note: 'chron label says 7:20am (wrong); succession file says ~10:15am' });
add('event', 'what was the cannonade',       { primary: ['V-017', 'D3T518', 'V-015'], rel: /cannonade/i });
add('event', 'why did Sickles move forward', { primary: ['V-007', 'D2T248', 'D2T252', 'D2T230'], rel: /Sickles/i });
add('event', 'what happened on July 3',      { primary: ['D3T538', 'D3T451', 'D3T518', 'D3T675'], avail: 'R', rel: /^$/, note: 'day-summary intent; relevant = any Day-3 record (see evaluator dayRel)', day: 3 });
add('event', 'what happened on day 2',       { primary: ['D2T256', 'D2T267', 'D2T298'], avail: 'R', rel: /^$/, day: 2 });
add('event', 'how did the battle end',       { primary: ['D3T675', 'D3T650', 'D3T620', 'V-024'], avail: 'R', rel: /END OF THE BATTLE|retreat|V-024/i });
add('event', 'who won the battle',           { primary: ['D3T675', 'D3T572'], avail: 'R', rel: /END OF THE BATTLE|Union/i, must: /Union|Meade|victory|repuls/i });
add('event', 'why did Longstreet oppose the attack', { primary: ['D2T360', 'D2T226'], avail: 'R', rel: /Longstreet/i });
add('event', 'what was the high water mark', { primary: ['V-024', 'LOC-009', 'V-016'], rel: /high water|high-water/i });
add('event', 'who was killed at Little Round Top', { primary: ['D2T270', 'D2T272', 'D2T271', 'V-009'], avail: 'R', rel: /Vincent|Weed|Hazlett|O.?Rorke/i, must: /Vincent|Weed|O.?Rorke|Hazlett/i });
add('event', "what happened at Culp's Hill on July 3", { primary: ['V-022', 'D3T451', 'D3T452', 'D3T460'], rel: /Culp/i, avail: 'R' });

// ---- 5. casualties / numbers --------------------------------------------------------------------
add('casualty', 'how many died at the Wheatfield', { primary: [], avail: 'N', expect: 'refuse', rel: /^$/, note: 'no per-location death counts exist in any data file; honest answer = context + caveat' });
add('casualty', 'how many men did the 1st Minnesota lose', { primary: ['U-1MN'], rel: /(1st|First) Minnesota/i, must: /224/ });
add('casualty', '26th North Carolina casualties', { primary: ['C-26NC'], rel: /26th North Carolina/i, must: /588/ });
add('casualty', 'which regiment had the highest casualties', { primary: ['CAS:notable_intensity_notes', 'U-1MN', 'C-26NC'], avail: 'S', rel: /^$/, must: /1st Minnesota|26th North Carolina|85\.5|588/i });
add('casualty', 'total casualties at Gettysburg', { primary: ['ARMY:U', 'ARMY:C'], avail: 'S', rel: /^$/, must: /23,049|28,000|51,0/ });
add('casualty', 'how many Union soldiers were at Gettysburg', { primary: ['ARMY:U'], avail: 'S', rel: /^$/, must: /93,921|94,000|93,9/ });
add('casualty', 'how many men did Lee have', { primary: ['ARMY:C'], avail: 'S', rel: /^$/, must: /75,000/ });

// ---- 6. command / structure ---------------------------------------------------------------------
add('command', 'who commanded the Iron Brigade', { primary: ['BDE:U-I-1-1'], avail: 'S', rel: /Iron Brigade/i, must: /Meredith/i });
add('command', 'who commanded the Union army', { primary: ['ARMY:U'], avail: 'S', rel: /^$/, must: /Meade/i });
add('command', 'who commanded the Confederate army', { primary: ['ARMY:C'], avail: 'S', rel: /^$/, must: /\bLee\b/i });
add('command', 'who commanded the 20th Maine', { primary: ['U-20ME'], rel: /20th Maine/i, must: /Chamberlain/i });
add('command', 'who replaced Reynolds', { primary: ['SUCC:US-001'], avail: 'S', rel: /^$/, must: /Doubleday/i });
add('command', 'who commanded I Corps', { primary: ['CORPS:U-I', 'SUCC:US-001', 'SUCC:US-002'], avail: 'S', rel: /^$/, must: /Reynolds|Doubleday|Newton/i });
add('command', 'who commanded Pickett\'s division brigades', { primary: ['DIV:C-I-3'], avail: 'S', rel: /^$/, must: /Garnett|Kemper|Armistead/i });

// ---- 7. ancestor ---------------------------------------------------------------------------------
add('ancestor', 'my ancestor served in the 20th Maine', { primary: ['U-20ME'], rel: /20th Maine/i, must: /find-ancestor|ancestor/i, note: 'ideal answer = regiment card + link to /find-ancestor.html + roster caveat' });
add('ancestor', 'my great grandfather was in the 4th Alabama', { primary: ['C-4AL'], rel: /4th Alabama/i });
add('ancestor', 'how do I find my ancestor', { primary: ['SITE:find-ancestor'], avail: 'S', rel: /^$/, must: /find-ancestor|Find Your Ancestor/i });
add('ancestor', 'was John Smith at Gettysburg', { primary: [], avail: 'N', expect: 'refuse', rel: /^$/, note: 'no soldier-level roster in corpus' });
add('ancestor', 'private in the 69th Pennsylvania', { primary: ['U-69PA'], rel: /69th Pennsylvania/i });

// ---- 8. out-of-scope / gibberish ------------------------------------------------------------------
add('oos', "what's the weather today", { avail: 'O', expect: 'refuse', rel: /^$/ });
add('oos', 'who won the world series', { avail: 'O', expect: 'refuse', rel: /^$/ });
add('oos', 'tell me a joke', { avail: 'O', expect: 'refuse', rel: /^$/ });
add('oos', 'what is the capital of France', { avail: 'O', expect: 'refuse', rel: /^$/ });
add('oos', 'Vicksburg', { avail: 'N', expect: 'refuse', rel: /^$/ });
add('oos', 'Antietam', { avail: 'N', expect: 'refuse', rel: /^$/ });
add('oos', "Lincoln's Gettysburg Address", { avail: 'N', expect: 'refuse', rel: /^$/, note: 'adjacent to topic; not in any data file' });
add('oos', 'hotels near Gettysburg', { avail: 'O', expect: 'refuse', rel: /^$/ });
add('oos', 'how much are tickets to the visitor center', { avail: 'O', expect: 'refuse', rel: /^$/ });
add('oos', 'what caused the Civil War', { avail: 'N', expect: 'refuse', rel: /^$/ });
add('gibberish', 'asdfghjkl', { avail: 'O', expect: 'refuse', rel: /^$/ });
add('gibberish', 'the', { avail: 'O', expect: 'refuse', rel: /^$/ });

// ---- 9. typos ---------------------------------------------------------------------------------------
add('typo', 'Chamberlin',   { primary: ['U-20ME', 'V-010'], rel: /Chamberlain/i });
add('typo', 'Pickets charge', { primary: ['D3T538', 'V-016', 'V-019'], rel: /Pickett/i });
add('typo', 'Little Roundtop', { primary: ['LOC-003', 'V-009', 'V-010'], rel: /Little Round Top/i });
add('typo', 'Cemetary Hill', { primary: ['LOC-001', 'V-014'], rel: /Cemetery Hill/i });
add('typo', 'Gettysberg',   { primary: [], expect: 'refuse', avail: 'O', rel: /^$/, note: 'misspelt name of the whole subject; acceptable = did-you-mean or overview' });
add('typo', 'Longstret',    { primary: ['D2T256', 'D2T235'], avail: 'R', rel: /Longstreet/i });
add('typo', 'Armistad',     { primary: ['V-016', 'D3T551'], rel: /Armistead/i });
add('typo', 'Wheatfeild',   { primary: ['LOC-006', 'D2T283'], rel: /Wheatfield/i });
add('typo', 'Culps Hill',   { primary: ['LOC-002', 'V-013', 'V-022'], rel: /Culp.?s Hill/i });

// ---- 10. compare / multi-entity / follow-up / temporal ----------------------------------------------
add('compare', 'compare the 20th Maine and the 15th Alabama', { primary: ['U-20ME', 'C-15AL'], rel: /20th Maine|15th Alabama/i });
add('compare', 'who fought the 20th Maine', { primary: ['C-15AL', 'V-010'], rel: /15th Alabama|Oates/i, must: /15th Alabama|Oates/i });
add('compare', 'Union versus Confederate casualties', { primary: ['ARMY:U', 'ARMY:C'], avail: 'S', rel: /^$/, must: /23,049|28,000/ });
add('followup', 'tell me more', { primary: [], expect: 'refuse', avail: 'O', rel: /^$/, note: 'context-free follow-up; needs session memory; correct = ask what about' });
add('followup', 'what about the Confederates', { primary: [], expect: 'refuse', avail: 'O', rel: /^$/ });
add('day', 'what happened on July 2 afternoon', { primary: ['D2T278', 'D2T283', 'D2T298', 'D2T302'], avail: 'R', rel: /^$/, day: 2, note: 'time-of-day intent; needs corrected clock' });

export default Q;
