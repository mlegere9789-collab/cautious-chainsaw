// test/skin-sheet.mjs - SPECIMEN SHEETS of the skins, drawn in real Chrome by the skin's own draw functions on real units of the built Studio (no mock-ups): every channel value,
// every state (arrival, selection, hover, carried, in transit ...), on a paper, a dark and an imagery-like ground, at device-pixel ratio 1, 2 and 3.  The PNGs are what a designer looks at.
//   node docs/pitch/anim/prototype/test/skin-sheet.mjs [--skins=field-manual,war-room] [--dpr=2] [--bg=paper,ink,imagery] [--out=docs/pitch/anim/shots/prototype] [--prefix=sheet] [--port=9641]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url)); const PROTO = path.resolve(HERE, '..'); const REPO = path.resolve(PROTO, '..', '..', '..', '..');
const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? '1']; }));
const PORT = +(args.port || 9641); const CHROME = process.env.T0_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = path.resolve(args.out || path.join(REPO, 'docs', 'pitch', 'anim', 'shots', 'prototype')); fs.mkdirSync(OUT, { recursive: true });
const PROFILE = path.join(REPO, 'tmp', 'pitch-anim', 'skins', 'chrome-profile', String(PORT)); fs.mkdirSync(PROFILE, { recursive: true });
const SKINS = (args.skins || '').split(',').filter(Boolean); const DPRS = (args.dpr || '2').split(',').map(Number); const BGS = (args.bg || 'paper').split(',');
const PREFIX = args.prefix || 'sheet';

const errors = [];
for (const dpr of DPRS) {
  const ctx = await chromium.launchPersistentContext(path.join(PROFILE, 'd' + dpr), { executablePath: CHROME, headless: true, viewport: { width: 1500, height: 1000 }, deviceScaleFactor: dpr, args: ['--no-first-run', '--disable-extensions', '--mute-audio', '--remote-debugging-port=' + (PORT + 1)] });
  try {
    const page = ctx.pages()[0] || await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); }); page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    await page.goto(pathToFileURL(path.join(PROTO, 'battle-studio.html')).href + '?fresh=1&scene=fresh2&zoom=15' + (args.query ? '&' + args.query : '')); await page.waitForFunction(() => window.__studio && window.__studio.ready);
    const ids = SKINS.length ? SKINS : await page.evaluate(() => window.__studio.kernel.skins.ids());
    for (const bg of BGS) for (const id of ids) {
      const info = await page.evaluate(sheetInPage, { id, dpr, bg });
      if (info.error) { console.log(id, 'ERROR', info.error); continue; }
      const el = await page.$('#sheet'); const file = path.join(OUT, `${PREFIX}-${id.replace('/', '_')}-${bg}-dpr${dpr}.png`);
      await page.setViewportSize({ width: Math.max(600, Math.ceil(info.w)), height: Math.max(400, Math.ceil(info.h)) });
      await page.waitForTimeout(60); await el.screenshot({ path: file }); console.log('wrote', path.relative(REPO, file), info.w + 'x' + info.h, 'legend rows', info.legend);
      await page.evaluate(() => document.getElementById('sheet')?.remove());
    }
  } finally { await ctx.close(); }
}
if (errors.length) { console.log('CONSOLE', errors.slice(0, 8)); process.exitCode = 1; }

/** runs INSIDE the page: draws one sheet with the skin's own draw functions */
function sheetInPage({ id, dpr, bg }) {
  const S = window.__studio; const E = S.engine; const kit = window.__skinKit;
  if (!E.kernel.skins.has(id)) return { error: 'no skin ' + id };
  E.tuning.set('skin.id', id); S.step(30, 1000 / 60);
  const skin = E.kernel.skins.get(id); const spec = E.spec(); const D = skin.draw; const tok = E.tok;
  const units = [...E.battle.units.values()];
  const pick = (f, n = 0) => units.filter(f)[n];
  const U = {
    inf: pick((u) => u.side === 'union' && u.kind === 'regiment' && u.arm === 'infantry' && u.inOob && u.short.length <= 6), csa: pick((u) => u.side === 'confederate' && u.kind === 'regiment' && u.arm === 'infantry' && u.inOob && u.short.length <= 6),
    cav: pick((u) => u.arm === 'cavalry' && u.kind === 'regiment') || pick((u) => u.arm === 'cavalry'), art: pick((u) => u.kind === 'battery' && u.side === 'union'), bat: pick((u) => u.kind === 'battalion'),
    bde: pick((u) => u.kind === 'brigade' && u.side === 'union' && /^U-II-/.test(u.id)), div: pick((u) => u.kind === 'division' && u.side === 'union'), corps: pick((u) => u.kind === 'corps' && u.side === 'union'),
    unk: pick((u) => u.side === 'unknown'), idonly: pick((u) => !u.inOob && u.kind === 'regiment' && u.side === 'union'),
  };
  const corpsUnit = (roman, divn) => pick((u) => u.side === 'union' && u.kind === 'regiment' && u.arm === 'infantry' && u.inOob && u.parentSource === 'oob' && u.chain.some((c) => c.startsWith('U-' + roman + '-')) && (!divn || u.chain.some((c) => c === `U-${roman}-${divn}`)));
  const tileFor = (u, o = {}) => {
    const short = o.short ?? u.short; const badge = o.badge ?? null; const codeW = spec.text.width('code', short);
    let w = spec.chipPadX * 2 + spec.glyphW + spec.glyphGap + codeW + 2 * spec.ring; if (badge) w += spec.badgeGap + spec.text.width('badge', badge) + 6;
    return { key: 'sp:' + (o.tag || u.id) + ':' + Math.random().toString(36).slice(2, 6), kind: 'leaf', ids: [u.id], n: 1, x: 0, y: 0, ax: 0, ay: 0, w: Math.max(spec.chipMinW, Math.ceil(w)), h: spec.chipH, scale: 1, opacity: 1, solid: true, life: 'live', entering: false, travelling: false, displaced: false,
      side: u.side, arm: u.arm, short, badge, nameKind: null, ratio: 1, strength: u.strengthRef, disposition: 'Line of Battle', selected: false, unit: u, ageTicks: 0, ageMin: 0, ageMax: 0, moving: false, members: null, label: null, ...(o.t || {}) };
  };
  const aggTile = (o) => { const short = o.short || 'XII/2/1'; const badge = o.badge || '×5'; const codeW = spec.text.width('code', short); const w = spec.chipPadX * 2 + spec.glyphW + spec.glyphGap + codeW + 2 * spec.ring + spec.badgeGap + spec.text.width('badge', badge) + 6;
    return { key: 'sp:agg:' + Math.random().toString(36).slice(2, 6), kind: 'agg', ids: ['a', 'b'], n: 5, x: 0, y: 0, ax: 0, ay: 0, w: Math.max(spec.chipMinW, Math.ceil(w)), h: spec.chipH, scale: 1, opacity: 1, solid: true, life: 'live', entering: false, travelling: false, displaced: false, side: o.side || 'union', arm: o.arm || 'infantry', short, badge, nameKind: o.scope || 'brigade', ratio: 0.8, strength: 1500, disposition: null, selected: false, unit: null, ageTicks: 20, ageMin: 5, ageMax: 20, moving: false, members: null, label: null, ...(o.t || {}) }; };
  const L = (u, over, label, extra = {}) => ({ label, t: tileFor(u, { t: over, tag: label, ...extra }) });
  // ---- specimens -------------------------------------------------------------------------------------------------------------------------------------------------
  const groups = [
    ['SIDE', [L(U.inf, {}, 'Union'), L(U.csa, {}, 'Confederate'), L(U.unk, { side: 'unknown' }, 'Unknown'), { label: 'Contact', t: aggTile({ side: 'mixed', short: 'Contact', badge: '×6', scope: 'contact' }) }, { label: 'Union agg', t: aggTile({}) }, { label: 'CSA agg', t: aggTile({ side: 'confederate', short: 'I/3/1', badge: '×12', scope: 'brigade' }) }]],
    ['ARM', [L(U.inf, {}, 'infantry'), L(U.cav, { disposition: 'Mounted Cavalry', side: 'union' }, 'cav mounted'), L(U.cav, { disposition: 'Dismounted Cavalry', side: 'union' }, 'cav dism.'), L(U.art, { disposition: 'Deployed Artillery' }, 'art deployed'), L(U.art, { disposition: 'Limbered Artillery' }, 'art limbered'), L(U.bat, { disposition: 'Deployed Artillery', side: 'confederate' }, 'battalion'), { label: 'mixed agg', t: aggTile({ arm: 'mixed', short: 'Lead', badge: '+3', scope: 'lead' }) }]],
    ['ECHELON', [L(U.inf, {}, 'regiment'), L(U.bde, { disposition: 'Line of Battle' }, 'brigade'), L(U.div, { disposition: 'Line of Battle' }, 'division'), L(U.corps || U.div, { disposition: 'Line of Battle', unit: { ...(U.corps || U.div), kind: 'corps' } }, 'corps')]],
    ['POSTURE', ['Line of Battle', 'Charging Line', 'Chaotic Retreat', 'Line of March', 'Skirmish Line', 'Reserve', 'Bivouac'].map((d) => L(U.inf, { disposition: d }, d.split(' ')[0] + ' ' + (d.split(' ')[1] || '')))],
    ['STRENGTH', [1, 0.75, 0.5, 0.25, 0.05].map((r) => L(U.inf, { ratio: r }, 'ratio ' + r))],
    ['FIX AGE', [0, 12, 40, 100, 160, 225, 500].map((a) => L(U.csa, { ageTicks: a, ageMin: a, ageMax: a }, 'age ' + a)).concat([L(U.inf, { moving: true, ageTicks: 6, ageMax: 6 }, 'in transit'), L(U.idonly || U.inf, {}, 'id only')])],
    ['STATE', [L(U.inf, { selected: true }, 'selected'), L(U.csa, { selected: true }, 'selected CSA'), { label: 'hover', t: tileFor(U.inf, { tag: 'hover' }), hover: true }, L(U.inf, { entering: true, scale: 0.6 + 0.4 * 0.2, opacity: 0.2 }, 'enter .2'), L(U.inf, { entering: true, scale: 0.6 + 0.4 * 0.55, opacity: 0.55 }, 'enter .55'), L(U.inf, { entering: true, scale: 0.6 + 0.4 * 0.85, opacity: 0.85 }, 'enter .85'), L(U.inf, { life: 'dying', scale: 0.6 + 0.4 * 0.5, opacity: 0.5 }, 'exit .5'), L(U.inf, { travelling: true, opacity: 0.42 }, 'travel 0.42')]],
  ];
  const corps = [['I', 1], ['II', 2], ['III', 1], ['V', 3], ['VI', 1], ['XI', 2], ['XII', 1]].map(([r, d]) => { const u = corpsUnit(r, d) || corpsUnit(r); return u ? L(u, {}, `${r} Corps d${d}`) : null; }).filter(Boolean);
  if (corps.length) groups.push(['CORPS BADGES (Union infantry)', corps]);
  groups.push(['CORPS TEXT (CSA) + none', [L(pick((u) => u.side === 'confederate' && u.kind === 'regiment' && u.inOob && u.parentSource === 'oob' && u.chain.includes('C-I')), {}, 'CSA I'), L(pick((u) => u.side === 'confederate' && u.kind === 'regiment' && u.inOob && u.parentSource === 'oob' && u.chain.includes('C-III')), {}, 'CSA III'), L(U.cav, { side: 'union' }, 'Union cav (none)'), L(U.art, {}, 'Union art (none)')].filter((x) => x.t.unit)]);

  // ---- ground ----------------------------------------------------------------------------------------------------------------------------------------------------
  const colW = 124; const rowH = 54; const lab = 112; const maxCols = Math.max(...groups.map((g) => g[1].length)); const W = lab + maxCols * colW + 10; const H = groups.length * rowH + 74 + 3 * 28;
  const box = document.createElement('div'); box.id = 'sheet'; box.style.cssText = `position:fixed;left:0;top:0;z-index:99999;width:${W}px;background:var(--panel)`; document.body.append(box);
  const cv = document.createElement('canvas'); cv.width = Math.ceil(W * dpr); cv.height = Math.ceil(H * dpr); cv.style.cssText = `display:block;width:${W}px;height:${H}px`; box.append(cv);
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const ground = (x, y, w, h) => {
    if (bg === 'paper') { c.fillStyle = '#ebe6da'; c.fillRect(x, y, w, h); }
    else if (bg === 'ink') { c.fillStyle = '#14181d'; c.fillRect(x, y, w, h); }
    else { // imagery-like: fields, woods, a road, noise
      const cols = ['#5e7a45', '#7b8c4d', '#8e8a58', '#4a6338', '#6f7f3f', '#95885a', '#3f5430', '#a08f66']; c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.fillStyle = '#55703d'; c.fillRect(x, y, w, h);
      for (let i = 0; i < 90; i++) { c.fillStyle = cols[(rnd() * cols.length) | 0]; c.fillRect(x + rnd() * w - 30, y + rnd() * h - 20, 40 + rnd() * 160, 20 + rnd() * 90); }
      for (let i = 0; i < 9; i++) { c.fillStyle = 'rgba(25,40,20,0.55)'; c.beginPath(); c.arc(x + rnd() * w, y + rnd() * h, 14 + rnd() * 40, 0, 6.283); c.fill(); }
      c.strokeStyle = 'rgba(210,200,170,0.9)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y + h * 0.35); c.bezierCurveTo(x + w * 0.3, y + h * 0.1, x + w * 0.6, y + h * 0.8, x + w, y + h * 0.5); c.stroke();
      for (let i = 0; i < 4000; i++) { c.fillStyle = `rgba(${(rnd() * 90) | 0},${(rnd() * 90) | 0},${(rnd() * 50) | 0},0.16)`; c.fillRect(x + rnd() * w, y + rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2); }
      c.restore();
    }
  };
  ground(0, 0, W, H);
  const textInk = bg === 'paper' || bg === 'imagery' ? '#222' : '#cfd6dd'; const halo = bg === 'ink' ? 'rgba(20,24,29,.85)' : 'rgba(255,255,255,.85)';
  const T = (s, x, y, size = 10, bold = true) => { c.setTransform(dpr, 0, 0, dpr, 0, 0); c.font = `${bold ? 700 : 400} ${size}px "Segoe UI", system-ui, sans-serif`; c.textBaseline = 'middle'; c.textAlign = 'left'; c.lineJoin = 'round'; c.strokeStyle = halo; c.lineWidth = 3; c.strokeText(s, x, y); c.fillStyle = textInk; c.fillText(s, x, y); };
  T(`${skin.label}  ·  v${skin.version}  ·  footprint ${spec.chipH}px  ·  ground: ${bg}  ·  device pixel ratio ${dpr}`, 8, 14, 12);
  // ---- drawing --------------------------------------------------------------------------------------------------------------------------------------------------------
  let T0 = 100000; kit.setClock({ now: () => T0 });
  const mkEnv = () => ({ dpr, zoom: 16, timeMs: 0, tok, spec });
  const place = (t, cx, cy, fracX = 0.31, fracY = 0.62) => { const s = dpr * t.scale; return [s, 0, 0, s, (cx + fracX) * dpr, (cy + fracY) * dpr]; };
  const drawTile = (cc, t, cx, cy) => { cc.setTransform(...place(t, cx, cy)); cc.globalAlpha = t.opacity; D.tile(cc, t, mkEnv()); cc.globalAlpha = 1; };
  const scratch = document.createElement('canvas'); scratch.width = cv.width; scratch.height = 200 * dpr; const sc = scratch.getContext('2d');
  let gy = 36; let first = true;
  for (const [name, items] of groups) {
    T(name, 8, gy + 14, 10); items.forEach((it, i) => {
      const cx = lab + i * colW + colW / 2; const cy = gy + 22;
      if (it.hover) kit.setHover(it.t.key);
      for (let k = 0; k < 40; k++) { T0 += 16.7; sc.setTransform(1, 0, 0, 1, 0, 0); sc.clearRect(0, 0, scratch.width, scratch.height); drawTile(sc, it.t, 60, 40); }
      T0 += 16.7; drawTile(c, it.t, cx, cy); if (it.hover) kit.setHover(null);
      if (it.t.label !== undefined) { /* labels are specimens of their own below */ }
      T(it.label, cx - colW / 2 + 6, cy + 20, 9, false);
    }); gy += rowH;
  }
  // label, pin, leader, hull specimens
  T('LABEL · PIN', 8, gy + 14, 10);
  const lt = tileFor(U.inf, {}); lt.label = { text: '1st Bde, 3rd Div, 2nd C…', slot: 'r', opacity: 1, x0: 0, y0: 0, x1: Math.ceil(spec.text.width('label', '1st Bde, 3rd Div, 2nd C…') + 2 * spec.labelPadX), y1: spec.labelH };
  const lt2 = tileFor(U.csa, {}); lt2.label = { ...lt.label, text: '10th Alabama Infantry', x1: Math.ceil(spec.text.width('label', '10th Alabama Infantry') + 2 * spec.labelPadX) };
  if (D.label) for (const [t, x] of [[lt, lab + 10], [lt2, lab + 200]]) { c.setTransform(dpr, 0, 0, dpr, x * dpr, (gy + 10) * dpr); D.label(c, t, mkEnv()); }
  if (D.pin) { for (const [tt, px] of [[lt, 400], [lt2, 430]]) { tt.x = 60; tt.y = 0; tt.ax = 0; tt.ay = 0; c.setTransform(dpr, 0, 0, dpr, (lab + px) * dpr, (gy + 22) * dpr); D.pin(c, tt, mkEnv()); } lt.x = 0; lt2.x = 0; }
  if (D.leader) { c.setTransform(dpr, 0, 0, dpr, 0, 0); D.leader(c, lt, mkEnv(), [lab + 470, gy + 26], [lab + 530, gy + 14]); D.leader(c, lt2, mkEnv(), [lab + 470, gy + 36], [lab + 530, gy + 40]); }
  if (D.hull) { c.setTransform(dpr, 0, 0, dpr, 0, 0); D.hull(c, lt, mkEnv(), [[lab + 580, gy + 14], [lab + 592, gy + 22], [lab + 584, gy + 34], [lab + 600, gy + 28]]); }
  gy += rowH;
  // legend rows: the real DOM legend of the Studio (the swatches are the skin's own drawings)
  const lg = skin.legend ? skin.legend() : [];
  const lgBox = document.createElement('div'); lgBox.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:2px 22px;padding:8px 14px 14px;color:var(--text);font:12px system-ui,sans-serif';
  const hd = document.createElement('div'); hd.style.cssText = 'grid-column:1/-1;font:700 11px system-ui;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);margin:4px 0'; hd.textContent = `Legend generated by ${skin.label} (${lg.length} rows)`; lgBox.append(hd);
  for (const r of lg) { const row = document.createElement('div'); row.className = 'legend'; const i = document.createElement('i'); i.style.background = r.swatch; const d = document.createElement('div'); d.append(document.createTextNode(r.text + ' ')); const ev = document.createElement('span'); ev.className = 'ev ev-' + r.evidence; ev.textContent = r.evidence; d.append(ev); row.append(i, d); lgBox.append(row); }
  box.append(lgBox);
  const r = box.getBoundingClientRect();
  return { w: r.width, h: r.height, legend: lg.length };
}
