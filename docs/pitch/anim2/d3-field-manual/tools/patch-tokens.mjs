// tools/patch-tokens.mjs - the differences between the prototype's tokens/tokens.json and this fork's, as a script (idempotent).  The prototype generated tokens.json from two Python files; this fork keeps
// tokens.json as the source of truth and records each change here, with the reason, so the fork can be diffed against the prototype by reading one file.
//   node tools/patch-tokens.mjs            apply to tokens/tokens.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'tokens', 'tokens.json');
const doc = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const by = new Map(doc.tokens.map((t) => [t.id, t]));
const set = (id, patch) => { const t = by.get(id); if (!t) throw new Error('no token ' + id); Object.assign(t, patch); };

// the style: the Precision Field Manual on the real ground
set('skin.id', { default: 'd3', doc: 'The skin that draws the tiles. This fork ships the Precision Field Manual (d3, d3/day, d3/cvd, d3/contrast) and the engine\'s own reference test skin.' });
set('backdrop.id', { default: 'real-fm', doc: 'The ground under the marks: the real aerial of docs/pitch/anim2/basemap (real-fm night, real-fmday paper, and the module\'s own looks real-dim, real-natural, real-slate, real-paper) or the prototype\'s schematic grid (paper, ink).' });
// quiet rules
set('layout.labels', { default: false, doc: 'Show a second box with the unit name beside each mark. OFF: one object per unit; the full name appears when the mark grows (close zoom, selection) and in the tooltip.' });
set('scene.hulls', { default: true, doc: 'Aggregates may show the true positions of the records they stand for. The Precision Field Manual draws them only while the aggregate is hovered.' });
// motion: a mark arrives at 88 % of its size and settles; the cross-fades stay short and on one curve
set('motion.birthScale', { default: 0.88, min: 0.5, max: 1, doc: 'A new mark grows from this fraction of its size (the ink-in of the skin does the rest).' });
set('camera.zoom', { default: 13.5 });
// the names of places are laid out by the fork's own fx (fx/places.mjs), against the marks of every frame; the backdrop module's own place marks are switched off
set('backdrop.places', { default: false, label: 'Place marks (the basemap module)', doc: 'The basemap module draws its own place marks and names, placed once per zoom step without knowing where the unit marks are. OFF in this fork: fx/places.mjs draws the same 41 places every frame and keeps every name clear of every mark.' });
if (!by.has('backdrop.placeLabels')) { const t = { id: 'backdrop.placeLabels', group: 'backdrop', type: 'boolean', label: 'Place names', default: true, doc: 'Draw the names of places (ring and name) in the first free slot beside the place, never under a unit mark; a place with no free slot shows nothing.', evidence: 'Modelled' }; doc.tokens.splice(doc.tokens.findIndex((x) => x.id === 'backdrop.places') + 1, 0, t); }
// popups: one flat language
set('popup.style.palette', { default: 'manual', doc: 'Colour family of every popup. Colour is never the only cue: every tone has a shape and a word.' });
const pal = by.get('popup.style.palette'); if (!pal.options.some((o) => o.value === 'manual')) pal.options.unshift({ value: 'manual', label: 'Manual (one ink, one signal colour)' });
set('popup.style.radiusPx', { default: 3, min: 0, max: 8, doc: 'Corner radius of cards, chips and the rail: the one radius of the language (the same as the marks).' });
set('popup.style.blurPx', { default: 0, doc: 'Backdrop blur behind a card; 0 = opaque flat panels (the language has no glass).' });
set('popup.style.shadow', { default: 'none' });
set('popup.style.titleFont', { default: 'serif' });
set('popup.motion.risePx', { default: 4 });
set('popup.motion.enterMs', { default: 200 });
set('popup.motion.exitMs', { default: 140 });
set('popup.motion.leaderMs', { default: 200 });

fs.writeFileSync(FILE, JSON.stringify(doc, null, 1) + '\n');
console.log('patched', FILE);
