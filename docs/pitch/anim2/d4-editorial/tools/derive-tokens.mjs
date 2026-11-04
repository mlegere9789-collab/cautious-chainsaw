// tools/derive-tokens.mjs - studio/tokens/tokens.json is DERIVED from the first prototype's tokens (docs/pitch/anim/prototype/tokens/tokens.json, the engine's dials) by the changes below, so a reviewer can
// see in one place what art direction 4 changed in the engine's defaults and what it added.  Run it, then `node studio/tokens/make-schema.mjs` (build.mjs does).
//   node docs/pitch/anim2/d4-editorial/tools/derive-tokens.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const UP = path.resolve(HERE, '..', '..', '..', 'anim', 'prototype', 'tokens', 'tokens.json');
const OUT = path.resolve(HERE, '..', 'studio', 'tokens', 'tokens.json');
const t = JSON.parse(fs.readFileSync(UP, 'utf8'));
const get = (id) => { const x = t.tokens.find((q) => q.id === id); if (!x) throw new Error('no token ' + id); return x; };
const set = (id, patch) => Object.assign(get(id), patch);
const add = (after, tok) => { const i = t.tokens.findIndex((q) => q.id === after); if (i < 0) throw new Error('no token ' + after); t.tokens.splice(i + 1, 0, tok); };

// the skin and the ground
set('skin.id', { default: 'dispatch-paper', doc: 'The skin that draws the marks. Dispatch (art direction 4): one mark per unit, a haloed code beside a bold disc or standard, the name growing out of the mark, formation hulls on interaction.' });
set('backdrop.id', { default: 'real-paper', doc: 'The ground: the real USGS aerial photograph (NAIP, April to May 2022), lit by the 3DEP elevation model, with contours and TIGER roads; four looks. It is modern ground, not the 1863 landscape.' });
set('backdrop.places', { label: 'Place names', doc: 'Show the place names of the site data (the skin draws them; a name steps aside for a mark that would cover it).' });
set('scene.hulls', { label: 'Hulls on interaction', doc: 'On hover or selection, show the soft hull of the formation the mark belongs to (or of the crowd it stands for) and the true position of each record.' });
set('scene.leaders', { label: 'Leader lines', doc: 'A thin line from a displaced mark to the place it truly stands (drawn only when that place is clear of the mark).' });
// names grow out of the mark: only to the right of it (the text run goes on), immediately for the hovered unit
set('layout.labelMinZoom', { default: 17, doc: 'From this zoom a unit whose full name fits in the free ground beside it lets the name grow out of its code. The hovered or selected unit grows its name at any zoom.' });
add('layout.labelMinZoom', { id: 'layout.codeMinZoom', group: 'layout', type: 'number', label: 'Zoom of the codes', default: 14.4, min: 11, max: 18, step: 0.1, unit: 'zoom', doc: 'From this zoom a unit shows its short code in the free ground beside its disc (right, else left); below it the discs are bare, so a crowd opens as soon as the discs fit and the opening view stays quiet. The hovered or selected unit shows its name at any zoom.', evidence: 'Design' });
add('layout.dMaxPx', { id: 'layout.dMaxFarPx', group: 'layout', type: 'number', label: 'Reach at close zoom', default: 72, min: 48, max: 160, step: 2, unit: 'px', doc: 'How far a mark may stand from its true position once the camera is close (from the zoom below): two records are not merged into a crowd while there is free ground within this reach. The pin and the leader keep the true position.', evidence: 'Design' });
add('layout.dMaxFarPx', { id: 'layout.dMaxFarFrom', group: 'layout', type: 'number', label: 'Reach grows from zoom', default: 14.5, min: 11, max: 18, step: 0.1, unit: 'zoom', doc: 'The reach grows from the first-prototype budget at this zoom, smoothly, to the close reach at the next dial.', evidence: 'Design' });
add('layout.dMaxFarFrom', { id: 'layout.dMaxFarTo', group: 'layout', type: 'number', label: 'Reach full at zoom', default: 15.5, min: 11, max: 18, step: 0.1, unit: 'zoom', doc: 'From this zoom a mark may stand the close reach from its true position.', evidence: 'Design' });
set('layout.labelShowDelayMs', { default: 160 });
set('motion.labelFadeMs', { default: 240, doc: 'How long a name takes to wipe out of its mark (and to go back).' });
add('layout.labels', { id: 'layout.labelSlots', group: 'layout', type: 'select', label: 'Where a name may grow', default: 'r', options: [{ value: 'r', label: 'Right of the mark (the text run goes on)' }, { value: 'rl', label: 'Right, else left' }, { value: 'rlbt', label: 'Right, left, below, above (the first prototype)' }], doc: 'The free slots a name may take around its mark, in order. A name that grows out of the mark continues its text run, so only the right is natural.', evidence: 'Design' });
// popups: the editorial card
set('popup.style.radiusPx', { default: 4, doc: 'Corner radius of every card (editorial: small).' });
set('popup.style.blurPx', { default: 0, doc: 'Backdrop blur behind a card (0: a card is paper, not glass).' });
set('popup.style.palette', { default: 'dispatch', options: [{ value: 'dispatch', label: 'Dispatch (editorial ink)' }, { value: 'signal', label: 'Signal (higher contrast)' }, { value: 'mono', label: 'Mono (ink only)' }] });
set('popup.style.titleFont', { default: 'serif', options: [{ value: 'serif', label: 'Serif (Source Serif 4: the editorial titles)' }, { value: 'sans', label: 'Sans (Inter)' }] });
// the legend opens in the reading rail now: its open/closed dial is gone
t.tokens = t.tokens.filter((q) => !['popup.legend.open', 'popup.legend.slot', 'popup.minimap.w'].includes(q.id));      // round 2: the legend opens from the masthead into the rail and the overview map lives in the dock: neither has a place or a width on the map to dial
// motion: the language of arrival (SPEC.md section 7): a mark fades in over 240 ms while it grows from 85 percent, the cards rise 8 px over 240 ms on one curve
set('motion.fadeMs', { default: 240 });
set('motion.maxPushPx', { default: 0.75, doc: 'A contact moves a tile by at most this much per pass, so tiles are eased apart instead of shoved (the first prototype used 1.5: with four passes that is up to 6 px in a frame, and where contacts compound a visible hop). Measured on 600 frames of three scenes at 1x and 4x with tools/jitter-probe.mjs: 0.75 halves the hops at 4x in the Wheatfield (about 6 to 2) at no cost in overlaps (the safety net still guarantees none). What still overlaps is repaired by dimming, never by overlap.' });
set('motion.birthScale', { default: 0.85, min: 0.5, doc: 'Size of a mark at birth, as a share of its final size (it grows to 100 percent while it fades in; the disc adds a small settle inside its own box).' });
set('popup.motion.enterMs', { default: 240 });
set('popup.motion.risePx', { default: 8 });
set('popup.motion.leaderMs', { default: 280 });
// round 1: a leader longer than this is not drawn at all (the critics: a 600 px red line across the map is noise); the subject keeps its highlighter and its pulse and the card names it
add('popup.place.maxLeaderPx', { id: 'popup.place.leaderShowPx', group: 'popups', type: 'number', label: 'Longest leader line drawn', default: 300, min: 60, max: 1200, step: 10, unit: 'px', doc: 'A leader line from a card to its subject is drawn only when it is at most this long. A longer one is left out: the subject stays highlighted and pulses, and the card names it.', evidence: 'Design' });
set('popup.sheet.peekPx', { default: 156, doc: 'Height of the bottom sheet at its peek detent on a phone-sized screen: the head of the card and its first row, so the map keeps more than 60 percent of the screen.' });
// round 2: one floating card at a time (the rest wait as chips in the Chronicle strip), and no repository path in a user-facing string
set('popup.queue.aliveA', { default: 1 }); set('popup.queue.aliveB', { default: 0 });
add('popup.queue.aliveB', { id: 'popup.queue.floatMax', group: 'popups', type: 'number', label: 'Floating cards at a time', default: 1, min: 1, max: 4, step: 1, unit: 'cards', doc: 'The most cards that may stand on the map at once (pinned cards and the hover tooltip excepted). The richest keeps the ground (the selection first, then the most important event); the others wait as chips in the Chronicle strip and nothing is lost.', evidence: 'Design' });
set('layout.labelSlots', { default: 'rl' });
for (const x of t.tokens) delete x.source;
fs.writeFileSync(OUT, JSON.stringify(t, null, 1));
console.log('wrote', path.relative(process.cwd(), OUT), t.tokens.length, 'tokens');
