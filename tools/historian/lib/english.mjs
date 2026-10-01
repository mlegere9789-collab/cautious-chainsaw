// english.mjs - load the committed word lists that become facts.english (see core/english.js for what it is used for).
import fs from 'node:fs';
import path from 'node:path';

/** words from every english-*.v1.txt in dir ('#' lines are comments), lower case, unique, sorted; returned as one space-separated string so the fact table stays small */
export function loadEnglish(dir) {
  const set = new Set();
  for (const f of fs.readdirSync(dir).filter((x) => /^english-.*\.txt$/.test(x)).sort()) {
    for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/)) {
      if (!line.trim() || line.trim().startsWith('#')) continue;
      for (const w of line.trim().split(/\s+/)) if (/^[a-z]{2,24}$/.test(w.toLowerCase())) set.add(w.toLowerCase());
    }
  }
  return [...set].sort().join(' ');
}
