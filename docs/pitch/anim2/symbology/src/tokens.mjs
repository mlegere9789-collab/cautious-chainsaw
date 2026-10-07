// src/tokens.mjs - load the token file (and an optional override file) and resolve it for one palette.
import fs from 'node:fs'; import path from 'node:path';
import { resolveTokens } from './common.mjs';
export function loadTokens({ file, overrides, palette = 'standard' } = {}) {
  const f = file || path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', 'tokens', 'symbology.tokens.json');
  const tree = JSON.parse(fs.readFileSync(f, 'utf8'));
  const ov = overrides ? JSON.parse(fs.readFileSync(overrides, 'utf8')) : null;
  return { T: resolveTokens(tree, { palette, overrides: ov }), tree };
}
