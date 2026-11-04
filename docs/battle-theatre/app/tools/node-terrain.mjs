// Node-side terrain loader (no world, no GPU): the prototype's loadTerrain with fetch shimmed to read the local files. Used by the structures builder and its tests.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
export const BT = path.resolve(here, '../..');
const realFetch = globalThis.fetch;
if (!globalThis.__btFetchShim) {
  globalThis.__btFetchShim = true;
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.startsWith('file:')) { const p = fileURLToPath(u); if (!fs.existsSync(p)) return new Response('nf', { status: 404 }); return new Response(fs.readFileSync(p), { status: 200 }); }
    return realFetch(url);
  };
}
let cached = null;
export async function nodeTerrain() {
  if (cached) return cached;
  const { loadTerrain } = await import(pathToFileURL(path.join(BT, 'render/prototype/src/world.mjs')).href);
  cached = await loadTerrain(pathToFileURL(path.join(BT, 'render/prototype/')).href);
  return cached;
}
