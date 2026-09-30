#!/usr/bin/env node
// ask.mjs - run questions against the built KB from the terminal.
//   node tools/historian/ask.mjs "20th Maine" "who commanded the Iron Brigade?"      [--json] [--trace] [--hx historian-src/dist/hx]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openKB, nodeFetcher } from '../../historian-src/core/kb.js';
import { createEngine } from '../../historian-src/core/engine.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const hxIdx = args.indexOf('--hx');
const hx = path.resolve(hxIdx >= 0 ? args[hxIdx + 1] : path.join(root, 'historian-src/dist/hx'));
const qs = args.filter((a, i) => !a.startsWith('--') && !(hxIdx >= 0 && i === hxIdx + 1));
const kb = await openKB(await nodeFetcher(hx));
const eng = createEngine(kb, { debug: flag('--debug') });
for (const q of qs) {
  const a = await eng.ask(q);
  if (flag('--json')) { console.log(JSON.stringify(a, null, 1)); continue; }
  console.log(`\nQ: ${q}\n   mode=${a.mode} intent=${a.intent}${a.decline_reason ? ' reason=' + a.decline_reason : ''}  shown=${a.shown.join(',')}${a.did_you_mean ? '  did_you_mean=' + JSON.stringify(a.did_you_mean) : ''}`);
  for (const line of a.text.split('\n\n')) console.log('   | ' + line.replace(/\n/g, ' '));
  console.log('   chips: ' + a.chips.follow.map((c) => c.label).join(' / '));
  if (a.lint) console.log('   LINT: ' + JSON.stringify(a.lint));
  if (flag('--trace')) console.log('   trace: ' + JSON.stringify(a.trace));
}
