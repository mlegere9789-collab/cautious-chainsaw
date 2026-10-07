// tools/sheets.mjs - render the symbol sheets to PNG (sheets/).
//   node tools/sheets.mjs [--only nato,shield,minimal] [--kind vocabulary,context,overlays,cvd]      (context needs `node build.mjs` first: it cuts the shipped atlas PNGs)
import fs from 'node:fs'; import path from 'node:path';
import { launch, ROOT, REPO } from './chrome.mjs';
import { loadTokens } from '../src/tokens.mjs';
import { LANGUAGES, LANGUAGE_IDS } from '../src/languages.mjs';
import { buildLanguageSprites, buildOverlaySprites } from '../src/build-sprites.mjs';
import { neededSet } from '../src/needed.mjs';
import { baseKey } from '../src/common.mjs';
import { wrap, namingTable, vocabSection, BACKDROPS, composeTile, place } from '../src/sheets.mjs';
import { luminance } from '../src/colour.mjs';
import { CHIPS, CHIP_TEXT, GAUGE_BINS } from '../src/chips.mjs';
import { BADGE_SHAPES, BADGE_TEXT, DIV_COLOURS, renderTab } from '../src/overlays.mjs';
import { dsUnit } from '../src/needed.mjs';

const argv = process.argv.slice(2); const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const only = (opt('only', '') || '').split(',').filter(Boolean); const kinds = (opt('kind', 'vocabulary,context,overlays,cvd') || '').split(',');
const palette = opt('palette', 'standard'); const { T } = loadTokens({ palette }); const needed = neededSet({ repo: REPO });
const suffix = palette === 'standard' ? '' : `-${palette}`; const distDir = palette === 'standard' ? 'dist' : `dist-${palette}`;
fs.mkdirSync(path.join(ROOT, 'sheets'), { recursive: true });
const { page, close } = await launch({ w: 2300, h: 1000, dpr: 1 });
/** render html to sheets/<name>.  fit = true: lay out in a wide viewport and cut the picture to the content (no blank band on the right) */
async function shot(html, name, w = 2300, fit = false) {
  await page.setViewportSize({ width: fit ? 5200 : w, height: 1000 }); await page.setContent(html, { waitUntil: 'load' }); await page.waitForTimeout(250); const f = path.join(ROOT, 'sheets', name);
  if (fit) { const box = await page.evaluate(() => { const r = [...document.querySelectorAll('.panel,.sub,table.n')].reduce((m, e) => Math.max(m, e.getBoundingClientRect().right), 0); return { w: Math.ceil(r), h: Math.ceil(document.body.getBoundingClientRect().height) }; }); await page.screenshot({ path: f, fullPage: true, clip: { x: 0, y: 0, width: box.w + 32, height: box.h } }); }
  else await page.screenshot({ path: f, fullPage: true });
  console.log('sheet', name, fs.statSync(f).size, 'bytes'); return f;
}
const ids = only.length ? only : LANGUAGE_IDS;
const ovAll = buildOverlaySprites(T, needed, { all: true });
const fgOf = (bg) => (luminance(bg) < 0.25 ? '#e8ecef' : '#1b1f24');

// ---- vocabulary ------------------------------------------------------------------------------------------------------------------------------------------
if (kinds.includes('vocabulary')) for (const id of ids) {
  const all = buildLanguageSprites(id, T, needed, { all: true });
  let body = `<h1>${LANGUAGES[id].label}: the vocabulary</h1><p class="sub">Every symbol this language can say, side x arm x echelon, fresh and carried forward, on a dark and a light aerial backdrop (swatches measured from two satellite screenshots of the battlefield). The caption under a symbol is how many of the 478 placed units of the real data wear it; no caption means the vocabulary has the symbol and the data does not need it today.</p>`;
  body += namingTable(id);
  body += `<h2>On a dark aerial backdrop</h2>` + vocabSection({ lang: id, sprites: all, needed, bg: '#21321a', bgLabel: 'Forest (measured)', z: id === 'nato' ? 1.7 : 2.1 });
  body += `<h2>On a light aerial backdrop</h2>` + vocabSection({ lang: id, sprites: all, needed, bg: '#c9bf9f', bgLabel: 'Bare soil / stubble (assumed)', z: id === 'nato' ? 1.7 : 2.1 });
  await shot(wrap(`${id} vocabulary`, body), `${id}-vocabulary${suffix}.png`, 2700, true);
}

// ---- context ---------------------------------------------------------------------------------------------------------------------------------------------
if (kinds.includes('context')) for (const id of ids) {
  const all = buildLanguageSprites(id, T, needed, { all: true }); const map = new Map([...all, ...ovAll].map((x) => [x.key, x])); const L = (k) => map.get(k);
  const idx = JSON.parse(fs.readFileSync(path.join(ROOT, distDir, 'atlas', `${id}.json`), 'utf8'));
  let body = `<h1>${LANGUAGES[id].label}: in context</h1><p class="sub">The layers a tile is made of, the aggregate (formation) marks, the symbols at their true 1x pixel size on six backdrops, and the atlas pixels exactly as they ship at 1x, 2x and 3x.</p>`;
  const cases = [
    { t: 'Union infantry regiment', spec: { side: 'union', arm: 'infantry', ech: 'regiment' }, badge: 'II/red' },
    { t: 'Confederate artillery battery', spec: { side: 'confederate', arm: 'artillery', ech: 'battery' } },
    { t: 'Union cavalry regiment', spec: { side: 'union', arm: 'cavalry', ech: 'regiment' } },
    { t: 'Confederate brigade', spec: { side: 'confederate', arm: 'formation', ech: 'brigade' } },
    { t: 'Union division', spec: { side: 'union', arm: 'formation', ech: 'division' } },
  ];
  const states = [['fresh', {}], ['carried forward', { state: 'carried' }], ['hover', { ring: 'hover' }], ['selected', { ring: 'select' }], ['posture chip (charging)', { chip: 'charge' }], ['strength gauge (3 of 4)', { gauge: 3 }], ['identity from the id alone', { chip: 'idonly' }], ['corps badge (Union)', { badgeOn: true }]];
  for (const [bg, bgLabel] of [['#21321a', 'Forest'], ['#ebe6da', 'Paper']]) {
    const fg = fgOf(bg);
    body += `<h2>A tile in every state on ${bgLabel.toLowerCase()} <span class="small">${bg}</span></h2><div class="panel" style="background:${bg};color:${fg}"><div style="display:grid;grid-template-columns:200px repeat(${states.length},124px);row-gap:2px">`;
    body += `<div></div>` + states.map(([n]) => `<div class="hd" style="align-self:end;height:30px">${n}</div>`).join('');
    for (const c of cases) {
      body += `<div class="rl">${c.t}</div>`;
      for (const [n, o] of states) {
        if (o.badgeOn && !c.badge) { body += `<div style="height:152px"></div>`; continue; }
        body += `<div class="cell" style="width:124px;height:152px">${composeTile(L, { lang: id, spec: { ...c.spec, state: o.state || 'fresh' }, z: 2.6, x: 70 + (o.badgeOn ? 30 : 0), y: 72, ring: o.ring, chip: o.chip, gauge: o.gauge ?? null, badge: o.badgeOn ? c.badge : null })}</div>`;
      }
    }
    body += `</div></div>`;
  }
  // one object: symbol + label tab, real units from the data
  {
    const names = ['U-14VT', 'U-82NY', 'C-10AL', 'U-ART-1NYIND', 'U-II-2-1', 'C-I-3-2', 'U-II', 'C-I', 'U-8NY-CAV'].map((i) => dsUnit(needed, i)).filter(Boolean);
    const tf = T.tab.font;
    await page.setContent('<body></body>');
    const widths = await page.evaluate(({ list, font }) => { const c = document.createElement('canvas').getContext('2d'); c.font = font; return list.map((s) => c.measureText(s).width); }, { list: names.map((u) => u.text), font: tf });
    body += `<h2>One object: the symbol and its label tab</h2><p class="sub">The tab tucks behind the symbol (and behind the status chip when the tile wears one, so the chip never covers a letter) and carries the unit's own designation (real data, runtime text); the pill is drawn from three slices of one sprite. The tile is one outline, not a plate plus a separate caption chip. Dark glass tab on aerial and dark grounds, paper tab on light grounds.</p>`;
    for (const [bg, tone] of [['#21321a', 'dark'], ['#c9bf9f', 'dark'], ['#ebe6da', 'light']]) {
      body += `<div class="panel" style="background:${bg};color:${fgOf(bg)};margin-bottom:6px"><div class="t">${tone.toUpperCase()} TAB on ${bg}</div><div style="position:relative;height:400px">`;
      let x = 40; names.forEach((u, i) => {
        if (i % 3 === 0) x = 40;
        const z = 2; const base = L(baseKey(id, { side: u.side, arm: u.arm, ech: u.ech, state: 'fresh' })); const w = Math.ceil(widths[i]); const tuck = T.tab.tuck; const padX = T.tab.padX;
        const chip = { 1: 'charge', 3: 'limbered', 5: 'march', 7: 'idonly' }[i] || null;                                                                  // some tiles wear a status chip: the pill then tucks behind the chip too
        const pillW = Math.ceil(tuck + padX + w + padX); const cap = Math.min(T.tab.radius, T.tab.h / 2) + T.tab.capExtra; const pill = renderTab(tone, T, `tt${i}`, Math.max(2, pillW - 2 * cap));
        const cy = 70 + 125 * Math.floor(i / 3); const ax = x + 40; const ta = chip ? base.anchors.tabChip : base.anchors.tab;
        const X = ax - base.ax * z + ta[0] * z; const Y = cy - base.ay * z + ta[1] * z;
        body += `<div style="position:absolute;left:0;top:0">${place(pill, z, X, Y)}</div>`;                                                              // the pill first: it sits behind the symbol and the chip
        body += composeTile(L, { lang: id, spec: { side: u.side, arm: u.arm, ech: u.ech, state: 'fresh' }, z, x: ax, y: cy, chip });
        body += `<div style="position:absolute;left:${X + (tuck + padX) * z}px;top:${Y - 10 * z}px;height:${20 * z}px;display:flex;align-items:center;color:${T.tab.tones[tone].text};font:${T.tab.font.replace(/(\d+(?:\.\d+)?)px/, (m2, p) => p * z + 'px')};white-space:nowrap">${u.text}</div>`;
        x += Math.max(150, (pillW + (chip ? 16 : 0)) * z + 100);
      });
      body += `</div></div>`;
    }
  }
  // aggregates
  body += `<h2>Aggregate (formation) marks</h2><p class="sub">When tiles cannot all stand on their true positions they merge into one mark: the stack says "several", the side colour says whose, the row of glyphs says which arms (I infantry, C cavalry, A artillery, F formation records) and the count slot (drawn here with the shipped font) says how many. A Computed count of placement records, never of men. Two back plates for exactly two members, three for three or more.</p>`;
  const aggSides = ['union', 'confederate', 'mixed', 'unknown']; const sets = ['I', 'C', 'A', 'IA', 'IC', 'ICA', 'IF', 'IAF', 'F'];
  for (const bg of ['#21321a', '#ebe6da']) {
    const fg = fgOf(bg); const z = 2.2;
    body += `<div class="panel" style="background:${bg};color:${fg};margin-bottom:8px"><div class="t">rows: ${aggSides.join(' / ')}    columns: arms present / plates</div><div style="display:grid;grid-template-columns:90px repeat(${sets.length * 2},92px);row-gap:4px"><div></div>${sets.flatMap((a) => [2, 3].map((d) => `<div class="hd">${a} / ${d}</div>`)).join('')}`;
    for (const side of aggSides) {
      body += `<div class="rl">${side}</div>`;
      for (const a of sets) for (const d of [2, 3]) {
        const sp = L(`${id}/agg/${side}/${a}/${d}`); const n = d === 2 ? 2 : 17; let inner = sp ? place(sp, z, 52, 56) : '';
        if (sp) { const c = sp.slots.count; const fpx = parseFloat(/(\d+(?:\.\d+)?)px/.exec(c.font)[1]) * z; inner += `<div style="position:absolute;left:${52 - sp.ax * z + c.x * z}px;top:${56 - sp.ay * z + c.y * z}px;width:${c.w * z}px;height:${c.h * z}px;display:flex;align-items:center;justify-content:center;color:${c.colour};font:700 ${fpx}px 'Segoe UI',sans-serif">×${n}</div>`; }
        body += `<div class="cell" style="width:92px;height:104px">${inner}</div>`;
      }
    }
    body += `</div></div>`;
  }
  // 1x actual size
  const items1x = [['union', 'infantry', 'regiment', 'fresh'], ['union', 'infantry', 'regiment', 'carried'], ['union', 'cavalry', 'regiment', 'fresh'], ['union', 'artillery', 'battery', 'fresh'], ['union', 'formation', 'brigade', 'fresh'], ['union', 'formation', 'division', 'fresh'], ['union', 'formation', 'corps', 'fresh'],
    ['confederate', 'infantry', 'regiment', 'fresh'], ['confederate', 'infantry', 'regiment', 'carried'], ['confederate', 'cavalry', 'regiment', 'fresh'], ['confederate', 'artillery', 'battery', 'fresh'], ['confederate', 'formation', 'brigade', 'fresh'], ['confederate', 'formation', 'division', 'fresh'], ['confederate', 'formation', 'corps', 'fresh'], ['unknown', 'infantry', 'regiment', 'fresh'], ['unknown', 'infantry', 'regiment', 'carried']];
  body += `<h2>Actual size (1 u = 1 CSS px) on six backdrops</h2>`;
  for (const b of BACKDROPS) {
    const fg = fgOf(b.hex);
    body += `<div class="panel" style="background:${b.hex};color:${fg};margin-bottom:5px;padding:8px 14px"><div class="t" style="margin:0 0 5px">${b.label} <span style="opacity:.7">${b.hex}</span></div><div style="height:84px;position:relative">`;
    let x = 36; for (const [side, arm, ech, state] of items1x) { body += `<div style="position:absolute;left:0;top:0">${composeTile(L, { lang: id, spec: { side, arm, ech, state }, z: 1, x, y: 50 })}</div>`; x += 56; }
    for (const [sd, as, dp] of [['union', 'IA', 3], ['confederate', 'I', 2], ['mixed', 'IF', 3]]) { const sp = L(`${id}/agg/${sd}/${as}/${dp}`); body += `<div style="position:absolute;left:0;top:0">${place(sp, 1, x + 8, 48)}</div>`; x += 62; }
    for (const c of ['charge', 'skirmish', 'idonly']) { body += `<div style="position:absolute;left:0;top:0">${place(L('chip/' + c), 1, x, 50)}</div>`; x += 30; }
    body += `</div></div>`;
  }
  // pixels as shipped
  body += `<h2>Pixels as shipped</h2><p class="sub">The atlas PNGs at 1x, 2x and 3x, cut by the index and magnified without smoothing so that one 1x pixel is 6 screen pixels (2x atlas: 3, 3x atlas: 2): what a screen of that density really receives.</p>`;
  const picks = [baseKey(id, { side: 'union', arm: 'infantry', ech: 'regiment', state: 'fresh' }), baseKey(id, { side: 'confederate', arm: 'cavalry', ech: 'regiment', state: 'fresh' }), baseKey(id, { side: 'union', arm: 'formation', ech: 'division', state: 'fresh' }), baseKey(id, { side: 'unknown', arm: 'infantry', ech: 'regiment', state: 'carried' }), `${id}/agg/union/IA/3`];
  const widths = picks.map((k) => idx.sprites[k].w * 6 + 6);
  body += `<div class="panel" style="background:#4e613e;color:#eee"><div style="display:grid;grid-template-columns:50px ${widths.map((w) => w + 'px').join(' ')};gap:12px;align-items:end">`;
  body += `<div></div>` + picks.map((k) => `<div class="hd">${k.replace(id + '/', '')}</div>`).join('');
  for (const sc of [1, 2, 3]) {
    body += `<div class="rl">${sc}x</div>`;
    for (const k of picks) { const m = idx.sprites[k]; const Z = 6 / sc; body += `<div style="width:${m.w * 6}px;height:${m.h * 6}px;background:url(../${distDir}/atlas/${id}@${sc}x.png) -${m.x * sc * Z}px -${m.y * sc * Z}px / ${idx.size.w * sc * Z}px ${idx.size.h * sc * Z}px;image-rendering:pixelated"></div>`; }
  }
  body += `</div></div>`;
  const htmlFile = path.join(ROOT, 'sheets', `_${id}-context.html`); fs.writeFileSync(htmlFile, wrap(`${id} context`, body)); await page.setViewportSize({ width: 2300, height: 1000 }); await page.goto('file:///' + htmlFile.replace(/\\/g, '/')); await page.waitForTimeout(300);
  const f = path.join(ROOT, 'sheets', `${id}-context${suffix}.png`); await page.screenshot({ path: f, fullPage: true }); fs.unlinkSync(htmlFile); console.log('sheet', path.basename(f), fs.statSync(f).size, 'bytes');
}

// ---- overlays --------------------------------------------------------------------------------------------------------------------------------------------
if (kinds.includes('overlays')) {
  const L = new Map(ovAll.map((x) => [x.key, x])); const z = 4;
  let body = `<h1>Overlays shared by every language</h1><p class="sub">Status chips, the strength gauge and the Union corps badges. Language-independent: one atlas (<code>overlays</code>). Each has an evidence label; none is a NATO or period symbol except the badges, which are redrawn from the 1863 circular.</p>`;
  for (const bg of ['#21321a', '#ebe6da']) {
    const fg = fgOf(bg);
    body += `<div class="panel" style="background:${bg};color:${fg};margin-bottom:10px"><div class="t">STATUS CHIPS (Modelled; the identity chip is Unknown)</div><div style="display:flex;gap:24px;flex-wrap:wrap">`;
    for (const c of CHIPS) body += `<div style="width:170px;text-align:center"><div class="cell" style="width:170px;height:${Math.round(34 * z / 2 + 22)}px;margin:0 auto">${place(L.get('chip/' + c), z, 85, 40)}</div><div style="font-size:11px;margin-top:2px">${CHIP_TEXT[c]}</div></div>`;
    body += `</div><div class="t" style="margin-top:16px">STRENGTH GAUGE (Modelled: keyframe strength over reference strength, in quartiles)</div><div style="display:flex;gap:24px;flex-wrap:wrap">`;
    for (let g = 0; g <= 4; g++) body += `<div style="width:170px;text-align:center"><div class="cell" style="width:170px;height:44px">${place(L.get('gauge/' + g), z, 85, 22)}</div><div style="font-size:11px">${GAUGE_BINS[g].text}</div></div>`;
    body += `</div><div class="t" style="margin-top:16px">PIN AND LEADER LINE (Design: a tile moved off its true position stays joined to it; the pin marks where the data places the unit; the line is drawn at runtime from tokens leader.*)</div><div style="display:flex;gap:24px;align-items:center">`;
    for (const sd of ['union', 'confederate', 'unknown']) body += `<div style="width:96px;text-align:center"><div class="cell" style="width:96px;height:60px">${place(L.get('pin/' + sd), z, 48, 30)}</div><div style="font-size:11px">${sd}</div></div>`;
    { const Lk = T.leader; const k = 2; body += `<div style="position:relative;width:380px;height:70px;margin-left:10px"><svg width="380" height="70" style="position:absolute;left:0;top:0"><g opacity="${Lk.alpha}"><line x1="34" y1="30" x2="300" y2="30" stroke="${T.palette.keyline}" stroke-width="${(Lk.width + 2 * Lk.keyline) * k}" stroke-linecap="round"/><line x1="34" y1="30" x2="300" y2="30" stroke="${T.palette.bone}" stroke-width="${Lk.width * k}" stroke-linecap="round"/></g><rect x="290" y="12" width="76" height="36" rx="8" fill="${T.palette.chip}" stroke="${T.palette.bone}" stroke-width="2"/></svg><div style="position:absolute;left:0;top:0">${place(L.get('pin/union'), z * 0.9, 34, 30)}</div><div style="position:absolute;left:0;top:56px;font-size:10.5px;width:380px;opacity:.85">pin (true position) ... leader ... the moved tile</div></div>`; }
    body += `<div style="font-size:11px;max-width:420px">Drawn at 2x here. The pin is painted on top of the tiles so it is seen whole or not at all; the line goes under them. A tile moved less than ${T.leader.minLength} u gets neither.</div></div><div class="t" style="margin-top:16px">UNION CORPS BADGES (Documented: circular of Headquarters, Army of the Potomac, 21 March 1863; Union infantry only)</div><div style="display:grid;grid-template-columns:260px repeat(3,110px);align-items:center">`;
    for (const c of Object.keys(BADGE_SHAPES)) { body += `<div style="font-size:11px">${BADGE_TEXT[c]}</div>`; for (const d of DIV_COLOURS) { const sp = L.get(`badge/${c}/${d}`); body += `<div class="cell" style="width:110px;height:76px">${sp ? place(sp, z * 0.95, 55, 38) : ''}</div>`; } }
    body += `</div></div>`;
  }
  await shot(wrap('overlays', body), `overlays${suffix}.png`, 1500);
}

// ---- colour-vision simulation ---------------------------------------------------------------------------------------------------------------------------
if (kinds.includes('cvd')) {
  // 1. one composition per language on four backdrops, drawn in the page, then re-coloured by the simulation in a second pass on a canvas (the same matrices as src/colour.mjs)
  const { SIM_SOURCE, CVD_MATRICES } = await import('../src/colour.mjs');
  const { CVD_TYPES } = await import('../src/colour.mjs');
  const picks = [['union', 'infantry', 'regiment'], ['confederate', 'infantry', 'regiment'], ['unknown', 'infantry', 'regiment'], ['union', 'cavalry', 'regiment'], ['confederate', 'cavalry', 'regiment'], ['union', 'artillery', 'battery'], ['confederate', 'artillery', 'battery'], ['union', 'formation', 'brigade'], ['confederate', 'formation', 'brigade']];
  const bgs = [['#21321a', 'forest'], ['#4e613e', 'field'], ['#c9bf9f', 'soil'], ['#ebe6da', 'paper']];
  let html = '';
  for (const id of ids) {
    const all = buildLanguageSprites(id, T, needed, { all: true }); const map = new Map([...all, ...ovAll].map((x) => [x.key, x])); const L = (k) => map.get(k);
    html += `<div id="grp-${id}" style="display:flex;gap:0;width:${bgs.length * (picks.length * 66 + 20)}px;flex:none">`;
    for (const [bg] of bgs) {
      html += `<div style="background:${bg};width:${picks.length * 66 + 20}px;flex:none;height:150px;position:relative">`;
      let x = 44; for (const [side, arm, ech] of picks) { html += composeTile(L, { lang: id, spec: { side, arm, ech, state: 'fresh' }, z: 1.6, x, y: 62 }); x += 66; }
      html += composeTile(L, { lang: id, spec: { side: 'union', arm: 'infantry', ech: 'regiment', state: 'carried' }, z: 1.6, x: 44, y: 124 }) + composeTile(L, { lang: id, spec: { side: 'confederate', arm: 'infantry', ech: 'regiment', state: 'carried' }, z: 1.6, x: 110, y: 124 });
      html += `</div>`;
    }
    html += `</div>`;
  }
  await page.setViewportSize({ width: 2800, height: 900 });
  await page.setContent(`<body style="margin:0;background:#fff"><div style="display:flex;flex-direction:column;align-items:flex-start;width:max-content">${html}</div></body>`); await page.waitForTimeout(250);
  const png = {}; for (const id of ids) png[id] = (await (await page.$(`#grp-${id}`)).screenshot({ type: 'png' })).toString('base64');
  // 2. simulation in the page
  const outFile = path.join(ROOT, 'sheets', `cvd-simulation${suffix}.png`);
  const labels = { normal: 'Normal vision', protanopia: 'Protanopia (no L cones)', deuteranopia: 'Deuteranopia (no M cones)', tritanopia: 'Tritanopia (no S cones)', achromatopsia: 'Greyscale (WCAG luminance)' };
  const sim = await page.evaluate(async ({ png, ids, SIM_SOURCE, types, labels, names }) => {
    const simulate = eval(SIM_SOURCE); const imgs = {}; for (const id of ids) { const im = new Image(); im.src = 'data:image/png;base64,' + png[id]; await im.decode(); imgs[id] = im; }
    const W0 = imgs[ids[0]].width; const H0 = imgs[ids[0]].height; const padL = 190; const head = 70; const gap = 8; const rowH = H0 + 26;
    const cv = document.createElement('canvas'); cv.width = padL + W0 + 20; cv.height = head + types.length * (ids.length * rowH + 22) + 10; const g = cv.getContext('2d'); g.fillStyle = '#f4f2ec'; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = '#1b1f24'; g.font = '600 22px Segoe UI'; g.fillText('Colour-vision simulation of every language (Machado, Oliveira and Fernandes 2009, severity 1.0; greyscale = WCAG relative luminance)', 12, 30); g.font = '13px Segoe UI'; g.fillStyle = '#56626e'; g.fillText('Same symbols, same backdrops (forest, field, bare soil, paper). Union vs Confederate must stay distinguishable in every row; the shape redundancy of each language is visible when the colours collapse.', 12, 54);
    let y = head;
    for (const t of types) {
      g.fillStyle = '#1b1f24'; g.font = '600 15px Segoe UI'; g.fillText(labels[t], 12, y + 14); y += 22;
      for (const id of ids) {
        const c2 = document.createElement('canvas'); c2.width = W0; c2.height = H0; const g2 = c2.getContext('2d', { willReadFrequently: true }); g2.drawImage(imgs[id], 0, 0); const d = g2.getImageData(0, 0, W0, H0); if (t !== 'normal') simulate(d, t); g2.putImageData(d, 0, 0);
        g.drawImage(c2, padL, y); g.fillStyle = '#44505c'; g.font = '12px Segoe UI'; g.fillText(names[id], 12, y + rowH / 2 - 6); g.fillStyle = '#7a8793'; g.font = '11px Segoe UI'; g.fillText('9 symbols + 2 carried', 12, y + rowH / 2 + 10); y += rowH;
      }
    }
    return cv.toDataURL('image/png').split(',')[1];
  }, { png, ids, SIM_SOURCE, types: CVD_TYPES, labels, names: Object.fromEntries(ids.map((i) => [i, LANGUAGES[i].label])) });
  fs.writeFileSync(outFile, Buffer.from(sim, 'base64')); console.log('sheet', path.basename(outFile), fs.statSync(outFile).size, 'bytes');
}
await close();
