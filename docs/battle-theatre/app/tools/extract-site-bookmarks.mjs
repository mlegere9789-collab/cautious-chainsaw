// Read-only extraction of the site's 16 tour stops and 512 monuments from the PUBLISHED entry bundle (baseline/dist), as camera bookmarks only.
// Nothing under baseline/, release/, legacy/ or src is written. Only the fields a bookmark needs are kept (id, name, day, position, side/group): narration text,
// Street View parameters and any embed key in the bundle are NOT copied. The canonical hashes of the full datasets are checked against the pins of
// tests/t0/walkthrough-guard.spec.mjs so a changed site dataset is noticed.   node docs/battle-theatre/app/tools/extract-site-bookmarks.mjs [--check]
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const here = path.dirname(fileURLToPath(import.meta.url)); const root = path.resolve(here, '../../../..');
const require = createRequire(path.join(root, 'package.json')); const acorn = require('acorn');
const PIN = { tour: '31149ceaa519506bfc20ee4f4d4fdd77e1760d393d4d0aee4023abfe2f35a31c', mons: '0204397d5ccc47ffce1e9f7231bc483b97bedbce4a8c7082c8ca4b670eac59ba' };
const entry = path.join(root, 'baseline/dist/assets', fs.readdirSync(path.join(root, 'baseline/dist/assets')).filter(f => /^index-.*\.js$/.test(f)).sort((a, b) => fs.statSync(path.join(root, 'baseline/dist/assets', b)).size - fs.statSync(path.join(root, 'baseline/dist/assets', a)).size)[0]);
const src = fs.readFileSync(entry, 'utf8');
function literal(marker) { const at = src.indexOf(marker); if (at < 0) throw new Error('marker not found: ' + marker); const start = at + marker.indexOf('['); let n = acorn.parseExpressionAt(src, start, { ecmaVersion: 'latest' }); if (n.type === 'SequenceExpression') n = n.expressions[0]; return new Function(`return (${src.slice(n.start, n.end)})`)(); }
const canon = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(q => [q, x[q]])) : x));
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const tour = literal('d2=[{id:1,name:"McPherson Ridge"'), mons = literal('_A=[{no:1,name:"Alabama State Monument"');
const okTour = sha(canon(tour)) === PIN.tour, okMons = sha(canon(mons)) === PIN.mons;
console.log('tour stops', tour.length, 'sha matches pin:', okTour, '| monuments', mons.length, 'sha matches pin:', okMons, '| entry', path.basename(entry));
console.log('tour keys', Object.keys(tour[0]).join(','), '| monument keys', Object.keys(mons[0]).join(','));
if (process.argv.includes('--keys')) { console.log(JSON.stringify({ ...tour[0], narration: '...' }).slice(0, 600)); console.log(JSON.stringify(mons[0])); process.exit(0); }
if (!okTour || !okMons) { console.error('dataset hash differs from the guard pin; refusing to write'); process.exit(2); }
const out = {
  _about: 'Camera bookmarks derived read-only from the published site bundle (tour stops d2, monuments _A). Only position and label fields are kept; narration, Street View parameters other than the viewpoint, links and keys are not copied.',
  source: { entry: path.basename(entry), tourSha256: PIN.tour, monumentsSha256: PIN.mons },
  tour: tour.map(s => ({ id: s.id, name: s.name, label: s.label, day: s.day, lat: s.lat, lng: s.lng, view: s.sv ? { lat: s.sv.lat, lng: s.sv.lng, heading: s.sv.heading } : null })),
  monuments: mons.map(m => ({ no: m.no, name: m.name, lat: m.lat, lng: m.lon, mn: m.mn, side: m.side, group: m.group, loc: m.loc })),
};
fs.writeFileSync(path.join(here, '../data/site-bookmarks.json'), JSON.stringify(out));
console.log('wrote data/site-bookmarks.json', fs.statSync(path.join(here, '../data/site-bookmarks.json')).size, 'bytes');
