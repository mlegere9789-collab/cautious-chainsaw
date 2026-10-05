// Generates the patch group MON (tools/t0/patches-next/MON.json) from the readable runtime source tools/t0/mon/gtmon.js.
//
//   node tools/t0/mon/build-mon.mjs            write tools/t0/patches-next/MON.json (or tools/t0/patches/MON.json once the group is registered, see MON-README.md)
//   node tools/t0/mon/build-mon.mjs --check    exit 1 when the committed MON.json is not what this generator produces from gtmon.js (the source and the patch must not drift)
//
// The runtime is stripped of comments and whitespace with terser (pinned in package.json: compress and mangle are OFF, output is ASCII only, so the bundle text is
// deterministic and stays readable by identifier), then wrapped into the patches below.  All anchors are asserted by the T0 builder (`expect`), they are written
// against the text the bundle has AFTER groups A..CP/A2 (the group is applied last) and they hold on R1a, R1b and R1c alike: the places where the trains differ
// (the phone Tools tile that group C dropped, the phone component's signature that group C extended) are handled by regex patches that match both texts once.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { minify } from 'terser';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const SRC = path.join(HERE, 'gtmon.js');
const argv = process.argv.slice(2);
const CHECK = argv.includes('--check');
// the registered location wins once `git mv tools/t0/patches-next/MON.json tools/t0/patches/MON.json` has happened
const REGISTERED = path.join(REPO, 'tools', 't0', 'patches', 'MON.json');
const INERT = path.join(REPO, 'tools', 't0', 'patches-next', 'MON.json');
const OUT = fs.existsSync(REGISTERED) ? REGISTERED : INERT;

const min = await minify(fs.readFileSync(SRC, 'utf8'), { compress: false, mangle: false, format: { comments: false, ascii_only: true, semicolons: true } });
if (min.error) throw min.error;
const ENGINE = min.code.replace(/;$/, '') + ';';

// The 20 story markers (the legacy array `mA` of the entry bundle) carried 12 wrong values (9 unit ids, 3 coordinate pairs) that a verifier found; they are corrected IN the array, not in the runtime (the Walkthrough has
// its own data and is not in this span of the bundle).  [id, legacy unit id, order-of-battle id of the same regiment, and for three stars: legacy lat, lng, then the lat, lng of the
// monument record the star belongs on (records 220, 85 and 37 of the 512-monument array)].  The legacy ids U-I-1-2W, U-I-1-19IN, C-20NC-IV and U-I-1-6W are not in the order of battle
// (the same regiments are U-2WI, U-19IN, C-20NC, U-6WI); the five regiments named by their star but linked to another brigade's id get their own id; the three stars lay 1.4-2.1 km from
// every monument.
const STORY_FIXES = [
  ['mon_iron_brig', 'U-I-1-2W', 'U-2WI', '39.8289', '-77.2772', '39.83491', '-77.25441'],
  ['mon_reynolds', 'U-I-1-19IN', 'U-19IN', '39.8272', '-77.2767', '39.834392', '-77.250954'],
  ['mon_26nc', 'C-III-2-2', 'C-26NC', '39.8289', '-77.27', '39.834715', '-77.254605'],
  ['mon_20nc', 'C-20NC-IV', 'C-20NC'],
  ['mon_6wis', 'U-I-1-6W', 'U-6WI'],
  ['mon_140pa', 'U-V-3-1', 'U-140PA'],
  ['mon_83pa', 'U-V-3-1', 'U-83PA'],
  ['mon_1mn', 'U-II-3-2', 'U-1MN'],
  ['mon_72pa', 'U-II-2-3', 'U-72PA'],
];
const reEsc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const storyPatches = STORY_FIXES.map(([id, oldU, newU, oldLat, oldLng, newLat, newLng]) => ({
  id: `MON:story-data:${id}`,
  target: 'js',
  find: oldLat
    ? `(id:"${id}",name:"[^"]*",unit_id:")${reEsc(oldU)}(",lat:)${reEsc(oldLat)}(,lng:)${reEsc(oldLng)}(?=,tick:)`
    : `(id:"${id}",name:"[^"]*",unit_id:")${reEsc(oldU)}(")`,
  repl: oldLat ? `\\g<1>${newU}\\g<2>${newLat}\\g<3>${newLng}` : `\\g<1>${newU}\\g<2>`,
  expect: 1,
  regex: true,
  note: `story marker ${id} (array mA): unit ${oldU} -> ${newU}` + (oldLat ? `; the star moves from ${oldLat}, ${oldLng} onto its monument record at ${newLat}, ${newLng}` : '') + '.',
}));

const patches = [
  ...storyPatches,
  {
    id: 'MON:engine+desktop-KF',
    target: 'js',
    find: 'function KF({mapRef:c,showMonuments:f}){',
    // the runtime goes in front of KF; KF itself becomes a thin component (same name and props, so group C's gate `Zn!=="mobile"&&` around it still holds) that hands
    // the map and the toggle to the runtime; the legacy body (a screen-fixed DOM overlay fed by a per-frame setState that threw TypeErrors) stays below as dead code
    repl: ENGINE + 'function KF({mapRef:c,showMonuments:f,onWalkthrough:w,onShow:s}){return GTMON.useDesktop(c,f,w,s)}function GtMonLegacyKF({mapRef:c,showMonuments:f}){',
    expect: 1,
    note: 'MON runtime + the desktop hook: the Monuments toolbar button (state sn, aria-pressed from group AX) now drives GTMON.',
  },
  {
    id: 'MON:desktop-default-off',
    target: 'js',
    find: '[sn,$n]=pt.useState(!0)',
    repl: '[sn,$n]=pt.useState(!1)',
    expect: 1,
    note: 'the legacy app starts with the Monuments state TRUE (the toolbar button looked pressed at load while nothing was drawn, and the first click turned it off); now the button is off at load, matching the layer: aria-pressed is true exactly when the markers are on screen.',
  },
  {
    id: 'MON:desktop-walkthrough-opener',
    target: 'js',
    find: 'V.jsx(KF,{mapRef:Nn,showMonuments:sn})',
    repl: 'V.jsx(KF,{mapRef:Nn,showMonuments:sn,onWalkthrough:()=>Ut(!0),onShow:$n})',
    expect: 1,
    note: 'gives the card its "Open in Walkthrough list" action the same opener as the toolbar button (Ut(!0)), and the runtime the setter of the button state ($n): the state outlives the desktop layout (the shell stays mounted while the phone layout shows), so a layer switched off on the phone must be able to switch the button off too.',
  },
  {
    id: 'MON:phone-signature',
    target: 'js',
    find: 'function pO\\(\\{onSwitchToDesktop:c([^}]*)\\}\\)\\{',
    repl: 'function pO({onSwitchToDesktop:c\\1,gtMonWt:gtMonWt}){const gtOn=GTMON.useOn();',
    expect: 1,
    regex: true,
    note: 'phone component: one more prop (the Walkthrough opener) and the layer state for the Tools tile; matches the signature with or without group C\'s extra props.',
  },
  {
    id: 'MON:phone-walkthrough-opener',
    target: 'js',
    find: 'V.jsx(pO,{onSwitchToDesktop:',
    repl: 'V.jsx(pO,{gtMonWt:()=>Ut(!0),onSwitchToDesktop:',
    expect: 1,
  },
  {
    id: 'MON:phone-attach',
    target: 'js',
    find: '$t.on("load",()=>{Pn.current=$t;',
    repl: '$t.on("load",()=>{Pn.current=$t;GTMON.attach($t,{layout:"phone",walkthrough:gtMonWt});',
    expect: 1,
    note: 'the phone map joins the runtime when it has loaded (the runtime adds its layers a microtask later, after the app\'s own layers).',
  },
  {
    id: 'MON:phone-tools-tile',
    target: 'js',
    // group C dropped the dead tile (mob:HF-6a); legacy (R1a) still has it between Unit Roster and Soldier's View.  The optional group makes the pattern match the
    // text with the dead tile (replaced) and without it (inserted) exactly once.
    find: '(\\{icon:"\u2630",label:"Unit Roster",action:\\(\\)=>\\{er\\(!0\\),vi\\(!1\\)\\}\\},)(?:\\{icon:"\ud83d\uddff",label:"Monuments",action:\\(\\)=>\\{pi\\(!An\\),vi\\(!1\\)\\}\\},)?(?=\\{icon:"\ud83d\udd2d",label:"Soldier\'s View")',
    repl: '\\1{icon:"\ud83d\uddff",label:"Monuments",gtMon:!0,action:()=>{GTMON.toggle(),vi(!1)}},',
    expect: 1,
    regex: true,
    note: 'restores the phone Tools "Monuments" tile (aria-pressed, toggles the layer); R1a had a dead tile here, R1b/R1c had none.',
  },
  {
    id: 'MON:phone-tile-pressed',
    target: 'js',
    find: '.map(({icon:$t,label:bn,action:ai})=>V.jsxs("button",{style:tn.toolBtn,onClick:ai,children:[',
    repl: '.map(({icon:$t,label:bn,action:ai,gtMon:gm})=>V.jsxs("button",{style:gm?{...tn.toolBtn,...(gtOn?{borderColor:"#c8a84a",background:"rgba(200,168,74,0.16)"}:{})}:tn.toolBtn,"aria-pressed":gm?gtOn:void 0,onClick:ai,children:[',
    expect: 1,
    note: 'a Tools tile may carry gtMon: it then shows the layer state (gold border, aria-pressed).',
  },
  {
    id: 'MON:toolbar-narrow',
    target: 'css',
    // group AX's rule for widths under 1000 px: the middle group (Toggle Units, User Guide, Virtual Walkthrough) is taken out of the flow and centred, so at 960 px it lies on top of the
    // right-hand button row (Search, Filter, Unit Roster, Legend, Monuments ...: the Walkthrough button covers the centre of the Monuments button).  Instead the group stays in the flow, gets
    // tighter padding and gives way step by step: the PDF link (clipped to 148 px: R1c's text 'User Guide (PDF)' is 135 px, the legacy 'Download Website Tutorial' of R1a and R1b is 232) under 990 px,
    // Toggle Units under 850 px, the Walkthrough label is clipped under 750 px.  Nothing overlaps and nothing leaves the window from 640 px up (the three groups need 977, 836 and 739 px).
    // R1a has no group AX (so no such rule and no gtbg-tb-center class in its markup): there the pattern's second alternative, the stylesheet anchor group AX itself uses, matches instead
    // (only when no gtbg-tb-center text follows it) and the rules are inserted as harmless dead CSS, so the pattern matches exactly once on R1a, R1b and R1c.
    find: String.raw`(@media \(max-width:999px\)\{\.gtbg-tb-center\{position:absolute!important;left:50%!important;transform:translateX\(-50%\)!important\}\})|(\.mapboxgl-ctrl button\.mapboxgl-ctrl-level-button-selected:hover\{background-color:#ccc\})(?![\s\S]*gtbg-tb-center)`,
    regex: true,
    repl: [
      '@media (max-width:999px){.gtbg-tb-center{position:static!important;left:auto!important;transform:none!important;min-width:0}.gtbg-tb-center>div{gap:6px!important}.gtbg-tb-center button,.gtbg-tb-center a{padding-left:8px!important;padding-right:8px!important}.gtbg-tb-center a[download]{box-sizing:border-box;max-width:148px;overflow:hidden;text-overflow:ellipsis}}',
      '@media (max-width:989px){.gtbg-tb-center a[download]{display:none!important}}',
      '@media (max-width:849px){.gtbg-tb-center>div>button:first-child{display:none!important}}',
      '@media (max-width:749px){.gtbg-tb-center{max-width:calc(100vw - 590px);overflow:hidden}.gtbg-tb-center>div>button:last-child{max-width:100%;overflow:hidden;text-overflow:ellipsis}}',
    ].join('\n') + String.raw`\2`,
    expect: 1,
    note: "toolbar of a desktop window narrower than 1000 px: the Virtual Walkthrough button no longer lies on top of the Monuments button (pre-existing in every train: the rule it replaces is group AX's).",
  },
];

const doc = {
  group: 'MON',
  description: 'Monuments: the 512 battlefield monuments as dots and the 20 story markers as stars, drawn INSIDE the Mapbox map as event-driven GeoJSON layers; the desktop toolbar button and the phone Tools tile drive them (tools/t0/MON-README.md). Optional group: needs trains.json registration, see the README.',
  patches,
};
const text = JSON.stringify(doc, null, 1) + '\n';
if (CHECK) {
  const have = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
  if (have !== text) { console.error(`MON.json is out of date with tools/t0/mon/gtmon.js (${path.relative(REPO, OUT)}): run node tools/t0/mon/build-mon.mjs`); process.exit(1); }
  console.log(`MON.json matches gtmon.js (${path.relative(REPO, OUT)}, ${text.length} bytes, runtime ${ENGINE.length} bytes)`);
} else {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, text);
  console.log(`${path.relative(REPO, OUT)} written: ${patches.length} patches, runtime ${ENGINE.length} bytes (source ${fs.statSync(SRC).size} bytes)`);
}
