// fixture.mjs - build the knowledge base into a temp directory once per test process and open an engine on it (hermetic: tests never depend on a committed dist/).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from '../../../tools/historian/build.mjs';
import { openKB, nodeFetcher } from '../../../historian-src/core/kb.js';
import { createEngine } from '../../../historian-src/core/engine.js';

let memo = null;
export async function fixture() {
  if (memo) return memo;
  memo = (async () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'hx-test-'));
    const res = build({ outDir: path.join(out, 'hx') });
    if (!res.ok) throw new Error('build failed: ' + JSON.stringify(res.report.findings.slice(0, 5)));
    const kb = await openKB(await nodeFetcher(path.join(out, 'hx')), { cache: 512 });
    const engine = createEngine(kb, { debug: true });
    // every passage, keyed by id (for quote-fidelity checks)
    const passages = new Map();
    const nums = Array.from({ length: kb.counts.passages }, (_, i) => i);
    const all = await kb.passages(nums);
    for (const p of all.values()) passages.set(p.id, p);
    return { out, hx: path.join(out, 'hx'), kb, engine, build: res, passages };
  })();
  return memo;
}
