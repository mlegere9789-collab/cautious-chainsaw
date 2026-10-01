// or27-fixture.mjs - the Official Records corpus KB for the tests: built once per test process into a temporary directory from the corpus tables and the passages that tools/historian/ingest/corpus.mjs wrote
// (historian-src/raw/or27 is git-ignored, like the downloads in tmp/historian-cache: a fresh checkout has neither, and the tests that need the corpus are SKIPPED LOUDLY with the two commands that make it,
// never passed vacuously). An already built historian-src/dist/hx-or27 is used when there is no raw text, but only when its manifest says which corpus build it came from.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT } from './data.mjs';
import { build } from '../../../tools/historian/build.mjs';
import { openKB, nodeFetcher } from '../../../historian-src/core/kb.js';
import { createEngine } from '../../../historian-src/core/engine.js';
import { loadCorpusPassages } from './or27-golden.mjs';

export const RAW = path.join(ROOT, 'historian-src/raw/or27');
export const TABLES = path.join(ROOT, 'historian-src/corpus/or27');
export const SKIP = 'the Official Records corpus is not built here (historian-src/raw/or27 is git-ignored): run  node tools/historian/ingest/corpus.mjs build  (fetches from archive.org politely, or reads tmp/historian-cache) and then  node tools/historian/build.mjs --corpus or27 --out historian-src/dist/hx-or27';
const haveRaw = () => fs.existsSync(path.join(RAW, 'passages.jsonl')) && fs.existsSync(path.join(TABLES, 'reports.json'));
const haveDist = () => fs.existsSync(path.join(ROOT, 'historian-src/dist/hx-or27/manifest.json'));
export const available = () => haveRaw() || haveDist();

let memo = null;
/** { hx, kb, engine, fresh() (a new engine, so a test never inherits another's conversation), C (the corpus passages), built (true when built here), man, report (the build's validation report, null when the KB was already built) } or null when the corpus is not available */
export async function or27() {
  if (!available()) return null;
  if (memo) return memo;
  memo = (async () => {
    let hx, report = null;
    if (haveRaw()) {
      const out = fs.mkdtempSync(path.join(os.tmpdir(), 'hx-or27-test-'));
      const res = build({ outDir: path.join(out, 'hx'), corpora: ['or27'] });
      if (!res.ok) throw new Error('build failed: ' + JSON.stringify(res.report.findings.slice(0, 5)));
      hx = path.join(out, 'hx'); report = res.report;
    } else hx = path.join(ROOT, 'historian-src/dist/hx-or27');
    const kb = await openKB(await nodeFetcher(hx), { cache: 512 });
    return { hx, kb, engine: createEngine(kb), fresh: () => createEngine(kb), report, C: loadCorpusPassages(hx), man: JSON.parse(fs.readFileSync(path.join(hx, 'manifest.json'), 'utf8')), built: haveRaw() };
  })();
  return memo;
}
