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
  ground: { colour: IDX.ground.colour }, attribution: IDX.attribution, maxZoom: 17,
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
// ---- owner requirement (2026-10-19): the site shows only actual images of Gettysburg and no modern imagery under the 1863 label.  The Walkthrough map and the seven pages that start their own
// Mapbox map used the modern Mapbox satellite style; the Street View embed and the Soldier's Eye View panel show modern Google panoramas.  They now use the reconstruction (same tiles, same label) or are removed.
const baselineJs = fs.readdirSync(path.join(REPO, 'baseline', 'dist', 'assets')).filter((f) => /^index-.*\.js$/.test(f)).map((f) => fs.readFileSync(path.join(REPO, 'baseline', 'dist', 'assets', f), 'utf8')).join('\n');
const between = (a, b) => { const i = baselineJs.indexOf(a); if (i < 0) throw new Error('anchor not found: ' + a.slice(0, 50)); const j = baselineJs.indexOf(b, i); if (j < 0) throw new Error('end anchor not found: ' + b.slice(0, 50)); return baselineJs.slice(i, j + b.length); };
const PAGE_STYLE = '{version:8,name:"Gettysburg, July 1863 (reconstruction)",sources:{"b1863-wide":{type:"raster",tiles:["/tiles1863/' + VER + '/{z}/{x}/{y}.webp"],tileSize:512,minzoom:' + IDX.wide.minzoom + ',maxzoom:' + IDX.wide.maxzoom +
  ',bounds:' + JSON.stringify(IDX.wide.bounds) + ',attribution:"Reconstruction of July 1863, not a photograph (USDA NAIP 2013 edited with period maps)"},"b1863-detail":{type:"raster",tiles:["/tiles1863/' + VER + '/{z}/{x}/{y}.webp"],tileSize:512,minzoom:' + IDX.detail.minzoom +
  ',maxzoom:' + IDX.detail.maxzoom + ',bounds:' + JSON.stringify(IDX.detail.bounds) + '}},layers:[{id:"b1863-ground",type:"background",paint:{"background-color":"' + IDX.ground.colour + '"}},{id:"b1863-wide",type:"raster",source:"b1863-wide"},{id:"b1863-detail",type:"raster",source:"b1863-detail"}]}';
const PAGE_LABEL_JS = ''; // the pages carry the attribution string of the source (map attribution control); the label is the first words of it
const extra = [
  P('walkthrough-style', 'M.current=new z_.Map({container:el,style:"mapbox://styles/mapbox/satellite-v9",center:[-77.235,39.812],zoom:13,minZoom:11,maxZoom:18,attributionControl:!1});M.current.on("load"',
    'M.current=new z_.Map({container:el,style:GTB63.style(),center:[-77.235,39.812],zoom:13,minZoom:11,maxZoom:17,attributionControl:!1});GTB63.attach(M.current,"phone");M.current.on("load"',
    'the Virtual Walkthrough map: the reconstruction instead of the Mapbox satellite style (zoom limit 17: the picture is native at z16)'),
  P('streetview-embed', between('V.jsxs("div",{style:Tn.svWrapper,children:[V.jsx("iframe",', 'children:"Open in Google Maps ↗"})]}),'), '',
    'the Google Street View embed of the tour stops (modern imagery) is removed; the text and the NPS video link of the stop stay'),
  P('soldiers-eye-panel-a', 'sn&&V.jsx(Yk,{onClose:()=>$n(!1)}),', '', 'Soldier\'s Eye View (links to modern Google Street View panoramas): the panel is not offered'),
  P('soldiers-eye-panel-b', 'Pn&&V.jsx(Yk,{onClose:()=>ki(!1)}),', '', 'same panel, second render site'),
  P('soldiers-eye-button', between('V.jsx(Vs,{label:"🔭",title:"Soldier\'s Eye View (Street View)"', 'onClick:()=>ki(ii=>!ii)}),'), '', 'its toolbar button'),
];
for (const pg of ['camera', 'sandbox', 'immersive', 'viewshed', 'watch-together', 'cinematic-export', 'unit-rendering-reference']) {
  extra.push({ id: `B63:page-${pg}`, target: `${pg}.html`, find: "style: 'mapbox://styles/mapbox/satellite-v9',", repl: 'style: ' + PAGE_STYLE + ', maxZoom: 17,', expect: 1, regex: false, note: `${pg}.html starts its own Mapbox map: the reconstruction instead of the Mapbox satellite style` });
}
extra.push({ id: 'B63:page-compare', target: 'compare.html', find: "satellite: 'mapbox://styles/mapbox/satellite-v9',", repl: 'satellite: ' + PAGE_STYLE + ',', expect: 1, regex: false, note: 'compare.html: its "satellite" base is the reconstruction' });
extra.push({ id: 'B63:page-index-copy', target: 'index.html', find: 'unfold on a real satellite map', repl: 'unfold on a map of the battlefield reconstructed as it was in July 1863 (not a photograph)', expect: 1, regex: false, note: 'the page copy no longer says the base is a satellite map' });
extra.push({ id: 'B63:page-compare-labels', target: 'compare.html', find: 'data-action="style-satellite">Satellite</button>', repl: 'data-action="style-satellite">1863 reconstruction</button>', expect: 2, regex: false, note: 'compare.html: the toggle that names the base' });
patches.push(...extra);
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
