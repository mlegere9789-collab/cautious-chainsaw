// The Walkthrough guards (T0-MONL-12 in monuments.spec.mjs, T0-B63-11 in base1863.spec.mjs) compare the Walkthrough region of the entry (tour data, the 512 monuments, the components, from
// `d2=[{id:1,name:"McPherson Ridge"` to `const ln={ink:`) byte for byte with the published train R1c.  Group PERF5 (train R1f) changes the map effect of the Walkthrough on purpose
// (tools/t0/PERF5-README.md): it is built one frame after the overlay is painted and its three layers are added out of their zoom range and shown in two steps.  The guard stays strict:
// for a tree that has PERF5 the expected region is the control's region with exactly the registered `PERF5-wt-*` edits applied, and nothing else may differ.
import fs from 'node:fs';
import path from 'node:path';

export function hasPerf5(entryText) { return entryText.includes('function gtStepper('); }

/** the control region with the PERF5-wt-* patches applied (each `find` must occur exactly once in the region) */
export function expectedWalkthroughRegion(controlRegion, repoRoot) {
  const reg = path.join(repoRoot, 'tools', 't0', 'patches', 'PERF5.json');
  const src = path.join(repoRoot, 'tools', 't0', 'patches-next', 'PERF5.json');
  const file = fs.existsSync(reg) ? reg : src;
  const patches = JSON.parse(fs.readFileSync(file, 'utf8')).patches.filter((p) => p.id.startsWith('PERF5-wt-'));
  if (!patches.length) throw new Error('PERF5.json has no PERF5-wt-* patches');
  let r = controlRegion;
  for (const p of patches) {
    const n = r.split(p.find).length - 1;
    if (n !== 1) throw new Error(`${p.id}: its anchor occurs ${n} times in the control's Walkthrough region (want 1)`);
    r = r.replace(p.find, () => p.repl);
  }
  return r;
}
