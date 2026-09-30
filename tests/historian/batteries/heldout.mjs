// HELD-OUT battery (authored AFTER proto.js/aliases.js were frozen; never used to tune anything). Same schema as queries.js.
const Q = [];
const add = (cat, q, o) => Q.push({ id: 'H' + String(Q.length + 1).padStart(3, '0'), cat, q, expect: 'answer', avail: 'I', primary: [], rel: null, must: null, ...o });

// regiment / unit names
add('name-variant', '16th Maine',            { primary: ['U-16ME'], rel: /16th Maine/i });
add('name-variant', 'Sixteenth Maine',       { primary: ['U-16ME'], rel: /16th Maine/i });
add('name-variant', 'second Wisconsin',      { primary: ['U-2WI'], rel: /2nd Wisconsin/i });
add('name-variant', '4th Texas',             { primary: ['C-4TX'], rel: /4th Texas/i });
add('name-variant', 'the 8th Ohio',          { primary: ['U-8OH'], rel: /8th Ohio/i });
add('name-variant', '13th VT',               { primary: ['U-13VT'], rel: /13th Vermont/i });
add('name-variant', 'Tammany Regiment',      { primary: ['U-42NY'], rel: /Tammany/i });
add('name-variant', 'Excelsior Brigade',     { primary: ['U-70NY', 'U-71NY', 'U-72NY', 'U-73NY', 'U-74NY'], rel: /Excelsior/i });
add('name-variant', 'Philadelphia Brigade',  { primary: ['BDE:U-II-2-2'], avail: 'S', rel: /Philadelphia Brigade/i });
add('name-variant', 'Pennsylvania Reserves', { primary: ['U-1PA-R', 'U-2PA-R', 'U-6PA-R', 'U-13PA-R'], rel: /Pennsylvania Reserves/i });
// people
add('commander', 'General Howard',           { primary: ['D1T50', 'D1T72', 'CORPS:U-XI'], avail: 'R', rel: /Howard/i });
add('commander', 'Ewell',                    { primary: ['D1T75', 'CORPS:C-II'], avail: 'R', rel: /Ewell/i });
add('commander', 'Doubleday',                { primary: ['D1T95', 'SUCC:US-001', 'SUCC:US-002'], avail: 'R', rel: /Doubleday/i });
add('commander', 'Barksdale',                { primary: ['D2T278', 'D2T335'], avail: 'R', rel: /Barksdale/i });
add('commander', 'Vincent',                  { primary: ['V-009', 'D2T267', 'D2T270'], rel: /Vincent/i });
add('commander', 'Kershaw',                  { primary: ['D2T283'], avail: 'R', rel: /Kershaw/i });
add('commander', 'Jubal Early',              { primary: ['D1T56'], avail: 'R', rel: /Early/i });
// places
add('place', 'Round Top',                    { primary: ['LOC-004', 'LOC-003'], rel: /Round Top/i });
add('place', 'Baltimore Pike',               { primary: ['ROAD:RD-004'], avail: 'S', rel: /Baltimore Pike/i });
add('place', 'Leister House',                { primary: ['STR:STR-001', 'D2T400'], avail: 'S', rel: /Leister|Meade.?s Headquarters/i });
add('place', 'Trostle Farm',                 { primary: ['LOC-008', 'V-011'], rel: /Trostle/i });
add('place', 'Oak Hill',                     { primary: ['LOC-015', 'D1T48'], rel: /Oak Hill/i });
add('place', 'McPherson Ridge',              { primary: ['LOC-012'], rel: /McPherson/i });
add('place', 'Willoughby Run',               { primary: ['TF:TF-004', 'V-003'], avail: 'S', rel: /Willoughby/i });
add('place', 'Evergreen Cemetery',           { primary: ['LOC-023'], rel: /Evergreen/i });
// events
add('event', "Iverson's Pits",               { primary: ['V-005', 'D1T53'], rel: /Iverson/i });
add('event', "Gordon's flank attack",        { primary: ['D1T56', 'V-006'], avail: 'R', rel: /Gordon/i });
add('event', 'when was Sickles wounded',     { primary: ['D2T298', 'SUCC:US-017'], avail: 'R', rel: /Sickles/i, must: /Sickles/i });
add('event', 'Stannard Vermont brigade flank attack', { primary: ['D3T546', 'D3T535', 'BDE:U-I-3-3'], avail: 'R', rel: /Stannard/i });
add('event', "Farnsworth's charge",          { primary: ['V-021', 'D3T568', 'D3T569'], rel: /Farnsworth/i });
add('event', "Meade's council of war",       { primary: ['D2T400'], avail: 'R', rel: /council of war/i });
add('event', 'how did Reynolds die',         { primary: ['V-002', 'D1T28'], rel: /Reynolds/i, must: /(head|sharpshooter|killed)/i });
add('event', 'what happened on July 1',      { primary: ['D1T12', 'D1T28', 'D1T53', 'D1T56'], avail: 'R', rel: /^$/, day: 1 });
// numbers
add('casualty', 'how many casualties did the Iron Brigade suffer', { primary: ['BDE:U-I-1-1'], avail: 'S', rel: /Iron Brigade/i, must: /1,153|61\.2/ });
add('casualty', 'casualties of the 2nd Wisconsin', { primary: ['U-2WI'], rel: /2nd Wisconsin/i, must: /233/ });
add('casualty', "how many men were in Pickett's division", { primary: ['DIV:C-I-3'], avail: 'S', rel: /Pickett/i, must: /5,500/ });
add('casualty', 'III Corps casualties',     { primary: ['CORPS:U-III'], avail: 'S', rel: /III Corps|Third Corps/i, must: /4,211/ });
// command
add('command', 'who commanded the Confederate Second Corps', { primary: ['CORPS:C-II'], avail: 'S', rel: /^$/, must: /Ewell/i });
add('command', "who commanded Lee's cavalry", { primary: ['CAVCMD:C'], avail: 'S', rel: /^$/, must: /Stuart/i });
add('command', 'who replaced Hood',         { primary: ['SUCC:CS-001'], avail: 'S', rel: /^$/, must: /Law/i });
add('command', 'who took over the First Minnesota', { primary: ['U-1MN'], rel: /(1st|First) Minnesota/i, must: /Messick|Coates/i });
add('command', 'who commanded the Texas Brigade', { primary: ['BDE:C-I-2-2'], avail: 'S', rel: /Texas Brigade/i, must: /Robertson/i });
// ancestor
add('ancestor', 'my ancestor was in the 16th Maine', { primary: ['U-16ME'], rel: /16th Maine/i, must: /find-ancestor|ancestor/i });
add('ancestor', "where can I look up a soldier's record", { primary: ['SITE:find-ancestor'], avail: 'S', rel: /^$/, must: /find-ancestor|Find Your Ancestor/i });
// out of scope
add('oos', "what's the best restaurant in town", { avail: 'O', expect: 'refuse', rel: /^$/ });
add('oos', 'tell me about D-Day',            { avail: 'O', expect: 'refuse', rel: /^$/ });
add('oos', 'Chancellorsville',               { avail: 'N', expect: 'refuse', rel: /^$/ });
add('oos', 'who was president in 1863',      { avail: 'N', expect: 'refuse', rel: /^$/ });
add('oos', 'how do I get to the battlefield', { avail: 'O', expect: 'refuse', rel: /^$/ });
// typos
add('typo', 'Chamberlan',                    { primary: ['U-20ME', 'V-010'], rel: /Chamberlain/i });
add('typo', 'Hancok',                        { primary: ['V-012', 'V-016', 'CORPS:U-II'], rel: /Hancock/i });
add('typo', 'Peach Orchad',                  { primary: ['LOC-007', 'V-007'], rel: /Peach Orchard/i });
add('typo', 'Cemetary Ridge',                { primary: ['LOC-011'], rel: /Cemetery Ridge/i });
add('typo', 'Barksdael',                     { primary: ['D2T278'], avail: 'R', rel: /Barksdale/i });
// compound
add('compare', 'compare the Iron Brigade and the Irish Brigade', { primary: ['BDE:U-I-1-1', 'BDE:U-II-1-2'], avail: 'S', rel: /Iron Brigade|Irish Brigade/i });
add('compare', 'what did Chamberlain do on July 2', { primary: ['V-010', 'D2T275', 'U-20ME', 'D2T268'], rel: /Chamberlain/i });
add('compare', 'what happened to the 26th North Carolina on July 1', { primary: ['C-26NC'], rel: /26th North Carolina/i });
export default Q;
