// tools/export-skin-tokens.mjs - writes studio/tokens/dispatch.tokens.json: every token of the Dispatch skin (name, value, what it does, range) for the two families (paper, aerial) and their variants, as plain JSON a
// designer (or a design tool) can read without opening the module.  The skin itself reads editorial.spec.mjs; this file is derived from it (run this after a change; the editorial test checks they agree).
//   node tools/export-skin-tokens.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DISPATCH_TOKENS, DP_VARIANTS, DA_SET, DA_VARIANTS } from '../studio/src/skins/editorial.spec.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = Object.fromEntries(DISPATCH_TOKENS.map((r) => [r[0], r[1]])); base['text.dy'] = 0.6;
const doc = { format: 'dispatch-tokens/1', note: 'Lengths are CSS px at 1x, colours #rrggbb. paper = dark ink on the survey print; aerial = white ink on the dimmed photograph. A variant lists only the tokens it changes.',
  tokens: DISPATCH_TOKENS.map((r) => ({ name: r[0], default: r[1], doc: r[2], ...(r[3] || {}) })),
  families: { 'dispatch-paper': { set: {}, variants: Object.fromEntries(Object.entries(DP_VARIANTS).map(([k, v]) => [k, { label: v.label, set: v.set }])) }, 'dispatch-aerial': { set: DA_SET, variants: Object.fromEntries(Object.entries(DA_VARIANTS).map(([k, v]) => [k, { label: v.label, set: v.set }])) } },
  resolved: { 'dispatch-paper': base, 'dispatch-aerial': { ...base, ...DA_SET } } };
fs.writeFileSync(path.join(ROOT, 'studio', 'tokens', 'dispatch.tokens.json'), JSON.stringify(doc, null, 1)); console.log('wrote studio/tokens/dispatch.tokens.json', doc.tokens.length, 'tokens');
