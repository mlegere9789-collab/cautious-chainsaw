// english.js - "is this an ordinary English word?" for the typo repair. A question word that is correctly spelled English is never rewritten into a name
// ("list" is not "last", "alley" is not "Allen", "fraction" is not "action"): the repair exists for misspelled NAMES. The word list is baked into facts.english at build time
// (tools/historian/data/english-seed.v1.txt, written by hand, and english-period.v1.txt, the lower-case words of a public-domain 1863 prose sample); regular inflections are
// recognised here so the list holds base forms only. Dependency free; the same code runs in the page, a Worker and Node.

const VOWEL = /[aeiouy]/;

/** candidate base forms of an inflected English word: plural, past, progressive, -ly, comparative and a few derivational endings */
export function baseForms(w) {
  const out = [];
  const n = w.length;
  const push = (x) => { if (x.length >= 3) out.push(x); };
  const undouble = (x) => (x.length > 3 && x[x.length - 1] === x[x.length - 2] && !/[aeiou]/.test(x[x.length - 1]) ? x.slice(0, -1) : null);
  if (n > 4 && w.endsWith('ies')) push(w.slice(0, -3) + 'y');
  if (n > 4 && w.endsWith('ied')) push(w.slice(0, -3) + 'y');
  if (n > 4 && w.endsWith('es')) push(w.slice(0, -2));
  if (n > 3 && w.endsWith('s') && !w.endsWith('ss')) push(w.slice(0, -1));
  if (n > 4 && w.endsWith('ed')) { push(w.slice(0, -2)); push(w.slice(0, -1)); const u = undouble(w.slice(0, -2)); if (u) push(u); }
  if (n > 5 && w.endsWith('ing')) { const s = w.slice(0, -3); push(s); push(s + 'e'); const u = undouble(s); if (u) push(u); }
  if (n > 4 && w.endsWith('ly')) { push(w.slice(0, -2)); if (w.endsWith('ily')) push(w.slice(0, -3) + 'y'); if (w.endsWith('ally')) push(w.slice(0, -2)); if (w.endsWith('bly')) push(w.slice(0, -1) + 'e'); }
  if (n > 4 && w.endsWith('er')) { push(w.slice(0, -2)); push(w.slice(0, -1)); const u = undouble(w.slice(0, -2)); if (u) push(u); }
  if (n > 5 && w.endsWith('est')) { push(w.slice(0, -3)); push(w.slice(0, -2)); const u = undouble(w.slice(0, -3)); if (u) push(u); }
  if (n > 6 && w.endsWith('ers')) { push(w.slice(0, -3)); push(w.slice(0, -2)); }
  if (n > 6 && w.endsWith('ness')) push(w.slice(0, -4));
  if (n > 6 && w.endsWith('ment')) push(w.slice(0, -4));
  if (n > 6 && w.endsWith('ful')) push(w.slice(0, -3));
  if (n > 6 && w.endsWith('less')) push(w.slice(0, -4));
  if (n > 6 && w.endsWith('able')) { push(w.slice(0, -4)); push(w.slice(0, -4) + 'e'); }
  if (n > 7 && w.endsWith('tion')) { push(w.slice(0, -4) + 'te'); push(w.slice(0, -3)); }
  // derivations: hilly (hill + y), dependent (depend + ent), tolerance (tolerate), activity, joyous, active, selfish, civilize
  if (n > 4 && w.endsWith('y')) { push(w.slice(0, -1)); const u = undouble(w.slice(0, -1)); if (u) push(u); }
  if (n > 6 && /(?:ent|ant)$/.test(w)) { push(w.slice(0, -3)); push(w.slice(0, -3) + 'e'); }
  if (n > 7 && /(?:ence|ance)$/.test(w)) { push(w.slice(0, -4)); push(w.slice(0, -4) + 'e'); }
  if (n > 6 && w.endsWith('ity')) { push(w.slice(0, -3)); push(w.slice(0, -3) + 'e'); }
  if (n > 6 && /(?:ive|ous|ish)$/.test(w)) { push(w.slice(0, -3)); push(w.slice(0, -3) + 'e'); }
  if (n > 6 && /(?:ize|ise|ate)$/.test(w)) { push(w.slice(0, -3)); push(w.slice(0, -3) + 'e'); }
  return out;
}

/** a membership test over a word list (a space-separated string or an array), closed under the regular inflections above */
export function createEnglish(words) {
  const set = new Set(typeof words === 'string' ? words.split(/\s+/).filter(Boolean) : Array.isArray(words) ? words : []);
  const cache = new Map();
  const has = (word) => {
    const w = String(word || '').toLowerCase();
    if (!w || w.length < 2 || !VOWEL.test(w)) return false;
    if (set.has(w)) return true;
    let r = cache.get(w);
    if (r === undefined) { r = baseForms(w).some((b) => set.has(b)); cache.set(w, r); }
    return r;
  };
  return { has, size: set.size };
}
