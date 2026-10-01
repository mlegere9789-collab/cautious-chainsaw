// adapters.mjs - wrap the new engine as a relevance.evaluate() system and as a golden-set adapter.
import path from 'node:path';
import { ROOT } from './data.mjs';
import { openKB, nodeFetcher } from '../../../historian-src/core/kb.js';
import { createEngine } from '../../../historian-src/core/engine.js';

// HISTORIAN_HX points the whole evaluation at another build (the corpus KB: historian-src/dist/hx-or27); the default is the site-records KB
export const HX = process.env.HISTORIAN_HX ? path.resolve(ROOT, process.env.HISTORIAN_HX) : path.join(ROOT, 'historian-src/dist/hx');

export async function openEngine({ hx = HX, debug = false } = {}) {
  const kb = await openKB(await nodeFetcher(hx));
  return { kb, engine: createEngine(kb, { debug }) };
}

/** relevance system: fresh conversation per query (no context carried) */
export async function engineSystem(opts = {}) {
  const { engine } = await openEngine(opts);
  return async (q) => {
    const a = await engine.ask(q);
    const refused = a.mode === 'decline' || a.mode === 'clarify';
    return { ranked: a.ranked || a.shown, shown: refused && a.mode === 'decline' ? [] : a.shown, bubbles: a.text.split('\n\n'), refused, mode: a.mode, answer: a };
  };
}

/** every id a citation may legitimately carry: entity ids and the record ids of all passages (WT:/TOUR: prose stops included) */
export async function knownIds({ hx = HX } = {}) {
  const fs = await import('node:fs/promises');
  const rd = async (rel) => JSON.parse(await fs.readFile(path.join(hx, rel), 'utf8'));
  const man = await rd('manifest.json');
  const ids = new Set((await rd(man.tiers.entity.path)).records.map((r) => r.id));
  for (const f of man.tiers.text.files) { const j = await rd(f.path); const ri = j.h.indexOf('rec'); for (const row of j.p) ids.add(row[ri]); }
  for (const c of Object.values(man.corpora || {})) for (const f of c.text.files) { const j = await rd(f.path); const ri = j.h.indexOf('rec'); for (const row of j.p) ids.add(row[ri]); }   // the records of a corpus (its reports and dispatches)
  return ids;
}
