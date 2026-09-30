// FRESH battery (F001..). Written for this build BEFORE the engine produced any output on it, from the data files only (ids and expected facts were looked up in
// legacy/dist/data, never taken from engine output), because hist-current found that 27 of 52 held-out queries shared gold ids with the prototype's tuning set.
// Same schema as primary.mjs / heldout.mjs. Limits (stated honestly): one author (the same AI that built the engine), synthetic queries, no real user logs;
// after the first engine run some failures were analysed (see docs/historian/EVALUATION.md); those queries are NOT edited to pass.
const Q = [];
const add = (cat, q, o) => Q.push({ id: 'F' + String(Q.length + 1).padStart(3, '0'), cat, q, expect: 'answer', avail: 'I', primary: [], rel: null, must: null, ...o });

// ---- unit names (variants, nicknames, ordinals) ---------------------------------------------------------------------------------------------------
add('name-variant', '16th Michigan',            { primary: ['U-16MI'], rel: /16th Michigan/i });
add('name-variant', 'Seventeenth Maine',        { primary: ['U-17ME'], rel: /17th Maine/i });
add('name-variant', '140th NY',                 { primary: ['U-140NY'], rel: /140th New York/i });
add('name-variant', 'Garibaldi Guard',          { primary: ['U-39NY'], rel: /Garibaldi/i });
add('name-variant', 'Corn Exchange Regiment',   { primary: ['U-118PA'], rel: /Corn Exchange/i });
add('name-variant', 'Orange Blossoms',          { primary: ['U-124NY'], rel: /Orange Blossoms|124th New York/i });
add('name-variant', '2nd Mississippi',          { primary: ['C-2MS'], rel: /2nd Mississippi/i });
add('name-variant', '1st Vermont Cavalry',      { primary: ['U-1VT-CAV'], rel: /1st Vermont Cavalry/i });
add('name-variant', 'Ellsworth Avengers',       { primary: ['U-44NY'], rel: /Ellsworth Avengers|44th New York/i });
add('name-variant', 'the 8th Illinois Cavalry', { primary: ['U-8IL-CAV'], rel: /8th Illinois Cavalry/i });
add('name-variant', 'Fire Zouaves',             { primary: ['U-11NY'], rel: /Fire Zouaves|11th New York/i });
add('name-variant', 'twenty-eighth Massachusetts', { primary: ['U-28MA'], rel: /28th Massachusetts/i });
add('name-variant', '13 Mississippi',           { primary: ['C-13MS'], rel: /13th Mississippi/i });
add('name-variant', "Rush's Lancers",           { primary: ['U-6PA-CAV'], rel: /Rush.?s Lancers|6th Pennsylvania Cavalry/i });
add('name-variant', '2nd NH',                   { primary: ['U-2NH'], rel: /2nd New Hampshire/i });
add('name-variant', '17th Connecticut',         { primary: ['U-17CT'], rel: /17th Connecticut/i });

// ---- people ------------------------------------------------------------------------------------------------------------------------------------------
add('commander', 'Hancock',                     { primary: ['CORPS:U-II', 'V-012', 'D3T520', 'V-016'], avail: 'S', rel: /Hancock/i });
add('commander', 'Colonel Vincent',             { primary: ['BDE:U-V-1-3', 'V-009', 'D2T267', 'D2T270'], avail: 'S', rel: /Vincent/i });
add('commander', 'Hazlett',                     { primary: ['ART:U-ART-D5US', 'D2T272'], avail: 'S', rel: /Hazlett/i });
add('commander', 'Wadsworth',                   { primary: ['DIV:U-I-1', 'D1T26'], avail: 'S', rel: /Wadsworth/i });
add('commander', 'Kilpatrick',                  { primary: ['DIV:U-CAV-3', 'D3T568', 'D3T569', 'V-021'], avail: 'S', rel: /Kilpatrick/i });
add('commander', 'John Gordon',                 { primary: ['BDE:C-II-1-3', 'V-006', 'D1T56', 'D1T57'], avail: 'S', rel: /Gordon/i });
add('commander', 'William Barksdale',           { primary: ['BDE:C-I-1-2', 'D2T278', 'D2T335'], avail: 'S', rel: /Barksdale/i });
add('commander', 'Stannard',                    { primary: ['BDE:U-I-3-3', 'D3T546', 'U-13VT', 'U-16VT'], avail: 'S', rel: /Stannard/i });
add('commander', 'Sedgwick',                    { primary: ['CORPS:U-VI'], avail: 'S', rel: /Sedgwick/i });
add('commander', 'General Pleasonton',          { primary: ['CORPS:U-CAV'], avail: 'S', rel: /Pleasonton/i });

// ---- places and terrain ----------------------------------------------------------------------------------------------------------------------------
add('place', 'Plum Run',                        { primary: ['LOC-026', 'D2T299', 'D2T303'], rel: /Plum Run/i });
add('place', 'Rose Woods',                      { primary: ['LOC-027', 'D2T283'], rel: /Rose Woods/i });
add('place', 'Triangular Field',                { primary: ['LOC-030'], rel: /Triangular Field/i });
add('place', 'Herr Ridge',                      { primary: ['LOC-018'], rel: /Herr Ridge/i });
add('place', 'Oak Hill',                        { primary: ['LOC-015', 'D1T48'], rel: /Oak Hill/i });
add('place', "Benner's Hill",                   { primary: ['LOC-020'], rel: /Benner/i });
add('place', 'Trostle Farm',                    { primary: ['LOC-008', 'STR:STR-003', 'V-011'], rel: /Trostle/i });
add('place', 'Codori Farm',                     { primary: ['LOC-024', 'STR:STR-005'], rel: /Codori/i });
add('place', 'Bliss Farm',                      { primary: ['LOC-019'], rel: /Bliss/i });
add('place', 'Taneytown Road',                  { primary: ['ROAD:RD-003'], avail: 'S', rel: /Taneytown/i });
add('place', 'Emmitsburg Road',                 { primary: ['ROAD:RD-002'], avail: 'S', rel: /Emmitsburg Road/i });
add('place', 'Willoughby Run',                  { primary: ['TF:TF-004', 'V-003'], avail: 'S', rel: /Willoughby/i });
add('place', 'copse of trees',                  { primary: ['TF:TF-002', 'LOC-009'], avail: 'S', rel: /copse/i });

// ---- events -----------------------------------------------------------------------------------------------------------------------------------------
add('event', 'first shot of the battle',        { primary: ['V-001', 'D1T12'], avail: 'R', rel: /first shot/i });
add('event', "Iverson's Pits",                  { primary: ['V-005', 'D1T53'], rel: /Iverson/i });
add('event', "Greene's lone stand",             { primary: ['V-013', 'D2T315'], rel: /Greene/i });
add('event', "Farnsworth's charge",             { primary: ['V-021', 'D3T568', 'D3T569'], rel: /Farnsworth/i });
add('event', "Longstreet's flanking march",     { primary: ['D2T235', 'D2T226'], avail: 'R', rel: /Longstreet/i });
add('event', 'Sickles wounded',                 { primary: ['D2T298'], avail: 'R', rel: /Sickles/i });
add('event', "Meade's council of war",          { primary: ['D2T400'], avail: 'R', rel: /council/i });
add('event', "Lee's retreat order",             { primary: ['D3T620'], avail: 'R', rel: /retreat/i });
add('event', 'Stuart arrives at Gettysburg',    { primary: ['D2T310'], avail: 'R', rel: /Stuart/i });
add('event', 'Father Corby absolution',         { primary: ['D2T287', 'D2T285'], avail: 'R', rel: /Corby/i });

// ---- command --------------------------------------------------------------------------------------------------------------------------------------------
add('command', 'who commanded the Excelsior Brigade', { primary: ['BDE:U-III-2-2'], avail: 'S', rel: /Excelsior/i, must: /Brewster/ });
add('command', 'who led the Vermont Brigade',   { primary: ['BDE:U-I-3-3'], avail: 'S', rel: /Vermont/i, must: /Stannard/ });
add('command', "who commanded Wilcox's brigade", { primary: ['BDE:C-III-1-1'], avail: 'S', rel: /Wilcox/i, must: /Wilcox/ });
add('command', 'who commanded the Union cavalry corps', { primary: ['CORPS:U-CAV'], avail: 'S', rel: /Cavalry/i, must: /Pleasonton/ });
add('command', 'who commanded the Twelfth Corps', { primary: ['CORPS:U-XII'], avail: 'S', rel: /Twelfth|XII/i, must: /Slocum/ });
add('command', 'who commanded the Confederate Third Corps', { primary: ['CORPS:C-III'], avail: 'S', rel: /Third Corps/i, must: /Hill/ });
add('command', 'who commanded the 16th Michigan', { primary: ['U-16MI'], rel: /16th Michigan/i, must: /Welch/ });
add('command', 'who commanded the 1st Texas',   { primary: ['C-1TX'], rel: /1st Texas/i, must: /Work/ });

// ---- casualties, strength, superlatives ----------------------------------------------------------------------------------------------------
add('casualty', 'how many casualties did the 16th Michigan have', { primary: ['U-16MI'], rel: /16th Michigan/i, must: /\b97\b/ });
add('casualty', "how many men did Kershaw's brigade lose", { primary: ['BDE:C-I-1-1'], avail: 'S', rel: /Kershaw/i, must: /\b616\b/ });
add('casualty', "how big was Ward's brigade",    { primary: ['BDE:U-III-1-1'], avail: 'S', rel: /Ward/i, must: /2,?188/ });
add('casualty', 'how many men were in the Sixth Corps', { primary: ['CORPS:U-VI'], avail: 'S', rel: /Sixth/i, must: /13,?596/ });
add('casualty', 'how many casualties did the Fifth Corps suffer', { primary: ['CORPS:U-V'], avail: 'S', rel: /Fifth/i, must: /2,?187/ });
add('casualty', 'which Union regiment lost the most men', { primary: ['U-24MI'], rel: /24th Michigan/i, must: /24th Michigan/ });
add('casualty', 'which Confederate regiment had the most casualties', { primary: ['C-26NC'], rel: /26th North Carolina/i, must: /26th North Carolina/ });
add('casualty', 'how many guns did Cushing have', { primary: ['ART:U-ART-A4US'], avail: 'S', rel: /Cushing/i, must: /\b(6|six)\b/ });
add('casualty', 'how many Maine regiments were there', { primary: ['U-20ME'], avail: 'S', rel: /Maine/i, must: /\b(10|ten)\b/ });
add('casualty', 'how many Vermont regiments fought at Gettysburg', { primary: ['U-16VT'], avail: 'S', rel: /Vermont/i, must: /\b(9|nine)\b/ });

// ---- routes, ancestors, roster honesty --------------------------------------------------------------------------------------------------------------
add('ancestor', 'my great-great-grandfather was in the 24th Michigan', { primary: ['SITE:find-ancestor', 'U-24MI'], rel: /find your ancestor|24th Michigan/i });
add('ancestor', 'how can I trace a relative who fought at Gettysburg', { primary: ['SITE:find-ancestor'], rel: /ancestor/i });
add('ancestor', 'was Private John Miller of the 1st Minnesota at Gettysburg', { primary: [], expect: 'refuse', avail: 'N', rel: /^$/, note: 'individual soldiers are not in the data; a limitation statement counts' });

// ---- out of scope (generic-word queries included: every lexical gate passes on these) ----------------------------------------------------------------
add('oos', 'where can I buy tickets for the museum', { primary: [], expect: 'refuse', avail: 'O', rel: /^$/ });
add('oos', 'what is the best time of year to visit', { primary: [], expect: 'refuse', avail: 'O', rel: /^$/ });
add('oos', 'who won the Battle of Waterloo', { primary: [], expect: 'refuse', avail: 'O', rel: /^$/ });
add('oos', 'what is the population of Gettysburg today', { primary: [], expect: 'refuse', avail: 'O', rel: /^$/ });
add('oos', 'best pizza near the battlefield', { primary: [], expect: 'refuse', avail: 'O', rel: /^$/ });
add('oos', 'explain quantum physics', { primary: [], expect: 'refuse', avail: 'O', rel: /^$/ });
add('oos', 'what is two plus two', { primary: [], expect: 'refuse', avail: 'O', rel: /^$/ });
add('oos', 'ghost tours in town', { primary: [], expect: 'refuse', avail: 'O', rel: /^$/ });
add('oos', 'tell me about the Battle of Fredericksburg', { primary: [], expect: 'refuse', avail: 'O', rel: /^$/ });
add('oos', 'how do I bake hardtack', { primary: [], expect: 'refuse', avail: 'O', rel: /^$/ });
add('oos', 'what is the speed of light', { primary: [], expect: 'refuse', avail: 'O', rel: /^$/ });
add('oos', 'zxqv blorp wumble', { primary: [], expect: 'refuse', avail: 'O', rel: /^$/ });

// ---- typos and spelling variants -----------------------------------------------------------------------------------------------------------------------
add('typo', 'Chamberlian',        { primary: ['U-20ME', 'V-010'], rel: /Chamberlain/i });
add('typo', 'Seminery Ridge',     { primary: ['LOC-010'], rel: /Seminary Ridge/i });
add('typo', 'Devils Dne',         { primary: ['LOC-005', 'D2T260'], rel: /Devil/i });
add('typo', 'Cemetary Ridge',     { primary: ['LOC-011'], rel: /Cemetery Ridge/i });
add('typo', 'Vincint',            { primary: ['BDE:U-V-1-3', 'V-009'], avail: 'S', rel: /Vincent/i });
add('typo', 'Hancok',             { primary: ['CORPS:U-II', 'V-012'], avail: 'S', rel: /Hancock/i });
add('typo', 'Kempers brigade',    { primary: ['BDE:C-I-3-2', 'D3T547'], avail: 'S', rel: /Kemper/i });
add('typo', 'Iron Brigde',        { primary: ['BDE:U-I-1-1', 'V-002', 'V-003'], avail: 'S', rel: /Iron Brigade/i });
add('typo', 'Little Rond Top',    { primary: ['LOC-003', 'V-009'], rel: /Little Round Top/i });
add('typo', 'Gettysbrug',         { primary: [], expect: 'refuse', avail: 'O', rel: /^$/, note: 'the whole subject misspelt: acceptable = did-you-mean or overview, scored as not-a-question' });

// ---- compare, relational, follow-up, day ------------------------------------------------------------------------------------------------------------------
add('compare', 'compare the 1st Minnesota and the 26th North Carolina', { primary: ['U-1MN', 'C-26NC'], rel: /1st Minnesota|26th North Carolina/i, must: /85\.5|69\.7/ });
add('compare', "which was larger, Pickett's division or Hood's division", { primary: ['DIV:C-I-3', 'DIV:C-I-2'], avail: 'S', rel: /Pickett|Hood/i, must: /7,?800/ });
add('compare', 'which regiments were in the Iron Brigade', { primary: ['BDE:U-I-1-1', 'U-19IN', 'U-24MI', 'U-2WI', 'U-6WI', 'U-7WI'], avail: 'S', rel: /Iron Brigade/i, must: /24th Michigan/ });
add('followup', 'tell me more', { primary: [], expect: 'refuse', avail: 'O', rel: /^$/ });
add('followup', 'who commanded it', { primary: [], expect: 'refuse', avail: 'O', rel: /^$/ });
add('day', 'what happened on July 1', { primary: ['D1T28', 'D1T36', 'D1T56', 'D1T75'], avail: 'R', rel: /^$/, day: 1 });
add('day', 'what happened on the third day', { primary: ['D3T518', 'D3T538', 'D3T551'], avail: 'R', rel: /^$/, day: 3 });

export default Q;
