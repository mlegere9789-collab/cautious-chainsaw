// Node-side helper: builds the prototype world from the files on disk (fetch is shimmed to read local files), for tests that need no browser.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)); export const BT = path.resolve(here, '../..');
const realFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  const u = String(url);
  if (u.startsWith('file:')) { const p = fileURLToPath(u); if (!fs.existsSync(p)) return new Response('nf', { status: 404 }); const b = fs.readFileSync(p); return new Response(b, { status: 200 }); }
  return realFetch(url);
};
const { loadTerrain, buildWorld } = await import(pathToFileURL(path.join(BT, 'render/prototype/src/world.mjs')).href);
export async function nodeWorld() {
  const T = await loadTerrain(pathToFileURL(path.join(BT, 'render/prototype/')).href); const base = buildWorld(T, { total: 165000 });
  for (let i = 0; i < base.count; i++) base.sold1[i * 4] = 1e9;
  return { T, base };
}
export const cloneWorld = base => ({ ...base, unitF: base.unitF.slice(), gunF: base.gunF.slice() });
