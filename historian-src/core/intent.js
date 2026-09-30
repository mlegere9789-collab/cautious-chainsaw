// intent.js - ordered intent rules. Interrogatives are FEATURES, not stop words. Each rule has phrasing tests in tests/historian/intent.test.mjs
// (>= 20 positive and negative phrasings per rule is the acceptance bar of the plan).
// Intents: ancestor, opponent, presence, succession, who-commanded, superlative, count, strength, casualties, outcome, echelons, compare, sequence, membership,
//          quote, overview, when, where, why, what-happened, list, who, followup, lookup.

export const INTENT_WORDS = new Set(['commanded', 'command', 'commander', 'commanding', 'led', 'lead', 'leader', 'charge', 'replaced', 'succeeded', 'lose', 'lost', 'die', 'died', 'killed',
  'casualties', 'casualty', 'losses', 'happened', 'happen', 'start', 'started', 'begin', 'began', 'end', 'ended', 'fired', 'won', 'win', 'oppose', 'move', 'moved', 'forward', 'served',
  'grandfather', 'great', 'grand', 'ancestor', 'time', 'men', 'soldiers', 'compare', 'versus', 'fought', 'private', 'day', 'battle', 'many', 'much', 'strength', 'size', 'number', 'total',
  'regiments', 'regiment', 'brigade', 'brigades', 'division', 'corps', 'army', 'armies', 'highest', 'most', 'least', 'lowest', 'largest', 'biggest', 'smallest', 'guns', 'cannon', 'cannons',
  'say', 'said', 'write', 'wrote', 'shout', 'shouted', 'order', 'sequence', 'belong', 'belonged', 'part', 'cost', 'facts', 'summary', 'overview']);

// ordered: first match wins
const RULES = [
  ['ancestor', /\b(ancestors?|grandfather|grandpa|grandmother|great[- ]?grand\w*|great[- ]?great\w*|trace (?:a|an|my|the) (?:relative|ancestor|soldier)|relative (?:who|that) (?:fought|served)|my (father|uncle|relative|family|great|dad)|soldier named|genealog\w*|family history|look ?up a soldier|find (my|an|a) (soldier|ancestor|relative))\b/i],
  ['opponent', /\bwho (?:fought|opposed|faced|attacked|defended against|fought against)\b|\bopponents?\b|\bfought against\b|\bwho was (?:fighting|opposite)\b/i],
  // presence: the WHOLE question is "was <someone> at Gettysburg" (anchored, so "how many Georgia regiments were at Gettysburg?" is not presence)
  ['presence', /^\s*(?:was|were)\s+(?:the\s+)?[a-z0-9' .\-]{2,50}?\s+(?:present\s+)?(?:at|in|during)\s+(?:the\s+)?(?:battle of\s+)?gettysburg\s*\??\s*$|^\s*did\s+(?:the\s+)?[a-z0-9' .\-]{2,50}?\s+(?:fight|serve|take part|participate)\s+(?:at|in)\s+(?:the\s+)?(?:battle of\s+)?gettysburg\s*\??\s*$/i],
  ['succession', /\bwho (?:replaced|succeeded|took over|took command|assumed command|relieved|took the place|took charge|came after|followed)\b|\breplaced by\b|\bwho (?:commanded|led) (?:it |the \w+ )?(?:after|when)\b|\btook over (?:the )?(?:command|corps|division|brigade)\b|\bassumed command\b/i],
  ['membership', /\bwhich (?:brigade|division|corps|army)\b.*\b(?:was|is|did|were)\b.*\b(?:part of|belong\w*|in|under|served|assigned)\b|\bwhat (?:brigade|division|corps) (?:was|is|did)\b|\b(?:part of|belong(?:ed)? to) which\b/i],
  ['quote', /\bwhat (?:did|does|was)\b.*\b(?:say|said|write|wrote|tell|told|shout|shouted|cry|cried|reply|replied|declare|declared|whisper|mutter)\b|\bwho (?:said|shouted|wrote|cried|yelled|exclaimed|uttered|screamed)\b|\blast words\b|\bexact words\b|["“][^"”]{6,}["”]/i],
  ['who-commanded', /\b(?:who (?:commanded|led|was in command|was the (?:commander|leader|general|colonel|captain|chief)|was in charge|directed|ran)|commander of|commanded by|in command of|led by|who led|who commanded|chief of artillery|who was (?:the )?(?:\w+ )?(?:commander|commanding))\b/i],
  // an explicit comparison of two things wins over the measure it names ("compare X and Y in size and losses" is a comparison, not a casualty question)
  ['echelons', /\b(?:difference between|differences between|what is|what are|explain)\b.*\bregiment\b.*\bbrigade\b.*\bdivision\b.*\bcorps\b|\bhow (?:is|are|was|were) (?:an? |the )?(?:armies|army) (?:organi[sz]ed|structured|divided|built|arranged)\b|\bwhat (?:is|are) (?:a |an )?regiments?\b.*\bbrigades?\b.*\bdivisions?\b.*\bcorps\b|\bchain of command\b/i],
  ['compare', /\b(?:compare|versus|vs\.?|difference between|differences between|how (?:did|do) .* compare|which was (?:bigger|larger|smaller)|larger or|bigger or)\b/i],
  ['superlative', /\b(?:highest|most|worst|deadliest|bloodiest|heaviest|largest|biggest|smallest|lowest|fewest|greatest|top|tallest)\b.*\b(?:casualt\w*|losses|killed|rate|percentage|regiment|regiments|brigade|division|corps|deadl\w*|men|strength|size|guns|point|hill|ridge|elevation|mountain|peak|ground)\b|\bwhich\b.*\b(?:lost the most|lost most|had the most|suffered the most|had the highest|suffered the highest|was the largest|was the biggest)\b/i],
  ['count', /\bhow many (?!men\b|soldiers\b|troops\b|died\b|were killed\b|people\b|casualt)(?:\w+\s+){0,3}?(?:regiments?|brigades?|divisions?|corps|batteries|units|guns|cannons?|monuments?|vignettes?|events?|generals?|colonels?|commanders?)\b|\bhow many (?:regiments?|brigades?|batteries|units|guns|cannons?)\b|\bnumber of (?:regiments?|brigades?|batteries|guns)\b/i],
  ['strength', /\bhow many (?:men|soldiers|troops)\b(?!.*\b(?:died|killed|lost|lose|wounded|fell|fall|cost|dead|casualt\w*)\b).*\b(?:have|had|were|at|in|engaged|fought|did|took|brought|with|commanded)\b|\bhow many (?:men|soldiers|troops)\b(?!.*\b(?:died|killed|lost|lose|wounded|fell|fall|cost|dead|casualt\w*)\b)|\b(?:strength|how big|army size|size of|troop strength)\b|\bnumber of (?:men|soldiers|troops)\b(?!.*\b(?:died|killed|lost|lose|wounded|fell|fall|cost|dead|casualt\w*)\b)/i],
  ['casualties', /\bhow many\b.*\b(?:died|killed|lost|lose|casualt\w*|wounded|dead|men did|were killed|fell)\b|\bcasualt\w*|\blosses\b|\bdeath toll\b|\b(?:killed|died|dead|wounded|fell)\b.*\bhow many\b|\bhow many died\b|\bhow many men\b.*\bcost\b|\bwhat did .* cost\b|\b(?:exact|precise) (?:number|count|figure|total)\b.*\b(?:killed|died|dead|wounded|casualt\w*|lost)\b|\bnumber of\b.*\b(?:killed|died|dead|wounded)\b/i],
  ['outcome', /\bwho (?:won|lost)\b|\bhow did the (?:battle|fight) end\b|\boutcome\b|\bresult of the battle\b|\bwho was victorious\b|\bwho (?:got|had) the (?:victory|win)\b|\bwhich side (?:won|lost)\b/i],
  ['sequence', /\bin what order\b|\bwhich (?:came|happened) first\b|\bwhat came (?:first|before|after)\b|\bbefore or after\b|\bsequence of\b|\bthe order of (?:events|the)\b|\bwhat order\b/i],
  ['overview', /\b(?:facts?|summary|overview|summari[sz]e|basics|key points)\b.*\b(?:gettysburg|the battle)\b|\b(?:tell me about|explain|describe|what (?:was|is)) (?:the )?(?:whole )?(?:battle of )?gettysburg\b(?! (?:address|national))|\bwhat happened (?:at|in) gettysburg\b|\b(?:three|3|few|some) (?:quick |key |interesting )?facts\b/i],
  ['when', /\b(?:what time|when|how long|at what hour|what hour|what day|which day|how many hours)\b/i],
  ['where', /^\s*where\b|\bwhere (?:was|is|did|were|are|do|can)\b|\bwhat is the location\b|\blocated\b/i],
  ['why', /^\s*why\b|\bwhy (?:did|was|were|is|do|didn'?t|couldn'?t)\b|\breasons?\b|\bhow come\b|\bwhat caused\b|\bwhat made\b|^\s*was\b.*\b(?:a )?(?:blunder|mistake|error|success|failure|good idea|wise|foolish)\b/i],
  ['what-happened', /\bwhat happened\b|\btell me (?:more )?about\b|\bstory of\b|\bdescribe\b|\bwhat (?:was|is|were|are)\b|\bwho (?:was|were|is)\b|\bwhat did\b|\bwhat does\b|\bhow (?:high|tall|steep)\b|\bexplain\b|\bwhat'?s\b|\bwhat is happening\b|\bwhat happened here\b|\bgoing on\b|\bhappening\b/i],
  ['list', /^\s*(?:which|list|name|show)\b|\bwhich (?:regiments?|brigades?|units?|divisions?)\b/i],
  ['who', /^\s*who\b/i],
];
export function classify(q) { for (const [n, re] of RULES) if (re.test(q)) return n; return 'lookup'; }
export const INTENT_NAMES = RULES.map((r) => r[0]);
export const intentRule = (name) => (RULES.find((r) => r[0] === name) || [])[1];

/** Side hint from words: Union / Confederate. */
export function sideHint(tokens) {
  const u = tokens.some((t) => /^(union|federal|federals|yankee|yankees|northern|north|potomac)$/.test(t));
  const c = tokens.some((t) => /^(confederate|confederates|confederacy|rebel|rebels|southern|south|anv)$/.test(t));
  if (u && !c) return 'U';
  if (c && !u) return 'C';
  return null;
}
