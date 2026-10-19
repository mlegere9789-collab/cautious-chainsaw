#!/usr/bin/env node
// Generates tools/t0/patches-next/BASE1863.json from tools/t0/base1863/gtb63.js and the staged tile set (stage_assets.py).
//
//   python tools/t0/base1863/stage_assets.py                 # -> tmp/b1863/group/stage/tiles1863/<ver>/ (the files the site serves) + VERSION
//   node   tools/t0/base1863/build-base1863.mjs [--stage tmp/b1863/group/stage]
//   python tools/t0/base1863/b63_build.py --train R1c --out tmp/b1863/group/R1c      # scratch build with the group (see BASE1863-README.md)
//
// The patch file is inert (patches-next, like MON.json and CLOCK.json) until the integrator registers it.  Every anchor is asserted exactly once (expect: 1).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const STAGE = path.resolve(REPO, opt('stage', 'tmp/b1863/group/stage'));
const VER = fs.readFileSync(path.join(STAGE, 'VERSION'), 'utf8').trim();
const IDX = JSON.parse(fs.readFileSync(path.join(STAGE, 'tiles1863', VER, 'index.json'), 'utf8'));

const CFG = {
  wide: IDX.wide, detail: IDX.detail, changed: { minzoom: IDX.changed.minzoom, maxzoom: IDX.changed.maxzoom },
  ground: { colour: IDX.ground.colour }, attribution: IDX.attribution,
  classes: IDX.classes.map((c) => ({ code: c.code, rgb: c.rgb, text: c.text })),
};
let rt = fs.readFileSync(path.join(HERE, 'gtb63.js'), 'utf8').replace(/\r\n/g, '\n');
rt = rt.replace(/^\/\*[\s\S]*?\*\/\n/, '');                 // the header comment stays in the source file, not in the bundle
rt = rt.replace('"__VER__"', JSON.stringify(VER)).replace('__CFG__', JSON.stringify(CFG));
if (/__VER__|__CFG__/.test(rt)) throw new Error('placeholder left in the runtime');
rt = rt.trimEnd() + '\n';

const P = (id, find, repl, note) => ({ id: `B63:${id}`, target: 'js', find, repl, expect: 1, regex: false, note });
const patches = [
  P('engine+roads-data', 'function T4(c){c.addSource("roads-1863",{type:"geojson",data:x4}),',
    rt + 'function T4(c){c.addSource("roads-1863",{type:"geojson",data:GTB63.d("roads")}),',
    'inserts the runtime const GTB63 before T4 (the function that adds the product\'s own layers to a main map) and draws the road labels from the catalogue geometry'),
  P('rivers-data', 'c.addSource("rivers",{type:"geojson",data:b4})', 'c.addSource("rivers",{type:"geojson",data:GTB63.d("rivers")})', 'stream labels from the NHD catalogue courses'),
  P('farms-data', 'c.addSource("farms",{type:"geojson",data:S4})', 'c.addSource("farms",{type:"geojson",data:GTB63.d("farms")})', 'farm labels at the documented farmhouse points'),
  P('refine', '}}),gtPrecompile(c)}function gtPrecompile(m){', '}}),GTB63.refine(c),gtPrecompile(c)}function gtPrecompile(m){',
    'after the product layers exist: road/stream/farm-outline lines start hidden, labels sorted by rank, data applied'),
  P('desktop-style', 'container:f.current,style:"mapbox://styles/mapbox/satellite-v9",center:pF', 'container:f.current,style:GTB63.style(),center:pF',
    'the desktop main map: inline style with the local reconstruction instead of the Mapbox satellite style'),
  P('desktop-attach', 'Xe.addControl(new z_.NavigationControl,"top-right"),GtbgMapSetup(Xe,x)', 'GTB63.attach(Xe,"desktop"),Xe.addControl(new z_.NavigationControl,"top-right"),GtbgMapSetup(Xe,x)',
    'label, toggle, tile error filter'),
  P('phone-style', 'container:Yn.current,style:"mapbox://styles/mapbox/satellite-v9",center:[-77.235,39.812]', 'container:Yn.current,style:GTB63.style(),center:[-77.235,39.812]',
    'the phone main map (the Walkthrough map has its own style string and is NOT touched)'),
  P('phone-attach', '$t.touchZoomRotate.disableRotation(),$t.dragRotate.disable(),$t.addControl(new z_.AttributionControl({compact:!0}),"top-right")',
    'GTB63.attach($t,"phone"),$t.touchZoomRotate.disableRotation(),$t.dragRotate.disable(),$t.addControl(new z_.AttributionControl({compact:!0}),"top-right")', 'label, toggle, tile error filter'),
  P('layers-panel-state', '{"roads-1863-line":!0,"roads-1863-label":!0,"rivers-line":!0,"rivers-label":!0,"breastworks-line":!0,"farms-outline":!0,"farms-label":!1}',
    '{"roads-1863-line":!1,"roads-1863-label":!0,"rivers-line":!1,"rivers-label":!0,"breastworks-line":!0,"farms-outline":!1,"farms-label":!1}',
    'the Layers panel starts in the state the map is in (the road and stream lines are hidden on the reconstruction base, see BASE1863-README.md section 6)'),
  P('layers-panel-rows', '{id:"farms-outline",label:"Farm Outlines"},', '', 'there is no farm boundary in the catalogue: the old rectangles did not even contain their farmhouse (Rose: 347 m off), so the row is removed'),
];
const out = {
  group: 'BASE1863',
  description: 'Reconstruction of July 1863 as the base of the two main maps (desktop and phone): the Mapbox satellite style is replaced by an inline style that draws only the local tile pyramid /tiles1863/' + VER +
    '/ over a neutral ground colour; permanent label, "Show what was changed" toggle, sources link; the product\'s road/stream/farm overlays are redrawn from the catalogue geometry. The Walkthrough map is untouched. ' +
    'Needs the overlay files of tools/t0/base1863/stage_assets.py and the service-worker and headers additions of tools/t0/base1863/b63_build.py (BASE1863-README.md).',
  patches,
};
const dest = path.join(REPO, 'tools', 't0', 'patches-next', 'BASE1863.json');
fs.writeFileSync(dest, JSON.stringify(out, null, 1) + '\n');
console.log(`BASE1863.json: ${patches.length} patches, runtime ${rt.length} chars, tile set ${VER} -> ${path.relative(REPO, dest)}`);
