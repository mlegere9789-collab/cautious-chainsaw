// search-core public surface (browser + node, ES modules, dependency free).
export { openKB, nodeFetcher, browserFetcher, ShardError } from './kb.js';
export { createEngine } from './engine.js';
export { lintAnswer, FORBIDDEN_PATTERNS } from './lint.js';
export { baseNorm, tokenize, stem, contentStems, splitSentences, sentencesOf, dl, fnv1a32, cleanSite } from './text.js';
export { classify, INTENT_NAMES } from './intent.js';
export { renderText } from './format.js';
